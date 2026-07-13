create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  month_start date not null,
  limit_minor bigint not null check (limit_minor > 0 and limit_minor <= 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id)
    references public.categories(id, user_id) on delete restrict,
  check (month_start = date_trunc('month', month_start)::date),
  unique (user_id, category_id, month_start)
);

create index monthly_budgets_user_month_idx
  on public.monthly_budgets(user_id, month_start);

create trigger monthly_budgets_set_updated_at before update on public.monthly_budgets
for each row execute function public.set_updated_at();

alter table public.monthly_budgets enable row level security;
create policy "monthly_budgets_select_own" on public.monthly_budgets
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.monthly_budgets from anon, authenticated;
grant select on public.monthly_budgets to authenticated;

create or replace function public.upsert_monthly_budget(
  p_category_id uuid,
  p_month_start date,
  p_limit_minor bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_kind public.category_kind;
  v_budget_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then
    raise exception 'invalid_budget_month';
  end if;
  if p_limit_minor is null or p_limit_minor <= 0 or p_limit_minor > 9007199254740991 then
    raise exception 'invalid_budget_limit';
  end if;

  select kind into v_category_kind
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;

  insert into public.monthly_budgets (user_id, category_id, month_start, limit_minor)
  values (v_user_id, p_category_id, p_month_start, p_limit_minor)
  on conflict (user_id, category_id, month_start)
  do update set limit_minor = excluded.limit_minor, updated_at = now()
  returning id into v_budget_id;
  return v_budget_id;
end;
$$;

create or replace function public.delete_monthly_budget(p_budget_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.monthly_budgets
  where id = p_budget_id and user_id = auth.uid();
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.upsert_monthly_budget(uuid, date, bigint) from public, anon;
grant execute on function public.upsert_monthly_budget(uuid, date, bigint) to authenticated;
revoke all on function public.delete_monthly_budget(uuid) from public, anon;
grant execute on function public.delete_monthly_budget(uuid) to authenticated;

create view public.budget_progress
with (security_invoker = true)
as
select
  budget.id,
  budget.user_id,
  budget.category_id,
  category.name as category_name,
  category.icon as category_icon,
  category.color as category_color,
  budget.month_start,
  budget.limit_minor,
  coalesce(sum(
    case
      when transaction_record.id is not null and entry.amount_minor < 0
        then -entry.amount_minor
      else 0
    end
  ), 0)::bigint as spent_minor
from public.monthly_budgets as budget
join public.categories as category
  on category.id = budget.category_id and category.user_id = budget.user_id
left join public.transaction_entries as entry
  on entry.category_id = budget.category_id and entry.user_id = budget.user_id
left join public.financial_transactions as transaction_record
  on transaction_record.id = entry.transaction_id
  and transaction_record.user_id = entry.user_id
  and transaction_record.kind = 'expense'
  and transaction_record.deleted_at is null
  and transaction_record.occurred_on >= budget.month_start
  and transaction_record.occurred_on < (budget.month_start + interval '1 month')
group by budget.id, budget.user_id, budget.category_id, category.name,
  category.icon, category.color, budget.month_start, budget.limit_minor;

revoke all on public.budget_progress from anon;
grant select on public.budget_progress to authenticated;
