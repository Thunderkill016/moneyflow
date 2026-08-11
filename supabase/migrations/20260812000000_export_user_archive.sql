-- MoneyFlow Trust P2 Recover — R6 archive producer.
--
-- Emits the archive v1 contract merged in #343 (`src/lib/archive/moneyflow-archive.ts`)
-- for the calling tenant. Read-only: this function contains no DML.
--
-- Security model — deliberately SECURITY INVOKER, not SECURITY DEFINER:
--
--   Every one of the nineteen tenant tables has row level security enabled with
--   a permissive owner-based SELECT policy for `authenticated`, plus a plain
--   SELECT grant. Running as the invoker therefore makes tenant isolation
--   *structural*: RLS filters every row to the caller regardless of what this
--   function's WHERE clauses say, so a projection bug cannot leak another
--   tenant's ledger. SECURITY DEFINER would move that guarantee into this
--   function's own correctness and would enlarge the repository's reviewed
--   privileged-RPC inventory for no benefit. The explicit `user_id` predicates
--   below are defence in depth, not the isolation mechanism.
--
-- Volatility — deliberately VOLATILE (no marker), unlike `get_dashboard_bundle`
-- which is STABLE:
--
--   Each call mints a fresh `archive_id` and `produced_at`, so two calls in one
--   statement legitimately differ. Labelling this STABLE would promise the
--   planner something untrue and let it reuse one result. Volatility is an
--   optimiser contract, not a write permission, so VOLATILE does not weaken the
--   read-only property — which is proven by the pgTAP test asserting every
--   tenant row count is unchanged across a call, rather than asserted by a label.
--
-- Timestamps are formatted explicitly rather than relying on the implicit
-- timestamptz-to-json cast, whose output follows the session `DateStyle`. The
-- archive contract pins an ISO 8601 shape, so the format is pinned here too.

