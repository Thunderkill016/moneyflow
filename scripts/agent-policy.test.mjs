import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPROVAL_BOUNDARIES,
  buildGatePlan,
  buildPolicyDecision,
  deriveApprovalBoundary,
  deriveRiskClass,
  deriveWorkflowJobs,
  PROVIDER_CHECK_CONTEXTS,
  reconcileWithLiveRuleset,
  requiredCapabilities,
  requiredProviderChecks,
  verifyProviderCheckIdentities,
} from "./agent-policy.mjs";
import { classifyChanges } from "./classify-ci-changes.mjs";

/**
 * The harness policy projection. These tests exist to keep the projection honest
 * in two directions: the six questions must be answered correctly per task shape,
 * and the projection must never quietly become a second policy authority.
 */

const ALWAYS = [
  "npm run check:migrations",
  "npm run check:knowledge",
  "npm run test:ci-policy",
];

// --- Task shapes -------------------------------------------------------------

test("a docs-only task stays Class 0 and light", () => {
  const decision = buildPolicyDecision([
    "docs/research/CURRENT_PROJECT_MEMORY.md",
    "README.md",
  ]);
  assert.equal(decision.riskClass.class, 0);
  assert.equal(decision.classification.docsOnly, true);
  // Light, but not unverified: the three contract gates still run.
  assert.deepEqual(decision.localGatePlan, ALWAYS);
  assert.equal(decision.requiredCapabilities.supabase, false);
  assert.equal(decision.requiredCapabilities.docker, false);
  assert.equal(decision.requiredCapabilities.playwright, false);
  assert.equal(decision.approval.ownerApprovalRequiredBeforeDeployment, false);
  // No work packet is demanded for prose.
  assert.ok(!decision.evidenceRequired.some((entry) => entry.id === "work_packet"));
  // But the provider checks still apply — a docs PR is still a PR.
  assert.ok(decision.evidenceRequired.some((entry) => entry.id === "provider_exact_head"));
});

test("an ordinary bounded runtime task is Class 1 with full local verification", () => {
  const decision = buildPolicyDecision(["src/lib/week.ts", "src/lib/week.test.ts"]);
  assert.equal(decision.riskClass.class, 1);
  assert.deepEqual(decision.localGatePlan, [
    ...ALWAYS,
    "npm run verify:prepush",
    "npm run test:e2e",
  ]);
  assert.equal(decision.requiredCapabilities.playwright, true);
  assert.equal(decision.requiredCapabilities.docker, false);
  assert.equal(decision.approval.requiredForThisDiff, "none");
});

test("a database/schema task is Class 3, needs pgTAP, and implies a production write later", () => {
  const decision = buildPolicyDecision([
    "supabase/migrations/20260812020000_example.sql",
    "supabase/tests/database/example.test.sql",
  ]);
  assert.equal(decision.riskClass.class, 3);
  assert.ok(decision.riskClass.reasons.includes("database-truth"));
  assert.ok(decision.localGatePlan.includes("npm run test:db"));
  assert.equal(decision.requiredCapabilities.supabase, true);
  assert.equal(decision.requiredCapabilities.docker, true);
  // A pure database change does not drag in unrelated application build work.
  assert.ok(!decision.localGatePlan.includes("npm run verify:prepush"));

  const ids = decision.evidenceRequired.map((entry) => entry.id);
  assert.ok(ids.includes("pgtap_database"));
  assert.ok(ids.includes("work_packet"));
  assert.ok(ids.includes("owner_approval_record"));
  assert.ok(ids.includes("production_read_back"));

  // The critical distinction: editing a migration needs no approval; deploying it does.
  assert.equal(decision.approval.requiredForThisDiff, "none");
  assert.equal(decision.approval.ownerApprovalRequiredBeforeDeployment, true);
  assert.equal(decision.approval.highestImpliedBoundary, "production_schema_write");
});

