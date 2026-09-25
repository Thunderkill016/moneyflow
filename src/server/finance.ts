import "server-only";

import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import { formatRelativeDate } from "@/lib/relative-date";
import {
  DASHBOARD_RECENT_TRANSACTION_LIMIT,
  dashboardTransactionStart,
} from "@/lib/dashboard-transaction-window";
import type {
  AccountOption,
  CategoryOption,
  DeletedTransaction,
  GoalOption,
  Transaction,
  TransactionReviewStatus,
} from "@/lib/transactions/contracts";
import {
  demoAccounts,
  demoCategories,
  sampleTransactionsFor,
} from "@/lib/demo/transaction-fixtures";
import { DEMO_SAVINGS_GOALS } from "@/lib/planning/goals";
import { getTransactionReviewStatus } from "@/lib/transaction-review";
import { readAllPages } from "@/lib/paginated-read";
export { readAllPages } from "@/lib/paginated-read";

export type FinanceWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  /** Active categories only — the set pickers and filters may offer. */
  categories: CategoryOption[];
  /**
   * Active + archived categories for the presentation index. A historical row
   * still references its archived category, so icon/color resolution must see
   * it — while pickers keep offering `categories` only. Optional because the
   * dashboard bundle payload carries active rows only; consumers fall back to
   * `categories`.
   */
  metaCategories?: CategoryOption[];
  /** Active + archived goals for the transaction goal picker (annotation). */
  goals: GoalOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
  /** Present only when the caller owns the full transaction-review surface. */
  reviewFeatureAvailable?: boolean;
};

export const TRANSACTION_FEED_COLUMNS =
  "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines,payee,goal_id,goal_name";
const TRANSACTION_REVIEW_COLUMNS = "id,review_status,occurred_on,created_at";
const DELETED_TRANSACTION_FEED_COLUMNS = `${TRANSACTION_FEED_COLUMNS},deleted_at`;

type FinanceWorkspaceScope = "full" | "dashboard";

const accountSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    currency_code: z.string().length(3).optional(),
  })
  .transform((row) => ({
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
  is_archived: z.boolean(),
});
const splitLineSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string().min(1),
  amount_minor: z.union([z.number(), z.string()]),
});
const reviewFeedSchema = z.object({
  id: z.string().uuid(),
  review_status: z.enum(["needs_review", "reviewed"]),
  occurred_on: z.string(),
  created_at: z.string(),
});

const feedSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["income", "expense", "transfer"]),
  note: z.string(),
  occurred_on: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  amount_minor: z.union([z.number(), z.string()]),
  account_id: z.string().uuid(),
  account_name: z.string().min(1),
  category_id: z.string().uuid().nullable(),
  category_name: z.string().nullable(),
  destination_account_id: z.string().uuid().nullable().optional(),
  destination_account_name: z.string().nullable().optional(),
  is_recurring_payment: z.boolean().optional(),
  /** Multi-entry expense lines when split across categories (TASK-128). */
  split_lines: z.array(splitLineSchema).nullable().optional(),
  payee: z.string().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  goal_name: z.string().nullable().optional(),
});

const goalOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  is_archived: z.boolean(),
});

/**
 * Companion feed over soft-deleted rows (`deleted_transaction_feed`). Same
 * projection as `feedSchema` plus the tombstone timestamp that drives the
 * "Đã xóa lúc …" line and the newest-deleted-first ordering.
 */
const deletedFeedSchema = feedSchema.extend({
  deleted_at: z.string(),
});

export function mapTransactionFeedRow(value: unknown): Transaction {
  const row = feedSchema.parse(value);
  const amount = Math.abs(Number(row.amount_minor));
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("invalid_transaction_amount");
  }

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
    if (!Number.isSafeInteger(sum) || sum !== amount) {
      throw new Error("invalid_split_total");
    }
  }

  return {
    id: row.id,
    kind: row.kind,
    categoryId: row.category_id ?? "",
    category:
      row.kind === "transfer"
        ? "Chuyển tiền"
        : (row.category_name ?? "Chưa phân loại"),
    note: row.note || row.category_name || "Giao dịch",
    payee: row.payee || undefined,
    goalId: row.goal_id ?? undefined,
    goalName: row.goal_name ?? undefined,
    accountId: row.account_id,
    account: row.account_name,
    destinationAccountId: row.destination_account_id ?? undefined,
    destinationAccount: row.destination_account_name ?? undefined,
    isRecurringPayment: row.is_recurring_payment ?? false,
    splits,
    amount,
    occurredOn: row.occurred_on,
    occurredAt: row.created_at,
    updatedAt: row.updated_at,
    relativeDate: formatRelativeDate(row.occurred_on, todayInVietnam()),
  };
}

/**
 * `deleted_transaction_feed` mirrors `transaction_feed`, so the row mapping
 * stays identical; only the tombstone timestamp is peeled off first.
 * `feedSchema` strips `deleted_at` on the inner parse, so this stays honest.
 */
