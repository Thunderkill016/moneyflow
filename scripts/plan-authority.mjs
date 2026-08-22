import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const ACTIVE_BOARD_PATH = "docs/plans/active/README.md";

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

export function parseMasterMetadata(content) {
  return {
    role:
      content.match(/^\*\*Authority role:\*\*\s*(.+)$/mu)?.[1]?.trim() ?? null,
    introducedByPr: Number(
      content.match(
        /^\*\*Authority introduced by:\*\*\s*PR\s*#(\d+)\s*$/mu,
      )?.[1] ?? NaN,
    ),
    supersedesPlan:
      content.match(/^\*\*Supersedes plan:\*\*\s*`([^`]+)`\s*$/mu)?.[1] ??
      null,
  };
}

export function parseSupersededMetadata(content) {
  return {
    status:
      content.match(/^\*\*Authority status:\*\*\s*(.+)$/mu)?.[1]?.trim() ?? null,
    supersededBy: content.match(
      /^\*\*Superseded by:\*\*\s*`([^`]+)`(?:\s*\(PR\s*#(\d+)\))?\s*$/mu,
    ),
  };
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
  if (!resolvedExpected.sha) {
    failures.push(
      `could not verify Current Work Board freshness: ${resolvedExpected.error ?? "unknown base"}`,
    );
  } else if (boardBaseline && !sameCommit(boardBaseline, resolvedExpected.sha)) {
    failures.push(
      `${ACTIVE_BOARD_PATH} is stale: baseline ${boardBaseline} does not match ${resolvedExpected.source} ${resolvedExpected.sha}`,
    );
  }

  const masterRow = masterRows[0] ?? null;
  const currentRow = currentRows[0] ?? null;
  let master = null;
  const authorityChain = [];
  let masterHistory = [];

  if (masterRow) {
    const masterPath = `docs/plans/active/${masterRow.packet}`;
    try {
      const content = readFileSync(join(root, masterPath), "utf8");
      const metadata = parseMasterMetadata(content);
      master = { path: masterPath, packet: masterRow.packet, ...metadata };

      if (!/\bmaster product program\b/iu.test(metadata.role ?? "")) {
        failures.push(
          `${masterPath} must declare **Authority role:** master product program`,
        );
      }
      if (!Number.isInteger(metadata.introducedByPr)) {
        failures.push(
          `${masterPath} must declare **Authority introduced by:** PR #<number>`,
        );
      }
      if (!metadata.supersedesPlan) {
        failures.push(
          `${masterPath} must declare **Supersedes plan:** \`<path>\``,
        );
      }

      masterHistory = gitHistory(root, masterPath, runGit);
      if (Number.isInteger(metadata.introducedByPr)) {
        const introMatch = masterHistory.find(
          (entry) => entry.prNumber === metadata.introducedByPr,
        );
        if (!introMatch && masterHistory.length > 0) {
          failures.push(
            `${masterPath} says PR #${metadata.introducedByPr} introduced authority, but git history does not contain that PR`,
          );
        }
      }

      authorityChain.push({
        path: masterPath,
        status: "active",
        introducedByPr: metadata.introducedByPr,
      });

      if (metadata.supersedesPlan) {
        try {
          const predecessor = readFileSync(
            join(root, metadata.supersedesPlan),
            "utf8",
          );
          const predecessorMeta = parseSupersededMetadata(predecessor);
          const expected = predecessorMeta.supersededBy?.[1] ?? null;
          const prNumber = Number(predecessorMeta.supersededBy?.[2] ?? NaN);

          if (!/\bsuperseded\b/iu.test(predecessorMeta.status ?? "")) {
            failures.push(
              `${metadata.supersedesPlan} must declare **Authority status:** superseded`,
            );
          }
          if (expected !== masterPath) {
            failures.push(
              `${metadata.supersedesPlan} must point **Superseded by:** to ${masterPath}`,
            );
          }
          if (
            Number.isInteger(metadata.introducedByPr) &&
            Number.isInteger(prNumber) &&
            prNumber !== metadata.introducedByPr
          ) {
            failures.push(
              `${metadata.supersedesPlan} supersession PR #${prNumber} disagrees with ${masterPath} introduction PR #${metadata.introducedByPr}`,
            );
          }

          authorityChain.push({
            path: metadata.supersedesPlan,
            status: "superseded",
            supersededBy: masterPath,
            supersededByPr: Number.isInteger(prNumber)
              ? prNumber
              : metadata.introducedByPr,
          });
        } catch {
          failures.push(
            `${masterPath} supersedes missing plan: ${metadata.supersedesPlan}`,
          );
        }
      }
    } catch {
      failures.push(
        `${ACTIVE_BOARD_PATH} master product program points to missing packet: ${masterPath}`,
      );
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
    boardBaseline,
    expectedBaseline: resolvedExpected.sha,
    expectedBaselineSource: resolvedExpected.source,
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
