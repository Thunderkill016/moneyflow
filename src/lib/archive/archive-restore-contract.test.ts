import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALL_ARCHIVE_COLLECTIONS, ARCHIVE_ROW_SPECS } from "./moneyflow-archive.ts";

/**
 * R7 drift evidence.
 *
 * The restore RPC re-proves the archive contract in SQL because it is reachable
 * without the TypeScript validator. Two implementations of one contract can
 * drift, so these assertions keep them aligned: the SQL must reject the same
 * families the pure validator rejects, and it must write every collection the
 * contract declares restorable.
 *
 * Test-only parsing of one migration. No runtime code reads SQL.
 */

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260812010000_restore_user_archive.sql", import.meta.url),
  "utf8",
);
const restoreBody = migration.slice(migration.indexOf("function public.restore_user_archive"));

test("the SQL validator rejects the same contract families as the pure validator", () => {
  // Each of these mirrors a rejection code in moneyflow-archive-validator.ts.
  for (const rejection of [
    "archive_not_object",
    "archive_version_unsupported",
    "schema_generation_unsupported",
    "archive_id_malformed",
    "produced_at_malformed",
    "tables_not_object",
    "collection_missing",
    "collection_not_array",
    "collection_unknown",
    "profile_not_object",
    "owner_authority_field_present",
    "money_out_of_safe_range",
    "reference_not_found",
    "self_reference_to_own_row",
    "duplicate_row_id",
    "transaction_without_entries",
    "entry_amount_zero",
    "entry_category_kind_mismatch",
    "entry_reconciliation_shape_invalid",
    "allocated_exceeds_target",
  ]) {
    assert.ok(
      migration.includes(`raise exception '${rejection}'`),
      `the database validator must reject ${rejection} before the first domain write`,
    );
  }
  // The shape families the RPCs own, asserted under their SQL-side names.
  for (const shape of ["income_shape_invalid", "expense_shape_invalid", "transfer_shape_invalid"]) {
    assert.ok(migration.includes(`raise exception '${shape}'`), `missing ${shape}`);
  }
});

test("every restorable collection is actually written by the restore", () => {
  const skipped = new Set(["auditHistory", "profile"]);
  const tableFor: Record<string, string> = {
    categories: "public.categories",
    accounts: "public.accounts",
    importBatches: "public.import_batches",
    savingsGoals: "public.savings_goals",
    recurringIncomeTemplates: "public.recurring_income_templates",
    recurringCommitments: "public.recurring_commitments",
    monthlyBudgets: "public.monthly_budgets",
    inboxRules: "public.inbox_rules",
    accountReconciliations: "public.account_reconciliations",
    transactions: "public.financial_transactions",
    inboxCandidates: "public.inbox_candidates",
    savingsGoalAllocations: "public.savings_goal_allocations",
    incomeTemplateOccurrences: "public.income_template_occurrences",
    commitmentOccurrences: "public.commitment_occurrences",
    transactionImportProvenance: "public.transaction_import_provenance",
    transactionEntries: "public.transaction_entries",
    accountReconciliationEvents: "public.account_reconciliation_events",
  };
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (skipped.has(collection)) continue;
    const target = tableFor[collection];
    assert.ok(target, `${collection} has no mapped table — the restore map is incomplete`);
    assert.ok(
      restoreBody.includes(`insert into ${target} (`),
      `${collection} must be inserted into ${target}`,
    );
    assert.ok(
      restoreBody.includes(`v_tables -> '${collection}'`),
      `${collection} must be read from the archive payload`,
    );
  }
  // The profile is updated onto the target identity, never inserted.
  assert.ok(restoreBody.includes("update public.profiles as target set"));
  // auditHistory must never reach the live audit table.
  assert.ok(
    !restoreBody.includes("insert into public.financial_mutation_audit_events"),
    "archived audit history must never be replayed",
  );
});

test("the restore never trusts source ownership", () => {
  // Every insert must supply v_user_id, never a user_id read from the archive.
  assert.ok(
    !/select\s+[^;]*s\.user_id/u.test(restoreBody),
    "no insert may take user_id from the archive payload",
  );
  assert.ok(
    restoreBody.includes("v_user_id uuid := auth.uid()"),
    "identity must come from auth.uid()",
  );
  assert.ok(
    migration.includes("create or replace function public.restore_user_archive(p_archive jsonb)"),
    "restore must accept only an archive, never a caller-supplied tenant id",
  );
});

