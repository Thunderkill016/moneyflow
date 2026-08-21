-- #438: make exact-source deleted reimport an explicit reviewed decision.
--
-- Repeated source evidence never auto-restores a transaction. A deleted exact
-- source-ID match is reviewable only when its canonical fingerprint is unchanged.
-- Restoring preserves the existing ledger/provenance payload and clears only
-- financial_transactions.deleted_at plus repeat-candidate resolution metadata.

create or replace function public.plan_inbox_candidate(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_matched_candidate_id uuid;
  v_matched_transaction_id uuid;
  v_transfer_pair_id uuid;
  v_existing_plan jsonb;
  v_existing_status text;
  v_source_fingerprint_version smallint;
  v_source_fingerprint text;
  v_source_deleted_at timestamptz;
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
    select
      provenance.transaction_id,
      provenance.fingerprint_version,
      provenance.fingerprint,
      transaction_record.deleted_at
    into
      v_matched_transaction_id,
      v_source_fingerprint_version,
      v_source_fingerprint,
      v_source_deleted_at
    from public.transaction_import_provenance provenance
    join public.financial_transactions transaction_record
      on transaction_record.id = provenance.transaction_id
      and transaction_record.user_id = provenance.user_id
    where provenance.user_id = v_user_id
      and provenance.source = v_candidate.source
      and provenance.source_external_id = v_candidate.source_external_id
    order by provenance.created_at, provenance.transaction_id
    limit 1;

    if v_matched_transaction_id is not null then
      if v_source_deleted_at is not null then
        if v_candidate.fingerprint is not null
          and v_source_fingerprint is not null
          and v_candidate.fingerprint_version = v_source_fingerprint_version
          and v_candidate.fingerprint = v_source_fingerprint then
          return jsonb_build_object(
            'status', 'duplicate',
            'reason', 'source_external_id_deleted_match',
            'confidence', 1,
            'matched_transaction_id', v_matched_transaction_id
          );
        end if;

        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_deleted_changed',
          'confidence', 1,
          'matched_transaction_id', v_matched_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_external_id_match',
        'confidence', 1,
        'matched_transaction_id', v_matched_transaction_id
      );
    end if;
  end if;

  if v_candidate.fingerprint is not null then
    select provenance.transaction_id
      into v_matched_transaction_id
    from public.transaction_import_provenance provenance
    where provenance.user_id = v_user_id
      and provenance.fingerprint_version = v_candidate.fingerprint_version
      and provenance.fingerprint = v_candidate.fingerprint
    order by provenance.created_at, provenance.transaction_id
    limit 1;

    if v_matched_transaction_id is not null then
      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'fingerprint_transaction_match',
        'confidence', 0.85,
        'matched_transaction_id', v_matched_transaction_id
      );
    end if;

    select candidate.id
      into v_matched_candidate_id
    from public.inbox_candidates candidate
    where candidate.user_id = v_user_id
      and candidate.id <> v_candidate.id
      and candidate.status <> 'rejected'
      and candidate.fingerprint_version = v_candidate.fingerprint_version
      and candidate.fingerprint = v_candidate.fingerprint
      and (candidate.created_at, candidate.id) < (v_candidate.created_at, v_candidate.id)
    order by candidate.created_at, candidate.id
    limit 1;

    if v_matched_candidate_id is not null then
      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'fingerprint_candidate_match',
        'confidence', 0.75,
        'matched_candidate_id', v_matched_candidate_id
      );
    end if;
  end if;

  -- Transfer suspicion stays stronger than the weaker existing-ledger fallback.
  if v_candidate.kind = 'transfer' then
    return jsonb_build_object(
      'status', 'suspected_transfer',
      'reason', 'candidate_marked_transfer',
      'confidence', 1
    );
  end if;

  select candidate.id
    into v_transfer_pair_id
  from public.inbox_candidates candidate
  where candidate.user_id = v_user_id
    and candidate.id <> v_candidate.id
    and candidate.status = 'pending'
    and candidate.occurred_on = v_candidate.occurred_on
    and candidate.amount_minor = v_candidate.amount_minor
    and (
      (v_candidate.kind = 'expense' and candidate.kind = 'income')
      or (v_candidate.kind = 'income' and candidate.kind = 'expense')
    )
    and (
      v_candidate.account_id is null
      or candidate.account_id is null
      or candidate.account_id <> v_candidate.account_id
    )
  order by candidate.created_at, candidate.id
  limit 1;

  if v_transfer_pair_id is not null then
    return jsonb_build_object(
      'status', 'suspected_transfer',
      'reason', 'opposite_candidate_same_amount_date',
      'confidence', 0.9,
      'matched_candidate_id', v_transfer_pair_id
    );
  end if;

  -- `manual` is already user-authored evidence, so it must not be reconciled to
  -- another unprovenanced fact through the later-source fallback.
  if v_candidate.source <> 'manual'
    and v_candidate.kind in ('income', 'expense')
    and v_candidate.account_id is not null then
    v_existing_plan := public.find_unprovenanced_money_transaction_match(
      v_user_id,
      v_candidate.kind::text,
      v_candidate.account_id,
      v_candidate.occurred_on,
      v_candidate.amount_minor
    );
    v_existing_status := v_existing_plan ->> 'status';

    if v_existing_status = 'unique' then
      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'existing_transaction_match',
        'confidence', 0.7,
        'matched_transaction_id', v_existing_plan ->> 'matched_transaction_id'
      );
    end if;

    if v_existing_status = 'ambiguous' then
      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'existing_transaction_ambiguous',
        'confidence', 0.4
      );
    end if;
  end if;

  if v_candidate.account_id is null then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'account_required',
      'confidence', 1
    );
  end if;

  if v_candidate.kind in ('income', 'expense') and v_candidate.category_id is null then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'category_required',
      'confidence', 1
    );
  end if;

  return jsonb_build_object(
    'status', 'would_create',
    'reason', 'no_server_match',
    'confidence', 1
  );
