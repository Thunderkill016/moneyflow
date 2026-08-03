import assert from "node:assert/strict";
import test from "node:test";
import { isValidDateOnly } from "./date-only.ts";

test("date-only validation rejects calendar rollover and malformed input", () => {
  assert.equal(isValidDateOnly("2026-02-28"), true);
  assert.equal(isValidDateOnly("2028-02-29"), true);
  assert.equal(isValidDateOnly("2026-02-29"), false);
  assert.equal(isValidDateOnly("2026-02-31"), false);
  assert.equal(isValidDateOnly("03/08/2026"), false);
});