test("the restore is hardened the way the repository requires of privileged RPCs", () => {
  assert.ok(restoreBody.includes("security definer"));
  assert.ok(restoreBody.includes("set search_path = ''"));
  assert.ok(restoreBody.includes("raise exception 'authentication_required'"));
  assert.ok(
    migration.includes("revoke all on function public.restore_user_archive(jsonb) from public, anon, authenticated"),
  );
  assert.ok(
    migration.includes("grant execute on function public.restore_user_archive(jsonb) to authenticated"),
  );
  // No dynamic SQL in a privileged writer.
  assert.ok(!/\bexecute\s+format\(/u.test(restoreBody), "the restore must not build dynamic SQL");
});

test("concurrent restores into one tenant are serialized by a transaction lock", () => {
  assert.ok(
    restoreBody.includes("pg_advisory_xact_lock"),
    "restore must take a tenant-scoped lock so two callers cannot both pass the empty check",
  );
  assert.ok(
    !restoreBody.includes("pg_advisory_lock("),
    "a session lock would outlive the transaction and must not be used here",
  );
});

test("the restore neither commits nor swallows errors", () => {
  // Comments stripped first: the body documents what happens "at COMMIT", and
  // prose must not fail a check about executable code.
  const code = restoreBody.replace(/--.*$/gmu, "");
  assert.ok(!/\bcommit\b/iu.test(code), "the function must not commit inside itself");
  assert.ok(
    !/\bexception\s+when\b/iu.test(code),
    "no per-row exception recovery: a failure must roll the whole restore back",
  );
  assert.ok(
    restoreBody.includes("set constraints all immediate"),
    "the deferred reconciliation check must be forced before the function returns",
  );
});

test("the batch model supports attribution and a defined removal", () => {
  assert.ok(migration.includes("create table if not exists public.archive_restore_batches"));
  assert.ok(migration.includes("create table if not exists public.archive_restore_rows"));
  assert.ok(
    migration.includes("on public.archive_restore_batches (user_id, archive_id)")
      && migration.includes("where status = 'restored'"),
    "at most one live restore per (tenant, archive), while allowing a retry after removal",
  );
  assert.ok(migration.includes("raise exception 'archive_already_restored'"));
  assert.ok(migration.includes("raise exception 'restore_target_not_empty'"));
  assert.ok(migration.includes("raise exception 'restore_batch_not_pristine'"));
  assert.ok(migration.includes("raise exception 'restore_batch_not_found'"));
  // Removal must be attribution-driven, not a blanket tenant wipe.
  assert.ok(
    migration.includes("from public.archive_restore_rows"),
    "removal must delete exactly the rows attributed to the batch",
  );
});

test("the empty-target check covers every tenant table", () => {
  const eligibility = restoreBody.slice(
    restoreBody.indexOf("-- Empty/bootstrap-only eligibility"),
    restoreBody.indexOf("raise exception 'restore_target_not_empty'"),
  );
  const tables = [
    "categories",
    "accounts",
    "financial_transactions",
    "transaction_entries",
    "monthly_budgets",
    "recurring_commitments",
    "commitment_occurrences",
    "recurring_income_templates",
    "income_template_occurrences",
    "savings_goals",
    "savings_goal_allocations",
    "import_batches",
    "inbox_candidates",
    "inbox_rules",
    "account_reconciliations",
    "account_reconciliation_events",
    "transaction_import_provenance",
    "financial_mutation_audit_events",
  ];
  for (const table of tables) {
    assert.ok(
      eligibility.includes(`public.${table} `),
      `the eligibility check must inspect ${table}, or a used tenant could slip through`,
    );
  }
});

test("the pgTAP suite covers the restore boundary", () => {
  const suite = readFileSync(
    new URL("../../../supabase/tests/database/restore_user_archive.test.sql", import.meta.url),
    "utf8",
  );
  const planned = Number.parseInt(/select plan\((\d+)\)/u.exec(suite)?.[1] ?? "0", 10);
  const asserted = (suite.match(/^select (is|isnt|ok)\(/gmu) ?? []).length;
  assert.equal(planned, asserted, "the pgTAP plan must match the assertion count");
  assert.ok(planned >= 30, "the restore boundary deserves substantial database evidence");
  for (const required of [
    "anon cannot execute restore",
    "authentication_required",
    "restore_target_not_empty",
    "archive_already_restored",
    "restore_batch_not_pristine",
    "semantically identical",
    "no archived audit event id is replayed",
  ]) {
    assert.ok(suite.includes(required), `pgTAP must cover: ${required}`);
  }
});

test("the SQL required-key map matches ARCHIVE_ROW_SPECS exactly", () => {
  // Without this the SQL could omit a field, jsonb_to_recordset would supply
  // NULL, and a soft-deleted transaction could restore as live.
  for (const [collection, spec] of Object.entries(ARCHIVE_ROW_SPECS)) {
    const entry = new RegExp(`'${collection}', to_jsonb\\(array\\[([^\\]]*)\\]\\)`, "u").exec(migration);
    assert.ok(entry, `the SQL key map must cover ${collection}`);
    const sqlKeys = entry[1].split(",").map((k) => k.trim().replace(/'/gu, "")).sort();
    assert.deepEqual(
      sqlKeys,
      Object.keys(spec.fields).sort(),
      `${collection}: the SQL key map has drifted from the contract`,
    );
  }
  assert.ok(migration.includes("raise exception 'row_shape_invalid'"));
});

test("removal detects edits and reverts the profile", () => {
  assert.ok(migration.includes("row_hash text not null"), "attribution must record a content digest");
  assert.ok(migration.includes("md5(to_jsonb(t.*)::text)"), "the digest must be computed from row content");
  assert.ok(migration.includes("previous_profile jsonb"), "the pre-restore profile must be snapshotted");
  assert.ok(
    /update public\.profiles as target set[\s\S]{0,400}v_batch\.previous_profile|v_batch\.previous_profile[\s\S]{0,400}update public\.profiles/u.test(migration),
    "removal must revert the profile it overwrote",
  );
});

test("a removed batch's audit events do not block a corrected restore", () => {
  const eligibility = restoreBody.slice(
    restoreBody.indexOf("-- Empty/bootstrap-only eligibility"),
    restoreBody.indexOf("raise exception 'restore_target_not_empty'"),
  );
  assert.ok(
    eligibility.includes("archive_restore_rows"),
    "audit events attributable to a previous restore must not count as tenant activity",
  );
});

test("the contract still declares nineteen dispositions", () => {
  assert.equal(ALL_ARCHIVE_COLLECTIONS.length, 19);
  assert.equal(Object.keys(ARCHIVE_ROW_SPECS).length, 19);
});
