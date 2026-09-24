import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteSavedTransactionFilter,
  readSavedTransactionFilters,
  sameSavedFilterValues,
  SAVED_TRANSACTION_FILTERS_KEY,
  SAVED_TRANSACTION_FILTERS_LIMIT,
  saveTransactionFilter,
  type SavedTransactionFilter,
} from "./saved-transaction-filters.ts";
import type { TransactionFilterValues } from "./transaction-filters.ts";

function fakeStorage(initial?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    has: (key: string) => map.has(key),
  };
}

const baseValues = (
  over: Partial<TransactionFilterValues> = {},
): TransactionFilterValues => ({
  query: "",
  kind: "all",
  account: "all",
  category: "all",
  review: "all",
  fromDate: "",
  toDate: "",
  minAmountInput: "",
  maxAmountInput: "",
  ...over,
});

test("readSavedTransactionFilters returns empty when nothing stored", () => {
  assert.deepEqual(readSavedTransactionFilters(fakeStorage()), []);
  assert.deepEqual(readSavedTransactionFilters(null), []);
});

test("save then read round-trips a named filter", () => {
  const storage = fakeStorage();
  const values = baseValues({ kind: "expense", category: "Ăn uống" });
  const result = saveTransactionFilter("Ăn uống tháng", values, storage);
  assert.equal(result.ok, true);
  const stored = readSavedTransactionFilters(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.name, "Ăn uống tháng");
  assert.deepEqual(stored[0]!.values, values);
});

test("save upserts by name instead of duplicating", () => {
  const storage = fakeStorage();
  saveTransactionFilter("Chi", baseValues({ kind: "expense" }), storage);
  saveTransactionFilter("Chi", baseValues({ kind: "income" }), storage);
  const stored = readSavedTransactionFilters(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.values.kind, "income");
});

test("save trims the name and rejects an empty one", () => {
  const storage = fakeStorage();
  const result = saveTransactionFilter("   ", baseValues(), storage);
  assert.equal(result.ok, false);
  assert.deepEqual(readSavedTransactionFilters(storage), []);
});

test("save enforces the preset limit", () => {
  const storage = fakeStorage();
  for (let i = 0; i < SAVED_TRANSACTION_FILTERS_LIMIT; i += 1) {
    const r = saveTransactionFilter(`Bộ lọc ${i}`, baseValues(), storage);
    assert.equal(r.ok, true);
  }
  const overflow = saveTransactionFilter("Quá nhiều", baseValues(), storage);
  assert.equal(overflow.ok, false);
  assert.equal(
    readSavedTransactionFilters(storage).length,
    SAVED_TRANSACTION_FILTERS_LIMIT,
  );
  // Upserting an existing name still works at the cap.
  const upsert = saveTransactionFilter(
    "Bộ lọc 0",
    baseValues({ kind: "income" }),
    storage,
  );
  assert.equal(upsert.ok, true);
});

test("delete removes only the named preset", () => {
  const storage = fakeStorage();
  saveTransactionFilter("A", baseValues(), storage);
  saveTransactionFilter("B", baseValues(), storage);
  const rest = deleteSavedTransactionFilter("A", storage);
  assert.deepEqual(
    rest.map((f) => f.name),
    ["B"],
  );
});

test("corrupt storage is wiped rather than trusted", () => {
  const storage = fakeStorage({
    [SAVED_TRANSACTION_FILTERS_KEY]: "not-json{",
  });
  assert.deepEqual(readSavedTransactionFilters(storage), []);
  assert.equal(storage.has(SAVED_TRANSACTION_FILTERS_KEY), false);
});

test("malformed entries are dropped without touching valid ones", () => {
  const good: SavedTransactionFilter = {
    name: "Hợp lệ",
    values: baseValues({ kind: "transfer" }),
  };
  const storage = fakeStorage({
    [SAVED_TRANSACTION_FILTERS_KEY]: JSON.stringify([
      good,
      { name: "", values: baseValues() },
      { name: "x", values: { kind: "nonsense" } },
      { nope: true },
    ]),
  });
  const stored = readSavedTransactionFilters(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.name, "Hợp lệ");
});

test("sameSavedFilterValues matches identical values ignoring query edge whitespace", () => {
  const a = baseValues({
    query: " ăn ",
    kind: "expense",
    category: "Ăn uống",
    fromDate: "2026-01-01",
  });
  const b = baseValues({
    query: "ăn",
    kind: "expense",
    category: "Ăn uống",
    fromDate: "2026-01-01",
  });
  assert.equal(sameSavedFilterValues(a, b), true);
});

test("sameSavedFilterValues rejects a single differing field", () => {
  const a = baseValues({ kind: "expense", minAmountInput: "100.000" });
  assert.equal(sameSavedFilterValues(a, { ...a, kind: "all" }), false);
  assert.equal(
    sameSavedFilterValues(a, { ...a, minAmountInput: "" }),
    false,
  );
  assert.equal(sameSavedFilterValues(a, { ...a, review: "reviewed" }), false);
});
