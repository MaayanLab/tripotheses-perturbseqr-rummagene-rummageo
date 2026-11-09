"""Uncapped top-K distinct intersections, ranked by their best source triplet."""

import argparse
import csv
import gzip
import math
import multiprocessing
import tempfile
import time
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait
from dataclasses import dataclass
from functools import lru_cache
from itertools import islice
from pathlib import Path

import numpy as np
from scipy.stats import hypergeom

from index import GeneSet, Library, MappedLibrary, count_overlaps
from results import TopK, ranking_key, support_writer, write_results

POPULATION = 20_574
TOP_K = 100_000
BOUND_TOLERANCE = 1e-7
DATA_DIRECTORY = Path(__file__).resolve().parents[1] / 'data'


@dataclass
class Crossing:
    rummagene: GeneSet
    perturbseqr: GeneSet
    rummageo: GeneSet
    genes: frozenset
    log_pvalue: float
    jaccard: float


def conservative_log_pvalue(rummagene, perturbseqr, rummageo, overlap_size, population, logsf=hypergeom.logsf):
    genes = rummagene.genes, perturbseqr.genes, rummageo.genes
    return max(float(logsf(overlap_size - 1, population, len(genes[i]),
        len(genes[(i + 1) % 3] & genes[(i + 2) % 3]))) for i in range(3))


class CrossingSearch:
    def __init__(self, libraries, population, minimum_overlap, maximum_pvalue, top_k):
        self.rummagene, self.perturbseqr, self.rummageo = libraries
        self.population, self.minimum_overlap, self.top_k = population, minimum_overlap, top_k
        self.eligibility_cutoff = math.log(maximum_pvalue)
        self.perturbseqr_index, self.rummageo_index = self.perturbseqr.postings, self.rummageo.postings
        self.maximum_overlap = min(max(self.perturbseqr.sizes, default=0), max(self.rummageo.sizes, default=0))
        self.logsf = lru_cache(maxsize=100000)(hypergeom.logsf)
        self.pair_overlap = lru_cache(maxsize=100000)(lambda p, g: len(self.perturbseqr[p].genes & self.rummageo[g].genes))
        self.gamma = np.array([math.lgamma(i + 1) for i in range(population + 1)])
        self.bound = lru_cache(maxsize=100000)(self.bound)

    def bound(self, largest_size, overlap):
        if largest_size > self.population:
            return -math.inf
        return ((self.gamma[largest_size] - self.gamma[largest_size - overlap])
                - self.gamma[self.population]) + self.gamma[self.population - overlap]

    def filter_completions(self, counts, first_size, second_size, cutoff):
        if not counts:
            return counts
        positions = np.array(list(counts))
        overlaps = np.array(list(counts.values()))
        sizes = np.maximum(self.rummageo.sizes[positions], max(first_size, second_size))
        bounds = np.full(len(positions), -np.inf)
        valid = sizes <= self.population
        bounds[valid] = ((self.gamma[sizes[valid]] - self.gamma[sizes[valid] - overlaps[valid]])
                        - self.gamma[self.population]) + self.gamma[self.population - overlaps[valid]]
        keep = bounds <= cutoff + BOUND_TOLERANCE
        return dict(zip(positions[keep].tolist(), overlaps[keep].tolist()))

    def warm_result(self, positions):
        r, p, g = (library[position] for library, position in zip(
            (self.rummagene, self.perturbseqr, self.rummageo), positions))
        genes = r.genes & p.genes & g.genes
        if len(genes) < self.minimum_overlap or max(len(r.genes), len(p.genes), len(g.genes)) > self.population:
            return None
        score = conservative_log_pvalue(r, p, g, len(genes), self.population, self.logsf)
        if not math.isfinite(score) or score > self.eligibility_cutoff:
            return None
        return Crossing(r, p, g, genes, score, len(genes) / len(r.genes | p.genes | g.genes))

    def search(self, positions, shared_cutoff, record=None):
        heap = TopK(self.top_k)
        for position in positions:
            cutoff = min(self.eligibility_cutoff, shared_cutoff.value)
            rsize = int(self.rummagene.sizes[position])
            maximum = min(rsize, self.maximum_overlap)
            if rsize > self.population or maximum < self.minimum_overlap or self.bound(rsize, maximum) > cutoff + BOUND_TOLERANCE:
                continue
            rummagene, rgeo_counts = self.rummagene[position], {}
            pairs = count_overlaps(rummagene.genes, self.perturbseqr_index, len(self.perturbseqr), self.minimum_overlap)
            for perturbseqr_position, first_overlap in pairs.items():
                cutoff = min(cutoff, heap.cutoff)
                psize = int(self.perturbseqr.sizes[perturbseqr_position])
                if psize > self.population or self.bound(max(rsize, psize), first_overlap) > cutoff + BOUND_TOLERANCE:
                    continue
                perturbseqr = self.perturbseqr[perturbseqr_position]
                first_intersection = rummagene.genes & perturbseqr.genes
                completions = count_overlaps(first_intersection, self.rummageo_index, len(self.rummageo), self.minimum_overlap)
                completions = self.filter_completions(completions, rsize, psize, cutoff)
                for rummageo_position, overlap in completions.items():
                    cutoff = min(cutoff, heap.cutoff)
                    gsize = int(self.rummageo.sizes[rummageo_position])
                    if gsize > self.population or self.bound(max(rsize, psize, gsize), overlap) > cutoff + BOUND_TOLERANCE:
                        continue
                    geo_score = float(self.logsf(overlap - 1, self.population, gsize, first_overlap))
                    if geo_score > cutoff:
                        continue
                    pgeo_count = self.pair_overlap(perturbseqr_position, rummageo_position)
                    r_score = float(self.logsf(overlap - 1, self.population, rsize, pgeo_count))
                    if r_score > cutoff:
                        continue
                    rummageo = self.rummageo[rummageo_position]
                    if rummageo_position not in rgeo_counts:
                        rgeo_counts[rummageo_position] = len(rummagene.genes & rummageo.genes)
                    rgeo_count = rgeo_counts[rummageo_position]
                    p_score = float(self.logsf(overlap - 1, self.population, psize, rgeo_count))
                    score = max(r_score, p_score, geo_score)
                    if not math.isfinite(score) or score > cutoff:
                        continue
                    union_size = rsize + psize + gsize - first_overlap - pgeo_count - rgeo_count + overlap
                    candidate = Crossing(rummagene, perturbseqr, rummageo,
                        first_intersection & rummageo.genes, score, overlap / union_size)
                    if record is not None:
                        record(candidate)
                    heap.retain(candidate)
        return heap.ranked_results()


