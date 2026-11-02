-- migrate:up

create extension if not exists "uuid-ossp";
create extension if not exists "plpython3u";
create extension if not exists "pg_trgm";

alter default privileges revoke execute on functions from public;

do $$ begin
  create role guest nologin;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

create schema app_public;
create schema app_private;
set check_function_bodies = false;

create table app_public.gene (
  id uuid primary key default public.uuid_generate_v4(),
  symbol varchar not null unique,
  synonyms jsonb not null default '{}'::jsonb,
  ncbi_gene_id integer,
  description varchar,
  summary text
);

create table app_public.gene_set (
  id uuid primary key default public.uuid_generate_v4(),
  term varchar not null unique,
  description varchar,
  hash uuid not null,
  gene_ids jsonb not null,
  n_gene_ids integer not null,
  created timestamp without time zone not null default now()
);

create table app_public.background (
  id uuid primary key default public.uuid_generate_v4(),
  gene_ids jsonb not null,
  n_gene_ids integer not null,
  created timestamp without time zone not null default now()
);

create table app_public.user_gene_set (
  id uuid primary key default public.uuid_generate_v4(),
  genes varchar[] not null,
  description varchar not null default '',
  created timestamp without time zone not null default now()
);

create type app_public.gene_mapping as (
  gene_id uuid,
  gene varchar
);

create type app_public.enrich_result as (
  gene_set_hash uuid,
  n_overlap integer,
  odds_ratio double precision,
  pvalue double precision,
  adj_pvalue double precision
);

create type app_public.paginated_enrich_result as (
  nodes app_public.enrich_result[],
  total_count integer
);

comment on type app_public.enrich_result is E'@foreign key (gene_set_hash) references app_public.gene_set (hash)';

create index gene_synonyms_idx on app_public.gene using gin (synonyms);
create index gene_set_hash_idx on app_public.gene_set (hash);
create index gene_set_gene_ids_idx on app_public.gene_set using gin (gene_ids);
create index gene_set_term_idx on app_public.gene_set using gin (term public.gin_trgm_ops);
create index background_created_idx on app_public.background (created desc);
create index background_gene_ids_idx on app_public.background using gin (gene_ids);

create function app_public.gene_map(genes varchar[])
returns setof app_public.gene_mapping
language sql stable strict parallel safe
as $$
  select g.id, ug.gene
  from unnest(gene_map.genes) ug(gene)
  inner join app_public.gene g
    on g.symbol = upper(ug.gene)
    or g.synonyms ? upper(ug.gene);
$$;

create function app_public.gene_mapping_gene_info(gene_mapping app_public.gene_mapping)
returns app_public.gene
language sql stable strict parallel safe
as $$
  select g.*
  from app_public.gene g
  where g.id = gene_mapping.gene_id;
$$;

