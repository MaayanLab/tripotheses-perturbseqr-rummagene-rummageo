import json
import os
from pathlib import Path

import click

from ingest.cli import cli
from ingest.release import load_gmt_metadata, load_snapshot

METADATA_COLUMNS = '''tripothesis_id release_id rank final_rank human_readable_title
genomics_term genomics_library transcriptomics_term transcriptomics_library
epigenomics_term epigenomics_library genomics_set_size transcriptomics_set_size
epigenomics_set_size three_way_overlap_count three_way_overlap_genes ranking_score
pubmed_novelty_score pubmed_triple_count source_crossing modality_crossing
p_value_conservative neg_log10_p_value three_way_jaccard_similarity
novelty_adjusted_priority_score composition_adjusted_priority_score report_path report_url'''.split()


@cli.command('tripothesis')
@click.option('--snapshot', type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option('--gmt', type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option('--metadata', type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option('--replace', is_flag=True, help='Replace all existing gene sets and metadata with this release.')
@click.option('--index/--no-index', default=True, help='Refresh the Rust background after committing data.')
@click.pass_context
def tripothesis(ctx, snapshot, gmt, metadata, replace, index):
    """Load one release. Re-running it updates the same identities."""
    if bool(snapshot) == bool(gmt or metadata) or (not snapshot and not (gmt and metadata)):
        raise click.UsageError('Provide --snapshot OR both --gmt and --metadata.')
    records = load_snapshot(snapshot) if snapshot else load_gmt_metadata(gmt, metadata)
    from psycopg2.extras import execute_values
    from ingest.plpy import plpy
    release = records[0]['metadata']['release_id']
    genes = {g['symbol']: g['id'] for r in records for g in r['genes']}
    with plpy.conn, plpy.conn.cursor() as cur:
        # Serialize importers so two concurrent releases cannot pass the empty-db check.
        cur.execute("select pg_advisory_xact_lock(hashtext('tripothesis-ingest'))")
        if replace:
            cur.execute('delete from app_public.gene_set')
            cur.execute('delete from app_public.gene where not (symbol = any(%s))', (list(genes),))
        cur.execute('select distinct release_id from app_public.tripothesis_metadata')
        existing = {row[0] for row in cur.fetchall()}
        if existing - {release}:
            raise click.ClickException('Use a fresh database for a different release; active releases cannot be mixed.')
        cur.execute('select term from app_public.gene_set')
        if {row[0] for row in cur.fetchall()} - {r['term'] for r in records}:
            raise click.ClickException('Database contains gene sets outside this release. Use a fresh database.')
        execute_values(cur, '''insert into app_public.gene (symbol,id) values %s
            on conflict(symbol) do nothing''', list(genes.items()), template='(%s,%s::uuid)')
        cur.execute('select symbol,id::text from app_public.gene where symbol=any(%s)', (list(genes),))
        mapping = dict(cur.fetchall())
        execute_values(cur, '''insert into app_public.gene_set (id,term,description,hash,gene_ids,n_gene_ids)
            values %s on conflict(term) do update set description=excluded.description,
            hash=excluded.hash,gene_ids=excluded.gene_ids,n_gene_ids=excluded.n_gene_ids''', [
            (r['id'], r['term'], r['description'], r['hash'],
             json.dumps({mapping[g['symbol']]: i for i, g in enumerate(r['genes'])}), r['n_gene_ids'])
            for r in records], template='(%s::uuid,%s,%s,%s::uuid,%s::jsonb,%s)')
        cur.execute('select term,id::text from app_public.gene_set')
        ids = dict(cur.fetchall())
        columns = ['gene_set_id', *METADATA_COLUMNS, 'source_record']
        execute_values(cur,
            f"insert into app_public.tripothesis_metadata ({','.join(columns)}) values %s "
            'on conflict(gene_set_id) do update set ' + ','.join(f'{c}=excluded.{c}' for c in columns[1:]),
            [(ids[r['term']], *[r['metadata'].get(c) for c in METADATA_COLUMNS], json.dumps(r['metadata'])) for r in records])
    click.echo(f'Loaded {len(records)} Tripotheses, {len(genes)} genes, release {release}.')
    if index:
        from ingest.cli.update_background import update_background
        ctx.invoke(update_background, enrich_url=os.environ.get('ENRICH_URL', 'http://127.0.0.1:8000'))
