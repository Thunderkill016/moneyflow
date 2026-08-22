import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export const ACTIVE_BOARD_PATH = "docs/plans/active/README.md";
export const PLAN_AUTHORITY_MANIFEST_PATH = "docs/plans/PLAN_AUTHORITY.json";

function defaultRunGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function stripMarkdown(value) {
  return value.replace(/[`*_]/gu, "").replace(/\s+/gu, " ").trim();
}

export function parseActivePacketRows(board) {
  const rows = [];
  for (const line of board.split(/\r?\n/u)) {
    const match = line.match(
      /^\|\s*`([^`]+\.md)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/u,
    );
    if (!match) continue;
    rows.push({
      packet: match[1],
      role: stripMarkdown(match[2]),
      boundary: stripMarkdown(match[3]),
    });
  }
  return rows;
}

export function parseBoardBaseline(board) {
  return (
    board.match(/^\*\*Current main baseline:\*\*\s*`([0-9a-f]{7,40})`/mu)?.[1] ??
    null
  );
}

function sameCommit(a, b) {
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

export function resolveExpectedBaseline(
  root,
  { env = process.env, runGit = defaultRunGit } = {},
) {
  if (env.GITHUB_EVENT_NAME === "pull_request" && env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
      const baseSha = event.pull_request?.base?.sha;
      if (typeof baseSha === "string" && baseSha) {
        return { sha: baseSha, source: "pull_request.base.sha" };
      }
    } catch {
      return {
        sha: null,
        source: "pull_request.base.sha",
        error: "could not read pull-request event",
      };
    }
  }

  const branch = runGit(root, ["branch", "--show-current"]);
  const head = runGit(root, ["rev-parse", "HEAD"]);
  if (branch === "main") return { sha: head, source: "main HEAD" };

  const baseRef = env.GITHUB_BASE_REF
    ? `origin/${env.GITHUB_BASE_REF}`
    : "origin/main";
  const mergeBase =
    runGit(root, ["merge-base", "HEAD", baseRef]) ??
    runGit(root, ["merge-base", "HEAD", "main"]);
  if (mergeBase) {
    return {
      sha: mergeBase,
      source: `merge-base with ${env.GITHUB_BASE_REF || "main"}`,
    };
  }

  return {
    sha: null,
    source: "git",
    error: "could not resolve main/base commit",
  };
}

function gitHistory(root, path, runGit) {
  const output = runGit(root, [
    "log",
    "--first-parent",
    "--follow",
    "--format=%H%x09%s",
    "--",
    path,
  ]);
  if (!output) return [];

  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subjectParts] = line.split("\t");
      const subject = subjectParts.join("\t");
      const prNumber = Number(subject.match(/\(#(\d+)\)/u)?.[1] ?? NaN);
      return {
        sha,
        subject,
        prNumber: Number.isInteger(prNumber) ? prNumber : null,
      };
    });
}

function latestCommitForPath(root, path, runGit) {
  return runGit(root, ["log", "-1", "--format=%H", "--", path]);
}

function readManifest(root, failures) {
  let manifest;
  try {
    manifest = JSON.parse(
      readFileSync(join(root, PLAN_AUTHORITY_MANIFEST_PATH), "utf8"),
    );
  } catch {
    failures.push(
      `missing or invalid plan authority manifest: ${PLAN_AUTHORITY_MANIFEST_PATH}`,
    );
    return null;
  }

  if (manifest?.schemaVersion !== 1) {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} must use schemaVersion 1`);
  }
  if (
    typeof manifest?.master?.path !== "string" ||
    !manifest.master.path.startsWith("docs/plans/active/") ||
    !manifest.master.path.endsWith(".md")
  ) {
    failures.push(
      `${PLAN_AUTHORITY_MANIFEST_PATH} master.path must point to an active plan packet`,
    );
  }
  if (!Number.isInteger(manifest?.master?.introducedByPr)) {
    failures.push(
      `${PLAN_AUTHORITY_MANIFEST_PATH} master.introducedByPr must be a PR number`,
    );
  }
  if (!Array.isArray(manifest?.master?.supersedes)) {
    failures.push(
      `${PLAN_AUTHORITY_MANIFEST_PATH} master.supersedes must be an array`,
    );
  }

  return manifest;
}

export function resolvePlanAuthority(
  root,
  {
    env = process.env,
    runGit = defaultRunGit,
    expectedBaseline = undefined,
  } = {},
) {
  const failures = [];
  const warnings = [];
  let board;

  try {
    board = readFileSync(join(root, ACTIVE_BOARD_PATH), "utf8");
  } catch {
    return {
      ok: false,
      failures: [`missing current work board: ${ACTIVE_BOARD_PATH}`],
      warnings,
      boardBaseline: null,
      expectedBaseline: null,
      master: null,
      current: null,
      authorityChain: [],
      masterHistory: [],
    };
  }

  const rows = parseActivePacketRows(board);
  const masterRows = rows.filter((row) =>
    /\bmaster product program\b/iu.test(row.role),
  );
  const currentRows = rows.filter((row) =>
    /\bcurrent agent-executable\b/iu.test(row.role),
  );

  if (masterRows.length !== 1) {
    failures.push(
      `${ACTIVE_BOARD_PATH} must identify exactly one master product program; found ${masterRows.length}`,
    );
  }
  if (currentRows.length > 1) {
    failures.push(
      `${ACTIVE_BOARD_PATH} must identify at most one current agent-executable slice; found ${currentRows.length}`,
    );
  }

  const boardBaseline = parseBoardBaseline(board);
  if (!boardBaseline) {
    failures.push(
      `${ACTIVE_BOARD_PATH} must declare **Current main baseline:** with a git SHA`,
    );
  }

  const resolvedExpected = expectedBaseline
    ? { sha: expectedBaseline, source: "caller" }
    : resolveExpectedBaseline(root, { env, runGit });
  const head = runGit(root, ["rev-parse", "HEAD"]);
  const boardLastCommit = latestCommitForPath(root, ACTIVE_BOARD_PATH, runGit);
  let baselineMode = "declared-base";

  if (!resolvedExpected.sha) {
    failures.push(
      `could not verify Current Work Board freshness: ${resolvedExpected.error ?? "unknown base"}`,
    );
  } else if (boardBaseline && !sameCommit(boardBaseline, resolvedExpected.sha)) {
    const boardUpdatedAtExpectedHead =
      sameCommit(head, resolvedExpected.sha) &&
      sameCommit(boardLastCommit, resolvedExpected.sha);

    if (boardUpdatedAtExpectedHead) {
      // A PR cannot know its future squash-merge SHA. After that PR lands on main,
      // the board header still names the base it was reconciled from, while Git
      // proves the exact new HEAD itself contains the board update. Accept that
      // one transition. The next main commit that does not touch the board makes
      // boardLastCommit != HEAD and fails closed again.
      baselineMode = "board-updated-at-head";
    } else {
      failures.push(
        `${ACTIVE_BOARD_PATH} is stale: baseline ${boardBaseline} does not match ${resolvedExpected.source} ${resolvedExpected.sha}; latest board commit is ${boardLastCommit ?? "unknown"}`,
      );
    }
  }

  const manifest = readManifest(root, failures);
  const masterRow = masterRows[0] ?? null;
  const currentRow = currentRows[0] ?? null;
  const authorityChain = [];
  let master = null;
  let masterHistory = [];

  if (manifest?.master?.path && masterRow) {
    const registryMasterPath = `docs/plans/active/${masterRow.packet}`;
    if (manifest.master.path !== registryMasterPath) {
      failures.push(
        `${PLAN_AUTHORITY_MANIFEST_PATH} master ${manifest.master.path} disagrees with active registry master ${registryMasterPath}`,
      );
    }

    try {
      readFileSync(join(root, manifest.master.path), "utf8");
    } catch {
      failures.push(
        `${PLAN_AUTHORITY_MANIFEST_PATH} points to missing master plan: ${manifest.master.path}`,
      );
    }

    masterHistory = gitHistory(root, manifest.master.path, runGit);
    if (Number.isInteger(manifest.master.introducedByPr)) {
      const introMatch = masterHistory.find(
        (entry) => entry.prNumber === manifest.master.introducedByPr,
      );
      if (!introMatch && masterHistory.length > 0) {
        failures.push(
          `${manifest.master.path} says PR #${manifest.master.introducedByPr} introduced authority, but git first-parent history does not contain that PR`,
        );
      }
    }

    master = {
      path: manifest.master.path,
      packet: basename(manifest.master.path),
      introducedByPr: manifest.master.introducedByPr,
    };
    authorityChain.push({
      path: manifest.master.path,
      status: "active",
      introducedByPr: manifest.master.introducedByPr,
    });

    for (const predecessor of manifest.master.supersedes ?? []) {
      if (
        typeof predecessor?.path !== "string" ||
        !Number.isInteger(predecessor?.supersededByPr)
      ) {
        failures.push(
          `${PLAN_AUTHORITY_MANIFEST_PATH} supersedes entries require path + supersededByPr`,
        );
        continue;
      }
      try {
        readFileSync(join(root, predecessor.path), "utf8");
      } catch {
        failures.push(
          `${PLAN_AUTHORITY_MANIFEST_PATH} references missing superseded plan: ${predecessor.path}`,
        );
      }
      if (predecessor.supersededByPr !== manifest.master.introducedByPr) {
        failures.push(
          `${predecessor.path} supersededByPr #${predecessor.supersededByPr} disagrees with master introduction PR #${manifest.master.introducedByPr}`,
        );
      }
      authorityChain.push({
        path: predecessor.path,
        status: "superseded",
        supersededBy: manifest.master.path,
        supersededByPr: predecessor.supersededByPr,
      });
    }
  }

  if (currentRow) {
    const currentPath = `docs/plans/active/${currentRow.packet}`;
    try {
      readFileSync(join(root, currentPath), "utf8");
    } catch {
      failures.push(
        `${ACTIVE_BOARD_PATH} current agent-executable slice points to missing packet: ${currentPath}`,
      );
    }
  } else {
    warnings.push(
      "no current agent-executable slice is registered; only owner/external lanes may proceed",
    );
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    manifestPath: PLAN_AUTHORITY_MANIFEST_PATH,
    boardBaseline,
    expectedBaseline: resolvedExpected.sha,
    expectedBaselineSource: resolvedExpected.source,
    boardLastCommit,
    baselineMode,
    master,
    current: currentRow
      ? {
          path: `docs/plans/active/${currentRow.packet}`,
          packet: currentRow.packet,
          role: currentRow.role,
        }
      : null,
    authorityChain,
    masterHistory: masterHistory.slice(0, 12),
  };
}

function printHuman(result) {
  console.log(
    `MoneyFlow plan authority — ${result.ok ? "RESOLVED" : "NEEDS RECONCILIATION"}`,
  );
  console.log(
    `board baseline: ${result.boardBaseline ?? "missing"}; expected: ${result.expectedBaseline ?? "unknown"}; mode: ${result.baselineMode ?? "unknown"}`,
  );
  console.log(`master: ${result.master?.path ?? "unresolved"}`);
  console.log(`current slice: ${result.current?.path ?? "none"}`);

  if (result.authorityChain.length > 0) {
    console.log("authority chain:");
    for (const entry of result.authorityChain) {
      console.log(
        `- ${entry.status}: ${entry.path}${entry.introducedByPr ? ` (PR #${entry.introducedByPr})` : ""}${entry.supersededByPr ? ` → PR #${entry.supersededByPr}` : ""}`,
      );
    }
  }

  if (result.masterHistory.length > 0) {
    console.log("master plan first-parent history:");
    for (const entry of result.masterHistory) {
      console.log(`- ${entry.sha.slice(0, 12)} ${entry.subject}`);
    }
  }

  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const failure of result.failures) console.error(`failure: ${failure}`);
}

function runCli() {
  const result = resolvePlanAuthority(process.cwd());
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHuman(result);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