_worker_search = None
_shared_cutoff = None


def search_signature_batch(positions):
    with support_writer(_worker_search.support_directory) as record:
        return [(row.rummagene.position, row.perturbseqr.position, row.rummageo.position,
                 row.log_pvalue, row.jaccard) for row in _worker_search.search(positions, _shared_cutoff, record)]


def restore_result(record, libraries):
    r, p, g = (library[position] for library, position in zip(libraries, record[:3]))
    return Crossing(r, p, g, r.genes & p.genes & g.genes, *record[3:])


def cross(rummagene_sets, perturbseqr_sets, rummageo_sets, population=POPULATION,
          *, minimum_overlap=5, maximum_pvalue=.001, workers=1, top_k=TOP_K,
          initial_triplets=(), rummagene_positions=None, support_directory=None):
    if population < 1 or minimum_overlap < 1 or not 0 < maximum_pvalue <= 1 or workers < 1 or top_k < 1:
        raise ValueError('Invalid population, overlap, p-value, workers or top-K')
    libraries = tuple(value if hasattr(value, 'sizes') else Library(value)
                      for value in (rummagene_sets, perturbseqr_sets, rummageo_sets))
    if minimum_overlap < 5 and any(isinstance(library, MappedLibrary) for library in libraries):
        raise ValueError('Mapped inputs omit signatures below5genes; use minimum_overlap>=5')
    if any(len(library) == 0 for library in libraries):
        return []
    search, heap = CrossingSearch(libraries, population, minimum_overlap, maximum_pvalue, top_k), TopK(top_k)
    search.support_directory = support_directory
    with support_writer(support_directory) as record:
        for positions in initial_triplets:
            candidate = search.warm_result(positions)
            if candidate is not None:
                if record is not None:
                    record(candidate)
                heap.retain(candidate)
    global _worker_search, _shared_cutoff
    context = multiprocessing.get_context('fork') if workers > 1 else multiprocessing.get_context()
    _worker_search, _shared_cutoff = search, context.Value('d', min(search.eligibility_cutoff, heap.cutoff))
    positions = iter(range(len(libraries[0])) if rummagene_positions is None else rummagene_positions)
    executor = ProcessPoolExecutor(workers, mp_context=context) if workers > 1 else None
    futures, completed, last_log = {}, 0, time.monotonic()
    try:
        def submit():
            batch = tuple(islice(positions, 8))
            if not batch:
                return False
            if executor is None:
                records = search_signature_batch(batch)
                for record in records:
                    heap.retain(restore_result(record, libraries))
                return True
            futures[executor.submit(search_signature_batch, batch)] = len(batch)
            return True
        if executor is None:
            while submit():
                _shared_cutoff.value = min(_shared_cutoff.value, heap.cutoff)
        else:
            for _ in range(workers * 2):
                submit()
            while futures:
                done, _ = wait(futures, return_when=FIRST_COMPLETED)
                for future in done:
                    completed += futures.pop(future)
                    for record in future.result():
                        heap.retain(restore_result(record, libraries))
                    _shared_cutoff.value = min(_shared_cutoff.value, heap.cutoff)
                    submit()
                if time.monotonic() - last_log > 30:
                    print(f'Searched {completed:,}/{len(libraries[0]):,} sources; kept {len(heap):,}', flush=True)
                    last_log = time.monotonic()
    except BaseException:
        if executor is not None:
            if hasattr(executor, 'kill_workers'):
                executor.kill_workers()
            else:
                for process in executor._processes.values():
                    process.kill()
        raise
    finally:
        if executor is not None:
            executor.shutdown(wait=True, cancel_futures=True)
        _worker_search = _shared_cutoff = None
    return heap.ranked_results()


