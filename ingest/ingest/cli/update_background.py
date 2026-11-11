import gzip
from pathlib import Path

import click

from ingest.cli import cli

PROTEIN_CODING = Path(__file__).resolve().parents[1] / 'data' / 'human_protein_coding_genes.txt.gz'


def protein_coding_symbols():
  with gzip.open(PROTEIN_CODING, 'rt', encoding='utf-8') as source:
    return [line.strip() for line in source if line.strip() and not line.startswith('#')]


@cli.command()
@click.option('--enrich-url', envvar='ENRICH_URL', default='http://127.0.0.1:8000')
def update_background(enrich_url):
  """Index human protein-coding genes (the crossings' population) plus any other Tripothesis genes."""
  import uuid
  import requests
  from psycopg2.extras import execute_values
  from ingest.plpy import plpy
  from ingest.release import NAMESPACE

  current_backgrounds = [
    row['id']
    for row in plpy.cursor('select id from app_public.background')
  ]
  with plpy.conn.cursor() as cur:
    execute_values(cur, 'insert into app_public.gene (symbol, id) values %s on conflict (symbol) do nothing',
      [(s, str(uuid.uuid5(NAMESPACE, 'gene:' + s))) for s in protein_coding_symbols()], template='(%s, %s::uuid)')
    cur.execute('''
      insert into app_public.background (gene_ids, n_gene_ids)
      select jsonb_object_agg(id, null), count(*)
      from (
        select g.id from app_public.gene g where g.symbol = any(%s)
        union
        select member.gene_id::uuid from app_public.gene_set gene_set,
          jsonb_each(gene_set.gene_ids) member(gene_id, nil)
      ) genes
      returning id, n_gene_ids
    ''', (protein_coding_symbols(),))
    new_id, n_gene_ids = cur.fetchone()
  plpy.conn.commit()

  response = requests.get(f"{enrich_url}/{new_id}", timeout=120)
  response.raise_for_status()

  if current_backgrounds:
    plpy.execute(
      'delete from app_public.background where id = any(%s::uuid[])',
      [current_backgrounds],
    )
    plpy.conn.commit()
    for background_id in current_backgrounds:
      delete_response = requests.delete(f"{enrich_url}/{background_id}", timeout=30)
      if delete_response.status_code != 404:
        delete_response.raise_for_status()

  click.echo(f"Indexed background: {n_gene_ids} genes ({new_id})")
