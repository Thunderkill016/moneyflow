-- MoneyFlow Trust P2 Recover — R7 atomic restore foundation.
--
-- Restores a validated MoneyFlow archive v1 (produced by `export_user_archive`)
-- into the calling tenant, in one transaction, or leaves the tenant untouched.
--
-- ---------------------------------------------------------------------------
-- Privilege decision: SECURITY DEFINER, and why SECURITY INVOKER cannot work
-- ---------------------------------------------------------------------------
--
-- The R6 producer is deliberately SECURITY INVOKER because every tenant table
-- grants SELECT to `authenticated` under an owner-based policy. Writes are the
-- opposite: thirteen of the nineteen tables deliberately have **no** INSERT
-- policy and no INSERT grant for `authenticated`, because all live financial
-- writes must go through the reviewed `SECURITY DEFINER` RPCs that enforce
-- transfer balance, split exactness, entry sign and category-kind rules.
--
-- Making restore SECURITY INVOKER would therefore require granting
-- `authenticated` direct INSERT on `financial_transactions`,
-- `transaction_entries` and the rest. That would let any browser session write
-- arbitrary ledger rows straight past every invariant-enforcing RPC — a
-- permanent, global weakening of the write model in exchange for one feature.
--
-- SECURITY DEFINER is the least-privileged option available: the elevated right
-- stays confined to this one reviewed function instead of being handed to the
-- role at large. It is hardened to the repository's existing conventions —
-- identity from `auth.uid()`, no caller-supplied tenant, `search_path` pinned
-- empty with every object schema-qualified, EXECUTE revoked from PUBLIC/anon,
-- granted only to `authenticated`, no dynamic SQL — and the privileged-function
-- inventory in `security_definer_contract.test.sql` is updated deliberately.
--
-- ---------------------------------------------------------------------------
-- Trigger interactions, handled narrowly rather than by disabling anything
-- ---------------------------------------------------------------------------
--
-- 1. `inbox_rules_validate_category` rejects any INSERT whose category is
--    archived, but an archive may legitimately contain a rule whose category was
--    archived afterwards. Categories are therefore inserted **unarchived**, and
--    their archived flags are applied in a final pass once every dependent row
--    exists. `categories` has no UPDATE trigger and no `updated_at`, so that
--    pass costs no fidelity.
-- 2. The same trigger also overwrites `version`, `created_at` and `updated_at` on
--    INSERT, and `version_inbox_rule` force-restores `new.created_at :=
--    old.created_at` on UPDATE — so a follow-up repair is impossible too. Those
--    three fields are therefore a recorded fidelity limitation, not something
--    this function pretends to preserve. See the named limitations below.
-- 3. `set_updated_at` is BEFORE UPDATE only, so INSERTs preserve archived
--    timestamps. Accounts keep their archived flag on insert precisely so that
--    no later UPDATE clobbers `updated_at`.
-- 4. The audit triggers on `financial_transactions`, `transaction_entries` and
--    `account_reconciliations` are left to fire. See the audit note below.
--
-- ---------------------------------------------------------------------------
-- Audit semantics, explicitly reconciled
-- ---------------------------------------------------------------------------
--
-- `archive.tables.auditHistory` is **never** inserted into
-- `financial_mutation_audit_events`: replaying it would fabricate provenance for
-- mutations that never happened in this tenant.
--
-- The ordinary AFTER INSERT audit triggers are *not* suppressed. The events they
-- write are true statements about the target tenant — those rows really were
-- created there, now — and silencing them would leave the live audit table
-- incomplete, which is worse than verbose. What makes them non-misleading is
-- that every entity they name is recorded in `archive_restore_rows` for this
-- batch, so restore-created audit events are distinguishable from user activity
-- by a join rather than by guesswork. A pgTAP assertion proves that.

-- ---------------------------------------------------------------------------
-- Restore identity and attribution
-- ---------------------------------------------------------------------------

create table if not exists public.archive_restore_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  archive_id uuid not null,
  archive_version integer not null,
  schema_generation text not null,
  produced_at timestamptz not null,
  restored_at timestamptz not null default now(),
  status text not null default 'restored'
    check (status in ('restored', 'removed')),
  removed_at timestamptz,
  row_counts jsonb not null,
  constraint archive_restore_batches_removed_shape_check check (
    (status = 'restored' and removed_at is null)
    or (status = 'removed' and removed_at is not null)
  ),
  -- Duplicate policy: the same archive can be restored into a given tenant at
  -- most once, so replaying a file cannot double the ledger.
  unique (user_id, archive_id)
);

-- Exact attribution without adding a column to eighteen domain tables. Restore
-- is empty-target only, so every row present afterwards belongs to the batch;
-- recording them explicitly keeps that true after the user starts working.
create table if not exists public.archive_restore_rows (
  batch_id uuid not null references public.archive_restore_batches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  row_id uuid not null,
  primary key (batch_id, table_name, row_id)
);

create index if not exists archive_restore_rows_user_table_idx
  on public.archive_restore_rows (user_id, table_name);
create index if not exists archive_restore_batches_user_idx
  on public.archive_restore_batches (user_id, restored_at desc);

alter table public.archive_restore_batches enable row level security;
alter table public.archive_restore_rows enable row level security;

create policy "archive_restore_batches_select_own" on public.archive_restore_batches
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "archive_restore_rows_select_own" on public.archive_restore_rows
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only for the browser: both tables are written exclusively by the
-- privileged restore functions below.
grant select on public.archive_restore_batches to authenticated;
grant select on public.archive_restore_rows to authenticated;

