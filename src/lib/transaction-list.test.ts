import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSACTION_PAGE_SIZE,
  nextVisibleCount,
  windowTransactions,
} from "./transaction-list.ts";

test("TRANSACTION_PAGE_SIZE is 50", () => {
  assert.equal(TRANSACTION_PAGE_SIZE, 50);
});

test("windowTransactions: empty list", () => {
  const w = windowTransactions([], 50);
  assert.deepEqual(w.visible, []);
  assert.equal(w.shown, 0);
  assert.equal(w.total, 0);
  assert.equal(w.remaining, 0);
  assert.equal(w.hasMore, false);
});

test("windowTransactions: list shorter than page size shows all", () => {
  const items = [1, 2, 3];
  const w = windowTransactions(items, 50);
  assert.deepEqual(w.visible, [1, 2, 3]);
  assert.equal(w.shown, 3);
  assert.equal(w.total, 3);
  assert.equal(w.hasMore, false);
});

test("windowTransactions: never renders more than visibleCount", () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  const w = windowTransactions(items, TRANSACTION_PAGE_SIZE);
  assert.equal(w.visible.length, 50);
  assert.equal(w.shown, 50);
  assert.equal(w.total, 120);
  assert.equal(w.remaining, 70);
  assert.equal(w.hasMore, true);
  assert.equal(w.visible[0], 0);
  assert.equal(w.visible[49], 49);
});

test("windowTransactions: load more second page reaches 100", () => {
  const items = Array.from({ length: 120 }, (_, i) => `tx-${i}`);
  const page1 = windowTransactions(items, TRANSACTION_PAGE_SIZE);
  assert.equal(page1.hasMore, true);
  const next = nextVisibleCount(page1.shown);
  assert.equal(next, 100);
  const page2 = windowTransactions(items, next);
  assert.equal(page2.shown, 100);
  assert.equal(page2.remaining, 20);
  assert.equal(page2.hasMore, true);
  const page3 = windowTransactions(items, nextVisibleCount(page2.shown));
  assert.equal(page3.shown, 120);
  assert.equal(page3.hasMore, false);
});

test("windowTransactions: never paints 1000 rows when capped at 50", () => {
  const items = Array.from({ length: 1000 }, (_, i) => i);
  const w = windowTransactions(items, TRANSACTION_PAGE_SIZE);
  assert.equal(w.visible.length, 50);
  assert.ok(w.visible.length < 1000);
  assert.equal(w.total, 1000);
});

test("windowTransactions: clamps bad visibleCount", () => {
  const items = [1, 2, 3, 4, 5];
  assert.equal(windowTransactions(items, -10).shown, 0);
  assert.equal(windowTransactions(items, Number.NaN).shown, 0);
  assert.equal(windowTransactions(items, 2.9).shown, 2);
});

test("nextVisibleCount grows by page size", () => {
  assert.equal(nextVisibleCount(0), 50);
  assert.equal(nextVisibleCount(50), 100);
  assert.equal(nextVisibleCount(50, 25), 75);
  assert.equal(nextVisibleCount(-5), 50);
});
