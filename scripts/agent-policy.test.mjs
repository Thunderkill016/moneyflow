import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  APPROVAL_BOUNDARIES,
  buildGatePlan,
  buildPolicyDecision,
  GATE_COMMANDS,
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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  // Bounded at the next heading: slicing to end-of-file made an unrelated list
  // anywhere later in the document break this guard.
  const start = doc.indexOf("## Stable required checks");
  const rest = doc.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const section = end >= 0 ? rest.slice(0, end) : rest;
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

test("no second copy of the gate command table exists anywhere in scripts/", () => {
  /**
   * An earlier version of this test grepped two command names in two named
   * files, which a third module with its own table walked straight past. It now
   * sweeps every script for every command the policy owns: whichever file a
   * duplicate table lands in, it shows up here.
   */
  const owned = [
    ...GATE_COMMANDS.always,
    ...Object.values(GATE_COMMANDS.byFlag),
  ].map((command) => command.replace(/^npm run /, ""));

  const offenders = [];
  for (const file of readdirSync("scripts").sort()) {
    if (!/\.mjs$/.test(file)) continue;
    if (file === "agent-policy.mjs") continue; // the one legitimate owner
    // Test files name commands as expected values; asserting a value is not
    // declaring policy, and a test cannot be consumed as an authority.
    if (file.endsWith(".test.mjs")) continue;
    const source = readFileSync(`scripts/${file}`, "utf8");
    for (const command of owned) {
      if (source.includes(`npm run ${command}`)) offenders.push(`scripts/${file} -> ${command}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `only agent-policy.mjs may name the gate commands; found: ${offenders.join(", ")}`,
  );
});

test("no script other than the policy declares a provider check context", () => {
  // The five contexts are provider identities. A second list of them is a second
  // answer to "what must be green before merge".
  const offenders = [];
  for (const file of readdirSync("scripts").sort()) {
    if (!/\.mjs$/.test(file)) continue;
    if (file === "agent-policy.mjs" || file.endsWith(".test.mjs")) continue;
    const source = readFileSync(`scripts/${file}`, "utf8").replace(/\/\*[\s\S]*?\*\//gu, "");
    for (const context of ["Gitleaks all refs", "Analyze JavaScript and TypeScript"]) {
      if (source.includes(context)) offenders.push(`scripts/${file} -> ${context}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the classifier is imported by exactly one harness module, statically", () => {
  /**
   * Two consumers of the classifier means two places to keep in step, and a
   * dynamic import would slip past a substring check — so the shape of the import
   * is asserted, not merely its absence.
   */
  const importers = [];
  for (const file of readdirSync("scripts").sort()) {
    if (!/^agent-.*\.mjs$/.test(file) || file.endsWith(".test.mjs")) continue;
    // Comments stripped: both modules *document* the single-authority rule by
    // naming the classifier, and prose must never decide a check about code.
    const source = readFileSync(`scripts/${file}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/\/\/.*$/gmu, "");
    if (/classify-ci-changes/.test(source)) importers.push(`scripts/${file}`);
    // Concatenated or computed module specifiers defeat any static reasoning
    // about who depends on what.
    assert.ok(
      !/import\s*\(\s*[^)]*\+/.test(source),
      `${file} must not build a module specifier dynamically`,
    );
  }
  assert.deepEqual(importers, ["scripts/agent-policy.mjs"]);
});

test("the policy owns no matcher the classifier already owns", () => {
  // Behavioural, not textual: for every path shape, the reasons that come from
  // imported predicates must agree with the classifier's own verdict.
  const cases = [
    ["supabase/migrations/x.sql", "database-truth", (c) => c.database],
    [".github/workflows/ci.yml", "ci-security-policy", (c) => c.fullVerify && c.database],
    ["middleware.ts", "request-boundary", (c) => c.browserSmoke],
  ];
  for (const [file, reason, classifierHolds] of cases) {
    const decision = buildPolicyDecision([file]);
    assert.ok(
      decision.riskClass.reasons.includes(reason),
      `${file} should carry reason ${reason}`,
    );
    assert.ok(
      classifierHolds(classifyChanges([file])),
      `${file} must still satisfy the classifier's own selection for ${reason}`,
    );
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

test("the emitted report is frozen, not just the constant table", () => {
  /**
   * The catalogue was frozen while the *emitted* object was a plain literal, so
   * anything holding the report could set `granted: true` and every downstream
   * reader would believe it. The report is the attack surface.
   */
  const decision = buildPolicyDecision([
    "supabase/migrations/20260812090000_purge_example.sql",
    "supabase/functions/delete-account/index.ts",
  ]);
  assert.ok(Object.isFrozen(decision), "the decision must be frozen");
  assert.ok(Object.isFrozen(decision.approval), "approval must be frozen");
  assert.ok(Object.isFrozen(decision.completion));
  for (const check of decision.providerChecks) {
    assert.ok(Object.isFrozen(check), "each provider check entry must be frozen");
  }

  // A silent no-op is as dangerous as a throw is safe, so assert the *value*
  // rather than the mechanism: a non-strict caller gets no error, only a no-op.
  const mutate = new Function(
    "target",
    "try { target.granted = true; target.grantedBy = 'ci'; } catch { /* strict */ }",
  );
  mutate(decision.approval);
  assert.equal(decision.approval.granted, false, "granted must remain false after a write attempt");
  assert.equal(decision.approval.grantedBy, null);

  const renameAttempt = new Function("target", "try { target.context = 'spoofed'; } catch {}");
  renameAttempt(decision.providerChecks[0]);
  assert.equal(decision.providerChecks[0].context, "verify");
});

test("the boundary catalogue itself also holds", () => {
  const mutate = new Function("target", "try { target.granted = true; } catch {}");
  mutate(APPROVAL_BOUNDARIES.production_schema_write);
  assert.equal(APPROVAL_BOUNDARIES.production_schema_write.granted, false);
  assert.ok(Object.isFrozen(APPROVAL_BOUNDARIES.production_schema_write));
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

test("deriveRiskClass refuses to guess when the file list is absent", () => {
  // Defaulting to `[]` skipped the whole Class 3 sensitivity check and returned
  // "Class 1" — a wrong answer that looks like a real one.
  assert.throws(
    () => deriveRiskClass({ docsOnly: false, uiAudit: false }),
    /requires the changed file list/u,
  );
  const resolved = deriveRiskClass({ docsOnly: false, uiAudit: false }, { files: [] });
  assert.equal(resolved.class, 1);
  assert.ok(resolved.planningArtifact.length > 0);
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

// --- Boundary coverage the first version missed --------------------------------

test("provider-side repository governance is a boundary, not a bounded change", () => {
  // AGENTS.md forbids changing these inside feature work and
  // RISK_PROPORTIONAL_DELIVERY.md calls them explicit owner operations.
  for (const file of [".github/CODEOWNERS", ".github/dependabot.yml"]) {
    const decision = buildPolicyDecision([file]);
    assert.equal(decision.riskClass.class, 3, `${file} must be Class 3`);
    assert.ok(
      decision.approval.impliedForDeployment.some((entry) => entry.boundary === "provider_read"),
      `${file} must imply provider read-back`,
    );
  }
  // Issue and PR templates under .github/ are documentation and stay light.
  assert.equal(buildPolicyDecision([".github/ISSUE_TEMPLATE/bug.md"]).riskClass.class, 0);
});

test("the whole Edge deployment unit implies the Auth boundary, not one directory", () => {
  // delete-account imports its recent-auth guard from _shared/, and that helper
  // is what decides whether a caller may destroy an Auth identity.
  for (const file of [
    "supabase/functions/delete-account/index.ts",
    "supabase/functions/_shared/account-deletion-recent-auth.ts",
  ]) {
    const approval = deriveApprovalBoundary([file]);
    assert.equal(
      approval.highestImpliedBoundary,
      "auth_identity_mutation",
      `${file} must imply the Auth identity boundary`,
    );
    assert.equal(approval.ownerApprovalRequiredBeforeDeployment, true);
  }
});

test("provider state that is applied rather than migrated still implies a write", () => {
  for (const file of ["supabase/roles.sql", "supabase/config.toml", "supabase/seed.sql"]) {
    const approval = deriveApprovalBoundary([file]);
    assert.ok(
      approval.impliedForDeployment.some((entry) => entry.boundary === "production_schema_write"),
      `${file} must imply a production write`,
    );
  }
});

test("tenant mutation is caught by stem and by SQL body, not by a single spelling", () => {
  // "deletion" does not contain "delete"; the repo's own naming convention uses it.
  const hardening = deriveApprovalBoundary([
    "supabase/migrations/20260726004445_harden_tenant_deletion.sql",
  ]);
  assert.equal(hardening.highestImpliedBoundary, "tenant_ledger_mutation");

  // A neutrally named migration is caught by its body when a reader is supplied.
  const path = "supabase/migrations/20260101000000_neutral_name.sql";
  const byPath = deriveApprovalBoundary([path]);
  assert.equal(byPath.highestImpliedBoundary, "production_schema_write");
  const byBody = deriveApprovalBoundary([path], {
    readFile: () => "delete from public.financial_transactions where user_id = auth.uid();",
  });
  assert.equal(byBody.highestImpliedBoundary, "tenant_ledger_mutation");

  // A body that only creates things does not escalate.
  const benign = deriveApprovalBoundary([path], {
    readFile: () => "create index concurrently on public.accounts (user_id);",
  });
  assert.equal(benign.highestImpliedBoundary, "production_schema_write");
});

test("real repository migrations get at least the boundary they deserve", () => {
  const real = readdirSync("supabase/migrations")
    .filter((file) => /(?:purge|delet|restore|truncate|cascade)/i.test(file))
    .map((file) => `supabase/migrations/${file}`);
  assert.ok(real.length > 0, "the fixture assumption must hold");
  for (const file of real) {
    assert.equal(
      deriveApprovalBoundary([file]).highestImpliedBoundary,
      "tenant_ledger_mutation",
      `${file} must imply the tenant boundary`,
    );
  }
});

test("server route handlers and the Supabase client are Class 3 like server actions", () => {
  assert.equal(buildPolicyDecision(["src/app/api/share-target/route.ts"]).riskClass.class, 3);
  assert.equal(buildPolicyDecision(["src/lib/supabase/server.ts"]).riskClass.class, 3);
  // Both harness files, symmetrically — an earlier version made the policy
  // Class 3 and its consumer Class 1.
  for (const file of ["scripts/agent-policy.mjs", "scripts/agent-doctor.mjs"]) {
    const decision = buildPolicyDecision([file]);
    assert.equal(decision.riskClass.class, 3, `${file} must be Class 3`);
    assert.ok(decision.riskClass.reasons.includes("harness-policy"));
  }
});

// --- Workflow parsing holes ---------------------------------------------------

test("a nested key named pull_request is not a trigger", () => {
  // A `workflow_call` input named `pull_request` previously counted as a trigger,
  // so a workflow that never runs on a PR reported as if it did.
  const root = mkdtempSync(join(tmpdir(), "mf-policy-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/x.yml"),
    [
      "on:",
      "  workflow_call:",
      "    inputs:",
      "      pull_request:",
      "        type: string",
      "  push:",
      "    branches: [main]",
      "jobs:",
      "  gitleaks:",
      "    name: Gitleaks all refs",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n"),
  );
  const jobs = deriveWorkflowJobs({ root });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].triggersPullRequest, false);
  rmSync(root, { recursive: true, force: true });
});

test("a job gated away from pull_request by its own condition is reported", () => {
  const root = mkdtempSync(join(tmpdir(), "mf-policy-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/secret-history.yml"),
    [
      "on:",
      "  pull_request:",
      "  push:",
      "jobs:",
      "  gitleaks:",
      "    name: Gitleaks all refs",
      "    if: github.event_name == 'push'",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n"),
  );
  const jobs = deriveWorkflowJobs({ root });
  assert.equal(jobs[0].triggersPullRequest, false);
  assert.equal(jobs[0].eventGatedAwayFromPullRequest, true);
  const guard = verifyProviderCheckIdentities({ root });
  assert.ok(
    guard.problems.some((problem) => /gated away from pull_request/u.test(problem.problem)),
    "the guard must name the job condition",
  );
  rmSync(root, { recursive: true, force: true });
});

test("the real workflows' event-gated conditions still count as pull-request jobs", () => {
  // ci.yml gates every required job on github.event_name but names pull_request
  // explicitly, so the conservative rule must not produce a false alarm.
  const jobs = deriveWorkflowJobs();
  for (const context of ["verify", "database", "e2e"]) {
    const job = jobs.find((entry) => entry.context === context);
    assert.equal(job.triggersPullRequest, true, `${context} must still count`);
    assert.equal(job.eventGatedAwayFromPullRequest, false);
  }
});

test("a decoy workflow cannot supply an identity for an unhooked job", () => {
  // The conditions were checked independently, so one job could provide the
  // identity while a different job satisfied the ownership requirement.
  const root = mkdtempSync(join(tmpdir(), "mf-policy-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    ["on:", "  push:", "jobs:", "  verify:", "    runs-on: ubuntu-latest", ""].join("\n"),
  );
  writeFileSync(
    join(root, ".github/workflows/decoy.yml"),
    ["on:", "  pull_request:", "jobs:", "  verify:", "    runs-on: ubuntu-latest", ""].join("\n"),
  );
  const guard = verifyProviderCheckIdentities({ root });
  assert.ok(
    guard.problems.some(
      (problem) => problem.context === "verify" && /no longer triggers on pull_request/u.test(problem.problem),
    ),
    "ownership and PR-triggering must be satisfied by the same job",
  );
  rmSync(root, { recursive: true, force: true });
});
