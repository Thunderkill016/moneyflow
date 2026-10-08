-- TASK-129: allow creating multi-currency (FX) accounts; transfer still same-currency only.

drop function if exists public.create_financial_account(text, public.account_kind, bigint);

create or replace function public.create_financial_account(
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint default 0,
  p_currency_code text default 'VND'
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

  insert into public.accounts (user_id, name, kind, initial_balance_minor, currency_code)
  values (v_user_id, trim(p_name), p_kind, p_initial_balance_minor, v_currency)
  returning id into v_account_id;
  return v_account_id;
end;
$$;

revoke all on function public.create_financial_account(text, public.account_kind, bigint, text) from public, anon;
grant execute on function public.create_financial_account(text, public.account_kind, bigint, text) to authenticated;
