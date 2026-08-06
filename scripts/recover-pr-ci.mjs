#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_WORKFLOW = "ci.yml";
const DEFAULT_STALE_AFTER_SECONDS = 15 * 60;
const DEFAULT_INTERVAL_SECONDS = 10;
const DEFAULT_DISCOVERY_TIMEOUT_SECONDS = 2 * 60;
const DEFAULT_CANCEL_GRACE_SECONDS = 10;

const EXIT_FAILURE = 1;
const EXIT_USAGE = 2;
const EXIT_STALE_HEAD = 3;
const EXIT_PENDING = 8;

const ACTIVE_RUN_STATUSES = new Set([
  "queued",
  "in_progress",
  "requested",
  "waiting",
  "pending",
]);

export function parseArgs(argv, env = process.env) {
  const options = {
    pr: null,
    repo: env.GITHUB_REPOSITORY || null,
    workflow: DEFAULT_WORKFLOW,
    staleAfterSeconds: DEFAULT_STALE_AFTER_SECONDS,
    intervalSeconds: DEFAULT_INTERVAL_SECONDS,
    discoveryTimeoutSeconds: DEFAULT_DISCOVERY_TIMEOUT_SECONDS,
    cancelGraceSeconds: DEFAULT_CANCEL_GRACE_SECONDS,
    force: false,
    dryRun: false,
    cancelOnly: false,
    watch: true,
    help: false,
  };

  const readValue = (flag, index) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  };

  const readInteger = (flag, index, minimum) => {
    const raw = readValue(flag, index);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < minimum) {
      throw new Error(`${flag} must be an integer of at least ${minimum}`);
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--help" || value === "-h") {
      options.help = true;
      continue;
    }
    if (value === "--force") {
      options.force = true;
      continue;
    }
    if (value === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (value === "--cancel-only") {
      options.cancelOnly = true;
      continue;
    }
    if (value === "--no-watch") {
      options.watch = false;
      continue;
    }
    if (value === "--repo") {
      options.repo = readValue(value, index);
      index += 1;
      continue;
    }
    if (value === "--workflow") {
      options.workflow = readValue(value, index);
      index += 1;
      continue;
    }
    if (value === "--stale-after") {
      options.staleAfterSeconds = readInteger(value, index, 60);
      index += 1;
      continue;
    }
    if (value === "--interval") {
      options.intervalSeconds = readInteger(value, index, 3);
      index += 1;
      continue;
    }
    if (value === "--discovery-timeout") {
      options.discoveryTimeoutSeconds = readInteger(value, index, 15);
      index += 1;
      continue;
    }
    if (value === "--cancel-grace") {
      options.cancelGraceSeconds = readInteger(value, index, 0);
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

  if (!options.help && options.pr === null) {
    throw new Error("Provide a pull request number or URL");
  }
  if (!options.help && !options.repo) {
    throw new Error("Provide --repo OWNER/REPO or set GITHUB_REPOSITORY");
  }
  return options;
}

export function isActiveRun(run) {
  return Boolean(run && ACTIVE_RUN_STATUSES.has(run.status));
}

export function runIdleSeconds(run, nowMs = Date.now()) {
  if (!run) return null;
  const timestamp = run.updatedAt || run.startedAt || run.createdAt;
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((nowMs - parsed) / 1000));
}

export function chooseExactHeadRun(runs, headSha) {
  return [...runs]
    .filter((run) => run.headSha === headSha)
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || 0) || 0;
      const rightTime = Date.parse(right.createdAt || 0) || 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
      return Number(right.databaseId || 0) - Number(left.databaseId || 0);
    })[0] ?? null;
}

export function findReplacementRun(runs, { headSha, previousRunIds }) {
  const previousIds = new Set([...previousRunIds].map(Number));
  return [...runs]
    .filter(
      (run) =>
        run.headSha === headSha &&
        run.event === "workflow_dispatch" &&
        !previousIds.has(Number(run.databaseId)),
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || 0) || 0;
      const rightTime = Date.parse(right.createdAt || 0) || 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
      return Number(right.databaseId || 0) - Number(left.databaseId || 0);
    })[0] ?? null;
}

