import process from "node:process";
import { pathToFileURL } from "node:url";

import { resolvePlanAuthority } from "./plan-authority.mjs";

export function isPlanSelectionReady(authority) {
  if (authority.ok !== true || authority.master?.status !== "active") return false;
  if (
    Number.isInteger(authority.boardProjectionPr) &&
    authority.baselineMode !== "post-merge-projection"
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
  const projectionPending =
    Number.isInteger(authority.boardProjectionPr) &&
    authority.baselineMode !== "post-merge-projection";

  return {
    ...authority,
    projectionPending,
    selectionReady: isPlanSelectionReady(authority),
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
  if (result.projectionPending) {
    console.error(
      `post-merge projection PR #${result.boardProjectionPr} is validation-only until the exact merged commit activates it`,
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
