import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { classifyChanges } from "./classify-ci-changes.mjs";

const REQUIRED_REPO_FILES = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "package.json",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
];

const GATE_COMMANDS = {
  knowledge: "npm run check:knowledge",
  ciPolicy: "npm run test:ci-policy",
  fullVerify: "npm run verify:prepush",
  database: "npm run test:db",
  browserSmoke: "npm run test:e2e",
  uiAudit: "npm run test:ui-audit:pr",
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

export function buildGatePlan(classification) {
  const commands = [GATE_COMMANDS.knowledge, GATE_COMMANDS.ciPolicy];
  if (classification.fullVerify) commands.push(GATE_COMMANDS.fullVerify);
  if (classification.database) commands.push(GATE_COMMANDS.database);
  if (classification.browserSmoke) commands.push(GATE_COMMANDS.browserSmoke);
  if (classification.uiAudit) commands.push(GATE_COMMANDS.uiAudit);
  return [...new Set(commands)];
}

export function requiredCapabilities(classification) {
  return {
    node: true,
    npm: true,
    git: true,
    supabase: classification.database,
    docker: classification.database,
    playwright: classification.browserSmoke || classification.uiAudit,
  };
}

export function collectChangedFiles({ baseRef = "origin/main" } = {}) {
  const explicit = process.argv.indexOf("--files");
  if (explicit >= 0) {
    return process.argv
      .slice(explicit + 1)
      .filter((value) => !value.startsWith("--"));
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

function parseBaseRef() {
  const index = process.argv.indexOf("--base-ref");
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "origin/main";
}

export function buildDoctorReport() {
  const baseRef = parseBaseRef();
  const changedFiles = collectChangedFiles({ baseRef });
  const classification = classifyChanges(changedFiles);
  const available = capabilities();
  const needed = requiredCapabilities(classification);
  const missingRequiredCapabilities = Object.entries(needed)
    .filter(([name, required]) => required && !available[name])
    .map(([name]) => name);
  const files = fileChecks();
  const missingRepoFiles = files.filter((entry) => !entry.present).map((entry) => entry.path);

  return {
    schemaVersion: 1,
    repo: repoState(),
    baseRef,
    changedFiles,
    classification,
    gatePlan: buildGatePlan(classification),
    capabilities: available,
    requiredCapabilities: needed,
    missingRequiredCapabilities,
    repoFiles: files,
    missingRepoFiles,
    environment: {
      appMode: process.env.NEXT_PUBLIC_APP_MODE ? "present" : "missing",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "present" : "missing",
      supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? "present"
        : "missing",
    },
    ready:
      missingRepoFiles.length === 0 &&
      Boolean(available.node && available.npm && available.git) &&
      missingRequiredCapabilities.length === 0,
  };
}

function printHuman(report) {
  console.log(`MoneyFlow agent doctor — ${report.ready ? "READY" : "NEEDS ATTENTION"}`);
  console.log(`head: ${report.repo.head ?? "unknown"}`);
  console.log(`branch: ${report.repo.branch}`);
  console.log(`worktree: ${report.repo.clean ? "clean" : "dirty"}`);
  console.log(`classification: ${report.classification.reason}`);
  console.log(`changed files: ${report.changedFiles.length}`);
  console.log("gate plan:");
  for (const command of report.gatePlan) console.log(`- ${command}`);

  if (report.missingRequiredCapabilities.length > 0) {
    console.log(`missing required capabilities: ${report.missingRequiredCapabilities.join(", ")}`);
  }
  if (report.missingRepoFiles.length > 0) {
    console.log(`missing repo files: ${report.missingRepoFiles.join(", ")}`);
  }
  console.log("environment presence only (values are never printed):");
  for (const [name, state] of Object.entries(report.environment)) console.log(`- ${name}: ${state}`);
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

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
