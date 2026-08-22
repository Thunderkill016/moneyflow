import assert from "node:assert/strict";
import test from "node:test";

import { isPlanSelectionReady } from "./plan-selection.mjs";

test("active merged master is eligible for task selection", () => {
  assert.equal(
    isPlanSelectionReady({ ok: true, master: { status: "active" } }),
    true,
  );
});

test("candidate master may validate but cannot authorize task selection", () => {
  assert.equal(
    isPlanSelectionReady({ ok: true, master: { status: "candidate" } }),
    false,
  );
});

test("authority failures cannot become selection-ready", () => {
  assert.equal(
    isPlanSelectionReady({ ok: false, master: { status: "active" } }),
    false,
  );
  assert.equal(isPlanSelectionReady({ ok: true, master: null }), false);
});
