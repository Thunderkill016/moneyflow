import assert from "node:assert/strict";
import test from "node:test";
import { ARCHIVE_TABLE_INVENTORY } from "./moneyflow-archive.ts";
import { evaluateRestoreTargetState } from "./restore-target-state.ts";

/**
 * D2 — restore v1 is empty-only. The one exception is the state `handle_new_user`
 * creates on signup, which no user can avoid: one profile, one cash account and
 * the default categories.
 */

const TENANT_TABLES = ARCHIVE_TABLE_INVENTORY.map((entry) => entry.table);

function counts(overrides: Record<string, number> = {}): Record<string, number> {
  const base: Record<string, number> = {};
  for (const table of TENANT_TABLES) base[table] = 0;
  return { ...base, ...overrides };
}

test("a truly empty tenant is eligible", () => {
  const result = evaluateRestoreTargetState({ counts: counts(), nonDefaultCategoryCount: 0 });
  assert.ok(result.eligible);
  assert.equal(result.bootstrapOnly, false);
});

test("a freshly signed-up tenant is eligible as bootstrap-only", () => {
  // Exactly what handle_new_user creates: 1 profile, 1 account, 11 defaults.
  const result = evaluateRestoreTargetState({
    counts: counts({ profiles: 1, accounts: 1, categories: 11 }),
    nonDefaultCategoryCount: 0,
  });
  assert.ok(result.eligible);
  assert.equal(result.bootstrapOnly, true);
});

test("one financial transaction makes the target ineligible", () => {
  const result = evaluateRestoreTargetState({
    counts: counts({ profiles: 1, accounts: 1, categories: 11, financial_transactions: 1 }),
    nonDefaultCategoryCount: 0,
  });
  assert.ok(!result.eligible);
  assert.deepEqual(result.reasons, [{ code: "table_not_empty", table: "financial_transactions" }]);
});

test("a second account makes the target ineligible", () => {
  const result = evaluateRestoreTargetState({
    counts: counts({ profiles: 1, accounts: 2, categories: 11 }),
    nonDefaultCategoryCount: 0,
  });
  assert.ok(!result.eligible);
  assert.deepEqual(result.reasons, [{ code: "accounts_exceed_bootstrap", table: "accounts" }]);
});

test("a single user-created category makes the target ineligible", () => {
  const result = evaluateRestoreTargetState({
    counts: counts({ profiles: 1, accounts: 1, categories: 12 }),
    nonDefaultCategoryCount: 1,
  });
  assert.ok(!result.eligible);
  assert.deepEqual(result.reasons, [{ code: "categories_beyond_bootstrap", table: "categories" }]);
});

test("every other tenant domain independently blocks a restore", () => {
  const domains = TENANT_TABLES.filter(
    (table) => !["profiles", "accounts", "categories"].includes(table),
  );
  assert.ok(domains.length === 16, "expected sixteen non-bootstrap tenant tables");
  for (const table of domains) {
    const result = evaluateRestoreTargetState({
      counts: counts({ profiles: 1, accounts: 1, categories: 11, [table]: 1 }),
      nonDefaultCategoryCount: 0,
    });
    assert.ok(!result.eligible, `${table} must block a restore`);
    assert.deepEqual(result.reasons, [{ code: "table_not_empty", table }]);
  }
});

test("planning, import, rule and reconciliation rows each block a restore", () => {
  for (const table of [
    "monthly_budgets",
    "recurring_commitments",
    "savings_goals",
    "import_batches",
    "inbox_candidates",
    "inbox_rules",
    "account_reconciliations",
    "financial_mutation_audit_events",
  ]) {
    const result = evaluateRestoreTargetState({
      counts: counts({ [table]: 1 }),
      nonDefaultCategoryCount: 0,
    });
    assert.ok(!result.eligible, `${table} must block a restore`);
  }
});

test("unknown state is rejected rather than guessed", () => {
  const partial = counts();
  delete partial.transaction_entries;
  const result = evaluateRestoreTargetState({ counts: partial, nonDefaultCategoryCount: 0 });
  assert.ok(!result.eligible);
  assert.deepEqual(result.reasons, [
    { code: "table_count_missing", table: "transaction_entries" },
  ]);
});

test("a malformed snapshot is rejected", () => {
  for (const input of [null, undefined, 1, "empty", [], {}, { counts: {} }]) {
    const result = evaluateRestoreTargetState(input);
    assert.ok(!result.eligible, `${JSON.stringify(input)} must be rejected`);
  }
});

test("malformed or negative counts are rejected, never coerced", () => {
  for (const value of ["0", 1.5, -1, Number.NaN, null]) {
    const result = evaluateRestoreTargetState({
      counts: counts({ accounts: value as unknown as number }),
      nonDefaultCategoryCount: 0,
    });
    assert.ok(!result.eligible, `${String(value)} must be rejected`);
  }
});

test("a malformed non-default category count is rejected", () => {
  for (const value of ["0", -1, 1.5, Number.NaN]) {
    const result = evaluateRestoreTargetState({
      counts: counts(),
      nonDefaultCategoryCount: value as unknown as number,
    });
    assert.ok(!result.eligible);
  }
});

test("the evaluator does not mutate its input", () => {
  const snapshot = { counts: counts({ profiles: 1 }), nonDefaultCategoryCount: 0 };
  const before = JSON.stringify(snapshot);
  evaluateRestoreTargetState(snapshot);
  assert.equal(JSON.stringify(snapshot), before);
});

test("all nineteen tenant tables are checked", () => {
  // A table absent from the policy would be an invisible hole in the
  // empty-target precondition.
  const result = evaluateRestoreTargetState({ counts: {}, nonDefaultCategoryCount: 0 });
  assert.ok(!result.eligible);
  assert.equal(result.reasons.length, 19);
  assert.ok(result.reasons.every((reason) => reason.code === "table_count_missing"));
});