export function mapDeletedTransactionFeedRow(
  value: unknown,
): DeletedTransaction {
  const row = deletedFeedSchema.parse(value);
  return { transaction: mapTransactionFeedRow(row), deletedAt: row.deleted_at };
}

function demoWorkspace(): FinanceWorkspace {
  return {
    transactions: sampleTransactionsFor(todayInVietnam()).map(
      (transaction) => ({
        ...transaction,
        reviewStatus: getTransactionReviewStatus(transaction),
      }),
    ),
    accounts: demoAccounts,
    categories: demoCategories,
    metaCategories: demoCategories,
    goals: DEMO_SAVINGS_GOALS.map((goal) => ({
      id: goal.id,
      name: goal.name,
      isArchived: goal.isArchived,
    })),
    totalBalance: 15_735_000,
    today: todayInVietnam(),
    dataError: null,
    reviewFeatureAvailable: true,
  };
}

function newestFirst(left: Transaction, right: Transaction) {
  return (
    right.occurredOn.localeCompare(left.occurredOn) ||
    right.occurredAt.localeCompare(left.occurredAt) ||
    right.id.localeCompare(left.id)
  );
}

function deduplicateTransactions(transactions: Transaction[]) {
  const unique = new Map<string, Transaction>();
  for (const transaction of transactions) {
    if (!unique.has(transaction.id)) unique.set(transaction.id, transaction);
  }
  return [...unique.values()].sort(newestFirst);
}

function readReviewState(
  scope: FinanceWorkspaceScope,
  data: unknown[] | null,
  hasError: boolean,
) {
  if (scope !== "full" || hasError) {
    return {
      available: false,
      byId: new Map<string, TransactionReviewStatus>(),
    };
  }

  try {
    const rows = z.array(reviewFeedSchema).parse(data ?? []);
    return {
      available: true,
      byId: new Map(rows.map((row) => [row.id, row.review_status] as const)),
    };
  } catch {
    return {
      available: false,
      byId: new Map<string, TransactionReviewStatus>(),
    };
  }
}

