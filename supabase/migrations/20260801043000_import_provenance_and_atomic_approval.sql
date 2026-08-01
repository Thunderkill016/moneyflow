-- Import provenance and atomic authenticated Inbox approval.
-- This migration keeps reconciliation separate from import and does not guess
-- lineage for historical approved candidates.

create type public.import_match_status as enum (
  'would_create',
  'duplicate',
  'suspected_transfer',
  'invalid'
);

alter table public.import_batches
  add column parser_version text
    check (parser_version is null or char_length(parser_version) between 1 and 80),
  add column mapping_version integer
    check (mapping_version is null or mapping_version >= 1);

alter table public.inbox_candidates
  add column source_row_index integer
    check (source_row_index is null or source_row_index >= 0),
  add column source_external_id text
    check (source_external_id is null or char_length(source_external_id) between 1 and 200),
  add column fingerprint_version smallint
    check (fingerprint_version is null or fingerprint_version >= 1),
  add column fingerprint text
    check (fingerprint is null or char_length(fingerprint) between 1 and 128),
  add column parser_version text
    check (parser_version is null or char_length(parser_version) between 1 and 80),
  add column mapping_version integer
    check (mapping_version is null or mapping_version >= 1),
  add column match_status public.import_match_status,
  add column match_reason text
    check (match_reason is null or char_length(match_reason) <= 500),
  add column match_confidence real
    check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  add column possible_transfer boolean not null default false,
  add column transfer_pair_id uuid,
  add column approved_transaction_id uuid,
  add column approved_at timestamptz,
  add constraint inbox_candidates_approval_link_check check (
    approved_transaction_id is null
    or (status = 'approved' and approved_at is not null)
  ),
  add constraint inbox_candidates_transfer_pair_user_fkey
    foreign key (transfer_pair_id, user_id)
    references public.inbox_candidates (id, user_id)
    on delete set null (transfer_pair_id),
  add constraint inbox_candidates_approved_transaction_user_fkey
    foreign key (approved_transaction_id, user_id)
    references public.financial_transactions (id, user_id)
    on delete restrict;

create index inbox_candidates_user_fingerprint_idx
  on public.inbox_candidates (user_id, fingerprint_version, fingerprint)
  where fingerprint is not null;

create index inbox_candidates_user_external_id_idx
  on public.inbox_candidates (user_id, source, source_external_id)
  where source_external_id is not null;

create index inbox_candidates_user_approved_transaction_idx
  on public.inbox_candidates (user_id, approved_transaction_id)
  where approved_transaction_id is not null;

create table public.transaction_import_provenance (
  transaction_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid not null,
  import_batch_id uuid,
  source public.inbox_candidate_source not null,
  source_row_index integer
    check (source_row_index is null or source_row_index >= 0),
  original_description text not null default ''
    check (char_length(original_description) <= 2000),
  source_external_id text
    check (source_external_id is null or char_length(source_external_id) between 1 and 200),
  fingerprint_version smallint
    check (fingerprint_version is null or fingerprint_version >= 1),
  fingerprint text
    check (fingerprint is null or char_length(fingerprint) between 1 and 128),
  parser_version text
    check (parser_version is null or char_length(parser_version) between 1 and 80),
  mapping_version integer
    check (mapping_version is null or mapping_version >= 1),
  match_status public.import_match_status not null,
  match_reason text
    check (match_reason is null or char_length(match_reason) <= 500),
  match_confidence real
    check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  created_at timestamptz not null default now(),
  unique (transaction_id, user_id),
  unique (candidate_id, user_id),
  foreign key (transaction_id, user_id)
    references public.financial_transactions (id, user_id)
    on delete restrict,
  foreign key (candidate_id, user_id)
    references public.inbox_candidates (id, user_id)
    on delete restrict,
  foreign key (import_batch_id, user_id)
    references public.import_batches (id, user_id)
    on delete set null (import_batch_id)
);

create unique index transaction_import_provenance_external_id_uidx
  on public.transaction_import_provenance (user_id, source, source_external_id)
  where source_external_id is not null;

create index transaction_import_provenance_fingerprint_idx
  on public.transaction_import_provenance (user_id, fingerprint_version, fingerprint)
  where fingerprint is not null;

create index transaction_import_provenance_batch_idx
  on public.transaction_import_provenance (user_id, import_batch_id)
  where import_batch_id is not null;

alter table public.transaction_import_provenance enable row level security;

create policy "transaction_import_provenance_select_own"
  on public.transaction_import_provenance
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.transaction_import_provenance from anon, authenticated;
grant select on public.transaction_import_provenance to authenticated;

create or replace function public.compute_inbox_candidate_fingerprint(
  p_account_id uuid,
  p_account_name text,
  p_occurred_on date,
  p_amount_minor bigint,
  p_description text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select md5(
    coalesce(p_account_id::text, lower(trim(coalesce(p_account_name, ''))), '')
    || '|'
    || coalesce(p_occurred_on::text, '')
    || '|'
    || coalesce(p_amount_minor::text, '')
    || '|'
    || lower(trim(regexp_replace(coalesce(p_description, ''), '\s+', ' ', 'g')))
  );
$$;

create or replace function public.set_inbox_candidate_fingerprint()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.fingerprint_version := 1;
  new.fingerprint := public.compute_inbox_candidate_fingerprint(
    new.account_id,
    new.account_name,
    new.occurred_on,
    new.amount_minor,
    coalesce(nullif(new.raw_snippet, ''), concat_ws(' ', new.merchant, new.note))
  );
  return new;
end;
$$;

create trigger inbox_candidates_set_fingerprint
  before insert or update of
    account_id, account_name, occurred_on, amount_minor, raw_snippet, merchant, note
  on public.inbox_candidates
  for each row execute function public.set_inbox_candidate_fingerprint();

update public.inbox_candidates
set fingerprint_version = 1,
    fingerprint = public.compute_inbox_candidate_fingerprint(
      account_id,
      account_name,
      occurred_on,
      amount_minor,
      coalesce(nullif(raw_snippet, ''), concat_ws(' ', merchant, note))
    )
where fingerprint is null;

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

    if v_plan_status = 'invalid'
      and v_plan_reason in ('account_required', 'category_required') then
      v_plan_status := 'would_create';
      v_plan_reason := 'resolved_during_review';
      v_plan_confidence := 1;
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

revoke all on function public.compute_inbox_candidate_fingerprint(uuid, text, date, bigint, text) from public, anon, authenticated;
revoke all on function public.set_inbox_candidate_fingerprint() from public, anon, authenticated;
revoke all on function public.plan_inbox_candidate(uuid) from public, anon;
revoke all on function public.approve_inbox_candidate(uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean) from public, anon;

grant execute on function public.plan_inbox_candidate(uuid) to authenticated;
grant execute on function public.approve_inbox_candidate(uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean) to authenticated;
