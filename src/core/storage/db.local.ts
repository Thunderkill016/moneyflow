import { z } from "zod";
import {
  attachTransactionFingerprint,
  computeAccountBalances,
} from "../engine/ledger.engine.ts";
import {
  AccountSchema,
  type Account,
} from "../schema/account.schema.ts";
import {
  BudgetConfigSchema,
  DEFAULT_BUDGET_CONFIG,
  type BudgetConfig,
} from "../schema/budget.schema.ts";
import {
  TransactionSchema,
  type Transaction,
} from "../schema/transaction.schema.ts";
import {
  mergeSnapshotsZeroLoss,
  migrateAnyLegacyPayload,
  type MigrationImportResult,
} from "./legacy-migrator.ts";

export const LOCAL_STORAGE_KEY = "moneyflow.clean.v2";
export const LOCAL_STORAGE_V3_KEY = "moneyflow.clean.v3";
const IDB_NAME = "moneyflow_clean_idb_v2";
const IDB_STORE = "snapshots";
const IDB_KEY = "primary";

export const SnapshotSchema = z.object({
  version: z.union([z.literal(2), z.literal(3)]),
  accounts: z.array(AccountSchema),
  transactions: z.array(TransactionSchema),
  budget: BudgetConfigSchema,
  updatedAt: z.number().int().nonnegative(),
});

export interface MoneyFlowSnapshot {
  version: 2 | 3;
  accounts: Account[];
  transactions: Transaction[];
  budget: BudgetConfig;
  updatedAt: number;
}

