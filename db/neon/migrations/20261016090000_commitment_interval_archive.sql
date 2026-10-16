-- Archive compatibility for recurring_commitments.interval_months.
--
-- Archive v1 remains the envelope version; schema generation moves to
-- 20261016090000. New exports carry `interval_months` on every
-- recurringCommitments row so a backup/restore round-trip preserves the
-- recorded cadence (Tết yearly, insurance yearly, per-term tuition) instead
-- of silently resetting rows to monthly. Archives from every earlier
-- generation keep their proven path and restore as monthly — the cadence
-- simply did not exist when they were produced, and defaulting to 1 invents
-- no new meaning.
--
-- The wrapper chain follows the established pattern: the legacy export,
-- validator and restore functions keep working under their *_pre_interval
-- names; new-generation archives strip `interval_months` in a validation or
-- delegation copy, reuse every proven invariant, then validate/apply only
-- the new field.

-- ---------------------------------------------------------------------------
-- Producer wrapper
-- ---------------------------------------------------------------------------

alter function public.export_user_archive()
  rename to export_user_archive_pre_interval;

create or replace function public.export_user_archive()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archive jsonb;
  v_commitments jsonb;
  v_legacy_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_archive := public.export_user_archive_pre_interval();
  v_legacy_count := jsonb_array_length(v_archive #> '{tables,recurringCommitments}');

  select coalesce(
    jsonb_agg(
      (source_row.value || jsonb_build_object('interval_months', live.interval_months))
      order by source_row.ordinality
    ),
    '[]'::jsonb
  )
  into v_commitments
  from jsonb_array_elements(v_archive #> '{tables,recurringCommitments}')
    with ordinality as source_row(value, ordinality)
  join public.recurring_commitments as live
    on live.id = (source_row.value ->> 'id')::uuid
    and live.user_id = v_user_id;

  if jsonb_array_length(v_commitments) <> v_legacy_count then
    raise exception 'archive_commitment_projection_mismatch';
  end if;

  v_archive := jsonb_set(
    v_archive,
    '{tables,recurringCommitments}',
    v_commitments,
    false
  );
  v_archive := jsonb_set(
    v_archive,
    '{schema_generation}',
    to_jsonb('20261016090000'::text),
    false
  );
  return v_archive;
end;
$$;

revoke all on function public.export_user_archive()
  from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'MoneyFlow archive v1 producer for schema generation 20261016090000; preserves commitment cadence.';

revoke all on function public.export_user_archive_pre_interval()
  from public, anon;
grant execute on function public.export_user_archive_pre_interval()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Database validator wrapper
-- ---------------------------------------------------------------------------

alter function public.validate_archive_for_restore(jsonb)
  rename to validate_archive_for_restore_pre_interval;
revoke all on function public.validate_archive_for_restore_pre_interval(jsonb)
  from public, anon, authenticated;

create or replace function public.validate_archive_for_restore(p_archive jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_generation text;
  v_legacy_archive jsonb;
  v_legacy_commitments jsonb;
begin
  v_generation := case
    when jsonb_typeof(p_archive) = 'object' then p_archive ->> 'schema_generation'
    else null
  end;

  if v_generation is distinct from '20261016090000' then
    -- Historical generations keep the proven validation path unchanged.
    perform public.validate_archive_for_restore_pre_interval(p_archive);
    return;
  end if;

  -- If the outer structure is malformed, delegate to the prior validator after
  -- only swapping generation so it preserves its established rejection.
  if jsonb_typeof(p_archive) <> 'object'
    or jsonb_typeof(p_archive -> 'tables') <> 'object'
    or jsonb_typeof(p_archive #> '{tables,recurringCommitments}') <> 'array' then
    v_legacy_archive := case
      when jsonb_typeof(p_archive) = 'object' then
        jsonb_set(
          p_archive,
          '{schema_generation}',
          to_jsonb('20260924120000'::text),
          false
        )
      else p_archive
    end;
    perform public.validate_archive_for_restore_pre_interval(v_legacy_archive);
    return;
  end if;

  -- Delegate every existing invariant on a copy without the new field, then
  -- check only the new field's shape on the original.
  select coalesce(
    jsonb_agg(
      (row_entry.value - 'interval_months') order by row_entry.ordinality
    ),
    '[]'::jsonb
  )
  into v_legacy_commitments
  from jsonb_array_elements(
    coalesce(p_archive #> '{tables,recurringCommitments}', '[]'::jsonb)
  ) with ordinality as row_entry(value, ordinality);

  v_legacy_archive := jsonb_set(
    p_archive,
    '{tables,recurringCommitments}',
    v_legacy_commitments,
    false
  );
  v_legacy_archive := jsonb_set(
    v_legacy_archive,
    '{schema_generation}',
    to_jsonb('20260924120000'::text),
    false
  );

  perform public.validate_archive_for_restore_pre_interval(v_legacy_archive);

  -- The cadence is user-authored data: present on every row, an integer, and
  -- inside the same 1..24 bound the column CHECK and the RPC enforce. A
  -- malformed value fails closed instead of restoring an invented cadence.
  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_archive #> '{tables,recurringCommitments}', '[]'::jsonb)
    ) as row_entry
    where not (row_entry.value ? 'interval_months')
       or jsonb_typeof(row_entry.value -> 'interval_months') <> 'number'
       or (row_entry.value ->> 'interval_months') ~ '[.eE]'
       or (row_entry.value ->> 'interval_months')::integer not between 1 and 24
  ) then
    raise exception 'archive_commitment_interval_invalid';
  end if;
end;
$$;

revoke all on function public.validate_archive_for_restore(jsonb)
  from public, anon, authenticated;

comment on function public.validate_archive_for_restore(jsonb) is
  'Validates archive generations 20260804160000, 20260822094500, 20260922120000, 20260924120000 and current 20261016090000 (recurring_commitments.interval_months).';

-- ---------------------------------------------------------------------------
-- Restore wrapper — legacy restore stays the authority; the cadence lands as
-- an attributed post-step exactly like the goal-linkage wrapper.
-- ---------------------------------------------------------------------------

alter function public.restore_user_archive(jsonb)
  rename to restore_user_archive_pre_interval;
revoke all on function public.restore_user_archive_pre_interval(jsonb)
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
  v_legacy_commitments jsonb;
  v_result jsonb;
  v_restore_batch_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  perform public.validate_archive_for_restore(p_archive);
  v_generation := p_archive ->> 'schema_generation';

  if v_generation is distinct from '20261016090000' then
    return public.restore_user_archive_pre_interval(p_archive);
  end if;

  select coalesce(
    jsonb_agg(
      (row_entry.value - 'interval_months') order by row_entry.ordinality
    ),
    '[]'::jsonb
  )
  into v_legacy_commitments
  from jsonb_array_elements(
    coalesce(p_archive #> '{tables,recurringCommitments}', '[]'::jsonb)
  ) with ordinality as row_entry(value, ordinality);

  v_legacy_archive := jsonb_set(
    p_archive,
    '{tables,recurringCommitments}',
    v_legacy_commitments,
    false
  );
  v_legacy_archive := jsonb_set(
    v_legacy_archive,
    '{schema_generation}',
    to_jsonb('20260924120000'::text),
    false
  );

  -- The legacy restore remains the authority for graph validation, empty-target
  -- locking, inserts, audit semantics and attribution. interval_months lands as
  -- an attributed post-step on the restored rows — the column CHECK re-guards
  -- the validator's 1..24 bound.
  v_result := public.restore_user_archive_pre_interval(v_legacy_archive);
  v_restore_batch_id := nullif(v_result ->> 'restore_batch_id', '')::uuid;

  update public.recurring_commitments target
  set interval_months = (source.interval_months)::integer
  from jsonb_to_recordset(p_archive #> '{tables,recurringCommitments}') as source(
    id uuid,
    interval_months integer
  )
  where target.id = source.id
    and target.user_id = v_user_id;

  -- Refresh the restore-row hashes for the collection this post-step touched,
  -- so later pristine-removal checks compare against the committed row.
  update public.archive_restore_rows restore_row
  set row_hash = md5(to_jsonb(commitment.*)::text)
  from public.recurring_commitments commitment
  where restore_row.batch_id = v_restore_batch_id
    and restore_row.user_id = v_user_id
    and restore_row.table_name = 'recurring_commitments'
    and commitment.user_id = v_user_id
    and commitment.id = restore_row.row_id;

  update public.archive_restore_batches
  set schema_generation = '20261016090000'
  where id = v_restore_batch_id
    and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.restore_user_archive(jsonb)
  from public, anon, authenticated;
grant execute on function public.restore_user_archive(jsonb) to authenticated;
