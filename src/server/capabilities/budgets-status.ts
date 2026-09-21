import { z } from "zod";

import { minor } from "../../lib/minor.ts";
import { buildSnapshotBasis, explainedAmount } from "./basis.ts";
import type { BudgetsWorkspace } from "../budgets.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
} from "./types.ts";
import { CapabilityError, explainedAmountSchema } from "./types.ts";

export const budgetsStatusInputSchema = z.object({
  /** Budget month as YYYY-MM; defaults to the current Vietnam month. */
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM")
    .optional(),
});

export const budgetsStatusOutputSchema = z.object({
  monthStart: z.string(),
  monthEnd: z.string(),
  monthIncome: explainedAmountSchema,
  budgets: z.array(
    z.object({
      id: z.string(),
      categoryId: z.string(),
      categoryName: z.string(),
      limit: explainedAmountSchema,
      spent: explainedAmountSchema,
      /** limit − spent; negative means overspent. */
      remaining: explainedAmountSchema,
    }),
  ),
});

export type BudgetsStatusInput = z.input<typeof budgetsStatusInputSchema>;
export type BudgetsStatusOutput = z.infer<typeof budgetsStatusOutputSchema>;

async function defaultLoad(month?: string | null): Promise<BudgetsWorkspace> {
  const { getBudgetsWorkspace } = await import("../budgets.ts");
  return getBudgetsWorkspace(month);
}

export async function run(
  ctx: CapabilityContext,
  input: BudgetsStatusInput,
  deps: CapabilityDeps = {},
): Promise<BudgetsStatusOutput> {
  const workspace = await (deps.loadBudgetsWorkspace ?? defaultLoad)(
    input.month ?? null,
  );
  if (workspace.dataError) {
    throw new CapabilityError("internal", workspace.dataError);
  }

  const basis = buildSnapshotBasis({
    formula:
      "budget_progress workspace snapshot for the selected month; remaining = limit − spent",
    computedAt: ctx.now,
    capabilityVersion: "budgets.status@1",
  });

  return {
    monthStart: workspace.monthStart,
    monthEnd: workspace.monthEnd,
    monthIncome: explainedAmount(workspace.monthIncome, basis),
    budgets: workspace.budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      limit: explainedAmount(budget.limit, basis),
      spent: explainedAmount(budget.spent, basis),
      remaining: explainedAmount(minor(budget.limit - budget.spent), basis),
    })),
  };
}

export const definition: CapabilityDefinition<
  BudgetsStatusInput,
  BudgetsStatusOutput
> = {
  id: "budgets.status",
  version: "1",
  title: "Tình trạng ngân sách / Budget status",
  description:
    "Hạn mức và đã chi theo danh mục cho một tháng / Per-category budget limits and spending for a month.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: budgetsStatusInputSchema,
  output: budgetsStatusOutputSchema,
  run,
};
