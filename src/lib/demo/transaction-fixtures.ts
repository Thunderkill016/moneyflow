import type { AccountOption, CategoryOption, Transaction, TransactionKind } from "../transactions/contracts.ts";
import { categories, categoryMeta } from "../transactions/category-presentation.ts";

export const demoAccounts: AccountOption[] = [
  { id: "demo-account-mb", name: "MB Bank", currencyCode: "VND" },
  { id: "demo-account-cash", name: "Tiền mặt", currencyCode: "VND" },
  { id: "demo-account-momo", name: "MoMo", currencyCode: "VND" },
  { id: "demo-account-usd", name: "USD du lịch", currencyCode: "USD" },
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
];

const DAY_MS = 86_400_000;

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_demo_date");
  return new Date(date.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

/** "Hôm nay" / "Hôm qua" / "13 thg 7" — derived, never stored beside the date. */
function relativeLabel(occurredOn: string, daysAgo: number): string {
  if (daysAgo === 0) return "Hôm nay";
  if (daysAgo === 1) return "Hôm qua";
  const day = Number(occurredOn.slice(8, 10));
  const month = Number(occurredOn.slice(5, 7));
  return `${day} thg ${month}`;
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
      accountId: seed.accountId,
      account: seed.account,
      amount: seed.amount,
      occurredOn,
      occurredAt: `${occurredOn}T${seed.timeUtc}`,
      relativeDate: relativeLabel(occurredOn, seed.daysAgo),
    } satisfies Transaction;
  });
}
