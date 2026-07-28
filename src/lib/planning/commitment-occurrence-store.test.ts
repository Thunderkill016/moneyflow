import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMITMENT_OCCURRENCE_STORAGE_KEY,
  hydrateCommitmentsWithOccurrences,
  persistPayOccurrence,
  persistUndoOccurrence,
  readOccurrenceMap,
  writeOccurrenceMap,
} from "./commitment-occurrence-store.ts";
import type { RecurringCommitment } from "./commitments.ts";

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    storage: {
      get length() {
        return map.size;
      },
      key(index: number) {
        return [...map.keys()][index] ?? null;
      },
      getItem(key: string) {
        return map.has(key) ? map.get(key)! : null;
      },
      setItem(key: string, value: string) {
        map.set(key, value);
      },
      removeItem(key: string) {
        map.delete(key);
      },
    },
  };
}

const item: RecurringCommitment = {
  id: "demo-internet",
  name: "Internet",
  amount: 250_000,
  dueDay: 18,
  dueDate: "2026-07-18",
  accountId: "a",
  accountName: "MB",
  categoryId: "c",
  categoryName: "Hóa đơn",
  categoryIcon: "receipt",
  categoryColor: "cyan",
  isArchived: false,
  isPaid: false,
  transactionId: null,
};

test("readOccurrenceMap returns empty for missing or corrupt data", () => {
  const { storage } = mockStorage();
  assert.deepEqual(readOccurrenceMap(storage), {});

  const bad = mockStorage({ [COMMITMENT_OCCURRENCE_STORAGE_KEY]: "{not-json" });
  assert.deepEqual(readOccurrenceMap(bad.storage), {});
  assert.equal(bad.map.has(COMMITMENT_OCCURRENCE_STORAGE_KEY), false);
});

test("persist pay/undo round-trips and hydrates commitment paid state", () => {
  const { storage } = mockStorage();
  persistPayOccurrence("2026-07-01", "demo-internet", "tx-1", storage);
  const map = readOccurrenceMap(storage);
  assert.equal(map["2026-07-01"]?.["demo-internet"], "tx-1");

  const hydrated = hydrateCommitmentsWithOccurrences([item], "2026-07-01", storage);
  assert.equal(hydrated[0]!.isPaid, true);
  assert.equal(hydrated[0]!.transactionId, "tx-1");

  persistUndoOccurrence("2026-07-01", "demo-internet", storage);
  const after = hydrateCommitmentsWithOccurrences([item], "2026-07-01", storage);
  assert.equal(after[0]!.isPaid, false);
  assert.deepEqual(readOccurrenceMap(storage), {});
});

test("writeOccurrenceMap stores valid shape", () => {
  const { storage, map } = mockStorage();
  writeOccurrenceMap({ "2026-07-01": { c1: "t1" } }, storage);
  const raw = map.get(COMMITMENT_OCCURRENCE_STORAGE_KEY);
  assert.ok(raw);
  assert.deepEqual(JSON.parse(raw!), { "2026-07-01": { c1: "t1" } });
});
