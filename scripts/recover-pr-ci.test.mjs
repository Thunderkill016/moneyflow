import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildRecoveryPlan,
  chooseExactHeadRun,
  findReplacementRun,
  forceCancelApiPath,
  isActiveRun,
  parseArgs,
  runIdleSeconds,
} from "./recover-pr-ci.mjs";

test("parseArgs accepts exact-head recovery controls", () => {
  assert.deepEqual(
    parseArgs(
      [
        "309",
        "--repo",
        "Thunderkill016/moneyflow",
        "--workflow",
        "ci.yml",
        "--stale-after",
        "600",
        "--interval",
        "15",
        "--discovery-timeout",
        "180",
        "--cancel-grace",
        "5",
        "--force",
        "--dry-run",
        "--no-watch",
      ],
      {},
    ),
    {
      pr: "309",
      repo: "Thunderkill016/moneyflow",
      workflow: "ci.yml",
      staleAfterSeconds: 600,
      intervalSeconds: 15,
      discoveryTimeoutSeconds: 180,
      cancelGraceSeconds: 5,
      force: true,
      dryRun: true,
      cancelOnly: false,
      watch: false,
      help: false,
    },
  );
});

test("parseArgs rejects missing identity and unsafe thresholds", () => {
  assert.throws(() => parseArgs([], {}), /pull request/);
  assert.throws(() => parseArgs(["309"], {}), /--repo/);
  assert.throws(
    () => parseArgs(["309", "--repo", "o/r", "--stale-after", "30"], {}),
    /at least 60/,
  );
  assert.throws(
    () => parseArgs(["309", "--repo", "o/r", "--interval", "2"], {}),
    /at least 3/,
  );
  assert.throws(
    () => parseArgs(["309", "310", "--repo", "o/r"], {}),
    /at most one PR/,
  );
});

test("active-run and idle-time helpers fail safe", () => {
  assert.equal(isActiveRun({ status: "queued" }), true);
  assert.equal(isActiveRun({ status: "in_progress" }), true);
  assert.equal(isActiveRun({ status: "completed" }), false);
  assert.equal(
    runIdleSeconds(
      { updatedAt: "2026-08-07T00:00:00.000Z" },
      Date.parse("2026-08-07T00:10:30.000Z"),
    ),
    630,
  );
  assert.equal(runIdleSeconds({ updatedAt: "invalid" }, 0), null);
});

test("chooseExactHeadRun ignores stale heads and selects newest run", () => {
  const runs = [
    {
      databaseId: 10,
      headSha: "old",
      createdAt: "2026-08-07T00:03:00Z",
    },
    {
      databaseId: 11,
      headSha: "head",
      createdAt: "2026-08-07T00:01:00Z",
    },
    {
      databaseId: 12,
      headSha: "head",
      createdAt: "2026-08-07T00:02:00Z",
    },
  ];
  assert.equal(chooseExactHeadRun(runs, "head").databaseId, 12);
  assert.equal(chooseExactHeadRun(runs, "missing"), null);
});

test("findReplacementRun requires workflow_dispatch, exact head and new run id", () => {
  const replacement = findReplacementRun(
    [
      {
        databaseId: 1,
        headSha: "head",
        event: "pull_request",
        createdAt: "2026-08-07T00:05:00Z",
      },
      {
        databaseId: 2,
        headSha: "head",
        event: "workflow_dispatch",
        createdAt: "2026-08-07T00:03:00Z",
      },
      {
        databaseId: 3,
        headSha: "other",
        event: "workflow_dispatch",
        createdAt: "2026-08-07T00:06:00Z",
      },
      {
        databaseId: 4,
        headSha: "head",
        event: "workflow_dispatch",
        createdAt: "2026-08-07T00:04:00Z",
      },
    ],
    { headSha: "head", previousRunIds: new Set([1, 2]) },
  );
  assert.equal(replacement.databaseId, 4);
});

test("recovery planning avoids fresh cancellation and handles terminal runs", () => {
  const nowMs = Date.parse("2026-08-07T00:20:00Z");
  assert.equal(
    buildRecoveryPlan({
      run: null,
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "dispatch",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "completed", conclusion: "success" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "already_success",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "completed", conclusion: "failure" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "dispatch",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "queued", updatedAt: "invalid" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "pending",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "queued", updatedAt: "2026-08-07T00:15:00Z" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "pending",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "queued", updatedAt: "2026-08-06T23:00:00Z" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "pending",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "in_progress", updatedAt: "2026-08-06T23:00:00Z" },
      staleAfterSeconds: 900,
      force: false,
      cancelOnly: false,
      nowMs,
    }).action,
    "cancel_and_dispatch",
  );
  assert.equal(
    buildRecoveryPlan({
      run: {
        status: "in_progress",
        updatedAt: "2026-08-07T00:19:59Z",
      },
      staleAfterSeconds: 900,
      force: true,
      cancelOnly: true,
      nowMs,
    }).action,
    "cancel",
  );
});

