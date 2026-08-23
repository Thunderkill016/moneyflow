-- #448: reviewed source lifecycle may inform clearing without becoming ledger truth.
--
-- Upstream `posted`/`booked` status is weaker than MoneyFlow statement
-- reconciliation. This migration therefore preserves lifecycle changes as source
-- observations and permits only one financial effect: an explicitly reviewed,
-- exactly matching posted observation may advance a one-leg income/expense
-- account leg from `pending` to `cleared`. Source evidence never establishes
-- `reconciled`, overwrites ledger fields, deletes facts, or demotes existing state.

create or replace function public.resolve_inbox_source_identity(
  p_user_id uuid,
  p_source public.inbox_candidate_source,
  p_source_external_id text
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_fingerprint_version smallint;
  v_fingerprint text;
  v_source_lifecycle_state text;
  v_deleted_at timestamptz;
  v_candidate_id uuid;
begin
  if p_user_id is null or p_source_external_id is null then
    return null;
  end if;

  select
    candidate.approved_transaction_id,
    candidate.fingerprint_version,
    candidate.fingerprint,
    candidate.source_lifecycle_state,
    transaction_record.deleted_at,
    candidate.id
  into
    v_transaction_id,
    v_fingerprint_version,
    v_fingerprint,
    v_source_lifecycle_state,
    v_deleted_at,
    v_candidate_id
  from public.inbox_candidates candidate
  join public.financial_transactions transaction_record
    on transaction_record.id = candidate.approved_transaction_id
    and transaction_record.user_id = candidate.user_id
  where candidate.user_id = p_user_id
    and candidate.source = p_source
    and candidate.source_external_id = p_source_external_id
    and candidate.status = 'approved'
    and candidate.approved_transaction_id is not null
    and candidate.match_reason in (
      'source_external_id_changed_observation',
      'source_external_id_deleted_restore',
      'source_predecessor_observation',
      'source_lifecycle_observation'
    )
  order by candidate.approved_at desc nulls last, candidate.created_at desc, candidate.id desc
  limit 1;

  if v_transaction_id is not null then
    return jsonb_build_object(
      'transaction_id', v_transaction_id,
      'fingerprint_version', v_fingerprint_version,
      'fingerprint', v_fingerprint,
      'source_lifecycle_state', v_source_lifecycle_state,
      'deleted_at', v_deleted_at,
      'basis', 'approved_observation',
      'candidate_id', v_candidate_id
    );
  end if;

  select
    provenance.transaction_id,
    provenance.fingerprint_version,
    provenance.fingerprint,
    source_candidate.source_lifecycle_state,
    transaction_record.deleted_at,
    provenance.candidate_id
  into
    v_transaction_id,
    v_fingerprint_version,
    v_fingerprint,
    v_source_lifecycle_state,
    v_deleted_at,
    v_candidate_id
  from public.transaction_import_provenance provenance
  join public.financial_transactions transaction_record
    on transaction_record.id = provenance.transaction_id
    and transaction_record.user_id = provenance.user_id
  left join public.inbox_candidates source_candidate
    on source_candidate.id = provenance.candidate_id
    and source_candidate.user_id = provenance.user_id
  where provenance.user_id = p_user_id
    and provenance.source = p_source
    and provenance.source_external_id = p_source_external_id
  order by provenance.created_at, provenance.transaction_id
  limit 1;

  if v_transaction_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'fingerprint_version', v_fingerprint_version,
    'fingerprint', v_fingerprint,
    'source_lifecycle_state', v_source_lifecycle_state,
    'deleted_at', v_deleted_at,
    'basis', 'canonical_provenance',
    'candidate_id', v_candidate_id
  );
end;
$$;

revoke all on function public.resolve_inbox_source_identity(
  uuid, public.inbox_candidate_source, text
) from public, anon, authenticated, service_role;

