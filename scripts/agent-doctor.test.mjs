import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDoctorReport,
  collectChangedFiles,
  environmentPresence,
} from "./agent-doctor.mjs";

/**
 * The doctor reports on *this machine* and projects policy; it owns no policy of
 * its own. These tests hold that line and check the two ways a diagnostics tool
 * does damage: leaking a secret value, or letting local green read as done.
 */

const doctorSource = readFileSync("scripts/agent-doctor.mjs", "utf8");
const executable = doctorSource
  .replace(/\/\*[\s\S]*?\*\//gu, "")
  .replace(/\/\/.*$/gmu, "");

test("the doctor derives policy from the policy module rather than hard-coding it", () => {
  assert.ok(executable.includes('from "./agent-policy.mjs"'));
  // The doctor must not reach past the policy module to the classifier: two
  // consumers of the classifier would be two places to keep in step.
  assert.ok(
    !executable.includes("classify-ci-changes.mjs"),
    "the doctor must go through agent-policy.mjs, not around it",
  );
  /**
   * Forbidding the identifier names `GATE_COMMANDS` and `RISK_CLASSES` only
   * forbade two spellings — `FALLBACK_GATES = {...}` sailed through. What
   * actually matters is that no policy *value* is written here, whatever the
   * variable is called.
   */
  assert.ok(
    !executable.includes("npm run "),
    "the doctor must not name a gate command; agent-policy.mjs owns the table",
  );
  for (const context of ["Gitleaks all refs", "Analyze JavaScript and TypeScript"]) {
    assert.ok(!executable.includes(context), `the doctor must not declare the ${context} context`);
  }
  // Nor a risk-class label, which would be a second answer to "how heavy is this".
  assert.ok(!executable.includes("full work packet under"));
});

test("--files drives the report, so task shapes are reproducible", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "docs/example.md"],
    env: {},
  });
  assert.deepEqual(report.changedFiles, ["docs/example.md"]);
  assert.equal(report.riskClass.class, 0);
  assert.equal(report.classification.docsOnly, true);
  assert.deepEqual(report.localGatePlan, [
    "npm run check:migrations",
    "npm run check:knowledge",
    "npm run test:ci-policy",
  ]);
});

test("a database task reports the heavier plan and the approval boundary", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "supabase/migrations/20260812070000_x.sql"],
    env: {},
  });
  assert.equal(report.riskClass.class, 3);
  assert.ok(report.localGatePlan.some((command) => command.includes("test:db")));
  assert.equal(report.approval.requiredForThisDiff, "none");
  assert.equal(report.approval.ownerApprovalRequiredBeforeDeployment, true);
  assert.equal(report.approval.granted, false);
});

test("collectChangedFiles honours an explicit --files list and stops at the next flag", () => {
  assert.deepEqual(
    collectChangedFiles({ argv: ["node", "x", "--files", "a.md", "b.ts", "--json"] }),
    ["a.md", "b.ts"],
  );
  /**
   * Filtering flags out instead of stopping at one kept the *operand* of the
   * following flag, so `origin/main` became a changed file and skewed the risk
   * class of every run that passed --base-ref after --files.
   */
  assert.deepEqual(
    collectChangedFiles({ argv: ["node", "x", "--files", "a.md", "--base-ref", "origin/main"] }),
    ["a.md"],
  );
  assert.deepEqual(collectChangedFiles({ argv: ["node", "x", "--files", "--json"] }), []);
});

