import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_OPTIONS } from "./options.ts";

test("CAPTURE_OPTIONS prioritizes daily quick capture before assisted paths", () => {
  assert.equal(CAPTURE_OPTIONS.length, 3);
  assert.deepEqual(
    CAPTURE_OPTIONS.map((o) => o.id),
    ["quick", "paste", "upload"],
  );
});

test("CAPTURE_OPTIONS link to the intended capture subroutes", () => {
  assert.deepEqual(
    Object.fromEntries(CAPTURE_OPTIONS.map((option) => [option.id, option.href])),
    {
      quick: "/capture/quick",
      paste: "/capture/paste",
      upload: "/capture/upload",
    },
  );
});

test("CAPTURE_OPTIONS have Vietnamese labels and icons", () => {
  for (const option of CAPTURE_OPTIONS) {
    assert.ok(option.label.length > 0);
    assert.ok(option.description.length > 0);
    assert.ok(option.icon);
  }
});
