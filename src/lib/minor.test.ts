import assert from "node:assert/strict";
import test from "node:test";

import { minor, minorOrNull } from "./minor.ts";

test("minor accepts safe integers including zero and negatives", () => {
  assert.equal(minor(0), 0);
  assert.equal(minor(15_735_000), 15_735_000);
  assert.equal(minor(-391_000), -391_000);
  assert.equal(minor(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
});

test("minor rejects floats and unsafe integers", () => {
  assert.throws(() => minor(1.5));
  assert.throws(() => minor(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => minor(Number.NaN));
  assert.throws(() => minor(Number.POSITIVE_INFINITY));
});

test("minorOrNull returns null instead of throwing", () => {
  assert.equal(minorOrNull(500_000), 500_000);
  assert.equal(minorOrNull(1.5), null);
  assert.equal(minorOrNull("500000"), null);
  assert.equal(minorOrNull(undefined), null);
  assert.equal(minorOrNull(null), null);
});
