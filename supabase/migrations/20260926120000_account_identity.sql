-- Account identity: persist the already-schema'd icon/color columns through
-- the management RPCs. The allowlists mirror the app-side enums
-- (PICKABLE_ACCOUNT_ICONS / ACCOUNT_COLORS in src/lib/accounts.ts) — the RPC
-- stays the write boundary since direct row mutation is revoked.

drop function if exists public.update_financial_account(uuid, text, public.account_kind, bigint);

create or replace function public.update_financial_account(
  p_account_id uuid,
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint,
  p_icon text default null,
  p_color text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid_account_name';
  end if;
  if p_initial_balance_minor is null or abs(p_initial_balance_minor) > 9007199254740991 then
    raise exception 'invalid_initial_balance';
  end if;
  if p_icon is not null and p_icon not in (
    'wallet', 'bank', 'card', 'piggy', 'coins', 'briefcase', 'receipt', 'spark'
  ) then
    raise exception 'invalid_account_icon';
  end if;
  if p_color is not null and p_color not in (
    'amber', 'blue', 'coral', 'cyan', 'green', 'pink', 'red', 'violet'
  ) then
    raise exception 'invalid_account_color';
  end if;

  update public.accounts
  set name = trim(p_name),
      kind = p_kind,
      initial_balance_minor = p_initial_balance_minor,
      icon = p_icon,
      color = p_color
  where id = p_account_id and user_id = v_user_id;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

drop function if exists public.create_financial_account(text, public.account_kind, bigint, text);

create or replace function public.create_financial_account(
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint default 0,
  p_currency_code text default 'VND',
  p_icon text default null,
  p_color text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_currency text := upper(trim(coalesce(p_currency_code, 'VND')));
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid_account_name';
  end if;
  if p_initial_balance_minor is null or abs(p_initial_balance_minor) > 9007199254740991 then
    raise exception 'invalid_initial_balance';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency_code';
  end if;
  -- Supported set mirrors app SUPPORTED_CURRENCY_CODES (no arbitrary FX rate engine).
  if v_currency not in ('VND', 'USD', 'EUR', 'JPY', 'SGD', 'THB', 'GBP', 'AUD', 'KRW') then
    raise exception 'invalid_currency_code';
  end if;
  if (select count(*) from public.accounts where user_id = v_user_id) >= 30 then
    raise exception 'account_limit_reached';
  end if;
  if p_icon is not null and p_icon not in (
    'wallet', 'bank', 'card', 'piggy', 'coins', 'briefcase', 'receipt', 'spark'
  ) then
    raise exception 'invalid_account_icon';
  end if;
  if p_color is not null and p_color not in (
    'amber', 'blue', 'coral', 'cyan', 'green', 'pink', 'red', 'violet'
  ) then
    raise exception 'invalid_account_color';
  end if;

  insert into public.accounts (user_id, name, kind, initial_balance_minor, currency_code, icon, color)
  values (v_user_id, trim(p_name), p_kind, p_initial_balance_minor, v_currency, p_icon, p_color)
  returning id into v_account_id;
  return v_account_id;
end;
$$;

revoke all on function public.update_financial_account(uuid, text, public.account_kind, bigint, text, text) from public, anon;
grant execute on function public.update_financial_account(uuid, text, public.account_kind, bigint, text, text) to authenticated;
revoke all on function public.create_financial_account(text, public.account_kind, bigint, text, text, text) from public, anon;
grant execute on function public.create_financial_account(text, public.account_kind, bigint, text, text, text) to authenticated;
