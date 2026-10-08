-- #440: preserve later observations for a stable source ID without overwriting ledger truth.
--
-- `transaction_import_provenance` remains the canonical identity anchor. Repeated
-- source observations remain durable Inbox candidates linked to that same ledger
-- transaction. Changed evidence is reviewable, never an implicit ledger update.

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

      if v_candidate.fingerprint is not null
        and v_source_fingerprint is not null
        and v_candidate.fingerprint_version = v_source_fingerprint_version
        and v_candidate.fingerprint = v_source_fingerprint then
        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_match',
          'confidence', 1,
          'matched_transaction_id', v_matched_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_external_id_changed',
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

create or replace function public.record_changed_source_observation_from_candidate(
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
      and v_candidate.match_reason = 'source_external_id_changed_observation' then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual' or v_candidate.source_external_id is null then
    raise exception 'candidate_not_source_observation';
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

  if v_target.deleted_at is not null then
    raise exception 'transaction_deleted';
  end if;

  if v_candidate.fingerprint is not null
    and v_provenance.fingerprint is not null
    and v_candidate.fingerprint_version = v_provenance.fingerprint_version
    and v_candidate.fingerprint = v_provenance.fingerprint then
    raise exception 'source_observation_unchanged';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'source_external_id_changed'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'changed_source_match_required';
  end if;

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'source_external_id_changed_observation',
      match_confidence = 1,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.record_changed_source_observation_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.record_changed_source_observation_from_candidate(uuid, uuid)
to authenticated;

-- Approved Inbox candidates are durable acquisition observations. Pending rows stay
-- editable, but a resolved observation cannot be silently rewritten. The one
-- allowed update is the existing import-batch FK cleanup (non-null -> null).
create or replace function public.guard_approved_inbox_candidate_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'approved' then
    if old.import_batch_id is not null
      and new.import_batch_id is null
      and (
        to_jsonb(new) - array['import_batch_id', 'updated_at']::text[]
      ) = (
        to_jsonb(old) - array['import_batch_id', 'updated_at']::text[]
      ) then
      return new;
    end if;

    raise exception 'approved_candidate_evidence_immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_approved_inbox_candidate_evidence()
from public, anon, authenticated, service_role;

drop trigger if exists inbox_candidates_guard_approved_evidence
on public.inbox_candidates;
create trigger inbox_candidates_guard_approved_evidence
before update on public.inbox_candidates
for each row execute function public.guard_approved_inbox_candidate_evidence();

-- Source observations are part of the acquisition evidence history. Tenant purge
-- remains a privileged SECURITY DEFINER operation and is unaffected by this grant.
revoke delete on public.inbox_candidates from authenticated;

-- Harden the server approval boundary as well as the UI. Heuristic duplicate
-- override is allowed only for heuristic duplicate reasons, never exact source-ID
-- decisions (including #439 deleted-source reasons and #440 changed evidence).
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
    if v_plan_reason in (
      'source_external_id_match',
      'source_external_id_changed',
      'source_external_id_deleted_match',
      'source_external_id_deleted_changed'
    ) then
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

revoke all on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) from public, anon;
grant execute on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) to authenticated;