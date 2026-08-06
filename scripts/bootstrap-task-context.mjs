#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const BASELINE_CONTEXT = [
  "AGENTS.md",
  "README.md",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/context/README.md",
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
];

export const ROUTE_ALIASES = {
  product: "Product scope/current status",
  ledger: "Ledger, transactions, transfers, splits",
  accounts: "Accounts/reconciliation",
  planning: "Budgets/recurring/goals",
  reports: "Reports/export",
  import: "Import/Inbox/rules",
  auth: "Auth/provider/security",
  ui: "UI/mobile/accessibility",
  tooling: "Architecture/dependency/tooling",
  ci: "CI/deployment/performance",
  brand: "Brand/landing",
};

const CLASS_PLANS = {
  0: {
    label: "Class 0 — documentation/mechanical",
    planning: "Inline plan or a clear PR description is normally sufficient.",
    required: ["npm run check:knowledge", "npm run test:ci-policy"],
    conditional: [
      "Protected CodeQL must still perform a real analysis on the pull request.",
    ],
  },
  1: {
    label: "Class 1 — bounded executable change",
    planning:
      "Use a concise PR plan when one subsystem changes and rollback is straightforward.",
    required: [
      "npm run check:knowledge",
      "npm run test:ci-policy",
      "npm run check:deployment-env",
      "npm run check:architecture",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
    ],
    conditional: [
      "npm run test:e2e — when runtime application code changes",
      "Protected CodeQL must perform a real analysis.",
    ],
  },
  2: {
    label: "Class 2 — UI or user-flow change",
    planning:
      "Use a concise plan for one bounded screen; use a full packet for multi-flow work or unresolved research.",
    required: [
      "npm run check:knowledge",
      "npm run test:ci-policy",
      "npm run check:deployment-env",
      "npm run check:css-ownership",
      "npm run check:architecture",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run test:e2e",
      "npm run test:ui-audit:pr",
    ],
    conditional: [
      "Human review of relevant browser evidence is required.",
      "Protected CodeQL must perform a real analysis.",
    ],
  },
  3: {
    label: "Class 3 — financial/data/security/operations",
    planning: "A full work packet is required before implementation.",
    required: ["npm run check:knowledge", "npm run test:ci-policy"],
    conditional: [
      "npm run check:deployment-env, check:architecture, lint, typecheck, test and build — when shared/application executable code changes",
      "npm run test:db — when database, migration, RLS, grant, RPC or persistent ownership truth changes",
      "npm run test:e2e — when an application flow changes",
      "npm run test:ui-audit:pr — only when a visual/layout surface changes",
      "Real CodeQL, secret controls, rollback, owner review and exact affected production verification apply to the changed boundary.",
    ],
  },
};

function cleanCell(value) {
  return value.trim().replace(/^\*\*(.*)\*\*$/, "$1");
}

export function parseContextRoutes(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Domain routes");
  if (start === -1) {
    throw new Error("docs/context/README.md is missing the Domain routes section");
  }

  const routes = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;

    const cells = line
      .slice(1, -1)
      .split("|")
      .map(cleanCell);

    if (cells.length !== 3) continue;
    if (cells[0] === "Task boundary" || /^-+$/.test(cells[0])) continue;

    routes.push({
      boundary: cells[0],
      loadNext: cells[1],
      verifyAgainst: cells[2],
    });
  }

  if (routes.length === 0) {
    throw new Error("No task routes were parsed from docs/context/README.md");
  }
  return routes;
}

export function selectRoute(routes, requestedBoundary) {
  const alias = ROUTE_ALIASES[requestedBoundary.toLowerCase()] || requestedBoundary;
  const normalized = alias.toLowerCase();
  const exact = routes.find((route) => route.boundary.toLowerCase() === normalized);
  if (exact) return exact;

  const fuzzy = routes.filter(
    (route) =>
      route.boundary.toLowerCase().includes(normalized) ||
      normalized.includes(route.boundary.toLowerCase()),
  );
  if (fuzzy.length === 1) return fuzzy[0];

  throw new Error(
    `Unknown or ambiguous boundary: ${requestedBoundary}. Use --list-boundaries to inspect valid aliases.`,
  );
}