comment on table public.archive_restore_batches is
  'One row per committed archive restore. Unique per (user, archive) so the same archive cannot double a ledger.';
comment on table public.archive_restore_rows is
  'Exact attribution of every row a restore wrote, so a committed restore can be identified and removed without guessing.';

-- ---------------------------------------------------------------------------
-- Database-side validation
-- ---------------------------------------------------------------------------
--
-- The RPC is reachable independently of the TypeScript validator, so it may not
-- trust a client claim that an archive was already checked. This re-proves the
-- contract in the database and RAISEs before the first domain write.
--
-- It is intentionally *not* a second, independently invented contract: every
-- rule below mirrors a named rejection in
-- `src/lib/archive/moneyflow-archive-validator.ts`, and
-- `archive-restore-contract.test.ts` asserts the two stay aligned so drift fails
-- a test instead of silently diverging.

create or replace function public.validate_archive_for_restore(p_archive jsonb)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tables jsonb;
  v_collection text;
  v_expected_collections text[] := array[
    'profile', 'categories', 'accounts', 'importBatches', 'savingsGoals',
    'recurringIncomeTemplates', 'recurringCommitments', 'monthlyBudgets',
    'inboxRules', 'accountReconciliations', 'transactions', 'inboxCandidates',
    'savingsGoalAllocations', 'incomeTemplateOccurrences',
    'commitmentOccurrences', 'transactionImportProvenance', 'transactionEntries',
    'accountReconciliationEvents', 'auditHistory'
  ];
  v_money_max bigint := 9007199254740991;
