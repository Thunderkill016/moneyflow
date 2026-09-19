import assert from "node:assert/strict";
import test from "node:test";
import { readAllPages } from "./paginated-read.ts";

test("readAllPages returns every row beyond the API page cap", async () => {
  const source = Array.from({ length: 1201 }, (_, index) => index);
  const ranges: Array<[number, number]> = [];

  const result = await readAllPages(async (from, to) => {
    ranges.push([from, to]);
    return { data: source.slice(from, to + 1), error: null };
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.data, source);
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});

test("readAllPages discards partial rows when a later page fails", async () => {
  const result = await readAllPages(async (from, to) => {
    if (from === 500) return { data: null, error: new Error("transient") };
    return {
      data: Array.from({ length: to - from + 1 }, () => from),
      error: null,
    };
  });

  assert.equal(result.data, null);
  assert.equal((result.error as Error).message, "transient");
});

test("readAllPages rejects invalid page sizes", async () => {
  await assert.rejects(
    () => readAllPages(async () => ({ data: [], error: null }), 0),
    /invalid_page_size/,
  );
});
