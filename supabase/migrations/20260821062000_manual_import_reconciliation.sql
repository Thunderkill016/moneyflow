-- #436: reviewed attachment of later import evidence to an existing unprovenanced ledger fact.
--
-- Matching is intentionally narrow and review-only: same tenant, kind, account,
-- date and exact amount; one-entry money transactions only. Source evidence never
-- mutates the existing financial transaction, entries or reconciliation state.

create or replace function public.find_unprovenanced_money_transaction_match(
  p_user_id uuid,
  p_kind text,
  p_account_id uuid,
  p_occurred_on date,
  p_amount_minor bigint
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_match_count integer := 0;
  v_transaction_id uuid;
begin
  if p_user_id is null
    or p_kind not in ('income', 'expense')
    or p_account_id is null
    or p_occurred_on is null
    or p_amount_minor is null
    or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'none');
  end if;

  with eligible as (
    select transaction_record.id
    from public.financial_transactions as transaction_record
    join public.transaction_entries as entry
      on entry.transaction_id = transaction_record.id
      and entry.user_id = transaction_record.user_id
    where transaction_record.user_id = p_user_id
      and transaction_record.deleted_at is null
      and transaction_record.kind::text = p_kind
      and transaction_record.kind in ('income', 'expense')
      and transaction_record.occurred_on = p_occurred_on
      and not exists (
        select 1
        from public.transaction_import_provenance as provenance
        where provenance.user_id = p_user_id
          and provenance.transaction_id = transaction_record.id
      )
      and not exists (
        select 1
        from public.inbox_candidates as approved_candidate
        where approved_candidate.user_id = p_user_id
          and approved_candidate.approved_transaction_id = transaction_record.id
      )
      and not exists (
        select 1
        from public.commitment_occurrences as occurrence
        where occurrence.user_id = p_user_id
          and occurrence.transaction_id = transaction_record.id
      )
      and not exists (
        select 1
        from public.income_template_occurrences as occurrence
        where occurrence.user_id = p_user_id
          and occurrence.transaction_id = transaction_record.id
      )
    group by transaction_record.id
    having count(*) = 1
      and bool_and(entry.account_id = p_account_id)
      and sum(entry.amount_minor) =
        case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
  )
  select
    count(*)::integer,
    (array_agg(id order by id))[1]
  into v_match_count, v_transaction_id
  from eligible;

  if v_match_count = 1 then
    return jsonb_build_object(
      'status', 'unique',
      'matched_transaction_id', v_transaction_id
    );
  end if;

  if v_match_count > 1 then
    return jsonb_build_object(
      'status', 'ambiguous',
      'match_count', v_match_count
    );
  end if;

  return jsonb_build_object('status', 'none');
end;
$$;

revoke all on function public.find_unprovenanced_money_transaction_match(
  uuid, text, uuid, date, bigint
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
  v_matched_candidate_id uuid;
  v_matched_transaction_id uuid;
  v_transfer_pair_id uuid;
  v_existing_plan jsonb;
  v_existing_status text;
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
    select provenance.transaction_id
      into v_matched_transaction_id
    from public.transaction_import_provenance provenance
    where provenance.user_id = v_user_id
      and provenance.source = v_candidate.source
      and provenance.source_external_id = v_candidate.source_external_id
    order by provenance.created_at, provenance.transaction_id
    limit 1;

    if v_matched_transaction_id is not null then
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

  -- `manual` is already user-authored evidence, so it must not be reconciled to
  -- another unprovenanced fact through this later-source path.
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

create or replace function public.attach_inbox_candidate_to_existing_transaction(
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
  v_target public.financial_transactions%rowtype;
  v_plan jsonb;
  v_existing_plan jsonb;
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
    if v_candidate.approved_transaction_id = p_transaction_id
      and exists (
        select 1
        from public.transaction_import_provenance as provenance
        where provenance.user_id = v_user_id
          and provenance.candidate_id = v_candidate.id
          and provenance.transaction_id = p_transaction_id
      ) then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual' or v_candidate.kind not in ('income', 'expense') then
    raise exception 'candidate_not_attachable';
  end if;

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_target.deleted_at is not null
    or v_target.kind not in ('income', 'expense') then
    raise exception 'transaction_not_eligible';
  end if;

  if exists (
    select 1
    from public.transaction_import_provenance as provenance
    where provenance.user_id = v_user_id
      and provenance.transaction_id = p_transaction_id
  ) then
    raise exception 'transaction_already_provenanced';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if (v_plan ->> 'reason') = 'source_external_id_match' then
    raise exception 'source_external_id_duplicate';
  end if;

  if (v_plan ->> 'reason') = 'existing_transaction_ambiguous' then
    raise exception 'existing_transaction_match_ambiguous';
  end if;

  if (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'existing_transaction_match'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'existing_transaction_match_required';
  end if;

  -- Re-run the narrow match after locking the reviewed target. The helper also
  -- excludes generated recurring facts, split facts and any newly-provenanced fact.
  v_existing_plan := public.find_unprovenanced_money_transaction_match(
    v_user_id,
    v_candidate.kind::text,
    v_candidate.account_id,
    v_candidate.occurred_on,
    v_candidate.amount_minor
  );

  if (v_existing_plan ->> 'status') = 'ambiguous' then
    raise exception 'existing_transaction_match_ambiguous';
  end if;

  if (v_existing_plan ->> 'status') <> 'unique'
    or nullif(v_existing_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'existing_transaction_match_required';
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
    p_transaction_id,
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
    'duplicate',
    'existing_transaction_match',
    0.7
  );

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'existing_transaction_match',
      match_confidence = 0.7,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.attach_inbox_candidate_to_existing_transaction(uuid, uuid)
from public, anon;
grant execute on function public.attach_inbox_candidate_to_existing_transaction(uuid, uuid)
to authenticated;
