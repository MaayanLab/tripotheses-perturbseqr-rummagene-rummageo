"""Indexed three-way top-K crossing with cached scoring and pair-bound pruning."""

import argparse
import csv
import heapq
import math
import multiprocessing
import os
import time
from collections import Counter
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait
from dataclasses import dataclass
from fileinput import FileInput, hook_compressed
from functools import lru_cache
from itertools import count, islice
from pathlib import Path

from maayanlab_bioinformatics.harmonization.ncbi_genes import ncbi_genes_fetch
from maayanlab_bioinformatics.parse.gmt import gmt_read_iter, parse_gene_unweighted
from scipy.stats import hypergeom

from index import build_inverted_index

PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
DATA_DIRECTORY = PROJECT_DIRECTORY / 'data'
TOP_K = 100_000
BOUND_LOG_PVALUE_TOLERANCE = 1e-7


@dataclass
class GeneSet:
    term: str
    genes: frozenset[str]
    input_row: int


@dataclass
class Crossing:
    rummagene: GeneSet
    perturbseqr: GeneSet
    rummageo: GeneSet
    genes: frozenset[str]
    log_pvalue: float
    jaccard: float


def human_protein_coding_count():
    """Count cached human protein-coding symbols for N; do not filter inputs."""
    annotations = ncbi_genes_fetch(
        organism='Mammalia/Homo_sapiens',
        cache_dir=str(DATA_DIRECTORY / 'background'),
    )
    return int(annotations['Symbol'].nunique())


def read_gmt(path, limit=None):
    """Read literal genes, preserving duplicate terms and physical row identities."""
    signatures = []
    with FileInput(files=[str(path)], openhook=hook_compressed, encoding='utf-8') as source:
        records = gmt_read_iter(source, parse_gene=parse_gene_unweighted)
        for header, genes in islice(records, limit):
            term = header.partition('\t')[0]  # Shared reader joins term and description.
            signatures.append(GeneSet(term, frozenset(genes), source.filelineno()))
    if not signatures:
        raise ValueError(f'{path}: empty GMT')
    return signatures


def conservative_log_pvalue(rummagene, perturbseqr, rummageo, overlap_size, population,
                            *, rummagene_perturbseqr_overlap_count,
                            hypergeometric_log_pvalue=None, log_pvalue_cutoff=0.0):
    """Maximum leave-one-out log P(overlap≥k); return None if a component fails."""
    if hypergeometric_log_pvalue is None:
        hypergeometric_log_pvalue = hypergeom.logsf

    # This component needs no additional pairwise intersection.
    rummageo_log_pvalue = hypergeometric_log_pvalue(
        overlap_size - 1, population, len(rummageo.genes),
        rummagene_perturbseqr_overlap_count,
    )
    if rummageo_log_pvalue > log_pvalue_cutoff:
        return None

    rummagene_log_pvalue = hypergeometric_log_pvalue(
        overlap_size - 1, population, len(rummagene.genes),
        len(perturbseqr.genes & rummageo.genes),
    )
    if rummagene_log_pvalue > log_pvalue_cutoff:
        return None
    perturbseqr_log_pvalue = hypergeometric_log_pvalue(
        overlap_size - 1, population, len(perturbseqr.genes),
        len(rummagene.genes & rummageo.genes),
    )
    if perturbseqr_log_pvalue > log_pvalue_cutoff:
        return None
    return float(max(rummagene_log_pvalue, perturbseqr_log_pvalue, rummageo_log_pvalue))


def optimistic_log_pvalue(source_sizes, overlap_count, population):
    """Log[choose(max known source size, overlap)/choose(N, overlap)]."""
    largest_source_size = max(source_sizes)
    if largest_source_size > population:
        # Do not prune using a bound outside the model's valid size range.
        return -math.inf
    return (
        math.lgamma(largest_source_size + 1)
        - math.lgamma(largest_source_size - overlap_count + 1)
        - math.lgamma(population + 1)
        + math.lgamma(population - overlap_count + 1)
    )


