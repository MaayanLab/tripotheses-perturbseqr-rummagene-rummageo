#!/usr/bin/env python3
"""Combine completed raw (uncapped) crossing catalogs from several Perturb-Seqr libraries into one
website release.

Each --catalog is a `libraries/<library>/run` directory holding crossings.tsv.gz and manifest.json.
Writes tripothesis.gmt.gz, tripothesis_metadata.tsv.gz and manifest.json to --output, in the format
`python -m ingest tripothesis --gmt ... --metadata ...` accepts. Labels: paper title and worksheet for
Rummagene (titles from rummagene.com, cached in data/releases/rummagene-paper-metadata.json),
group descriptions for RummaGEO, and experimental conditions for Perturb-Seqr.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ingest'))
from ingest.release import load_gmt_metadata  # noqa: E402

csv.field_size_limit(sys.maxsize)
PAPER_QUERY = 'query($ids:[String]!){getPmcInfoByIds(pmcids:$ids){nodes{pmcid title yr doi}}}'

def sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def clean(value):
    return ' '.join(str(value or '').split())


def table_label(term):
    match = re.search(r'\.(?:xlsx?|csv|tsv|txt|pdf)(?:\.gz)?-(.+)$', term, re.I)
    if not match:
        return ''
    sheet, _, column = match[1].rpartition('-')
    sheet = clean((sheet or column).replace('_', ' '))
    column = clean(column.replace('_', ' '))
    if re.fullmatch(r'sheet\s*\d+', sheet, re.I):
        sheet = ''
    generic = r'(?:unnamed\s*\d+|gene(?:s| name| names| symbol| symbols)?|symbol|symbols|id|ids|entrez.*|refgene name)'
    if not re.fullmatch(generic, column, re.I) and column != sheet:
        sheet = ' — '.join(filter(None, [sheet, column]))
    return sheet


def fetch_papers(pmcids, cache):
    metadata = json.loads(cache.read_text()) if cache.exists() else {'papers': {}}
    papers = metadata['papers']
    # Papers absent upstream are recorded as null so reruns do not request them again.
    missing = [pmcid for pmcid in pmcids if pmcid not in papers]
    for start in range(0, len(missing), 100):
        batch = missing[start:start + 100]
        request = Request('https://rummagene.com/graphql',
            data=json.dumps({'query': PAPER_QUERY, 'variables': {'ids': batch}}).encode(),
            headers={'Content-Type': 'application/json'})
        for attempt in range(3):
            try:
                with urlopen(request, timeout=90) as response:
                    payload = json.load(response)
                if payload.get('errors'):
                    raise ValueError(payload['errors'])
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
        found = {entry['pmcid']: entry for entry in payload['data']['getPmcInfoByIds']['nodes']}
        papers.update({pmcid: found.get(pmcid) for pmcid in batch})
    if missing or not cache.exists():
        metadata.update(retrievedAt=datetime.now(timezone.utc).isoformat(),
                        source='https://rummagene.com/graphql', query=PAPER_QUERY)
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(metadata, indent=2) + '\n')
    return papers


def rummagene_labels(term, papers, missing):
    pmcid = re.match(r'PMC\d+', term)[0]
    paper = papers.get(pmcid) or {}
    title = clean(paper.get('title'))
    if not title:
        missing.add(pmcid)
    table = table_label(term)
    return {
        'rummagene_pmc_id': pmcid, 'rummagene_paper_title': title,
        'rummagene_paper_year': paper.get('yr') or '', 'rummagene_doi': paper.get('doi') or '',
        'rummagene_table_label': table,
        'rummagene_display': ' — '.join(filter(None, [title or pmcid, table])) + (f' [{pmcid}]' if title else ''),
    }


def rummageo_labels(term, geo, missing):
    match = re.fullmatch(r'(GSE\d+(?:,GSE\d+)*)-(\d+)-vs-(\d+)-human\s+(up|dn|down)', term)
    if not match:
        raise ValueError(f'Unrecognized RummaGEO identity: {term}')
    accession, first, second, direction = match.groups()
    titles = geo.get(accession, {}).get('titles', {})
    label_first, label_second = clean(titles.get(first)), clean(titles.get(second))
    if not label_first or not label_second:
        missing.add(term)
    direction = 'upregulated' if direction == 'up' else 'downregulated'
    comparison = f'{label_first} vs {label_second}' if label_first and label_second else f'group {first} vs group {second}'
    return {
        'rummageo_accession': accession, 'rummageo_group_first': first, 'rummageo_group_second': second,
        'rummageo_group_first_label': label_first, 'rummageo_group_second_label': label_second,
        'rummageo_direction': direction, 'rummageo_display': f'{comparison}; {direction} [{accession}]',
    }


LIBRARY_LABELS = {
    'tahoe-100m': 'Tahoe-100M', 'replogle-perturb-seq': 'Replogle Perturb-seq',
    'creeds-chem': 'CREEDS (drug)', 'creeds-gene': 'CREEDS (gene)', 'deepcover-moa': 'DeepCover MoA',
    'lincs-l1000-cp': 'LINCS L1000 (chemical)', 'lincs-l1000-xpr': 'LINCS L1000 (CRISPR)',
    'microarrays-cmap': 'CMap', 'perturb-atlas-human': 'Perturb Atlas', 'sciplex': 'SciPlex',
    'ginkgo-bioworks': 'Ginkgo Bioworks', 'nibr-drug-seq': 'NIBR DRUG-seq', 'cm4ai': 'CM4AI',
}


def perturbseqr_labels(term, library):
    # <library>::<perturbation>::<cell line>::<tissue>::<time>::<dose>[::extras] <direction>::SIG_<id>
    parts = term.split('::')
    if parts[0] != library or not parts[-1].startswith('SIG_'):
        raise ValueError(f'Unrecognized {library} identity: {term}')
    fields = parts[1:-1]
    last = re.fullmatch(r'(.*)\s+(up|down)', fields[-1])
    if not last:
        raise ValueError(f'Unrecognized direction: {term}')
    fields[-1] = last[1]
    perturbation, *context = (clean(f) for f in fields)
    context = [c.replace('uM', ' µM') for c in context[:4] if c]
    direction = 'upregulated' if last[2] == 'up' else 'downregulated'
    return {
        'perturbseqr_term': '::'.join(parts[1:-1]),
        'perturbseqr_display': f"{perturbation} — {', '.join(context) or LIBRARY_LABELS[library]}; {direction}",
    }


def read_rows(catalog):
    with gzip.open(catalog / 'crossings.tsv.gz', 'rt', encoding='utf-8', newline='') as source:
        yield from csv.DictReader(source, delimiter='\t')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--catalog', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--release-id', required=True)
    parser.add_argument('--scope', required=True, help='Plain-language scope stored on every row.')
    parser.add_argument('--geo-metadata', type=Path, default=ROOT / 'data/rummageo-human-metadata.json')
    args = parser.parse_args()

    # Pass 1 (small): check catalogs, collect p-values for one ranking across libraries, and PMC IDs.
    catalogs, scores, pmcids = [], [], set()
    population = None
    for c, catalog in enumerate(args.catalog):
        manifest = json.loads((catalog / 'manifest.json').read_text())
        params = manifest['parameters']
        if manifest.get('complete') is not True:
            raise SystemExit(f'{catalog} is not marked complete.')
        for entry in manifest['outputs']:
            if sha256(catalog / entry['file']) != entry['sha256']:
                raise SystemExit(f"Checksum mismatch: {catalog / entry['file']}")
        if population not in (None, params['population']):
            raise SystemExit('Catalogs use different statistical populations.')
        population = params['population']
        n = 0
        for i, row in enumerate(read_rows(catalog)):
            scores.append((float(row['log_pvalue']), c, i))
            pmcids.add(re.match(r'PMC\d+', row['rummagene'])[0])
            n += 1
        if n != manifest['returned_triplets']:
            raise SystemExit(f'{catalog}: row count differs from manifest.json.')
        catalogs.append({'library': params['library'], 'path': str(catalog), 'rows': n,
                         'selection': manifest['selection'], 'outputs': manifest['outputs'],
                         'indexMetadataSha256': params['index_metadata_sha256']})
    scores.sort()  # ties keep catalog then row order
    ranks = [dict() for _ in catalogs]
    for rank, (_, c, i) in enumerate(scores, 1):
        ranks[c][i] = rank
    del scores

    papers = fetch_papers(sorted(pmcids), args.output.parent / 'rummagene-paper-metadata.json')
    geo = json.loads(args.geo_metadata.read_text())

    # Pass 2: write each library's rows straight to the release files.
    args.output.mkdir(parents=True, exist_ok=True)
    gmt_path = args.output / 'tripothesis.gmt.gz'
    metadata_path = args.output / 'tripothesis_metadata.tsv.gz'
    missing_papers, missing_comparisons = set(), set()
    ids, hashes, background = set(), set(), set()
    memberships, writer, example = 0, None, None
    with gzip.open(gmt_path, 'wt', encoding='utf-8', compresslevel=6) as gmt, \
            gzip.open(metadata_path, 'wt', encoding='utf-8', newline='', compresslevel=6) as meta:
        for c, catalog in enumerate(args.catalog):
            library = catalogs[c]['library']
            for i, row in enumerate(read_rows(catalog)):
                genes = row['genes'].split()
                if int(row['overlap']) != len(genes) or len(set(genes)) != len(genes):
                    raise SystemExit(f"Bad membership: {library} rank {row['rank']}")
                # Source row numbers are part of the identity: Rummagene repeats a few terms on separate rows.
                identity = '\t'.join([library, *(row[key] for key in (
                    'rummagene', 'rummagene_row', 'rummageo', 'rummageo_row', 'perturbseqr', 'perturbseqr_row'))])
                neg_log10 = -float(row['log_pvalue']) / math.log(10)
                rank = ranks[c][i]
                record = {
                    'tripothesis_id': 'TRIPO_' + hashlib.sha256(identity.encode()).hexdigest()[:24].upper(),
                    'rank': rank, 'library_rank': row['rank'],
                    'source1': 'rummagene', 'term1': row['rummagene'], 'term1_row': row['rummagene_row'],
                    'source2': 'rummageo-human', 'term2': row['rummageo'],
                    'source3': library, 'term3': row['perturbseqr'],
                    'pvalue': row['pvalue'], 'log_pvalue': row['log_pvalue'], 'jaccard': row['jaccard'],
                    'overlap': row['overlap'], 'genes': row['genes'],
                    'release_id': args.release_id, 'final_rank': rank,
                    'three_way_overlap_count': row['overlap'], 'three_way_overlap_genes': row['genes'],
                    'ranking_score': repr(neg_log10), 'neg_log10_p_value': repr(neg_log10),
                    'p_value_conservative': row['pvalue'], 'three_way_jaccard_similarity': row['jaccard'],
                    'source_crossing': f'Rummagene × human RummaGEO × {LIBRARY_LABELS[library]}',
                    'modality_crossing': 'literature × transcriptomics × perturbational transcriptomics',
                    'dataset_scope': args.scope, 'statistical_population': population,
                    'catalog_selection': catalogs[c]['selection'],
                    **rummagene_labels(row['rummagene'], papers, missing_papers),
                    **rummageo_labels(row['rummageo'], geo, missing_comparisons),
                    **perturbseqr_labels(row['perturbseqr'], library),
                }
                title = record['human_readable_title'] = ' × '.join(
                    record[key] for key in ('rummagene_display', 'rummageo_display', 'perturbseqr_display'))
                if any(character in title for character in '\t\n\r'):
                    raise SystemExit(f"Title contains a GMT delimiter: {record['tripothesis_id']}")
                if record['tripothesis_id'] in ids:
                    raise SystemExit(f"Duplicate Tripothesis ID: {record['tripothesis_id']}")
                ids.add(record['tripothesis_id'])
                hashes.add(hashlib.sha256(' '.join(sorted(genes)).encode()).digest()[:16])
                background.update(genes)
                memberships += len(genes)
                if writer is None:
                    writer = csv.DictWriter(meta, fieldnames=list(record), delimiter='\t', lineterminator='\n')
                    writer.writeheader()
                writer.writerow(record)
                gmt.write('\t'.join([record['tripothesis_id'], title, *genes]) + '\n')
                if rank == 1:
                    example = title

    # Spot-check the importer's own loader on the first rows of what was written.
    sample = args.output / '.sample'
    sample.mkdir(exist_ok=True)
    with gzip.open(gmt_path, 'rt', encoding='utf-8') as source, gzip.open(sample / 'g.gz', 'wt', encoding='utf-8') as target:
        for _, line in zip(range(1000), source):
            target.write(line)
    with gzip.open(metadata_path, 'rt', encoding='utf-8') as source, gzip.open(sample / 'm.gz', 'wt', encoding='utf-8') as target:
        for _, line in zip(range(1001), source):
            target.write(line)
    load_gmt_metadata(sample / 'g.gz', sample / 'm.gz')
    for path in sample.iterdir():
        path.unlink()
    sample.rmdir()

    manifest = {
        'releaseId': args.release_id, 'createdAt': datetime.now(timezone.utc).isoformat(), 'scope': args.scope,
        'geneSets': len(ids), 'distinctGeneSets': len(hashes), 'backgroundGenes': len(background),
        'memberships': memberships, 'crossingStatisticalPopulation': population, 'catalogs': catalogs,
        'labels': {'rummageoMetadataSha256': sha256(args.geo_metadata),
                   'missingPaperTitles': sorted(missing_papers),
                   'missingComparisonLabels': sorted(missing_comparisons)},
        'files': [{'name': path.name, 'bytes': path.stat().st_size, 'sha256': sha256(path)}
                  for path in (gmt_path, metadata_path)],
    }
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({key: manifest[key] for key in ('releaseId', 'geneSets', 'distinctGeneSets', 'backgroundGenes', 'memberships', 'files')}, indent=2))
    print(f'Missing paper titles: {len(missing_papers)}; missing comparison labels: {len(missing_comparisons)}')
    print('Example title:', example)


if __name__ == '__main__':
    main()
