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

test("manual and main-branch runs fail safe to full verification", () => {
  const result = classifyChanges(["docs/README.md"], { forceFull: true });
  assert.equal(result.fullVerify, true);
  assert.equal(result.database, true);
  assert.equal(result.browserSmoke, true);
  assert.equal(result.uiAudit, true);
  assert.equal(result.codeql, true);
});
