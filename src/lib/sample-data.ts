export type TransactionKind = "expense" | "income";

/** Multi-entry expense lines (TASK-128). Present when one chi is split across categories. */
export type TransactionSplitLine = {
  categoryId: string;
  category: string;
  amount: number;
};

export type Transaction = {
  id: string;
  kind: TransactionKind | "transfer";
  categoryId: string;
  category: string;
  note: string;
  accountId: string;
  account: string;
  destinationAccountId?: string;
  destinationAccount?: string;
  isRecurringPayment?: boolean;
  /** 2+ lines when expense is split across categories (ledger multi-entry). */
  splits?: TransactionSplitLine[];
  amount: number;
  occurredOn: string;
  occurredAt: string;
  relativeDate: string;
};

export type AccountOption = {
  id: string;
  name: string;
  /** ISO 4217; defaults to VND when omitted (legacy callers). */
  currencyCode?: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: TransactionKind;
  icon: string | null;
  color: string | null;
};

export type CreateTransactionInput = {
  kind: TransactionKind;
  categoryId: string;
  accountId: string;
  amount: number;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
};

export type CreateTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
};

/** One expense, 2+ category lines (integer minor units each). */
export type CreateSplitExpenseInput = {
  accountId: string;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
  lines: { categoryId: string; amount: number }[];
};

export type UpdateMoneyTransactionInput = Omit<CreateTransactionInput, "idempotencyKey"> & {
  id: string;
};

export type UpdateTransferInput = Omit<CreateTransferInput, "idempotencyKey"> & {
  id: string;
  kind: "transfer";
};

export const categories = {
  expense: ["Ăn uống", "Di chuyển", "Mua sắm", "Nhà ở", "Hóa đơn", "Giải trí", "Sức khỏe", "Giáo dục"],
  income: ["Lương", "Thưởng", "Thu nhập khác"],
} satisfies Record<TransactionKind, string[]>;

export const categoryMeta: Record<string, { icon: string; color: string }> = {
  "Ăn uống": { icon: "bowl", color: "coral" },
  "Di chuyển": { icon: "car", color: "blue" },
  "Mua sắm": { icon: "bag", color: "violet" },
  "Nhà ở": { icon: "home", color: "amber" },
  "Hóa đơn": { icon: "receipt", color: "cyan" },
  "Giải trí": { icon: "spark", color: "pink" },
  "Sức khỏe": { icon: "heart", color: "red" },
  "Giáo dục": { icon: "book", color: "blue" },
  Lương: { icon: "wallet", color: "green" },
  Thưởng: { icon: "spark", color: "green" },
  "Thu nhập khác": { icon: "bank", color: "green" },
  "Chuyển tiền": { icon: "arrows", color: "blue" },
};

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