export function buildRecoveryPlan({
  run,
  staleAfterSeconds,
  force,
  cancelOnly,
  nowMs = Date.now(),
}) {
  if (!run) {
    return cancelOnly
      ? { action: "nothing_to_cancel", reason: "No exact-head run exists." }
      : { action: "dispatch", reason: "No exact-head run exists." };
  }

  if (run.status === "completed") {
    if (run.conclusion === "success") {
      return {
        action: "already_success",
        reason: "The newest exact-head run already succeeded.",
      };
    }
    return cancelOnly
      ? {
          action: "nothing_to_cancel",
          reason: `The newest exact-head run is already ${run.conclusion || "completed"}.`,
        }
      : {
          action: "dispatch",
          reason: `The newest exact-head run completed with ${run.conclusion || "an unknown conclusion"}.`,
        };
  }

  if (!isActiveRun(run)) {
    return force
      ? {
          action: cancelOnly ? "cancel" : "cancel_and_dispatch",
          reason: `The newest exact-head run has non-terminal status '${run.status || "unknown"}' and --force was supplied.`,
        }
      : {
          action: "pending",
          reason: `The newest exact-head run has non-terminal status '${run.status || "unknown"}'.`,
        };
  }

  const idleSeconds = runIdleSeconds(run, nowMs);
  if (!force && idleSeconds === null) {
    return {
      action: "pending",
      idleSeconds,
      reason: "The newest exact-head run is active, but its idle time cannot be established safely.",
    };
  }
  if (!force && idleSeconds < staleAfterSeconds) {
    return {
      action: "pending",
      idleSeconds,
      reason: `The newest exact-head run is active and has been idle for ${idleSeconds}s, below the ${staleAfterSeconds}s threshold.`,
    };
  }

  return {
    action: cancelOnly ? "cancel" : "cancel_and_dispatch",
    idleSeconds,
    reason: force
      ? "--force authorizes recovery of the active exact-head run."
      : `The active exact-head run has been idle for ${idleSeconds}s, meeting the ${staleAfterSeconds}s threshold.`,
  };
}

export function forceCancelApiPath(repo, runId) {
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    throw new Error("Repository must use OWNER/REPO format");
  }
  return `repos/${repo}/actions/runs/${runId}/force-cancel`;
}

function usage() {
  return `Usage: node scripts/recover-pr-ci.mjs PR_NUMBER_OR_URL --repo OWNER/REPO [options]\n\n` +
    `Options:\n` +
    `  --workflow FILE_OR_NAME       Workflow to dispatch (default: ${DEFAULT_WORKFLOW})\n` +
    `  --stale-after SECONDS         Minimum idle time before automatic cancellation (default: ${DEFAULT_STALE_AFTER_SECONDS})\n` +
    `  --force                       Recover an active run without waiting for the stale threshold\n` +
    `  --dry-run                     Print the recovery plan without Actions writes\n` +
    `  --cancel-only                 Cancel an eligible run without dispatching a replacement\n` +
    `  --no-watch                    Return after the replacement run is discovered\n` +
    `  --interval SECONDS            Poll/watch interval (default: ${DEFAULT_INTERVAL_SECONDS})\n` +
    `  --discovery-timeout SECONDS   Time allowed to discover the replacement run (default: ${DEFAULT_DISCOVERY_TIMEOUT_SECONDS})\n` +
    `  --cancel-grace SECONDS        Grace period before force-cancel fallback (default: ${DEFAULT_CANCEL_GRACE_SECONDS})\n` +
    `  -h, --help                    Show this help`;
}

function ghArgsWithRepo(args, repo) {
  return repo ? [...args, "--repo", repo] : args;
}

