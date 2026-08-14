#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const BLOCKED_GIT_OPERATIONS = new Set(["merge", "pull", "rebase"]);
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

function firstGitOperation(args) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (GIT_GLOBAL_OPTIONS_WITH_VALUES.has(argument)) {
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) continue;
    return argument;
  }
  return "";
}

export function gitBoundaryViolation(args) {
  const operation = firstGitOperation(args);
  if (BLOCKED_GIT_OPERATIONS.has(operation)) return "merge operations are not permitted";
  if (
    operation === "push" &&
    args.some((argument) => FORCE_PUSH_FLAGS.has(argument) || argument.startsWith("--force-with-lease="))
  ) {
    return "force-push is not permitted";
  }
  if (
    ["branch", "checkout", "switch", "push", "update-ref", "worktree"].includes(operation) &&
    args.some((argument) => MAIN_REFERENCE_PATTERN.test(argument))
  ) {
    return "main branch operations are not permitted";
  }
  return null;
}

export function ghBoundaryViolation(args) {
  if (args.some((argument, index) => argument === "pr" && args[index + 1] === "merge")) {
    return "pull request merge is not permitted";
  }
  if (args[0] === "api" && args.some((argument) => FORBIDDEN_GITHUB_API_PATTERN.test(argument))) {
    return "GitHub merge or main-ref API operation is not permitted";
  }
  return null;
}

function runGuard(argv = process.argv.slice(2), environment = process.env) {
  const [tool, ...args] = argv;
  const violation = tool === "git" ? gitBoundaryViolation(args) : tool === "gh" ? ghBoundaryViolation(args) : "unknown tool";
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
