import assert from "node:assert/strict";
import test from "node:test";

import { isPlanSelectionReady } from "./plan-selection.mjs";

test("active merged master is eligible for task selection", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "active" },
      boardProjectionPr: null,
      baselineMode: "declared-base",
    }),
    true,
  );
});

test("candidate master may validate but cannot authorize task selection", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "candidate" },
      boardProjectionPr: null,
      baselineMode: "declared-base",
    }),
    false,
  );
});

test("any unactivated post-merge projection is blocked in CI and local checkouts", () => {
  const projection = {
    ok: true,
    master: { status: "active" },
    boardProjectionPr: 444,
    baselineMode: "declared-base",
  };
  assert.equal(isPlanSelectionReady(projection), false);
});

test("the same projection becomes selectable only after exact merged activation", () => {
  const activated = {
    ok: true,
    master: { status: "active" },
    boardProjectionPr: 444,
    baselineMode: "post-merge-projection",
  };
  assert.equal(isPlanSelectionReady(activated), true);
});

test("authority failures cannot become selection-ready", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: false,
      master: { status: "active" },
      boardProjectionPr: null,
      baselineMode: "declared-base",
    }),
    false,
  );
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: null,
      boardProjectionPr: null,
      baselineMode: "declared-base",
    }),
    false,
  );
});
