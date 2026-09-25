import type { AccountOption, CategoryOption, Transaction, TransactionKind } from "../transactions/contracts.ts";
import { categories, categoryMeta } from "../transactions/category-presentation.ts";
import { formatRelativeDate } from "../relative-date.ts";

/*
 * `balance` mirrors the demoAccountRows snapshot in src/server/accounts.ts:
 * the running-balance column anchors at the same figure the accounts page
 * shows, then reconciles against the stored demo ledger.
 */
export const demoAccounts: AccountOption[] = [
  { id: "demo-account-mb", name: "MB Bank", currencyCode: "VND", balance: 15_454_000 },
  { id: "demo-account-cash", name: "Tiền mặt", currencyCode: "VND", balance: 239_000 },
  { id: "demo-account-momo", name: "MoMo", currencyCode: "VND", balance: 42_000 },
  { id: "demo-account-usd", name: "USD du lịch", currencyCode: "USD", balance: 20_000 },
];

export const demoCategories: CategoryOption[] = Object.entries(categories).flatMap(
  ([kind, names]) =>
    names.map((name) => ({
      id: `demo-category-${kind}-${name}`,
      name,
      kind: kind as TransactionKind,
      icon: categoryMeta[name]?.icon ?? null,
      color: categoryMeta[name]?.color ?? null,
    })),
);

/*
 * Demo ledger seeds, dated relative to whenever the demo is opened.
 *
 * These rows used to carry a hard-coded `occurredOn` beside a hard-coded
 * `relativeDate`, so a row labelled "Hôm nay" kept that label while its date
 * aged. Six weeks after the fixture was written it claimed to be today while
 * sitting in a month every month-scoped panel correctly reported as empty, and
 * the dashboard showed a spend figure with nothing behind it. In a product
 * whose whole claim is that a number can be checked, the demo was demonstrating
 * the opposite to every first-time visitor.
 *
 * Deriving both from one resolved date is what keeps them from drifting apart
 * again: the label cannot disagree with the date because it is computed from it.
 */
type DemoSeed = {
  id: string;
  kind: Transaction["kind"];
  categoryId: string;
  category: string;
  note: (monthLabel: string) => string;
  /** Merchant/entity shown beside the memo; absent means no payee recorded. */
  payee?: string;
  accountId: string;
  account: string;
  amount: number;
  /** Whole days before the resolved date. 0 is that date itself. */
  daysAgo: number;
  /** UTC clock portion, kept so the ordering within a day stays deliberate. */
  timeUtc: string;
};

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: "sample-1",
    kind: "expense",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    note: () => "Cơm trưa",
    payee: "Cơm Minh Đức",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 63_000,
    daysAgo: 0,
    timeUtc: "05:10:00.000Z",
  },
  {
    id: "sample-2",
    kind: "expense",
    categoryId: "demo-category-expense-Di chuyển",
    category: "Di chuyển",
    note: () => "Grab đi làm",
    payee: "Grab",
    accountId: "demo-account-momo",
    account: "MoMo",
    amount: 42_000,
    daysAgo: 0,
    timeUtc: "01:15:00.000Z",
  },
  {
    id: "sample-3",
    kind: "expense",
    categoryId: "demo-category-expense-Mua sắm",
    category: "Mua sắm",
    note: () => "Đồ dùng cá nhân",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 286_000,
    daysAgo: 1,
    timeUtc: "11:30:00.000Z",
  },
  {
    id: "sample-4",
    kind: "income",
    categoryId: "demo-category-income-Lương",
    category: "Lương",
    /*
     * Named for the month it actually falls in. A fixed "Lương tháng 7" would
     * be the same lie as a fixed "Hôm nay", just slower to notice.
     */
    note: (monthLabel) => `Lương ${monthLabel}`,
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 15_000_000,
    daysAgo: 4,
    timeUtc: "02:00:00.000Z",
  },
  /*
   * Trailing-month rows on categories the demo has not budgeted, so the
   * budgets page can show a suggestion computed from the same ledger the
   * demo dashboard reports — a suggestion that could only appear on data
   * nobody can see would be the same lie as a fixed "Hôm nay".
   */
  {
    id: "sample-bill-1",
    kind: "expense",
    categoryId: "demo-category-expense-Hóa đơn",
    category: "Hóa đơn",
    note: (monthLabel) => `Điện nước ${monthLabel}`,
    payee: "EVN + Nước",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 890_000,
    daysAgo: 35,
    timeUtc: "09:20:00.000Z",
  },
  {
    id: "sample-bill-2",
    kind: "expense",
    categoryId: "demo-category-expense-Hóa đơn",
    category: "Hóa đơn",
    note: (monthLabel) => `Điện nước ${monthLabel}`,
    payee: "EVN + Nước",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 830_000,
    daysAgo: 65,
    timeUtc: "09:25:00.000Z",
  },
  {
    id: "sample-bill-3",
    kind: "expense",
    categoryId: "demo-category-expense-Hóa đơn",
    category: "Hóa đơn",
    note: (monthLabel) => `Điện nước ${monthLabel}`,
    payee: "EVN + Nước",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 920_000,
    daysAgo: 95,
    timeUtc: "09:30:00.000Z",
  },
  {
    id: "sample-fun-1",
    kind: "expense",
    categoryId: "demo-category-expense-Giải trí",
    category: "Giải trí",
    note: () => "Vé phim",
    accountId: "demo-account-momo",
    account: "MoMo",
    amount: 350_000,
    daysAgo: 45,
    timeUtc: "13:10:00.000Z",
  },
  {
    id: "sample-fun-2",
    kind: "expense",
    categoryId: "demo-category-expense-Giải trí",
    category: "Giải trí",
    note: () => "Nhạc số",
    accountId: "demo-account-momo",
    account: "MoMo",
    amount: 280_000,
    daysAgo: 100,
    timeUtc: "14:00:00.000Z",
  },
];

const DAY_MS = 86_400_000;

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_demo_date");
  return new Date(date.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}



/**
 * The demo ledger as of `today` ("YYYY-MM-DD", already resolved in
 * Asia/Ho_Chi_Minh by the caller).
 *
 * Callers pass their own resolved date rather than this module reading a clock,
 * so a server module that stays warm for hours cannot freeze the demo's idea of
 * today — the same reason every other date in this product is passed in.
 */
export function sampleTransactionsFor(today: string): Transaction[] {
  return DEMO_SEEDS.map((seed) => {
    const occurredOn = shiftDays(today, seed.daysAgo);
    const monthLabel = `tháng ${Number(occurredOn.slice(5, 7))}`;
    return {
      id: seed.id,
      kind: seed.kind,
      categoryId: seed.categoryId,
      category: seed.category,
      note: seed.note(monthLabel),
      payee: seed.payee,
      accountId: seed.accountId,
      account: seed.account,
      amount: seed.amount,
      occurredOn,
      occurredAt: `${occurredOn}T${seed.timeUtc}`,
      relativeDate: formatRelativeDate(occurredOn, today),
    } satisfies Transaction;
  });
}
