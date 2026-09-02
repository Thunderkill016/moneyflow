import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { PLAN_AUTHORITY_MANIFEST_PATH } from "./plan-authority.mjs";

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

function manifestCurrentPath(manifest) {
  return typeof manifest?.current?.path === "string" ? manifest.current.path : null;
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

export function packetRecordsPr(packet, prNumber) {
  if (!Number.isInteger(prNumber)) return false;
  const metadataLines = packet.match(
    /^\*\*(?:PR|Issue\/PR):\*\*[^\n]*$/gmu,
  );
  if (!metadataLines) return false;
  const prPattern = new RegExp(
    `(?:^|\\s)PR\\s*#${prNumber}(?:\\b|$)|(?:^|\\s)#${prNumber}(?:\\b|$)`,
    "iu",
  );
  return metadataLines.some((line) => prPattern.test(line));
}

export function validateLifecycleTransition({
  baseManifest,
  manifest,
  prRecord,
  prNumber,
  changes,
  readyCurrentOwnedByPr = false,
}) {
  const failures = [];
  const baseCurrent = manifestCurrentPath(baseManifest);
  const nextCurrent = manifestCurrentPath(manifest);
  const lifecycleImpact = parseLifecycleImpact(prRecord);
  const manifestChanged = pathWasChanged(changes, PLAN_AUTHORITY_MANIFEST_PATH);
  const snapshotChanged = pathWasChanged(changes, CURRENT_PROJECT_MEMORY_PATH);
  const closesCurrentSlice = /^completes current slice\b/iu.test(lifecycleImpact);
  const authorityTransition = /^authority transition\b/iu.test(lifecycleImpact);
  const currentTransition = baseCurrent !== nextCurrent;

  if (!lifecycleImpact) {
    failures.push("PR memory must declare - Lifecycle impact:");
  }

  if (readyCurrentOwnedByPr && !closesCurrentSlice) {
    failures.push(
      `non-draft PR #${prNumber} owns the current executable packet; it must complete same-PR lifecycle convergence before ready-for-review`,
    );
  }

  if (currentTransition && !manifestChanged) {
    failures.push(
      `changing current executable authority requires ${PLAN_AUTHORITY_MANIFEST_PATH} in the PR diff`,
    );
  }

  if (baseCurrent && nextCurrent && baseCurrent !== nextCurrent) {
    failures.push(
      `a PR may not swap current executable packet ${baseCurrent} directly to ${nextCurrent}; complete the current slice to null and select follow-on work from fresh main`,
    );
  }

  if (!baseCurrent && nextCurrent) {
    if (!authorityTransition) {
      failures.push(
        `selecting current executable packet ${nextCurrent} requires Lifecycle impact: authority transition`,
      );
    }
    if (!snapshotChanged) {
      failures.push(
        `selecting current executable authority must update ${CURRENT_PROJECT_MEMORY_PATH}`,
      );
    }
  }

  if (baseCurrent && !nextCurrent) {
    if (!closesCurrentSlice) {
      failures.push(
        `removing current executable packet ${baseCurrent} requires Lifecycle impact: completes current slice`,
      );
    }
    if (!snapshotChanged) {
      failures.push(
        `completing the current slice must update ${CURRENT_PROJECT_MEMORY_PATH}`,
      );
    }
    if (!pathWasRemoved(changes, baseCurrent)) {
      failures.push(
        `completing the current slice must remove active packet ${baseCurrent}`,
      );
    }
    const packet = basename(baseCurrent);
    if (!completedPacketWasAdded(changes, packet)) {
      failures.push(
        `completing the current slice must archive ${packet} under docs/plans/completed/ in the same PR`,
      );
    }
  }

  if (closesCurrentSlice && !(baseCurrent && !nextCurrent)) {
    failures.push(
      "Lifecycle impact says completes current slice, but PLAN_AUTHORITY.json does not transition current from one packet to null",
    );
  }

  if (authorityTransition && !currentTransition) {
    failures.push(
      "Lifecycle impact says authority transition, but PLAN_AUTHORITY.json current authority did not change",
    );
  }

  return {
    ok: failures.length === 0,
    failures,
    lifecycleImpact,
    baseCurrent,
    nextCurrent,
    currentTransition,
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

function reconstructLocalPullRequest(root) {
  let baseSha;
  try {
    baseSha = execFileSync("git", ["merge-base", "HEAD", "main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
  if (!baseSha) return null;

  const paths = new Set();
  for (const args of [
    ["diff", "--name-only", "--diff-filter=ACMR", baseSha, "--", "docs/research/pr-memory"],
    ["ls-files", "--others", "--exclude-standard", "--", "docs/research/pr-memory"],
  ]) {
    try {
      for (const line of execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
      }).split(/\r?\n/u)) {
        if (line.trim()) paths.add(line.trim());
      }
    } catch {
      return null;
    }
  }

  const numbers = [...paths]
    .map((path) => Number(path.match(/\/PR-(\d+)\.md$/u)?.[1] ?? NaN))
    .filter((value) => Number.isInteger(value));
  if (new Set(numbers).size !== 1) return null;

  return { prNumber: numbers[0], baseSha, headSha: "HEAD", local: true };
}

function runCli() {
  const event = readPullRequestEvent(process.env);
  const local = event ? null : reconstructLocalPullRequest(process.cwd());
  if (!event && !local) {
    console.log("MoneyFlow lifecycle transition — no pull-request event; skipped");
    return;
  }

  const prNumber = local ? local.prNumber : event.pull_request?.number ?? event.number;
  const baseSha = local ? local.baseSha : event.pull_request?.base?.sha;
  const headSha = local ? local.headSha : event.pull_request?.head?.sha;
  if (!Number.isInteger(prNumber) || !baseSha || !headSha) {
    console.error("MoneyFlow lifecycle transition — could not resolve PR/base/head");
    process.exitCode = 1;
    return;
  }

  const root = process.cwd();
  const baseManifest = JSON.parse(
    execFileSync(
      "git",
      ["show", `${baseSha}:${PLAN_AUTHORITY_MANIFEST_PATH}`],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const manifest = JSON.parse(
    readFileSync(join(root, PLAN_AUTHORITY_MANIFEST_PATH), "utf8"),
  );
  const recordRange = local ? [baseSha] : [`${baseSha}...${headSha}`];
  const recordPaths = [
    ...execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMRD", ...recordRange, "--", "docs/research/pr-memory"],
      { cwd: root, encoding: "utf8" },
    ).split(/\r?\n/u),
    ...(local
      ? execFileSync(
          "git",
          ["ls-files", "--others", "--exclude-standard", "--", "docs/research/pr-memory"],
          { cwd: root, encoding: "utf8" },
        ).split(/\r?\n/u)
      : []),
  ].filter((path) => path.endsWith(`/PR-${prNumber}.md`));

  if (new Set(recordPaths).size !== 1) {
    console.error(
      `MoneyFlow lifecycle transition — expected one PR #${prNumber} memory record`,
    );
    process.exitCode = 1;
    return;
  }

  const prRecord = readFileSync(join(root, [...new Set(recordPaths)][0]), "utf8");
  const changes = parseNameStatus(
    execFileSync(
      "git",
      ["diff", "--name-status", ...(local ? [baseSha] : [`${baseSha}...${headSha}`])],
      { cwd: root, encoding: "utf8" },
    ) +
      (local
        ? execFileSync(
            "git",
            ["ls-files", "--others", "--exclude-standard"],
            { cwd: root, encoding: "utf8" },
          )
            .split(/\r?\n/u)
            .filter(Boolean)
            .map((path) => `A\t${path}`)
            .join("\n")
        : ""),
  );

  let readyCurrentOwnedByPr = false;
  const nextCurrent = manifestCurrentPath(manifest);
  if ((local || event.pull_request?.draft === false) && nextCurrent) {
    try {
      const packet = readFileSync(join(root, nextCurrent), "utf8");
      readyCurrentOwnedByPr = packetRecordsPr(packet, prNumber);
    } catch {
      // Missing packet is already covered by plan-authority validation.
    }
  }

  const result = validateLifecycleTransition({
    baseManifest,
    manifest,
    prRecord,
    prNumber,
    changes,
    readyCurrentOwnedByPr,
  });

  console.log(
    `MoneyFlow lifecycle transition — ${result.ok ? "VALID" : "INVALID"}; impact: ${result.lifecycleImpact || "missing"}; current: ${result.baseCurrent ?? "none"} -> ${result.nextCurrent ?? "none"}`,
  );
  for (const failure of result.failures) console.error(`failure: ${failure}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
