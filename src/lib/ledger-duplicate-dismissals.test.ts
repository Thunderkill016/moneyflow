import assert from "node:assert/strict";
import test from "node:test";

import {
  LEDGER_DUPE_DISMISSALS_STORAGE_KEY,
  dismissLedgerDupePatterns,
  readLedgerDupeDismissals,
} from "./ledger-duplicate-dismissals.ts";

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
  assert.deepEqual(readLedgerDupeDismissals(fakeStorage()), []);
  assert.deepEqual(readLedgerDupeDismissals(null), []);
});

test("dismissing persists keys once, sorted", () => {
  const storage = fakeStorage();
  dismissLedgerDupePatterns("bbbb2222", storage);
  const next = dismissLedgerDupePatterns("aaaa1111", storage);
  assert.deepEqual(next, ["aaaa1111", "bbbb2222"]);
  assert.equal(
    storage.map.get(LEDGER_DUPE_DISMISSALS_STORAGE_KEY),
    '["aaaa1111","bbbb2222"]',
  );
  assert.deepEqual(dismissLedgerDupePatterns("aaaa1111", storage), next);
});

test("a batch dismiss writes every new key at once", () => {
  const storage = fakeStorage();
  const next = dismissLedgerDupePatterns(["bbbb2222", "aaaa1111", "bbbb2222"], storage);
  assert.deepEqual(next, ["aaaa1111", "bbbb2222"]);
});

test("a malformed stored value is dropped, not trusted", () => {
  const storage = fakeStorage();
  storage.map.set(LEDGER_DUPE_DISMISSALS_STORAGE_KEY, "{oops");
  assert.deepEqual(readLedgerDupeDismissals(storage), []);
  assert.equal(storage.map.has(LEDGER_DUPE_DISMISSALS_STORAGE_KEY), false);

  storage.map.set(
    LEDGER_DUPE_DISMISSALS_STORAGE_KEY,
    '["not-a-key", 42, "abcd1234"]',
  );
  assert.deepEqual(
    readLedgerDupeDismissals(storage),
    [],
    "one bad entry invalidates the list rather than leaking junk keys",
  );
});

test("writes refuse keys that are not pattern keys", () => {
  const storage = fakeStorage();
  assert.deepEqual(dismissLedgerDupePatterns("Cà phê", storage), []);
  assert.equal(storage.map.has(LEDGER_DUPE_DISMISSALS_STORAGE_KEY), false);
});
