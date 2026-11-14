import { z } from "zod";

export const CommitmentItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  amountVnd: z.number().int().nonnegative(),
  dueDay: z.number().int().min(1).max(31).default(1),
  isPaid: z.boolean().default(false),
});

export interface CommitmentItem {
  id: string;
  name: string;
  amountVnd: number;
  dueDay: number;
  isPaid: boolean;
}

export const BudgetConfigSchema = z.object({
  monthlyIncomeTarget: z.number().finite().nonnegative(),
  fixedCommitments: z.number().finite().nonnegative(),
  monthlySpendingCap: z.number().finite().nonnegative(),
  targetSavingsRate: z.number().finite().min(0).max(1),
  categoryLimits: z.record(z.string(), z.number().finite().nonnegative()),
  commitments: z.array(CommitmentItemSchema).optional(),
  activeEventName: z.string().trim().max(60).nullable().optional(),
  activeEventBudgetVnd: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export interface BudgetConfig {
  monthlyIncomeTarget: number;
  fixedCommitments: number;
  monthlySpendingCap: number;
  /** Target fraction of monthly income saved or invested (e.g. 0.25 = 25%). */
  targetSavingsRate: number;
  categoryLimits: Record<string, number>;
  commitments?: CommitmentItem[];
  activeEventName?: string | null;
  activeEventBudgetVnd?: number;
  updatedAt: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  monthlyIncomeTarget: 28_000_000,
  fixedCommitments: 6_500_000,
  monthlySpendingCap: 15_000_000,
  targetSavingsRate: 0.25,
  categoryLimits: {
    "an-uong": 5_000_000,
    "di-chuyen": 1_800_000,
    "mua-sam": 2_500_000,
    "hoa-don": 4_500_000,
    "giai-tri": 1_500_000,
    "suc-khoe": 1_200_000,
  },
  commitments: [],
  activeEventName: null,
  activeEventBudgetVnd: 0,
  updatedAt: 0,
};
