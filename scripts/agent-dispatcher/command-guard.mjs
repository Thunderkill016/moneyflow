#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const BLOCKED_GIT_OPERATIONS = new Set(["merge", "pull", "rebase"]);
const ALLOWED_GIT_OPERATIONS = new Set([
  "add",
  "apply",
  "branch",
  "cat-file",
  "checkout",
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
  "switch",
  "update-index",
  "worktree",
]);
const ALLOWED_GH_TOP_LEVEL = new Set(["auth", "issue", "pr", "repo", "run"]);
const FORCE_PUSH_FLAGS = new Set(["--force", "-f", "--force-with-lease"]);
const MAIN_REFERENCE_PATTERN = /(?:^|[/:])(?:origin\/)?main(?:$|[/:])/u;
const FORBIDDEN_GITHUB_API_PATTERN = /\/(?:merge|merges|git\/refs\/heads\/main)(?:\/|$)/u;
const GIT_GLOBAL_OPTIONS_WITH_VALUES = new Set([
  "-C",
  "-c",
  "--config-env",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree",
]);

function inlineGitConfigViolation(args) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    let config = null;
    if (argument === "-c" || argument === "--config-env") {
      config = args[index + 1] ?? "";
      index += 1;
    } else if (argument.startsWith("-c") && argument.length > 2) {
      config = argument.slice(2);
    } else if (argument.startsWith("--config-env=")) {
      config = argument.slice("--config-env=".length);
    }
    if (config && /^alias\./iu.test(config.split("=", 1)[0])) {
      return "inline Git aliases are not permitted";
    }
  }
  return null;
}

function firstGitOperation(args) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (GIT_GLOBAL_OPTIONS_WITH_VALUES.has(argument)) {
      index += 1;
      continue;
    }
    if (argument.startsWith("-c") && argument.length > 2) continue;
    if (argument.startsWith("--config-env=")) continue;
    if (argument.startsWith("-")) continue;
    return argument;
  }
  return "";
}

export function gitBoundaryViolation(args) {
  const inlineConfigViolation = inlineGitConfigViolation(args);
  if (inlineConfigViolation) return inlineConfigViolation;

  const operation = firstGitOperation(args);
  if (!operation) return "Git operation is ambiguous";
  if (BLOCKED_GIT_OPERATIONS.has(operation)) return "merge operations are not permitted";
  if (!ALLOWED_GIT_OPERATIONS.has(operation)) {
    return `Git operation '${operation}' is not in the dispatcher allowlist`;
  }
  if (
    operation === "push" &&
    args.some((argument) => FORCE_PUSH_FLAGS.has(argument) || argument.startsWith("--force-with-lease="))
  ) {
    return "force-push is not permitted";
  }
  if (
    ["branch", "checkout", "switch", "push", "worktree"].includes(operation) &&
    args.some((argument) => MAIN_REFERENCE_PATTERN.test(argument))
  ) {
    return "main branch operations are not permitted";
  }
  return null;
}

export function ghBoundaryViolation(args) {
  const topLevel = args[0] ?? "";
  if (!ALLOWED_GH_TOP_LEVEL.has(topLevel) && topLevel !== "api") {
    return `GitHub CLI operation '${topLevel || "<empty>"}' is not in the dispatcher allowlist`;
  }
  if (topLevel === "pr" && args[1] === "merge") {
    return "pull request merge is not permitted";
  }
  if (topLevel === "repo" && args[1] === "sync") {
    return "repository sync is not permitted";
  }
  if (topLevel === "api" && args[1] === "graphql") {
    return "GitHub GraphQL mutations are not permitted from the dispatcher lane";
  }
  if (topLevel === "api" && args.some((argument) => FORBIDDEN_GITHUB_API_PATTERN.test(argument))) {
    return "GitHub merge or main-ref API operation is not permitted";
  }
  return null;
}

function runGuard(argv = process.argv.slice(2), environment = process.env) {
  const [tool, ...args] = argv;
  const violation = tool === "git"
    ? gitBoundaryViolation(args)
    : tool === "gh"
      ? ghBoundaryViolation(args)
      : "unknown tool";
  if (violation) {
    console.error(`Dispatcher blocked ${tool}: ${violation}`);
    return 126;
  }
  const originalPath = environment.MONEYFLOW_DISPATCHER_ORIGINAL_PATH;
  if (!originalPath) {
    console.error("Dispatcher guard has no original PATH");
    return 126;
  }
  const result = spawnSync(tool, args, {
    encoding: "utf8",
    env: { ...environment, PATH: originalPath },
    stdio: "inherit",
  });
  return result.status ?? 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = runGuard();
