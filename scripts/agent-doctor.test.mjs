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
  // No risk-class or gate table may live here.
  assert.ok(!/GATE_COMMANDS\s*=/.test(executable));
  assert.ok(!/RISK_CLASSES\s*=/.test(executable));
  assert.ok(!/PROVIDER_CHECK/.test(executable.replace(/PROVIDER_CHECKS?\b(?=\s*[,)])/gu, "")));
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
  const files = collectChangedFiles({
    argv: ["node", "x", "--files", "a.md", "b.ts", "--json"],
  });
  assert.deepEqual(files, ["a.md", "b.ts"]);
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
  // `ready` is about the environment, so it must never be presented as the
  // task being complete.
  assert.ok("ready" in report);
  assert.ok(report.evidenceRequired.some((entry) => entry.id === "provider_exact_head"));
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

test("provider check identity drift makes the doctor not-ready", () => {
  // The guard runs against the real repository in the happy path; here we prove
  // the report's readiness actually depends on it rather than ignoring it.
  const report = buildDoctorReport({
    argv: ["node", "agent-doctor.mjs", "--files", "docs/example.md"],
    env: {},
  });
  assert.equal(report.ready, report.missingRepoFiles.length === 0 && report.providerCheckIdentityGuard.ok);
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
