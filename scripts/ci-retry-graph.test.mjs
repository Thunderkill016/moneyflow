import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

function jobBlock(jobId) {
  const marker = `  ${jobId}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing CI job: ${jobId}`);

  const remainder = workflow.slice(start + marker.length);
  const nextJob = remainder.match(/\n  [a-zA-Z0-9_]+:\n/);
  const end = nextJob ? start + marker.length + nextJob.index : workflow.length;
  return workflow.slice(start, end);
}

test("stable verify check summarizes retryable verification shards", () => {
  for (const jobId of [
    "verify_policy",
    "verify_static",
    "verify_tests",
    "verify_build",
    "verify",
  ]) {
    jobBlock(jobId);
  }

  const verify = jobBlock("verify");
  assert.match(verify, /if: always\(\)/);
  assert.match(
    verify,
    /needs: \[classify, verify_policy, verify_static, verify_tests, verify_build\]/,
  );
  assert.doesNotMatch(verify, /npm ci|npm run lint|npm run typecheck|npm run test|npm run build/);
});

test("stable database check summarizes the conditional database executor", () => {
  const databaseChecks = jobBlock("database_checks");
  const database = jobBlock("database");

  assert.match(databaseChecks, /needs\.classify\.outputs\.database == 'true'/);
  assert.match(databaseChecks, /supabase\/setup-cli/);
  assert.match(databaseChecks, /supabase db reset --local/);
  assert.match(database, /if: always\(\)/);
  assert.match(database, /needs: \[classify, database_checks\]/);
  assert.match(database, /needs\.database_checks\.result/);
  assert.doesNotMatch(
    database,
    /actions\/checkout|supabase\/setup-cli|supabase db|upload-artifact/,
  );
});

test("stable e2e check summarizes independently retryable browser shards", () => {
  const browserSmoke = jobBlock("browser_smoke");
  const uiAudit = jobBlock("ui_audit");
  const e2e = jobBlock("e2e");

  assert.match(browserSmoke, /needs\.classify\.outputs\.browser_smoke == 'true'/);
  assert.match(uiAudit, /needs\.classify\.outputs\.ui_audit == 'true'/);
  assert.match(e2e, /if: always\(\)/);
  assert.match(e2e, /needs: \[classify, verify, browser_smoke, ui_audit\]/);
  assert.doesNotMatch(e2e, /playwright install|npm run test:e2e|npm run test:ui-audit:pr/);
});

test("read-only workflow checkouts do not persist repository credentials", () => {
  const checkoutCount = (workflow.match(/uses: actions\/checkout@/g) ?? []).length;
  const noCredentialCount = (workflow.match(/persist-credentials: false/g) ?? []).length;

  assert.equal(checkoutCount, 8);
  assert.equal(noCredentialCount, checkoutCount);
});

test("retry artifacts are unique per workflow attempt", () => {
  assert.match(workflow, /failing-test-output-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow, /failing-database-test-output-\$\{\{ github\.run_attempt \}\}/);
  assert.match(
    workflow,
    /browser-smoke-evidence-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
  assert.match(
    workflow,
    /ui-audit-evidence-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
});
