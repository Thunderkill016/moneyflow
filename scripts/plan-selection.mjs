import process from "node:process";
import { pathToFileURL } from "node:url";

import { resolvePlanAuthority } from "./plan-authority.mjs";

export function isPlanSelectionReady(authority) {
  if (authority.ok !== true || authority.master?.status !== "active") return false;
  if (authority.current && authority.current.status !== "active") return false;
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

  return {
    ...authority,
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
  console.log(
    `current slice: ${result.current?.path ?? "none"}${result.current?.status ? ` [${result.current.status}]` : ""}`,
  );
  console.log(`manifest: ${result.manifestPath}; schema: ${result.schemaVersion ?? "invalid"}`);

  if (result.master?.status === "candidate") {
    console.error(
      "candidate master is reviewable but does not become task-selection authority until merged first-parent history proves its PR",
    );
  }
  if (result.current?.status === "candidate") {
    console.error(
      `candidate current slice from PR #${result.current.introducedByPr} is validation-only until that PR appears in merged first-parent history`,
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
