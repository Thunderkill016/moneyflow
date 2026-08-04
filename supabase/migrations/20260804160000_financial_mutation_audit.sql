-- Privacy-safe append-only financial mutation audit.
--
-- This migration records only structural metadata. It deliberately stores no
-- note, merchant, category/account label, raw import text, request body, amount
-- or arbitrary JSON. Audit triggers run in the same transaction as the ledger
-- mutation, so an audit failure aborts the mutation rather than creating drift.

create type public.financial_audit_actor_kind as enum (
  'user',
  'system'
);

create type public.financial_audit_entity_type as enum (
  'financial_transaction',
  'transaction_entry',
  'account_reconciliation'
);

create type public.financial_audit_action as enum (
  'transaction_created',
  'transaction_updated',
  'transaction_soft_deleted',
  'transaction_restored',
  'transaction_review_changed',
  'entry_created',
  'entry_financial_changed',
  'entry_category_changed',
  'entry_reconciliation_changed',
  'reconciliation_started',
  'reconciliation_completed',
  'reconciliation_reopened'
);

create table public.financial_mutation_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid,
  actor_kind public.financial_audit_actor_kind not null,
  action public.financial_audit_action not null,
  entity_type public.financial_audit_entity_type not null,
  entity_id uuid not null,
  related_transaction_id uuid,
  occurred_at timestamptz not null default now(),
  request_id text
    check (request_id is null or char_length(request_id) between 1 and 128),
  idempotency_key uuid,
  constraint financial_mutation_audit_actor_shape_check check (
    (
      actor_kind = 'user'
      and actor_user_id is not null
      and actor_user_id = user_id
    )
    or (
      actor_kind = 'system'
      and actor_user_id is null
    )
  )
);

create index financial_mutation_audit_user_time_idx
  on public.financial_mutation_audit_events (
    user_id,
    occurred_at desc,
    id desc
  );

create index financial_mutation_audit_entity_idx
  on public.financial_mutation_audit_events (
    user_id,
    entity_type,
    entity_id,
    occurred_at desc
  );

alter table public.financial_mutation_audit_events enable row level security;

create policy financial_mutation_audit_select_own
on public.financial_mutation_audit_events
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.financial_mutation_audit_events
from public, anon, authenticated;
grant select on public.financial_mutation_audit_events to authenticated;

create or replace function public.current_financial_audit_request_id()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_headers_text text;
  v_headers jsonb;
  v_request_id text;
begin
  v_headers_text := current_setting('request.headers', true);
  if nullif(trim(coalesce(v_headers_text, '')), '') is null then
    return null;
  end if;

  begin
    v_headers := v_headers_text::jsonb;
  exception
    when others then
      return null;
  end;

  v_request_id := nullif(trim(v_headers ->> 'x-request-id'), '');
  if v_request_id is null then
    return null;
  end if;

  return left(v_request_id, 128);
end;
$$;

create or replace function public.write_financial_mutation_audit(
  p_user_id uuid,
  p_action public.financial_audit_action,
  p_entity_type public.financial_audit_entity_type,
  p_entity_id uuid,
  p_related_transaction_id uuid default null,
  p_idempotency_key uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_kind public.financial_audit_actor_kind;
begin
  if p_user_id is null
     or p_action is null
     or p_entity_type is null
     or p_entity_id is null then
    raise exception 'invalid_financial_audit_event';
  end if;

  if v_actor_user_id is not null and v_actor_user_id <> p_user_id then
    raise exception 'financial_audit_actor_tenant_mismatch';
  end if;

  if v_actor_user_id is null then
    v_actor_kind := 'system';
  else
    v_actor_kind := 'user';
  end if;

  insert into public.financial_mutation_audit_events (
    user_id,
    actor_user_id,
    actor_kind,
    action,
    entity_type,
    entity_id,
    related_transaction_id,
    request_id,
    idempotency_key
  )
  values (
    p_user_id,
    v_actor_user_id,
    v_actor_kind,
    p_action,
    p_entity_type,
    p_entity_id,
    p_related_transaction_id,
    public.current_financial_audit_request_id(),
    p_idempotency_key
  );
end;
$$;

create or replace function public.audit_financial_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'transaction_created',
      'financial_transaction',
      new.id,
      new.id,
      new.idempotency_key
    );
    return new;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'transaction_soft_deleted',
      'financial_transaction',
      new.id,
      new.id,
      new.idempotency_key
    );
  elsif old.deleted_at is not null and new.deleted_at is null then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'transaction_restored',
      'financial_transaction',
      new.id,
      new.id,
      new.idempotency_key
    );
  end if;

  if old.review_status is distinct from new.review_status then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'transaction_review_changed',
      'financial_transaction',
      new.id,
      new.id,
      new.idempotency_key
    );
  end if;

  if row(old.kind, old.note, old.occurred_on)
     is distinct from row(new.kind, new.note, new.occurred_on) then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'transaction_updated',
      'financial_transaction',
      new.id,
      new.id,
      new.idempotency_key
    );
  end if;

  return new;
