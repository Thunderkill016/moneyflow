import assert from "node:assert/strict";
import test from "node:test";

import { isPlanSelectionReady } from "./plan-selection.mjs";

test("active merged master with zero current slice is selection-ready", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "active" },
      current: null,
    }),
    true,
  );
});

test("active merged master with active current slice is execution-ready", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "active" },
      current: { status: "active" },
    }),
    true,
  );
});

test("candidate current slice cannot authorize implementation before merge", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "active" },
      current: { status: "candidate" },
    }),
    false,
  );
});

test("candidate master may validate but cannot authorize task selection", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: { status: "candidate" },
      current: null,
    }),
    false,
  );
});

test("authority failures cannot become selection-ready", () => {
  assert.equal(
    isPlanSelectionReady({
      ok: false,
      master: { status: "active" },
      current: null,
    }),
    false,
  );
  assert.equal(
    isPlanSelectionReady({
      ok: true,
      master: null,
      current: null,
    }),
    false,
  );
});