function runGh(
  args,
  { repo, capture = true, allowFailure = false, attachRepo = true } = {},
) {
  const finalArgs = attachRepo ? ghArgsWithRepo(args, repo) : args;
  const result = spawnSync("gh", finalArgs, {
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
    return JSON.parse(result.stdout || "null");
  } catch (error) {
    throw new Error(`GitHub CLI returned invalid JSON: ${error.message}`);
  }
}

function resolvePullRequest(pr, repo) {
  return readJson(
    [
      "pr",
      "view",
      String(pr),
      "--json",
      "number,url,headRefOid,headRefName,isDraft,state",
    ],
    repo,
  );
}

function listWorkflowRuns({ repo, workflow, headSha }) {
  return readJson(
    [
      "run",
      "list",
      "--workflow",
      workflow,
      "--commit",
      headSha,
      "--limit",
      "50",
      "--json",
      "databaseId,workflowName,status,conclusion,headSha,headBranch,event,createdAt,startedAt,updatedAt,url,attempt",
    ],
    repo,
  );
}

function readRun(runId, repo) {
  return readJson(
    [
      "run",
      "view",
      String(runId),
      "--json",
      "databaseId,status,conclusion,headSha,headBranch,event,createdAt,startedAt,updatedAt,url,attempt",
    ],
    repo,
  );
}

function sleep(seconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, seconds * 1000));
}

async function assertUnmovedHead({ pr, repo, expectedHead }) {
  const current = resolvePullRequest(pr, repo);
  if (current.headRefOid !== expectedHead) {
    throw Object.assign(
      new Error(`PR head moved: ${expectedHead} -> ${current.headRefOid}`),
      { exitCode: EXIT_STALE_HEAD },
    );
  }
  return current;
}

async function cancelRun({ runId, repo, graceSeconds, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] gh run cancel ${runId}`);
    console.log(`[dry-run] gh run cancel ${runId} --force (only if still active)`);
    return;
  }

  const normalCancel = runGh(["run", "cancel", String(runId)], {
    repo,
    allowFailure: true,
  });
  if (normalCancel.status !== 0) {
    const details = normalCancel.stderr.trim() || normalCancel.stdout.trim();
    console.warn(`Normal cancellation did not complete${details ? `: ${details}` : "."}`);
  }

  if (graceSeconds > 0) await sleep(graceSeconds);

  const afterNormal = readRun(runId, repo);
  if (!isActiveRun(afterNormal)) {
    console.log(`Run ${runId} is now ${afterNormal.status}/${afterNormal.conclusion || "none"}.`);
    return;
  }

  console.log(`Run ${runId} is still ${afterNormal.status}; force-cancelling.`);
  const forceCancel = runGh(["run", "cancel", String(runId), "--force"], {
    repo,
    allowFailure: true,
  });
  if (forceCancel.status === 0) return;

  const path = forceCancelApiPath(repo, runId);
  const fallback = runGh(
    [
      "api",
      "--method",
      "POST",
      "-H",
      "Accept: application/vnd.github+json",
      path,
    ],
    { attachRepo: false, allowFailure: true },
  );
  if (fallback.status !== 0) {
    const details =
      fallback.stderr.trim() ||
      fallback.stdout.trim() ||
      forceCancel.stderr.trim() ||
      forceCancel.stdout.trim();
    throw new Error(`Unable to force-cancel run ${runId}${details ? `: ${details}` : ""}`);
  }
}

function dispatchWorkflow({ workflow, branch, repo, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] gh workflow run ${workflow} --ref ${branch}`);
    return;
  }
  const result = runGh(["workflow", "run", workflow, "--ref", branch], { repo });
  const output = result.stdout.trim();
  if (output) console.log(output);
}

