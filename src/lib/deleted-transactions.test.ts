import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DELETED_TRANSACTION_STORAGE_KEY,
  formatDeletedAtLabel,
  isDeletedTransactionRecord,
  readStoredDeletedTransactions,
  releaseDeletedTransactions,
  tombstoneTransactions,
} from "./deleted-transactions.ts";
import { LOCAL_DATA_STORAGE_KEYS } from "./delete-account.ts";
import { restoreTransactionInList } from "./transaction-store.ts";
import type { Transaction } from "./transactions/contracts.ts";

const finance = readFileSync("src/server/finance.ts", "utf8");
const hook = readFileSync("src/hooks/use-transactions.ts", "utf8");

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
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
  };
  return { storage, map };
}

const validTransaction: Transaction = {
  id: "transaction-1",
  kind: "expense",
  categoryId: "category-1",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "account-1",
  account: "Tiền mặt",
  amount: 65_000,
  occurredOn: "2026-07-14",
  occurredAt: "2026-07-14T05:00:00.000Z",
  relativeDate: "Hôm nay",
};

const validRecord = {
  transaction: validTransaction,
  deletedAt: "2026-09-23T10:05:00.000Z",
};

test("tombstone validator accepts a well-formed record", () => {
  assert.equal(isDeletedTransactionRecord(validRecord), true);
});

test("tombstone validator rejects malformed records", () => {
  assert.equal(isDeletedTransactionRecord(null), false);
  assert.equal(isDeletedTransactionRecord("row"), false);
  assert.equal(
    isDeletedTransactionRecord({ transaction: validTransaction }),
    false,
  );
  assert.equal(
    isDeletedTransactionRecord({ ...validRecord, deletedAt: "not-a-date" }),
    false,
  );
  assert.equal(
    isDeletedTransactionRecord({ ...validRecord, transaction: { id: "x" } }),
    false,
  );
  assert.equal(
    isDeletedTransactionRecord({
      ...validRecord,
      transaction: { ...validTransaction, amount: 12.5 },
    }),
    false,
  );
});

test("tombstone → read → release round-trip keeps the stores consistent", () => {
  const { storage, map } = mockStorage();

  // Demo delete writes a tombstone, then the live row is dropped by the caller.
  tombstoneTransactions(
    [validTransaction],
    "2026-09-23T03:05:00.000Z",
    storage,
  );
  let deleted = readStoredDeletedTransactions(storage);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0]!.transaction.id, "transaction-1");
  assert.equal(deleted[0]!.deletedAt, "2026-09-23T03:05:00.000Z");

  // Demo restore re-inserts into the live list and releases the tombstone.
  const restored = restoreTransactionInList([], deleted[0]!.transaction);
  assert.equal(restored.length, 1);
  releaseDeletedTransactions([restored[0]!.id], storage);
  deleted = readStoredDeletedTransactions(storage);
  assert.equal(deleted.length, 0);
  assert.equal(map.has(DELETED_TRANSACTION_STORAGE_KEY), true);
});

test("reads return newest-deleted first and drop invalid records", () => {
  const older = {
    transaction: { ...validTransaction, id: "old-1" },
    deletedAt: "2026-09-20T01:00:00.000Z",
  };
  const newer = {
    transaction: { ...validTransaction, id: "new-1" },
    deletedAt: "2026-09-23T01:00:00.000Z",
  };
  const { storage } = mockStorage({
    [DELETED_TRANSACTION_STORAGE_KEY]: JSON.stringify([
      older,
      { garbage: true },
      newer,
    ]),
  });
  const deleted = readStoredDeletedTransactions(storage);
  assert.equal(deleted.length, 2);
  assert.equal(deleted[0]!.transaction.id, "new-1");
  assert.equal(deleted[1]!.transaction.id, "old-1");
});

test("re-deleting a tombstoned id refreshes deletedAt instead of duplicating", () => {
  const { storage } = mockStorage();
  tombstoneTransactions(
    [validTransaction],
    "2026-09-20T01:00:00.000Z",
    storage,
  );
  tombstoneTransactions(
    [validTransaction],
    "2026-09-23T01:00:00.000Z",
    storage,
  );
  const deleted = readStoredDeletedTransactions(storage);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0]!.deletedAt, "2026-09-23T01:00:00.000Z");
});

test("corrupt tombstone key is dropped instead of wedging the trash", () => {
  const { storage, map } = mockStorage({
    [DELETED_TRANSACTION_STORAGE_KEY]: "{not json",
  });
  assert.deepEqual(readStoredDeletedTransactions(storage), []);
  assert.equal(map.has(DELETED_TRANSACTION_STORAGE_KEY), false);
});

test("formatDeletedAtLabel renders Vietnam wall-clock deterministically", () => {
  // 2026-09-23T03:05:00Z is 10:05 on 23/09/2026 in Asia/Ho_Chi_Minh (UTC+7).
  assert.equal(
    formatDeletedAtLabel("2026-09-23T03:05:00.000Z"),
    "10:05 · 23/09/2026",
  );
  // 17:30Z is 00:30 the next day in Vietnam — the date must roll over.
  assert.equal(
    formatDeletedAtLabel("2026-09-23T17:30:00.000Z"),
    "00:30 · 24/09/2026",
  );
  assert.equal(formatDeletedAtLabel("not-a-date"), "");
});

test("account deletion wipes the tombstone key", () => {
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes(DELETED_TRANSACTION_STORAGE_KEY));
});

test("server deleted-feed loader mirrors the live feed contract", () => {
  // getDeletedTransactions reads the companion view, newest-deleted first,
  // and reuses mapTransactionFeedRow so the trash row shape cannot drift.
  assert.match(finance, /from\("deleted_transaction_feed"\)/);
  assert.match(
    finance,
    /DELETED_TRANSACTION_FEED_COLUMNS\s*=\s*`\$\{TRANSACTION_FEED_COLUMNS\},deleted_at`/,
  );
  assert.match(finance, /deletedFeedSchema = feedSchema\.extend\(\{\s*deleted_at: z\.string\(\),?\s*\}\)/);
  assert.match(
    finance,
    /mapDeletedTransactionFeedRow[\s\S]*mapTransactionFeedRow\(row\)[\s\S]*deletedAt: row\.deleted_at/,
  );
  assert.match(finance, /\.order\("deleted_at", \{ ascending: false \}\)/);
});

test("demo mutations write tombstones and restores release them", () => {
  // Single delete tombstones the removed row before committing the live list.
  assert.match(
    hook,
    /async function deleteTransaction[\s\S]*?tombstoneTransactions\(removed\);[\s\S]*?commitDemoTransactions\(next\);/,
  );
  // Bulk delete tombstones every eligible row.
  assert.match(
    hook,
    /async function bulkDeleteTransactions[\s\S]*?tombstoneTransactions\(plan\.eligible\);/,
  );
  // Demo restore releases the tombstone after the live commit.
  assert.match(
    hook,
    /async function restoreTransaction[\s\S]*?commitDemoTransactions\(next\);[\s\S]*?releaseDeletedTransactions\(\[transaction\.id\]\)/,
  );
});
