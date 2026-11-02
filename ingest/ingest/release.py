"""Read and validate preserved data without changing its biological identities."""
from __future__ import annotations

import csv
import gzip
import json
import re
import uuid
from pathlib import Path

NAMESPACE = uuid.UUID('9eb284b7-2c33-52e5-8d37-1e682a48b97d')


def open_text(path):
    return gzip.open(path, 'rt', encoding='utf-8') if str(path).endswith('.gz') else open(path, encoding='utf-8')


def snake_case(value):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', value).lower()


def validate_records(records):
    terms = set()
    genes = {}
    hash_memberships = {}
    for record in records:
        term = record['term']
        members = record['genes']
        if not term or term in terms:
            raise ValueError(f'Empty or duplicate Tripothesis ID: {term}')
        terms.add(term)
        if not members or len({g['symbol'] for g in members}) != len(members):
            raise ValueError(f'Empty or duplicate membership: {term}')
        if record['n_gene_ids'] != len(members):
            raise ValueError(f'Gene-set size mismatch: {term}')
        metadata = record['metadata']
        if metadata['tripothesis_id'] != term:
            raise ValueError(f'Metadata ID mismatch: {term}')
        if metadata.get('three_way_overlap_count') not in (None, len(members)):
            raise ValueError(f'Metadata overlap size mismatch: {term}')
        if not metadata.get('release_id'):
            raise ValueError(f'Missing release: {term}')
        membership = frozenset(g['symbol'] for g in members)
        previous = hash_memberships.setdefault(record['hash'], membership)
        if previous != membership:
            raise ValueError(f'Conflicting gene-set hash: {term}')
        for gene in members:
            if not gene['symbol'] or gene['symbol'] != gene['symbol'].upper():
                raise ValueError(f'Expected normalized gene symbol: {gene}')
            if genes.setdefault(gene['symbol'], gene['id']) != gene['id']:
                raise ValueError(f'Conflicting gene UUID: {gene["symbol"]}')
    if not records or len({r['metadata']['release_id'] for r in records}) != 1:
        raise ValueError('Expected exactly one nonempty release')
    return records


def load_snapshot(path: Path):
    with open_text(path) as source:
        payload = json.load(source)
    if payload.get('format') != 'tripothesis-snapshot-v1':
        raise ValueError('Unsupported snapshot format')
    records = []
    for row in payload['geneSets']:
        metadata = row['tripothesisMetadata']
        genes = row['genes']
        if metadata['totalCount'] != 1 or len(metadata['nodes']) != 1:
            raise ValueError(f'Expected one metadata row: {row["term"]}')
        if genes['totalCount'] != len(genes['nodes']):
            raise ValueError(f'Truncated membership: {row["term"]}')
        records.append({
            'id': row['id'], 'term': row['term'], 'description': row['description'],
            'hash': row['hash'], 'n_gene_ids': row['nGeneIds'], 'genes': genes['nodes'],
            'metadata': {snake_case(k): v for k, v in metadata['nodes'][0].items()},
        })
    if len(records) != payload['counts']['geneSets']['totalCount']:
        raise ValueError('Snapshot row count mismatch')
    validate_records(records)
    if len({g['id'] for r in records for g in r['genes']}) != payload['counts']['currentBackground']['nGeneIds']:
        raise ValueError('Snapshot background mismatch')
    return records


def load_gmt_metadata(gmt_path: Path, metadata_path: Path):
    with open_text(metadata_path) as source:
        rows = list(csv.DictReader(source, delimiter='\t'))
    metadata = {row.get('tripothesis_id', row.get('tripothesisId')):
                {snake_case(k): (v if v != '' else None) for k, v in row.items()} for row in rows}
    if len(metadata) != len(rows):
        raise ValueError('Duplicate metadata IDs')
    records = []
    with open_text(gmt_path) as source:
        for line in source:
            fields = line.rstrip('\n').split('\t')
            if len(fields) < 3 or fields[0] not in metadata:
                raise ValueError('Each GMT term must have metadata and genes')
            term, description, *symbols = fields
            row = metadata[term]
            for key in ('rank', 'final_rank', 'genomics_set_size', 'transcriptomics_set_size',
                        'epigenomics_set_size', 'three_way_overlap_count', 'pubmed_triple_count'):
                if row.get(key) is not None:
                    row[key] = int(row[key])
            records.append({
                'id': row.get('gene_set_id') or str(uuid.uuid5(NAMESPACE, term)),
                'term': term, 'description': description,
                'hash': str(uuid.uuid5(NAMESPACE, '\t'.join(sorted(set(symbols))))),
                'n_gene_ids': len(symbols), 'metadata': row,
                'genes': [{'id': str(uuid.uuid5(NAMESPACE, 'gene:' + s)), 'symbol': s} for s in symbols],
            })
    if len(records) != len(metadata):
        raise ValueError('Metadata and GMT term counts differ')
    return validate_records(records)