end;
$$;

create trigger financial_transactions_audit_mutation
after insert or update on public.financial_transactions
for each row execute function public.audit_financial_transaction_mutation();

create or replace function public.audit_transaction_entry_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idempotency_key uuid;
begin
  select transaction_record.idempotency_key
  into v_idempotency_key
  from public.financial_transactions as transaction_record
  where transaction_record.id = new.transaction_id
    and transaction_record.user_id = new.user_id;

  if not found then
    raise exception 'financial_audit_transaction_not_found';
  end if;

  if tg_op = 'INSERT' then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'entry_created',
      'transaction_entry',
      new.id,
      new.transaction_id,
      v_idempotency_key
    );
    return new;
  end if;

  if old.category_id is distinct from new.category_id then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'entry_category_changed',
      'transaction_entry',
      new.id,
      new.transaction_id,
      v_idempotency_key
    );
  end if;

  if row(old.amount_minor, old.account_id)
     is distinct from row(new.amount_minor, new.account_id) then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'entry_financial_changed',
      'transaction_entry',
      new.id,
      new.transaction_id,
      v_idempotency_key
    );
  end if;

  if row(old.reconciliation_state, old.cleared_at, old.reconciliation_id)
     is distinct from row(
       new.reconciliation_state,
       new.cleared_at,
       new.reconciliation_id
     ) then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'entry_reconciliation_changed',
      'transaction_entry',
      new.id,
      new.transaction_id,
      v_idempotency_key
    );
  end if;

  return new;
end;
$$;

create trigger transaction_entries_audit_mutation
after insert or update on public.transaction_entries
for each row execute function public.audit_transaction_entry_mutation();

create or replace function public.audit_account_reconciliation_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'reconciliation_started',
      'account_reconciliation',
      new.id
    );
    return new;
  end if;

  if old.status = 'open' and new.status = 'completed' then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'reconciliation_completed',
      'account_reconciliation',
      new.id
    );
  elsif old.status = 'completed' and new.status = 'open' then
    perform public.write_financial_mutation_audit(
      new.user_id,
      'reconciliation_reopened',
      'account_reconciliation',
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger account_reconciliations_audit_mutation
after insert or update on public.account_reconciliations
for each row execute function public.audit_account_reconciliation_mutation();

revoke all on function public.current_financial_audit_request_id()
from public, anon, authenticated, service_role;
revoke all on function public.write_financial_mutation_audit(
  uuid,
  public.financial_audit_action,
  public.financial_audit_entity_type,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;
revoke all on function public.audit_financial_transaction_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.audit_transaction_entry_mutation()
from public, anon, authenticated, service_role;
revoke all on function public.audit_account_reconciliation_mutation()
from public, anon, authenticated, service_role;

comment on table public.financial_mutation_audit_events is
  'Append-only privacy-safe structural metadata for financial mutations.';
comment on column public.financial_mutation_audit_events.request_id is
  'Bounded transport request identifier only; never a request body or finance text.';

-- Replace the original pre-auth tenant purge with the complete current schema.
-- Child and restrictive-reference tables are removed before their parents.
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

  delete from public.financial_mutation_audit_events where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.account_reconciliation_events where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.transaction_entries where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.transaction_import_provenance where user_id = p_user_id;
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

  delete from public.account_reconciliations where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.inbox_rules where user_id = p_user_id;
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
    + (select count(*) from public.transaction_import_provenance where user_id = p_user_id)
    + (select count(*) from public.account_reconciliations where user_id = p_user_id)
    + (select count(*) from public.account_reconciliation_events where user_id = p_user_id)
    + (select count(*) from public.inbox_rules where user_id = p_user_id)
    + (select count(*) from public.financial_mutation_audit_events where user_id = p_user_id)
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
  'Server-only atomic purge of every current MoneyFlow tenant row before Auth deletion.';
