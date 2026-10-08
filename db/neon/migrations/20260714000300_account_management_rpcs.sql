revoke insert, update, delete on public.accounts from authenticated;

create or replace function public.create_financial_account(
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid_account_name';
  end if;
  if p_initial_balance_minor is null or abs(p_initial_balance_minor) > 9007199254740991 then
    raise exception 'invalid_initial_balance';
  end if;
  if (select count(*) from public.accounts where user_id = v_user_id) >= 30 then
    raise exception 'account_limit_reached';
  end if;

  insert into public.accounts (user_id, name, kind, initial_balance_minor, currency_code)
  values (v_user_id, trim(p_name), p_kind, p_initial_balance_minor, 'VND')
  returning id into v_account_id;
  return v_account_id;
end;
$$;

create or replace function public.update_financial_account(
  p_account_id uuid,
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint
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

  update public.accounts
  set name = trim(p_name), kind = p_kind, initial_balance_minor = p_initial_balance_minor
  where id = p_account_id and user_id = v_user_id;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

create or replace function public.set_financial_account_archived(
  p_account_id uuid,
  p_archived boolean
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
  if p_archived is null then raise exception 'archive_state_required'; end if;
  if p_archived and (
    select count(*) from public.accounts
    where user_id = v_user_id and not is_archived
  ) <= 1 then
    raise exception 'last_active_account';
  end if;

  update public.accounts
  set is_archived = p_archived
  where id = p_account_id and user_id = v_user_id and is_archived <> p_archived;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.create_financial_account(text, public.account_kind, bigint) from public, anon;
grant execute on function public.create_financial_account(text, public.account_kind, bigint) to authenticated;
revoke all on function public.update_financial_account(uuid, text, public.account_kind, bigint) from public, anon;
grant execute on function public.update_financial_account(uuid, text, public.account_kind, bigint) to authenticated;
revoke all on function public.set_financial_account_archived(uuid, boolean) from public, anon;
grant execute on function public.set_financial_account_archived(uuid, boolean) to authenticated;