def warm_triplets(path, libraries):
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt') as source:
        for row in csv.DictReader(source, delimiter='\t'):
            yield tuple(library.by_row(int(row[name + '_row'])).position
                        for library, name in zip(libraries, ('rummagene', 'perturbseqr', 'rummageo')))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', type=Path, help='Validated mapped index directory for large inputs')
    parser.add_argument('--rummagene', type=Path, default=DATA_DIRECTORY / 'rummagene.gmt')
    parser.add_argument('--rummageo', type=Path, default=DATA_DIRECTORY / 'rummageo-human.gmt.gz')
    parser.add_argument('--perturbseqr', type=Path, help='Human Perturb-Seqr GMT when --index is not supplied')
    parser.add_argument('--warm', type=Path, help='Optional prior TSV; coordinates are rescored, never treated as coverage')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    if args.workers < 1 or (args.index is None and args.perturbseqr is None):
        parser.error('Use positive workers and either --index or --perturbseqr')
    libraries = tuple(MappedLibrary(args.index, role) for role in (0, 2, 1)) if args.index else tuple(
        Library.from_gmt(path) for path in (args.rummagene, args.perturbseqr, args.rummageo))
    started = time.monotonic()
    initial = warm_triplets(args.warm, libraries) if args.warm else ()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='crossing-', dir=args.output.parent) as directory:
        rows = cross(*libraries, workers=args.workers, initial_triplets=initial, support_directory=Path(directory))
        write_results(args.output, rows, libraries, Path(directory))
    print(f'Retained {len(rows):,} distinct intersections with N={POPULATION:,} in {time.monotonic() - started:.1f}s', flush=True)


if __name__ == '__main__':
    main()
