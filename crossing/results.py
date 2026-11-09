"""Uncapped exact-membership retention and observed supporting triplets."""

import csv
import gzip
import hashlib
import heapq
import math
import json
import os
import sqlite3
from contextlib import contextmanager


def ranking_key(row):
    sources = row.rummagene, row.rummageo, row.perturbseqr
    return (-row.log_pvalue, row.jaccard, len(row.genes),
            *[value for source in sources for value in (source.lexical_rank, len(source.genes))],
            *(source.position for source in sources))


def identity(row):
    return row.genes


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


@contextmanager
def support_writer(directory):
    stream = None
    def record(row):
        nonlocal stream
        if stream is None:
            directory.mkdir(parents=True, exist_ok=True)
            stream = gzip.open(directory / f'{os.getpid()}.jsonl.gz', 'at')
        stream.write(json.dumps([row.rummagene.position, row.perturbseqr.position,
            row.rummageo.position, row.log_pvalue, row.jaccard], separators=(',', ':')) + '\n')
    try:
        yield record if directory is not None else None
    finally:
        if stream is not None:
            stream.close()


def write_results(path, rows, libraries, support_directory):
    path.parent.mkdir(parents=True, exist_ok=True)
    support_directory.mkdir(parents=True, exist_ok=True)
    identifiers = {row.genes: 'INT_' + hashlib.sha256(json.dumps(sorted(libraries[0].literal_genes(row.genes)),
        separators=(',', ':')).encode()).hexdigest().upper() for row in rows}
    database = sqlite3.connect(support_directory / 'hits.sqlite')
    database.execute('create table if not exists hits (group_id text,r int,p int,g int,log_p real,jaccard real,primary key(r,p,g))')
    database.execute('delete from hits')
    for row in rows:
        database.execute('insert or ignore into hits values(?,?,?,?,?,?)', (identifiers[row.genes],
            row.rummagene.position, row.perturbseqr.position, row.rummageo.position, row.log_pvalue, row.jaccard))
    for archive in support_directory.glob('*.jsonl.gz'):
        with gzip.open(archive, 'rt') as source:
            batch = []
            for line in source:
                r, p, g, score, jaccard = json.loads(line)
                genes = libraries[0][r].genes & libraries[1][p].genes & libraries[2][g].genes
                if genes in identifiers:
                    batch.append((identifiers[genes], r, p, g, score, jaccard))
                if len(batch) >= 4096:
                    database.executemany('insert or ignore into hits values(?,?,?,?,?,?)', batch)
                    batch.clear()
            database.executemany('insert or ignore into hits values(?,?,?,?,?,?)', batch)
        database.commit()
    counts = dict(database.execute('select group_id,count(*) from hits group by group_id'))
    temporary = path.with_name(path.name + '.partial')
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(temporary, 'wt', newline='') as target:
        writer = csv.writer(target, delimiter='\t', lineterminator='\n')
        writer.writerow([COLUMNS[0], 'intersection_id', 'observed_support_count', *COLUMNS[1:]])
        for rank, row in enumerate(rows, 1):
            values = fields(rank, row, libraries[0])
            writer.writerow([values[0], identifiers[row.genes], counts[identifiers[row.genes]], *values[1:]])
    supports = path.with_name(path.name.removesuffix('.gz').removesuffix('.tsv') + '.supports.tsv.gz')
    support_temporary = supports.with_name(supports.name + '.partial')
    with gzip.open(support_temporary, 'wt', newline='') as target:
        writer = csv.writer(target, delimiter='\t', lineterminator='\n')
        writer.writerow(['intersection_id', 'rummagene', 'rummagene_row', 'perturbseqr', 'perturbseqr_row',
                         'rummageo', 'rummageo_row', 'log_pvalue', 'pvalue', 'jaccard'])
        for identifier, r, p, g, score, jaccard in database.execute('select * from hits order by group_id,r,p,g'):
            sources = (library[position] for library, position in zip(libraries, (r, p, g)))
            writer.writerow([identifier, *[value for source in sources for value in (source.term, source.input_row)],
                             score, math.exp(score), jaccard])
    database.close()
    support_temporary.replace(supports)
    temporary.replace(path)