begin
  if p_archive is null or jsonb_typeof(p_archive) <> 'object' then
    raise exception 'archive_not_object';
  end if;

  if (p_archive -> 'archive_version') is distinct from '1'::jsonb then
    raise exception 'archive_version_unsupported';
  end if;
  if (p_archive ->> 'schema_generation') is distinct from '20260804160000' then
    raise exception 'schema_generation_unsupported';
  end if;
  if (p_archive ->> 'archive_id') is null
     or (p_archive ->> 'archive_id') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'archive_id_malformed';
  end if;
  if (p_archive ->> 'produced_at') is null then
    raise exception 'produced_at_malformed';
  end if;

  v_tables := p_archive -> 'tables';
  if v_tables is null or jsonb_typeof(v_tables) <> 'object' then
    raise exception 'tables_not_object';
  end if;

  foreach v_collection in array v_expected_collections loop
    if not (v_tables ? v_collection) then
      raise exception 'collection_missing';
    end if;
    if v_collection <> 'profile' and jsonb_typeof(v_tables -> v_collection) <> 'array' then
      raise exception 'collection_not_array';
    end if;
  end loop;

  if exists (
    select 1 from jsonb_object_keys(v_tables) as present(key)
    where present.key <> all (v_expected_collections)
  ) then
    raise exception 'collection_unknown';
  end if;

  if jsonb_typeof(v_tables -> 'profile') <> 'object' then
    raise exception 'profile_not_object';
  end if;

  -- Source ownership must never travel in an archive: the target owner comes
  -- from auth.uid(). Any owner-authority key anywhere is a rejection.
  if p_archive::text ~ '"(user_id|userId|owner_id|ownerId|target_user_id|actor_user_id|tenant_id)"' then
    raise exception 'owner_authority_field_present';
  end if;
  if (v_tables -> 'profile') ? 'id' then
    raise exception 'owner_authority_field_present';
  end if;

  -- Money must be an exact integer inside the safe range everywhere it appears.
  if exists (
    select 1
    from jsonb_each(v_tables) as collection
    cross join lateral (
      select value as row_value
      from jsonb_array_elements(
        case when jsonb_typeof(collection.value) = 'array' then collection.value else '[]'::jsonb end
      )
    ) as rows
    cross join lateral jsonb_each(rows.row_value) as field
    where field.key like '%_minor'
      and (
        jsonb_typeof(field.value) not in ('number', 'null')
        or (
          jsonb_typeof(field.value) = 'number'
          and (
            field.value::text ~ '[.eE]'
            or (field.value)::text::numeric > v_money_max
            or (field.value)::text::numeric < -v_money_max
          )
        )
      )
  ) then
    raise exception 'money_out_of_safe_range';
  end if;

  -- Referential integrity for every reference the insert order depends on.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
    where not exists (
      select 1 from jsonb_array_elements(v_tables -> 'transactions') as transaction
      where transaction ->> 'id' = entry ->> 'transaction_id'
    )
  ) then
    raise exception 'reference_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
    where not exists (
      select 1 from jsonb_array_elements(v_tables -> 'accounts') as account
      where account ->> 'id' = entry ->> 'account_id'
    )
  ) then
    raise exception 'reference_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
    where entry ->> 'category_id' is not null
      and not exists (
        select 1 from jsonb_array_elements(v_tables -> 'categories') as category
        where category ->> 'id' = entry ->> 'category_id'
      )
  ) then
    raise exception 'reference_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'inboxCandidates') as candidate
    where candidate ->> 'transfer_pair_id' is not null
      and not exists (
        select 1 from jsonb_array_elements(v_tables -> 'inboxCandidates') as other
        where other ->> 'id' = candidate ->> 'transfer_pair_id'
      )
  ) then
    raise exception 'reference_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'inboxCandidates') as candidate
    where candidate ->> 'transfer_pair_id' = candidate ->> 'id'
  ) then
    raise exception 'self_reference_to_own_row';
  end if;

  -- Duplicate identity inside one archive.
  if exists (
    select 1
    from jsonb_each(v_tables) as collection
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(collection.value) = 'array' then collection.value
        else '[]'::jsonb
      end
    ) as row_value
    where row_value ->> 'id' is not null
    group by collection.key, row_value ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'duplicate_row_id';
  end if;

  -- Transaction shapes: the invariants that live only in the write RPCs and are
  -- therefore lost the moment rows are inserted directly.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactions') as transaction
    where not exists (
      select 1 from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
      where entry ->> 'transaction_id' = transaction ->> 'id'
    )
  ) then
    raise exception 'transaction_without_entries';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
    where (entry -> 'amount_minor')::text::numeric = 0
  ) then
    raise exception 'entry_amount_zero';
  end if;

  -- Income: exactly one positive entry on an income-kind category.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactions') as transaction
    cross join lateral (
      select
        count(*) as entry_count,
        min((entry -> 'amount_minor')::text::numeric) as min_amount,
        bool_or(entry ->> 'category_id' is null) as any_null_category
      from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
      where entry ->> 'transaction_id' = transaction ->> 'id'
    ) as shape
    where transaction ->> 'kind' = 'income'
      and (shape.entry_count <> 1 or shape.min_amount <= 0 or shape.any_null_category)
  ) then
    raise exception 'income_shape_invalid';
  end if;

  -- Expense: one to twelve entries, all negative, all categorised.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactions') as transaction
    cross join lateral (
      select
        count(*) as entry_count,
        max((entry -> 'amount_minor')::text::numeric) as max_amount,
        count(distinct entry ->> 'account_id') as account_count,
        count(distinct entry ->> 'category_id') as category_count,
        bool_or(entry ->> 'category_id' is null) as any_null_category
      from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
      where entry ->> 'transaction_id' = transaction ->> 'id'
    ) as shape
    where transaction ->> 'kind' = 'expense'
      and (
        shape.entry_count < 1
        or shape.entry_count > 12
        or shape.max_amount >= 0
        or shape.any_null_category
        or shape.account_count <> 1
        or shape.category_count <> shape.entry_count
      )
  ) then
    raise exception 'expense_shape_invalid';
  end if;

  -- Transfer: exactly two uncategorised legs summing to zero on two different
  -- accounts of the same currency.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactions') as transaction
    cross join lateral (
      select
        count(*) as entry_count,
        sum((entry -> 'amount_minor')::text::numeric) as total,
        count(*) filter (where (entry -> 'amount_minor')::text::numeric < 0) as negatives,
        count(*) filter (where (entry -> 'amount_minor')::text::numeric > 0) as positives,
        count(distinct entry ->> 'account_id') as account_count,
        bool_or(entry ->> 'category_id' is not null) as any_category,
        count(distinct (
          select account ->> 'currency_code'
          from jsonb_array_elements(v_tables -> 'accounts') as account
          where account ->> 'id' = entry ->> 'account_id'
        )) as currency_count
      from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
      where entry ->> 'transaction_id' = transaction ->> 'id'
    ) as shape
    where transaction ->> 'kind' = 'transfer'
      and (
        shape.entry_count <> 2
        or shape.total <> 0
        or shape.negatives <> 1
        or shape.positives <> 1
        or shape.account_count <> 2
        or shape.any_category
        or shape.currency_count <> 1
      )
  ) then
    raise exception 'transfer_shape_invalid';
  end if;

  -- Category kind must match the transaction kind.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactions') as transaction
    join jsonb_array_elements(v_tables -> 'transactionEntries') as entry
      on entry ->> 'transaction_id' = transaction ->> 'id'
    join jsonb_array_elements(v_tables -> 'categories') as category
      on category ->> 'id' = entry ->> 'category_id'
    where transaction ->> 'kind' in ('income', 'expense')
      and category ->> 'kind' is distinct from transaction ->> 'kind'
  ) then
    raise exception 'entry_category_kind_mismatch';
  end if;

  -- Cross-field shapes discovered in R5.
  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'transactionEntries') as entry
    where not (
      (entry ->> 'reconciliation_state' = 'pending'
        and entry ->> 'cleared_at' is null and entry ->> 'reconciliation_id' is null)
      or (entry ->> 'reconciliation_state' = 'cleared'
        and entry ->> 'cleared_at' is not null and entry ->> 'reconciliation_id' is null)
      or (entry ->> 'reconciliation_state' = 'reconciled'
        and entry ->> 'cleared_at' is not null and entry ->> 'reconciliation_id' is not null)
    )
  ) then
    raise exception 'entry_reconciliation_shape_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tables -> 'savingsGoals') as goal
    where (goal -> 'allocated_minor')::text::numeric > (goal -> 'target_minor')::text::numeric
  ) then
    raise exception 'allocated_exceeds_target';
  end if;
end;
$$;

revoke all on function public.validate_archive_for_restore(jsonb)
  from public, anon, authenticated;
grant execute on function public.validate_archive_for_restore(jsonb) to authenticated;

comment on function public.validate_archive_for_restore(jsonb) is
  'Re-proves the MoneyFlow archive v1 contract in the database so restore fails closed before its first domain write.';

