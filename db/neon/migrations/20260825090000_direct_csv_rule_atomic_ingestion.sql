-- #463: prepare one Direct CSV source batch with optional deterministic rule
-- normalization before the existing batch-atomic ledger approval. This creates
-- only pending source evidence; approval remains the sole ledger mutation path.

create or replace function public.prepare_direct_csv_candidates_with_rules(
  p_batch jsonb,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch_id uuid;
  v_candidate jsonb;
  v_candidate_id uuid;
  v_candidate_ids uuid[] := array[]::uuid[];
  v_candidate_count integer;
  v_kind public.transaction_kind;
  v_confidence public.inbox_candidate_confidence;
  v_amount_minor bigint;
  v_occurred_on date;
  v_category_id uuid;
  v_account_id uuid;
  v_category_name text;
  v_account_name text;
  v_rule_id uuid;
  v_rule_version integer;
  v_rule_id_text text;
  v_rule_version_text text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if jsonb_typeof(p_batch) <> 'object'
    or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'invalid_direct_csv_payload';
  end if;

  v_candidate_count := jsonb_array_length(p_candidates);
  if v_candidate_count < 1 or v_candidate_count > 5000 then
    raise exception 'invalid_direct_csv_candidate_count';
  end if;

  begin
    v_batch_id := nullif(p_batch ->> 'id', '')::uuid;
  exception when others then
    raise exception 'invalid_direct_csv_batch';
  end;

  if v_batch_id is null
    or char_length(coalesce(p_batch ->> 'file_name', '')) not between 1 and 260
    or coalesce((p_batch ->> 'warning_count')::integer, -1) < 0
    or coalesce((p_batch ->> 'skipped_rows')::integer, -1) < 0
    or coalesce((p_batch ->> 'map_confidence')::double precision, -1) < 0
    or coalesce((p_batch ->> 'map_confidence')::double precision, 2) > 1
    or jsonb_typeof(coalesce(p_batch -> 'headers', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_batch -> 'column_map', '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_direct_csv_batch';
  end if;

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
    p_batch ->> 'file_name',
    'csv'::public.import_batch_source,
    'parsed'::public.import_batch_status,
    v_candidate_count,
    (p_batch ->> 'warning_count')::integer,
    (p_batch ->> 'skipped_rows')::integer,
    (p_batch ->> 'map_confidence')::double precision,
    coalesce(p_batch -> 'headers', '[]'::jsonb),
    coalesce(p_batch -> 'column_map', '{}'::jsonb),
    'csv_import@1.0',
    1,
    null,
    null
  );

  for v_candidate in
    select value from jsonb_array_elements(p_candidates)
  loop
    begin
      v_candidate_id := nullif(v_candidate ->> 'id', '')::uuid;
      v_kind := (v_candidate ->> 'kind')::public.transaction_kind;
      v_confidence := (v_candidate ->> 'confidence')::public.inbox_candidate_confidence;
      v_amount_minor := (v_candidate ->> 'amount_minor')::bigint;
      v_occurred_on := (v_candidate ->> 'occurred_on')::date;
      v_category_id := nullif(v_candidate ->> 'category_id', '')::uuid;
      v_account_id := nullif(v_candidate ->> 'account_id', '')::uuid;
    exception when others then
      raise exception 'invalid_direct_csv_candidate';
    end;

    if v_candidate_id is null
      or v_candidate_id = any(v_candidate_ids)
      or v_kind not in ('income'::public.transaction_kind, 'expense'::public.transaction_kind)
      or v_amount_minor < 1
      or v_amount_minor > 9007199254740991
      or v_occurred_on is null
      or v_category_id is null
      or v_account_id is null
      or char_length(coalesce(v_candidate ->> 'merchant', '')) not between 1 and 200
      or char_length(coalesce(v_candidate ->> 'note', '')) > 500
      or char_length(coalesce(v_candidate ->> 'raw_snippet', '')) > 2000
      or coalesce((v_candidate ->> 'row_index')::integer, -1) < 0
      or v_candidate ? 'source_external_id' then
      raise exception 'invalid_direct_csv_candidate';
    end if;

    select name into v_account_name
    from public.accounts
    where id = v_account_id
      and user_id = v_user_id
      and not is_archived;
    if v_account_name is null then
      raise exception 'account_not_found';
    end if;

    select name into v_category_name
    from public.categories
    where id = v_category_id
      and user_id = v_user_id
      and not is_archived
      and kind::text = v_kind::text;
    if v_category_name is null then
      raise exception 'category_kind_mismatch';
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
      v_amount_minor,
      v_candidate ->> 'merchant',
      coalesce(v_candidate ->> 'note', ''),
      v_occurred_on,
      'csv'::public.inbox_candidate_source,
      v_confidence,
      'pending'::public.inbox_candidate_status,
      false,
      v_category_id,
      v_category_name,
      v_account_id,
      v_account_name,
      nullif(v_candidate ->> 'raw_snippet', ''),
      v_batch_id,
      null,
      (v_candidate ->> 'row_index')::integer,
      null,
      'csv_import@1.0',
      1
    );
  end loop;

  for v_candidate in
    select value from jsonb_array_elements(p_candidates)
  loop
    v_rule_id_text := nullif(v_candidate ->> 'applied_rule_id', '');
    v_rule_version_text := nullif(v_candidate ->> 'applied_rule_version', '');

    if v_rule_id_text is null and v_rule_version_text is null then
      continue;
    end if;
    if v_rule_id_text is null or v_rule_version_text is null then
      raise exception 'invalid_direct_csv_rule_evidence';
    end if;

    begin
      v_candidate_id := nullif(v_candidate ->> 'id', '')::uuid;
      v_rule_id := v_rule_id_text::uuid;
      v_rule_version := v_rule_version_text::integer;
    exception when others then
      raise exception 'invalid_direct_csv_rule_evidence';
    end;

    if v_rule_version < 1 then
      raise exception 'invalid_direct_csv_rule_evidence';
    end if;

    -- This existing function is the authority for rule ownership, current
    -- version, candidate-kind, category and source-field matching. A failure
    -- rolls back this entire source-preparation transaction.
    perform public.apply_inbox_rule_to_candidate(
      v_candidate_id,
      v_rule_id,
      v_rule_version
    );
  end loop;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'candidate_ids', to_jsonb(v_candidate_ids),
    'candidate_count', v_candidate_count
  );
end;
$$;

revoke all on function public.prepare_direct_csv_candidates_with_rules(jsonb, jsonb)
  from public, anon;
grant execute on function public.prepare_direct_csv_candidates_with_rules(jsonb, jsonb)
  to authenticated;
