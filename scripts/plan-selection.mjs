import process from "node:process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { resolvePlanAuthority } from "./plan-authority.mjs";

function currentPullRequestNumber(env) {
  if (env.GITHUB_EVENT_NAME !== "pull_request" || !env.GITHUB_EVENT_PATH) {
    return null;
  }
  try {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    const value = event?.pull_request?.number ?? event?.number;
    return Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

export function isPlanSelectionReady(
  authority,
  { currentPrNumber = null } = {},
) {
  if (authority.ok !== true || authority.master?.status !== "active") return false;
  if (
    Number.isInteger(currentPrNumber) &&
    authority.boardProjectionPr === currentPrNumber
  ) {
    return false;
  }
  return true;
}

export function resolvePlanSelection(
  root = process.cwd(),
  { env = process.env, ...authorityOptions } = {},
) {
  const authority = resolvePlanAuthority(root, {
    env,
    ...authorityOptions,
  });
  const currentPrNumber = currentPullRequestNumber(env);
  const projectionCandidate =
    Number.isInteger(currentPrNumber) &&
    authority.boardProjectionPr === currentPrNumber;

  return {
    ...authority,
    currentPrNumber,
    projectionCandidate,
    selectionReady: isPlanSelectionReady(authority, { currentPrNumber }),
  };
}

function printHuman(result) {
  console.log(
    `MoneyFlow plan selection — ${result.selectionReady ? "READY" : "NOT READY"}`,
  );
  console.log(
    `master: ${result.master?.path ?? "unresolved"}${result.master?.status ? ` [${result.master.status}]` : ""}`,
  );
  console.log(`current slice: ${result.current?.path ?? "none"}`);
  console.log(
    `board baseline: ${result.boardBaseline ?? "missing"}; expected: ${result.expectedBaseline ?? "unknown"}; mode: ${result.baselineMode ?? "unknown"}`,
  );

  if (result.master?.status === "candidate") {
    console.error(
      "candidate master is valid for review but is not task-selection authority until merged history proves it",
    );
  }
  if (result.projectionCandidate) {
    console.error(
      `post-merge projection for current PR #${result.currentPrNumber} is valid for review but is not current task-selection authority before merge`,
    );
  }
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const failure of result.failures) console.error(`failure: ${failure}`);
}

function runCli() {
  const result = resolvePlanSelection();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHuman(result);
  }
  process.exitCode = result.selectionReady ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
