import { z } from "zod";

export const BudgetConfigSchema = z.object({
  monthlyIncomeTarget: z.number().finite().nonnegative(),
  fixedCommitments: z.number().finite().nonnegative(),
  monthlySpendingCap: z.number().finite().nonnegative(),
  targetSavingsRate: z.number().finite().min(0).max(1),
  categoryLimits: z.record(z.string(), z.number().finite().nonnegative()),
  updatedAt: z.number().int().nonnegative(),
});

export interface BudgetConfig {
  monthlyIncomeTarget: number;
  fixedCommitments: number;
  monthlySpendingCap: number;
  /** Target fraction of monthly income saved or invested (e.g. 0.25 = 25%). */
  targetSavingsRate: number;
  categoryLimits: Record<string, number>;
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
  updatedAt: 0,
};
