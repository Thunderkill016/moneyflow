-- Approve one Inbox candidate and create its ledger transaction atomically.
-- The locked candidate row is the idempotency anchor: a committed retry returns
-- the existing link, while any failure rolls back both candidate and ledger.

alter table public.inbox_candidates
  add column financial_transaction_id uuid,
  add constraint inbox_candidates_financial_link_requires_approved
    check (
      financial_transaction_id is null
      or status = 'approved'::public.inbox_candidate_status
    ),
  add constraint inbox_candidates_financial_transaction_owner_fkey
    foreign key (financial_transaction_id, user_id)
    references public.financial_transactions (id, user_id)
    on delete set null (financial_transaction_id);

create unique index inbox_candidates_user_financial_transaction_uidx
  on public.inbox_candidates (user_id, financial_transaction_id)
  where financial_transaction_id is not null;

-- The original composite FKs attempted to null both the optional reference and
-- the NOT NULL tenant key. PostgreSQL 17 supports targeting only the optional
-- column in an ON DELETE SET NULL action.
alter table public.inbox_candidates
  drop constraint inbox_candidates_import_batch_id_user_id_fkey,
  add constraint inbox_candidates_import_batch_id_user_id_fkey
    foreign key (import_batch_id, user_id)
    references public.import_batches (id, user_id)
    on delete set null (import_batch_id),
  drop constraint inbox_candidates_account_id_user_id_fkey,
  add constraint inbox_candidates_account_id_user_id_fkey
    foreign key (account_id, user_id)
    references public.accounts (id, user_id)
    on delete set null (account_id),
  drop constraint inbox_candidates_category_id_user_id_fkey,
  add constraint inbox_candidates_category_id_user_id_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete set null (category_id);

create or replace function public.approve_inbox_candidate(
  p_candidate_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_merchant text,
  p_note text,
  p_occurred_on date,
  p_account_id uuid,
  p_category_id uuid,
  p_destination_account_id uuid,
  p_possible_duplicate boolean default false
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.inbox_candidate_status;
  v_existing_transaction_id uuid;
  v_transaction_id uuid;
  v_account_name text;
  v_category_name text;
  v_affected integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select status, financial_transaction_id
  into v_status, v_existing_transaction_id
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_status = 'approved'::public.inbox_candidate_status
     and v_existing_transaction_id is not null then
    return v_existing_transaction_id;
  end if;

  if v_status <> 'pending'::public.inbox_candidate_status then
    raise exception 'candidate_already_reviewed';
  end if;

  if p_merchant is null or char_length(trim(p_merchant)) = 0 then
    raise exception 'merchant_required';
  end if;
  if char_length(trim(p_merchant)) > 200 then
    raise exception 'merchant_too_long';
  end if;

  if p_kind = 'transfer'::public.transaction_kind then
    if p_category_id is not null then
      raise exception 'transfer_category_not_allowed';
    end if;

    v_transaction_id := public.create_account_transfer(
      p_account_id,
      p_destination_account_id,
      p_amount_minor,
      p_occurred_on,
      p_note,
      gen_random_uuid()
    );
  else
    if p_destination_account_id is not null then
      raise exception 'unexpected_destination_account';
    end if;

    v_transaction_id := public.create_money_transaction(
      p_account_id,
      p_category_id,
      p_kind,
      p_amount_minor,
      p_occurred_on,
      p_note,
      gen_random_uuid()
    );
  end if;

  select name
  into v_account_name
  from public.accounts
  where id = p_account_id
    and user_id = v_user_id;

  if p_kind <> 'transfer'::public.transaction_kind then
    select name
    into v_category_name
    from public.categories
    where id = p_category_id
      and user_id = v_user_id;
  end if;

  update public.inbox_candidates
  set
    kind = p_kind,
    amount_minor = p_amount_minor,
    merchant = trim(p_merchant),
    note = coalesce(p_note, ''),
    occurred_on = p_occurred_on,
    status = 'approved'::public.inbox_candidate_status,
    possible_duplicate = coalesce(p_possible_duplicate, false),
    account_id = p_account_id,
    account_name = v_account_name,
    category_id = case
      when p_kind = 'transfer'::public.transaction_kind then null
      else p_category_id
    end,
    category_name = case
      when p_kind = 'transfer'::public.transaction_kind then null
      else v_category_name
    end,
    financial_transaction_id = v_transaction_id
  where id = p_candidate_id
    and user_id = v_user_id
    and status = 'pending'::public.inbox_candidate_status;

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'candidate_approval_conflict';
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, bigint, text, text, date, uuid, uuid, uuid,
  boolean
) from public, anon;

grant execute on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, bigint, text, text, date, uuid, uuid, uuid,
  boolean
) to authenticated;
