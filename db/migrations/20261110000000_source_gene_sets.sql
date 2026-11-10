-- migrate:up

-- Gene sets from the source libraries (RummaGene, RummaGEO, Perturb-Seqr) that the
-- active release's Tripotheses were crossed from. Only referenced sets are stored.
create table app_public.source_gene_set (
  source text not null,
  term text not null,
  genes text[] not null,
  n_genes integer not null,
  primary key (source, term)
);

comment on table app_public.source_gene_set is
  'Source-library gene sets referenced by tripothesis_metadata.source_record (sourceN, termN).';

-- The three source gene sets of a Tripothesis, in source order (source1, source2, source3).
create function app_public.gene_set_source_gene_sets(gene_set app_public.gene_set)
returns setof app_public.source_gene_set
language sql stable strict parallel safe as $$
  select sgs.*
  from app_public.tripothesis_metadata tm
  cross join lateral (values
    (1, tm.source_record->>'source1', tm.source_record->>'term1'),
    (2, tm.source_record->>'source2', tm.source_record->>'term2'),
    (3, tm.source_record->>'source3', tm.source_record->>'term3')
  ) v(position, source, term)
  join app_public.source_gene_set sgs on sgs.source = v.source and sgs.term = v.term
  where tm.gene_set_id = gene_set.id
  order by v.position;
$$;

grant select on app_public.source_gene_set to guest;
grant all on app_public.source_gene_set to authenticated;
grant execute on function app_public.gene_set_source_gene_sets(app_public.gene_set) to guest, authenticated;

-- migrate:down

drop function app_public.gene_set_source_gene_sets(app_public.gene_set);
drop table app_public.source_gene_set;
