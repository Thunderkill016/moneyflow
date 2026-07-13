insert into public.profiles (id, full_name)
select
  user_record.id,
  coalesce(user_record.raw_user_meta_data ->> 'full_name', '')
from auth.users as user_record
on conflict (id) do nothing;

insert into public.accounts (user_id, name, kind, currency_code)
select user_record.id, 'Tiền mặt', 'cash', 'VND'
from auth.users as user_record
where not exists (
  select 1 from public.accounts as existing_account
  where existing_account.user_id = user_record.id
);

insert into public.categories (user_id, name, kind, icon, color, is_default)
select user_record.id, default_category.name, default_category.kind::public.category_kind,
  default_category.icon, default_category.color, true
from auth.users as user_record
cross join (values
  ('Ăn uống', 'expense', 'bowl', 'coral'),
  ('Di chuyển', 'expense', 'car', 'blue'),
  ('Mua sắm', 'expense', 'bag', 'violet'),
  ('Nhà ở', 'expense', 'home', 'amber'),
  ('Hóa đơn', 'expense', 'receipt', 'cyan'),
  ('Giải trí', 'expense', 'spark', 'pink'),
  ('Sức khỏe', 'expense', 'heart', 'red'),
  ('Giáo dục', 'expense', 'book', 'blue'),
  ('Lương', 'income', 'wallet', 'green'),
  ('Thưởng', 'income', 'spark', 'green'),
  ('Thu nhập khác', 'income', 'plus', 'green')
) as default_category(name, kind, icon, color)
on conflict (user_id, name, kind) do nothing;

create view public.transaction_feed
with (security_invoker = true)
as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  entry.amount_minor,
  account.id as account_id,
  account.name as account_name,
  category.id as category_id,
  category.name as category_name
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id
  and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id
  and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id
  and category.user_id = entry.user_id
where transaction_record.deleted_at is null;

revoke all on public.transaction_feed from anon;
grant select on public.transaction_feed to authenticated;