def ranking_key(result):
    """Higher is better: significance, Jaccard, overlap, then source identities."""
    return (
        -result.log_pvalue, result.jaccard, len(result.genes),
        result.rummagene.term, result.rummagene.input_row,
        result.rummageo.term, result.rummageo.input_row,
        result.perturbseqr.term, result.perturbseqr.input_row,
    )


def retain_candidate(heap, candidate, sequence, top_k):
    entry = (ranking_key(candidate), -next(sequence), candidate)
    if len(heap) < top_k:
        heapq.heappush(heap, entry)
    elif entry[:2] > heap[0][:2]:
        heapq.heapreplace(heap, entry)


@dataclass
class CrossingSearch:
    rummagene_sets: list
    perturbseqr_sets: list
    rummageo_sets: list
    population: int
    minimum_overlap: int
    maximum_pvalue: float
    top_k: int
    shared_log_pvalue_cutoff: object = None

    def __post_init__(self):
        self.perturbseqr_gene_index = build_inverted_index(self.perturbseqr_sets)
        self.rummageo_gene_index = build_inverted_index(self.rummageo_sets)
        self.cached_hypergeometric_log_pvalue = lru_cache(maxsize=100_000)(hypergeom.logsf)

    def cutoff(self, heap):
        cutoff = math.log(self.maximum_pvalue)
        if self.shared_log_pvalue_cutoff is not None:
            cutoff = min(cutoff, self.shared_log_pvalue_cutoff.value)
        if len(heap) == self.top_k:
            cutoff = min(cutoff, -heap[0][0][0])
        return cutoff


def search_signatures(rummagene_signature_positions, search):
    """One search kernel shared by serial execution and parallel workers."""
    rummagene_sets, perturbseqr_sets, rummageo_sets = (
        search.rummagene_sets, search.perturbseqr_sets, search.rummageo_sets,
    )
    population, minimum_overlap = search.population, search.minimum_overlap
    perturbseqr_gene_index, rummageo_gene_index = search.perturbseqr_gene_index, search.rummageo_gene_index
    cached_hypergeometric_log_pvalue = search.cached_hypergeometric_log_pvalue
    heap = []
    sequence = count()

    for rummagene_signature_position in rummagene_signature_positions:
        rummagene = rummagene_sets[rummagene_signature_position]
        matching_perturbseqr_signature_positions = set()
        for gene in rummagene.genes:
            matching_perturbseqr_signature_positions.update(
                perturbseqr_gene_index.get(gene, [])
            )

        # Keep original input order while visiting only overlapping signatures.
        for perturbseqr_signature_position in sorted(matching_perturbseqr_signature_positions):
            perturbseqr = perturbseqr_sets[perturbseqr_signature_position]
            rummagene_perturbseqr_intersection = rummagene.genes & perturbseqr.genes
            rummagene_perturbseqr_overlap_count = len(rummagene_perturbseqr_intersection)
            if rummagene_perturbseqr_overlap_count < minimum_overlap:
                continue

            log_pvalue_cutoff = search.cutoff(heap)
            best_possible_log_pvalue = optimistic_log_pvalue(
                (len(rummagene.genes), len(perturbseqr.genes)),
                rummagene_perturbseqr_overlap_count, population,
            )
            # Reject impossible branches; preserve ties and near-boundary candidates.
            if best_possible_log_pvalue > log_pvalue_cutoff + BOUND_LOG_PVALUE_TOLERANCE:
                continue

            rummageo_overlap_counts = Counter()
            for gene in rummagene_perturbseqr_intersection:
                for rummageo_signature_index in rummageo_gene_index.get(gene, []):
                    rummageo_overlap_counts[rummageo_signature_index] += 1

            # Only signatures reached through shared genes have a nonempty triple.
            for rummageo_signature_index, overlap_count in rummageo_overlap_counts.items():
                if overlap_count < minimum_overlap:
                    continue
                rummageo = rummageo_sets[rummageo_signature_index]

                log_pvalue_cutoff = search.cutoff(heap)

                # Actual overlap and all three sizes tighten the optimistic bound.
                best_possible_log_pvalue = optimistic_log_pvalue(
                    (len(rummagene.genes), len(perturbseqr.genes), len(rummageo.genes)),
                    overlap_count, population,
                )
                if best_possible_log_pvalue > log_pvalue_cutoff + BOUND_LOG_PVALUE_TOLERANCE:
                    continue

                log_pvalue = conservative_log_pvalue(
                    rummagene, perturbseqr, rummageo, overlap_count, population,
                    rummagene_perturbseqr_overlap_count=rummagene_perturbseqr_overlap_count,
                    hypergeometric_log_pvalue=cached_hypergeometric_log_pvalue,
                    log_pvalue_cutoff=log_pvalue_cutoff,
                )
                if log_pvalue is None:
                    continue
                three_way_intersection = rummagene_perturbseqr_intersection & rummageo.genes
                three_way_union = rummagene.genes | perturbseqr.genes | rummageo.genes
                candidate = Crossing(
                    rummagene, perturbseqr, rummageo, three_way_intersection,
                    log_pvalue, overlap_count / len(three_way_union),
                )
                retain_candidate(heap, candidate, sequence, search.top_k)

    return [entry[2] for entry in sorted(heap, key=lambda entry: entry[:2], reverse=True)]


