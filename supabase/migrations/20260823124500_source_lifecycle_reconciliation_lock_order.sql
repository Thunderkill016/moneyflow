-- #448 concurrency hardening.
--
-- Existing changed/replacement observation helpers lock the target transaction.
-- A reviewed posted observation may later need the account reconciliation lock.
-- Acquire that account lock first so this path follows the same account ->
-- transaction lock order as statement reconciliation and cannot deadlock by
-- inverting those locks under concurrent review/close operations.

create or replace function public.review_source_lifecycle_observation_from_candidate(
  p_candidate_id uuid,
  p_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_plan jsonb;
  v_reason text;
  v_target public.financial_transactions%rowtype;
  v_entry_id uuid;
  v_entry_account_id uuid;
  v_entry_amount_minor bigint;
  v_entry_state public.entry_reconciliation_state;
  v_entry_count integer;
  v_expected_amount_minor bigint;
  v_effect text := 'observation_only';
  v_effect_reason text := 'source_observation_preserved';
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

  if v_candidate.source = 'manual'
    or v_candidate.source_external_id is null then
    raise exception 'candidate_not_source_lifecycle_observation';
  end if;

  if v_candidate.approved_transaction_id is null then
    if v_candidate.status <> 'pending' then
      raise exception 'candidate_not_pending';
    end if;

    v_plan := public.plan_inbox_candidate(p_candidate_id);
    v_reason := v_plan ->> 'reason';

    if (v_plan ->> 'status') <> 'duplicate'
      or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id
      or v_reason not in (
        'source_external_id_lifecycle_changed',
        'source_external_id_changed',
        'source_predecessor_match'
      ) then
      raise exception 'source_lifecycle_review_match_required';
    end if;

    -- The helper paths below may lock the target transaction. For a posted
    -- candidate, take the reconciliation account lock before entering them.
    if v_candidate.source_lifecycle_state = 'posted'
      and v_candidate.account_id is not null then
      perform public.lock_reconciliation_account(v_candidate.account_id);
    end if;

    if v_reason = 'source_external_id_changed' then
      perform public.record_changed_source_observation_from_candidate(
        p_candidate_id,
        p_transaction_id
      );
    elsif v_reason = 'source_predecessor_match' then
      perform public.record_source_replacement_observation_from_candidate(
        p_candidate_id,
        p_transaction_id
      );
    else
      update public.inbox_candidates
      set match_status = 'duplicate',
          match_reason = 'source_lifecycle_observation',
          match_confidence = 1,
          status = 'approved',
          approved_transaction_id = p_transaction_id,
          approved_at = now()
      where id = p_candidate_id
        and user_id = v_user_id;
    end if;

    select * into strict v_candidate
    from public.inbox_candidates
    where id = p_candidate_id
      and user_id = v_user_id;
  else
    if v_candidate.approved_transaction_id <> p_transaction_id
      or v_candidate.status <> 'approved'
      or v_candidate.match_reason not in (
        'source_lifecycle_observation',
        'source_external_id_changed_observation',
        'source_predecessor_observation'
      ) then
      raise exception 'candidate_already_approved';
    end if;
  end if;

  if v_candidate.source_lifecycle_state is distinct from 'posted' then
    v_effect_reason := case v_candidate.source_lifecycle_state
      when 'pending' then 'pending_source_evidence'
      when 'removed' then 'removed_source_evidence'
      else 'lifecycle_unspecified'
    end;
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', v_effect_reason
    );
  end if;

  select count(*)::integer
  into v_entry_count
  from public.transaction_entries entry
  where entry.user_id = v_user_id
    and entry.transaction_id = p_transaction_id;

  if v_entry_count <> 1 or v_candidate.account_id is null then
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', 'posted_transaction_not_one_leg'
    );
  end if;

  -- Reentrant if the pending-review branch acquired it above; required for
  -- replay of an already approved candidate.
  perform public.lock_reconciliation_account(v_candidate.account_id);

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found or v_target.deleted_at is not null then
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', 'posted_transaction_not_live'
    );
  end if;

  select
    entry.id,
    entry.account_id,
    entry.amount_minor,
    entry.reconciliation_state
  into
    v_entry_id,
    v_entry_account_id,
    v_entry_amount_minor,
    v_entry_state
  from public.transaction_entries entry
  where entry.user_id = v_user_id
    and entry.transaction_id = p_transaction_id
  for update;

  if not found then
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', 'posted_transaction_not_one_leg'
    );
  end if;

  if v_target.kind not in ('income', 'expense')
    or v_candidate.kind is distinct from v_target.kind
    or v_candidate.account_id is distinct from v_entry_account_id
    or v_candidate.occurred_on is distinct from v_target.occurred_on
    or v_candidate.amount_minor is null
    or v_candidate.amount_minor <= 0 then
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', 'posted_ledger_mismatch'
    );
  end if;

  v_expected_amount_minor := case v_target.kind
    when 'income' then v_candidate.amount_minor
    when 'expense' then -v_candidate.amount_minor
  end;

  if v_entry_amount_minor is distinct from v_expected_amount_minor then
    return jsonb_build_object(
      'transaction_id', p_transaction_id,
      'reconciliation_effect', v_effect,
      'reason', 'posted_ledger_mismatch'
    );
  end if;

  if v_entry_state = 'pending' then
    perform public.set_account_entry_reconciliation_state(v_entry_id, 'cleared');
    v_effect := 'cleared';
    v_effect_reason := 'posted_exact_match_cleared';
  elsif v_entry_state = 'cleared' then
    v_effect := 'unchanged';
    v_effect_reason := 'already_cleared';
  else
    v_effect := 'unchanged';
    v_effect_reason := 'already_reconciled';
  end if;

  return jsonb_build_object(
    'transaction_id', p_transaction_id,
    'reconciliation_effect', v_effect,
    'reason', v_effect_reason
  );
end;
$$;

revoke all on function public.review_source_lifecycle_observation_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.review_source_lifecycle_observation_from_candidate(uuid, uuid)
to authenticated;