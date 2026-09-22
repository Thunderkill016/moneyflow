import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * Server actions cannot be invoked under `node --test` without a Supabase
 * client, so this pins the contract the action and the migration must keep in
 * lockstep: payload keys, error codes and the fixed statement label.
 */
const action = readFileSync("src/app/actions/reconciliation.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260923013000_reconciliation_adjustment_completion.sql",
  "utf8",
);
const lib = readFileSync("src/lib/reconciliation.ts", "utf8");

test("the completion action forwards the adjustment parameters to the RPC", () => {
  assert.match(
    action,
    /supabase\.rpc\("complete_account_reconciliation",\s*\{[\s\S]*p_reconciliation_id:[\s\S]*p_adjustment_category_id:[\s\S]*p_adjustment_payee:[\s\S]*\}\)/,
  );
  assert.match(
    action,
    /adjustmentCategoryId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/,
  );
  assert.match(action, /adjustmentPayee:\s*z\.string\(\)\.trim\(\)\.max\(200\)/);
});

test("the completion action maps the adjustment validation errors", () => {
  for (const code of [
    "category_kind_mismatch",
    "category_archived",
    "note_too_long",
    "payee_too_long",
  ]) {
    assert.ok(
      action.includes(`"${code}"`),
      `reconciliationError must map ${code}`,
    );
  }
});

test("the migration keeps the fixed label and statement-date leg", () => {
  assert.match(
    migration,
    /p_adjustment_category_id uuid default null/,
  );
  assert.match(migration, /Điều chỉnh đối soát — sao kê /);
  assert.match(
    migration,
    /to_char\(v_statement_date, 'DD\/MM\/YYYY'\)/,
  );
  /*
   * occurred_on must be the statement date — the snapshot only counts
   * `occurred_on <= statement_date`, so any later date can never close the gap.
   */
  assert.match(migration, /v_statement_date,\s*\n\s*md5\(/);
  assert.match(migration, /'reconciled',\s*\n\s*now\(\),\s*\n\s*p_reconciliation_id/);
  assert.match(
    migration,
    /v_event_calculated,\s*\n\s*v_difference\s*\n/,
  );
});

test("the demo path builds the same fixed label as the migration", () => {
  assert.match(
    lib,
    /Điều chỉnh đối soát — sao kê \$\{label\}/,
  );
  assert.match(lib, /occurredOn: session\.statementDate/);
  assert.match(lib, /state: "reconciled"/);
});
