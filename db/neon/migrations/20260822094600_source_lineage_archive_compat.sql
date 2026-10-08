-- #442 archive compatibility.
--
-- Archive v1 remains the envelope version. The schema generation distinguishes
-- the historical candidate shape from the #442 shape, while old archives remain
-- accepted. New exports preserve source lifecycle/predecessor evidence; restore
-- delegates the proven legacy graph reconstruction and then applies only those
-- two new fields in a narrow privileged phase.

-- Keep candidate updated_at faithful when the #442 restore wrapper performs its
-- metadata repair. Normal candidate updates retain the existing now() behavior.
create or replace function public.set_inbox_candidate_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting(
    'moneyflow.archive_restore_source_lineage', true
  ) = 'on' then
    return new;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_inbox_candidate_updated_at()
from public, anon, authenticated, service_role;

drop trigger if exists inbox_candidates_set_updated_at
on public.inbox_candidates;
create trigger inbox_candidates_set_updated_at
before update on public.inbox_candidates
for each row execute function public.set_inbox_candidate_updated_at();

-- ---------------------------------------------------------------------------
-- Producer wrapper
-- ---------------------------------------------------------------------------

alter function public.export_user_archive()
  rename to export_user_archive_pre_source_lineage;

create or replace function public.export_user_archive()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archive jsonb;
  v_candidates jsonb;
  v_legacy_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_archive := public.export_user_archive_pre_source_lineage();
  v_legacy_count := jsonb_array_length(v_archive #> '{tables,inboxCandidates}');

  select coalesce(
    jsonb_agg(
      source_row.value || jsonb_build_object(
        'source_lifecycle_state', candidate.source_lifecycle_state,
        'source_predecessor_external_id', candidate.source_predecessor_external_id
      )
      order by source_row.ordinality
    ),
    '[]'::jsonb
  )
  into v_candidates
  from jsonb_array_elements(v_archive #> '{tables,inboxCandidates}')
    with ordinality as source_row(value, ordinality)
  join public.inbox_candidates candidate
    on candidate.id = (source_row.value ->> 'id')::uuid
    and candidate.user_id = v_user_id;

  if jsonb_array_length(v_candidates) <> v_legacy_count then
    raise exception 'archive_candidate_projection_mismatch';
  end if;

  v_archive := jsonb_set(
    v_archive,
    '{tables,inboxCandidates}',
    v_candidates,
    false
  );
  v_archive := jsonb_set(
    v_archive,
    '{schema_generation}',
    to_jsonb('20260822094500'::text),
    false
  );

  return v_archive;
end;
$$;

revoke all on function public.export_user_archive()
from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'MoneyFlow archive v1 producer for schema generation 20260822094500; preserves source lineage/lifecycle evidence.';

-- The legacy producer is read-only and remains invoker-scoped so the current
-- wrapper can reuse its thoroughly tested nineteen-collection projection under
-- the caller's RLS. It is not used by product code directly.
revoke all on function public.export_user_archive_pre_source_lineage()
from public, anon;
grant execute on function public.export_user_archive_pre_source_lineage()
to authenticated;

-- ---------------------------------------------------------------------------
-- Database validator wrapper
-- ---------------------------------------------------------------------------

alter function public.validate_archive_for_restore(jsonb)
  rename to validate_archive_for_restore_pre_source_lineage;

create or replace function public.validate_archive_for_restore(p_archive jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_generation text;
  v_legacy_archive jsonb;
  v_legacy_candidates jsonb;
begin
  v_generation := case
    when jsonb_typeof(p_archive) = 'object' then p_archive ->> 'schema_generation'
    else null
  end;

  if v_generation = '20260804160000' then
    perform public.validate_archive_for_restore_pre_source_lineage(p_archive);
  elsif v_generation = '20260822094500' then
    -- If the outer structure is malformed, delegate to the legacy validator
    -- after only swapping generation so it preserves its established rejection.
    if jsonb_typeof(p_archive) <> 'object'
      or jsonb_typeof(p_archive -> 'tables') <> 'object'
      or jsonb_typeof(p_archive #> '{tables,inboxCandidates}') <> 'array' then
      v_legacy_archive := case
        when jsonb_typeof(p_archive) = 'object' then
          jsonb_set(
            p_archive,
            '{schema_generation}',
            to_jsonb('20260804160000'::text),
            false
          )
        else p_archive
      end;
      perform public.validate_archive_for_restore_pre_source_lineage(v_legacy_archive);
      return;
    end if;

    select coalesce(
      jsonb_agg(
        (candidate.value - 'source_lifecycle_state' - 'source_predecessor_external_id')
        order by candidate.ordinality
      ),
      '[]'::jsonb
    )
    into v_legacy_candidates
    from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}')
      with ordinality as candidate(value, ordinality);

    v_legacy_archive := jsonb_set(
      p_archive,
      '{tables,inboxCandidates}',
      v_legacy_candidates,
      false
    );
    v_legacy_archive := jsonb_set(
      v_legacy_archive,
      '{schema_generation}',
      to_jsonb('20260804160000'::text),
      false
    );

    -- Reuse every established archive invariant before validating the new shape.
    perform public.validate_archive_for_restore_pre_source_lineage(v_legacy_archive);

    if exists (
      select 1
      from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}') candidate
      where not (candidate ? 'source_lifecycle_state')
        or not (candidate ? 'source_predecessor_external_id')
    ) then
      raise exception 'row_shape_invalid';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}') candidate
      where (
          candidate -> 'source_lifecycle_state' <> 'null'::jsonb
          and (
            jsonb_typeof(candidate -> 'source_lifecycle_state') <> 'string'
            or candidate ->> 'source_lifecycle_state' not in ('pending', 'posted', 'removed')
          )
        )
        or (
          candidate -> 'source_predecessor_external_id' <> 'null'::jsonb
          and (
            jsonb_typeof(candidate -> 'source_predecessor_external_id') <> 'string'
            or char_length(candidate ->> 'source_predecessor_external_id') not between 1 and 200
          )
        )
        or (
          candidate ->> 'source' = 'manual'
          and (
            candidate -> 'source_lifecycle_state' <> 'null'::jsonb
            or candidate -> 'source_predecessor_external_id' <> 'null'::jsonb
          )
        )
        or (
          candidate -> 'source_predecessor_external_id' <> 'null'::jsonb
          and (
            candidate -> 'source_external_id' = 'null'::jsonb
            or candidate ->> 'source_external_id' is null
            or candidate ->> 'source_predecessor_external_id'
              = candidate ->> 'source_external_id'
          )
        )
    ) then
      raise exception 'source_lineage_shape_invalid';
    end if;
  else
    -- Preserve the legacy unsupported-generation rejection code.
    perform public.validate_archive_for_restore_pre_source_lineage(p_archive);
    return;
  end if;

  -- One source id may not resolve to two transactions, regardless of whether
  -- identity came from canonical provenance or reviewed candidate observations.
  if exists (
    select 1
    from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}') left_candidate
    join jsonb_array_elements(p_archive #> '{tables,inboxCandidates}') right_candidate
      on right_candidate ->> 'source' = left_candidate ->> 'source'
      and right_candidate ->> 'source_external_id'
        = left_candidate ->> 'source_external_id'
      and right_candidate ->> 'id' > left_candidate ->> 'id'
    where left_candidate ->> 'status' = 'approved'
      and right_candidate ->> 'status' = 'approved'
      and left_candidate ->> 'source_external_id' is not null
      and left_candidate ->> 'approved_transaction_id' is not null
      and right_candidate ->> 'approved_transaction_id' is not null
      and left_candidate ->> 'approved_transaction_id'
        <> right_candidate ->> 'approved_transaction_id'
  ) or exists (
    select 1
    from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}') candidate
    join jsonb_array_elements(p_archive #> '{tables,transactionImportProvenance}') provenance
      on provenance ->> 'source' = candidate ->> 'source'
      and provenance ->> 'source_external_id' = candidate ->> 'source_external_id'
    where candidate ->> 'status' = 'approved'
      and candidate ->> 'source_external_id' is not null
      and candidate ->> 'approved_transaction_id' is not null
      and candidate ->> 'approved_transaction_id' <> provenance ->> 'transaction_id'
  ) then
    raise exception 'source_identity_conflict';
  end if;
