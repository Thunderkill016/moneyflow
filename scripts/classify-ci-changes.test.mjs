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
  assert.equal(result.fullVerify, false);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, false);
});

test("the archive round-trip verifier selects the database job that runs it", () => {
  for (const file of ["scripts/verify-archive-producer.sh", "scripts/verify-archive-producer.mjs"]) {
    assert.equal(classifyChanges([file]).database, true, `${file} must select the database job`);
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
});

test("CI workflow changes exercise every gate", () => {
  const result = classifyChanges([".github/workflows/ci.yml"]);
  for (const key of ["fullVerify", "database", "browserSmoke", "uiAudit", "codeql"]) assert.equal(result[key], true);
});

test("knowledge-policy and agent-harness changes exercise every gate", () => {
  for (const file of [
    "scripts/check-project-knowledge.mjs",
    "scripts/project-knowledge-contract.mjs",
    "scripts/project-knowledge-contract.test.mjs",
    "scripts/active-packet-registry.mjs",
    "scripts/agent-doctor.mjs",
    "scripts/agent-harness/runtime.mjs",
    "scripts/agent-harness/journal.mjs",
    "scripts/agent-dispatcher/dispatcher.mjs",
    "docs/research/PROJECT_KNOWLEDGE_CONTRACT.json",
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
  for (const key of ["fullVerify", "database", "browserSmoke", "uiAudit", "codeql"]) assert.equal(result[key], true);
});

test("demo fixtures select the visual audit because the audit renders demo", () => {
  const result = classifyChanges(["src/lib/demo/transaction-fixtures.ts"]);
  assert.equal(result.uiAudit, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.fullVerify, true);
});

test("the visual rule stays narrow for other domain modules", () => {
  for (const file of ["src/lib/finance.ts", "src/lib/planning/budgets.ts", "src/lib/inbox/parse-text.ts"]) {
    assert.equal(classifyChanges([file]).uiAudit, false, `${file} must not select the audit`);
  }
});

test("the historical PR #487 file list still selects the visual audit", () => {
  const pr487 = [
    "docs/plans/active/README.md",
    "e2e/account-register-detail.spec.ts",
    "e2e/support/demo-ledger.ts",
    "src/lib/demo/transaction-fixtures.ts",
    "src/lib/demo/demo-consistency.test.ts",
    "src/lib/finance.ts",
    "src/server/budgets.ts",
  ];
  assert.equal(classifyChanges(pr487).uiAudit, true);
});
