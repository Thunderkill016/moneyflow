-- MON-63: make generic preview -> Inbox commit one replay-safe database operation.
-- Batch UUID is the idempotency identity. The intent hash guards against reusing
-- the same batch identity for a different validated payload. Candidates remain
-- pending Inbox evidence; this function never mutates the financial ledger.

alter table public.import_batches
  add column commit_intent_hash text
    check (
      commit_intent_hash is null
      or commit_intent_hash ~ '^[0-9a-f]{64}$'
    ),
  add column commit_candidate_count integer
    check (
      commit_candidate_count is null
      or (commit_candidate_count >= 0 and commit_candidate_count <= 500)
    );

create or replace function public.commit_import_batch_candidates(
  p_batch_id uuid,
  p_intent_hash text,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.import_batches%rowtype;
  v_candidate jsonb;
  v_candidate_id uuid;
  v_candidate_ids uuid[] := array[]::uuid[];
  v_candidate_count integer;
  v_candidate_source public.inbox_candidate_source;
  v_kind public.transaction_kind;
  v_confidence public.inbox_candidate_confidence;
  v_status public.inbox_candidate_status;
  v_amount_minor bigint;
  v_occurred_on date;
  v_category_id uuid;
  v_account_id uuid;
  v_source_row_index integer;
  v_mapping_version integer;
  v_applied_rule_id uuid;
  v_applied_rule_version integer;
  v_claimed_batch_id uuid;
  v_claimed_user_id uuid;
  v_possible_duplicate boolean;
  v_source_external_id text;
  v_source_lifecycle_state text;
  v_source_predecessor_external_id text;
  v_parser_version text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_batch_id is null
    or p_intent_hash is null
    or p_intent_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'invalid_import_commit_payload';
  end if;

  v_candidate_count := jsonb_array_length(p_candidates);
  if v_candidate_count < 1 or v_candidate_count > 500 then
    raise exception 'invalid_import_candidate_count';
  end if;

  -- Serialize concurrent submissions for one batch. Under SECURITY INVOKER the
  -- existing own-row RLS policies also make cross-tenant batch ids invisible.
  select *
  into v_batch
  from public.import_batches batch_record
  where batch_record.id = p_batch_id
    and batch_record.user_id = v_user_id
  for update;

  if not found then
    raise exception 'import_batch_not_found';
  end if;

  if v_batch.status = 'cancelled'::public.import_batch_status then
    raise exception 'import_batch_cancelled';
  end if;

  if v_batch.status = 'committed'::public.import_batch_status then
    if v_batch.commit_intent_hash is null then
      raise exception 'import_batch_commit_identity_unavailable';
    end if;
    if v_batch.commit_intent_hash <> p_intent_hash then
      raise exception 'import_batch_replay_mismatch';
    end if;

    return jsonb_build_object(
      'batch_id', p_batch_id,
      'status', 'committed',
      'candidate_count', coalesce(
        v_batch.commit_candidate_count,
        (
          select count(*)::integer
          from public.inbox_candidates candidate_record
          where candidate_record.user_id = v_user_id
            and candidate_record.import_batch_id = p_batch_id
        )
      ),
      'replayed', true
    );
  end if;

  if v_batch.status <> 'parsed'::public.import_batch_status then
    raise exception 'import_batch_not_committable';
  end if;

  if v_batch.row_count <> v_candidate_count then
    raise exception 'import_batch_row_count_mismatch';
  end if;

  if v_batch.commit_intent_hash is not null
    and v_batch.commit_intent_hash <> p_intent_hash then
    raise exception 'import_batch_replay_mismatch';
  end if;

  for v_candidate in
    select value from jsonb_array_elements(p_candidates)
  loop
    begin
      v_candidate_id := nullif(v_candidate ->> 'id', '')::uuid;
      v_candidate_source := (v_candidate ->> 'source')::public.inbox_candidate_source;
      v_kind := (v_candidate ->> 'kind')::public.transaction_kind;
      v_confidence := (v_candidate ->> 'confidence')::public.inbox_candidate_confidence;
      v_status := coalesce(
        nullif(v_candidate ->> 'status', '')::public.inbox_candidate_status,
        'pending'::public.inbox_candidate_status
      );
      v_amount_minor := (v_candidate ->> 'amount_minor')::bigint;
      v_occurred_on := (v_candidate ->> 'occurred_on')::date;
      v_category_id := nullif(v_candidate ->> 'category_id', '')::uuid;
      v_account_id := nullif(v_candidate ->> 'account_id', '')::uuid;
      v_source_row_index := nullif(v_candidate ->> 'source_row_index', '')::integer;
      v_mapping_version := nullif(v_candidate ->> 'mapping_version', '')::integer;
      v_applied_rule_id := nullif(v_candidate ->> 'applied_rule_id', '')::uuid;
      v_applied_rule_version := nullif(v_candidate ->> 'applied_rule_version', '')::integer;
      v_claimed_batch_id := nullif(v_candidate ->> 'import_batch_id', '')::uuid;
      v_claimed_user_id := nullif(v_candidate ->> 'user_id', '')::uuid;
      v_possible_duplicate := coalesce(
        nullif(v_candidate ->> 'possible_duplicate', '')::boolean,
        false
      );
      v_source_external_id := nullif(v_candidate ->> 'source_external_id', '');
      v_source_lifecycle_state := nullif(v_candidate ->> 'source_lifecycle_state', '');
      v_source_predecessor_external_id := nullif(
        v_candidate ->> 'source_predecessor_external_id',
        ''
      );
      v_parser_version := nullif(v_candidate ->> 'parser_version', '');
    exception when others then
      raise exception 'invalid_import_candidate';
    end;

    if v_candidate_id is null
      or v_candidate_id = any(v_candidate_ids)
      or v_candidate_source::text <> v_batch.source::text
      or v_kind not in (
        'income'::public.transaction_kind,
        'expense'::public.transaction_kind,
        'transfer'::public.transaction_kind
      )
      or v_status <> 'pending'::public.inbox_candidate_status
      or v_amount_minor is null
      or v_amount_minor < 1
      or v_amount_minor > 9007199254740991
      or v_occurred_on is null
      or char_length(coalesce(v_candidate ->> 'merchant', '')) not between 1 and 200
      or char_length(coalesce(v_candidate ->> 'note', '')) > 500
      or char_length(coalesce(v_candidate ->> 'category_name', '')) > 60
      or char_length(coalesce(v_candidate ->> 'account_name', '')) > 80
      or char_length(coalesce(v_candidate ->> 'raw_snippet', '')) > 2000
      or char_length(coalesce(v_source_external_id, '')) > 200
      or char_length(coalesce(v_source_predecessor_external_id, '')) > 200
      or char_length(coalesce(v_parser_version, '')) > 80
      or (v_source_row_index is not null and v_source_row_index < 0)
      or (v_mapping_version is not null and v_mapping_version < 1)
      or ((v_applied_rule_id is null) <> (v_applied_rule_version is null))
      or (v_applied_rule_version is not null and v_applied_rule_version < 1)
      or (v_claimed_batch_id is not null and v_claimed_batch_id <> p_batch_id)
      or (v_claimed_user_id is not null and v_claimed_user_id <> v_user_id)
      or (
        v_source_lifecycle_state is not null
        and v_source_lifecycle_state not in ('pending', 'posted', 'removed')
      )
      or (
        v_source_external_id is null
        and (
          v_source_lifecycle_state is not null
          or v_source_predecessor_external_id is not null
        )
      )
      or (
        v_source_predecessor_external_id is not null
        and v_source_predecessor_external_id = v_source_external_id
      ) then
      raise exception 'invalid_import_candidate';
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
      source_lifecycle_state,
      source_predecessor_external_id,
      parser_version,
      mapping_version,
      applied_rule_id,
      applied_rule_version
    ) values (
      v_candidate_id,
      v_user_id,
      v_kind,
      v_amount_minor,
      v_candidate ->> 'merchant',
      coalesce(v_candidate ->> 'note', ''),
      v_occurred_on,
      v_candidate_source,
      v_confidence,
      'pending'::public.inbox_candidate_status,
      v_possible_duplicate,
      v_category_id,
      nullif(v_candidate ->> 'category_name', ''),
      v_account_id,
      nullif(v_candidate ->> 'account_name', ''),
      nullif(v_candidate ->> 'raw_snippet', ''),
      p_batch_id,
      null,
      v_source_row_index,
      v_source_external_id,
      v_source_lifecycle_state,
      v_source_predecessor_external_id,
      v_parser_version,
      v_mapping_version,
      v_applied_rule_id,
      v_applied_rule_version
    );
  end loop;

  update public.import_batches batch_record
  set status = 'committed'::public.import_batch_status,
      committed_at = coalesce(batch_record.committed_at, now()),
      commit_intent_hash = p_intent_hash,
      commit_candidate_count = v_candidate_count
  where batch_record.id = p_batch_id
    and batch_record.user_id = v_user_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'status', 'committed',
    'candidate_count', v_candidate_count,
    'replayed', false
  );
end;
$$;

revoke all on function public.commit_import_batch_candidates(uuid, text, jsonb)
  from public, anon, service_role;
grant execute on function public.commit_import_batch_candidates(uuid, text, jsonb)
  to authenticated;