export function parseArgs(argv) {
  const options = {
    task: null,
    boundary: null,
    riskClass: null,
    packet: null,
    root: DEFAULT_ROOT,
    base: "main",
    format: "markdown",
    output: null,
    allowMain: false,
    listBoundaries: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--allow-main") {
      options.allowMain = true;
      continue;
    }
    if (value === "--list-boundaries") {
      options.listBoundaries = true;
      continue;
    }

    const nextValue = argv[index + 1];
    const assign = (field, label) => {
      if (!nextValue || nextValue.startsWith("--")) {
        throw new Error(`${label} requires a value`);
      }
      options[field] = nextValue;
      index += 1;
    };

    if (value === "--task") assign("task", "--task");
    else if (value === "--boundary") assign("boundary", "--boundary");
    else if (value === "--class") assign("riskClass", "--class");
    else if (value === "--packet") assign("packet", "--packet");
    else if (value === "--root") assign("root", "--root");
    else if (value === "--base") assign("base", "--base");
    else if (value === "--format") assign("format", "--format");
    else if (value === "--output") assign("output", "--output");
    else throw new Error(`Unknown option: ${value}`);
  }

  if (options.listBoundaries) return options;
  if (!options.task) throw new Error("--task is required");
  if (!options.boundary) throw new Error("--boundary is required");
  if (
    !options.riskClass ||
    !["0", "1", "2", "3"].includes(String(options.riskClass))
  ) {
    throw new Error("--class must be one of 0, 1, 2 or 3");
  }
  options.riskClass = Number(options.riskClass);
  if (!["markdown", "json", "prompt"].includes(options.format)) {
    throw new Error("--format must be markdown, json or prompt");
  }
  return options;
}

function runGit(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function inspectGit(root, base = "main") {
  const branch = runGit(root, ["branch", "--show-current"]);
  const head = runGit(root, ["rev-parse", "HEAD"]);
  const statusOutput = runGit(root, ["status", "--porcelain=v1"]);
  const status = statusOutput ? statusOutput.split(/\r?\n/).filter(Boolean) : [];
  const baseRef = runGit(root, ["rev-parse", "--verify", base])
    ? base
    : `origin/${base}`;
  const mergeBase = runGit(root, ["merge-base", "HEAD", baseRef]);
  const committedDiff = mergeBase
    ? runGit(root, ["diff", "--name-only", `${mergeBase}...HEAD`])
    : null;
  const committedFiles = committedDiff
    ? committedDiff.split(/\r?\n/).filter(Boolean)
    : [];
  const dirtyFiles = status.map((line) => line.slice(3).trim()).filter(Boolean);

  return {
    available: Boolean(branch && head),
    branch,
    head,
    dirty: status.length > 0,
    status,
    changedFiles: [...new Set([...committedFiles, ...dirtyFiles])].sort(),
  };
}

function extractBacktickPaths(value) {
  return [...value.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((candidate) => candidate.includes("/") || candidate.includes("."));
}

export function buildVerificationPlan(riskClass) {
  const plan = CLASS_PLANS[riskClass];
  if (!plan) throw new Error(`Unsupported risk class: ${riskClass}`);
  return structuredClone(plan);
}

export function validateTaskState({ root, options, route, git }) {
  const errors = [];
  const warnings = [];
  const packetPath = options.packet ? resolve(root, options.packet) : null;

  for (const requiredPath of BASELINE_CONTEXT) {
    if (!existsSync(resolve(root, requiredPath))) {
      errors.push(`Missing required context: ${requiredPath}`);
    }
  }

  for (const routedPath of extractBacktickPaths(route.loadNext)) {
    if (!existsSync(resolve(root, routedPath))) {
      warnings.push(`Routed reference not found locally: ${routedPath}`);
    }
  }

  if (git.available && git.branch === "main" && !options.allowMain) {
    errors.push(
      "Current branch is main. Create a focused branch before starting implementation, or use --allow-main for read-only reconnaissance.",
    );
  }
  if (!git.available) {
    warnings.push("Git state could not be read; branch/head safety was not verified.");
  }
  if (git.dirty) {
    warnings.push(
      "Working tree is not clean; confirm the existing changes belong to this task.",
    );
  }

  if (options.riskClass === 3 && !packetPath) {
    errors.push("Class 3 requires --packet docs/plans/active/<slug>.md.");
  }
  if (packetPath && !existsSync(packetPath)) {
    errors.push(`Work packet does not exist: ${relative(root, packetPath)}`);
  }

  if (
    ["ledger", "accounts", "planning", "reports", "import", "auth", "ci"].includes(
      options.boundary.toLowerCase(),
    ) && options.riskClass < 3
  ) {
    warnings.push(
      "This boundary commonly reaches Class 3. Reconfirm that the selected task does not alter financial, data, security or operational truth.",
    );
  }
  if (
    ["ui", "brand"].includes(options.boundary.toLowerCase()) &&
    options.riskClass < 2
  ) {
    warnings.push("This boundary commonly requires Class 2 browser and responsive evidence.");
  }

  return {
    errors,
    warnings,
    packet: packetPath ? relative(root, packetPath) : null,
  };
}

function listActivePackets(root) {
  const directory = resolve(root, "docs/plans/active");
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs/plans/active/${name}`)
    .sort();
}

export function buildManifest({ root, options, route, git, validation }) {
  const verification = buildVerificationPlan(options.riskClass);
  const routedPaths = extractBacktickPaths(route.loadNext);
  const readNow = [...new Set([...BASELINE_CONTEXT, ...routedPaths])];

  return {
    generatedAt: new Date().toISOString(),
    task: options.task,
    boundary: route.boundary,
    boundaryAlias: options.boundary,
    riskClass: options.riskClass,
    riskLabel: verification.label,
    repository: {
      branch: git.branch,
      head: git.head,
      dirty: git.dirty,
      changedFiles: git.changedFiles,
    },
    context: {
      readNow,
      loadNext: route.loadNext,
      verifyAgainst: route.verifyAgainst,
      packet: validation.packet,
      activePackets: listActivePackets(root),
    },
    planning: verification.planning,
    verification: {
      required: verification.required,
      conditional: verification.conditional,
    },
    errors: validation.errors,
    warnings: validation.warnings,
    safety: [
      "Do not write directly to main, merge, deploy, change branch protection or alter provider settings without owner authorization.",
      "Treat open pull requests and external research as candidate evidence until accepted and merged.",
      "Keep one task and one scope; report unrelated defects instead of fixing them.",
      "State exactly which gates ran, passed, failed or were not applicable.",
    ],
  };
}

function bullets(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function renderPrompt(manifest) {
  return [
    `Work on MoneyFlow task: ${manifest.task}`,
    "",
    `Boundary: ${manifest.boundary}`,
    `Risk: ${manifest.riskLabel}`,
    manifest.context.packet
      ? `Active packet: ${manifest.context.packet}`
      : "Active packet: not supplied",
    "",
    "Read only the following starting context, in order:",
    ...manifest.context.readNow.map((path, index) => `${index + 1}. ${path}`),
    "",
    `Route guidance: ${manifest.context.loadNext}`,
    `Verify against: ${manifest.context.verifyAgainst}`,
    "",
    "Before coding, inspect affected code/tests and reconcile the task with current merged truth. Do not preload unrelated PR history.",
    "Implement the smallest coherent slice, keep requirements unchanged, and preserve MoneyFlow financial/ownership invariants.",
    "Run the risk-selected verification listed by the task brief and report exact evidence. Never merge or deploy without owner authorization.",
  ].join("\n");
}

export function renderMarkdown(manifest) {
  const repoLine = manifest.repository.branch
    ? `${manifest.repository.branch}@${manifest.repository.head || "unknown"}`
    : "unavailable";

  return [
    "# MoneyFlow task brief",
    "",
    `- **Task:** ${manifest.task}`,
    `- **Boundary:** ${manifest.boundary}`,
    `- **Risk:** ${manifest.riskLabel}`,
    `- **Repository state:** ${repoLine}`,
    `- **Working tree:** ${manifest.repository.dirty ? "dirty" : "clean or unavailable"}`,
    `- **Work packet:** ${manifest.context.packet || "not supplied"}`,
    "",
    "## Blocking errors",
    "",
    bullets(manifest.errors),
    "",
    "## Warnings",
    "",
    bullets(manifest.warnings),
    "",
    "## Read now",
    "",
    ...manifest.context.readNow.map((path, index) => `${index + 1}. \`${path}\``),
    "",
    "## Boundary guidance",
    "",
    `- **Load next:** ${manifest.context.loadNext}`,
    `- **Verify against:** ${manifest.context.verifyAgainst}`,
    "",
    "## Planning",
    "",
    manifest.planning,
    "",
    "## Required verification",
    "",
    bullets(manifest.verification.required.map((item) => `\`${item}\``)),
    "",
    "## Conditional and human evidence",
    "",
    bullets(manifest.verification.conditional),
    "",
    "## Changed files already present",
    "",
    bullets(manifest.repository.changedFiles.map((path) => `\`${path}\``)),
    "",
    "## Safety boundary",
    "",
    bullets(manifest.safety),
    "",
    "## Ready-to-use agent prompt",
    "",
    "```text",
    renderPrompt(manifest),
    "```",
    "",
  ].join("\n");
}

