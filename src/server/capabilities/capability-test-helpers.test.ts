import { buildFinancialReport, resolveReportRange } from "../../../src/lib/reports.ts";
import type { LedgerTrustSummary } from "../../../src/lib/ledger-trust.ts";
import {
  demoAccounts,
  demoCategories,
  sampleTransactionsFor,
} from "../../../src/lib/demo/transaction-fixtures.ts";
import type { Transaction } from "../../../src/lib/transactions/contracts.ts";
import type {
  AccountsWorkspace,
  BudgetsWorkspace,
  CapabilityContext,
  CapabilityDeps,
  FinanceWorkspace,
  GoalsWorkspace,
  InboxListResult,
  ReportsWorkspace,
} from "./types.ts";

export const FIXED_CONTEXT: CapabilityContext = {
  viewerId: "demo-user",
  clientId: null,
  today: "2026-07-14",
  now: "2026-07-14T12:00:00.000Z",
};

export function demoTransactions(withTransfer = true): Transaction[] {
  const transactions = sampleTransactionsFor(FIXED_CONTEXT.today);
  if (!withTransfer) return transactions;
  return [
    ...transactions,
    {
      id: "sample-transfer",
      kind: "transfer",
      categoryId: "",
      category: "Chuyển tiền",
      note: "Chuyển sang Tiền mặt",
      accountId: "demo-account-mb",
      account: "MB Bank",
      destinationAccountId: "demo-account-cash",
      destinationAccount: "Tiền mặt",
      amount: 500_000,
      occurredOn: "2026-07-13",
      occurredAt: "2026-07-13T03:00:00.000Z",
      relativeDate: "13 thg 7",
    },
  ];
}

export function fixtureWorkspace(
  transactions = demoTransactions(),
): FinanceWorkspace {
  return {
    transactions,
    accounts: demoAccounts,
    categories: demoCategories,
    goals: [],
    totalBalance: 15_735_000,
    today: FIXED_CONTEXT.today,
    dataError: null,
  };
}

export function fixtureLedgerTrust(): LedgerTrustSummary {
  return {
    trustedThrough: "2026-07-10",
    baseReconciliationThrough: "2026-06-30",
    status: "trusted_limited",
    reason: "known_unresolved_work",
    activeAccountCount: 4,
    cleanReconciledAccountCount: 3,
    pendingInboxCount: 2,
    needsReviewTransactionCount: 1,
    unreconciledAccountLegCount: 1,
    earliestUnresolvedOn: "2026-07-12",
    coverageScope: "known_ledger_state_only",
  };
}

export function fixtureAccountsWorkspace(): AccountsWorkspace {
  return {
    accounts: [
      {
        id: "acc-mb",
        name: "MB Bank",
        kind: "bank",
        currencyCode: "VND",
        initialBalance: 1_000_000,
        balance: 15_454_000,
        isArchived: false,
      },
      {
        id: "acc-cash",
        name: "Tiền mặt",
        kind: "cash",
        currencyCode: "VND",
        initialBalance: 0,
        balance: 239_000,
        isArchived: false,
      },
      {
        id: "acc-old",
        name: "Ví cũ",
        kind: "e_wallet",
        currencyCode: "VND",
        initialBalance: 0,
        balance: 0,
        isArchived: true,
      },
    ],
    dataError: null,
  };
}

export function fixtureBudgetsWorkspace(): BudgetsWorkspace {
  return {
    budgets: [
      {
        id: "bud-food",
        categoryId: "cat-food",
        categoryName: "Ăn uống",
        categoryIcon: null,
        categoryColor: null,
        monthStart: "2026-07-01",
        limit: 4_000_000,
        spent: 2_760_000,
      },
    ],
    previousBudgets: [],
    priorBudgets: [],
    categories: [],
    monthStart: "2026-07-01",
    monthEnd: "2026-07-31",
    previousMonthStart: "2026-06-01",
    nextMonthStart: "2026-08-01",
    canGoNext: false,
    today: "2026-07-15",
    adjustment: null,
    monthIncome: 12_000_000,
    monthExpense: 8_400_000,
    monthCommitments: [],
    dataError: null,
  };
}

export function fixtureGoalsWorkspace(): GoalsWorkspace {
  return {
    goals: [
      {
        id: "goal-emergency",
        name: "Quỹ khẩn cấp",
        target: 6_000_000,
        allocated: 2_400_000,
        deadline: "2026-09-30",
        createdAt: null,
        isArchived: false,
      },
      {
        id: "goal-done",
        name: "Mục tiêu cũ",
        target: 1_000_000,
        allocated: 1_000_000,
        deadline: null,
        createdAt: null,
        isArchived: true,
      },
    ],
    allocations: null,
    today: FIXED_CONTEXT.today,
    allocatedTotal: 3_400_000,
    plannedDaily: 20_000,
    reserve: {
      balance: 15_693_000,
      protectedForBills: 2_000_000,
      spendableAfterBills: 13_693_000,
      reservedForGoals: 3_400_000,
      unreserved: 10_293_000,
    },
    relatedCounts: null,
    dataError: null,
  };
}

export function fixtureInboxList(): InboxListResult {
  return {
    ok: true,
    batches: [],
    candidates: [
      {
        id: "cand-1",
        kind: "expense",
        amount: 45_000,
        merchant: "Highlands Coffee",
        note: "Cafe sáng",
        occurredOn: "2026-07-14",
        source: "agent",
        confidence: "medium",
        status: "pending",
        possibleDuplicate: false,
        createdAt: "2026-07-14T12:00:00.000Z",
      },
      {
        id: "cand-2",
        kind: "income",
        amount: 25_000_000,
        merchant: "LUONG CT",
        note: "",
        occurredOn: "2026-07-12",
        source: "csv",
        confidence: "high",
        status: "approved",
        createdAt: "2026-07-12T03:00:00.000Z",
      },
    ],
  };
}

export function fixtureDeps(
  transactions = demoTransactions(),
  ledgerTrust: LedgerTrustSummary | null = fixtureLedgerTrust(),
): CapabilityDeps {
  const workspace = fixtureWorkspace(transactions);
  return {
    loadFinanceWorkspace: async () => workspace,
    loadReportsWorkspace: async (period, custom): Promise<ReportsWorkspace> => {
      const range = resolveReportRange(FIXED_CONTEXT.today, period, custom);
      return {
        report: buildFinancialReport(transactions, range),
        transactions,
        todayIso: FIXED_CONTEXT.today,
        balanceSeries: null,
        dataError: null,
        rangeNotice: null,
      };
    },
    loadLedgerTrust: async () => ledgerTrust,
  };
}