create or replace function public.plan_inbox_candidate(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_identity jsonb;
  v_transaction_id uuid;
  v_source_fingerprint_version smallint;
  v_source_fingerprint text;
  v_source_lifecycle_state text;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    return jsonb_build_object(
      'status', 'duplicate',
      'reason', 'already_approved',
      'confidence', 1,
      'matched_transaction_id', v_candidate.approved_transaction_id
    );
  end if;

  if v_candidate.status <> 'pending' then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'candidate_not_pending',
      'confidence', 1
    );
  end if;

  if v_candidate.source_external_id is not null then
    v_identity := public.resolve_inbox_source_identity(
      v_user_id,
      v_candidate.source,
      v_candidate.source_external_id
    );

    if v_identity is not null then
      v_transaction_id := nullif(v_identity ->> 'transaction_id', '')::uuid;
      v_source_fingerprint_version := nullif(
        v_identity ->> 'fingerprint_version', ''
      )::smallint;
      v_source_fingerprint := v_identity ->> 'fingerprint';
      v_source_lifecycle_state := v_identity ->> 'source_lifecycle_state';
      v_deleted_at := nullif(v_identity ->> 'deleted_at', '')::timestamptz;

      if v_deleted_at is not null then
        if v_candidate.fingerprint is not null
          and v_source_fingerprint is not null
          and v_candidate.fingerprint_version = v_source_fingerprint_version
          and v_candidate.fingerprint = v_source_fingerprint then
          return jsonb_build_object(
            'status', 'duplicate',
            'reason', 'source_external_id_deleted_match',
            'confidence', 1,
            'matched_transaction_id', v_transaction_id
          );
        end if;

        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_deleted_changed',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      if v_candidate.fingerprint is not null
        and v_source_fingerprint is not null
        and v_candidate.fingerprint_version = v_source_fingerprint_version
        and v_candidate.fingerprint = v_source_fingerprint then
        if v_candidate.source_lifecycle_state is distinct from v_source_lifecycle_state then
          return jsonb_build_object(
            'status', 'duplicate',
            'reason', 'source_external_id_lifecycle_changed',
            'confidence', 1,
            'matched_transaction_id', v_transaction_id
          );
        end if;

        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_match',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_external_id_changed',
        'confidence', 1,
        'matched_transaction_id', v_transaction_id
      );
    end if;
  end if;

  if v_candidate.source_predecessor_external_id is not null then
    v_identity := public.resolve_inbox_source_identity(
      v_user_id,
      v_candidate.source,
      v_candidate.source_predecessor_external_id
    );

    if v_identity is not null then
      v_transaction_id := nullif(v_identity ->> 'transaction_id', '')::uuid;
      v_deleted_at := nullif(v_identity ->> 'deleted_at', '')::timestamptz;

      if v_deleted_at is not null then
        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_predecessor_deleted_match',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_predecessor_match',
        'confidence', 1,
        'matched_transaction_id', v_transaction_id
      );
    end if;
  end if;

  if v_candidate.source_lifecycle_state = 'removed' then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'source_removed_unmatched',
      'confidence', 1
    );
  end if;

  return public.plan_inbox_candidate_pre_source_lineage(p_candidate_id);
end;
$$;

revoke all on function public.plan_inbox_candidate(uuid) from public, anon;
grant execute on function public.plan_inbox_candidate(uuid) to authenticated;

-- Review source lifecycle evidence and, only for an exact posted observation,
-- advance a pending one-leg money transaction to cleared. The source observation
-- is approved first in the same database transaction, so a failed financial
-- effect cannot leave partial review state.
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

  -- Pending/removed/unspecified source state is durable evidence only.
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

  -- This bounded slice supports exactly one account leg. Transfers and split
  -- transactions remain under the existing reconciliation workflow.
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

  -- Follow the reconciliation lock order before locking ledger rows.
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

-- Keep hard source lifecycle decisions outside the ordinary financial approval
-- path even when a caller opts into heuristic duplicate override.
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
  v_plan jsonb;
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);
  v_reason := v_plan ->> 'reason';

  if (v_plan ->> 'status') = 'duplicate'
    and v_reason in (
      'source_external_id_match',
      'source_external_id_lifecycle_changed',
      'source_external_id_changed',
      'source_external_id_deleted_match',
      'source_external_id_deleted_changed',
      'source_predecessor_match',
      'source_predecessor_deleted_match'
    ) then
    raise exception 'source_external_id_duplicate';
  end if;

  return public.approve_inbox_candidate_pre_source_lineage(
    p_candidate_id,
    p_kind,
    p_account_id,
    p_category_id,
    p_destination_account_id,
    p_amount_minor,
    p_occurred_on,
    p_note,
    p_idempotency_key,
    p_allow_heuristic_duplicate
  );
end;
$$;

revoke all on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) from public, anon;
grant execute on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) to authenticated;