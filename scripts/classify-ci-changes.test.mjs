import test from "node:test";
import assert from "node:assert/strict";
import { classifyChanges } from "./classify-ci-changes.mjs";

test("docs-only changes skip heavy web, database, and mobile verification", () => {
  const result = classifyChanges(["README.md", "docs-extra.md"]);
  assert.equal(result.docs_only, true);
  assert.equal(result.full_verify, false);
  assert.equal(result.database, false);
  assert.equal(result.mobile, false);
});

test("core engine changes trigger full web verification without forcing mobile", () => {
  const result = classifyChanges([
    "src/core/engine/ledger.engine.ts",
    "src/views/desktop/desktop-terminal-view.tsx",
  ]);
  assert.equal(result.docs_only, false);
  assert.equal(result.full_verify, true);
  assert.equal(result.codeql, true);
  assert.equal(result.mobile, false);
  assert.equal(result.database, false);
});

test("core storage or legacy database changes trigger database suite", () => {
  const storageResult = classifyChanges(["src/core/storage/legacy-migrator.ts"]);
  assert.equal(storageResult.database, true);
  assert.equal(storageResult.full_verify, true);

  const legacyResult = classifyChanges([
    "supabase/migrations/20261001000000_init.sql",
    "db/compat/pgtap.sql",
  ]);
  assert.equal(legacyResult.database, true);
  assert.equal(legacyResult.full_verify, false);
  assert.equal(legacyResult.mobile, false);
});

test("mobile changes trigger mobile verification", () => {
  const result = classifyChanges(["mobile/lib/fintech/state/app_state.dart"]);
  assert.equal(result.mobile, true);
  assert.equal(result.docs_only, false);
});

test("workflow and package changes trigger full verification", () => {
  const result = classifyChanges(["package.json", ".github/workflows/ci.yml"]);
  assert.equal(result.full_verify, true);
});
