import type { Account } from "../schema/account.schema.ts";
import type { BudgetConfig } from "../schema/budget.schema.ts";
import {
  getCategoryById,
  type Transaction,
} from "../schema/transaction.schema.ts";
import { computeAccountBalances, computeNetWorthSummary } from "./ledger.engine.ts";

export interface CategorySpendItem {
  categoryId: string;
  label: string;
  shortLabel: string;
  color: string;
  amount: number;
  sharePct: number;
  budgetLimit: number | null;
  usagePct: number | null;
  isOverBudget: boolean;
}

export interface DailySpendCell {
  day: number;
  amount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface MonthlyCashflowSummary {
  monthKey: string;
  daysInMonth: number;
  remainingDaysInMonth: number;
  totalIncome: number;
  totalExpense: number;
  investmentTransfers: number;
  internalTransfers: number;
  reconcileNet: number;
  netCashflow: number;
  savingsAllocated: number;
  savingsRatePct: number;
  netSavingsRatePct: number;
  safeToSpendMonth: number;
  safeToSpendDaily: number;
  remainingSpendingCap: number;
  runwayMonths: number;
  categoryBreakdown: CategorySpendItem[];
  dailyHeatmap: DailySpendCell[];
  transactionCount: number;
}

function monthBounds(referenceDate: Date): {
  startMs: number;
  endMs: number;
  daysInMonth: number;
  remainingDaysInMonth: number;
  monthKey: string;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();
  const currentDay = referenceDate.getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - currentDay + 1);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    daysInMonth,
    remainingDaysInMonth,
    monthKey,
  };
}