test("a UI/browser task is Class 2 and needs responsive evidence", () => {
  const decision = buildPolicyDecision([
    "src/components/layout/app-shell.module.css",
    "src/app/dashboard/page.tsx",
  ]);
  assert.equal(decision.riskClass.class, 2);
  assert.ok(decision.localGatePlan.includes("npm run test:ui-audit:pr"));
  assert.ok(decision.localGatePlan.includes("npm run test:e2e"));
  const ids = decision.evidenceRequired.map((entry) => entry.id);
  assert.ok(ids.includes("responsive_evidence"));
  assert.ok(ids.includes("browser_evidence"));
  assert.equal(decision.approval.ownerApprovalRequiredBeforeDeployment, false);
});

test("a provider/production-write task surfaces the boundary that needs approval", () => {
  const decision = buildPolicyDecision([
    "supabase/migrations/20260812030000_purge_user_tenant_data.sql",
    "supabase/functions/delete-account/index.ts",
  ]);
  assert.equal(decision.riskClass.class, 3);
  const implied = decision.approval.impliedForDeployment.map((entry) => entry.boundary);
  assert.deepEqual(implied, [
    "production_schema_write",
    "tenant_ledger_mutation",
    "auth_identity_mutation",
  ]);
  assert.equal(decision.approval.highestImpliedBoundary, "auth_identity_mutation");
  for (const entry of decision.approval.impliedForDeployment) {
    assert.equal(entry.requiresOwnerApproval, true);
    assert.ok(entry.why.length > 10, "each implied boundary explains itself");
  }
});

test("the most sensitive path decides the class; risk is never averaged", () => {
  // A mostly-docs diff that touches one migration is still a Class 3 boundary.
  const decision = buildPolicyDecision([
    "README.md",
    "docs/plans/active/example.md",
    "supabase/migrations/20260812040000_example.sql",
  ]);
  assert.equal(decision.riskClass.class, 3);
  assert.equal(decision.classification.docsOnly, false);
});

test("server actions and archive code are Class 3 even without a migration", () => {
  assert.equal(buildPolicyDecision(["src/app/actions/transactions.ts"]).riskClass.class, 3);
  assert.equal(buildPolicyDecision(["src/lib/archive/archive-ingress.ts"]).riskClass.class, 3);
  assert.equal(buildPolicyDecision(["src/lib/auth-password-policy.ts"]).riskClass.class, 3);
});

test("an unavailable diff fails safe to the heaviest plan", () => {
  const decision = buildPolicyDecision([]);
  assert.equal(decision.classification.fullVerify, true);
  assert.equal(decision.classification.database, true);
  assert.ok(decision.localGatePlan.includes("npm run test:db"));
  assert.ok(decision.localGatePlan.includes("npm run test:ui-audit:pr"));
});

// --- Provider versus local evidence -----------------------------------------

test("provider checks are separate from local commands and never claimed as runnable", () => {
  const contexts = requiredProviderChecks();
  assert.deepEqual(contexts, [
    "verify",
    "database",
    "e2e",
    "Gitleaks all refs",
    "Analyze JavaScript and TypeScript",
  ]);
  const decision = buildPolicyDecision(["src/lib/week.ts"]);
  // A provider context is a check GitHub reports; it is never something a human
  // can run locally, so it must not appear as a command.
  for (const context of contexts) {
    assert.ok(
      !decision.localGatePlan.includes(context),
      `${context} must not be offered as a local command`,
    );
  }
  for (const command of decision.localGatePlan) {
    assert.ok(command.startsWith("npm run "), `${command} must be a local npm command`);
  }
  // And the two lists must stay structurally distinct: provider entries carry a
  // workflow, local entries are bare commands.
  for (const check of decision.providerChecks) {
    assert.ok(check.workflow.startsWith(".github/workflows/"));
    assert.ok(!("command" in check), "a provider check must not advertise a local command");
  }
});

