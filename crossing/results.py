"""Uncapped top-K physical triplets and their tabular output."""

import csv
import gzip
import heapq
import math


def ranking_key(row):
    sources = row.rummagene, row.rummageo, row.perturbseqr
    return (-row.log_pvalue, row.jaccard, len(row.genes),
            *[value for source in sources for value in (source.lexical_rank, len(source.genes))],
            *(source.position for source in sources))


def identity(row):
    return row.rummagene.position, row.perturbseqr.position, row.rummageo.position


class TopK:
    def __init__(self, limit):
        self.limit, self.best, self.heap = limit, {}, []

    def __len__(self):
        return len(self.best)

    def clean(self):
        while self.heap and self.best.get(self.heap[0][1], (None,))[0] != self.heap[0][0]:
            heapq.heappop(self.heap)

    @property
    def cutoff(self):
        self.clean()
        return math.nextafter(-self.heap[0][0][0], math.inf) if len(self) == self.limit else 0.0

    def retain(self, row):
        identifier, key = identity(row), ranking_key(row)
        previous = self.best.get(identifier)
        if previous is not None and key <= previous[0]:
            return
        if previous is None and len(self) == self.limit and key <= self.heap[0][0]:
            return
        if previous is not None:
            row.genes = previous[1].genes
        self.best[identifier] = key, row
        heapq.heappush(self.heap, (key, identifier))
        self.clean()
        if len(self) > self.limit:
            del self.best[heapq.heappop(self.heap)[1]]
            self.clean()
        if len(self.heap) > 2 * self.limit:
            self.heap = [(value[0], identifier) for identifier, value in self.best.items()]
            heapq.heapify(self.heap)

    def ranked_results(self):
        return [row for _, row in sorted(self.best.values(), key=lambda value: value[0], reverse=True)]


COLUMNS = ['rank', 'rummagene', 'rummagene_row', 'perturbseqr', 'perturbseqr_row',
           'rummageo', 'rummageo_row', 'overlap', 'log_pvalue', 'pvalue', 'jaccard', 'genes']


def fields(rank, row, library):
    return [rank, row.rummagene.term, row.rummagene.input_row, row.perturbseqr.term,
            row.perturbseqr.input_row, row.rummageo.term, row.rummageo.input_row,
            len(row.genes), row.log_pvalue, math.exp(row.log_pvalue), row.jaccard,
            ' '.join(sorted(library.literal_genes(row.genes)))]


def write_results(path, rows, libraries):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.partial')
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(temporary, 'wt', newline='') as target:
        writer = csv.writer(target, delimiter='\t', lineterminator='\n')
        writer.writerow(COLUMNS)
        for rank, row in enumerate(rows, 1):
            writer.writerow(fields(rank, row, libraries[0]))
    temporary.replace(path)
