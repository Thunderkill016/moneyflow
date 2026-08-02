import "server-only";

import { z } from "zod";
import {
  DASHBOARD_RECENT_TRANSACTION_LIMIT,
  dashboardTransactionStart,
} from "@/lib/dashboard-transaction-window";
import type { BudgetSummary } from "@/lib/planning/budgets";
import type { RecurringCommitment } from "@/lib/planning/commitments";
import type { SavingsGoal } from "@/lib/planning/goals";
import type { RecurringIncomeTemplate } from "@/lib/planning/income-templates";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountOption,
  CategoryOption,
} from "@/lib/transactions/contracts";
import { todayInVietnam } from "@/lib/vietnam-date";
import type { Viewer } from "@/server/auth";
import {
  getBudgetsWorkspace,
  mapBudgetRow,
} from "@/server/budgets";
import {
  getCommitmentsWorkspace,
  mapCommitmentRow,
} from "@/server/commitments";
import {
  type FinanceWorkspace,
  getDashboardFinanceWorkspace,
  mapTransactionFeedRow,
} from "@/server/finance";
import { getGoalsWorkspace, mapGoalRow } from "@/server/goals";
import {
  getIncomeTemplatesWorkspace,
  mapIncomeTemplateRow,
} from "@/server/income-templates";

export type DashboardPageWorkspace = {
  workspace: FinanceWorkspace;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  incomeTemplates: RecurringIncomeTemplate[];
  goals: SavingsGoal[];
  pendingInboxCount: number;
};

const accountSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    currency_code: z.string().length(3),
  })
  .transform(
    (row): AccountOption => ({
      id: row.id,
      name: row.name,
      currencyCode: row.currency_code,
    }),
  );

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(["income", "expense"]),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

const balanceSchema = z.object({
  account_id: z.string().uuid(),
  balance_minor: z.union([z.number(), z.string()]),
  currency_code: z.string().length(3),
});

const commitmentOccurrenceSchema = z.object({
  commitment_id: z.string().uuid(),
  transaction_id: z.string().uuid(),
});

const incomeOccurrenceSchema = z.object({
  template_id: z.string().uuid(),
  transaction_id: z.string().uuid(),
});

const dashboardBundleSchema = z.object({
  transactions: z.array(z.unknown()),
  accounts: z.array(accountSchema),
  categories: z.array(categorySchema),
  balances: z.array(balanceSchema),
  budgets: z.array(z.unknown()),
  commitments: z.array(z.unknown()),
  commitment_occurrences: z.array(commitmentOccurrenceSchema),
  income_templates: z.array(z.unknown()),
  income_occurrences: z.array(incomeOccurrenceSchema),
  goals: z.array(z.unknown()),
  pending_inbox_count: z.union([z.number(), z.string()]),
});

function emptyDashboard(today: string, message: string): DashboardPageWorkspace {
  return {
    workspace: {
      transactions: [],
      accounts: [],
      categories: [],
      totalBalance: 0,
      today,
      dataError: message,
    },
    budgets: [],
    commitments: [],
    incomeTemplates: [],
    goals: [],
    pendingInboxCount: 0,
  };
}

function mergeDataErrors(errors: Array<string | null | undefined>) {
  return errors.find((error): error is string => Boolean(error)) ?? null;
}

async function getDemoDashboardWorkspace(): Promise<DashboardPageWorkspace> {
  const [
    workspace,
    budgetWorkspace,
    commitmentWorkspace,
    incomeWorkspace,
    goalWorkspace,
  ] = await Promise.all([
    getDashboardFinanceWorkspace(),
    getBudgetsWorkspace(),
    getCommitmentsWorkspace(),
    getIncomeTemplatesWorkspace(),
    getGoalsWorkspace(),
  ]);

  return {
    workspace: {
      ...workspace,
      dataError: mergeDataErrors([
        workspace.dataError,
        budgetWorkspace.dataError,
        commitmentWorkspace.dataError,
        incomeWorkspace.dataError,
        goalWorkspace.dataError,
      ]),
    },
    budgets: budgetWorkspace.budgets,
    commitments: commitmentWorkspace.commitments,
    incomeTemplates: incomeWorkspace.templates,
    goals: goalWorkspace.goals,
    pendingInboxCount: 0,
  };
}

function safeInteger(value: number | string, errorCode: string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error(errorCode);
  return amount;
}

function mapAuthenticatedBundle(
  value: unknown,
  today: string,
): DashboardPageWorkspace {
  const bundle = dashboardBundleSchema.parse(value);
  const monthStart = `${today.slice(0, 7)}-01`;

  const commitmentPayments = new Map(
    bundle.commitment_occurrences.map((item) => [
      item.commitment_id,
      item.transaction_id,
    ]),
  );
  const incomeReceipts = new Map(
    bundle.income_occurrences.map((item) => [
      item.template_id,
      item.transaction_id,
    ]),
  );

  const totalBalance = bundle.balances.reduce((sum, row) => {
    if (row.currency_code.toUpperCase() !== "VND") return sum;
    return sum + safeInteger(row.balance_minor, "invalid_dashboard_balance");
  }, 0);
  if (!Number.isSafeInteger(totalBalance)) {
    throw new Error("invalid_dashboard_total_balance");
  }

  const pendingInboxCount = safeInteger(
    bundle.pending_inbox_count,
    "invalid_dashboard_inbox_count",
  );
  if (pendingInboxCount < 0) {
    throw new Error("invalid_dashboard_inbox_count");
  }

  return {
    workspace: {
      transactions: bundle.transactions.map(mapTransactionFeedRow),
      accounts: bundle.accounts,
      categories: bundle.categories satisfies CategoryOption[],
      totalBalance,
      today,
      dataError: null,
    },
    budgets: bundle.budgets.map(mapBudgetRow),
    commitments: bundle.commitments.map((row) => {
      const parsed = z.object({ id: z.string().uuid() }).parse(row);
      return mapCommitmentRow(
        row,
        monthStart,
        commitmentPayments.get(parsed.id) ?? null,
      );
    }),
    incomeTemplates: bundle.income_templates.map((row) => {
      const parsed = z.object({ id: z.string().uuid() }).parse(row);
      return mapIncomeTemplateRow(
        row,
        monthStart,
        incomeReceipts.get(parsed.id) ?? null,
      );
    }),
    goals: bundle.goals.map(mapGoalRow),
    pendingInboxCount,
  };
}

/**
 * Page-specific dashboard read model.
 *
 * Authenticated mode deliberately performs one bounded Data API call. Feature
 * routes keep their existing focused workspace loaders; this bundle is not a
 * new global repository or a cache for private financial data.
 */
export async function getDashboardPageWorkspace(
  viewer: Viewer,
): Promise<DashboardPageWorkspace> {
  if (viewer.isDemo) return getDemoDashboardWorkspace();

  const today = todayInVietnam();
  const supabase = await createClient();
  if (!supabase) {
    return emptyDashboard(today, "Không thể kết nối dữ liệu tổng quan.");
  }

  const { data, error } = await supabase.rpc("get_dashboard_bundle", {
    p_today: today,
    p_transaction_start: dashboardTransactionStart(today),
    p_recent_limit: DASHBOARD_RECENT_TRANSACTION_LIMIT,
  });

  if (error || data == null) {
    return emptyDashboard(
      today,
      "Chưa tải được dữ liệu tổng quan. Hãy thử tải lại trang.",
    );
  }

  try {
    return mapAuthenticatedBundle(data, today);
  } catch {
    return emptyDashboard(
      today,
      "Dữ liệu tổng quan không đúng định dạng. Hãy liên hệ hỗ trợ.",
    );
  }
}
