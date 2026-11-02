-- migrate:up

-- Keep stable IDs in gene_set.term, and expose a readable display title to
-- PostGraphile. Legacy titles sometimes contain only the library crossing.
create function app_public.gene_set_title(gene_set app_public.gene_set)
returns text
language sql stable strict parallel safe as $$
  select coalesce(
    (select coalesce(
      nullif(nullif(trim(tm.human_readable_title), trim(tm.source_crossing)), ''),
      nullif(concat_ws(' × ', nullif(trim(tm.genomics_term), ''),
        nullif(trim(tm.epigenomics_term), ''), nullif(trim(tm.transcriptomics_term), '')), '')
    ) from app_public.tripothesis_metadata tm where tm.gene_set_id = gene_set.id),
    gene_set.term
  );
$$;

grant execute on function app_public.gene_set_title(app_public.gene_set) to guest, authenticated;

-- migrate:down

drop function app_public.gene_set_title(app_public.gene_set);
