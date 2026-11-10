"""Source-library gene sets (RummaGene, RummaGEO, Perturb-Seqr) behind each Tripothesis.

`extract-source-gene-sets` scans the full source GMTs once and writes only the sets a release
references to a small GMT (`term<TAB>source<TAB>genes...`), shipped alongside the release.
`source-gene-sets` loads that file into `app_public.source_gene_set`.
"""
import csv
import gzip
from collections import defaultdict
from pathlib import Path

import click

from ingest.cli import cli
from ingest.release import open_text


def referenced_terms(metadata_path: Path):
    """{source: {term: expected size or None}} from a release metadata TSV."""
    wanted = defaultdict(dict)
    with open_text(metadata_path) as source:
        for row in csv.DictReader(source, delimiter='\t'):
            for n in (1, 2, 3):
                library, term = row.get(f'source{n}'), row.get(f'term{n}')
                if not library or not term:
                    raise click.ClickException(f'Missing source{n}/term{n} for {row.get("tripothesis_id")}')
                size = row.get(f'term{n}Length') or row.get(f'term{n}_length')
                wanted[library][term] = int(size) if size else None
    return wanted


@cli.command('extract-source-gene-sets')
@click.option('--metadata', required=True, type=click.Path(exists=True, dir_okay=False, path_type=Path),
              help='Release tripothesis_metadata.tsv.gz')
@click.option('--library', 'libraries', multiple=True, required=True,
              help='source=path to the full source GMT, e.g. rummagene=data/rummagene.gmt')
@click.option('--output', required=True, type=click.Path(dir_okay=False, path_type=Path))
def extract_source_gene_sets(metadata, libraries, output):
    """Write the source gene sets a release references."""
    wanted = referenced_terms(metadata)
    paths = dict(lib.split('=', 1) for lib in libraries)
    if missing := set(wanted) - set(paths):
        raise click.UsageError(f'No --library given for: {", ".join(sorted(missing))}')
    found = {}
    for library, path in paths.items():
        terms = wanted.get(library, {})
        with open_text(path) as source:
            for line in source:
                term, _, rest = line.partition('\t')
                if term not in terms:
                    continue
                # GMT: term, description, genes; keep first occurrence, drop blanks/duplicates
                genes = list(dict.fromkeys(g for g in rest.rstrip('\n').split('\t')[1:] if g))
                if terms[term] is not None and len(genes) != terms[term]:
                    raise click.ClickException(f'{library} {term}: {len(genes)} genes, expected {terms[term]}')
                found[(library, term)] = genes
    missing = [(lib, t) for lib, terms in wanted.items() for t in terms if (lib, t) not in found]
    if missing:
        raise click.ClickException(f'{len(missing)} referenced gene sets not found, e.g. {missing[:3]}')
    output.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output, 'wt', encoding='utf-8', compresslevel=6) as target:
        for (library, term), genes in sorted(found.items()):
            target.write('\t'.join([term, library, *genes]) + '\n')
    click.echo(f'Wrote {len(found)} source gene sets to {output}.')


@cli.command('source-gene-sets')
@click.option('--gmt', required=True, type=click.Path(exists=True, dir_okay=False, path_type=Path),
              help='Output of extract-source-gene-sets')
@click.option('--replace', is_flag=True, help='Delete existing source gene sets first.')
def source_gene_sets(gmt, replace):
    """Load source gene sets for the active release."""
    from psycopg2.extras import execute_values
    from ingest.plpy import plpy
    with open_text(gmt) as source:
        rows = [(library, term, genes, len(genes))
                for term, library, *genes in (line.rstrip('\n').split('\t') for line in source)]
    with plpy.conn, plpy.conn.cursor() as cur:
        if replace:
            cur.execute('delete from app_public.source_gene_set')
        execute_values(cur, '''insert into app_public.source_gene_set (source, term, genes, n_genes) values %s
            on conflict (source, term) do update set genes = excluded.genes, n_genes = excluded.n_genes''',
            rows, page_size=200)
        cur.execute('''select count(*) from app_public.tripothesis_metadata tm
            cross join lateral (values (tm.source_record->>'source1', tm.source_record->>'term1'),
              (tm.source_record->>'source2', tm.source_record->>'term2'),
              (tm.source_record->>'source3', tm.source_record->>'term3')) v(source, term)
            where not exists (select 1 from app_public.source_gene_set sgs
              where sgs.source = v.source and sgs.term = v.term)''')
        missing = cur.fetchone()[0]
    click.echo(f'Loaded {len(rows)} source gene sets; {missing} Tripothesis source references still missing.')
