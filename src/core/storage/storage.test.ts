import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAndroidWidgetSnapshot,
  createDefaultSnapshot,
  exportBackupJson,
  importAnyLegacyOrBackup,
  importBackupJson,
} from "./db.local.ts";
import {
  markAllPendingSynced,
  mergeSnapshotsWithDedupe,
  summarizeSyncState,
} from "./sync.service.ts";

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

test("zero-loss migrator parses Neon archive v1 and Flutter mf_fintech_state_v1 with idempotent merge", () => {
  const neonPayload = JSON.stringify({
    archive_version: 1,
    tables: {
      accounts: [
        {
          id: "acc-tcb-arch",
          name: "Techcombank Archive",
          account_type: "bank",
          currency: "VND",
          initial_balance_minor: 5_000_000,
          is_archived: false,
        },
        {
          id: "acc-sav-arch",
          name: "Tiết kiệm Tích sản",
          account_type: "investment",
          currency: "VND",
          initial_balance_minor: 0,
          is_archived: false,
        },
      ],
      categories: [
        { id: "cat-food", name: "Ăn uống" },
      ],
      transactions: [
        {
          id: "ntx-1",
          kind: "expense",
          occurred_on: "2026-11-05",
          payee: "Phở 24",
          note: "Ăn sáng",
        },
        {
          id: "ntx-2",
          kind: "transfer",
          occurred_on: "2026-11-06",
          note: "Chuyển sang tích sản",
        },
      ],
      transactionEntries: [
        {
          transaction_id: "ntx-1",
          account_id: "acc-tcb-arch",
          category_id: "cat-food",
          amount_minor: -65_000,
        },
        {
          transaction_id: "ntx-2",
          account_id: "acc-tcb-arch",
          amount_minor: -1_000_000,
        },
        {
          transaction_id: "ntx-2",
          account_id: "acc-sav-arch",
          amount_minor: 1_000_000,
        },
      ],
    },
  });

  const neonRes = importAnyLegacyOrBackup(neonPayload);
  assert.equal(neonRes.sourceFormat, "neon-archive-v1");
  assert.equal(neonRes.snapshot.accounts.length, 2);
  assert.equal(neonRes.snapshot.transactions.length, 2);
  assert.equal(neonRes.snapshot.transactions[0].categoryId, "an-uong");
  assert.equal(neonRes.snapshot.transactions[1].type, "TRANSFER");
  const tcbAcc = neonRes.snapshot.accounts.find((a) => a.id === "acc-tcb-arch");
  assert.equal(tcbAcc?.currentBalance, 3_935_000);

  // Merge same Neon payload again => zero duplicates added
  const neonRepeat = importAnyLegacyOrBackup(neonPayload, {
    mergeInto: neonRes.snapshot,
  });
  assert.equal(neonRepeat.importedTransactions, 0);
  assert.equal(neonRepeat.skippedDuplicates, 2);

  // Flutter SharedPreferences wrapped payload with balance back-calculation
  const flutterState = {
    wallets: [
      { id: "w-momo", name: "Ví MoMo", balance: 450_000 },
    ],
    transactions: [
      {
        id: "ftx-1",
        type: "expense",
        amount: 50_000,
        walletId: "w-momo",
        category: "Cà phê",
        note: "Trà sữa chiều",
        createdAt: "2026-11-10T15:00:00.000Z",
      },
    ],
  };
  const flutterWrapped = JSON.stringify({
    "flutter.mf_fintech_state_v1": JSON.stringify(flutterState),
  });
  const flutterRes = importAnyLegacyOrBackup(flutterWrapped);
  assert.equal(flutterRes.sourceFormat, "flutter-fintech-v1");
  assert.equal(flutterRes.snapshot.accounts[0].currentBalance, 450_000);
  assert.equal(flutterRes.snapshot.accounts[0].initialBalance, 500_000);
  assert.equal(flutterRes.snapshot.transactions[0].categoryId, "an-uong");

  // Android WidgetSnapshotContract helper + idempotent cross-device merge
  const mergedCrossDevice = mergeSnapshotsWithDedupe(
    neonRes.snapshot,
    flutterRes.snapshot,
  );
  assert.ok(mergedCrossDevice.accounts.some((a) => a.id === "w-momo"));
  assert.equal(mergedCrossDevice.transactions.length, 3);

  const widgetJson = buildAndroidWidgetSnapshot(mergedCrossDevice, 450_000);
  assert.equal(typeof widgetJson.total, "number");
  assert.equal(widgetJson.safeSpend, 450_000);
  assert.ok(widgetJson.savedAtMs > 0);
});
