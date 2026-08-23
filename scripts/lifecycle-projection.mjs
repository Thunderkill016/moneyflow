import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACTIVE_BOARD_PATH,
  parseActivePacketRows,
  parseBoardProjectionPr,
} from "./plan-authority.mjs";

export const CURRENT_PROJECT_MEMORY_PATH =
  "docs/research/CURRENT_PROJECT_MEMORY.md";

function readPullRequestEvent(env) {
  if (env.GITHUB_EVENT_NAME !== "pull_request" || !env.GITHUB_EVENT_PATH) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function parseLifecycleImpact(record) {
  return record.match(/^- Lifecycle impact:\s*(.+)$/mu)?.[1]?.trim() ?? "";
}

export function parseMemoryProjectionPr(memory) {
  const value = Number(
    memory.match(/^\*\*Post-merge projection:\*\*\s*PR\s*#(\d+)\s*$/mu)?.[1] ??
      NaN,
  );
  return Number.isInteger(value) ? value : null;
}

function currentRows(board) {
  return parseActivePacketRows(board).filter((row) =>
    /\bcurrent agent-executable\b/iu.test(row.role),
  );
}

function pathWasRemoved(changes, path) {
  return changes.some(
    (change) =>
      (change.status.startsWith("D") && change.path === path) ||
      (change.status.startsWith("R") && change.oldPath === path),
  );
}

function pathWasChanged(changes, path) {
  return changes.some(
    (change) => change.path === path || change.oldPath === path,
  );
}

function completedPacketWasAdded(changes, packet) {
  return changes.some(
    (change) =>
      (change.status.startsWith("A") || change.status.startsWith("R")) &&
      change.path.startsWith("docs/plans/completed/") &&
      change.path.endsWith(`-${packet}`),
  );
}

export function validateLifecycleProjection({
  baseBoard,
  board,
  currentMemory,
  prRecord,
  prNumber,
  changes,
  readyCurrentOwnedByPr = false,
}) {
  const failures = [];
  const baseCurrent = currentRows(baseBoard);
  const projectedCurrent = currentRows(board);
  const projectionPr = parseBoardProjectionPr(board);
  const memoryProjectionPr = parseMemoryProjectionPr(currentMemory);
  const lifecycleImpact = parseLifecycleImpact(prRecord);
  const boardChanged = pathWasChanged(changes, ACTIVE_BOARD_PATH);
  const snapshotChanged = pathWasChanged(changes, CURRENT_PROJECT_MEMORY_PATH);
  const closesCurrentSlice = /^completes current slice\b/iu.test(lifecycleImpact);
  const authorityTransition = /^authority transition\b/iu.test(lifecycleImpact);

  if (!lifecycleImpact) {
    failures.push("PR memory must declare - Lifecycle impact:");
  }

  if (readyCurrentOwnedByPr && projectionPr !== prNumber) {
    failures.push(
      `non-draft PR #${prNumber} is recorded as the owner of the current agent-executable packet; it must enter same-PR post-merge convergence before ready-for-review`,
    );
  }

  if (boardChanged && Number.isInteger(projectionPr) && projectionPr !== prNumber) {
    failures.push(
      `${ACTIVE_BOARD_PATH} changes a post-merge projection for PR #${projectionPr}, but the current PR is #${prNumber}`,
    );
  }

  if (closesCurrentSlice && projectionPr !== prNumber) {
    failures.push(
      `a PR that completes the current slice must carry **Post-merge projection:** PR #${prNumber} in ${ACTIVE_BOARD_PATH}`,
    );
  }

  const removedCurrent =
    baseCurrent.length === 1 &&
    projectedCurrent.length === 0 &&
    baseCurrent[0].packet;

  if (removedCurrent && projectionPr !== prNumber) {
    failures.push(
      `removing current agent-executable packet ${removedCurrent} requires a same-PR post-merge projection`,
    );
  }

  if (projectionPr === prNumber) {
    if (!closesCurrentSlice && !authorityTransition) {
      failures.push(
        `PR #${prNumber} carries a post-merge projection but PR memory Lifecycle impact is not "completes current slice" or "authority transition"`,
      );
    }
    if (projectedCurrent.length !== 0) {
      failures.push(
        `post-merge projection PR #${prNumber} must leave zero current agent-executable slices; follow-on work is selected only after merge + fresh-main resolution`,
      );
    }
    if (memoryProjectionPr !== prNumber) {
      failures.push(
        `${CURRENT_PROJECT_MEMORY_PATH} must declare **Post-merge projection:** PR #${prNumber} when the board carries that projection`,
      );
    }
    if (!snapshotChanged) {
      failures.push(
        `post-merge projection PR #${prNumber} must update ${CURRENT_PROJECT_MEMORY_PATH} so shipped truth converges in the same PR`,
      );
    }

    if (baseCurrent.length === 1) {
      const packet = baseCurrent[0].packet;
      const activePath = `docs/plans/active/${packet}`;
      if (!pathWasRemoved(changes, activePath)) {
        failures.push(
          `post-merge projection PR #${prNumber} must remove completed current packet ${activePath} from active plans`,
        );
      }
      if (!completedPacketWasAdded(changes, packet)) {
        failures.push(
          `post-merge projection PR #${prNumber} must archive ${packet} under docs/plans/completed/ in the same PR`,
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    projectionPr,
    memoryProjectionPr,
    lifecycleImpact,
  };
}

function parseNameStatus(output) {
  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const status = parts[0];
      if (status.startsWith("R")) {
        return { status, oldPath: parts[1], path: parts[2] };
      }
      return { status, path: parts[1] };
    });
}

function packetRecordsPr(packet, prNumber) {
  return new RegExp(`\\bPR\\s*#${prNumber}\\b`, "u").test(packet);
}

function runCli() {
  const event = readPullRequestEvent(process.env);
  if (!event) {
    console.log("MoneyFlow lifecycle projection — no pull-request event; skipped");
    return;
  }

  const prNumber = event.pull_request?.number ?? event.number;
  const baseSha = event.pull_request?.base?.sha;
  const headSha = event.pull_request?.head?.sha;
  if (!Number.isInteger(prNumber) || !baseSha || !headSha) {
    console.error("MoneyFlow lifecycle projection — could not resolve PR/base/head");
    process.exitCode = 1;
    return;
  }

  const root = process.cwd();
  const baseBoard = execFileSync(
    "git",
    ["show", `${baseSha}:${ACTIVE_BOARD_PATH}`],
    { cwd: root, encoding: "utf8" },
  );
  const board = readFileSync(join(root, ACTIVE_BOARD_PATH), "utf8");
  const currentMemory = readFileSync(
    join(root, CURRENT_PROJECT_MEMORY_PATH),
    "utf8",
  );
  const recordPaths = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      `${baseSha}...${headSha}`,
      "--",
      "docs/research/pr-memory",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split(/\r?\n/u)
    .filter((path) => path.endsWith(`/PR-${prNumber}.md`));

  if (recordPaths.length !== 1) {
    console.error(
      `MoneyFlow lifecycle projection — expected one PR #${prNumber} memory record`,
    );
    process.exitCode = 1;
    return;
  }

  const prRecord = readFileSync(join(root, recordPaths[0]), "utf8");
  const changes = parseNameStatus(
    execFileSync(
      "git",
      ["diff", "--name-status", `${baseSha}...${headSha}`],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const projectedCurrent = currentRows(board);
  let readyCurrentOwnedByPr = false;
  if (event.pull_request?.draft === false && projectedCurrent.length === 1) {
    try {
      const packet = readFileSync(
        join(root, `docs/plans/active/${projectedCurrent[0].packet}`),
        "utf8",
      );
      readyCurrentOwnedByPr = packetRecordsPr(packet, prNumber);
    } catch {
      // Missing active packet is already covered by the active-registry contract.
    }
  }

  const result = validateLifecycleProjection({
    baseBoard,
    board,
    currentMemory,
    prRecord,
    prNumber,
    changes,
    readyCurrentOwnedByPr,
  });

  console.log(
    `MoneyFlow lifecycle projection — ${result.ok ? "VALID" : "INVALID"}; impact: ${result.lifecycleImpact || "missing"}; projection: ${result.projectionPr ? `PR #${result.projectionPr}` : "none"}`,
  );
  for (const failure of result.failures) console.error(`failure: ${failure}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
