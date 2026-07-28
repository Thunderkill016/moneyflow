import {
  accountBalancesAfterLedgerReplacement,
  type AccountKind,
  type AccountSummary,
} from "./accounts.ts";
import {
  isCategoryNameUnique,
  isValidCategoryName,
  type CategorySummary,
} from "./categories.ts";
import {
  demoCategories,
  sampleTransactions,
  type AccountOption,
  type CategoryOption,
  type Transaction,
} from "./sample-data.ts";

export const DEMO_ACCOUNT_STORAGE_KEY = "moneyflow-demo-accounts-v1";
export const DEMO_CATEGORY_STORAGE_KEY = "moneyflow-demo-categories-v1";

export type DemoAccountRecord = {
  id: string;
  name: string;
  kind: AccountKind;
  currencyCode: string;
  initialBalance: number;
  /** Balance before any transaction in the active demo ledger is applied. */
  baseBalance: number;
  isArchived: boolean;
};

type DemoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const accountKinds = new Set<AccountKind>([
  "cash",
  "bank",
  "e_wallet",
  "credit_card",
  "savings",
]);

export const demoAccountSummaries: AccountSummary[] = [
  {
    id: "demo-account-mb",
    name: "MB Bank",
    kind: "bank",
    currencyCode: "VND",
    initialBalance: 1_126_000,
    balance: 15_454_000,
    isArchived: false,
  },
  {
    id: "demo-account-cash",
    name: "Tiền mặt",
    kind: "cash",
    currencyCode: "VND",
    initialBalance: 0,
    balance: 239_000,
    isArchived: false,
  },
  {
    id: "demo-account-momo",
    name: "MoMo",
    kind: "e_wallet",
    currencyCode: "VND",
    initialBalance: 0,
    balance: 42_000,
    isArchived: false,
  },
  /** 200.00 USD in minor units (cents); MoneyFlow does not perform FX conversion. */
  {
    id: "demo-account-usd",
    name: "USD du lịch",
    kind: "cash",
    currencyCode: "USD",
    initialBalance: 20_000,
    balance: 20_000,
    isArchived: false,
  },
];

export const demoCategorySummaries: CategorySummary[] = demoCategories.map(
  (item) => ({
    ...item,
    isDefault: true,
    isArchived: false,
  }),
);

function recordsFromObservedAccounts(
  accounts: AccountSummary[],
  observedTransactions: Transaction[],
): DemoAccountRecord[] {
  return accountBalancesAfterLedgerReplacement(
    accounts,
    observedTransactions,
    [],
  ).map((account) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    currencyCode: account.currencyCode,
    initialBalance: account.initialBalance,
    baseBalance: account.balance,
    isArchived: account.isArchived,
  }));
}

export const demoAccountRecords = recordsFromObservedAccounts(
  demoAccountSummaries,
  sampleTransactions,
);

function cloneAccountRecords(records: readonly DemoAccountRecord[]) {
  return records.map((item) => ({ ...item }));
}

function cloneCategorySummaries(categories: readonly CategorySummary[]) {
  return categories.map((item) => ({ ...item }));
}

function defaultStorage(): DemoStorage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function isDemoAccountRecord(value: unknown): value is DemoAccountRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DemoAccountRecord>;
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.kind === "string" &&
    accountKinds.has(item.kind as AccountKind) &&
    typeof item.currencyCode === "string" &&
    /^[A-Z]{3}$/.test(item.currencyCode) &&
    Number.isSafeInteger(item.initialBalance) &&
    Number.isSafeInteger(item.baseBalance) &&
    typeof item.isArchived === "boolean"
  );
}

function isCategorySummary(value: unknown): value is CategorySummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CategorySummary>;
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.name === "string" &&
    isValidCategoryName(item.name) &&
    (item.kind === "expense" || item.kind === "income") &&
    (item.icon === null || typeof item.icon === "string") &&
    (item.color === null || typeof item.color === "string") &&
    typeof item.isDefault === "boolean" &&
    typeof item.isArchived === "boolean"
  );
}

function hasUniqueIds(items: ReadonlyArray<{ id: string }>) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function isDemoAccountList(value: unknown): value is DemoAccountRecord[] {
  return (
    Array.isArray(value) &&
    value.every(isDemoAccountRecord) &&
    hasUniqueIds(value)
  );
}

