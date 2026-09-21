import { z } from "zod";

import { minor } from "../../lib/minor.ts";
import { buildSnapshotBasis, explainedAmount } from "./basis.ts";
import type { GoalsWorkspace } from "../goals.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
} from "./types.ts";
import { CapabilityError, explainedAmountSchema } from "./types.ts";

export const goalsStatusInputSchema = z.object({});

const reserveSchema = z.object({
  /** Sum of account balances. */
  balance: explainedAmountSchema,
  /** Unpaid recurring obligations for the current month. */
  protectedForBills: explainedAmountSchema,
  /** balance − protectedForBills, clamped at zero by the domain. */
  spendableAfterBills: explainedAmountSchema,
  /** Already promised to savings goals. */
  reservedForGoals: explainedAmountSchema,
  /** Free remainder; may be negative when balances dropped after funding. */
  unreserved: explainedAmountSchema,
});

export const goalsStatusOutputSchema = z.object({
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      target: explainedAmountSchema,
      allocated: explainedAmountSchema,
      /** target − allocated; zero means fully funded. */
      remaining: explainedAmountSchema,
      deadline: z.string().nullable(),
      isArchived: z.boolean(),
    }),
  ),
  allocatedTotal: explainedAmountSchema,
  plannedDaily: explainedAmountSchema,
  /**
   * Reserve arithmetic, null when the loader could not derive it — withheld
   * rather than guessed, matching the goals screen.
   */
  reserve: reserveSchema.nullable(),
});

export type GoalsStatusInput = z.infer<typeof goalsStatusInputSchema>;
export type GoalsStatusOutput = z.infer<typeof goalsStatusOutputSchema>;

async function defaultLoad(): Promise<GoalsWorkspace> {
  const { getGoalsWorkspace } = await import("../goals.ts");
  return getGoalsWorkspace();
}

export async function run(
  ctx: CapabilityContext,
  _input: GoalsStatusInput,
  deps: CapabilityDeps = {},
): Promise<GoalsStatusOutput> {
  const workspace = await (deps.loadGoalsWorkspace ?? defaultLoad)();
  if (workspace.dataError) {
    throw new CapabilityError("internal", workspace.dataError);
  }

  const basis = buildSnapshotBasis({
    formula:
      "savings_goals + reserve workspace snapshot; remaining = target − allocated",
    computedAt: ctx.now,
    capabilityVersion: "goals.status@1",
  });
  const amount = (value: number) => explainedAmount(minor(value), basis);

  return {
    goals: workspace.goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      target: amount(goal.target),
      allocated: amount(goal.allocated),
      remaining: amount(goal.target - goal.allocated),
      deadline: goal.deadline,
      isArchived: goal.isArchived,
    })),
    allocatedTotal: amount(workspace.allocatedTotal),
    plannedDaily: amount(workspace.plannedDaily),
    reserve: workspace.reserve
      ? {
          balance: amount(workspace.reserve.balance),
          protectedForBills: amount(workspace.reserve.protectedForBills),
          spendableAfterBills: amount(workspace.reserve.spendableAfterBills),
          reservedForGoals: amount(workspace.reserve.reservedForGoals),
          unreserved: amount(workspace.reserve.unreserved),
        }
      : null,
  };
}

export const definition: CapabilityDefinition<
  GoalsStatusInput,
  GoalsStatusOutput
> = {
  id: "goals.status",
  version: "1",
  title: "Tình trạng mục tiêu / Goals status",
  description:
    "Mục tiêu tiết kiệm và dự trữ còn lại / Savings goals progress and the reserve picture.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: goalsStatusInputSchema,
  output: goalsStatusOutputSchema,
  run,
};