export function createDefaultSnapshot(now = Date.now()): MoneyFlowSnapshot {
  const ref = new Date(now);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = Math.max(1, ref.getDate());

  const atDay = (targetDay: number, hour = 9) =>
    new Date(year, month, Math.min(targetDay, day), hour, 15, 0, 0).getTime();

  const rawAccounts: Account[] = [
    {
      id: "acc-tcb",
      name: "Techcombank",
      group: "LIQUID",
      currency: "VND",
      initialBalance: 16_500_000,
      currentBalance: 16_500_000,
      isArchived: false,
      updatedAt: now,
    },
    {
      id: "acc-cash",
      name: "Ví tiền mặt",
      group: "LIQUID",
      currency: "VND",
      initialBalance: 2_400_000,
      currentBalance: 2_400_000,
      isArchived: false,
      updatedAt: now,
    },
    {
      id: "acc-invest",
      name: "Quỹ Vàng & BTC",
      group: "INVESTMENT",
      currency: "VND",
      initialBalance: 64_000_000,
      currentBalance: 64_000_000,
      isArchived: false,
      updatedAt: now,
    },
    {
      id: "acc-debt",
      name: "Thẻ tín dụng VIB",
      group: "DEBT",
      currency: "VND",
      initialBalance: -2_150_000,
      currentBalance: -2_150_000,
      isArchived: false,
      updatedAt: now,
    },
    {
      id: "acc-receivable",
      name: "Sổ ứng hộ (Phải thu)",
      group: "DEBT",
      currency: "VND",
      initialBalance: 0,
      currentBalance: 0,
      isArchived: false,
      updatedAt: now,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: "seed-income-salary",
      type: "INCOME",
      amount: 28_000_000,
      accountId: "acc-tcb",
      categoryId: "thu-nhap",
      note: "Lương tháng này",
      occurredAt: atDay(1, 9),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-invest-transfer",
      type: "TRANSFER",
      amount: 6_000_000,
      accountId: "acc-tcb",
      toAccountId: "acc-invest",
      categoryId: "tich-luy",
      note: "Trích mua Vàng & BTC định kỳ",
      occurredAt: atDay(2, 10),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-rent",
      type: "EXPENSE",
      amount: 4_500_000,
      accountId: "acc-tcb",
      categoryId: "hoa-don",
      note: "Tiền nhà & Internet",
      occurredAt: atDay(3, 14),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-groceries",
      type: "EXPENSE",
      amount: 640_000,
      accountId: "acc-tcb",
      categoryId: "an-uong",
      note: "Đi siêu thị đầu tuần",
      occurredAt: atDay(Math.max(1, day - 3), 18),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-gas",
      type: "EXPENSE",
      amount: 95_000,
      accountId: "acc-cash",
      categoryId: "di-chuyen",
      note: "Đổ xăng A95",
      occurredAt: atDay(Math.max(1, day - 2), 8),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-coffee",
      type: "EXPENSE",
      amount: 55_000,
      accountId: "acc-cash",
      categoryId: "an-uong",
      note: "Cà phê sáng làm việc",
      occurredAt: atDay(day, 8),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-card-spend",
      type: "EXPENSE",
      amount: 420_000,
      accountId: "acc-debt",
      categoryId: "mua-sam",
      note: "Phụ kiện công việc",
      occurredAt: atDay(Math.max(1, day - 1), 20),
      syncStatus: "SYNCED",
      updatedAt: now,
    },
    {
      id: "seed-split-expense",
      type: "EXPENSE",
      amount: 300_000,
      accountId: "acc-tcb",
      categoryId: "an-uong",
      note: "Lẩu Bò tiềm (Phần mình 1/4)",
      occurredAt: atDay(day, 12),
      syncStatus: "SYNCED",
      updatedAt: now,
      splitInfo: {
        totalBill: 1_200_000,
        headcount: 4,
        myShare: 300_000,
        receivableAmount: 900_000,
        isSettled: false,
      },
    },
    {
      id: "seed-split-receivable",
      type: "TRANSFER",
      amount: 900_000,
      accountId: "acc-tcb",
      toAccountId: "acc-receivable",
      categoryId: "chuyen-vi",
      note: "Ứng hộ 3 người: Lẩu Bò tiềm",
      occurredAt: atDay(day, 12) + 1000,
      syncStatus: "SYNCED",
      updatedAt: now,
    },
  ];

  return {
    version: 2,
    accounts: computeAccountBalances(rawAccounts, transactions),
    transactions,
    budget: {
      ...DEFAULT_BUDGET_CONFIG,
      commitments: [
        {
          id: "com-rent",
          name: "Tiền nhà & Phí dịch vụ",
          amountVnd: 5_000_000,
          dueDay: 5,
          isPaid: true,
        },
        {
          id: "com-bills",
          name: "Điện EVN, Nước & Internet FPT",
          amountVnd: 1_500_000,
          dueDay: 12,
          isPaid: false,
        },
      ],
      updatedAt: now,
    },
    updatedAt: now,
  };
}

let memorySnapshot: MoneyFlowSnapshot | null = null;

function normalizeSnapshot(rawSnapshot: MoneyFlowSnapshot): MoneyFlowSnapshot {
  const transactions = rawSnapshot.transactions.map((tx) =>
    attachTransactionFingerprint(tx),
  );
  return {
    ...rawSnapshot,
    transactions,
    accounts: computeAccountBalances(rawSnapshot.accounts, transactions),
  };
}

function readFromLocalStorage(): MoneyFlowSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const rawV3 = window.localStorage.getItem(LOCAL_STORAGE_V3_KEY);
    const rawV2 = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const chosen = rawV3 ?? rawV2;
    if (!chosen) return null;
    const parsed = SnapshotSchema.safeParse(JSON.parse(chosen));
    if (!parsed.success) return null;
    const normalized = normalizeSnapshot(parsed.data);
    // Auto-upgrade legacy v2 storage key cleanly while retaining v2 as safety backup
    if (!rawV3 && rawV2) {
      try {
        window.localStorage.setItem(
          LOCAL_STORAGE_V3_KEY,
          JSON.stringify(normalized),
        );
      } catch {
        // Ignore quota limits cleanly
      }
    }
    return normalized;
  } catch {
    return null;
  }
}