function isDemoCategoryList(value: unknown): value is CategorySummary[] {
  if (
    !Array.isArray(value) ||
    !value.every(isCategorySummary) ||
    !hasUniqueIds(value)
  ) {
    return false;
  }
  return value.every((item) =>
    isCategoryNameUnique(item.name, item.kind, value, item.id),
  );
}

function removeInvalidStore(storage: DemoStorage | null, key: string) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // A restricted browser store still falls back to canonical in-memory data.
  }
}

export function readStoredDemoAccounts(
  storage: DemoStorage | null = defaultStorage(),
): DemoAccountRecord[] {
  if (!storage) return cloneAccountRecords(demoAccountRecords);
  try {
    const saved = storage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
    if (!saved) return cloneAccountRecords(demoAccountRecords);
    const parsed: unknown = JSON.parse(saved);
    if (isDemoAccountList(parsed)) return cloneAccountRecords(parsed);
  } catch {
    // Invalid JSON and restricted storage both use the safe fallback below.
  }
  removeInvalidStore(storage, DEMO_ACCOUNT_STORAGE_KEY);
  return cloneAccountRecords(demoAccountRecords);
}

export function writeStoredDemoAccounts(
  records: readonly DemoAccountRecord[],
  storage: DemoStorage | null = defaultStorage(),
) {
  if (!isDemoAccountList(records)) {
    throw new Error("invalid_demo_accounts");
  }
  storage?.setItem(DEMO_ACCOUNT_STORAGE_KEY, JSON.stringify(records));
}

export function readStoredDemoCategories(
  storage: DemoStorage | null = defaultStorage(),
): CategorySummary[] {
  if (!storage) return cloneCategorySummaries(demoCategorySummaries);
  try {
    const saved = storage.getItem(DEMO_CATEGORY_STORAGE_KEY);
    if (!saved) return cloneCategorySummaries(demoCategorySummaries);
    const parsed: unknown = JSON.parse(saved);
    if (isDemoCategoryList(parsed)) return cloneCategorySummaries(parsed);
  } catch {
    // Invalid JSON and restricted storage both use the safe fallback below.
  }
  removeInvalidStore(storage, DEMO_CATEGORY_STORAGE_KEY);
  return cloneCategorySummaries(demoCategorySummaries);
}

export function writeStoredDemoCategories(
  categories: readonly CategorySummary[],
  storage: DemoStorage | null = defaultStorage(),
) {
  if (!isDemoCategoryList(categories)) {
    throw new Error("invalid_demo_categories");
  }
  storage?.setItem(DEMO_CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

export function accountSummariesFromDemoRecords(
  records: readonly DemoAccountRecord[],
  transactions: Transaction[],
): AccountSummary[] {
  const baseAccounts = records.map(
    (record): AccountSummary => ({
      id: record.id,
      name: record.name,
      kind: record.kind,
      currencyCode: record.currencyCode,
      initialBalance: record.initialBalance,
      balance: record.baseBalance,
      isArchived: record.isArchived,
    }),
  );
  return accountBalancesAfterLedgerReplacement(baseAccounts, [], transactions);
}

export function activeDemoAccountOptions(
  records: readonly DemoAccountRecord[],
): AccountOption[] {
  return records
    .filter((item) => !item.isArchived)
    .map(({ id, name, currencyCode }) => ({ id, name, currencyCode }));
}

export function activeDemoCategoryOptions(
  categories: readonly CategorySummary[],
): CategoryOption[] {
  return categories
    .filter((item) => !item.isArchived)
    .map(({ id, name, kind, icon, color }) => ({
      id,
      name,
      kind,
      icon,
      color,
    }));
}

export function demoBalanceForCurrency(
  records: readonly DemoAccountRecord[],
  transactions: Transaction[],
  currencyCode: string,
): number {
  return accountSummariesFromDemoRecords(records, transactions)
    .filter(
      (account) =>
        !account.isArchived && account.currencyCode === currencyCode,
    )
    .reduce((sum, account) => {
      const next = sum + account.balance;
      if (!Number.isSafeInteger(next)) {
        throw new Error("unsafe_demo_currency_total");
      }
      return next;
    }, 0);
}
