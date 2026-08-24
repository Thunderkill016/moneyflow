-- #450: persist one authenticated PWA Share Target action atomically.
-- This function creates only import batches + pending Inbox candidates.
-- It does not approve candidates or mutate financial ledger/reconciliation state.

create or replace function public.ingest_share_target_capture(
  p_batches jsonb,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch jsonb;
  v_candidate jsonb;
  v_batch_ids uuid[] := array[]::uuid[];
  v_candidate_ids uuid[] := array[]::uuid[];
  v_batch_id uuid;
  v_candidate_id uuid;
  v_import_batch_id uuid;
  v_batch_source public.import_batch_source;
  v_candidate_source public.inbox_candidate_source;
  v_kind public.transaction_kind;
  v_confidence public.inbox_candidate_confidence;
  v_batch_count integer;
  v_candidate_count integer;
  v_expected_rows integer;
  v_actual_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if jsonb_typeof(p_batches) <> 'array'
    or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'invalid_share_payload';
  end if;

  v_batch_count := jsonb_array_length(p_batches);
  v_candidate_count := jsonb_array_length(p_candidates);

  if v_batch_count < 1 or v_batch_count > 6 then
    raise exception 'invalid_share_batch_count';
  end if;
  if v_candidate_count < 1 or v_candidate_count > 2500 then
    raise exception 'invalid_share_candidate_count';
  end if;

  -- Validate every batch and insert it for the authenticated tenant. The whole
  -- PL/pgSQL call is one database transaction, so any later exception rolls back
  -- these rows together with all candidates.
  for v_batch in
    select value from jsonb_array_elements(p_batches)
  loop
    begin
      v_batch_id := nullif(v_batch ->> 'id', '')::uuid;
      v_batch_source := (v_batch ->> 'source')::public.import_batch_source;
      v_expected_rows := (v_batch ->> 'row_count')::integer;
    exception when others then
      raise exception 'invalid_share_batch';
    end;

    if v_batch_id is null
      or v_batch_source not in ('paste'::public.import_batch_source, 'csv'::public.import_batch_source)
      or v_expected_rows < 1
      or v_expected_rows > 2500
      or v_batch_id = any(v_batch_ids) then
      raise exception 'invalid_share_batch';
    end if;

    if char_length(coalesce(v_batch ->> 'file_name', '')) not between 1 and 260
      or coalesce((v_batch ->> 'warning_count')::integer, -1) < 0
      or coalesce((v_batch ->> 'skipped_rows')::integer, -1) < 0
      or coalesce((v_batch ->> 'map_confidence')::double precision, -1) < 0
      or coalesce((v_batch ->> 'map_confidence')::double precision, 2) > 1
      or char_length(coalesce(v_batch ->> 'parser_version', '')) not between 1 and 80
      or coalesce((v_batch ->> 'mapping_version')::integer, 0) < 1 then
      raise exception 'invalid_share_batch';
    end if;

    if jsonb_typeof(coalesce(v_batch -> 'headers', '[]'::jsonb)) <> 'array'
      or jsonb_typeof(coalesce(v_batch -> 'column_map', '{}'::jsonb)) <> 'object' then
      raise exception 'invalid_share_batch';
    end if;

    v_batch_ids := array_append(v_batch_ids, v_batch_id);

    insert into public.import_batches (
      id,
      user_id,
      file_name,
      source,
      status,
      row_count,
      warning_count,
      skipped_rows,
      map_confidence,
      headers,
      column_map,
      parser_version,
      mapping_version,
      local_id,
      committed_at
    ) values (
      v_batch_id,
      v_user_id,
      v_batch ->> 'file_name',
      v_batch_source,
      'committed'::public.import_batch_status,
      v_expected_rows,
      (v_batch ->> 'warning_count')::integer,
      (v_batch ->> 'skipped_rows')::integer,
      (v_batch ->> 'map_confidence')::double precision,
      coalesce(v_batch -> 'headers', '[]'::jsonb),
      coalesce(v_batch -> 'column_map', '{}'::jsonb),
      v_batch ->> 'parser_version',
      (v_batch ->> 'mapping_version')::integer,
      null,
      now()
    );
  end loop;

  for v_candidate in
    select value from jsonb_array_elements(p_candidates)
  loop
    begin
      v_candidate_id := nullif(v_candidate ->> 'id', '')::uuid;
      v_import_batch_id := nullif(v_candidate ->> 'import_batch_id', '')::uuid;
      v_candidate_source := (v_candidate ->> 'source')::public.inbox_candidate_source;
      v_kind := (v_candidate ->> 'kind')::public.transaction_kind;
      v_confidence := (v_candidate ->> 'confidence')::public.inbox_candidate_confidence;
    exception when others then
      raise exception 'invalid_share_candidate';
    end;

    if v_candidate_id is null
      or v_import_batch_id is null
      or not (v_import_batch_id = any(v_batch_ids))
      or v_candidate_id = any(v_candidate_ids)
      or v_candidate_source not in ('paste'::public.inbox_candidate_source, 'csv'::public.inbox_candidate_source) then
      raise exception 'invalid_share_candidate';
    end if;

    select source into v_batch_source
    from public.import_batches
    where id = v_import_batch_id
      and user_id = v_user_id;

    if not found or v_batch_source::text <> v_candidate_source::text then
      raise exception 'share_candidate_batch_mismatch';
    end if;

    if coalesce((v_candidate ->> 'amount_minor')::bigint, 0) <= 0
      or coalesce((v_candidate ->> 'amount_minor')::bigint, 0) > 9007199254740991
      or char_length(coalesce(v_candidate ->> 'merchant', '')) not between 1 and 200
      or char_length(coalesce(v_candidate ->> 'note', '')) > 500
      or char_length(coalesce(v_candidate ->> 'raw_snippet', '')) > 2000
      or char_length(coalesce(v_candidate ->> 'parser_version', '')) not between 1 and 80
      or coalesce((v_candidate ->> 'mapping_version')::integer, 0) < 1
      or (v_candidate ? 'source_external_id') then
      raise exception 'invalid_share_candidate';
    end if;

    v_candidate_ids := array_append(v_candidate_ids, v_candidate_id);

    insert into public.inbox_candidates (
      id,
      user_id,
      kind,
      amount_minor,
      merchant,
      note,
      occurred_on,
      source,
      confidence,
      status,
      possible_duplicate,
      category_id,
      category_name,
      account_id,
      account_name,
      raw_snippet,
      import_batch_id,
      local_id,
      source_row_index,
      source_external_id,
      parser_version,
      mapping_version
    ) values (
      v_candidate_id,
      v_user_id,
      v_kind,
      (v_candidate ->> 'amount_minor')::bigint,
      v_candidate ->> 'merchant',
      coalesce(v_candidate ->> 'note', ''),
      (v_candidate ->> 'occurred_on')::date,
      v_candidate_source,
      v_confidence,
      'pending'::public.inbox_candidate_status,
      false,
      nullif(v_candidate ->> 'category_id', '')::uuid,
      nullif(v_candidate ->> 'category_name', ''),
      nullif(v_candidate ->> 'account_id', '')::uuid,
      nullif(v_candidate ->> 'account_name', ''),
      nullif(v_candidate ->> 'raw_snippet', ''),
      v_import_batch_id,
      null,
      nullif(v_candidate ->> 'source_row_index', '')::integer,
      null,
      v_candidate ->> 'parser_version',
      (v_candidate ->> 'mapping_version')::integer
    );
  end loop;

  -- The declared batch row count must exactly match the candidate rows persisted
  -- for that batch. This catches missing/prefix client payloads before commit.
  foreach v_batch_id in array v_batch_ids
  loop
    select row_count into v_expected_rows
    from public.import_batches
    where id = v_batch_id and user_id = v_user_id;

    select count(*)::integer into v_actual_rows
    from public.inbox_candidates
    where import_batch_id = v_batch_id and user_id = v_user_id;

    if v_expected_rows <> v_actual_rows then
      raise exception 'share_batch_row_count_mismatch';
    end if;
  end loop;

  return jsonb_build_object(
    'batch_ids', to_jsonb(v_batch_ids),
    'candidate_ids', to_jsonb(v_candidate_ids),
    'batch_count', array_length(v_batch_ids, 1),
    'candidate_count', array_length(v_candidate_ids, 1)
  );
end;
$$;

revoke all on function public.ingest_share_target_capture(jsonb, jsonb)
  from public, anon;
grant execute on function public.ingest_share_target_capture(jsonb, jsonb)
  to authenticated;
