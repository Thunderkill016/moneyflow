-- Recurring income templates (lương định kỳ) — separate from bill commitments.
-- Income category only; record posts real income ledger rows.
-- Does NOT reserve safe-to-spend (commitments remain the only reserve source).

create table public.recurring_income_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  due_day smallint not null check (due_day between 1 and 31),
  account_id uuid not null,
  category_id uuid not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete restrict,
  unique (id, user_id)
);

create table public.income_template_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null,
  month_start date not null,
  transaction_id uuid not null,
  received_at timestamptz not null default now(),
  foreign key (template_id, user_id) references public.recurring_income_templates(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id) references public.financial_transactions(id, user_id) on delete restrict,
  check (month_start = date_trunc('month', month_start)::date),
  unique (user_id, template_id, month_start),
  unique (user_id, transaction_id)
);

create index recurring_income_templates_user_active_idx
  on public.recurring_income_templates(user_id, is_archived, due_day);
create index income_template_occurrences_user_month_idx
  on public.income_template_occurrences(user_id, month_start);

create trigger recurring_income_templates_set_updated_at
  before update on public.recurring_income_templates
  for each row execute function public.set_updated_at();

alter table public.recurring_income_templates enable row level security;
alter table public.income_template_occurrences enable row level security;
create policy "recurring_income_templates_select_own" on public.recurring_income_templates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "income_template_occurrences_select_own" on public.income_template_occurrences
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.recurring_income_templates, public.income_template_occurrences from anon, authenticated;
grant select on public.recurring_income_templates, public.income_template_occurrences to authenticated;

create or replace function public.upsert_recurring_income_template(
  p_template_id uuid,
  p_name text,
  p_amount_minor bigint,
  p_due_day integer,
  p_account_id uuid,
  p_category_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_category_kind public.category_kind;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_income_template_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_income_template_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind into v_category_kind from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;

  if p_template_id is null then
    insert into public.recurring_income_templates (user_id, name, amount_minor, due_day, account_id, category_id)
    values (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id)
    returning id into v_id;
  else
    update public.recurring_income_templates set name = trim(p_name), amount_minor = p_amount_minor,
      due_day = p_due_day, account_id = p_account_id, category_id = p_category_id
    where id = p_template_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'income_template_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_recurring_income_template_archived(p_template_id uuid, p_archived boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.recurring_income_templates set is_archived = p_archived
  where id = p_template_id and user_id = auth.uid() and is_archived <> p_archived;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

create or replace function public.record_recurring_income_template(
  p_template_id uuid,
  p_month_start date,
  p_received_on date,
  p_idempotency_key uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.recurring_income_templates%rowtype;
  v_transaction_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_income_template_month'; end if;
  if p_received_on is null then raise exception 'invalid_received_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_template_id::text || p_month_start::text || ':income', 0));

  select transaction_id into v_transaction_id from public.income_template_occurrences
  where user_id = v_user_id and template_id = p_template_id and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_template from public.recurring_income_templates
  where id = p_template_id and user_id = v_user_id and not is_archived;
  if v_template.id is null then raise exception 'income_template_not_found'; end if;
  if not exists (select 1 from public.accounts where id = v_template.account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;

  insert into public.financial_transactions (user_id, kind, note, occurred_on, idempotency_key)
  values (v_user_id, 'income', v_template.name, p_received_on, p_idempotency_key)
  returning id into v_transaction_id;
  insert into public.transaction_entries (transaction_id, user_id, account_id, category_id, amount_minor)
  values (v_transaction_id, v_user_id, v_template.account_id, v_template.category_id, v_template.amount_minor);
  insert into public.income_template_occurrences (user_id, template_id, month_start, transaction_id)
  values (v_user_id, p_template_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

create or replace function public.undo_recurring_income_template_receipt(p_template_id uuid, p_month_start date)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_transaction_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.income_template_occurrences
  where user_id = auth.uid() and template_id = p_template_id and month_start = p_month_start
  returning transaction_id into v_transaction_id;
  if v_transaction_id is null then return false; end if;
  update public.financial_transactions set deleted_at = now()
  where id = v_transaction_id and user_id = auth.uid() and deleted_at is null;
  return true;
end;
$$;

create view public.recurring_income_template_feed with (security_invoker = true) as
select template.id, template.user_id, template.name, template.amount_minor, template.due_day,
  template.account_id, account.name as account_name, template.category_id,
  category.name as category_name, category.icon as category_icon, category.color as category_color,
  template.is_archived, template.created_at
from public.recurring_income_templates template
join public.accounts account on account.id = template.account_id and account.user_id = template.user_id
join public.categories category on category.id = template.category_id and category.user_id = template.user_id;

revoke all on public.recurring_income_template_feed from anon;
grant select on public.recurring_income_template_feed to authenticated;

revoke all on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid) from public, anon;
grant execute on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid) to authenticated;
revoke all on function public.set_recurring_income_template_archived(uuid, boolean) from public, anon;
grant execute on function public.set_recurring_income_template_archived(uuid, boolean) to authenticated;
revoke all on function public.record_recurring_income_template(uuid, date, date, uuid) from public, anon;
grant execute on function public.record_recurring_income_template(uuid, date, date, uuid) to authenticated;
revoke all on function public.undo_recurring_income_template_receipt(uuid, date) from public, anon;
grant execute on function public.undo_recurring_income_template_receipt(uuid, date) to authenticated;

-- Lock edit/delete of income-template-generated rows (same as commitments).
create or replace function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default ''
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
  v_category_kind public.category_kind;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select kind into v_existing_kind from public.financial_transactions
  where id = p_transaction_id and user_id = v_user_id and deleted_at is null
  for update;
  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind = 'transfer' then raise exception 'transaction_kind_locked'; end if;
  if exists (select 1 from public.commitment_occurrences where user_id = v_user_id and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  if exists (select 1 from public.income_template_occurrences where user_id = v_user_id and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind into v_category_kind from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null or v_category_kind::text <> p_kind::text then raise exception 'category_kind_mismatch'; end if;

  update public.financial_transactions
  set kind = p_kind, note = coalesce(p_note, ''), occurred_on = p_occurred_on
  where id = p_transaction_id and user_id = v_user_id;
  update public.transaction_entries
  set account_id = p_account_id, category_id = p_category_id,
      amount_minor = case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
  where transaction_id = p_transaction_id and user_id = v_user_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transaction_entries'; end if;
  return p_transaction_id;
end;
$$;

create or replace function public.soft_delete_money_transaction(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.commitment_occurrences where user_id = auth.uid() and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  if exists (select 1 from public.income_template_occurrences where user_id = auth.uid() and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  update public.financial_transactions set deleted_at = now()
  where id = p_transaction_id and user_id = auth.uid() and deleted_at is null;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

create or replace view public.transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  max(case when transaction_record.kind = 'transfer' and entry.amount_minor < 0 then -entry.amount_minor else abs(entry.amount_minor) end)::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  (array_agg(category.name) filter (where category.name is not null))[1] as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment
from public.financial_transactions as transaction_record
join public.transaction_entries as entry on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at;
