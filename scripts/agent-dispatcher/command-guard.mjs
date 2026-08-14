#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { basename, isAbsolute } from "node:path";
import process from "node:process";

const BLOCKED_GIT_OPERATIONS = new Set(["merge", "pull", "rebase"]);
const BLOCKED_BRANCH_CONTROL_OPERATIONS = new Set(["branch", "checkout", "switch", "worktree"]);
const ALLOWED_GIT_OPERATIONS = new Set([
  "add",
  "apply",
  "cat-file",
  "commit",
  "diff",
  "diff-tree",
  "fetch",
  "for-each-ref",
  "grep",
  "log",
  "ls-files",
  "ls-remote",
  "merge-base",
  "mv",
  "push",
  "remote",
  "reset",
  "restore",
  "rev-list",
  "rev-parse",
  "rm",
  "show",
  "stash",
  "status",
  "update-index",
]);
const MUTATING_GIT_OPERATIONS = new Set([
  "add",
  "apply",
  "commit",
  "fetch",
  "mv",
  "push",
  "reset",
  "restore",
  "rm",
  "stash",
  "update-index",
]);
const ALLOWED_GIT_GLOBAL_FLAGS = new Set([
  "--glob-pathspecs",
  "--icase-pathspecs",
  "--literal-pathspecs",
  "--no-pager",
  "--noglob-pathspecs",
]);
const FORCE_PUSH_FLAGS = new Set(["--force", "-f", "--force-with-lease"]);
const SAFE_PUSH_FLAGS = new Set(["-u", "--set-upstream"]);
const SAFE_GH_SUBCOMMANDS = new Map([
  ["auth", new Set(["status"])],
  ["issue", new Set(["list", "view"])],
  ["pr", new Set(["checks", "create", "diff", "list", "status", "view"])],
  ["repo", new Set(["view"])],
  ["run", new Set(["list", "view", "watch"])],
]);

function gitOperationContext(args) {
  let index = 0;
  while (index < args.length && args[index].startsWith("-")) {
    const option = args[index];
    if (!ALLOWED_GIT_GLOBAL_FLAGS.has(option)) {
      const blockedLater = args.slice(index + 1).find((value) => BLOCKED_GIT_OPERATIONS.has(value));
      const mergePrefix = blockedLater ? "merge / " : "";
      return { violation: `${mergePrefix}Git global option '${option}' is not permitted` };
    }
    index += 1;
  }
  const operation = args[index] ?? "";
  return { operation, tail: args.slice(index + 1), violation: null };
}

function pushViolation(tail) {
  if (
    tail.some((argument) =>
      FORCE_PUSH_FLAGS.has(argument) || argument.startsWith("--force-with-lease="),
    )
  ) {
    return "force-push is not permitted";
  }

  const positional = [];
  for (const argument of tail) {
    if (SAFE_PUSH_FLAGS.has(argument)) continue;
    if (argument.startsWith("-")) {
      return `Git push option '${argument}' is not in the dispatcher allowlist`;
    }
    positional.push(argument);
  }

  if (positional.length !== 2 || positional[0] !== "origin" || positional[1] !== "HEAD") {
    return "Git push is limited to 'origin HEAD' from the isolated feature branch";
  }
  return null;
}

function fetchViolation(tail) {
  const positional = tail.filter((argument) => !argument.startsWith("-"));
  if (tail.some((argument) => argument.includes(":"))) {
    return "Git fetch refspec destinations are not permitted";
  }
  if (positional.length === 0 || positional[0] !== "origin") {
    return "Git fetch is limited to the origin remote";
  }
  return null;
}

function remoteViolation(tail) {
  if (tail.length === 1 && tail[0] === "-v") return null;
  if (tail[0] === "get-url" && tail.at(-1) === "origin") return null;
  if (tail.length === 2 && tail[0] === "show" && tail[1] === "origin") return null;
  return "Git remote mutation is not permitted";
}

function stashViolation(tail) {
  const subcommand = tail.find((argument) => !argument.startsWith("-")) ?? "push";
  if (["apply", "clear", "drop", "list", "pop", "push", "show"].includes(subcommand)) {
    return null;
  }
  return `Git stash subcommand '${subcommand}' is not permitted`;
}

function commitViolation(tail) {
  if (tail.includes("--amend")) return "Git commit amend is not permitted in the dispatcher lane";
  if (tail.includes("--no-verify") || tail.includes("-n")) {
    return "Git commit may not bypass repository hooks";
  }
  return null;
}

