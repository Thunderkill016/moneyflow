import "server-only";

import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import {
  DASHBOARD_RECENT_TRANSACTION_LIMIT,
  dashboardTransactionStart,
} from "@/lib/dashboard-transaction-window";
import type { AccountOption, CategoryOption, Transaction } from "@/lib/transactions/contracts";
import { demoAccounts, demoCategories, sampleTransactions } from "@/lib/demo/transaction-fixtures";

export type FinanceWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

const TRANSACTION_FEED_COLUMNS =
  "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines";

type FinanceWorkspaceScope = "full" | "dashboard";

const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  currency_code: z.string().length(3).optional(),
}).transform((row) => ({
  id: row.id,
  name: row.name,
  currencyCode: row.currency_code ?? "VND",
}));
const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(["income", "expense"]),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});
const splitLineSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string().min(1),
  amount_minor: z.union([z.number(), z.string()]),
});

const feedSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["income", "expense", "transfer"]),
  note: z.string(),
  occurred_on: z.string(),
  created_at: z.string(),
  amount_minor: z.union([z.number(), z.string()]),
  account_id: z.string().uuid(),
  account_name: z.string().min(1),
  category_id: z.string().uuid().nullable(),
  category_name: z.string().nullable(),
  destination_account_id: z.string().uuid().nullable().optional(),
  destination_account_name: z.string().nullable().optional(),
  is_recurring_payment: z.boolean().optional(),
  split_lines: z.array(splitLineSchema).nullable().optional(),
});

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatRelativeDate(date: string) {
  const today = todayInVietnam();
  if (date === today) return "Hôm nay";
  if (date === shiftDate(today, -1)) return "Hôm qua";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

export function mapTransactionFeedRow(value: unknown): Transaction {
  const row = feedSchema.parse(value);
  const amount = Math.abs(Number(row.amount_minor));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid_transaction_amount");

  const splits =
    row.kind === "expense" && row.split_lines && row.split_lines.length >= 2
      ? row.split_lines.map((line) => {
          const lineAmount = Math.abs(Number(line.amount_minor));
          if (!Number.isSafeInteger(lineAmount) || lineAmount <= 0) {
            throw new Error("invalid_split_amount");
          }
          return {
            categoryId: line.category_id,
            category: line.category_name,
            amount: lineAmount,
          };
        })
      : undefined;

  if (splits) {
    const sum = splits.reduce((acc, line) => acc + line.amount, 0);
    if (!Number.isSafeInteger(sum) || sum !== amount) throw new Error("invalid_split_total");
  }

  return {
    id: row.id,
    kind: row.kind,
    categoryId: row.category_id ?? "",
    category: row.kind === "transfer" ? "Chuyển tiền" : row.category_name ?? "Chưa phân loại",
    note: row.note || row.category_name || "Giao dịch",
    accountId: row.account_id,
    account: row.account_name,
    destinationAccountId: row.destination_account_id ?? undefined,
    destinationAccount: row.destination_account_name ?? undefined,
    isRecurringPayment: row.is_recurring_payment ?? false,
    splits,
    amount,
    occurredOn: row.occurred_on,
    occurredAt: row.created_at,
    relativeDate: formatRelativeDate(row.occurred_on),
  };
}

function demoWorkspace(): FinanceWorkspace {
  return {
    transactions: sampleTransactions,
    accounts: demoAccounts,
    categories: demoCategories,
    totalBalance: 15_735_000,
    today: todayInVietnam(),
    dataError: null,
  };
}

function newestFirst(left: Transaction, right: Transaction) {
  return right.occurredOn.localeCompare(left.occurredOn) || right.occurredAt.localeCompare(left.occurredAt);
}

function deduplicateTransactions(transactions: Transaction[]) {
  const unique = new Map<string, Transaction>();
  for (const transaction of transactions) {
    if (!unique.has(transaction.id)) unique.set(transaction.id, transaction);
  }
  return [...unique.values()].sort(newestFirst);
}

async function loadFinanceWorkspace(scope: FinanceWorkspaceScope): Promise<FinanceWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return demoWorkspace();

  const supabase = await createClient();
  if (!supabase) return { ...demoWorkspace(), dataError: "Không thể kết nối dữ liệu." };

  const today = todayInVietnam();
  const periodFeedPromise =
    scope === "dashboard"
      ? supabase.from("transaction_feed").select(TRANSACTION_FEED_COLUMNS)
          .gte("occurred_on", dashboardTransactionStart(today))
          .order("occurred_on", { ascending: false }).order("created_at", { ascending: false })
      : supabase.from("transaction_feed").select(TRANSACTION_FEED_COLUMNS)
          .order("occurred_on", { ascending: false }).order("created_at", { ascending: false });

  const recentFeedPromise =
    scope === "dashboard"
      ? supabase.from("transaction_feed").select(TRANSACTION_FEED_COLUMNS)
          .order("occurred_on", { ascending: false }).order("created_at", { ascending: false })
          .limit(DASHBOARD_RECENT_TRANSACTION_LIMIT)
      : Promise.resolve({ data: [] as unknown[], error: null });

  const [accountsResult, categoriesResult, periodFeedResult, recentFeedResult, balancesResult] = await Promise.all([
    supabase.from("accounts").select("id,name,currency_code").eq("is_archived", false).order("created_at"),
    supabase.from("categories").select("id,name,kind,icon,color").eq("is_archived", false).order("created_at"),
    periodFeedPromise,
    recentFeedPromise,
    supabase.from("account_balances").select("account_id,balance_minor,currency_code"),
  ]);

  if (accountsResult.error || categoriesResult.error || periodFeedResult.error || recentFeedResult.error || balancesResult.error) {
    return { transactions: [], accounts: [], categories: [], totalBalance: 0, today, dataError: "Chưa tải được dữ liệu tài chính. Hãy thử tải lại trang." };
  }

  try {
    const accounts = z.array(accountSchema).parse(accountsResult.data) satisfies AccountOption[];
    const categories = z.array(categorySchema).parse(categoriesResult.data) satisfies CategoryOption[];
    const transactions = deduplicateTransactions(
      [...(periodFeedResult.data ?? []), ...(recentFeedResult.data ?? [])].map(mapTransactionFeedRow),
    );
    const totalBalance = (balancesResult.data ?? []).reduce((sum, item) => {
      const code = String(item.currency_code ?? "VND").toUpperCase();
      if (code !== "VND") return sum;
      const amount = Number(item.balance_minor);
      if (!Number.isSafeInteger(amount)) throw new Error("invalid_account_balance");
      return sum + amount;
    }, 0);

    return { transactions, accounts, categories, totalBalance, today, dataError: null };
  } catch {
    return { transactions: [], accounts: [], categories: [], totalBalance: 0, today, dataError: "Dữ liệu tài chính không đúng định dạng. Hãy liên hệ hỗ trợ." };
  }
}

export async function getFinanceWorkspace(): Promise<FinanceWorkspace> {
  return loadFinanceWorkspace("full");
}

export async function getDashboardFinanceWorkspace(): Promise<FinanceWorkspace> {
  return loadFinanceWorkspace("dashboard");
}
