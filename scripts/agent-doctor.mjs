/**
 * MoneyFlow agent doctor — environment diagnostics, not a policy authority.
 *
 * Everything this tool says about risk class, gates, provider checks, approval
 * boundaries and evidence comes from `agent-policy.mjs`, which in turn defers to
 * `classify-ci-changes.mjs` for path → gate selection. This file deliberately
 * contains no policy constants: what it owns is *this machine* — which commands
 * exist, whether the worktree is clean, which env vars are present.
 *
 * Re-deriving policy here would create the second source the harness exists to
 * prevent, so a check for that is enforced by the tests.
 */

import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  buildPolicyDecision,
  reconcileWithLiveRuleset,
  requiredProviderChecks,
  verifyProviderCheckIdentities,
} from "./agent-policy.mjs";

const REQUIRED_REPO_FILES = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "package.json",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
];

/**
 * Environment variables reported as present/missing only.
 *
 * Names, never values: a doctor report is pasted into issues and PR comments, so
 * printing a value here would be a disclosure with no diagnostic gain — presence
 * is the whole question.
 */
const ENVIRONMENT_KEYS = {
  appMode: "NEXT_PUBLIC_APP_MODE",
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
};

function run(command, args = []) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commandVersion(command, args = ["--version"]) {
  const result = run(command, args);
  if (result.status !== 0) return null;
  return (result.stdout || result.stderr).trim().split(/\r?\n/, 1)[0] || null;
}

function gitLines(args) {
  const result = run("git", args);
  if (result.status !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitValue(args) {
  const lines = gitLines(args);
  return lines?.[0] ?? null;
}

export function collectChangedFiles({ baseRef = "origin/main", argv = process.argv } = {}) {
  const explicit = argv.indexOf("--files");
  if (explicit >= 0) {
    return argv.slice(explicit + 1).filter((value) => !value.startsWith("--"));
  }

  const files = new Set();
  const add = (lines) => lines?.forEach((line) => files.add(line));

  const baseExists = run("git", ["rev-parse", "--verify", "--quiet", baseRef]);
  if (baseExists.status === 0) add(gitLines(["diff", "--name-only", `${baseRef}...HEAD`]));

  add(gitLines(["diff", "--name-only"]));
  add(gitLines(["diff", "--cached", "--name-only"]));
  add(gitLines(["ls-files", "--others", "--exclude-standard"]));

  return [...files].sort();
}

function repoState() {
  return {
    root: gitValue(["rev-parse", "--show-toplevel"]),
    head: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]) || "detached",
    clean: (gitLines(["status", "--porcelain"]) ?? ["unknown"]).length === 0,
  };
}

function fileChecks() {
  return REQUIRED_REPO_FILES.map((path) => ({ path, present: fs.existsSync(path) }));
}

function capabilities() {
  return {
    node: commandVersion("node"),
    npm: commandVersion("npm"),
    git: commandVersion("git"),
    supabase: commandVersion("npx", ["--no-install", "supabase", "--version"]),
    docker: commandVersion("docker"),
    playwright: commandVersion("npx", ["--no-install", "playwright", "--version"]),
  };
}

export function environmentPresence(env = process.env) {
  const presence = {};
  for (const [field, name] of Object.entries(ENVIRONMENT_KEYS)) {
    presence[field] = { variable: name, state: env[name] ? "present" : "missing" };
  }
  return presence;
}

function parseArgValue(flag, argv, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")
    ? argv[index + 1]
    : fallback;
}

/**
 * Read the live required contexts from the branch ruleset.
 *
 * Read-only and opt-in. Absent `gh`, network or permission this returns
 * `checked: false` rather than an empty list — "I could not look" and "the
 * ruleset requires nothing" must never collapse into the same answer, or a
 * failed lookup would read as clean.
 */
export function readLiveRequiredChecks({ repo } = {}) {
  const slug = repo ?? "Thunderkill016/moneyflow";
  const listing = run("gh", ["api", `repos/${slug}/rulesets`, "--jq", ".[].id"]);
  if (listing.status !== 0) {
    return { checked: false, reason: "gh unavailable or not authorized for ruleset read" };
  }
  const contexts = new Set();
  for (const id of listing.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    const detail = run("gh", [
      "api",
      `repos/${slug}/rulesets/${id}`,
      "--jq",
      '.rules[]? | select(.type=="required_status_checks") | .parameters.required_status_checks[]?.context',
    ]);
    if (detail.status !== 0) continue;
    for (const line of detail.stdout.split(/\r?\n/)) {
      const context = line.trim();
      if (context) contexts.add(context);
    }
  }
  return { checked: true, contexts: [...contexts].sort() };
}

