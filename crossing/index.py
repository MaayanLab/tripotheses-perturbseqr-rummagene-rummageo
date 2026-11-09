"""Literal GMT libraries or bounded-cache views of validated numeric inputs."""

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from fileinput import FileInput, hook_compressed
from functools import cached_property, lru_cache
from pathlib import Path

import numpy as np
from maayanlab_bioinformatics.parse.gmt import gmt_read_iter, parse_gene_unweighted


@dataclass
class GeneSet:
    term: str
    genes: frozenset
    input_row: int
    position: int = 0
    lexical_rank: int = 0


def build_inverted_index(signatures):
    postings = defaultdict(list)
    for position, signature in enumerate(signatures):
        for gene in signature.genes:
            postings[gene].append(position)
    return dict(postings)


class Library:
    def __init__(self, signatures):
        signatures = list(signatures)
        counts = Counter(row.term for row in signatures)
        terms = [f'{row.term}::ROW_{row.input_row}' if counts[row.term] > 1 else row.term for row in signatures]
        order = sorted(range(len(signatures)), key=lambda position: (terms[position], signatures[position].input_row))
        ranks = dict(zip(order, range(len(order))))
        self.rows = [GeneSet(row.term, row.genes, row.input_row, i, ranks[i]) for i, row in enumerate(signatures)]
        self.sizes = np.array([len(row.genes) for row in self.rows], dtype=np.int64)
        self.lines = np.array([row.input_row for row in self.rows], dtype=np.int64)

    @classmethod
    def from_gmt(cls, path):
        with FileInput(files=[str(path)], openhook=hook_compressed, encoding='utf-8') as source:
            rows = [GeneSet(header.partition('\t')[0], frozenset(genes), source.filelineno())
                    for header, genes in gmt_read_iter(source, parse_gene=parse_gene_unweighted)]
        return cls(rows)

    def __len__(self):
        return len(self.sizes)

    def __getitem__(self, position):
        return self.rows[position]

    @cached_property
    def postings(self):
        return build_inverted_index(self)

    def by_row(self, row):
        position = int(np.searchsorted(self.lines, row))
        if position >= len(self) or int(self.lines[position]) != row:
            raise ValueError(f'Physical source row {row} is absent')
        return self[position]

    def literal_genes(self, genes):
        return genes


class MappedLibrary(Library):
    def __init__(self, directory, role):
        directory = Path(directory)
        metadata = json.loads((directory / 'index.json').read_text())
        if metadata.get('format') != 'tripotheses-validated-literal-index-v2':
            raise ValueError('Use a validated literal index view')
        def load(name):
            return np.load(directory / f'{role}_{name}.npy', mmap_mode='r')
        self.values, self.offsets, self.sizes, self.lines = map(load, ('genes', 'offsets', 'sizes', 'lines'))
        self.terms, self.term_offsets = map(load, ('terms_bytes', 'terms_offsets'))
        self.ranks = np.load(Path(metadata.get('original_index', directory)) / f'{role}_lex_rank.npy', mmap_mode='r')
        self.names = json.loads((directory / 'genes.json').read_text())
        self.overrides = metadata.get('term_overrides', {}).get(str(role), {})
        self.signature = lru_cache(maxsize=1024)(self.read_signature)
        self._postings = None
        if role in (1, 2):
            offsets, values = load('post_offsets'), load('postings')
            self._postings = {gene: values[offsets[gene]:offsets[gene + 1]] for gene in range(len(offsets) - 1)}

    def __getitem__(self, position):
        return self.signature(position)

    def read_signature(self, position):
        start, stop = self.offsets[position:position + 2]
        genes = frozenset(self.values[start:stop].tolist())
        term = bytes(self.terms[self.term_offsets[position]:self.term_offsets[position + 1]]).decode()
        override = self.overrides.get(str(int(self.lines[position])))
        if override is not None:
            if override['index_position'] != position or override['indexed_term'] != term:
                raise ValueError('Canonical term overlay does not match its input row')
            term = override['original_term']
        return GeneSet(term, genes, int(self.lines[position]), position, int(self.ranks[position]))

    @property
    def postings(self):
        return self._postings

    def literal_genes(self, genes):
        return frozenset(self.names[gene] for gene in genes)


def count_overlaps(query, postings, target_count, minimum):
    counts = np.zeros(target_count, dtype=np.int64)
    chunks, items = [], 0
    for gene in query:
        values = postings.get(gene, ())
        if len(values):
            chunks.append(values)
            items += len(values)
        if items >= 1000000:
            counts += np.bincount(np.concatenate(chunks), minlength=target_count)
            chunks, items = [], 0
    if chunks:
        counts += np.bincount(np.concatenate(chunks), minlength=target_count)
    positions = np.flatnonzero(counts >= minimum)
    return dict(zip(positions.tolist(), counts[positions].tolist()))
