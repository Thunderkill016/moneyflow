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

export const sampleTransactions: Transaction[] = [
  {
    id: "sample-1",
    kind: "expense",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    note: "Cơm trưa",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 63_000,
    occurredOn: "2026-07-14",
    occurredAt: "2026-07-14T05:10:00.000Z",
    relativeDate: "Hôm nay",
  },
  {
    id: "sample-2",
    kind: "expense",
    categoryId: "demo-category-expense-Di chuyển",
    category: "Di chuyển",
    note: "Grab đi làm",
    accountId: "demo-account-momo",
    account: "MoMo",
    amount: 42_000,
    occurredOn: "2026-07-14",
    occurredAt: "2026-07-14T01:15:00.000Z",
    relativeDate: "Hôm nay",
  },
  {
    id: "sample-3",
    kind: "expense",
    categoryId: "demo-category-expense-Mua sắm",
    category: "Mua sắm",
    note: "Đồ dùng cá nhân",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 286_000,
    occurredOn: "2026-07-13",
    occurredAt: "2026-07-13T11:30:00.000Z",
    relativeDate: "Hôm qua",
  },
  {
    id: "sample-4",
    kind: "income",
    categoryId: "demo-category-income-Lương",
    category: "Lương",
    note: "Lương tháng 7",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 15_000_000,
    occurredOn: "2026-07-10",
    occurredAt: "2026-07-10T02:00:00.000Z",
    relativeDate: "10 thg 7",
  },
];
