import { buildFinancialReport, resolveReportRange } from "../../../src/lib/reports.ts";
import type { LedgerTrustSummary } from "../../../src/lib/ledger-trust.ts";
import {
  demoAccounts,
  demoCategories,
  sampleTransactionsFor,
} from "../../../src/lib/demo/transaction-fixtures.ts";
import type { Transaction } from "../../../src/lib/transactions/contracts.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  FinanceWorkspace,
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
        dataError: null,
        rangeNotice: null,
      };
    },
    loadLedgerTrust: async () => ledgerTrust,
  };
}