test("force-cancel fallback path validates repository identity", () => {
  assert.equal(
    forceCancelApiPath("Thunderkill016/moneyflow", 123),
    "repos/Thunderkill016/moneyflow/actions/runs/123/force-cancel",
  );
  assert.throws(() => forceCancelApiPath("moneyflow", 123), /OWNER\/REPO/);
});

const scriptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "recover-pr-ci.mjs",
);

function withFakeGh({ run }, callback) {
  const directory = mkdtempSync(join(tmpdir(), "moneyflow-recover-ci-"));
  const ghPath = join(directory, "gh");
  const callLog = join(directory, "calls.log");
  const runJson = JSON.stringify([run]).replaceAll("'", "'\\''");
  const fakeGh = `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$GH_CALL_LOG"
if [[ "$1 $2" == "pr view" ]]; then
  printf '%s\\n' '{"number":309,"url":"https://github.com/Thunderkill016/moneyflow/pull/309","headRefOid":"head-sha","headRefName":"feature/test","isDraft":false,"state":"OPEN"}'
  exit 0
fi
if [[ "$1 $2" == "run list" ]]; then
  printf '%s\\n' '${runJson}'
  exit 0
fi
echo "unexpected gh call: $*" >&2
exit 1
`;
  writeFileSync(ghPath, fakeGh);
  chmodSync(ghPath, 0o755);
  try {
    return callback({
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GH_CALL_LOG: callLog,
      },
      callLog,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("dry-run previews stale in-progress cancellation and replacement dispatch without writes", () => {
  withFakeGh(
    {
      run: {
        databaseId: 1933,
        workflowName: "CI",
        status: "in_progress",
        conclusion: null,
        headSha: "head-sha",
        headBranch: "feature/test",
        event: "pull_request",
        createdAt: "2020-01-01T00:00:00Z",
        startedAt: "2020-01-01T00:00:00Z",
        updatedAt: "2020-01-01T00:00:00Z",
        url: "https://github.com/example/actions/runs/1933",
        attempt: 1,
      },
    },
    ({ env, callLog }) => {
      const result = spawnSync(
        process.execPath,
        [
          scriptPath,
          "309",
          "--repo",
          "Thunderkill016/moneyflow",
          "--dry-run",
        ],
        { encoding: "utf8", env },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Recovery plan: cancel_and_dispatch/);
      assert.match(result.stdout, /\[dry-run\] gh run cancel 1933/);
      assert.match(
        result.stdout,
        /\[dry-run\] gh workflow run ci\.yml --ref feature\/test/,
      );
      const calls = readFileSync(callLog, "utf8");
      assert.match(calls, /pr view 309/);
      assert.match(calls, /run list/);
      assert.doesNotMatch(calls, /run cancel|workflow run/);
    },
  );
});

test("stale queued runs remain pending without --force", () => {
  withFakeGh(
    {
      run: {
        databaseId: 1999,
        workflowName: "CI",
        status: "queued",
        conclusion: null,
        headSha: "head-sha",
        headBranch: "feature/test",
        event: "pull_request",
        createdAt: "2020-01-01T00:00:00Z",
        startedAt: null,
        updatedAt: "2020-01-01T00:00:00Z",
        url: "https://github.com/example/actions/runs/1999",
        attempt: 1,
      },
    },
    ({ env, callLog }) => {
      const result = spawnSync(
        process.execPath,
        [scriptPath, "309", "--repo", "Thunderkill016/moneyflow"],
        { encoding: "utf8", env },
      );
      assert.equal(result.status, 8, result.stderr);
      assert.match(result.stdout, /waiting states require --force/);
      const calls = readFileSync(callLog, "utf8");
      assert.doesNotMatch(calls, /run cancel|workflow run/);
    },
  );
});

test("fresh active runs return pending without Actions writes", () => {
  withFakeGh(
    {
      run: {
        databaseId: 2000,
        workflowName: "CI",
        status: "in_progress",
        conclusion: null,
        headSha: "head-sha",
        headBranch: "feature/test",
        event: "pull_request",
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: "https://github.com/example/actions/runs/2000",
        attempt: 1,
      },
    },
    ({ env, callLog }) => {
      const result = spawnSync(
        process.execPath,
        [scriptPath, "309", "--repo", "Thunderkill016/moneyflow"],
        { encoding: "utf8", env },
      );
      assert.equal(result.status, 8, result.stderr);
      assert.match(result.stdout, /Recovery plan: pending/);
      const calls = readFileSync(callLog, "utf8");
      assert.doesNotMatch(calls, /run cancel|workflow run/);
    },
  );
});