end;
$$;

revoke all on function public.validate_archive_for_restore(jsonb)
from public, anon, authenticated;
revoke all on function public.validate_archive_for_restore_pre_source_lineage(jsonb)
from public, anon, authenticated;

comment on function public.validate_archive_for_restore(jsonb) is
  'Validates both historical MoneyFlow archive v1 generation 20260804160000 and current source-lineage generation 20260822094500.';

-- ---------------------------------------------------------------------------
-- Restore wrapper
-- ---------------------------------------------------------------------------

alter function public.restore_user_archive(jsonb)
  rename to restore_user_archive_pre_source_lineage;
revoke all on function public.restore_user_archive_pre_source_lineage(jsonb)
from public, anon, authenticated;

create or replace function public.restore_user_archive(p_archive jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_generation text;
  v_legacy_archive jsonb;
  v_legacy_candidates jsonb;
  v_result jsonb;
  v_restore_batch_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  perform public.validate_archive_for_restore(p_archive);
  v_generation := p_archive ->> 'schema_generation';

  if v_generation = '20260804160000' then
    return public.restore_user_archive_pre_source_lineage(p_archive);
  end if;

  select coalesce(
    jsonb_agg(
      (candidate.value - 'source_lifecycle_state' - 'source_predecessor_external_id')
      order by candidate.ordinality
    ),
    '[]'::jsonb
  )
  into v_legacy_candidates
  from jsonb_array_elements(p_archive #> '{tables,inboxCandidates}')
    with ordinality as candidate(value, ordinality);

  v_legacy_archive := jsonb_set(
    p_archive,
    '{tables,inboxCandidates}',
    v_legacy_candidates,
    false
  );
  v_legacy_archive := jsonb_set(
    v_legacy_archive,
    '{schema_generation}',
    to_jsonb('20260804160000'::text),
    false
  );

  -- The legacy restore remains the authority for graph validation, empty-target
  -- locking, inserts, audit semantics and attribution. A failure in the metadata
  -- phase below aborts this same outer transaction, so no partial restore commits.
  v_result := public.restore_user_archive_pre_source_lineage(v_legacy_archive);
  v_restore_batch_id := nullif(v_result ->> 'restore_batch_id', '')::uuid;

  perform pg_catalog.set_config(
    'moneyflow.archive_restore_source_lineage',
    'on',
    true
  );

  update public.inbox_candidates target
  set source_lifecycle_state = source.source_lifecycle_state,
      source_predecessor_external_id = source.source_predecessor_external_id,
      updated_at = source.updated_at
  from jsonb_to_recordset(p_archive #> '{tables,inboxCandidates}') as source(
    id uuid,
    source_lifecycle_state text,
    source_predecessor_external_id text,
    updated_at timestamptz
  )
  where target.id = source.id
    and target.user_id = v_user_id;

  perform pg_catalog.set_config(
    'moneyflow.archive_restore_source_lineage',
    'off',
    true
  );

  -- The legacy restore recorded candidate row hashes before #442 metadata was
  -- applied. Refresh only this attributed collection so later pristine-removal
  -- checks compare against the actual committed restored row.
  update public.archive_restore_rows restore_row
  set row_hash = md5(to_jsonb(candidate.*)::text)
  from public.inbox_candidates candidate
  where restore_row.batch_id = v_restore_batch_id
    and restore_row.user_id = v_user_id
    and restore_row.table_name = 'inbox_candidates'
    and candidate.user_id = v_user_id
    and candidate.id = restore_row.row_id;

  update public.archive_restore_batches
  set schema_generation = '20260822094500'
  where id = v_restore_batch_id
    and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.restore_user_archive(jsonb)
from public, anon, authenticated;
grant execute on function public.restore_user_archive(jsonb) to authenticated;

comment on function public.restore_user_archive(jsonb) is
  'Restores historical or current MoneyFlow archive v1; current generation preserves source lineage/lifecycle candidate evidence atomically.';
