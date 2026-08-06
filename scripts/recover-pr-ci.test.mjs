import assert from "node:assert/strict";
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
    "cancel_and_dispatch",
  );
  assert.equal(
    buildRecoveryPlan({
      run: { status: "in_progress", updatedAt: "2026-08-07T00:19:59Z" },
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