-- The archive contract pins timestamps to an ISO 8601 shape with an explicit
-- UTC designator. The implicit timestamptz-to-jsonb cast follows the session
-- `DateStyle` and would emit `+00:00` (or worse, a non-ISO style) depending on
-- who calls it, so every archive timestamp goes through this one formatter.
-- Null in, null out: nullable columns such as `deleted_at` stay null.
create or replace function public.archive_timestamp(p_value timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

revoke all on function public.archive_timestamp(timestamptz) from public, anon, authenticated;
grant execute on function public.archive_timestamp(timestamptz) to authenticated;

comment on function public.archive_timestamp(timestamptz) is
  'Formats a timestamp for the MoneyFlow archive contract: ISO 8601, microseconds, explicit UTC.';

create or replace function public.export_user_archive()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tables jsonb;
  v_profile jsonb;
  v_counts jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- `profiles` keys on `id`, not `user_id`: the row id *is* the auth user id.
  -- The source identity is deliberately not serialized — restore applies
  -- ownership from auth.uid() in the target tenant — so only the user-owned
  -- preference fields are emitted.
  select jsonb_build_object(
    'full_name', profile.full_name,
    'avatar_url', profile.avatar_url,
    'currency_code', profile.currency_code,
    'locale', profile.locale,
    'timezone', profile.timezone
  )
  into v_profile
  from public.profiles as profile
  where profile.id = v_user_id;

  if v_profile is null then
    -- A tenant without a profile row cannot produce a valid archive. Fail
    -- explicitly rather than emit a payload the validator would reject.
    raise exception 'archive_profile_missing';
  end if;

  select jsonb_build_object(
    'profile', v_profile,

    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name,
          'kind', category.kind,
          'icon', category.icon,
          'color', category.color,
          'is_default', category.is_default,
          'is_archived', category.is_archived,
          'created_at', public.archive_timestamp(category.created_at)
        )
        order by category.created_at, category.id
      )
      from public.categories as category
      where category.user_id = v_user_id
    ), '[]'::jsonb),

    'accounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', account.id,
          'name', account.name,
          'kind', account.kind,
          'currency_code', account.currency_code,
          'initial_balance_minor', account.initial_balance_minor,
          'credit_limit_minor', account.credit_limit_minor,
          'icon', account.icon,
          'color', account.color,
          'is_archived', account.is_archived,
          'created_at', public.archive_timestamp(account.created_at),
          'updated_at', public.archive_timestamp(account.updated_at)
        )
        order by account.created_at, account.id
      )
      from public.accounts as account
      where account.user_id = v_user_id
    ), '[]'::jsonb),

    'importBatches', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', batch.id,
          'file_name', batch.file_name,
          'source', batch.source,
          'status', batch.status,
          'row_count', batch.row_count,
          'warning_count', batch.warning_count,
          'skipped_rows', batch.skipped_rows,
          'map_confidence', batch.map_confidence,
          'parser_version', batch.parser_version,
          'mapping_version', batch.mapping_version,
          'headers', batch.headers,
          'column_map', batch.column_map,
          'local_id', batch.local_id,
          'created_at', public.archive_timestamp(batch.created_at),
          'committed_at', public.archive_timestamp(batch.committed_at),
          'updated_at', public.archive_timestamp(batch.updated_at)
        )
        order by batch.created_at, batch.id
      )
      from public.import_batches as batch
      where batch.user_id = v_user_id
    ), '[]'::jsonb),

    'savingsGoals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', goal.id,
          'name', goal.name,
          'target_minor', goal.target_minor,
          'allocated_minor', goal.allocated_minor,
          'deadline', to_char(goal.deadline, 'YYYY-MM-DD'),
          'is_archived', goal.is_archived,
          'created_at', public.archive_timestamp(goal.created_at),
          'updated_at', public.archive_timestamp(goal.updated_at)
        )
        order by goal.created_at, goal.id
      )
      from public.savings_goals as goal
      where goal.user_id = v_user_id
    ), '[]'::jsonb),

    'recurringIncomeTemplates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', template.id,
          'name', template.name,
          'amount_minor', template.amount_minor,
          'due_day', template.due_day,
          'account_id', template.account_id,
          'category_id', template.category_id,
          'is_archived', template.is_archived,
          'created_at', public.archive_timestamp(template.created_at),
          'updated_at', public.archive_timestamp(template.updated_at)
        )
        order by template.created_at, template.id
      )
      from public.recurring_income_templates as template
      where template.user_id = v_user_id
    ), '[]'::jsonb),

    'recurringCommitments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', commitment.id,
          'name', commitment.name,
          'amount_minor', commitment.amount_minor,
          'due_day', commitment.due_day,
          'account_id', commitment.account_id,
          'category_id', commitment.category_id,
          'is_archived', commitment.is_archived,
          'created_at', public.archive_timestamp(commitment.created_at),
          'updated_at', public.archive_timestamp(commitment.updated_at)
        )
        order by commitment.created_at, commitment.id
      )
      from public.recurring_commitments as commitment
      where commitment.user_id = v_user_id
    ), '[]'::jsonb),

    'monthlyBudgets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', budget.id,
          'category_id', budget.category_id,
          'month_start', to_char(budget.month_start, 'YYYY-MM-DD'),
          'limit_minor', budget.limit_minor,
          'created_at', public.archive_timestamp(budget.created_at),
          'updated_at', public.archive_timestamp(budget.updated_at)
        )
        order by budget.month_start, budget.id
      )
      from public.monthly_budgets as budget
      where budget.user_id = v_user_id
    ), '[]'::jsonb),

    'inboxRules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rule.id,
          'stage', rule.stage,
          'priority', rule.priority,
          'enabled', rule.enabled,
          'match_field', rule.match_field,
          'contains_text', rule.contains_text,
          'category_id', rule.category_id,
          'merchant_name', rule.merchant_name,
          'version', rule.version,
          'created_at', public.archive_timestamp(rule.created_at),
          'updated_at', public.archive_timestamp(rule.updated_at)
        )
        order by rule.priority, rule.id
      )
      from public.inbox_rules as rule
      where rule.user_id = v_user_id
    ), '[]'::jsonb),

    'accountReconciliations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', reconciliation.id,
          'account_id', reconciliation.account_id,
          'statement_date', to_char(reconciliation.statement_date, 'YYYY-MM-DD'),
          'statement_balance_minor', reconciliation.statement_balance_minor,
          'status', reconciliation.status,
          'calculated_balance_minor', reconciliation.calculated_balance_minor,
          'pending_account_leg_count', reconciliation.pending_account_leg_count,
          'cleared_account_leg_count', reconciliation.cleared_account_leg_count,
          'reconciled_account_leg_count', reconciliation.reconciled_account_leg_count,
          'started_at', public.archive_timestamp(reconciliation.started_at),
          'completed_at', public.archive_timestamp(reconciliation.completed_at),
          'last_reopened_at', public.archive_timestamp(reconciliation.last_reopened_at),
          'created_at', public.archive_timestamp(reconciliation.created_at),
          'updated_at', public.archive_timestamp(reconciliation.updated_at)
        )
        order by reconciliation.created_at, reconciliation.id
      )
      from public.account_reconciliations as reconciliation
      where reconciliation.user_id = v_user_id
    ), '[]'::jsonb),

    -- Soft-deleted transactions are preserved: RLS does not filter `deleted_at`
    -- and neither does this producer. Dropping them would silently rewrite the
    -- user's history.
    'transactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', transaction.id,
          'kind', transaction.kind,
          'note', transaction.note,
          'occurred_on', to_char(transaction.occurred_on, 'YYYY-MM-DD'),
          'idempotency_key', transaction.idempotency_key,
          'review_status', transaction.review_status,
          'created_at', public.archive_timestamp(transaction.created_at),
          'updated_at', public.archive_timestamp(transaction.updated_at),
          'deleted_at', public.archive_timestamp(transaction.deleted_at)
        )
        order by transaction.created_at, transaction.id
      )
      from public.financial_transactions as transaction
      where transaction.user_id = v_user_id
    ), '[]'::jsonb),

    'inboxCandidates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', candidate.id,
          'kind', candidate.kind,
          'amount_minor', candidate.amount_minor,
          'merchant', candidate.merchant,
          'note', candidate.note,
          'occurred_on', to_char(candidate.occurred_on, 'YYYY-MM-DD'),
          'source', candidate.source,
          'confidence', candidate.confidence,
          'status', candidate.status,
          'possible_duplicate', candidate.possible_duplicate,
          'possible_transfer', candidate.possible_transfer,
          'category_id', candidate.category_id,
          'category_name', candidate.category_name,
          'account_id', candidate.account_id,
          'account_name', candidate.account_name,
          'raw_snippet', candidate.raw_snippet,
          'import_batch_id', candidate.import_batch_id,
          'local_id', candidate.local_id,
          'source_row_index', candidate.source_row_index,
          'source_external_id', candidate.source_external_id,
          'fingerprint_version', candidate.fingerprint_version,
          'fingerprint', candidate.fingerprint,
          'parser_version', candidate.parser_version,
          'mapping_version', candidate.mapping_version,
          'match_status', candidate.match_status,
          'match_reason', candidate.match_reason,
          'match_confidence', candidate.match_confidence,
          'applied_rule_id', candidate.applied_rule_id,
          'applied_rule_version', candidate.applied_rule_version,
          'transfer_pair_id', candidate.transfer_pair_id,
          'approved_transaction_id', candidate.approved_transaction_id,
          'approved_at', public.archive_timestamp(candidate.approved_at),
          'created_at', public.archive_timestamp(candidate.created_at),
          'updated_at', public.archive_timestamp(candidate.updated_at)
        )
        order by candidate.created_at, candidate.id
      )
      from public.inbox_candidates as candidate
      where candidate.user_id = v_user_id
    ), '[]'::jsonb),

    'savingsGoalAllocations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', allocation.id,
          'goal_id', allocation.goal_id,
          'amount_minor', allocation.amount_minor,
          'created_at', public.archive_timestamp(allocation.created_at)
        )
        order by allocation.created_at, allocation.id
      )
      from public.savings_goal_allocations as allocation
      where allocation.user_id = v_user_id
    ), '[]'::jsonb),

    'incomeTemplateOccurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', occurrence.id,
          'template_id', occurrence.template_id,
          'month_start', to_char(occurrence.month_start, 'YYYY-MM-DD'),
          'transaction_id', occurrence.transaction_id,
          'received_at', public.archive_timestamp(occurrence.received_at)
        )
        order by occurrence.month_start, occurrence.id
      )
      from public.income_template_occurrences as occurrence
      where occurrence.user_id = v_user_id
    ), '[]'::jsonb),

    'commitmentOccurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', occurrence.id,
          'commitment_id', occurrence.commitment_id,
          'month_start', to_char(occurrence.month_start, 'YYYY-MM-DD'),
          'transaction_id', occurrence.transaction_id,
          'paid_at', public.archive_timestamp(occurrence.paid_at)
        )
        order by occurrence.month_start, occurrence.id
      )
      from public.commitment_occurrences as occurrence
      where occurrence.user_id = v_user_id
    ), '[]'::jsonb),

    'transactionImportProvenance', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'transaction_id', provenance.transaction_id,
          'candidate_id', provenance.candidate_id,
          'import_batch_id', provenance.import_batch_id,
          'source', provenance.source,
          'source_row_index', provenance.source_row_index,
          'original_description', provenance.original_description,
          'source_external_id', provenance.source_external_id,
          'fingerprint_version', provenance.fingerprint_version,
          'fingerprint', provenance.fingerprint,
          'parser_version', provenance.parser_version,
          'mapping_version', provenance.mapping_version,
          'match_status', provenance.match_status,
          'match_reason', provenance.match_reason,
          'match_confidence', provenance.match_confidence,
          'created_at', public.archive_timestamp(provenance.created_at)
        )
        order by provenance.created_at, provenance.transaction_id
      )
      from public.transaction_import_provenance as provenance
      where provenance.user_id = v_user_id
    ), '[]'::jsonb),

    'transactionEntries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', entry.id,
          'transaction_id', entry.transaction_id,
          'account_id', entry.account_id,
          'category_id', entry.category_id,
          'amount_minor', entry.amount_minor,
          'reconciliation_state', entry.reconciliation_state,
          'cleared_at', public.archive_timestamp(entry.cleared_at),
          'reconciliation_id', entry.reconciliation_id,
          'created_at', public.archive_timestamp(entry.created_at)
        )
        order by entry.created_at, entry.id
      )
      from public.transaction_entries as entry
      where entry.user_id = v_user_id
    ), '[]'::jsonb),

    'accountReconciliationEvents', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'reconciliation_id', event.reconciliation_id,
          'account_id', event.account_id,
          'kind', event.kind,
          'statement_balance_minor', event.statement_balance_minor,
          'calculated_balance_minor', event.calculated_balance_minor,
          'occurred_at', public.archive_timestamp(event.occurred_at)
        )
        order by event.occurred_at, event.id
      )
      from public.account_reconciliation_events as event
      where event.user_id = v_user_id
    ), '[]'::jsonb),

    -- Sanitized, non-replayable history (D3). `user_id` and `actor_user_id` are
    -- omitted because the table's own actor-shape CHECK makes `actor_user_id`
    -- exactly `user_id` when `actor_kind = 'user'` and NULL when it is
    -- 'system' — so `actor_kind` already carries that information. `request_id`
    -- is transport metadata and `idempotency_key` deduplicates live writes;
    -- neither has recovery value for history that is never replayed.
    'auditHistory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'actor_kind', event.actor_kind,
          'action', event.action,
          'entity_type', event.entity_type,
          'entity_id', event.entity_id,
          'related_transaction_id', event.related_transaction_id,
          'occurred_at', public.archive_timestamp(event.occurred_at)
        )
        order by event.occurred_at, event.id
      )
      from public.financial_mutation_audit_events as event
      where event.user_id = v_user_id
    ), '[]'::jsonb)
  )
  into v_tables;

  -- Counts are derived from the serialized payload itself, never from separate
  -- COUNT(*) queries. A second query could disagree with what was actually
  -- emitted; reading the payload back makes the count structurally unable to
  -- drift from the collection it describes.
  select jsonb_object_agg(
    collection.key,
    case
      when collection.key = 'profile' then 1
      else jsonb_array_length(collection.value)
    end
  )
  into v_counts
  from jsonb_each(v_tables) as collection;

  return jsonb_build_object(
    'archive_version', 1,
    -- Qualified explicitly: with an empty search_path only pg_catalog is
    -- implicitly visible, and this is the one identifier here whose home schema
    -- is version-sensitive (core since PostgreSQL 13, pgcrypto before that).
    'archive_id', pg_catalog.gen_random_uuid(),
    'produced_at', public.archive_timestamp(clock_timestamp()),
    'schema_generation', '20260804160000',
    'tenant_row_counts', v_counts,
    'tables', v_tables
  );
end;
$$;

revoke all on function public.export_user_archive() from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'Read-only archive v1 producer for the calling tenant. SECURITY INVOKER so row level security enforces tenant isolation structurally.';
