import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

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
  assert.doesNotMatch(
    verify,
    /npm ci|npm run lint|npm run typecheck|npm run test|npm run build/,
  );
});

test("stable e2e check summarizes independently retryable browser shards", () => {
  const browserSmoke = jobBlock("browser_smoke");
  const uiAudit = jobBlock("ui_audit");
  const e2e = jobBlock("e2e");

  assert.match(
    browserSmoke,
    /needs\.classify\.outputs\.browser_smoke == 'true'/,
  );
  assert.match(uiAudit, /needs\.classify\.outputs\.ui_audit == 'true'/);
  assert.match(e2e, /if: always\(\)/);
  assert.match(
    e2e,
    /needs: \[classify, verify, browser_smoke, ui_audit, verify_mobile\]/,
  );
  assert.doesNotMatch(
    e2e,
    /playwright install|npm run test:e2e|npm run test:ui-audit:pr|flutter /,
  );
});

test("the Flutter mobile shard is gated on its own classifier output", () => {
  const mobile = jobBlock("verify_mobile");

  assert.match(mobile, /needs\.classify\.outputs\.mobile == 'true'/);
  // The repo pins the toolchain in mobile/.metadata; the job must consume that
  // pin instead of a floating channel or hardcoded version.
  assert.match(mobile, /mobile\/\.metadata/);
  assert.match(mobile, /flutter pub get --enforce-lockfile/);
  assert.match(mobile, /flutter analyze/);
  assert.match(mobile, /flutter test/);
  // The Kotlin notification-source allowlist has JVM tests; the shard must
  // run them so Dart coverage is not the only mobile signal.
  assert.match(mobile, /testDebugUnitTest/);
});

test("retry artifacts are unique per workflow attempt", () => {
  assert.match(workflow, /failing-test-output-\$\{\{ github\.run_attempt \}\}/);
  assert.match(
    workflow,
    /failing-database-test-output-\$\{\{ github\.run_attempt \}\}/,
  );
  assert.match(
    workflow,
    /browser-smoke-evidence-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
  assert.match(
    workflow,
    /ui-audit-evidence-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
});