export function buildDoctorReport({ argv = process.argv, env = process.env } = {}) {
  const baseRef = parseArgValue("--base-ref", argv, "origin/main");
  const changedFiles = collectChangedFiles({ baseRef, argv });
  const policy = buildPolicyDecision(changedFiles);
  const available = capabilities();
  const needed = policy.requiredCapabilities;
  const missingRequiredCapabilities = Object.entries(needed)
    .filter(([name, required]) => required && !available[name])
    .map(([name]) => name);
  const files = fileChecks();
  const missingRepoFiles = files.filter((entry) => !entry.present).map((entry) => entry.path);
  const identityGuard = verifyProviderCheckIdentities();

  const report = {
    schemaVersion: 2,
    repo: repoState(),
    baseRef,
    changedFiles,
    policySchemaVersion: policy.policySchemaVersion,
    policySources: policy.policySources,
    classification: policy.classification,
    riskClass: policy.riskClass,
    localGatePlan: policy.localGatePlan,
    providerChecks: policy.providerChecks,
    providerCheckIdentityGuard: identityGuard.ok
      ? { ok: true }
      : { ok: false, problems: identityGuard.problems },
    approval: policy.approval,
    evidenceRequired: policy.evidenceRequired,
    completion: policy.completion,
    capabilities: available,
    requiredCapabilities: needed,
    missingRequiredCapabilities,
    repoFiles: files,
    missingRepoFiles,
    environment: environmentPresence(env),
  };

  if (argv.includes("--verify-provider-checks")) {
    const live = readLiveRequiredChecks({ repo: parseArgValue("--repo", argv, undefined) });
    report.providerCheckDrift = live.checked
      ? reconcileWithLiveRuleset(live.contexts)
      : { ok: false, checked: false, reason: live.reason };
  }

  report.ready =
    missingRepoFiles.length === 0 &&
    Boolean(available.node && available.npm && available.git) &&
    missingRequiredCapabilities.length === 0 &&
    identityGuard.ok &&
    (report.providerCheckDrift ? report.providerCheckDrift.ok : true);

  return report;
}

function printHuman(report) {
  console.log(`MoneyFlow agent doctor — ${report.ready ? "READY" : "NEEDS ATTENTION"}`);
  console.log(`head: ${report.repo.head ?? "unknown"}`);
  console.log(`branch: ${report.repo.branch}`);
  console.log(`worktree: ${report.repo.clean ? "clean" : "dirty"}`);
  console.log(
    `risk class: ${report.riskClass.class} — ${report.riskClass.label} (${report.riskClass.reasons.join(", ")})`,
  );
  console.log(`planning artifact: ${report.riskClass.planningArtifact}`);
  console.log(`gate selection: ${report.classification.reason}`);
  console.log(`changed files: ${report.changedFiles.length}`);

  console.log("local gate plan:");
  for (const command of report.localGatePlan) console.log(`- ${command}`);

  console.log("provider checks required on the exact PR head (not runnable locally):");
  for (const check of report.providerChecks) {
    console.log(`- ${check.context} — ${check.proves}`);
  }
  if (!report.providerCheckIdentityGuard.ok) {
    console.log("provider check identity drift detected:");
    for (const problem of report.providerCheckIdentityGuard.problems) {
      console.log(`- ${problem.context}: ${problem.problem}`);
    }
  }
  if (report.providerCheckDrift) {
    if (!report.providerCheckDrift.checked) {
      console.log(`live ruleset comparison: not performed — ${report.providerCheckDrift.reason}`);
    } else if (report.providerCheckDrift.ok) {
      console.log("live ruleset comparison: declared contexts match the branch ruleset");
    } else {
      console.log("live ruleset comparison: DRIFT");
      for (const context of report.providerCheckDrift.missingLocally) {
        console.log(`- required by the ruleset but not declared here: ${context}`);
      }
      for (const context of report.providerCheckDrift.staleLocally) {
        console.log(`- declared here but not required by the ruleset: ${context}`);
      }
    }
  }

  console.log("evidence required before this is done:");
  for (const entry of report.evidenceRequired) console.log(`- ${entry.id}: ${entry.means}`);

  console.log(`owner approval — this diff: ${report.approval.requiredForThisDiff}`);
  if (report.approval.impliedForDeployment.length > 0) {
    console.log("boundaries implied by these paths, for a later deployment step:");
    for (const entry of report.approval.impliedForDeployment) {
      console.log(
        `- ${entry.boundary}${entry.requiresOwnerApproval ? " (owner approval required)" : ""} — ${entry.why}`,
      );
    }
  }
  console.log(`approval granted by this tool: no — ${report.approval.note}`);

  if (report.missingRequiredCapabilities.length > 0) {
    console.log(`missing required capabilities: ${report.missingRequiredCapabilities.join(", ")}`);
  }
  if (report.missingRepoFiles.length > 0) {
    console.log(`missing repo files: ${report.missingRepoFiles.join(", ")}`);
  }

  console.log("environment presence only (values are never printed):");
  for (const [field, entry] of Object.entries(report.environment)) {
    console.log(`- ${field} (${entry.variable}): ${entry.state}`);
  }

  console.log(`completion: ${report.completion.statement}`);
}

function runCli() {
  const report = buildDoctorReport();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report);
  }
  process.exitCode = report.ready ? 0 : 1;
}

export { requiredProviderChecks };

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
