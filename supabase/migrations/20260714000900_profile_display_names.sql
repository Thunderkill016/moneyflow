update public.profiles as profile
set full_name = left(trim(coalesce(
  nullif(trim(profile.full_name), ''),
  nullif(user_record.raw_user_meta_data ->> 'full_name', ''),
  nullif(user_record.raw_user_meta_data ->> 'name', ''),
  ''
)), 80)
from auth.users as user_record
where profile.id = user_record.id
  and trim(profile.full_name) = '';

update public.profiles
set full_name = left(trim(full_name), 80)
where full_name <> left(trim(full_name), 80);

alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 80);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    ), 80)
  );

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
