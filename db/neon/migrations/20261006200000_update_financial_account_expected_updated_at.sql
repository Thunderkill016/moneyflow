-- update_financial_account: optional optimistic-concurrency precondition.
--
-- Mirrors migrations 20260923160000_update_money_transaction_expected_updated_at.sql
-- and 20261006160000_update_account_transfer_expected_updated_at.sql for the
-- account sibling: adds `p_expected_updated_at` — when supplied, a mismatched
-- `updated_at` raises `stale_write` instead of overwriting. `null` keeps the
-- previous last-write-wins behavior for callers that do not pass a
-- precondition (older clients).
--
-- The old 6-argument signature is dropped; named-argument RPC calls with the
-- original six parameters resolve to the new signature via the default.

drop function if exists public.update_financial_account(uuid, text, public.account_kind, bigint, text, text);

create function public.update_financial_account(
  p_account_id uuid,
  p_name text,
  p_kind public.account_kind,
  p_initial_balance_minor bigint,
  p_icon text default null,
  p_color text default null,
  p_expected_updated_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_affected integer;
  v_existing_id uuid;
  v_existing_updated_at timestamptz;
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

  select id, updated_at into v_existing_id, v_existing_updated_at
  from public.accounts
  where id = p_account_id and user_id = v_user_id
  for update;

  if v_existing_id is null then return false; end if;

  -- Optimistic concurrency: fail closed before any write when the caller's
  -- version is stale. The row is already locked, so the check is race-free;
  -- `is distinct from` also rejects a non-null expectation when the column
  -- were somehow null.
  if p_expected_updated_at is not null
     and v_existing_updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_write';
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

revoke all on function public.update_financial_account(uuid, text, public.account_kind, bigint, text, text, timestamptz) from public, anon;
grant execute on function public.update_financial_account(uuid, text, public.account_kind, bigint, text, text, timestamptz) to authenticated;
