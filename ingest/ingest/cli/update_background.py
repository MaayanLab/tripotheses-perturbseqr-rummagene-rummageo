import click

from ingest.cli import cli


@cli.command()
@click.option('--enrich-url', envvar='ENRICH_URL', default='http://127.0.0.1:8000')
def update_background(enrich_url):
  """"""
  import requests
  from ingest.plpy import plpy

  current_backgrounds = [
    row['id']
    for row in plpy.cursor('select id from app_public.background')
  ]
  new_background, = plpy.cursor('''
    insert into app_public.background (gene_ids, n_gene_ids)
    select
      jsonb_object_agg(distinct member.gene_id, null),
      count(distinct member.gene_id)
    from app_public.gene_set gene_set,
         jsonb_each(gene_set.gene_ids) member(gene_id, nil)
    having count(distinct member.gene_id) > 0
    returning id, n_gene_ids
  ''')
  plpy.conn.commit()

  response = requests.get(f"{enrich_url}/{new_background['id']}", timeout=120)
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

  click.echo(
    f"Indexed corpus: {new_background['n_gene_ids']} genes "
    f"({new_background['id']})"
  )