create function app_public.gene_set_genes(gene_set app_public.gene_set)
returns setof app_public.gene
language sql stable strict parallel safe
as $$
  select g.*
  from jsonb_each(gene_set_genes.gene_set.gene_ids) member(gene_id, position)
  inner join app_public.gene g on member.gene_id = g.id::text
  order by (member.position #>> '{}')::integer;
$$;

create function app_public.gene_set_overlap(gene_set app_public.gene_set, genes varchar[])
returns setof app_public.gene
language sql stable strict parallel safe
as $$
  select distinct g.*
  from app_public.gene_map(gene_set_overlap.genes) mapped
  inner join app_public.gene g on g.id = mapped.gene_id
  where gene_set_overlap.gene_set.gene_ids ? mapped.gene_id::text
  order by g.symbol;
$$;

create function app_public.gene_set_term_search(terms varchar[])
returns setof app_public.gene_set
language sql stable strict parallel safe
as $$
  select distinct gs.*
  from app_public.gene_set gs
  inner join unnest(gene_set_term_search.terms) query(term)
    on gs.term ilike ('%' || query.term || '%')
    or coalesce(gs.description, '') ilike ('%' || query.term || '%');
$$;

create function app_public.current_background()
returns app_public.background
language sql stable security definer parallel safe
set search_path = pg_catalog, app_public
as $$
  select background.*
  from app_public.background background
  order by background.created desc
  limit 1;
$$;

create function app_private.indexed_enrich(
  background app_public.background,
  gene_ids uuid[],
  filter_term varchar default null,
  overlap_ge integer default 1,
  pvalue_le double precision default 0.05,
  adj_pvalue_le double precision default 0.05,
  "offset" integer default null,
  first integer default null
)
returns app_public.paginated_enrich_result
language plpython3u volatile
as $$
  import os
  import requests

  if not gene_ids:
    return dict(nodes=[], total_count=0)

  params = dict(
    overlap_ge=overlap_ge,
    pvalue_le=pvalue_le,
    adj_pvalue_le=adj_pvalue_le,
  )
  if filter_term:
    params['filter_term'] = filter_term
  if offset is not None:
    params['offset'] = offset
  if first is not None:
    params['limit'] = first

  response = requests.post(
    f"{os.environ.get('ENRICH_URL', 'http://enrich:8000')}/{background['id']}",
    params=params,
    json=gene_ids,
    timeout=120,
  )
  response.raise_for_status()
  return dict(
    nodes=response.json(),
    total_count=int(response.headers.get('Content-Range', '0-0/0').partition('/')[-1]),
  )
$$;

create function app_public.background_enrich(
  background app_public.background,
  genes varchar[],
  filter_term varchar default null,
  overlap_ge integer default 1,
  pvalue_le double precision default 0.05,
  adj_pvalue_le double precision default 0.05,
  "offset" integer default null,
  first integer default null
)
returns app_public.paginated_enrich_result
language sql stable security definer
set search_path = pg_catalog, app_public, app_private
as $$
  select result.*
  from app_private.indexed_enrich(
    background_enrich.background,
    (select coalesce(array_agg(mapped.gene_id), array[]::uuid[]) from app_public.gene_map(background_enrich.genes) mapped),
    background_enrich.filter_term,
    background_enrich.overlap_ge,
    background_enrich.pvalue_le,
    background_enrich.adj_pvalue_le,
    background_enrich."offset",
    background_enrich.first
  ) result;
$$;

create function app_public.enrich_result_gene_sets(enrich_result app_public.enrich_result)
returns setof app_public.gene_set
language sql stable strict parallel safe
as $$
  select gs.*
  from app_public.gene_set gs
  where gs.hash = enrich_result.gene_set_hash;
$$;

create function app_public.add_user_gene_set(genes varchar[], description varchar default '')
returns app_public.user_gene_set
language sql volatile security definer
set search_path = pg_catalog, app_public
as $$
  insert into app_public.user_gene_set (genes, description)
  select
    coalesce(array_agg(query.gene order by query.position), array[]::varchar[]),
    add_user_gene_set.description
  from (
    select min(position) as position, upper(trim(gene)) as gene
    from unnest(add_user_gene_set.genes) with ordinality submitted(gene, position)
    where trim(gene) <> ''
    group by upper(trim(gene))
  ) query
  returning *;
$$;

create function app_public.user_gene_set_count()
returns integer
language sql stable parallel safe
as $$
  select count(*)::integer
  from app_public.user_gene_set;
$$;

grant usage on schema app_public to guest, authenticated;
grant select on table app_public.gene, app_public.gene_set,
  app_public.background, app_public.user_gene_set to guest;
grant all on table app_public.gene, app_public.gene_set,
  app_public.background, app_public.user_gene_set to authenticated;

revoke all on function app_private.indexed_enrich(app_public.background, uuid[], varchar, integer, double precision, double precision, integer, integer) from public;

revoke all on function app_public.add_user_gene_set(varchar[], varchar) from public;
grant execute on function app_public.add_user_gene_set(varchar[], varchar) to guest, authenticated;

revoke all on function app_public.background_enrich(app_public.background, varchar[], varchar, integer, double precision, double precision, integer, integer) from public;
grant execute on function app_public.background_enrich(app_public.background, varchar[], varchar, integer, double precision, double precision, integer, integer) to guest, authenticated;

revoke all on function app_public.current_background() from public;
grant execute on function app_public.current_background() to guest, authenticated;

revoke all on function app_public.enrich_result_gene_sets(app_public.enrich_result) from public;
grant execute on function app_public.enrich_result_gene_sets(app_public.enrich_result) to guest, authenticated;

revoke all on function app_public.gene_map(varchar[]) from public;
grant execute on function app_public.gene_map(varchar[]) to guest, authenticated;

revoke all on function app_public.gene_mapping_gene_info(app_public.gene_mapping) from public;
grant execute on function app_public.gene_mapping_gene_info(app_public.gene_mapping) to guest, authenticated;

revoke all on function app_public.gene_set_genes(app_public.gene_set) from public;
grant execute on function app_public.gene_set_genes(app_public.gene_set) to guest, authenticated;

revoke all on function app_public.gene_set_overlap(app_public.gene_set, varchar[]) from public;
grant execute on function app_public.gene_set_overlap(app_public.gene_set, varchar[]) to guest, authenticated;

revoke all on function app_public.gene_set_term_search(varchar[]) from public;
grant execute on function app_public.gene_set_term_search(varchar[]) to guest, authenticated;

revoke all on function app_public.user_gene_set_count() from public;
grant execute on function app_public.user_gene_set_count() to guest, authenticated;

-- migrate:down

drop schema if exists app_public cascade;
drop schema if exists app_private cascade;
drop role if exists guest;
drop role if exists authenticated;
