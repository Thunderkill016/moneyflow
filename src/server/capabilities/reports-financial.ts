import { z } from "zod";

import {
  buildFinancialReport,
  normalizeCustomRange,
  resolveReportRange,
  type FinancialReport,
} from "../../lib/reports.ts";
import { minorSchema, minor } from "../../lib/minor.ts";
import { buildBasis, explainedAmount, transactionRange, validIsoDate } from "./basis.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
  ReportsWorkspace,
} from "./types.ts";
import {
  CapabilityError,
  explainedAmountSchema,
} from "./types.ts";

export const reportsFinancialInputSchema = z.object({
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
const explainedCategorySchema = z.object({
  name: z.string(),
  amount: explainedAmountSchema,
  share: z.number().int(),
  trend: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      amount: minorSchema,
    }),
  ),
});
const reportOutputSchema = z.object({
  range: reportRangeSchema,
  totals: z.object({
    income: explainedAmountSchema,
    expense: explainedAmountSchema,
    net: explainedAmountSchema,
    transactions: z.number().int(),
  }),
  previous: z.object({
    income: minorSchema,
    expense: minorSchema,
    net: minorSchema,
  }),
  expenseChangePercent: z.number().int().nullable(),
  categories: z.array(explainedCategorySchema),
  accounts: z.array(z.object({ name: z.string(), amount: minorSchema, share: z.number().int() })),
  trend: z.array(z.object({
    key: z.string(),
    label: z.string(),
    income: minorSchema,
    expense: minorSchema,
  })),
});

export type ReportsFinancialInput = z.infer<typeof reportsFinancialInputSchema>;
export type ReportsFinancialOutput = z.infer<typeof reportOutputSchema>;

async function defaultLoadReportsWorkspace(
  period: ReportsFinancialInput["period"],
  custom?: { from?: string; to?: string },
): Promise<ReportsWorkspace> {
  const { getReportsWorkspace } = await import("../reports.ts");
  return getReportsWorkspace(period, custom);
}

function validateInput(input: ReportsFinancialInput, today: string) {
  if (input.period !== "custom") return;
  if (!input.from || !input.to || !validIsoDate(input.from) || !validIsoDate(input.to)) {
    throw new CapabilityError("invalid_input", "Custom range requires valid from and to dates");
  }
  if (!normalizeCustomRange({ from: input.from, to: input.to }, today)) {
    throw new CapabilityError("invalid_input", "Custom range is invalid");
  }
}

function currentRange(input: ReportsFinancialInput, today: string) {
  validateInput(input, today);
  const range = resolveReportRange(
    today,
    input.period,
    input.period === "custom" ? { from: input.from, to: input.to } : undefined,
  );
  return { report: range, current: { from: range.currentStart, to: range.currentEnd } };
}

function explainedReport(
  report: FinancialReport,
  transactions: ReportsWorkspace["transactions"],
  ctx: CapabilityContext,
) {
  const range = { from: report.range.currentStart, to: report.range.currentEnd };
  const current = transactionRange(transactions, range);
  const income = current.filter((transaction) => transaction.kind === "income");
  const expense = current.filter((transaction) => transaction.kind === "expense");
  const base = {
    computedAt: ctx.now,
    capabilityVersion: "reports.financial@1",
  };
  const basis = (formula: string, selected: typeof current, targetKind?: "income" | "expense") =>
    buildBasis({
      formula,
      range,
      included: selected,
      allTransactions: transactions,
      ...base,
      targetKind,
    });

  /*
   * Project the declared contract field-by-field instead of spreading
   * `...report`: page-facing additions like `payees` must not leak into the
   * capability output ahead of a schema/version decision — the zod layer would
   * strip them anyway, which is exactly the kind of silent divergence this
   * golden exists to catch.
   */
  return {
    range: report.range,
    expenseChangePercent: report.expenseChangePercent,
    totals: {
      ...report.totals,
      income: explainedAmount(report.totals.income, basis("sum(income.amount) within the current report range", income, "income")),
      expense: explainedAmount(report.totals.expense, basis("sum(expense.amount) within the current report range", expense, "expense")),
      net: explainedAmount(report.totals.net, basis("income total minus expense total within the current report range", [...income, ...expense])),
    },
    previous: {
      income: minor(report.previous.income),
      expense: minor(report.previous.expense),
      net: minor(report.previous.net),
    },
    accounts: report.accounts.map((account) => ({
      ...account,
      amount: minor(account.amount),
    })),
    trend: report.trend.map((point) => ({
      ...point,
      income: minor(point.income),
      expense: minor(point.expense),
    })),
    categories: report.categories.map((category) => {
      const categoryTransactions = expense.filter((transaction) =>
        transaction.category === category.name ||
        Boolean(transaction.splits?.some((line) => line.category === category.name)),
      );
      return {
        ...category,
        amount: explainedAmount(
          category.amount,
          basis(`sum(expense category "${category.name}")`, categoryTransactions, "expense"),
        ),
        trend: category.trend.map((month) => ({
          ...month,
          amount: minor(month.amount),
        })),
      };
    }),
  };
}

export async function run(
  ctx: CapabilityContext,
  input: ReportsFinancialInput,
  deps: CapabilityDeps = {},
): Promise<ReportsFinancialOutput> {
  const { report: range } = currentRange(input, ctx.today);
  const workspace = await (
    deps.loadReportsWorkspace ?? defaultLoadReportsWorkspace
  )(
    input.period,
    input.period === "custom" ? { from: input.from, to: input.to } : undefined,
  );
  const report = buildFinancialReport(workspace.transactions, range);
  return explainedReport(report, workspace.transactions, ctx);
}

export const definition: CapabilityDefinition<
  ReportsFinancialInput,
  ReportsFinancialOutput
> = {
  id: "reports.financial",
  version: "1",
  title: "Báo cáo tài chính / Financial report",
  description: "Báo cáo thu chi có căn cứ / Financial reporting with explainable source rows.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: reportsFinancialInputSchema,
  output: reportOutputSchema,
  run,
};