end;
$$;

revoke all on function public.plan_inbox_candidate(uuid) from public, anon;
grant execute on function public.plan_inbox_candidate(uuid) to authenticated;

create or replace function public.restore_deleted_imported_transaction_from_candidate(
  p_candidate_id uuid,
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_provenance public.transaction_import_provenance%rowtype;
  v_target public.financial_transactions%rowtype;
  v_plan jsonb;
  v_affected integer := 0;
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
    if v_candidate.approved_transaction_id = p_transaction_id
      and v_candidate.status = 'approved'
      and v_candidate.match_reason = 'source_external_id_deleted_restore' then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual' or v_candidate.source_external_id is null then
    raise exception 'candidate_not_restoreable';
  end if;

  select * into v_provenance
  from public.transaction_import_provenance
  where user_id = v_user_id
    and transaction_id = p_transaction_id
    and source = v_candidate.source
    and source_external_id = v_candidate.source_external_id
  for update;

  if not found then
    raise exception 'source_provenance_not_found';
  end if;

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_target.deleted_at is null then
    raise exception 'transaction_not_deleted';
  end if;

  if v_candidate.fingerprint is null
    or v_provenance.fingerprint is null
    or v_candidate.fingerprint_version is distinct from v_provenance.fingerprint_version
    or v_candidate.fingerprint is distinct from v_provenance.fingerprint then
    raise exception 'source_observation_changed';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if (v_plan ->> 'reason') = 'source_external_id_deleted_changed' then
    raise exception 'source_observation_changed';
  end if;

  if (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'source_external_id_deleted_match'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'deleted_source_match_required';
  end if;

  update public.financial_transactions
  set deleted_at = null
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is not null;

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'transaction_restore_race';
  end if;

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'source_external_id_deleted_restore',
      match_confidence = 1,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.restore_deleted_imported_transaction_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.restore_deleted_imported_transaction_from_candidate(uuid, uuid)
to authenticated;