-- ---------------------------------------------------------------------------
-- Named fidelity limitations, forced by live validation triggers
-- ---------------------------------------------------------------------------
--
-- Three fields cannot be restored byte-faithfully through DML, because the
-- triggers that own them rewrite them and disabling triggers is not an option:
--
-- 1. `inbox_rules.created_at`, `updated_at` and `version`.
--    `validate_inbox_rule_category` sets `version := 1` and both timestamps to
--    `now()` on INSERT, and `version_inbox_rule` force-restores
--    `new.created_at := old.created_at` on UPDATE — so a follow-up repair is
--    also impossible. Restored rules therefore carry restore-time timestamps and
--    version 1. The rule's behaviour (match field, text, merchant, category,
--    priority, enabled) is preserved exactly.
-- 2. `inbox_candidates.applied_rule_version` is rewritten to the restored rule's
--    actual version. `validate_inbox_candidate_rule_evidence` requires an exact
--    `(id, user_id, version)` match, and since every restored rule is version 1,
--    a candidate claiming version 2 would be unrestorable. Rewriting keeps the
--    pair internally consistent instead of refusing a legitimate archive. This is
--    import provenance metadata, not financial data.
-- 3. `inbox_candidates.fingerprint` and `fingerprint_version`.
--    `set_inbox_candidate_fingerprint` recomputes both on INSERT. The
--    recomputation is deterministic over the same inputs, so the fingerprint
--    matches; `fingerprint_version` is forced to 1.
--
-- These are recorded as limitations, and the round-trip test excludes exactly
-- these fields and no others — it does not normalize away any domain difference.