export function computeMonthlyCashflow(params: {
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  budget: BudgetConfig;
  referenceDate?: Date;
}): MonthlyCashflowSummary {
  const referenceDate = params.referenceDate ?? new Date();
  const bounds = monthBounds(referenceDate);
  const recomputedAccounts = computeAccountBalances(
    params.accounts,
    params.transactions,
  );
  const accountMap = new Map(recomputedAccounts.map((acc) => [acc.id, acc]));
  const netWorth = computeNetWorthSummary(recomputedAccounts);

  const monthTxs = params.transactions.filter(
    (tx) =>
      tx.syncStatus !== "DELETED" &&
      tx.occurredAt >= bounds.startMs &&
      tx.occurredAt <= bounds.endMs,
  );

  let totalIncome = 0;
  let totalExpense = 0;
  let investmentTransfers = 0;
  let internalTransfers = 0;
  let reconcileNet = 0;

  const expenseByCategory = new Map<string, number>();
  const expenseByDay = new Map<number, number>();

  for (const tx of monthTxs) {
    if (tx.type === "INCOME") {
      totalIncome += tx.amount;
      continue;
    }

    if (tx.type === "EXPENSE") {
      totalExpense += tx.amount;
      expenseByCategory.set(
        tx.categoryId,
        (expenseByCategory.get(tx.categoryId) ?? 0) + tx.amount,
      );
      const day = new Date(tx.occurredAt).getDate();
      expenseByDay.set(day, (expenseByDay.get(day) ?? 0) + tx.amount);
      continue;
    }

    if (tx.type === "TRANSFER") {
      const targetAccount = tx.toAccountId
        ? accountMap.get(tx.toAccountId)
        : undefined;
      if (targetAccount?.group === "INVESTMENT" || tx.categoryId === "tich-luy") {
        investmentTransfers += tx.amount;
      } else {
        internalTransfers += tx.amount;
      }
      continue;
    }

    if (tx.type === "RECONCILE") {
      reconcileNet += tx.reconcileDelta ?? tx.amount;
    }
  }

  const netCashflow = totalIncome - totalExpense;
  const savingsBase = Math.max(
    totalIncome,
    params.budget.monthlyIncomeTarget,
    investmentTransfers,
    1,
  );
  const savingsAllocated = investmentTransfers;
  const savingsRatePct = Number(
    ((savingsAllocated / savingsBase) * 100).toFixed(1),
  );
  const netSavingsRatePct =
    totalIncome > 0
      ? Number(
          Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100).toFixed(
            1,
          ),
        )
      : 0;

  const remainingSpendingCap = params.budget.monthlySpendingCap - totalExpense;
  const safeToSpendMonth = Math.max(
    0,
    Math.min(Math.max(0, netWorth.liquidVnd), remainingSpendingCap),
  );
  const safeToSpendDaily = Math.floor(
    safeToSpendMonth / bounds.remainingDaysInMonth,
  );

  const monthlyBurn = Math.max(
    totalExpense,
    params.budget.fixedCommitments,
    1,
  );
  const totalReserves = Math.max(0, netWorth.liquidVnd + netWorth.investmentVnd);
  const runwayMonths = Number((totalReserves / monthlyBurn).toFixed(1));

  const categoryBreakdown: CategorySpendItem[] = Array.from(
    expenseByCategory.entries(),
  )
    .map(([categoryId, amount]) => {
      const meta = getCategoryById(categoryId);
      const limit = params.budget.categoryLimits[categoryId] ?? null;
      const usagePct =
        limit && limit > 0
          ? Number(((amount / limit) * 100).toFixed(1))
          : null;
      return {
        categoryId,
        label: meta.label,
        shortLabel: meta.shortLabel,
        color: meta.color,
        amount,
        sharePct:
          totalExpense > 0
            ? Number(((amount / totalExpense) * 100).toFixed(1))
            : 0,
        budgetLimit: limit,
        usagePct,
        isOverBudget: limit !== null && limit > 0 ? amount > limit : false,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const maxDaySpend = Math.max(0, ...expenseByDay.values());
  const dailyHeatmap: DailySpendCell[] = [];
  for (let day = 1; day <= bounds.daysInMonth; day += 1) {
    const amount = expenseByDay.get(day) ?? 0;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (amount > 0 && maxDaySpend > 0) {
      const ratio = amount / maxDaySpend;
      if (ratio >= 0.75) intensity = 4;
      else if (ratio >= 0.5) intensity = 3;
      else if (ratio >= 0.25) intensity = 2;
      else intensity = 1;
    }
    dailyHeatmap.push({ day, amount, intensity });
  }

  return {
    monthKey: bounds.monthKey,
    daysInMonth: bounds.daysInMonth,
    remainingDaysInMonth: bounds.remainingDaysInMonth,
    totalIncome,
    totalExpense,
    investmentTransfers,
    internalTransfers,
    reconcileNet,
    netCashflow,
    savingsAllocated,
    savingsRatePct,
    netSavingsRatePct,
    safeToSpendMonth,
    safeToSpendDaily,
    remainingSpendingCap,
    runwayMonths,
    categoryBreakdown,
    dailyHeatmap,
    transactionCount: monthTxs.length,
  };
}

export interface WhatIfSimulationResult {
  purchaseAmount: number;
  currentDailySafeToSpend: number;
  newRemainingSafeToSpend: number;
  newDailySafeToSpend: number;
  dailyDropAmount: number;
  savingsDelayDays: number;
  severity: "safe" | "caution" | "danger";
  verdictMessage: string;
}

export function simulateWhatIfPurchase(
  cashflow: MonthlyCashflowSummary,
  purchaseAmount: number,
): WhatIfSimulationResult {
  const cleanAmount = Math.max(0, Math.round(purchaseAmount));
  const currentDailySafeToSpend = cashflow.safeToSpendDaily;
  const remainingDays = Math.max(1, cashflow.remainingDaysInMonth);

  if (cleanAmount <= 0) {
    return {
      purchaseAmount: 0,
      currentDailySafeToSpend,
      newRemainingSafeToSpend: cashflow.safeToSpendMonth,
      newDailySafeToSpend: currentDailySafeToSpend,
      dailyDropAmount: 0,
      savingsDelayDays: 0,
      severity: "safe",
      verdictMessage:
        "Nhập số tiền định mua (VD: 1tr8, 500k) để ướm thử tác động lên hạn mức sống mỗi ngày.",
    };
  }

  const newRemainingSafeToSpend = Math.max(
    0,
    cashflow.safeToSpendMonth - cleanAmount,
  );
  const newDailySafeToSpend = Math.floor(
    newRemainingSafeToSpend / remainingDays,
  );
  const dailyDropAmount = Math.max(
    0,
    currentDailySafeToSpend - newDailySafeToSpend,
  );
  const savingsDelayDays = Math.max(
    1,
    Math.ceil(cleanAmount / Math.max(currentDailySafeToSpend, 100_000)),
  );

  if (cleanAmount > cashflow.safeToSpendMonth) {
    return {
      purchaseAmount: cleanAmount,
      currentDailySafeToSpend,
      newRemainingSafeToSpend: 0,
      newDailySafeToSpend: 0,
      dailyDropAmount,
      savingsDelayDays,
      severity: "danger",
      verdictMessage: `Cảnh báo vượt trần! Món này vượt quá toàn bộ ngân sách an toàn còn lại trong tháng, làm chậm mục tiêu tiết kiệm khoảng ${savingsDelayDays} ngày.`,
    };
  }

  const severity: "safe" | "caution" | "danger" =
    newDailySafeToSpend < currentDailySafeToSpend * 0.65 ? "caution" : "safe";

  return {
    purchaseAmount: cleanAmount,
    currentDailySafeToSpend,
    newRemainingSafeToSpend,
    newDailySafeToSpend,
    dailyDropAmount,
    savingsDelayDays,
    severity,
    verdictMessage: `Nếu mua món này, định mức sống ${remainingDays} ngày còn lại sẽ tụt từ ${currentDailySafeToSpend.toLocaleString("vi-VN")} ₫/ngày xuống còn ${newDailySafeToSpend.toLocaleString("vi-VN")} ₫/ngày (hoặc làm chậm mục tiêu tiết kiệm ~${savingsDelayDays} ngày).`,
  };
}

export function computeQuickOnboardingPlan(params: {
  liquidBalanceVnd: number;
  fixedCommitmentsVnd: number;
  referenceDate?: Date;
}): {
  remainingDays: number;
  spendableMonthVnd: number;
  safeDailyVnd: number;
  summaryMessage: string;
} {
  const ref = params.referenceDate ?? new Date();
  const bounds = monthBounds(ref);
  const spendableMonthVnd = Math.max(
    0,
    Math.round(params.liquidBalanceVnd - params.fixedCommitmentsVnd),
  );
  const safeDailyVnd = Math.floor(
    spendableMonthVnd / bounds.remainingDaysInMonth,
  );
  const fixedFormatted = Math.max(
    0,
    Math.round(params.fixedCommitmentsVnd),
  ).toLocaleString("vi-VN");

  return {
    remainingDays: bounds.remainingDaysInMonth,
    spendableMonthVnd,
    safeDailyVnd,
    summaryMessage: `Từ hôm nay đến cuối tháng (còn ${bounds.remainingDaysInMonth} ngày), mỗi ngày bạn được tiêu thoải mái tối đa ${safeDailyVnd.toLocaleString("vi-VN")} ₫ mà vẫn giữ nguyên ${fixedFormatted} ₫ tiền cố định.`,
  };
}
