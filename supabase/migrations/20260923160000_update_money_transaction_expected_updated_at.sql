-- update_money_transaction: optional optimistic-concurrency precondition.
--
-- Current truth (docs/operations/multi-device-write-semantics.md): update RPCs
-- lock the row but accept no version precondition, so a stale device silently
-- overwrites a newer edit. This adds `p_expected_updated_at` — when supplied,
-- a mismatched `updated_at` raises `stale_write` instead of overwriting.
-- `null` keeps the previous last-write-wins behavior for callers that do not
-- pass a precondition (bulk tools, older clients).
--
-- The old 9-argument signature is dropped; named-argument RPC calls with the
-- original nine parameters resolve to the new signature via the default.

drop function if exists public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text
);

create function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default '',
  p_payee text default '',
  p_expected_updated_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
  v_existing_updated_at timestamptz;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;

  select kind, updated_at into v_existing_kind, v_existing_updated_at
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind = 'transfer' then raise exception 'transaction_kind_locked'; end if;

  -- Optimistic concurrency: fail closed before any validation or write when
  -- the caller's version is stale. The row is already locked, so the check is
  -- race-free; `is distinct from` also rejects a non-null expectation when
  -- the column were somehow null.
  if p_expected_updated_at is not null
     and v_existing_updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_write';
  end if;

  if exists (
    select 1 from public.commitment_occurrences
    where user_id = v_user_id and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  if exists (
    select 1 from public.income_template_occurrences
    where user_id = v_user_id and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and not is_archived
  ) then
    raise exception 'account_not_found';
  end if;

  select kind, is_archived
  into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;

  if v_category_kind is null or v_category_kind::text <> p_kind::text then
    raise exception 'category_kind_mismatch';
  end if;
  if v_category_archived then
    raise exception 'category_archived';
  end if;

  update public.financial_transactions
  set kind = p_kind,
      note = coalesce(p_note, ''),
      payee = btrim(coalesce(p_payee, '')),
      occurred_on = p_occurred_on
  where id = p_transaction_id and user_id = v_user_id;

  update public.transaction_entries
  set account_id = p_account_id,
      category_id = p_category_id,
      amount_minor = case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
  where transaction_id = p_transaction_id and user_id = v_user_id;

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transaction_entries'; end if;
  return p_transaction_id;
end;
$$;

revoke all on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text, timestamptz
) from public, anon;
grant execute on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- transaction_feed: expose updated_at so the client carries the version it
-- read and can hand it back as the write precondition.
-- ---------------------------------------------------------------------------

create or replace view public.transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  case
    when transaction_record.kind = 'transfer' then
      max(
        case
          when entry.amount_minor < 0 then -entry.amount_minor
          else abs(entry.amount_minor)
        end
      )
    else
      sum(abs(entry.amount_minor))
  end::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  case
    when transaction_record.kind = 'expense'
      and count(distinct category.id) filter (where category.id is not null) > 1
    then
      'Chia · ' || (count(distinct category.id) filter (where category.id is not null))::text || ' danh mục'
    else
      (array_agg(category.name) filter (where category.name is not null))[1]
  end as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment,
  case
    when transaction_record.kind = 'expense'
      and count(category.id) filter (where category.id is not null) > 1
    then
      jsonb_agg(
        jsonb_build_object(
          'category_id', category.id,
          'category_name', category.name,
          'amount_minor', abs(entry.amount_minor)
        )
        order by abs(entry.amount_minor) desc
      ) filter (where category.id is not null)
    else null
  end as split_lines,
  transaction_record.payee,
  transaction_record.updated_at
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id
  and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id
  and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.updated_at, transaction_record.payee;