function writeToLocalStorage(snapshot: MoneyFlowSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(snapshot);
    window.localStorage.setItem(LOCAL_STORAGE_V3_KEY, serialized);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
  } catch {
    // Ignore quota errors cleanly; in-memory and IndexedDB still retain state.
  }
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readFromIndexedDb(): Promise<MoneyFlowSnapshot | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        const parsed = SnapshotSchema.safeParse(req.result);
        db.close();
        if (!parsed.success) {
          resolve(null);
          return;
        }
        resolve({
          ...parsed.data,
          accounts: computeAccountBalances(
            parsed.data.accounts,
            parsed.data.transactions,
          ),
        });
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function writeToIndexedDb(snapshot: MoneyFlowSnapshot): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function loadSnapshotSync(): MoneyFlowSnapshot {
  const cached = readFromLocalStorage();
  if (cached) {
    memorySnapshot = cached;
    return cached;
  }
  if (memorySnapshot) return memorySnapshot;

  const seeded = createDefaultSnapshot();
  memorySnapshot = seeded;
  writeToLocalStorage(seeded);
  return seeded;
}

export async function hydrateSnapshotAsync(): Promise<MoneyFlowSnapshot> {
  const idb = await readFromIndexedDb();
  const local = readFromLocalStorage();
  if (idb && (!local || idb.updatedAt >= local.updatedAt)) {
    memorySnapshot = idb;
    writeToLocalStorage(idb);
    return idb;
  }
  const resolved = local ?? createDefaultSnapshot();
  memorySnapshot = resolved;
  writeToLocalStorage(resolved);
  void writeToIndexedDb(resolved);
  return resolved;
}

export function saveSnapshot(snapshot: MoneyFlowSnapshot): MoneyFlowSnapshot {
  const normalized = normalizeSnapshot({
    ...snapshot,
    updatedAt: Date.now(),
  });
  memorySnapshot = normalized;
  writeToLocalStorage(normalized);
  void writeToIndexedDb(normalized);
  return normalized;
}

export function exportBackupJson(snapshot: MoneyFlowSnapshot): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      snapshot,
    },
    null,
    2,
  );
}

export function importAnyLegacyOrBackup(
  rawJson: string,
  options?: { mergeInto?: MoneyFlowSnapshot },
): MigrationImportResult {
  const result = migrateAnyLegacyPayload(rawJson);

  if (options?.mergeInto) {
    const merged = mergeSnapshotsZeroLoss(options.mergeInto, result.snapshot);
    const saved = saveSnapshot(merged.snapshot);
    return {
      ...result,
      snapshot: saved,
      importedAccounts: merged.addedAccounts,
      importedTransactions: merged.addedTransactions,
      skippedDuplicates: merged.skippedDuplicates,
    };
  }

  const saved = saveSnapshot(result.snapshot);
  return {
    ...result,
    snapshot: saved,
  };
}

export function importBackupJson(rawJson: string): MoneyFlowSnapshot {
  return importAnyLegacyOrBackup(rawJson).snapshot;
}

/** Matches Android `WidgetSnapshotContract` (`flutter.mf_widget_snapshot` JSON payload). */
export interface AndroidWidgetSnapshot {
  total: number;
  safeSpend: number;
  savedAtMs: number;
  pendingReview: number;
}

export function buildAndroidWidgetSnapshot(
  snapshot: MoneyFlowSnapshot,
  safeToSpendDailyVnd: number,
  now = Date.now(),
): AndroidWidgetSnapshot {
  const totalVnd = snapshot.accounts
    .filter((acc) => !acc.isArchived)
    .reduce((sum, acc) => sum + Math.round(acc.currentBalance), 0);
  const pendingReview = snapshot.transactions.filter(
    (tx) => tx.syncStatus === "PENDING" && !tx.deletedAt,
  ).length;

  return {
    total: Math.round(totalVnd),
    safeSpend: Math.max(0, Math.round(safeToSpendDailyVnd)),
    savedAtMs: now,
    pendingReview,
  };
}
