import "server-only";

import { z } from "zod";
import {
  DASHBOARD_RECENT_TRANSACTION_LIMIT,
  dashboardTransactionStart,
} from "@/lib/dashboard-transaction-window";
import type { BackupReminderState } from "@/lib/attention";
import type { AccountBalanceRow } from "@/lib/dashboard-accounts";
import type { LedgerTrustSummary } from "@/lib/ledger-trust";
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
import {
  demoAccountRows,
  getAccountsWorkspace,
} from "@/server/accounts";
import { getGoalsWorkspace, mapGoalRow } from "@/server/goals";
import { getPendingInboxCountFromServer } from "@/server/inbox";
import {
  getIncomeTemplatesWorkspace,
  mapIncomeTemplateRow,
} from "@/server/income-templates";
import { ledgerTrustSchema, mapLedgerTrust } from "@/server/ledger-trust";

export type DashboardPageWorkspace = {
  workspace: FinanceWorkspace;
  /** Per-account balances for the statement strip; empty when unavailable. */
  accountBalances: AccountBalanceRow[];
  /**
   * Backup recency for the reminder chip; null in demo, on error paths and
   * during deploy skew (older bundle without `backup_state`).
   */
  backupState: BackupReminderState;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  incomeTemplates: RecurringIncomeTemplate[];
  goals: SavingsGoal[];
  pendingInboxCount: number;
  ledgerTrust: LedgerTrustSummary | null;
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
  // Optional by design: application code can safely deploy before the additive
  // bundle migration. In that skew state Home keeps the real ledger visible and
  // simply withholds the trust surface rather than fabricating a value.
  ledger_trust: ledgerTrustSchema.nullish(),
  // Same skew contract as ledger_trust: emitted as `::date` strings by the
  // bundle, absent before the backup-reminder migration lands.
  backup_state: z
    .object({
      last_backup_at: z.string().nullable(),
      created_at: z.string(),
    })
    .nullish(),
});

function emptyDashboard(today: string, message: string): DashboardPageWorkspace {
  return {
    workspace: {
      transactions: [],
      accounts: [],
      categories: [],
      goals: [],
      totalBalance: 0,
      today,
      dataError: message,
    },
    accountBalances: [],
    backupState: null,
    budgets: [],
    commitments: [],
    incomeTemplates: [],
    goals: [],
    pendingInboxCount: 0,
    ledgerTrust: null,
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
    accountBalances: demoAccountRows
      .filter((account) => !account.isArchived)
      .map((account) => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
        currencyCode: account.currencyCode,
      })),
    budgets: budgetWorkspace.budgets,
    commitments: commitmentWorkspace.commitments,
    incomeTemplates: incomeWorkspace.templates,
    goals: goalWorkspace.goals,
    pendingInboxCount: 0,
    // Demo data is browser-local and has no authenticated reconciliation truth.
    ledgerTrust: null,
    // Demo has no backup feature, so the reminder has nothing honest to say.
    backupState: null,
  };
}

/**
 * Backward-compatible authenticated read path used only when the bundled RPC
 * is unavailable or returns an invalid payload. This preserves real ledger
 * data during migration/deployment skew instead of rendering a false empty
 * dashboard. The normal healthy path remains one bounded RPC.
 *
 * Trust is deliberately null here: adding a second RPC to the fallback would
 * weaken the one-call performance contract, while synthesizing trust from the
 * focused loaders would duplicate the database's authoritative semantics.
 */
async function getAuthenticatedDashboardFallback(): Promise<DashboardPageWorkspace> {
  const [
    workspace,
    budgetWorkspace,
    commitmentWorkspace,
    incomeWorkspace,
    goalWorkspace,
    pendingInboxCount,
    accountsWorkspace,
  ] = await Promise.all([
    getDashboardFinanceWorkspace(),
    getBudgetsWorkspace(),
    getCommitmentsWorkspace(),
    getIncomeTemplatesWorkspace(),
    getGoalsWorkspace(),
    getPendingInboxCountFromServer(),
    getAccountsWorkspace(),
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
    accountBalances: accountsWorkspace.accounts
      .filter((account) => !account.isArchived)
      .map((account) => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
        currencyCode: account.currencyCode,
      })),
    budgets: budgetWorkspace.budgets,
    commitments: commitmentWorkspace.commitments,
    incomeTemplates: incomeWorkspace.templates,
    goals: goalWorkspace.goals,
    pendingInboxCount: pendingInboxCount ?? 0,
    ledgerTrust: null,
    // Same withhold-over-fabricate rule as ledgerTrust: the fallback runs when
    // the bundle is unavailable, so backup state is simply unknown here.
    backupState: null,
  };
}

function safeInteger(value: number | string, errorCode: string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error(errorCode);
  return amount;
}

function safeCount(value: number | string, errorCode: string) {
  const count = safeInteger(value, errorCode);
  if (count < 0) throw new Error(errorCode);
  return count;
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

  const balanceByAccount = new Map(
    bundle.balances.map((row) => [row.account_id, row]),
  );
  // Only emit accounts the balances array actually covers: an account missing
  // from the RPC's balance projection gets no fabricated zero.
  const accountBalances: AccountBalanceRow[] = bundle.accounts.flatMap(
    (account) => {
      const row = balanceByAccount.get(account.id);
      if (!row) return [];
      return [
        {
          id: account.id,
          name: account.name,
          balance: safeInteger(
            row.balance_minor,
            "invalid_dashboard_balance",
          ),
          currencyCode: row.currency_code,
        },
      ];
    },
  );

  const pendingInboxCount = safeCount(
    bundle.pending_inbox_count,
    "invalid_dashboard_inbox_count",
  );

  const goals = bundle.goals.map(mapGoalRow);

  return {
    workspace: {
      transactions: bundle.transactions.map(mapTransactionFeedRow),
      accounts: bundle.accounts,
      categories: bundle.categories satisfies CategoryOption[],
      goals,
      totalBalance,
      today,
      dataError: null,
    },
    accountBalances,
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
    goals,
    pendingInboxCount,
    ledgerTrust: mapLedgerTrust(bundle.ledger_trust),
    backupState: bundle.backup_state
      ? {
          lastBackupAt: bundle.backup_state.last_backup_at,
          accountCreatedAt: bundle.backup_state.created_at,
        }
      : null,
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
    console.error("dashboard_bundle_unavailable", {
      code: error?.code ?? "missing_data",
    });
    return getAuthenticatedDashboardFallback();
  }

  try {
    return mapAuthenticatedBundle(data, today);
  } catch (error) {
    console.error("dashboard_bundle_invalid_response", {
      name: error instanceof Error ? error.name : "unknown_error",
    });
    return getAuthenticatedDashboardFallback();
  }
}
