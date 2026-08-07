import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/ui/text-field.tsx", "utf8");

test("TextField accepts the React 19 ref contract while legacy consumers migrate", () => {
  assert.match(source, /ref\?: React\.Ref<HTMLInputElement>/);
  assert.match(source, /inputRef\?: React\.Ref<HTMLInputElement>/);
  assert.match(source, /const resolvedRef = forwardedRef \?\? inputRef/);
  assert.match(source, /<input\s+ref=\{resolvedRef\}/);
});
