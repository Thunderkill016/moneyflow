import assert from "node:assert/strict";
import test from "node:test";
import {
  hasFailedChecks,
  hasPendingChecks,
  isReadableChecksExitCode,
  parseArgs,
  summarizeChecks,
} from "./watch-pr-ci.mjs";

test("parseArgs accepts PR selector and monitoring controls", () => {
  assert.deepEqual(
    parseArgs([
      "301",
      "--repo",
      "Thunderkill016/moneyflow",
      "--once",
      "--required",
      "--interval",
      "20",
    ]),
    {
      pr: "301",
      repo: "Thunderkill016/moneyflow",
      once: true,
      required: true,
      interval: 20,
    },
  );
});

test("parseArgs rejects unsafe polling intervals and duplicate selectors", () => {
  assert.throws(() => parseArgs(["301", "--interval", "2"]), /at least 5/);
  assert.throws(() => parseArgs(["301", "302"]), /at most one PR/);
});

test("check helpers distinguish pass, pending, failure and cancellation", () => {
  const checks = [
    { bucket: "pass" },
    { bucket: "pass" },
    { bucket: "pending" },
    { bucket: "fail" },
    { bucket: "cancel" },
    { bucket: "skipping" },
  ];

  assert.deepEqual(summarizeChecks(checks), {
    pass: 2,
    fail: 1,
    pending: 1,
    skipping: 1,
    cancel: 1,
    other: 0,
  });
  assert.equal(hasFailedChecks(checks), true);
  assert.equal(hasPendingChecks(checks), true);
});

test("GitHub CLI check JSON remains readable for pass, failure and pending", () => {
  assert.equal(isReadableChecksExitCode(0), true);
  assert.equal(isReadableChecksExitCode(1), true);
  assert.equal(isReadableChecksExitCode(8), true);
  assert.equal(isReadableChecksExitCode(2), false);
  assert.equal(isReadableChecksExitCode(4), false);
});
