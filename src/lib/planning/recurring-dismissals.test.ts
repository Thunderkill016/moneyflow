import assert from "node:assert/strict";
import test from "node:test";

import {
  RECURRING_DISMISSALS_STORAGE_KEY,
  dismissRecurringPattern,
  readRecurringDismissals,
} from "./recurring-dismissals.ts";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

test("dismissals read empty when nothing is stored", () => {
  assert.deepEqual(readRecurringDismissals(fakeStorage()), []);
  assert.deepEqual(readRecurringDismissals(null), []);
});

test("dismissing a pattern persists its key once, sorted", () => {
  const storage = fakeStorage();
  dismissRecurringPattern("bbbb2222", storage);
  const next = dismissRecurringPattern("aaaa1111", storage);
  assert.deepEqual(next, ["aaaa1111", "bbbb2222"]);
  assert.equal(
    storage.map.get(RECURRING_DISMISSALS_STORAGE_KEY),
    '["aaaa1111","bbbb2222"]',
  );
  assert.deepEqual(dismissRecurringPattern("aaaa1111", storage), next);
});

test("a malformed stored value is dropped, not trusted", () => {
  const storage = fakeStorage();
  storage.map.set(RECURRING_DISMISSALS_STORAGE_KEY, "{oops");
  assert.deepEqual(readRecurringDismissals(storage), []);
  assert.equal(storage.map.has(RECURRING_DISMISSALS_STORAGE_KEY), false);

  storage.map.set(
    RECURRING_DISMISSALS_STORAGE_KEY,
    '["not-a-key", 42, "abcd1234"]',
  );
  assert.deepEqual(
    readRecurringDismissals(storage),
    [],
    "one bad entry invalidates the list rather than leaking junk keys",
  );
});

test("writes refuse keys that are not pattern keys", () => {
  const storage = fakeStorage();
  assert.deepEqual(dismissRecurringPattern("Tiền điện", storage), []);
  assert.equal(storage.map.has(RECURRING_DISMISSALS_STORAGE_KEY), false);
});
