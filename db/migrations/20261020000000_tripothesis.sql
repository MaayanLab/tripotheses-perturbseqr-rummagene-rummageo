-- migrate:up

create table app_public.tripothesis_metadata (
  gene_set_id uuid primary key references app_public.gene_set(id) on delete cascade,
  tripothesis_id text not null unique,
  release_id text not null,
  rank integer,
  final_rank integer,
  human_readable_title text,
  genomics_term text,
  genomics_library text,
  transcriptomics_term text,
  transcriptomics_library text,
  epigenomics_term text,
  epigenomics_library text,
  genomics_set_size integer,
  transcriptomics_set_size integer,
  epigenomics_set_size integer,
  three_way_overlap_count integer,
  three_way_overlap_genes text,
  ranking_score double precision,
  pubmed_novelty_score double precision,
  pubmed_triple_count integer,
  source_crossing text,
  modality_crossing text,
  p_value_conservative double precision,
  neg_log10_p_value double precision,
  three_way_jaccard_similarity double precision,
  novelty_adjusted_priority_score double precision,
  composition_adjusted_priority_score double precision,
  report_path text,
  report_url text,
  source_record jsonb not null default '{}'::jsonb
);

comment on table app_public.tripothesis_metadata is
  'Preserved precomputed Tripothesis metadata. One active release per application database.';

create index tripothesis_rank_idx on app_public.tripothesis_metadata (final_rank, rank);
create index tripothesis_title_idx on app_public.tripothesis_metadata
  using gin (human_readable_title public.gin_trgm_ops);

create function app_public.gene_set_tripothesis(gene_set app_public.gene_set)
returns app_public.tripothesis_metadata
language sql stable strict parallel safe as $$
  select tm.* from app_public.tripothesis_metadata tm where tm.gene_set_id = gene_set.id;
$$;

create or replace function app_public.gene_set_term_search(terms varchar[])
returns setof app_public.gene_set
language plpgsql stable strict parallel safe as $$
begin
  if '' = any(terms) then
    return query
      select gs.* from app_public.gene_set gs
      left join app_public.tripothesis_metadata tm on tm.gene_set_id = gs.id
      order by coalesce(tm.final_rank, tm.rank, 2147483647), gs.term;
  else
    -- Find matching genes once, then use the membership GIN index rather than
    -- running a correlated gene-table scan for every Tripothesis.
    return query
      with matched_genes as materialized (
        select g.id from app_public.gene g
        where exists (select 1 from unnest(terms) q(term)
          where g.symbol ilike '%' || q.term || '%')
      ), matched_sets as (
        select gs.id from app_public.gene_set gs
        left join app_public.tripothesis_metadata tm on tm.gene_set_id = gs.id
        where exists (select 1 from unnest(terms) q(term)
          where concat_ws(' ', gs.term, gs.description, tm.human_readable_title,
            tm.genomics_term, tm.genomics_library, tm.transcriptomics_term,
            tm.transcriptomics_library, tm.epigenomics_term, tm.epigenomics_library,
            tm.source_crossing, tm.modality_crossing,
            concat_ws(' × ', tm.genomics_term, tm.epigenomics_term, tm.transcriptomics_term)) ilike '%' || q.term || '%')
        union
        select gs.id from matched_genes g
        join app_public.gene_set gs on gs.gene_ids ? g.id::text
      )
      select gs.* from matched_sets matched
      join app_public.gene_set gs on gs.id = matched.id
      left join app_public.tripothesis_metadata tm on tm.gene_set_id = gs.id
      order by coalesce(tm.final_rank, tm.rank, 2147483647), gs.term;
  end if;
end;
$$;

grant select on app_public.tripothesis_metadata to guest;
grant all on app_public.tripothesis_metadata to authenticated;
grant execute on function app_public.gene_set_tripothesis(app_public.gene_set) to guest, authenticated;

-- migrate:down

drop function app_public.gene_set_tripothesis(app_public.gene_set);
create or replace function app_public.gene_set_term_search(terms varchar[])
returns setof app_public.gene_set
language sql stable strict parallel safe as $$
  select gs.* from app_public.gene_set gs
  where exists (select 1 from unnest(terms) query(term)
    where gs.term ilike '%' || query.term || '%'
      or coalesce(gs.description, '') ilike '%' || query.term || '%');
$$;
drop table app_public.tripothesis_metadata;
