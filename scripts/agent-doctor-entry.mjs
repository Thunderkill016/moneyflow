import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildDoctorReport } from "./agent-doctor.mjs";
import { resolvePlanAuthority } from "./plan-authority.mjs";

export function buildAuthorityAwareDoctorReport({
  argv = process.argv,
  env = process.env,
  root = process.cwd(),
  authorityOptions = {},
} = {}) {
  const report = buildDoctorReport({ argv, env });
  const planAuthority = resolvePlanAuthority(root, {
    env,
    ...authorityOptions,
  });

  return {
    ...report,
    schemaVersion: 3,
    planAuthority,
    ready: report.ready && planAuthority.ok,
    readyMeans: {
      ...report.readyMeans,
      scope: "environment-policy-and-authority-freshness",
      includes: [
        ...report.readyMeans.includes,
        "master plan, current slice and Current Work Board freshness resolved",
      ],
    },
  };
}

function printHuman(report) {
  console.log(
    `MoneyFlow agent doctor — ${report.ready ? "READY" : "NEEDS ATTENTION"}`,
  );
  console.log(`head: ${report.repo.head ?? "unknown"}`);
  console.log(`branch: ${report.repo.branch}`);
  console.log(`worktree: ${report.repo.clean ? "clean" : "dirty"}`);
  console.log(`master plan: ${report.planAuthority.master?.path ?? "unresolved"}`);
  console.log(`current slice: ${report.planAuthority.current?.path ?? "none"}`);
  console.log(
    `board baseline: ${report.planAuthority.boardBaseline ?? "missing"}; expected: ${report.planAuthority.expectedBaseline ?? "unknown"}`,
  );

  if (report.planAuthority.authorityChain.length > 0) {
    console.log("plan authority chain:");
    for (const entry of report.planAuthority.authorityChain) {
      console.log(
        `- ${entry.status}: ${entry.path}${entry.introducedByPr ? ` (PR #${entry.introducedByPr})` : ""}${entry.supersededByPr ? ` → PR #${entry.supersededByPr}` : ""}`,
      );
    }
  }
  if (report.planAuthority.masterHistory.length > 0) {
    console.log("master plan git history:");
    for (const entry of report.planAuthority.masterHistory) {
      console.log(`- ${entry.sha.slice(0, 12)} ${entry.subject}`);
    }
  }
  for (const warning of report.planAuthority.warnings) {
    console.warn(`plan authority warning: ${warning}`);
  }
  for (const failure of report.planAuthority.failures) {
    console.error(`plan authority failure: ${failure}`);
  }

  console.log(
    `risk class: ${report.riskClass.class} — ${report.riskClass.label} (${report.riskClass.reasons.join(", ")})`,
  );
  console.log(`planning artifact: ${report.riskClass.planningArtifact}`);
  console.log(`gate selection: ${report.classification.reason}`);
  console.log("local gate plan:");
  for (const command of report.localGatePlan) console.log(`- ${command}`);
  console.log("provider checks required on the exact PR head:");
  for (const check of report.providerChecks) {
    console.log(`- ${check.context} — ${check.proves}`);
  }
  if (report.missingRequiredCapabilities.length > 0) {
    console.log(
      `missing required capabilities: ${report.missingRequiredCapabilities.join(", ")}`,
    );
  }
  if (report.missingRepoFiles.length > 0) {
    console.log(`missing repo files: ${report.missingRepoFiles.join(", ")}`);
  }
  console.log(`completion: ${report.completion.statement}`);
}

function runCli() {
  const report = buildAuthorityAwareDoctorReport();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report);
  }
  process.exitCode = report.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