_worker_search = None


def search_one_signature(rummagene_signature_position):
    results = search_signatures([rummagene_signature_position], _worker_search)
    return [(
        rummagene_signature_position,
        _worker_search.perturbseqr_positions[id(result.perturbseqr)],
        _worker_search.rummageo_positions[id(result.rummageo)],
        result.genes, result.log_pvalue, result.jaccard,
    ) for result in results]


def cross(rummagene_sets, perturbseqr_sets, rummageo_sets, population,
          *, minimum_overlap=5, maximum_pvalue=0.05, workers=1):
    """Global top-K per collection; workers share read-only inputs through fork."""
    if minimum_overlap < 1 or not 0 < maximum_pvalue <= 1 or workers < 1:
        raise ValueError('Overlap/workers must be positive; maximum_pvalue must be in (0, 1]')
    search = CrossingSearch(rummagene_sets, perturbseqr_sets, rummageo_sets, population,
                            minimum_overlap, maximum_pvalue, TOP_K)
    workers = min(workers, len(rummagene_sets))
    if workers <= 1:
        return search_signatures(range(len(rummagene_sets)), search)
    if 'fork' not in multiprocessing.get_all_start_methods():
        raise ValueError('Shared-index parallel crossing requires a POSIX fork platform; use workers=1')

    global _worker_search
    context = multiprocessing.get_context('fork')
    search.shared_log_pvalue_cutoff = context.Value('d', math.log(maximum_pvalue))
    search.perturbseqr_positions = {id(signature): position for position, signature in enumerate(perturbseqr_sets)}
    search.rummageo_positions = {id(signature): position for position, signature in enumerate(rummageo_sets)}
    _worker_search = search
    heap, sequence = [], count()
    executor = ProcessPoolExecutor(max_workers=workers, mp_context=context)
    try:
        positions = iter(range(len(rummagene_sets)))
        futures = {executor.submit(search_one_signature, next(positions))
                   for _ in range(min(workers * 2, len(rummagene_sets)))}
        while futures:
            completed, _ = wait(futures, return_when=FIRST_COMPLETED)
            for future in completed:
                futures.remove(future)
                for rummagene_position, perturbseqr_position, rummageo_position, genes, log_pvalue, jaccard in future.result():
                    result = Crossing(rummagene_sets[rummagene_position], perturbseqr_sets[perturbseqr_position],
                                      rummageo_sets[rummageo_position], genes, log_pvalue, jaccard)
                    retain_candidate(heap, result, sequence, TOP_K)
                if len(heap) == TOP_K:
                    search.shared_log_pvalue_cutoff.value = min(math.log(maximum_pvalue), -heap[0][0][0])
                next_position = next(positions, None)
                if next_position is not None:
                    futures.add(executor.submit(search_one_signature, next_position))
    except BaseException:
        if hasattr(executor, 'terminate_workers'):
            executor.terminate_workers()
        else:
            for process in executor._processes.values():
                process.terminate()
        raise
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
        _worker_search = None
    return [entry[2] for entry in sorted(heap, key=lambda entry: entry[:2], reverse=True)]