function printBoundaries() {
  for (const [alias, boundary] of Object.entries(ROUTE_ALIASES)) {
    console.log(`${alias.padEnd(10)} ${boundary}`);
  }
}

function writeOutput(path, content) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(
      "Usage: npm run task:brief -- --task \"...\" --boundary ui --class 2 [--packet path] [--format markdown|json|prompt] [--output path] [--allow-main]",
    );
    return 2;
  }

  if (options.listBoundaries) {
    printBoundaries();
    return 0;
  }

  const root = resolve(options.root);
  try {
    const routerPath = resolve(root, "docs/context/README.md");
    const routes = parseContextRoutes(readFileSync(routerPath, "utf8"));
    const route = selectRoute(routes, options.boundary);
    const git = inspectGit(root, options.base);
    const validation = validateTaskState({ root, options, route, git });
    const manifest = buildManifest({ root, options, route, git, validation });

    const content =
      options.format === "json"
        ? JSON.stringify(manifest, null, 2)
        : options.format === "prompt"
          ? renderPrompt(manifest)
          : renderMarkdown(manifest);

    if (options.output) writeOutput(resolve(root, options.output), content);
    else console.log(content);

    if (validation.errors.length > 0) {
      console.error("Task brief blocked:");
      for (const error of validation.errors) console.error(`- ${error}`);
    }

    return validation.errors.length > 0 ? 3 : 0;
  } catch (error) {
    console.error(error.message);
    return 2;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) process.exitCode = main();
