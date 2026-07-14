import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_OPTIONS } from "./options.ts";

test("CAPTURE_OPTIONS has three chooser actions", () => {
  assert.equal(CAPTURE_OPTIONS.length, 3);
  assert.deepEqual(
    CAPTURE_OPTIONS.map((o) => o.id),
    ["paste", "upload", "quick"],
  );
});

test("CAPTURE_OPTIONS link to capture subroutes", () => {
  assert.equal(CAPTURE_OPTIONS[0]?.href, "/capture/paste");
  assert.equal(CAPTURE_OPTIONS[1]?.href, "/capture/upload");
  assert.equal(CAPTURE_OPTIONS[2]?.href, "/capture/quick");
});

test("CAPTURE_OPTIONS have Vietnamese labels and icons", () => {
  for (const option of CAPTURE_OPTIONS) {
    assert.ok(option.label.length > 0);
    assert.ok(option.description.length > 0);
    assert.ok(option.icon);
  }
});
