-- P1 #434: batch-atomic approval for one persisted import batch.
-- Candidate creation remains separate/recoverable evidence; this function owns the
-- all-or-nothing ledger/provenance/approval boundary for the selected candidates.

create or replace function public.approve_inbox_candidates_batch(
  p_import_batch_id uuid,
  p_items jsonb
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_item_count integer;
  v_candidate_id uuid;
  v_transaction_id uuid;
  v_transaction_ids uuid[] := array[]::uuid[];
  v_seen_candidate_ids uuid[] := array[]::uuid[];
  v_kind public.transaction_kind;
  v_account_id uuid;
  v_category_id uuid;
  v_destination_account_id uuid;
  v_amount_minor bigint;
  v_occurred_on date;
  v_note text;
  v_idempotency_key uuid;
  v_allow_heuristic_duplicate boolean;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_import_batch_id is null then
    raise exception 'import_batch_required';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_batch_items';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 5000 then
    raise exception 'invalid_batch_item_count';
  end if;

  if not exists (
    select 1
    from public.import_batches
    where id = p_import_batch_id
      and user_id = v_user_id
      and status in ('parsed', 'committed')
  ) then
    raise exception 'import_batch_not_found';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    begin
      v_candidate_id := nullif(v_item ->> 'candidate_id', '')::uuid;
      v_kind := (v_item ->> 'kind')::public.transaction_kind;
      v_account_id := nullif(v_item ->> 'account_id', '')::uuid;
      v_category_id := nullif(v_item ->> 'category_id', '')::uuid;
      v_destination_account_id := nullif(v_item ->> 'destination_account_id', '')::uuid;
      v_amount_minor := (v_item ->> 'amount_minor')::bigint;
      v_occurred_on := (v_item ->> 'occurred_on')::date;
      v_note := coalesce(v_item ->> 'note', '');
      v_idempotency_key := nullif(v_item ->> 'idempotency_key', '')::uuid;
      v_allow_heuristic_duplicate := coalesce(
        nullif(v_item ->> 'allow_heuristic_duplicate', '')::boolean,
        false
      );
    exception when others then
      raise exception 'invalid_batch_item';
    end;

    if v_candidate_id is null
      or v_account_id is null
      or v_amount_minor is null
      or v_occurred_on is null
      or v_idempotency_key is null then
      raise exception 'invalid_batch_item';
    end if;

    if v_candidate_id = any(v_seen_candidate_ids) then
      raise exception 'duplicate_candidate_in_batch_request';
    end if;
    v_seen_candidate_ids := array_append(v_seen_candidate_ids, v_candidate_id);

    if not exists (
      select 1
      from public.inbox_candidates
      where id = v_candidate_id
        and user_id = v_user_id
        and import_batch_id = p_import_batch_id
    ) then
      raise exception 'candidate_not_in_batch';
    end if;

    v_transaction_id := public.approve_inbox_candidate(
      v_candidate_id,
      v_kind,
      v_account_id,
      v_category_id,
      v_destination_account_id,
      v_amount_minor,
      v_occurred_on,
      v_note,
      v_idempotency_key,
      v_allow_heuristic_duplicate
    );

    v_transaction_ids := array_append(v_transaction_ids, v_transaction_id);
  end loop;

  update public.import_batches
  set status = 'committed',
      committed_at = coalesce(committed_at, now())
  where id = p_import_batch_id
    and user_id = v_user_id;

  return v_transaction_ids;
end;
$$;

revoke all on function public.approve_inbox_candidates_batch(uuid, jsonb)
  from public, anon;
grant execute on function public.approve_inbox_candidates_batch(uuid, jsonb)
  to authenticated;