create or replace function public.restore_user_archive(p_archive jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tables jsonb;
  v_archive_id uuid;
  v_batch_id uuid;
  v_counts jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- Serialize restores per tenant for the whole transaction. Without this, two
  -- concurrent calls could both pass the empty-target check and interleave their
  -- inserts. A transaction-level advisory lock is released automatically at
  -- commit or rollback, so no session state can leak.
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 20260812));

  -- Prove the contract before the first domain write. The RPC is reachable
  -- without the TypeScript validator, so a client claim of validity is not
  -- evidence.
  perform public.validate_archive_for_restore(p_archive);

  v_tables := p_archive -> 'tables';
  v_archive_id := (p_archive ->> 'archive_id')::uuid;

  -- Duplicate policy: the same archive may enter a tenant at most once.
  if exists (
    select 1 from public.archive_restore_batches
    where user_id = v_user_id and archive_id = v_archive_id and status = 'restored'
  ) then
    raise exception 'archive_already_restored';
  end if;

  -- Empty/bootstrap-only eligibility. Signup unavoidably creates one profile,
  -- one cash account and the default categories, so those are the exact
  -- exception; anything else means the tenant has been used.
  if (select count(*) from public.categories where user_id = v_user_id and is_default = false) > 0
     or (select count(*) from public.accounts where user_id = v_user_id) > 1
     or (select count(*) from public.financial_transactions where user_id = v_user_id) > 0
     or (select count(*) from public.transaction_entries where user_id = v_user_id) > 0
     or (select count(*) from public.monthly_budgets where user_id = v_user_id) > 0
     or (select count(*) from public.recurring_commitments where user_id = v_user_id) > 0
     or (select count(*) from public.commitment_occurrences where user_id = v_user_id) > 0
     or (select count(*) from public.recurring_income_templates where user_id = v_user_id) > 0
     or (select count(*) from public.income_template_occurrences where user_id = v_user_id) > 0
     or (select count(*) from public.savings_goals where user_id = v_user_id) > 0
     or (select count(*) from public.savings_goal_allocations where user_id = v_user_id) > 0
     or (select count(*) from public.import_batches where user_id = v_user_id) > 0
     or (select count(*) from public.inbox_candidates where user_id = v_user_id) > 0
     or (select count(*) from public.inbox_rules where user_id = v_user_id) > 0
     or (select count(*) from public.account_reconciliations where user_id = v_user_id) > 0
     or (select count(*) from public.account_reconciliation_events where user_id = v_user_id) > 0
     or (select count(*) from public.transaction_import_provenance where user_id = v_user_id) > 0
     or (select count(*) from public.financial_mutation_audit_events where user_id = v_user_id) > 0
  then
    raise exception 'restore_target_not_empty';
  end if;

  -- Archived ids are preserved rather than remapped, which gives the strongest
  -- possible fidelity: a restored ledger is identical to the archived one, down
  -- to every identifier and foreign key. Row ids are globally unique though, so
  -- that is only possible while none of them is still present in the database —
  -- the documented lifecycle, where the source account is gone by the time its
  -- archive is restored. Restoring alongside a still-live source is refused here
  -- with a clear reason instead of surfacing as a primary key violation
  -- part-way through.
  if exists (
    select 1
    from (
      select (row_value ->> 'id')::uuid as id
      from jsonb_each(v_tables) as collection
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(collection.value) = 'array' then collection.value else '[]'::jsonb end
      ) as row_value
      where row_value ->> 'id' is not null
      union all
      select (row_value ->> 'transaction_id')::uuid
      from jsonb_array_elements(v_tables -> 'transactionImportProvenance') as row_value
    ) as archived
    where exists (select 1 from public.categories where id = archived.id)
       or exists (select 1 from public.accounts where id = archived.id)
       or exists (select 1 from public.import_batches where id = archived.id)
       or exists (select 1 from public.savings_goals where id = archived.id)
       or exists (select 1 from public.savings_goal_allocations where id = archived.id)
       or exists (select 1 from public.recurring_income_templates where id = archived.id)
       or exists (select 1 from public.income_template_occurrences where id = archived.id)
       or exists (select 1 from public.recurring_commitments where id = archived.id)
       or exists (select 1 from public.commitment_occurrences where id = archived.id)
       or exists (select 1 from public.monthly_budgets where id = archived.id)
       or exists (select 1 from public.inbox_rules where id = archived.id)
       or exists (select 1 from public.account_reconciliations where id = archived.id)
       or exists (select 1 from public.account_reconciliation_events where id = archived.id)
       or exists (select 1 from public.financial_transactions where id = archived.id)
       or exists (select 1 from public.transaction_entries where id = archived.id)
       or exists (select 1 from public.inbox_candidates where id = archived.id)
       or exists (select 1 from public.transaction_import_provenance where transaction_id = archived.id)
  ) then
    raise exception 'restore_archive_id_conflict';
  end if;

  -- Bootstrap replacement: the seeded account and default categories are removed
  -- so archive state is reconstructed rather than merged with defaults. This
  -- happens inside the same transaction as the reconstruction below.
  delete from public.accounts where user_id = v_user_id;
  delete from public.categories where user_id = v_user_id;

  -- The profile row belongs to the target user and is updated, never replaced:
  -- `profiles.id` is the auth user id and must stay the target's.
  update public.profiles as target set
    full_name = source.full_name,
    avatar_url = source.avatar_url,
    currency_code = source.currency_code,
    locale = source.locale,
    timezone = source.timezone
  from jsonb_to_record(v_tables -> 'profile') as source(
    full_name text, avatar_url text, currency_code text, locale text, timezone text
  )
  where target.id = v_user_id;

  -- Categories are inserted unarchived so `inbox_rules_validate_category` cannot
  -- reject a rule whose category was archived after the rule was made. The
  -- archived flags are applied in a final pass below.
  insert into public.categories (
    id, user_id, name, kind, icon, color, is_default, created_at, is_archived
  )
  select source.id, v_user_id, source.name, source.kind, source.icon, source.color,
         source.is_default, source.created_at, false
  from jsonb_to_recordset(v_tables -> 'categories') as source(
    id uuid, name text, kind public.category_kind, icon text, color text,
    is_default boolean, is_archived boolean, created_at timestamptz
  );

  insert into public.accounts (
    id, user_id, name, kind, currency_code, initial_balance_minor,
    credit_limit_minor, icon, color, is_archived, created_at, updated_at
  )
  select source.id, v_user_id, source.name, source.kind, source.currency_code,
         source.initial_balance_minor, source.credit_limit_minor, source.icon,
         source.color, source.is_archived, source.created_at, source.updated_at
  from jsonb_to_recordset(v_tables -> 'accounts') as source(
    id uuid, name text, kind public.account_kind, currency_code text,
    initial_balance_minor bigint, credit_limit_minor bigint, icon text, color text,
    is_archived boolean, created_at timestamptz, updated_at timestamptz
  );

  insert into public.import_batches (
    id, user_id, file_name, source, status, row_count, warning_count, skipped_rows,
    map_confidence, parser_version, mapping_version, headers, column_map, local_id,
    created_at, committed_at, updated_at
  )
  select s.id, v_user_id, s.file_name, s.source, s.status, s.row_count,
         s.warning_count, s.skipped_rows, s.map_confidence, s.parser_version,
         s.mapping_version, s.headers, s.column_map, s.local_id, s.created_at,
         s.committed_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'importBatches') as s(
    id uuid, file_name text, source public.import_batch_source,
    status public.import_batch_status, row_count integer, warning_count integer,
    skipped_rows integer, map_confidence double precision, parser_version text,
    mapping_version integer, headers jsonb, column_map jsonb, local_id text,
    created_at timestamptz, committed_at timestamptz, updated_at timestamptz
  );

  insert into public.savings_goals (
    id, user_id, name, target_minor, allocated_minor, deadline, is_archived,
    created_at, updated_at
  )
  select s.id, v_user_id, s.name, s.target_minor, s.allocated_minor, s.deadline,
         s.is_archived, s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'savingsGoals') as s(
    id uuid, name text, target_minor bigint, allocated_minor bigint, deadline date,
    is_archived boolean, created_at timestamptz, updated_at timestamptz
  );

  insert into public.recurring_income_templates (
    id, user_id, name, amount_minor, due_day, account_id, category_id,
    is_archived, created_at, updated_at
  )
  select s.id, v_user_id, s.name, s.amount_minor, s.due_day, s.account_id,
         s.category_id, s.is_archived, s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'recurringIncomeTemplates') as s(
    id uuid, name text, amount_minor bigint, due_day smallint, account_id uuid,
    category_id uuid, is_archived boolean, created_at timestamptz,
    updated_at timestamptz
  );

  insert into public.recurring_commitments (
    id, user_id, name, amount_minor, due_day, account_id, category_id,
    is_archived, created_at, updated_at
  )
  select s.id, v_user_id, s.name, s.amount_minor, s.due_day, s.account_id,
         s.category_id, s.is_archived, s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'recurringCommitments') as s(
    id uuid, name text, amount_minor bigint, due_day smallint, account_id uuid,
    category_id uuid, is_archived boolean, created_at timestamptz,
    updated_at timestamptz
  );

  insert into public.monthly_budgets (
    id, user_id, category_id, month_start, limit_minor, created_at, updated_at
  )
  select s.id, v_user_id, s.category_id, s.month_start, s.limit_minor,
         s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'monthlyBudgets') as s(
    id uuid, category_id uuid, month_start date, limit_minor bigint,
    created_at timestamptz, updated_at timestamptz
  );

  -- `version`, `created_at` and `updated_at` are trigger-owned here; see the
  -- named limitation above.
  insert into public.inbox_rules (
    id, user_id, stage, priority, enabled, match_field, contains_text,
    category_id, merchant_name
  )
  select s.id, v_user_id, s.stage, s.priority, s.enabled, s.match_field,
         s.contains_text, s.category_id, s.merchant_name
  from jsonb_to_recordset(v_tables -> 'inboxRules') as s(
    id uuid, stage text, priority integer, enabled boolean, match_field text,
    contains_text text, category_id uuid, merchant_name text
  );

  insert into public.account_reconciliations (
    id, user_id, account_id, statement_date, statement_balance_minor, status,
    calculated_balance_minor, pending_account_leg_count, cleared_account_leg_count,
    reconciled_account_leg_count, started_at, completed_at, last_reopened_at,
    created_at, updated_at
  )
  select s.id, v_user_id, s.account_id, s.statement_date, s.statement_balance_minor,
         s.status, s.calculated_balance_minor, s.pending_account_leg_count,
         s.cleared_account_leg_count, s.reconciled_account_leg_count, s.started_at,
         s.completed_at, s.last_reopened_at, s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'accountReconciliations') as s(
    id uuid, account_id uuid, statement_date date, statement_balance_minor bigint,
    status public.account_reconciliation_status, calculated_balance_minor bigint,
    pending_account_leg_count bigint, cleared_account_leg_count bigint,
    reconciled_account_leg_count bigint, started_at timestamptz,
    completed_at timestamptz, last_reopened_at timestamptz,
    created_at timestamptz, updated_at timestamptz
  );

  -- Transactions before entries: `transaction_entries_audit_mutation` raises
  -- `financial_audit_transaction_not_found` if the parent is absent.
  insert into public.financial_transactions (
    id, user_id, kind, note, occurred_on, idempotency_key, review_status,
    created_at, updated_at, deleted_at
  )
  select s.id, v_user_id, s.kind, s.note, s.occurred_on, s.idempotency_key,
         s.review_status, s.created_at, s.updated_at, s.deleted_at
  from jsonb_to_recordset(v_tables -> 'transactions') as s(
    id uuid, kind public.transaction_kind, note text, occurred_on date,
    idempotency_key uuid, review_status public.transaction_review_status,
    created_at timestamptz, updated_at timestamptz, deleted_at timestamptz
  );

  -- Phase one of the self-reference: pair links are applied after every
  -- candidate exists. `applied_rule_version` is realigned to the restored rule.
  insert into public.inbox_candidates (
    id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
    confidence, status, possible_duplicate, possible_transfer, category_id,
    category_name, account_id, account_name, raw_snippet, import_batch_id,
    local_id, source_row_index, source_external_id, parser_version,
    mapping_version, match_status, match_reason, match_confidence,
    applied_rule_id, applied_rule_version, approved_transaction_id, approved_at,
    created_at, updated_at
  )
  select s.id, v_user_id, s.kind, s.amount_minor, s.merchant, s.note,
         s.occurred_on, s.source, s.confidence, s.status, s.possible_duplicate,
         s.possible_transfer, s.category_id, s.category_name, s.account_id,
         s.account_name, s.raw_snippet, s.import_batch_id, s.local_id,
         s.source_row_index, s.source_external_id, s.parser_version,
         s.mapping_version, s.match_status, s.match_reason, s.match_confidence,
         s.applied_rule_id,
         case
           when s.applied_rule_id is null then null
           else (
             select rule.version from public.inbox_rules as rule
             where rule.id = s.applied_rule_id and rule.user_id = v_user_id
           )
         end,
         s.approved_transaction_id, s.approved_at, s.created_at, s.updated_at
  from jsonb_to_recordset(v_tables -> 'inboxCandidates') as s(
    id uuid, kind public.transaction_kind, amount_minor bigint, merchant text,
    note text, occurred_on date, source public.inbox_candidate_source,
    confidence public.inbox_candidate_confidence,
    status public.inbox_candidate_status, possible_duplicate boolean,
    possible_transfer boolean, category_id uuid, category_name text,
    account_id uuid, account_name text, raw_snippet text, import_batch_id uuid,
    local_id text, source_row_index integer, source_external_id text,
    parser_version text, mapping_version integer,
    match_status public.import_match_status, match_reason text,
    match_confidence real, applied_rule_id uuid, applied_rule_version integer,
    approved_transaction_id uuid, approved_at timestamptz,
    created_at timestamptz, updated_at timestamptz
  );

  -- Phase two: validated pair links, in the same transaction.
  update public.inbox_candidates as target
  set transfer_pair_id = source.transfer_pair_id
  from jsonb_to_recordset(v_tables -> 'inboxCandidates') as source(
    id uuid, transfer_pair_id uuid
  )
  where target.id = source.id
    and target.user_id = v_user_id
    and source.transfer_pair_id is not null;

  insert into public.savings_goal_allocations (id, user_id, goal_id, amount_minor, created_at)
  select s.id, v_user_id, s.goal_id, s.amount_minor, s.created_at
  from jsonb_to_recordset(v_tables -> 'savingsGoalAllocations') as s(
    id uuid, goal_id uuid, amount_minor bigint, created_at timestamptz
  );

  insert into public.income_template_occurrences (
    id, user_id, template_id, month_start, transaction_id, received_at
  )
  select s.id, v_user_id, s.template_id, s.month_start, s.transaction_id, s.received_at
  from jsonb_to_recordset(v_tables -> 'incomeTemplateOccurrences') as s(
    id uuid, template_id uuid, month_start date, transaction_id uuid,
    received_at timestamptz
  );

  insert into public.commitment_occurrences (
    id, user_id, commitment_id, month_start, transaction_id, paid_at
  )
  select s.id, v_user_id, s.commitment_id, s.month_start, s.transaction_id, s.paid_at
  from jsonb_to_recordset(v_tables -> 'commitmentOccurrences') as s(
    id uuid, commitment_id uuid, month_start date, transaction_id uuid,
    paid_at timestamptz
  );

  insert into public.transaction_import_provenance (
    transaction_id, user_id, candidate_id, import_batch_id, source,
    source_row_index, original_description, source_external_id, fingerprint,
    fingerprint_version, parser_version, mapping_version, match_status,
    match_reason, match_confidence, created_at
  )
  select s.transaction_id, v_user_id, s.candidate_id, s.import_batch_id, s.source,
         s.source_row_index, s.original_description, s.source_external_id,
         s.fingerprint, s.fingerprint_version, s.parser_version, s.mapping_version,
         s.match_status, s.match_reason, s.match_confidence, s.created_at
  from jsonb_to_recordset(v_tables -> 'transactionImportProvenance') as s(
    transaction_id uuid, candidate_id uuid, import_batch_id uuid,
    source public.inbox_candidate_source, source_row_index integer,
    original_description text, source_external_id text, fingerprint text,
    fingerprint_version smallint, parser_version text, mapping_version integer,
    match_status public.import_match_status, match_reason text,
    match_confidence real, created_at timestamptz
  );

  insert into public.transaction_entries (
    id, transaction_id, user_id, account_id, category_id, amount_minor,
    reconciliation_state, cleared_at, reconciliation_id, created_at
  )
  select s.id, s.transaction_id, v_user_id, s.account_id, s.category_id,
         s.amount_minor, s.reconciliation_state, s.cleared_at, s.reconciliation_id,
         s.created_at
  from jsonb_to_recordset(v_tables -> 'transactionEntries') as s(
    id uuid, transaction_id uuid, account_id uuid, category_id uuid,
    amount_minor bigint, reconciliation_state public.entry_reconciliation_state,
    cleared_at timestamptz, reconciliation_id uuid, created_at timestamptz
  );

  insert into public.account_reconciliation_events (
    id, user_id, reconciliation_id, account_id, kind, statement_balance_minor,
    calculated_balance_minor, difference_minor, occurred_at
  )
  select s.id, v_user_id, s.reconciliation_id, s.account_id, s.kind,
         s.statement_balance_minor, s.calculated_balance_minor,
         -- Derived, and deliberately absent from the archive because the schema
         -- permits twice the JavaScript safe-integer bound.
         s.statement_balance_minor - s.calculated_balance_minor,
         s.occurred_at
  from jsonb_to_recordset(v_tables -> 'accountReconciliationEvents') as s(
    id uuid, reconciliation_id uuid, account_id uuid,
    kind public.account_reconciliation_event_kind,
    statement_balance_minor bigint, calculated_balance_minor bigint,
    occurred_at timestamptz
  );

  -- archive.auditHistory is deliberately NOT inserted: replaying it would
  -- fabricate provenance for mutations that never happened in this tenant.

  -- Final pass: apply archived category flags now that every dependent row
  -- exists. `categories` has no UPDATE trigger and no `updated_at`, so this
  -- costs no fidelity.
  update public.categories as target
  set is_archived = true
  from jsonb_to_recordset(v_tables -> 'categories') as source(id uuid, is_archived boolean)
  where target.id = source.id
    and target.user_id = v_user_id
    and source.is_archived;

  -- Force the deferred reconciliation-leg constraint trigger to fire here rather
  -- than at COMMIT, so a violation rolls back inside this call and reports a
  -- useful error instead of failing after the RPC appears to have returned.
  set constraints all immediate;

  -- Restore identity, then exact per-row attribution. Restore is empty-target
  -- only, so every row now present belongs to this batch.
  select jsonb_object_agg(collection.key, jsonb_array_length(collection.value))
  into v_counts
  from jsonb_each(v_tables) as collection
  where jsonb_typeof(collection.value) = 'array';

  insert into public.archive_restore_batches (
    user_id, archive_id, archive_version, schema_generation, produced_at, row_counts
  )
  values (
    v_user_id, v_archive_id, (p_archive ->> 'archive_version')::integer,
    p_archive ->> 'schema_generation', (p_archive ->> 'produced_at')::timestamptz,
    coalesce(v_counts, '{}'::jsonb)
  )
  returning id into v_batch_id;

  insert into public.archive_restore_rows (batch_id, user_id, table_name, row_id)
  select v_batch_id, v_user_id, 'profiles', v_user_id
  union all select v_batch_id, v_user_id, 'categories', id from public.categories where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'accounts', id from public.accounts where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'import_batches', id from public.import_batches where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'savings_goals', id from public.savings_goals where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'recurring_income_templates', id from public.recurring_income_templates where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'recurring_commitments', id from public.recurring_commitments where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'monthly_budgets', id from public.monthly_budgets where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'inbox_rules', id from public.inbox_rules where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'account_reconciliations', id from public.account_reconciliations where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'financial_transactions', id from public.financial_transactions where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'inbox_candidates', id from public.inbox_candidates where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'savings_goal_allocations', id from public.savings_goal_allocations where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'income_template_occurrences', id from public.income_template_occurrences where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'commitment_occurrences', id from public.commitment_occurrences where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'transaction_import_provenance', transaction_id from public.transaction_import_provenance where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'transaction_entries', id from public.transaction_entries where user_id = v_user_id
  union all select v_batch_id, v_user_id, 'account_reconciliation_events', id from public.account_reconciliation_events where user_id = v_user_id;

  return jsonb_build_object(
    'restore_batch_id', v_batch_id,
    'archive_id', v_archive_id,
    'restored_row_counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.restore_user_archive(jsonb) from public, anon, authenticated;
grant execute on function public.restore_user_archive(jsonb) to authenticated;

comment on function public.restore_user_archive(jsonb) is
  'Atomically restores a MoneyFlow archive v1 into the calling empty/bootstrap tenant. SECURITY DEFINER because fifteen tenant tables deliberately deny INSERT to authenticated.';

-- ---------------------------------------------------------------------------
-- Batch removal (AC14)
-- ---------------------------------------------------------------------------
--
-- Removal is only offered while the restore is still pristine — the tenant's
-- rows are exactly the batch's rows and nothing has been added.
--
-- That boundary is a deliberate contract, not a shortcut. Once a user edits or
-- deletes restored rows and adds their own, "remove batch X" stops having one
-- honest meaning: the new rows may reference restored ones, and deleting rows the
-- user has since changed would destroy work they did themselves. Refusing with a
-- clear reason is better than silently guessing which of those outcomes the user
-- wanted, so removal is a clean undo of a mistaken restore rather than an
-- open-ended time machine.

create or replace function public.remove_archive_restore_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.archive_restore_batches;
  v_removed integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 20260812));

  select * into v_batch
  from public.archive_restore_batches
  where id = p_batch_id and user_id = v_user_id;

  if not found then
    -- Never distinguishes "not yours" from "does not exist".
    raise exception 'restore_batch_not_found';
  end if;
  if v_batch.status <> 'restored' then
    raise exception 'restore_batch_already_removed';
  end if;

  -- Pristine check: every current tenant row must be attributable to this batch,
  -- and the batch must still account for every row that exists.
  if exists (
    select 1 from (
      select 'categories' as table_name, id from public.categories where user_id = v_user_id
      union all select 'accounts', id from public.accounts where user_id = v_user_id
      union all select 'import_batches', id from public.import_batches where user_id = v_user_id
      union all select 'savings_goals', id from public.savings_goals where user_id = v_user_id
      union all select 'recurring_income_templates', id from public.recurring_income_templates where user_id = v_user_id
      union all select 'recurring_commitments', id from public.recurring_commitments where user_id = v_user_id
      union all select 'monthly_budgets', id from public.monthly_budgets where user_id = v_user_id
      union all select 'inbox_rules', id from public.inbox_rules where user_id = v_user_id
      union all select 'account_reconciliations', id from public.account_reconciliations where user_id = v_user_id
      union all select 'financial_transactions', id from public.financial_transactions where user_id = v_user_id
      union all select 'inbox_candidates', id from public.inbox_candidates where user_id = v_user_id
      union all select 'savings_goal_allocations', id from public.savings_goal_allocations where user_id = v_user_id
      union all select 'income_template_occurrences', id from public.income_template_occurrences where user_id = v_user_id
      union all select 'commitment_occurrences', id from public.commitment_occurrences where user_id = v_user_id
      union all select 'transaction_import_provenance', transaction_id from public.transaction_import_provenance where user_id = v_user_id
      union all select 'transaction_entries', id from public.transaction_entries where user_id = v_user_id
      union all select 'account_reconciliation_events', id from public.account_reconciliation_events where user_id = v_user_id
    ) as live
    where not exists (
      select 1 from public.archive_restore_rows as attributed
      where attributed.batch_id = p_batch_id
        and attributed.table_name = live.table_name
        and attributed.row_id = live.id
    )
  ) then
    raise exception 'restore_batch_not_pristine';
  end if;

  -- Reverse dependency order — the same order `purge_user_tenant_data` uses, so
  -- no foreign key or reconciled-mutation guard can reject a delete. Entries go
  -- before transactions precisely so `guard_reconciled_transaction_mutation`
  -- sees no reconciled leg when the transaction is removed.
  delete from public.account_reconciliation_events
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'account_reconciliation_events');

  delete from public.transaction_entries
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'transaction_entries');

  delete from public.transaction_import_provenance
  where user_id = v_user_id and transaction_id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'transaction_import_provenance');

  delete from public.commitment_occurrences
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'commitment_occurrences');

  delete from public.income_template_occurrences
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'income_template_occurrences');

  delete from public.savings_goal_allocations
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'savings_goal_allocations');

  delete from public.inbox_candidates
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'inbox_candidates');

  delete from public.financial_transactions
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'financial_transactions');

  delete from public.account_reconciliations
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'account_reconciliations');

  delete from public.inbox_rules
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'inbox_rules');

  delete from public.monthly_budgets
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'monthly_budgets');

  delete from public.recurring_commitments
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'recurring_commitments');

  delete from public.recurring_income_templates
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'recurring_income_templates');

  delete from public.savings_goals
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'savings_goals');

  delete from public.import_batches
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'import_batches');

  delete from public.accounts
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'accounts');

  delete from public.categories
  where user_id = v_user_id and id in (
    select row_id from public.archive_restore_rows
    where batch_id = p_batch_id and table_name = 'categories');

  select count(*)::integer into v_removed
  from public.archive_restore_rows where batch_id = p_batch_id;

  -- The audit events the restore created are history and are not rewritten:
  -- deleting them would fabricate a past in which the restore never happened.
  update public.archive_restore_batches
  set status = 'removed', removed_at = now()
  where id = p_batch_id;

  set constraints all immediate;

  return jsonb_build_object('restore_batch_id', p_batch_id, 'removed_rows', v_removed);
end;
$$;

revoke all on function public.remove_archive_restore_batch(uuid) from public, anon, authenticated;
grant execute on function public.remove_archive_restore_batch(uuid) to authenticated;

comment on function public.remove_archive_restore_batch(uuid) is
  'Removes a committed restore batch, but only while the tenant still holds exactly that batch''s rows. Refuses once the user has changed or added data.';

revoke all on function public.validate_archive_for_restore(jsonb) from authenticated;