async function waitForReplacementRun({
  repo,
  workflow,
  headSha,
  previousRunIds,
  pr,
  intervalSeconds,
  timeoutSeconds,
}) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    await assertUnmovedHead({ pr, repo, expectedHead: headSha });
    const runs = listWorkflowRuns({ repo, workflow, headSha });
    const replacement = findReplacementRun(runs, { headSha, previousRunIds });
    if (replacement) return replacement;
    await sleep(intervalSeconds);
  }
  return null;
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    return EXIT_USAGE;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  try {
    const pullRequest = resolvePullRequest(options.pr, options.repo);
    if (pullRequest.state !== "OPEN") {
      throw new Error(`PR #${pullRequest.number} is not open.`);
    }

    const headSha = pullRequest.headRefOid;
    const branch = pullRequest.headRefName;
    console.log(`PR #${pullRequest.number}: ${pullRequest.url}`);
    console.log(`Branch: ${branch}`);
    console.log(`Exact head: ${headSha}`);
    console.log(`Draft: ${pullRequest.isDraft ? "yes" : "no"}`);

    const runsBefore = listWorkflowRuns({
      repo: options.repo,
      workflow: options.workflow,
      headSha,
    });
    const latestRun = chooseExactHeadRun(runsBefore, headSha);
    if (latestRun) {
      console.log(
        `Latest exact-head run: ${latestRun.databaseId} · ${latestRun.status}/${latestRun.conclusion || "none"} · ${latestRun.url}`,
      );
    } else {
      console.log("Latest exact-head run: none");
    }

    const plan = buildRecoveryPlan({
      run: latestRun,
      staleAfterSeconds: options.staleAfterSeconds,
      force: options.force,
      cancelOnly: options.cancelOnly,
    });
    console.log(`Recovery plan: ${plan.action} — ${plan.reason}`);

    if (plan.action === "already_success" || plan.action === "nothing_to_cancel") {
      return 0;
    }
    if (plan.action === "pending") {
      return EXIT_PENDING;
    }
    if (options.dryRun) {
      if (plan.action === "cancel" || plan.action === "cancel_and_dispatch") {
        await cancelRun({
          runId: latestRun.databaseId,
          repo: options.repo,
          graceSeconds: options.cancelGraceSeconds,
          dryRun: true,
        });
      }
      if (plan.action === "dispatch" || plan.action === "cancel_and_dispatch") {
        dispatchWorkflow({
          workflow: options.workflow,
          branch,
          repo: options.repo,
          dryRun: true,
        });
      }
      return 0;
    }

    await assertUnmovedHead({
      pr: options.pr,
      repo: options.repo,
      expectedHead: headSha,
    });

    if (plan.action === "cancel" || plan.action === "cancel_and_dispatch") {
      await cancelRun({
        runId: latestRun.databaseId,
        repo: options.repo,
        graceSeconds: options.cancelGraceSeconds,
        dryRun: false,
      });
    }
    if (plan.action === "cancel") return 0;

    await assertUnmovedHead({
      pr: options.pr,
      repo: options.repo,
      expectedHead: headSha,
    });

    const previousRunIds = new Set(runsBefore.map((run) => Number(run.databaseId)));
    dispatchWorkflow({
      workflow: options.workflow,
      branch,
      repo: options.repo,
      dryRun: false,
    });

    const replacement = await waitForReplacementRun({
      repo: options.repo,
      workflow: options.workflow,
      headSha,
      previousRunIds,
      pr: options.pr,
      intervalSeconds: options.intervalSeconds,
      timeoutSeconds: options.discoveryTimeoutSeconds,
    });
    if (!replacement) {
      console.error(
        `No new workflow_dispatch run for exact head ${headSha} appeared within ${options.discoveryTimeoutSeconds}s.`,
      );
      return EXIT_PENDING;
    }

    console.log(
      `Replacement run: ${replacement.databaseId} · ${replacement.status}/${replacement.conclusion || "none"} · ${replacement.url}`,
    );

    if (!options.watch) {
      await assertUnmovedHead({
        pr: options.pr,
        repo: options.repo,
        expectedHead: headSha,
      });
      return 0;
    }

    const watched = runGh(
      [
        "run",
        "watch",
        String(replacement.databaseId),
        "--compact",
        "--exit-status",
        "--interval",
        String(options.intervalSeconds),
      ],
      { repo: options.repo, capture: false, allowFailure: true },
    );

    await assertUnmovedHead({
      pr: options.pr,
      repo: options.repo,
      expectedHead: headSha,
    });

    const finalRun = readRun(replacement.databaseId, options.repo);
    if (finalRun.headSha !== headSha) {
      console.error(`Replacement run targeted ${finalRun.headSha}, expected ${headSha}.`);
      return EXIT_STALE_HEAD;
    }
    if (watched.status !== 0 || finalRun.status !== "completed" || finalRun.conclusion !== "success") {
      console.error(
        `Replacement run ${replacement.databaseId} finished as ${finalRun.status}/${finalRun.conclusion || "none"}.`,
      );
      return EXIT_FAILURE;
    }

    console.log(`Exact head ${headSha} passed replacement CI run ${replacement.databaseId}.`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return error.exitCode || EXIT_USAGE;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  process.exitCode = await main();
}