async function loadFinanceWorkspace(
  scope: FinanceWorkspaceScope,
): Promise<FinanceWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return demoWorkspace();

  const supabase = await createClient();
  if (!supabase) {
    return { ...demoWorkspace(), dataError: "Không thể kết nối dữ liệu." };
  }

  const today = todayInVietnam();
  const periodFeedPromise =
    scope === "dashboard"
      ? readAllPages((from, to) =>
          supabase
            .from("transaction_feed")
            .select(TRANSACTION_FEED_COLUMNS)
            .eq("user_id", viewer.id)
            .gte("occurred_on", dashboardTransactionStart(today))
            .order("occurred_on", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        )
      : readAllPages((from, to) =>
          supabase
            .from("transaction_feed")
            .select(TRANSACTION_FEED_COLUMNS)
            .eq("user_id", viewer.id)
            .order("occurred_on", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        );

  const recentFeedPromise =
    scope === "dashboard"
      ? supabase
          .from("transaction_feed")
          .select(TRANSACTION_FEED_COLUMNS)
          .eq("user_id", viewer.id)
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(DASHBOARD_RECENT_TRANSACTION_LIMIT)
      : Promise.resolve({ data: [] as unknown[], error: null });

  const reviewFeedPromise =
    scope === "full"
      ? readAllPages((from, to) =>
          supabase
            .from("transaction_review_feed")
            .select(TRANSACTION_REVIEW_COLUMNS)
            .eq("user_id", viewer.id)
            .order("occurred_on", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve({ data: [] as unknown[], error: null });

  const [
    accountsResult,
    categoriesResult,
    periodFeedResult,
    recentFeedResult,
    balancesResult,
    reviewFeedResult,
    goalsResult,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,currency_code")
      .eq("user_id", viewer.id)
      .eq("is_archived", false)
      .order("created_at"),
    /*
     * Archived categories are part of the read too: picker options filter them
     * out below, but the meta index still needs their stored icon/color for
     * historical rows.
     */
    supabase
      .from("categories")
      .select("id,name,kind,icon,color,is_archived")
      .eq("user_id", viewer.id)
      .order("created_at"),
    periodFeedPromise,
    recentFeedPromise,
    // Join currency so insights totalBalance stays VND-only (no FX mix).
    supabase
      .from("account_balances")
      .select("account_id,balance_minor,currency_code")
      .eq("user_id", viewer.id),
    reviewFeedPromise,
    /*
     * Goal picker options — active plus archived (an archived goal stays
     * selectable on a row already tagged with it). A failed read degrades to
     * an empty list, which hides the picker instead of failing the workspace.
     */
    supabase
      .from("savings_goals")
      .select("id,name,is_archived")
      .eq("user_id", viewer.id)
      .order("created_at"),
  ]);

  if (
    accountsResult.error ||
    categoriesResult.error ||
    periodFeedResult.error ||
    recentFeedResult.error ||
    balancesResult.error
  ) {
    return {
      transactions: [],
      accounts: [],
      categories: [],
      metaCategories: [],
      goals: [],
      totalBalance: 0,
      today,
      dataError: "Chưa tải được dữ liệu tài chính. Hãy thử tải lại trang.",
      reviewFeatureAvailable: false,
    };
  }

  try {
    /*
     * Per-account balances ride along on AccountOption so the ledger can anchor
     * a running-balance column; rows that failed safe-integer parsing simply
     * stay absent, which hides the column instead of inventing an anchor.
     */
    const balanceByAccountId = new Map<string, number>();
    for (const item of balancesResult.data ?? []) {
      const amount = Number(item.balance_minor);
      if (Number.isSafeInteger(amount)) {
        balanceByAccountId.set(String(item.account_id), amount);
      }
    }
    const accounts = z
      .array(accountSchema)
      .parse(accountsResult.data)
      .map((item) => ({
        ...item,
        balance: balanceByAccountId.get(item.id),
      })) satisfies AccountOption[];
    const allCategories = z
      .array(categorySchema)
      .parse(categoriesResult.data);
    const categories = allCategories.filter(
      (item) => !item.is_archived,
    ) satisfies CategoryOption[];
    const metaCategories = allCategories.map(
      (item): CategoryOption => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        icon: item.icon,
        color: item.color,
      }),
    );
    const goals = goalsResult.error
      ? []
      : (z
          .array(goalOptionSchema)
          .parse(goalsResult.data)
          .map((row) => ({
            id: row.id,
            name: row.name,
            isArchived: row.is_archived,
          })) satisfies GoalOption[]);
    const reviewState = readReviewState(
      scope,
      reviewFeedResult.data,
      Boolean(reviewFeedResult.error),
    );
    const transactions = deduplicateTransactions(
      [...(periodFeedResult.data ?? []), ...(recentFeedResult.data ?? [])].map(
        mapTransactionFeedRow,
      ),
    ).map((transaction) => ({
      ...transaction,
      reviewStatus: reviewState.byId.get(transaction.id) ?? "reviewed",
    }));
    // Safe-to-spend / insights use VND only — FX accounts are display-only (TASK-129).
    const totalBalance = (balancesResult.data ?? []).reduce((sum, item) => {
      const code = String(item.currency_code ?? "VND").toUpperCase();
      if (code !== "VND") return sum;
      const amount = Number(item.balance_minor);
      if (!Number.isSafeInteger(amount)) {
        throw new Error("invalid_account_balance");
      }
      return sum + amount;
    }, 0);

    return {
      transactions,
      accounts,
      categories,
      metaCategories,
      goals,
      totalBalance,
      today,
      dataError: null,
      reviewFeatureAvailable: reviewState.available,
    };
  } catch {
    return {
      transactions: [],
      accounts: [],
      categories: [],
      metaCategories: [],
      goals: [],
      totalBalance: 0,
      today,
      dataError: "Dữ liệu tài chính không đúng định dạng. Hãy liên hệ hỗ trợ.",
      reviewFeatureAvailable: false,
    };
  }
}

/** Full ledger loader for the transaction-management surface. */
export async function getFinanceWorkspace(): Promise<FinanceWorkspace> {
  return loadFinanceWorkspace("full");
}

/** Bounded loader for dashboard calculations and recent activity. */
export async function getDashboardFinanceWorkspace(): Promise<FinanceWorkspace> {
  return loadFinanceWorkspace("dashboard");
}

export type DeletedTransactionsResult = {
  deleted: DeletedTransaction[];
  dataError: string | null;
};

/**
 * Trash surface loader: every soft-deleted row the viewer owns, newest-deleted
 * first. Demo keeps its tombstones on the device (see
 * `deleted-transactions.ts`), so the server returns an empty list and the
 * page hydrates from localStorage.
 */
export async function getDeletedTransactions(): Promise<DeletedTransactionsResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { deleted: [], dataError: null };

  const supabase = await createClient();
  if (!supabase) {
    return { deleted: [], dataError: "Không thể kết nối dữ liệu." };
  }

  const result = await readAllPages((from, to) =>
    supabase
      .from("deleted_transaction_feed")
      .select(DELETED_TRANSACTION_FEED_COLUMNS)
      .eq("user_id", viewer.id)
      .order("deleted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );

  if (result.error) {
    return {
      deleted: [],
      dataError: "Chưa tải được các giao dịch đã xóa. Hãy thử tải lại trang.",
    };
  }

  try {
    return {
      deleted: (result.data ?? []).map(mapDeletedTransactionFeedRow),
      dataError: null,
    };
  } catch {
    return {
      deleted: [],
      dataError: "Dữ liệu đã xóa không đúng định dạng. Hãy liên hệ hỗ trợ.",
    };
  }
}
