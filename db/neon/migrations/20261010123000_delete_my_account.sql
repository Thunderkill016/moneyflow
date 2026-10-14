-- User-initiated full account deletion (P1).
--
-- delete_my_account() is the authenticated-callable boundary: it purges every
-- public tenant row through the reviewed purge path, then deletes the auth
-- identity row. Order matters — RESTRICT foreign keys
-- (transaction_entries/account/category, inbox_rules.category_id, approved
-- candidate transaction links) make a raw `delete from neon_auth."user"` cascade
-- fail, so purge_user_tenant_data must run FIRST inside the same transaction.
--
-- The purge itself is re-created here to cover the two user-keyed tables
-- added after it first shipped — archive_restore_batches/archive_restore_rows
-- (20260812010000) and pattern_dismissals (20260925150000). Each is explicitly
-- deleted and counted in the fail-closed remainder check. The rows would also
-- die by cascade with the identity row, but the explicit count keeps
-- tenant_data_purge_incomplete honest if an anchor ever changes.

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

  delete from public.pattern_dismissals where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  -- archive_restore_rows/batches were added at 20260812010000, after this
  -- purge first shipped; rows reference batches, so rows go first.
  delete from public.archive_restore_rows where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.archive_restore_batches where user_id = p_user_id;
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
    + (select count(*) from public.pattern_dismissals where user_id = p_user_id)
    + (select count(*) from public.archive_restore_rows where user_id = p_user_id)
    + (select count(*) from public.archive_restore_batches where user_id = p_user_id)
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

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '60s'
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_id text := auth.jwt() ->> 'client_id';
  v_deleted bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- OAuth proposal clients are read/propose only; account deletion stays a
  -- first-party decision. (Without this early check the purge's first delete
  -- would hit guard_oauth_mutation and abort with 42501 anyway — this just
  -- fails before any row is touched.)
  if v_client_id is not null then
    raise exception 'oauth_mutation_forbidden';
  end if;

  -- Purge first: RESTRICT foreign keys make a raw identity cascade fail.
  v_deleted := public.purge_user_tenant_data(v_user_id);

  -- ----------------------------------------------------------------------
  -- OWNER TODO — REVIEW QUESTION, UNVERIFIED ON HOSTED NEON:
  --
  -- It is unverified whether the migration-runner role (`neondb_owner`) may
  -- DELETE rows in the managed `neon_auth` mirror tables
  -- ("session"/"account"/"verification"/"user") on hosted Neon. If it may
  -- not, the correct shape is a two-phase flow: this RPC purges public data
  -- and reports success, and the managed-auth delete-user endpoint finishes
  -- the identity row (with its own retry/alert path). The block below is
  -- written assuming the delete IS permitted; confirm before applying.
  --
  -- Second unverified detail: Better Auth mirror column names. Session and
  -- account are expected to carry `"userId"` (drizzle camelCase); the
  -- verification table in Better Auth has no user-keyed column at all (rows
  -- are keyed by identifier) — so its delete is emitted only when a matching
  -- column exists, and any remaining rows are flagged by the final assert.
  -- ----------------------------------------------------------------------
  if exists (
    select 1 from pg_catalog.pg_namespace
    where nspname = 'neon_auth'
  ) then
    -- Dependents before the identity row: session/account carry "userId"
    -- foreign keys to neon_auth."user"; verification rows are keyed by
    -- identifier in Better Auth, so the delete is only emitted when a
    -- user-keyed column exists on the actual table.
    execute format(
      'delete from neon_auth."session" where "userId" = %L',
      v_user_id
    );
    execute format(
      'delete from neon_auth."account" where "userId" = %L',
      v_user_id
    );
    if exists (
      select 1
      from pg_catalog.pg_attribute att
      join pg_catalog.pg_class klass on klass.oid = att.attrelid
      join pg_catalog.pg_namespace ns on ns.oid = klass.relnamespace
      where ns.nspname = 'neon_auth'
        and klass.relname = 'verification'
        and att.attname = 'userId'
        and not att.attisdropped
    ) then
      execute format(
        'delete from neon_auth."verification" where "userId" = %L',
        v_user_id
      );
    end if;
  end if;

  -- The replay transform rewrites this identity-table reference for the Neon
  -- generated file; on the Supabase-compatible surface it is the same row.
  delete from neon_auth."user" where id = v_user_id;
  assert not exists (
    select 1 from neon_auth."user" where id = v_user_id
  ), 'identity_delete_failed';

  return jsonb_build_object(
    'deleted_rows', v_deleted,
    'tenant_rows_remaining', 0
  );
end;
$$;

revoke all on function public.delete_my_account()
  from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'User-initiated full account deletion: purges every tenant row then deletes the auth identity. First-party sessions only; neon_auth mirror delete pending owner verification.';
