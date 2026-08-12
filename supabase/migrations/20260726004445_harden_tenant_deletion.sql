-- Delete every MoneyFlow tenant row in one database transaction before the
-- corresponding Supabase Auth identity is removed by the Edge Function.
--
-- This privileged function is restricted to the server-only service_role and
-- must bypass tenant RLS. Keep the search path empty, qualify every relation,
-- and revoke the default PUBLIC execute grant immediately.

create or replace function public.purge_user_tenant_data(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '30s'
as $$
declare
  v_deleted bigint := 0;
  v_affected bigint := 0;
  v_remaining bigint := 0;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  delete from public.transaction_entries where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.commitment_occurrences where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.income_template_occurrences where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.savings_goal_allocations where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.inbox_candidates where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.financial_transactions where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.monthly_budgets where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.recurring_commitments where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.recurring_income_templates where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.savings_goals where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.import_batches where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.accounts where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.categories where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.profiles where id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  select
    (select count(*) from public.profiles where id = p_user_id)
    + (select count(*) from public.accounts where user_id = p_user_id)
    + (select count(*) from public.categories where user_id = p_user_id)
    + (select count(*) from public.financial_transactions where user_id = p_user_id)
    + (select count(*) from public.transaction_entries where user_id = p_user_id)
    + (select count(*) from public.monthly_budgets where user_id = p_user_id)
    + (select count(*) from public.recurring_commitments where user_id = p_user_id)
    + (select count(*) from public.commitment_occurrences where user_id = p_user_id)
    + (select count(*) from public.recurring_income_templates where user_id = p_user_id)
    + (select count(*) from public.income_template_occurrences where user_id = p_user_id)
    + (select count(*) from public.savings_goals where user_id = p_user_id)
    + (select count(*) from public.savings_goal_allocations where user_id = p_user_id)
    + (select count(*) from public.import_batches where user_id = p_user_id)
    + (select count(*) from public.inbox_candidates where user_id = p_user_id)
  into v_remaining;

  if v_remaining <> 0 then
    raise exception 'tenant_data_purge_incomplete';
  end if;

  return v_deleted;
end;
$$;

revoke all on function public.purge_user_tenant_data(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.purge_user_tenant_data(uuid) to service_role;

comment on function public.purge_user_tenant_data(uuid) is
  'Server-only atomic purge of MoneyFlow tenant rows before deleting an Auth identity.';