test("the report never carries an environment value, only presence", () => {
  const secret = "sb-secret-value-should-never-appear";
  const env = {
    NEXT_PUBLIC_APP_MODE: "authenticated",
    NEXT_PUBLIC_SUPABASE_URL: `https://${secret}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
    SUPABASE_SERVICE_ROLE_KEY: secret,
  };
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "docs/example.md"],
    env,
  });
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(secret), "no environment value may reach the report");
  // The absolute checkout path carries the OS username; only the basename ships.
  assert.ok(!("root" in report.repo), "the absolute path must not be reported");
  assert.ok(!serialized.includes("/home/"), "no absolute home path may reach the report");
  assert.equal(report.environment.supabaseUrl.state, "present");
  assert.equal(report.environment.supabasePublishableKey.state, "present");
  // The variable *name* is useful and safe; the value is not.
  assert.equal(report.environment.supabaseUrl.variable, "NEXT_PUBLIC_SUPABASE_URL");
});

test("absent environment variables report missing rather than undefined", () => {
  const presence = environmentPresence({});
  for (const entry of Object.values(presence)) {
    assert.equal(entry.state, "missing");
  }
});

test("the report states that local green is not a finished pull request", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "src/lib/week.ts"],
    env: {},
  });
  assert.equal(report.completion.localGreenIsCompletion, false);
  assert.match(report.completion.statement, /not a merged pull request/u);
  assert.ok(report.evidenceRequired.some((entry) => entry.id === "provider_exact_head"));

  /**
   * `ready` is the field most likely to be misread as "done", so the report has
   * to say what it covers. Asserting `"ready" in report` proved nothing; this
   * asserts the disambiguation exists and names the four things it excludes.
   */
  assert.equal(report.readyMeans.scope, "environment-and-policy-freshness");
  for (const excluded of [
    "the local gates were run",
    "the local gates passed",
    "the provider checks are green on the exact head",
    "the pull request is complete or mergeable",
  ]) {
    assert.ok(
      report.readyMeans.excludes.includes(excluded),
      `readyMeans must exclude "${excluded}"`,
    );
  }
});

test("provider checks are listed with what they prove, and separately from local gates", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "src/lib/week.ts"],
    env: {},
  });
  assert.ok(report.providerChecks.length >= 5);
  for (const check of report.providerChecks) {
    assert.ok(check.context.length > 0);
    assert.ok(check.proves.length > 10, `${check.context} must say what it proves`);
    assert.ok(check.workflow.startsWith(".github/workflows/"));
  }
  assert.equal(report.providerCheckIdentityGuard.ok, true);
});

test("readiness depends on every term, not only the two that pass here", () => {
  // An earlier version re-derived `ready` from two of its five terms and passed
  // on this machine by accident. Recompute the whole conjunction instead.
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "docs/example.md"],
    env: {},
  });
  const expected =
    report.missingRepoFiles.length === 0 &&
    Boolean(report.capabilities.node && report.capabilities.npm && report.capabilities.git) &&
    report.missingRequiredCapabilities.length === 0 &&
    report.providerCheckIdentityGuard.ok &&
    (report.providerCheckDrift ? report.providerCheckDrift.ok : true);
  assert.equal(report.ready, expected);
});

test("a missing local capability makes a heavier task not-ready", () => {
  // A database task needs supabase and docker; whichever is absent here must
  // surface rather than being quietly dropped.
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "supabase/migrations/20260812100000_x.sql"],
    env: {},
  });
  assert.equal(report.requiredCapabilities.supabase, true);
  assert.equal(report.requiredCapabilities.docker, true);
  for (const name of report.missingRequiredCapabilities) {
    assert.equal(report.capabilities[name], null, `${name} must actually be absent`);
  }
  if (report.missingRequiredCapabilities.length > 0) assert.equal(report.ready, false);
});

test("the live ruleset comparison is opt-in and absent by default", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "docs/example.md"],
    env: {},
  });
  assert.equal(report.providerCheckDrift, undefined);
});

test("the JSON surface keeps the fields another tool would key on", () => {
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "src/app/actions/transactions.ts"],
    env: {},
  });
  for (const field of [
    "schemaVersion",
    "policySchemaVersion",
    "riskClass",
    "localGatePlan",
    "providerChecks",
    "approval",
    "evidenceRequired",
    "completion",
    "requiredCapabilities",
    "missingRequiredCapabilities",
    "environment",
    "ready",
  ]) {
    assert.ok(field in report, `--json must expose ${field}`);
  }
  assert.equal(report.schemaVersion, 2);
});
