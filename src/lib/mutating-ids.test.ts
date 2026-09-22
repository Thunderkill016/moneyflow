import assert from "node:assert/strict";
import test from "node:test";
import { addMutatingIds, removeMutatingIds } from "./mutating-ids.ts";

test("addMutatingIds registers row ids on a new set", () => {
  const current = new Set<string>(["a"]);
  const next = addMutatingIds(current, ["b", "c"]);
  assert.ok(next.has("a") && next.has("b") && next.has("c"));
  // React state relies on identity change; the input set stays untouched.
  assert.notEqual(next, current);
  assert.deepEqual([...current], ["a"]);
});

test("removeMutatingIds clears only the listed rows", () => {
  const current = new Set<string>(["a", "b", "c"]);
  const next = removeMutatingIds(current, ["b"]);
  assert.ok(next.has("a") && next.has("c"));
  assert.ok(!next.has("b"));
  assert.ok(current.has("b"));
});

test("removeMutatingIds tolerates absent ids and empty input", () => {
  const current = new Set<string>(["a"]);
  const unchanged = removeMutatingIds(current, []);
  assert.equal(unchanged, current);

  const next = removeMutatingIds(current, ["missing"]);
  assert.ok(next.has("a"));
  assert.equal(next.size, 1);
});

test("overlapping mutations clear independently", () => {
  // Row A delete and row B update in flight together; finishing one must not
  // unblock the other's controls.
  let ids: ReadonlySet<string> = new Set();
  ids = addMutatingIds(ids, ["a"]);
  ids = addMutatingIds(ids, ["b"]);
  ids = removeMutatingIds(ids, ["a"]);
  assert.ok(!ids.has("a"));
  assert.ok(ids.has("b"));
});