export function gitBoundaryViolation(args) {
  const context = gitOperationContext(args);
  if (context.violation) return context.violation;

  const { operation, tail } = context;
  if (!operation) return "Git operation is ambiguous";
  if (BLOCKED_GIT_OPERATIONS.has(operation)) return "merge operations are not permitted";
  if (BLOCKED_BRANCH_CONTROL_OPERATIONS.has(operation)) {
    return "main/branch-control operations are not permitted from the dispatcher child";
  }
  if (!ALLOWED_GIT_OPERATIONS.has(operation)) {
    return `Git operation '${operation}' is not in the dispatcher allowlist`;
  }
  if (operation === "push") return pushViolation(tail);
  if (operation === "fetch") return fetchViolation(tail);
  if (operation === "remote") return remoteViolation(tail);
  if (operation === "stash") return stashViolation(tail);
  if (operation === "commit") return commitViolation(tail);
  return null;
}

function flagValue(args, longName, shortName) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === longName || value === shortName) return args[index + 1] ?? "";
    if (value.startsWith(`${longName}=`)) return value.slice(longName.length + 1);
  }
  return "";
}

export function prCreateDeliveryViolation(args, currentBranchName = undefined) {
  if (!args.includes("--draft") && !args.includes("-d")) {
    return "dispatcher-created pull requests must remain draft";
  }
  if (args.includes("--dry-run") || args.includes("--web")) {
    return "dispatcher PR creation must use the non-interactive explicit-head path";
  }
  const head = flagValue(args, "--head", "-H");
  if (!head || head === "main" || head.includes(":")) {
    return "dispatcher PR creation requires an explicit same-repository non-main --head branch";
  }
  const base = flagValue(args, "--base", "-B");
  if (base && base !== "main") {
    return "dispatcher PR creation may only target main";
  }
  if (currentBranchName !== undefined) {
    if (!currentBranchName || currentBranchName === "main") {
      return "dispatcher PR creation requires an unambiguous current isolated branch";
    }
    if (head !== currentBranchName) {
      return "dispatcher PR --head must match the current isolated branch";
    }
  }
  return null;
}

export function ghBoundaryViolation(args) {
  const topLevel = args[0] ?? "";
  const subcommand = args[1] ?? "";
  const allowedSubcommands = SAFE_GH_SUBCOMMANDS.get(topLevel);
  if (!allowedSubcommands || !allowedSubcommands.has(subcommand)) {
    return `GitHub CLI operation '${[topLevel, subcommand].filter(Boolean).join(" ") || "<empty>"}' is not in the dispatcher allowlist`;
  }
  if (topLevel === "auth" && (args.includes("--show-token") || args.includes("-t"))) {
    return "GitHub authentication tokens must not be exposed to the dispatcher child";
  }
  return null;
}

function expectedExecutableName(tool) {
  return process.platform === "win32" ? `${tool}.exe` : tool;
}

function realToolViolation(tool, realTool) {
  if (!isAbsolute(realTool)) return "real tool path is not absolute";
  const actual = basename(realTool).toLowerCase();
  const expected = expectedExecutableName(tool).toLowerCase();
  if (actual !== expected && actual !== tool.toLowerCase()) {
    return `real tool path does not resolve to ${tool}`;
  }
  return null;
}

function currentBranch(executable, environment) {
  const result = spawnSync(executable, ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return null;
  const branch = String(result.stdout ?? "").trim();
  if (!branch || branch === "HEAD") return null;
  return branch;
}

function runGuard(argv = process.argv.slice(2), environment = process.env) {
  const [tool, realTool, ...args] = argv;
  const realToolProblem = realToolViolation(tool, realTool ?? "");
  const commandViolation = tool === "git"
    ? gitBoundaryViolation(args)
    : tool === "gh"
      ? ghBoundaryViolation(args)
      : "unknown tool";
  const currentBranchName =
    tool === "gh" && args[0] === "pr" && args[1] === "create"
      ? currentBranch("git", environment)
      : undefined;
  const deliveryViolation =
    tool === "gh" && args[0] === "pr" && args[1] === "create"
      ? prCreateDeliveryViolation(args, currentBranchName)
      : null;
  const violation = realToolProblem ?? commandViolation ?? deliveryViolation;
  if (violation) {
    console.error(`Dispatcher blocked ${tool}: ${violation}`);
    return 126;
  }

  if (tool === "git") {
    const { operation } = gitOperationContext(args);
    if (MUTATING_GIT_OPERATIONS.has(operation)) {
      const branch = currentBranch(realTool, environment);
      if (!branch || branch === "main") {
        console.error("Dispatcher blocked git: mutating Git commands require an unambiguous non-main branch");
        return 126;
      }
    }
  }

  const result = spawnSync(realTool, args, {
    encoding: "utf8",
    env: environment,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = runGuard();
