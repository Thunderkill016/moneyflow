import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultSnapshot,
  exportBackupJson,
  importBackupJson,
} from "./db.local.ts";
import { markAllPendingSynced, summarizeSyncState } from "./sync.service.ts";

test("createDefaultSnapshot initializes consistent balances across all 3 account groups", () => {
  const snap = createDefaultSnapshot();
  assert.equal(snap.version, 2);
  assert.ok(snap.accounts.some((a) => a.group === "LIQUID"));
  assert.ok(snap.accounts.some((a) => a.group === "INVESTMENT"));
  assert.ok(snap.accounts.some((a) => a.group === "DEBT"));
  assert.ok(snap.transactions.some((tx) => tx.type === "TRANSFER"));
});

test("exportBackupJson and importBackupJson round-trip safely and reject malformed files", () => {
  const original = createDefaultSnapshot();
  const json = exportBackupJson(original);
  const restored = importBackupJson(json);

  assert.equal(restored.accounts.length, original.accounts.length);
  assert.equal(restored.transactions.length, original.transactions.length);
  assert.equal(restored.accounts[0].currentBalance, original.accounts[0].currentBalance);

  assert.throws(() => importBackupJson("{not valid json"), /không hợp lệ/);
  assert.throws(() => importBackupJson('{"version": 99}'), /MoneyFlow v2/);
});

test("sync service counts pending/deleted changes and marks flushed entries cleanly", () => {
  const snap = createDefaultSnapshot();
  const pendingTx = {
    ...snap.transactions[0],
    id: "tx-pending",
    syncStatus: "PENDING" as const,
  };
  const deletedTx = {
    ...snap.transactions[1],
    id: "tx-deleted",
    syncStatus: "DELETED" as const,
  };

  const before = summarizeSyncState([...snap.transactions, pendingTx, deletedTx]);
  assert.equal(before.pendingCount, 1);
  assert.equal(before.deletedCount, 1);
  assert.equal(before.isDirty, true);

  const flushed = markAllPendingSynced([...snap.transactions, pendingTx, deletedTx]);
  const after = summarizeSyncState(flushed);
  assert.equal(after.pendingCount, 0);
  assert.equal(after.deletedCount, 0);
  assert.equal(after.isDirty, false);
});