def write_tsv(path, results):
    columns = [
        'rank', 'rummagene', 'rummagene_row', 'perturbseqr', 'perturbseqr_row',
        'rummageo', 'rummageo_row', 'overlap', 'log_pvalue', 'pvalue', 'jaccard', 'genes',
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as target:
        writer = csv.DictWriter(target, fieldnames=columns, delimiter='\t', lineterminator='\n')
        writer.writeheader()
        for rank, result in enumerate(results, 1):
            writer.writerow({
                'rank': rank,
                'rummagene': result.rummagene.term,
                'rummagene_row': result.rummagene.input_row,
                'perturbseqr': result.perturbseqr.term,
                'perturbseqr_row': result.perturbseqr.input_row,
                'rummageo': result.rummageo.term,
                'rummageo_row': result.rummageo.input_row,
                'overlap': len(result.genes),
                'log_pvalue': result.log_pvalue,
                'pvalue': math.exp(result.log_pvalue),
                'jaccard': result.jaccard,
                'genes': ' '.join(sorted(result.genes)),
            })


def project_path(value):
    path = Path(value)
    return path if path.is_absolute() else PROJECT_DIRECTORY / path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rummagene', type=project_path, default=DATA_DIRECTORY / 'rummagene.gmt')
    parser.add_argument('--rummageo', type=project_path, default=DATA_DIRECTORY / 'rummageo-human.gmt.gz')
    parser.add_argument('--perturbseqr', type=project_path, required=True, help='One human Perturb-Seqr library GMT')
    parser.add_argument('--limit', type=int, help='Read only the first N sets from EACH input for a tiny demonstration')
    parser.add_argument('--output', type=project_path)
    parser.add_argument('--minimum-overlap', type=int, default=5)
    parser.add_argument('--maximum-pvalue', type=float, default=0.05, help='Maximum conservative raw p-value')
    parser.add_argument('--workers', type=int, default=min(4, os.cpu_count() or 1))
    args = parser.parse_args()
    if args.limit is not None and args.limit <= 0:
        parser.error('--limit must be positive')
    if args.minimum_overlap < 1 or not 0 < args.maximum_pvalue <= 1 or args.workers < 1:
        parser.error('--minimum-overlap/--workers must be positive; --maximum-pvalue must be in (0, 1]')

    rummagene = read_gmt(args.rummagene, args.limit)
    perturbseqr = read_gmt(args.perturbseqr, args.limit)
    rummageo = read_gmt(args.rummageo, args.limit)

    population = human_protein_coding_count()
    combinations = len(rummagene) * len(perturbseqr) * len(rummageo)
    print(f'Search space: {combinations:,} triples; fixed human protein-coding population: {population:,}', flush=True)
    started = time.perf_counter()
    results = cross(rummagene, perturbseqr, rummageo, population,
                    minimum_overlap=args.minimum_overlap, maximum_pvalue=args.maximum_pvalue, workers=args.workers)
    library_name = args.perturbseqr.name.removesuffix('.gz').removesuffix('.gmt')
    output = args.output or DATA_DIRECTORY / 'naive-crossings' / f'{library_name}.tsv'
    write_tsv(output, results)
    print(f'Retained {len(results):,} triples in {time.perf_counter() - started:.3f}s → {output}')


if __name__ == '__main__':
    main()
