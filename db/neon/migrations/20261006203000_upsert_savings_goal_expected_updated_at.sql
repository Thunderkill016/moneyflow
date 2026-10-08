-- upsert_savings_goal: optional optimistic-concurrency precondition.
--
-- Mirrors migrations 20260923160000_update_money_transaction_expected_updated_at.sql
-- and 20261006160000_update_account_transfer_expected_updated_at.sql for the
-- savings-goal sibling: adds `p_expected_updated_at` — on the update branch
-- (p_goal_id supplied), when the caller's version does not match the row's
-- `updated_at`, raises `stale_write` instead of overwriting. `null` keeps the
-- previous last-write-wins behavior; the insert branch has nothing to be stale
-- against.
--
-- The old 4-argument signature is dropped; named-argument RPC calls with the
-- original four parameters resolve to the new signature via the default.

drop function if exists public.upsert_savings_goal(uuid, text, bigint, date);

create function public.upsert_savings_goal(
  p_goal_id uuid,
  p_name text,
  p_target_minor bigint,
  p_deadline date,
  p_expected_updated_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_existing_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_goal_name'; end if;
  if p_target_minor is null or p_target_minor <= 0 or p_target_minor > 9007199254740991 then raise exception 'invalid_goal_target'; end if;
  if p_goal_id is null then
    insert into public.savings_goals (user_id, name, target_minor, deadline)
    values (v_user_id, trim(p_name), p_target_minor, p_deadline) returning id into v_id;
  else
    -- Optimistic concurrency: fail closed under the row lock before any write
    -- when the caller's version is stale. `is distinct from` also rejects a
    -- non-null expectation when the column were somehow null.
    select updated_at into v_existing_updated_at
    from public.savings_goals
    where id = p_goal_id and user_id = v_user_id
    for update;
    if v_existing_updated_at is null then raise exception 'goal_not_found_or_target_below_allocated'; end if;
    if p_expected_updated_at is not null
       and v_existing_updated_at is distinct from p_expected_updated_at then
      raise exception 'stale_write';
    end if;

    update public.savings_goals set name = trim(p_name), target_minor = p_target_minor, deadline = p_deadline
    where id = p_goal_id and user_id = v_user_id and p_target_minor >= allocated_minor returning id into v_id;
    if v_id is null then raise exception 'goal_not_found_or_target_below_allocated'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.upsert_savings_goal(uuid, text, bigint, date, timestamptz) from public, anon;
grant execute on function public.upsert_savings_goal(uuid, text, bigint, date, timestamptz) to authenticated;
