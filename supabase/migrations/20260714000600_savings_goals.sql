create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_minor bigint not null check (target_minor > 0 and target_minor <= 9007199254740991),
  allocated_minor bigint not null default 0 check (allocated_minor >= 0 and allocated_minor <= target_minor),
  deadline date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.savings_goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  amount_minor bigint not null check (amount_minor <> 0 and amount_minor between -9007199254740991 and 9007199254740991),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals(id, user_id) on delete restrict
);

create index savings_goals_user_active_idx on public.savings_goals(user_id, is_archived, deadline);
create index savings_goal_allocations_goal_idx on public.savings_goal_allocations(user_id, goal_id, created_at desc);
create trigger savings_goals_set_updated_at before update on public.savings_goals
for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;
alter table public.savings_goal_allocations enable row level security;
create policy "savings_goals_select_own" on public.savings_goals
for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_goal_allocations_select_own" on public.savings_goal_allocations
for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.savings_goals, public.savings_goal_allocations from anon, authenticated;
grant select on public.savings_goals, public.savings_goal_allocations to authenticated;

create or replace function public.upsert_savings_goal(
  p_goal_id uuid,
  p_name text,
  p_target_minor bigint,
  p_deadline date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_goal_name'; end if;
  if p_target_minor is null or p_target_minor <= 0 or p_target_minor > 9007199254740991 then raise exception 'invalid_goal_target'; end if;
  if p_goal_id is null then
    insert into public.savings_goals (user_id, name, target_minor, deadline)
    values (v_user_id, trim(p_name), p_target_minor, p_deadline) returning id into v_id;
  else
    update public.savings_goals set name = trim(p_name), target_minor = p_target_minor, deadline = p_deadline
    where id = p_goal_id and user_id = v_user_id and p_target_minor >= allocated_minor returning id into v_id;
    if v_id is null then raise exception 'goal_not_found_or_target_below_allocated'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.adjust_savings_goal(p_goal_id uuid, p_amount_minor bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.savings_goals%rowtype;
  v_total_balance bigint;
  v_recurring_reserved bigint;
  v_total_allocated bigint;
  v_next bigint;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_amount_minor is null or p_amount_minor = 0 or p_amount_minor > 9007199254740991 or p_amount_minor < -9007199254740991 then raise exception 'invalid_allocation_amount'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':savings-goals', 0));
  select * into v_goal from public.savings_goals where id = p_goal_id and user_id = v_user_id and not is_archived for update;
  if v_goal.id is null then raise exception 'goal_not_found'; end if;
  v_next := v_goal.allocated_minor + p_amount_minor;
  if v_next < 0 then raise exception 'allocation_below_zero'; end if;
  if v_next > v_goal.target_minor then raise exception 'allocation_above_target'; end if;

  if p_amount_minor > 0 then
    select coalesce(sum(balance_minor), 0)::bigint into v_total_balance
    from public.account_balances where user_id = v_user_id;
    select coalesce(sum(commitment.amount_minor), 0)::bigint into v_recurring_reserved
    from public.recurring_commitments commitment
    left join public.commitment_occurrences occurrence
      on occurrence.user_id = commitment.user_id and occurrence.commitment_id = commitment.id
      and occurrence.month_start = date_trunc('month', pg_catalog.timezone('Asia/Ho_Chi_Minh', now()))::date
    where commitment.user_id = v_user_id and not commitment.is_archived and occurrence.id is null;
    select coalesce(sum(allocated_minor), 0)::bigint into v_total_allocated
    from public.savings_goals where user_id = v_user_id and not is_archived;
    if v_total_allocated + p_amount_minor > greatest(0, v_total_balance - v_recurring_reserved) then
      raise exception 'insufficient_unreserved_balance';
    end if;
  end if;

  update public.savings_goals set allocated_minor = v_next where id = v_goal.id;
  insert into public.savings_goal_allocations (user_id, goal_id, amount_minor)
  values (v_user_id, v_goal.id, p_amount_minor);
  return v_next;
end;
$$;

create or replace function public.set_savings_goal_archived(p_goal_id uuid, p_archived boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.savings_goals set is_archived = p_archived
  where id = p_goal_id and user_id = auth.uid() and is_archived <> p_archived
    and (not p_archived or allocated_minor = 0);
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.upsert_savings_goal(uuid, text, bigint, date) from public, anon;
grant execute on function public.upsert_savings_goal(uuid, text, bigint, date) to authenticated;
revoke all on function public.adjust_savings_goal(uuid, bigint) from public, anon;
grant execute on function public.adjust_savings_goal(uuid, bigint) to authenticated;
revoke all on function public.set_savings_goal_archived(uuid, boolean) from public, anon;
grant execute on function public.set_savings_goal_archived(uuid, boolean) to authenticated;
