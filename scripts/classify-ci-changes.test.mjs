import assert from "node:assert/strict";
import test from "node:test";

import { classifyChanges } from "./classify-ci-changes.mjs";

test("documentation-only changes keep heavyweight checks off", () => {
  const result = classifyChanges(["README.md", "docs/product/PRINCIPLES.md"]);
  assert.equal(result.docsOnly, true);
  assert.equal(result.fullVerify, false);
  assert.equal(result.database, false);
  assert.equal(result.browserSmoke, false);
  assert.equal(result.uiAudit, false);
  assert.equal(result.codeql, false);
});

test("database-only changes run database checks without browser work", () => {
  const result = classifyChanges([
    "supabase/migrations/20260802060004_cover_foreign-key-indexes.sql",
    "supabase/tests/database/foreign-key-indexes.test.sql",
  ]);
  assert.equal(result.docsOnly, false);
  assert.equal(result.fullVerify, false);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, false);
  assert.equal(result.uiAudit, false);
  assert.equal(result.codeql, false);
});

test("the archive round-trip verifier selects the database job that runs it", () => {
  for (const file of [
    "scripts/verify-archive-producer.sh",
    "scripts/verify-archive-producer.mjs",
  ]) {
    const result = classifyChanges([file]);
    assert.equal(result.database, true, `${file} must select the database job`);
  }
});

test("domain runtime changes run verify and browser smoke but not visual audit", () => {
  const result = classifyChanges(["src/lib/reports/weekly-summary.ts"]);
  assert.equal(result.fullVerify, true);
  assert.equal(result.database, false);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, false);
  assert.equal(result.codeql, true);
});

test("UI changes run browser smoke and responsive audit", () => {
  const result = classifyChanges(["src/components/layout/app-shell.module.css"]);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, true);
  assert.equal(result.codeql, false);
});

test("server-only app changes do not trigger the responsive audit", () => {
  const result = classifyChanges(["src/app/settings/actions.ts"]);
  assert.equal(result.fullVerify, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, false);
  assert.equal(result.codeql, true);
});

test("CI workflow changes exercise every gate", () => {
  const result = classifyChanges([".github/workflows/ci.yml"]);
  assert.equal(result.fullVerify, true);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, true);
  assert.equal(result.codeql, true);
});

test("UI migration policy changes exercise every gate", () => {
  const result = classifyChanges(["scripts/check-ui-migration-diff.mjs"]);
  assert.equal(result.fullVerify, true);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, true);
  assert.equal(result.codeql, true);
});

test("plan, lifecycle, and agent-harness policy changes exercise every gate", () => {
  for (const file of [
    "scripts/plan-authority.mjs",
    "scripts/plan-authority.test.mjs",
    "scripts/plan-selection.mjs",
    "scripts/plan-selection.test.mjs",
    "scripts/lifecycle-projection.mjs",
    "scripts/lifecycle-projection.test.mjs",
    "scripts/agent-doctor-entry.mjs",
    "scripts/agent-doctor-entry.test.mjs",
    "scripts/agent-harness/runtime.mjs",
    "scripts/agent-harness/journal.mjs",
    "scripts/agent-harness/providers.mjs",
    "scripts/agent-harness/command-guard.mjs",
    "scripts/agent-dispatcher/dispatcher.mjs",
    "docs/plans/PLAN_AUTHORITY.json",
  ]) {
    const result = classifyChanges([file]);
    assert.equal(result.fullVerify, true, `${file} must select full verify`);
    assert.equal(result.database, true, `${file} must select database verification`);
    assert.equal(result.browserSmoke, true, `${file} must select browser smoke`);
    assert.equal(result.uiAudit, true, `${file} must select UI audit`);
    assert.equal(result.codeql, true, `${file} must select CodeQL`);
  }
});

test("manual and main-branch runs fail safe to full verification", () => {
  const result = classifyChanges(["docs/README.md"], { forceFull: true });
  assert.equal(result.fullVerify, true);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, true);
  assert.equal(result.codeql, true);
});

/*
 * `playwright.audit.config.ts` runs the audit with NEXT_PUBLIC_APP_MODE "demo",
 * so the demo fixtures define every value it measures. Before this rule a
 * change to what each screen renders selected no visual gate, which is how the
 * /reports overflow reached main (issue #491).
 */
test("demo fixtures select the visual audit, because the audit renders demo", () => {
  const result = classifyChanges(["src/lib/demo/transaction-fixtures.ts"]);
  assert.equal(result.uiAudit, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.fullVerify, true);
});

test("the rule stays narrow: other domain modules still skip the visual audit", () => {
  /*
   * Widening to all of src/lib/ would select a ten-minute audit for most domain
   * work, against the risk-proportional principle. This pins that it did not
   * happen by accident.
   */
  for (const file of [
    "src/lib/finance.ts",
    "src/lib/planning/budgets.ts",
    "src/lib/inbox/parse-text.ts",
  ]) {
    assert.equal(classifyChanges([file]).uiAudit, false, `${file} must not select the audit`);
  }
});

test("the PR #487 file list would now select the visual audit", () => {
  /*
   * The real regression, replayed. These are the paths from merge commit
   * c79a0e87, which returned no UI-audit selection and let a nine-digit income
   * overflow its cell on /reports reach main.
   */
  const pr487 = [
    "docs/plans/active/README.md",
    "docs/research/CURRENT_PROJECT_MEMORY.md",
    "e2e/account-register-detail.spec.ts",
    "e2e/support/demo-ledger.ts",
    "src/lib/demo/transaction-fixtures.ts",
    "src/lib/demo/demo-consistency.test.ts",
    "src/lib/finance.ts",
    "src/server/budgets.ts",
  ];
  assert.equal(classifyChanges(pr487).uiAudit, true);
});
