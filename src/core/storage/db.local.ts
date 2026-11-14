import { z } from "zod";
import { computeAccountBalances } from "../engine/ledger.engine.ts";
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

export const LOCAL_STORAGE_KEY = "moneyflow.clean.v2";
const IDB_NAME = "moneyflow_clean_idb_v2";
const IDB_STORE = "snapshots";
const IDB_KEY = "primary";

export const SnapshotSchema = z.object({
  version: z.literal(2),
  accounts: z.array(AccountSchema),
  transactions: z.array(TransactionSchema),
  budget: BudgetConfigSchema,
  updatedAt: z.number().int().nonnegative(),
});

export interface MoneyFlowSnapshot {
  version: 2;
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
  ];

  return {
    version: 2,
    accounts: computeAccountBalances(rawAccounts, transactions),
    transactions,
    budget: { ...DEFAULT_BUDGET_CONFIG, updatedAt: now },
    updatedAt: now,
  };
}

let memorySnapshot: MoneyFlowSnapshot | null = null;

function readFromLocalStorage(): MoneyFlowSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = SnapshotSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      accounts: computeAccountBalances(
        parsed.data.accounts,
        parsed.data.transactions,
      ),
    };
  } catch {
    return null;
  }
}

function writeToLocalStorage(snapshot: MoneyFlowSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
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
  const normalized: MoneyFlowSnapshot = {
    ...snapshot,
    version: 2,
    accounts: computeAccountBalances(snapshot.accounts, snapshot.transactions),
    updatedAt: Date.now(),
  };
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

export function importBackupJson(rawJson: string): MoneyFlowSnapshot {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawJson);
  } catch {
    throw new Error("File JSON không hợp lệ.");
  }

  const candidate =
    decoded &&
    typeof decoded === "object" &&
    "snapshot" in decoded &&
    decoded.snapshot
      ? (decoded as { snapshot: unknown }).snapshot
      : decoded;

  const parsed = SnapshotSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("Cấu trúc file backup không đúng chuẩn MoneyFlow v2.");
  }

  return saveSnapshot({
    ...parsed.data,
    accounts: computeAccountBalances(
      parsed.data.accounts,
      parsed.data.transactions,
    ),
    updatedAt: Date.now(),
  });
}