test("the CodeQL and secret-history contexts cannot report not-applicable", () => {
  // A no-op green CodeQL job creates a false green and an unmergeable PR; the
  // secret scan is meaningless if it can opt out.
  const strict = PROVIDER_CHECK_CONTEXTS.filter((entry) => !entry.mayReportNotApplicable).map(
    (entry) => entry.context,
  );
  assert.deepEqual(strict, ["Gitleaks all refs", "Analyze JavaScript and TypeScript"]);
});

test("local green is explicitly not completion", () => {
  const decision = buildPolicyDecision(["src/lib/week.ts"]);
  assert.equal(decision.completion.localGreenIsCompletion, false);
  assert.match(decision.completion.statement, /exact head/u);
  assert.match(decision.completion.statement, /owner decisions/u);
});

// --- Drift prevention --------------------------------------------------------

test("every declared provider context is still a real pull-request job", () => {
  const guard = verifyProviderCheckIdentities();
  assert.deepEqual(guard.problems, []);
  assert.equal(guard.ok, true);
});

test("the workflow parser finds the job identities GitHub would use", () => {
  const jobs = deriveWorkflowJobs();
  const byContext = new Map(jobs.map((job) => [job.context, job]));
  // A job with no `name:` is addressed by its key...
  assert.equal(byContext.get("verify")?.id, "verify");
  // ...and one with a `name:` is addressed by that name, not its key.
  assert.equal(byContext.get("Analyze JavaScript and TypeScript")?.id, "analyze");
  assert.equal(byContext.get("Gitleaks all refs")?.workflow, ".github/workflows/secret-history.yml");
  // The nightly audit is not a pull-request gate and must not be mistaken for one.
  assert.equal(byContext.get("firefox")?.triggersPullRequest, false);
});

test("a renamed or unhooked CI job is detected rather than silently stale", () => {
  const guard = verifyProviderCheckIdentities({ root: "/nonexistent-repo-root" });
  assert.equal(guard.ok, false);
  assert.equal(guard.problems.length, PROVIDER_CHECK_CONTEXTS.length);
  for (const problem of guard.problems) {
    assert.match(problem.problem, /no workflow job declares this check identity/u);
  }
});

test("live ruleset drift is reported in both directions, and a failed lookup is not a pass", () => {
  assert.equal(reconcileWithLiveRuleset(requiredProviderChecks()).ok, true);

  const extra = reconcileWithLiveRuleset([...requiredProviderChecks(), "New required check"]);
  assert.equal(extra.ok, false);
  assert.deepEqual(extra.missingLocally, ["New required check"]);

  const fewer = reconcileWithLiveRuleset(["verify"]);
  assert.equal(fewer.ok, false);
  assert.ok(fewer.staleLocally.includes("Analyze JavaScript and TypeScript"));

  // "I could not look" must never collapse into "nothing is required".
  const unknown = reconcileWithLiveRuleset(null);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.checked, false);
});

test("the prose authority lists the same required checks as the policy", () => {
  // Drift between the policy data and RISK_PROPORTIONAL_DELIVERY.md is exactly
  // how a stale doc outlives the rule it documents.
  const doc = readFileSync("docs/engineering/RISK_PROPORTIONAL_DELIVERY.md", "utf8");
  const section = doc.slice(doc.indexOf("## Stable required checks"));
  // The list ends its last item with a period rather than a semicolon.
  const listed = [...section.matchAll(/^- `(.+?)`[;.]?$/gmu)].map((match) => match[1]);
  assert.deepEqual(listed.sort(), [...requiredProviderChecks()].sort());
});

// --- Single policy authority --------------------------------------------------

