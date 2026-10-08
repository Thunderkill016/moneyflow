-- #442 preflight: fail before schema/function changes if historical approved
-- observations already disagree about which transaction owns one source id.
-- This runs immediately before 20260822094500_source_lineage_lifecycle.sql.

do $$
begin
  if exists (
    select 1
    from public.inbox_candidates left_candidate
    join public.inbox_candidates right_candidate
      on right_candidate.user_id = left_candidate.user_id
      and right_candidate.source = left_candidate.source
      and right_candidate.source_external_id = left_candidate.source_external_id
      and right_candidate.id > left_candidate.id
    where left_candidate.status = 'approved'
      and right_candidate.status = 'approved'
      and left_candidate.source_external_id is not null
      and left_candidate.approved_transaction_id is not null
      and right_candidate.approved_transaction_id is not null
      and left_candidate.approved_transaction_id <> right_candidate.approved_transaction_id
  ) or exists (
    select 1
    from public.inbox_candidates candidate
    join public.transaction_import_provenance provenance
      on provenance.user_id = candidate.user_id
      and provenance.source = candidate.source
      and provenance.source_external_id = candidate.source_external_id
    where candidate.status = 'approved'
      and candidate.source_external_id is not null
      and candidate.approved_transaction_id is not null
      and candidate.approved_transaction_id <> provenance.transaction_id
  ) then
    raise exception 'source_identity_conflict_existing';
  end if;
end;
$$;
