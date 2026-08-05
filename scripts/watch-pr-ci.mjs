#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_INTERVAL_SECONDS = 15;
const CHECK_FAILURE_EXIT_CODE = 1;
const PENDING_EXIT_CODE = 8;

export function parseArgs(argv) {
  const options = {
    pr: null,
    repo: process.env.GITHUB_REPOSITORY || null,
    once: false,
    required: false,
    interval: DEFAULT_INTERVAL_SECONDS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--once") {
      options.once = true;
      continue;
    }

    if (value === "--required") {
      options.required = true;
      continue;
    }

    if (value === "--repo") {
      const repo = argv[index + 1];
      if (!repo) throw new Error("--repo requires OWNER/REPO");
      options.repo = repo;
      index += 1;
      continue;
    }

    if (value === "--interval") {
      const interval = Number(argv[index + 1]);
      if (!Number.isInteger(interval) || interval < 5) {
        throw new Error("--interval must be an integer of at least 5 seconds");
      }
      options.interval = interval;
      index += 1;
      continue;
    }

    if (value.startsWith("--")) {
      throw new Error(`Unknown option: ${value}`);
    }

    if (options.pr !== null) {
      throw new Error("Provide at most one PR number or URL");
    }

    options.pr = value;
  }

  return options;
}

export function summarizeChecks(checks) {
  const counts = {
    pass: 0,
    fail: 0,
    pending: 0,
    skipping: 0,
    cancel: 0,
    other: 0,
  };

  for (const check of checks) {
    const bucket = check.bucket || "other";
    if (Object.hasOwn(counts, bucket)) counts[bucket] += 1;
    else counts.other += 1;
  }

  return counts;
}

export function hasFailedChecks(checks) {
  return checks.some((check) => check.bucket === "fail" || check.bucket === "cancel");
}

export function hasPendingChecks(checks) {
  return checks.some((check) => check.bucket === "pending");
}

export function isReadableChecksExitCode(status) {
  return [0, CHECK_FAILURE_EXIT_CODE, PENDING_EXIT_CODE].includes(status);
}

function ghArgsWithRepo(args, repo) {
  return repo ? [...args, "--repo", repo] : args;
}

function runGh(args, { repo, capture = true, allowFailure = false } = {}) {
  const result = spawnSync("gh", ghArgsWithRepo(args, repo), {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Unable to run GitHub CLI: ${result.error.message}`);
  }

  if (!allowFailure && result.status !== 0) {
    const details = capture ? result.stderr.trim() || result.stdout.trim() : "";
    throw new Error(`gh ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }

  return result;
}

function readJson(args, repo) {
  const result = runGh(args, { repo });
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub CLI returned invalid JSON: ${error.message}`);
  }
}

function resolvePullRequest(pr, repo) {
  const selector = pr ? [String(pr)] : [];
  return readJson(
    [
      "pr",
      "view",
      ...selector,
      "--json",
      "number,url,headRefOid,headRefName,isDraft,state",
    ],
    repo,
  );
}

function readChecks(prNumber, repo, required) {
  const args = [
    "pr",
    "checks",
    String(prNumber),
    "--json",
    "name,state,bucket,workflow,link,startedAt,completedAt",
  ];
  if (required) args.push("--required");

  const result = runGh(args, { repo, allowFailure: true });
  if (!isReadableChecksExitCode(result.status)) {
    const details = result.stderr.trim() || result.stdout.trim();
    throw new Error(`Unable to read PR checks${details ? `: ${details}` : ""}`);
  }

  return JSON.parse(result.stdout || "[]");
}

function printChecks(checks) {
  const counts = summarizeChecks(checks);
  console.log(
    `Checks: ${counts.pass} pass, ${counts.pending} pending, ${counts.fail} fail, ` +
      `${counts.cancel} cancelled, ${counts.skipping} skipped`,
  );

  for (const check of checks) {
    const workflow = check.workflow ? ` · ${check.workflow}` : "";
    console.log(`- [${check.bucket ?? check.state}] ${check.name}${workflow}`);
  }
}

function printFailedRunLogs(headSha, repo) {
  const runs = readJson(
    [
      "run",
      "list",
      "--commit",
      headSha,
      "--limit",
      "30",
      "--json",
      "databaseId,workflowName,status,conclusion,headSha,url",
    ],
    repo,
  );

  const failedRuns = runs.filter(
    (run) =>
      run.headSha === headSha &&
      ["failure", "cancelled", "timed_out", "action_required", "startup_failure"].includes(
        run.conclusion,
      ),
  );

  if (failedRuns.length === 0) {
    console.error("No failed exact-head workflow run was available for log extraction.");
    return;
  }

  for (const run of failedRuns) {
    console.error(`\n## ${run.workflowName || "Workflow"} · run ${run.databaseId}`);
    console.error(run.url);
    runGh(["run", "view", String(run.databaseId), "--log-failed"], {
      repo,
      capture: false,
      allowFailure: true,
    });
  }
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(
      "Usage: node scripts/watch-pr-ci.mjs [PR_NUMBER_OR_URL] [--once] [--required] [--repo OWNER/REPO] [--interval SECONDS]",
    );
    return 2;
  }

  let pullRequest;
  try {
    pullRequest = resolvePullRequest(options.pr, options.repo);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  const headBefore = pullRequest.headRefOid;
  console.log(`PR #${pullRequest.number}: ${pullRequest.url}`);
  console.log(`Branch: ${pullRequest.headRefName}`);
  console.log(`Exact head: ${headBefore}`);
  console.log(`Draft: ${pullRequest.isDraft ? "yes" : "no"}`);

  if (options.once) {
    try {
      const checks = readChecks(pullRequest.number, options.repo, options.required);
      printChecks(checks);
      if (hasFailedChecks(checks)) return CHECK_FAILURE_EXIT_CODE;
      if (hasPendingChecks(checks)) return PENDING_EXIT_CODE;
      return 0;
    } catch (error) {
      console.error(error.message);
      return 2;
    }
  }

  const watchArgs = [
    "pr",
    "checks",
    String(pullRequest.number),
    "--watch",
    "--fail-fast",
    "--interval",
    String(options.interval),
  ];
  if (options.required) watchArgs.push("--required");

  const watch = runGh(watchArgs, {
    repo: options.repo,
    capture: false,
    allowFailure: true,
  });

  let headAfter;
  let checks;
  try {
    headAfter = resolvePullRequest(pullRequest.number, options.repo).headRefOid;
    checks = readChecks(pullRequest.number, options.repo, options.required);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  console.log("");
  printChecks(checks);

  if (headAfter !== headBefore) {
    console.error(
      `Head moved while checks were running: ${headBefore} -> ${headAfter}. ` +
        "The previous result is stale; run the command again.",
    );
    return 3;
  }

  if (watch.status !== 0 || hasFailedChecks(checks)) {
    console.error(`Exact head ${headBefore} did not pass all selected checks.`);
    try {
      printFailedRunLogs(headBefore, options.repo);
    } catch (error) {
      console.error(`Unable to extract failed logs: ${error.message}`);
    }
    return CHECK_FAILURE_EXIT_CODE;
  }

  if (hasPendingChecks(checks)) {
    console.error(`Exact head ${headBefore} still has pending checks.`);
    return PENDING_EXIT_CODE;
  }

  console.log(`Exact head ${headBefore} passed all selected checks.`);
  return 0;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  process.exitCode = main();
}