test("path-to-gate selection is passed through from the classifier, not recomputed", () => {
  const policy = readFileSync("scripts/agent-policy.mjs", "utf8");
  assert.ok(
    policy.includes('from "./classify-ci-changes.mjs"'),
    "the policy must consume the classifier as the gate-selection authority",
  );

  // Behavioural proof, which a regex over source cannot give: for every shape of
  // diff, the policy's classification must be byte-identical to the classifier's
  // own answer. Any second implementation would show up as a divergence here.
  const samples = [
    ["docs/x.md"],
    ["src/lib/week.ts"],
    ["supabase/migrations/20260812080000_x.sql"],
    ["src/components/x.tsx", "src/app/x/page.tsx"],
    [".github/workflows/ci.yml"],
    ["scripts/classify-ci-changes.mjs"],
    ["package.json", "docs/y.md"],
    [],
  ];
  for (const files of samples) {
    assert.deepEqual(
      buildPolicyDecision(files).classification,
      classifyChanges(files),
      `classification for ${JSON.stringify(files)} must be the classifier's own output`,
    );
  }
});

test("no second copy of the gate command table exists", () => {
  // Grep the harness surface: the npm commands may be named in exactly one
  // module, otherwise a future edit updates one table and not the other.
  const commands = ["verify:prepush", "test:ui-audit:pr"];
  for (const file of ["scripts/agent-doctor.mjs", "scripts/agent-doctor.test.mjs"]) {
    const source = readFileSync(file, "utf8");
    for (const command of commands) {
      assert.ok(
        !source.includes(`npm run ${command}`),
        `${file} must not restate "npm run ${command}"; agent-policy.mjs owns it`,
      );
    }
  }
});

// --- Approval modelling -------------------------------------------------------

test("the boundary vocabulary covers the five distinctions the repository makes", () => {
  assert.deepEqual(Object.keys(APPROVAL_BOUNDARIES), [
    "none",
    "provider_read",
    "production_schema_write",
    "tenant_ledger_mutation",
    "auth_identity_mutation",
  ]);
  // Ordered, so tooling can compare severity rather than string-match.
  const ranks = Object.values(APPROVAL_BOUNDARIES).map((entry) => entry.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test("modelling a boundary never grants it", () => {
  for (const boundary of Object.values(APPROVAL_BOUNDARIES)) {
    assert.equal(boundary.granted, false, `${boundary.id} must never be granted`);
  }
  // Including for the most sensitive diff this repository can produce.
  const approval = deriveApprovalBoundary([
    "supabase/migrations/20260812050000_restore_user_archive.sql",
    "supabase/functions/delete-account/index.ts",
  ]);
  assert.equal(approval.granted, false);
  assert.equal(approval.grantedBy, null);
  assert.equal(approval.grantedScope, null);
  assert.match(approval.note, /grants none/u);
});

test("the frozen boundary table cannot be flipped to granted at runtime", () => {
  assert.throws(() => {
    "use strict";
    APPROVAL_BOUNDARIES.production_schema_write.granted = true;
  }, TypeError);
  assert.equal(APPROVAL_BOUNDARIES.production_schema_write.granted, false);
});

test("no passing gate can imply approval", () => {
  // Approval is derived from paths and human record only. A classification that
  // claims everything is green must not change the approval answer.
  const files = ["supabase/migrations/20260812060000_example.sql"];
  const withGreen = deriveApprovalBoundary(files);
  assert.equal(withGreen.granted, false);
  assert.equal(withGreen.requiredForThisDiff, "none");
  assert.equal(withGreen.ownerApprovalRequiredBeforeDeployment, true);
});

test("the risk class of an empty diff still resolves", () => {
  const riskClass = deriveRiskClass({ docsOnly: false, uiAudit: false, files: [] });
  assert.equal(riskClass.class, 1);
  assert.ok(riskClass.planningArtifact.length > 0);
});

test("gate plans are deduplicated and stable in order", () => {
  const classification = {
    files: [],
    docsOnly: false,
    fullVerify: true,
    database: true,
    browserSmoke: true,
    uiAudit: true,
  };
  const plan = buildGatePlan(classification);
  assert.deepEqual(plan, [...new Set(plan)]);
  assert.deepEqual(plan, [
    ...ALWAYS,
    "npm run verify:prepush",
    "npm run test:db",
    "npm run test:e2e",
    "npm run test:ui-audit:pr",
  ]);
  assert.equal(requiredCapabilities(classification).playwright, true);
});
