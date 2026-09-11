/** MoneyFlow agent doctor — environment diagnostics, not a policy authority. */
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
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
];

const ENVIRONMENT_KEYS = {
  appMode: "NEXT_PUBLIC_APP_MODE",
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
};

function run(command, args = []) {
  return spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function commandVersion(command, args = ["--version"]) {
  const result = run(command, args);
  if (result.status !== 0) return null;
  return (result.stdout || result.stderr).trim().split(/\r?\n/, 1)[0] || null;
}

function gitLines(args) {
  const result = run("git", args);
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function gitValue(args) {
  return gitLines(args)?.[0] ?? null;
}

export function collectChangedFiles({ baseRef = "origin/main", argv = process.argv } = {}) {
  const explicit = argv.indexOf("--files");
  if (explicit >= 0) {
    const rest = argv.slice(explicit + 1);
    const nextFlag = rest.findIndex((value) => value.startsWith("--"));
    return nextFlag >= 0 ? rest.slice(0, nextFlag) : rest;
  }
  const files = new Set();
  const add = (lines) => lines?.forEach((line) => files.add(line));
  if (run("git", ["rev-parse", "--verify", "--quiet", baseRef]).status === 0) {
    add(gitLines(["diff", "--name-only", `${baseRef}...HEAD`]));
  }
  add(gitLines(["diff", "--name-only"]));
  add(gitLines(["diff", "--cached", "--name-only"]));
  add(gitLines(["ls-files", "--others", "--exclude-standard"]));
  return [...files].sort();
}

function repoState() {
  const root = gitValue(["rev-parse", "--show-toplevel"]);
  return {
    rootName: root ? root.split("/").filter(Boolean).at(-1) ?? null : null,
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
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : fallback;
}

export function readLiveRequiredChecks({ repo } = {}) {
  const slug = repo ?? "Thunderkill016/moneyflow";
  const listing = run("gh", ["api", `repos/${slug}/rulesets`, "--jq", ".[].id"]);
  if (listing.status !== 0) {
    return { checked: false, reason: "gh unavailable or not authorized for ruleset read" };
  }
  const contexts = new Set();
  for (const id of listing.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    const detail = run("gh", [
      "api", `repos/${slug}/rulesets/${id}`, "--jq",
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
  const policy = buildPolicyDecision(changedFiles, {
    readFile: (file) => {
      try { return fs.readFileSync(file, "utf8"); } catch { return null; }
    },
  });
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
    providerCheckIdentityGuard: identityGuard.ok ? { ok: true } : { ok: false, problems: identityGuard.problems },
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
    report.providerCheckDrift = live.checked ? reconcileWithLiveRuleset(live.contexts) : { ok: false, checked: false, reason: live.reason };
  }

  report.ready =
    missingRepoFiles.length === 0 &&
    Boolean(available.node && available.npm && available.git) &&
    missingRequiredCapabilities.length === 0 &&
    identityGuard.ok &&
    (report.providerCheckDrift ? report.providerCheckDrift.ok : true);

  report.readyMeans = {
    scope: "environment-and-policy-freshness",
    includes: [
      "required repository files present",
      "required local capabilities available",
      "declared provider check identities still real",
    ],
    excludes: [
      "the local gates were run",
      "the local gates passed",
      "the provider checks are green on the exact head",
      "the pull request is complete or mergeable",
    ],
  };
  return report;
}

function printHuman(report) {
  console.log(`MoneyFlow agent doctor — ${report.ready ? "READY" : "NEEDS ATTENTION"}`);
  console.log(`head: ${report.repo.head ?? "unknown"}`);
  console.log(`branch: ${report.repo.branch}`);
  console.log(`worktree: ${report.repo.clean ? "clean" : "dirty"}`);
  console.log(`risk class: ${report.riskClass.class} — ${report.riskClass.label} (${report.riskClass.reasons.join(", ")})`);
  console.log(`planning artifact: ${report.riskClass.planningArtifact}`);
  console.log(`gate selection: ${report.classification.reason}`);
  console.log(`changed files: ${report.changedFiles.length}`);
  console.log("local gate plan:");
  for (const command of report.localGatePlan) console.log(`- ${command}`);
  console.log("provider checks required on the exact PR head (not runnable locally):");
  for (const check of report.providerChecks) console.log(`- ${check.context} — ${check.proves}`);
  if (report.missingRequiredCapabilities.length > 0) console.log(`missing required capabilities: ${report.missingRequiredCapabilities.join(", ")}`);
  if (report.missingRepoFiles.length > 0) console.log(`missing repo files: ${report.missingRepoFiles.join(", ")}`);
  console.log(`completion: ${report.completion.statement}`);
}

function runCli() {
  const report = buildDoctorReport();
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printHuman(report);
  process.exitCode = report.ready ? 0 : 1;
}

export { requiredProviderChecks };
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
