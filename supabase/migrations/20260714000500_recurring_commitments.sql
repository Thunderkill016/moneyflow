create table public.recurring_commitments (
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

create table public.commitment_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null,
  month_start date not null,
  transaction_id uuid not null,
  paid_at timestamptz not null default now(),
  foreign key (commitment_id, user_id) references public.recurring_commitments(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id) references public.financial_transactions(id, user_id) on delete restrict,
  check (month_start = date_trunc('month', month_start)::date),
  unique (user_id, commitment_id, month_start),
  unique (user_id, transaction_id)
);

create index recurring_commitments_user_active_idx on public.recurring_commitments(user_id, is_archived, due_day);
create index commitment_occurrences_user_month_idx on public.commitment_occurrences(user_id, month_start);

create trigger recurring_commitments_set_updated_at before update on public.recurring_commitments
for each row execute function public.set_updated_at();

alter table public.recurring_commitments enable row level security;
alter table public.commitment_occurrences enable row level security;
create policy "recurring_commitments_select_own" on public.recurring_commitments
for select to authenticated using ((select auth.uid()) = user_id);
create policy "commitment_occurrences_select_own" on public.commitment_occurrences
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.recurring_commitments, public.commitment_occurrences from anon, authenticated;
grant select on public.recurring_commitments, public.commitment_occurrences to authenticated;

create or replace function public.upsert_recurring_commitment(
  p_commitment_id uuid,
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
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_commitment_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_commitment_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind into v_category_kind from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;

  if p_commitment_id is null then
    insert into public.recurring_commitments (user_id, name, amount_minor, due_day, account_id, category_id)
    values (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id)
    returning id into v_id;
  else
    update public.recurring_commitments set name = trim(p_name), amount_minor = p_amount_minor,
      due_day = p_due_day, account_id = p_account_id, category_id = p_category_id
    where id = p_commitment_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'commitment_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_recurring_commitment_archived(p_commitment_id uuid, p_archived boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.recurring_commitments set is_archived = p_archived
  where id = p_commitment_id and user_id = auth.uid() and is_archived <> p_archived;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

create or replace function public.pay_recurring_commitment(
  p_commitment_id uuid,
  p_month_start date,
  p_paid_on date,
  p_idempotency_key uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.recurring_commitments%rowtype;
  v_transaction_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_commitment_month'; end if;
  if p_paid_on is null then raise exception 'invalid_paid_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_commitment_id::text || p_month_start::text, 0));

  select transaction_id into v_transaction_id from public.commitment_occurrences
  where user_id = v_user_id and commitment_id = p_commitment_id and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_commitment from public.recurring_commitments
  where id = p_commitment_id and user_id = v_user_id and not is_archived;
  if v_commitment.id is null then raise exception 'commitment_not_found'; end if;
  if not exists (select 1 from public.accounts where id = v_commitment.account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;

  insert into public.financial_transactions (user_id, kind, note, occurred_on, idempotency_key)
  values (v_user_id, 'expense', v_commitment.name, p_paid_on, p_idempotency_key)
  returning id into v_transaction_id;
  insert into public.transaction_entries (transaction_id, user_id, account_id, category_id, amount_minor)
  values (v_transaction_id, v_user_id, v_commitment.account_id, v_commitment.category_id, -v_commitment.amount_minor);
  insert into public.commitment_occurrences (user_id, commitment_id, month_start, transaction_id)
  values (v_user_id, p_commitment_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

create or replace function public.undo_recurring_commitment_payment(p_commitment_id uuid, p_month_start date)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_transaction_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.commitment_occurrences
  where user_id = auth.uid() and commitment_id = p_commitment_id and month_start = p_month_start
  returning transaction_id into v_transaction_id;
  if v_transaction_id is null then return false; end if;
  update public.financial_transactions set deleted_at = now()
  where id = v_transaction_id and user_id = auth.uid() and deleted_at is null;
  return true;
end;
$$;

create view public.recurring_commitment_feed with (security_invoker = true) as
select commitment.id, commitment.user_id, commitment.name, commitment.amount_minor, commitment.due_day,
  commitment.account_id, account.name as account_name, commitment.category_id,
  category.name as category_name, category.icon as category_icon, category.color as category_color,
  commitment.is_archived, commitment.created_at
from public.recurring_commitments commitment
join public.accounts account on account.id = commitment.account_id and account.user_id = commitment.user_id
join public.categories category on category.id = commitment.category_id and category.user_id = commitment.user_id;

revoke all on public.recurring_commitment_feed from anon;
grant select on public.recurring_commitment_feed to authenticated;
revoke all on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid) from public, anon;
grant execute on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid) to authenticated;
revoke all on function public.set_recurring_commitment_archived(uuid, boolean) from public, anon;
grant execute on function public.set_recurring_commitment_archived(uuid, boolean) to authenticated;
revoke all on function public.pay_recurring_commitment(uuid, date, date, uuid) from public, anon;
grant execute on function public.pay_recurring_commitment(uuid, date, date, uuid) to authenticated;
revoke all on function public.undo_recurring_commitment_payment(uuid, date) from public, anon;
grant execute on function public.undo_recurring_commitment_payment(uuid, date) to authenticated;
