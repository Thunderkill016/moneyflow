create extension if not exists pgcrypto with schema extensions;

create type public.account_kind as enum ('cash', 'bank', 'e_wallet', 'credit_card', 'savings');
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_kind as enum ('income', 'expense', 'transfer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  currency_code text not null default 'VND' check (currency_code ~ '^[A-Z]{3}$'),
  locale text not null default 'vi-VN',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind public.account_kind not null,
  currency_code text not null default 'VND' check (currency_code ~ '^[A-Z]{3}$'),
  initial_balance_minor bigint not null default 0,
  credit_limit_minor bigint check (credit_limit_minor is null or credit_limit_minor >= 0),
  icon text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind public.category_kind not null,
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name, kind)
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.transaction_kind not null,
  note text not null default '' check (char_length(note) <= 500),
  occurred_on date not null default current_date,
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  unique (user_id, idempotency_key)
);

create table public.transaction_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  user_id uuid not null,
  account_id uuid not null,
  category_id uuid,
  amount_minor bigint not null check (amount_minor <> 0),
  created_at timestamptz not null default now(),
  foreign key (transaction_id, user_id)
    references public.financial_transactions(id, user_id) on delete restrict,
  foreign key (account_id, user_id)
    references public.accounts(id, user_id) on delete restrict,
  foreign key (category_id, user_id)
    references public.categories(id, user_id) on delete restrict
);

create index accounts_user_active_idx on public.accounts(user_id, is_archived);
create index categories_user_kind_idx on public.categories(user_id, kind);
create index transactions_user_date_idx
  on public.financial_transactions(user_id, occurred_on desc, created_at desc)
  where deleted_at is null;
create index entries_transaction_idx on public.transaction_entries(transaction_id);
create index entries_account_idx on public.transaction_entries(user_id, account_id);
create index entries_category_idx on public.transaction_entries(user_id, category_id)
  where category_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.financial_transactions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.accounts (user_id, name, kind, currency_code)
  values (new.id, 'Tiền mặt', 'cash', 'VND');

  insert into public.categories (user_id, name, kind, icon, color, is_default)
  values
    (new.id, 'Ăn uống', 'expense', 'bowl', 'coral', true),
    (new.id, 'Di chuyển', 'expense', 'car', 'blue', true),
    (new.id, 'Mua sắm', 'expense', 'bag', 'violet', true),
    (new.id, 'Nhà ở', 'expense', 'home', 'amber', true),
    (new.id, 'Hóa đơn', 'expense', 'receipt', 'cyan', true),
    (new.id, 'Giải trí', 'expense', 'spark', 'pink', true),
    (new.id, 'Sức khỏe', 'expense', 'heart', 'red', true),
    (new.id, 'Giáo dục', 'expense', 'book', 'blue', true),
    (new.id, 'Lương', 'income', 'wallet', 'green', true),
    (new.id, 'Thưởng', 'income', 'spark', 'green', true),
    (new.id, 'Thu nhập khác', 'income', 'plus', 'green', true);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.transaction_entries enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "accounts_select_own" on public.accounts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "accounts_insert_own" on public.accounts
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "accounts_update_own" on public.accounts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "accounts_delete_own" on public.accounts
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "categories_select_own" on public.categories
for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "categories_delete_custom_own" on public.categories
for delete to authenticated
using ((select auth.uid()) = user_id and not is_default);

create policy "transactions_select_own" on public.financial_transactions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "entries_select_own" on public.transaction_entries
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.accounts, public.categories,
  public.financial_transactions, public.transaction_entries from anon;
revoke all on public.financial_transactions, public.transaction_entries from authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts, public.categories to authenticated;
grant select on public.financial_transactions, public.transaction_entries to authenticated;

create or replace function public.create_money_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction_id uuid;
  v_category_kind public.category_kind;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'unsupported_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount_must_be_positive'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select id into v_transaction_id
  from public.financial_transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then return v_transaction_id; end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind into v_category_kind
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null or v_category_kind::text <> p_kind::text then
    raise exception 'category_kind_mismatch';
  end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), p_occurred_on, p_idempotency_key)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_account_id, p_category_id,
      case when p_kind = 'income' then p_amount_minor else -p_amount_minor end);

  return v_transaction_id;
end;
$$;

create or replace function public.soft_delete_money_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.financial_transactions
  set deleted_at = now()
  where id = p_transaction_id and user_id = auth.uid() and deleted_at is null;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.create_money_transaction(uuid, uuid, public.transaction_kind, bigint, date, text, uuid) from public, anon;
grant execute on function public.create_money_transaction(uuid, uuid, public.transaction_kind, bigint, date, text, uuid) to authenticated;
revoke all on function public.soft_delete_money_transaction(uuid) from public, anon;
grant execute on function public.soft_delete_money_transaction(uuid) to authenticated;

create view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency_code,
  a.initial_balance_minor + coalesce(sum(
    case when t.deleted_at is null then e.amount_minor else 0 end
  ), 0)::bigint as balance_minor
from public.accounts a
left join public.transaction_entries e on e.account_id = a.id and e.user_id = a.user_id
left join public.financial_transactions t on t.id = e.transaction_id and t.user_id = e.user_id
group by a.id, a.user_id, a.currency_code, a.initial_balance_minor;

revoke all on public.account_balances from anon;
grant select on public.account_balances to authenticated;
