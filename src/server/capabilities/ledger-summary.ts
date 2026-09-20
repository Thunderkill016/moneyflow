import { z } from "zod";

import {
  buildFinancialReport,
  normalizeCustomRange,
  resolveReportRange,
  type ReportRange,
} from "../../lib/reports.ts";
import {
  buildBasis,
  buildSnapshotBasis,
  explainedAmount,
  transactionRange,
  validIsoDate,
} from "./basis.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
  FinanceWorkspace,
} from "./types.ts";
import {
  CapabilityError,
  explainedAmountSchema,
  ledgerTrustSummarySchema,
} from "./types.ts";

export const ledgerSummaryInputSchema = z.object({
  period: z.enum(["month", "week", "custom"]),
  from: z.string().optional(),
  to: z.string().optional(),
});

const reportRangeSchema = z.object({
  period: z.enum(["week", "month", "year", "custom"]),
  currentStart: z.string(),
  currentEnd: z.string(),
  previousStart: z.string(),
  previousEnd: z.string(),
});
const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currencyCode: z.string(),
});
export const ledgerSummaryOutputSchema = z.object({
  range: reportRangeSchema,
  totalBalance: explainedAmountSchema,
  income: explainedAmountSchema,
  expense: explainedAmountSchema,
  net: explainedAmountSchema,
  accounts: z.array(accountSchema),
  trust: ledgerTrustSummarySchema.nullable().describe(
    "Null until a standalone ledger-trust loader exists; follow-up.",
  ),
});

export type LedgerSummaryInput = z.infer<typeof ledgerSummaryInputSchema>;
export type LedgerSummaryOutput = z.infer<typeof ledgerSummaryOutputSchema>;

async function defaultLoadFinanceWorkspace(): Promise<FinanceWorkspace> {
  const { getFinanceWorkspace } = await import("../finance.ts");
  return getFinanceWorkspace();
}

function validateInput(input: LedgerSummaryInput, today: string) {
  if (input.period !== "custom") return;
  if (!input.from || !input.to || !validIsoDate(input.from) || !validIsoDate(input.to)) {
    throw new CapabilityError("invalid_input", "Custom range requires valid from and to dates");
  }
  if (!normalizeCustomRange({ from: input.from, to: input.to }, today)) {
    throw new CapabilityError("invalid_input", "Custom range is invalid");
  }
}

function rangeFor(input: LedgerSummaryInput, today: string): ReportRange {
  validateInput(input, today);
  return resolveReportRange(
    today,
    input.period,
    input.period === "custom" ? { from: input.from, to: input.to } : undefined,
  );
}

export async function run(
  ctx: CapabilityContext,
  input: LedgerSummaryInput,
  deps: CapabilityDeps = {},
): Promise<LedgerSummaryOutput> {
  const workspace = await (deps.loadFinanceWorkspace ?? defaultLoadFinanceWorkspace)();
  const range = rangeFor(input, ctx.today);
  const currentRange = {
    from: range.currentStart,
    to: range.currentEnd,
  };
  const current = transactionRange(workspace.transactions, currentRange);
  const report = buildFinancialReport(current, range);
  const income = current.filter((transaction) => transaction.kind === "income");
  const expense = current.filter((transaction) => transaction.kind === "expense");
  const computedAt = ctx.now;
  const capabilityVersion = "ledger.summary@1";
  const incomeBasis = buildBasis({
    formula: "sum(income.amount) within the current report range",
    range: currentRange,
    included: income,
    allTransactions: workspace.transactions,
    computedAt,
    capabilityVersion,
    targetKind: "income",
  });
  const expenseBasis = buildBasis({
    formula: "sum(expense.amount) within the current report range",
    range: currentRange,
    included: expense,
    allTransactions: workspace.transactions,
    computedAt,
    capabilityVersion,
    targetKind: "expense",
  });
  const netBasis = buildBasis({
    formula: "income total minus expense total within the current report range",
    range: currentRange,
    included: [...income, ...expense],
    allTransactions: workspace.transactions,
    computedAt,
    capabilityVersion,
  });
  const balanceBasis = buildSnapshotBasis({
    formula: "sum of active account balances (workspace snapshot); not derived from listed transactions",
    computedAt,
    capabilityVersion,
  });

  return {
    range,
    totalBalance: explainedAmount(workspace.totalBalance, balanceBasis),
    income: explainedAmount(report.totals.income, incomeBasis),
    expense: explainedAmount(report.totals.expense, expenseBasis),
    net: explainedAmount(report.totals.net, netBasis),
    accounts: workspace.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currencyCode: account.currencyCode ?? "VND",
    })),
    trust: null,
  };
}

export const definition: CapabilityDefinition<
  LedgerSummaryInput,
  LedgerSummaryOutput
> = {
  id: "ledger.summary",
  version: "1",
  title: "Tóm tắt sổ cái / Ledger summary",
  description: "Tóm tắt số dư và dòng tiền theo kỳ / Deterministic ledger totals for a selected period.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: ledgerSummaryInputSchema,
  output: ledgerSummaryOutputSchema,
  run,
};
