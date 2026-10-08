-- A reviewed draft may resolve missing candidate mappings for either money or
-- transfer approval. Any other invalid server plan remains blocked.
create or replace function public.approve_inbox_candidate(
  p_candidate_id uuid,
  p_kind public.transaction_kind,
  p_account_id uuid,
  p_category_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text,
  p_idempotency_key uuid,
  p_allow_heuristic_duplicate boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_transaction_id uuid;
  v_plan jsonb;
  v_plan_status public.import_match_status;
  v_plan_reason text;
  v_plan_confidence real;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_source_currency text;
  v_destination_currency text;
  v_original_description text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    return v_candidate.approved_transaction_id;
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if p_kind not in ('income', 'expense', 'transfer') then
    raise exception 'unsupported_transaction_kind';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then
    raise exception 'invalid_transaction_amount';
  end if;
  if p_occurred_on is null then
    raise exception 'invalid_transaction_date';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'note_too_long';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);
  v_plan_status := (v_plan ->> 'status')::public.import_match_status;
  v_plan_reason := v_plan ->> 'reason';
  v_plan_confidence := nullif(v_plan ->> 'confidence', '')::real;

  if v_plan_status = 'duplicate' then
    if v_plan_reason = 'source_external_id_match' then
      raise exception 'source_external_id_duplicate';
    end if;
    if not p_allow_heuristic_duplicate then
      raise exception 'candidate_duplicate';
    end if;
  end if;

  if v_plan_status = 'suspected_transfer' and p_kind <> 'transfer' then
    raise exception 'candidate_requires_transfer_review';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and not is_archived
  ) then
    raise exception 'account_not_found';
  end if;

  if p_kind = 'transfer' then
    if p_destination_account_id is null
      or p_destination_account_id = p_account_id then
      raise exception 'different_accounts_required';
    end if;

    select currency_code into v_source_currency
    from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and not is_archived;

    select currency_code into v_destination_currency
    from public.accounts
    where id = p_destination_account_id
      and user_id = v_user_id
      and not is_archived;

    if v_destination_currency is null then
      raise exception 'account_not_found';
    end if;
    if v_source_currency <> v_destination_currency then
      raise exception 'currency_mismatch';
    end if;
  else
    select kind, is_archived
      into v_category_kind, v_category_archived
    from public.categories
    where id = p_category_id
      and user_id = v_user_id;

    if v_category_kind is null or v_category_kind::text <> p_kind::text then
      raise exception 'category_kind_mismatch';
    end if;
    if v_category_archived then
      raise exception 'category_archived';
    end if;
  end if;

  if v_plan_status = 'invalid' then
    if v_plan_reason in ('account_required', 'category_required') then
      v_plan_status := 'would_create';
      v_plan_reason := 'resolved_during_review';
      v_plan_confidence := 1;
    else
      raise exception 'candidate_invalid';
    end if;
  end if;

  if exists (
    select 1 from public.financial_transactions
    where user_id = v_user_id
      and idempotency_key = p_idempotency_key
  ) then
    raise exception 'idempotency_key_in_use';
  end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key)
  values
    (
      v_user_id,
      p_kind,
      coalesce(
        nullif(trim(p_note), ''),
        case when p_kind = 'transfer' then 'Chuyển tiền' else v_candidate.merchant end
      ),
      p_occurred_on,
      p_idempotency_key
    )
  returning id into v_transaction_id;

  if p_kind = 'transfer' then
    insert into public.transaction_entries
      (transaction_id, user_id, account_id, category_id, amount_minor)
    values
      (v_transaction_id, v_user_id, p_account_id, null, -p_amount_minor),
      (v_transaction_id, v_user_id, p_destination_account_id, null, p_amount_minor);
  else
    insert into public.transaction_entries
      (transaction_id, user_id, account_id, category_id, amount_minor)
    values
      (
        v_transaction_id,
        v_user_id,
        p_account_id,
        p_category_id,
        case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
      );
  end if;

  v_original_description := left(
    coalesce(
      nullif(v_candidate.raw_snippet, ''),
      nullif(trim(concat_ws(' ', v_candidate.merchant, v_candidate.note)), ''),
      ''
    ),
    2000
  );

  insert into public.transaction_import_provenance (
    transaction_id,
    user_id,
    candidate_id,
    import_batch_id,
    source,
    source_row_index,
    original_description,
    source_external_id,
    fingerprint_version,
    fingerprint,
    parser_version,
    mapping_version,
    match_status,
    match_reason,
    match_confidence
  ) values (
    v_transaction_id,
    v_user_id,
    v_candidate.id,
    v_candidate.import_batch_id,
    v_candidate.source,
    v_candidate.source_row_index,
    v_original_description,
    v_candidate.source_external_id,
    v_candidate.fingerprint_version,
    v_candidate.fingerprint,
    v_candidate.parser_version,
    v_candidate.mapping_version,
    v_plan_status,
    v_plan_reason,
    v_plan_confidence
  );

  update public.inbox_candidates
  set kind = p_kind,
      amount_minor = p_amount_minor,
      note = coalesce(p_note, ''),
      occurred_on = p_occurred_on,
      account_id = p_account_id,
      account_name = (
        select name from public.accounts
        where id = p_account_id and user_id = v_user_id
      ),
      category_id = case when p_kind = 'transfer' then null else p_category_id end,
      category_name = case
        when p_kind = 'transfer' then null
        else (
          select name from public.categories
          where id = p_category_id and user_id = v_user_id
        )
      end,
      possible_transfer = (v_plan_status = 'suspected_transfer'),
      transfer_pair_id = nullif(v_plan ->> 'matched_candidate_id', '')::uuid,
      match_status = v_plan_status,
      match_reason = v_plan_reason,
      match_confidence = v_plan_confidence,
      status = 'approved',
      approved_transaction_id = v_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.approve_inbox_candidate(uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean) from public, anon;
grant execute on function public.approve_inbox_candidate(uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean) to authenticated;
