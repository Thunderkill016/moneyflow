import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteSavedTransactionFilter,
  readSavedTransactionFilters,
  sameSavedFilterValues,
  SAVED_TRANSACTION_FILTERS_KEY,
  SAVED_TRANSACTION_FILTERS_LIMIT,
  savedTransactionFiltersKey,
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

/** Storage whose writes always fail — a private-mode/quota stand-in. */
function failingWriteStorage(initial?: Record<string, string>) {
  const base = fakeStorage(initial);
  return {
    ...base,
    setItem: () => {
      throw new DOMException("Quota reached", "QuotaExceededError");
    },
  };
}

const SCOPE_A = "user-a";
const SCOPE_B = "user-b";
const KEY_A = savedTransactionFiltersKey(SCOPE_A);

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
  assert.deepEqual(readSavedTransactionFilters(SCOPE_A, fakeStorage()), []);
  assert.deepEqual(readSavedTransactionFilters(SCOPE_A, null), []);
});

test("save then read round-trips a named filter", () => {
  const storage = fakeStorage();
  const values = baseValues({ kind: "expense", category: "Ăn uống" });
  const result = saveTransactionFilter("Ăn uống tháng", values, SCOPE_A, storage);
  assert.equal(result.ok, true);
  const stored = readSavedTransactionFilters(SCOPE_A, storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.name, "Ăn uống tháng");
  assert.deepEqual(stored[0]!.values, values);
});

test("presets are isolated per scope — a second viewer sees none", () => {
  const storage = fakeStorage();
  saveTransactionFilter(
    "Riêng của A",
    baseValues({ query: "chủ nhật" }),
    SCOPE_A,
    storage,
  );
  assert.equal(readSavedTransactionFilters(SCOPE_A, storage).length, 1);
  assert.deepEqual(readSavedTransactionFilters(SCOPE_B, storage), []);
  // B cannot overwrite or delete A's preset either.
  saveTransactionFilter("Riêng của A", baseValues(), SCOPE_B, storage);
  deleteSavedTransactionFilter("Riêng của A", SCOPE_B, storage);
  const a = readSavedTransactionFilters(SCOPE_A, storage);
  assert.equal(a.length, 1);
  assert.equal(a[0]!.values.query, "chủ nhật");
});

test("save upserts by name instead of duplicating", () => {
  const storage = fakeStorage();
  saveTransactionFilter("Chi", baseValues({ kind: "expense" }), SCOPE_A, storage);
  saveTransactionFilter("Chi", baseValues({ kind: "income" }), SCOPE_A, storage);
  const stored = readSavedTransactionFilters(SCOPE_A, storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.values.kind, "income");
});

test("save trims the name and rejects an empty one", () => {
  const storage = fakeStorage();
  const result = saveTransactionFilter("   ", baseValues(), SCOPE_A, storage);
  assert.equal(result.ok, false);
  assert.deepEqual(readSavedTransactionFilters(SCOPE_A, storage), []);
});

test("save enforces the preset limit", () => {
  const storage = fakeStorage();
  for (let i = 0; i < SAVED_TRANSACTION_FILTERS_LIMIT; i += 1) {
    const r = saveTransactionFilter(`Bộ lọc ${i}`, baseValues(), SCOPE_A, storage);
    assert.equal(r.ok, true);
  }
  const overflow = saveTransactionFilter("Quá nhiều", baseValues(), SCOPE_A, storage);
  assert.equal(overflow.ok, false);
  assert.equal(
    readSavedTransactionFilters(SCOPE_A, storage).length,
    SAVED_TRANSACTION_FILTERS_LIMIT,
  );
  // Upserting an existing name still works at the cap.
  const upsert = saveTransactionFilter(
    "Bộ lọc 0",
    baseValues({ kind: "income" }),
    SCOPE_A,
    storage,
  );
  assert.equal(upsert.ok, true);
});

test("delete removes only the named preset", () => {
  const storage = fakeStorage();
  saveTransactionFilter("A", baseValues(), SCOPE_A, storage);
  saveTransactionFilter("B", baseValues(), SCOPE_A, storage);
  const rest = deleteSavedTransactionFilter("A", SCOPE_A, storage);
  assert.equal(rest.ok, true);
  assert.deepEqual(
    rest.ok ? rest.filters.map((f) => f.name) : [],
    ["B"],
  );
});

test("corrupt storage is wiped rather than trusted", () => {
  const storage = fakeStorage({
    [KEY_A]: "not-json{",
  });
  assert.deepEqual(readSavedTransactionFilters(SCOPE_A, storage), []);
  assert.equal(storage.has(KEY_A), false);
});

test("malformed entries are dropped without touching valid ones", () => {
  const good: SavedTransactionFilter = {
    name: "Hợp lệ",
    values: baseValues({ kind: "transfer" }),
  };
  const storage = fakeStorage({
    [KEY_A]: JSON.stringify([
      good,
      { name: "", values: baseValues() },
      { name: "x", values: { kind: "nonsense" } },
      { nope: true },
    ]),
  });
  const stored = readSavedTransactionFilters(SCOPE_A, storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.name, "Hợp lệ");
});

test("unscoped legacy data is not adopted into a viewer scope", () => {
  // If an unscoped key ever existed, a scoped read must not pick it up —
  // that would leak presets across viewers on the same browser.
  const legacy = {
    name: "Cũ",
    values: baseValues(),
  };
  const storage = fakeStorage({
    [SAVED_TRANSACTION_FILTERS_KEY]: JSON.stringify([legacy]),
  });
  assert.deepEqual(readSavedTransactionFilters(SCOPE_A, storage), []);
});

test("save reports a storage failure instead of throwing", () => {
  const storage = failingWriteStorage();
  const result = saveTransactionFilter("Không lưu được", baseValues(), SCOPE_A, storage);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.reason, "storage");
});

test("save without storage fails explicitly, never ok:true", () => {
  const result = saveTransactionFilter("Không có storage", baseValues(), SCOPE_A, null);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.reason, "storage");
});

test("delete reports a storage failure instead of throwing", () => {
  const storage = failingWriteStorage({
    [KEY_A]: JSON.stringify([{ name: "A", values: baseValues() }]),
  });
  const result = deleteSavedTransactionFilter("A", SCOPE_A, storage);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.reason, "storage");
  // The failed delete must not pretend the list changed.
  assert.equal(result.filters.length, 1);
});

test("delete without storage fails explicitly", () => {
  const result = deleteSavedTransactionFilter("A", SCOPE_A, null);
  assert.equal(result.ok, false);
});

test("a denied localStorage getter degrades to no-storage, never throws", () => {
  // Browser policy can deny the localStorage *getter* itself (SecurityError)
  // before any getItem/setItem runs — defaultStorage() must absorb that.
  const denied = Object.defineProperty({}, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Storage access denied", "SecurityError");
    },
  });
  const original = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = denied;
  try {
    assert.deepEqual(readSavedTransactionFilters(SCOPE_A), []);
    const saved = saveTransactionFilter("X", baseValues(), SCOPE_A);
    assert.equal(saved.ok, false);
    assert.equal(saved.ok ? "" : saved.reason, "storage");
    assert.equal(deleteSavedTransactionFilter("X", SCOPE_A).ok, false);
  } finally {
    (globalThis as { window?: unknown }).window = original;
  }
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
