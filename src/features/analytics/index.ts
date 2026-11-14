"use client";

import { useCallback } from "react";
import {
  computeQuickOnboardingPlan,
  simulateWhatIfPurchase,
  type MonthlyCashflowSummary,
  type WhatIfSimulationResult,
} from "../../core/engine/cashflow.engine.ts";
import type { BudgetConfig } from "../../core/schema/budget.schema.ts";
import type { MoneyFlowSnapshot } from "../../core/storage/db.local.ts";

export interface AnalyticsHighlight {
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
}

export function deriveCashflowHighlights(
  summary: MonthlyCashflowSummary,
): AnalyticsHighlight[] {
  const highlights: AnalyticsHighlight[] = [];

  if (summary.investmentTransfers > 0) {
    highlights.push({
      title: `Tỷ lệ Tích lũy ${summary.savingsRatePct}%`,
      detail: `Đã trích sang ví Đầu tư mà không làm tăng chi tiêu sinh hoạt.`,
      tone: "positive",
    });
  }

  if (summary.refundNetOffTotal > 0) {
    highlights.push({
      title: `Đã cấn trừ hoàn tiền ${summary.refundNetOffTotal.toLocaleString("vi-VN")} ₫`,
      detail: `Hoàn tiền giảm trực tiếp chi tiêu ròng thay vì làm phồng thu nhập ảo.`,
      tone: "positive",
    });
  }

  const topCategory = summary.categoryBreakdown[0];
  if (topCategory) {
    highlights.push({
      title: `Nhóm chi lớn nhất: ${topCategory.shortLabel}`,
      detail: `Chiếm ${topCategory.sharePct}% tổng chi tiêu ròng tháng.`,
      tone: topCategory.isOverBudget ? "warning" : "neutral",
    });
  }

  highlights.push({
    title: `Runway dự phòng ${summary.runwayMonths} tháng`,
    detail: `Tính trên tổng dự trữ thanh khoản + đầu tư theo mức chi hiện tại.`,
    tone: summary.runwayMonths >= 6 ? "positive" : "warning",
  });

  return highlights;
}

export function useAnalyticsActions(params: {
  cashflow: MonthlyCashflowSummary;
  makeId: (prefix: string) => string;
  commitSnapshot: (
    updater: (prev: MoneyFlowSnapshot) => MoneyFlowSnapshot,
  ) => void;
  setStatusMessage: (msg: string | null) => void;
}) {
  const { cashflow, makeId, commitSnapshot, setStatusMessage } = params;

  const updateBudget = useCallback(
    (partial: Partial<BudgetConfig>) => {
      commitSnapshot((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          ...partial,
          updatedAt: Date.now(),
        },
      }));
      setStatusMessage("Đã cập nhật cấu hình Safe-to-Spend & ngân sách.");
    },
    [commitSnapshot, setStatusMessage],
  );

  const toggleCommitmentPaid = useCallback(
    (commitmentId: string) => {
      commitSnapshot((prev) => {
        const nextCommitments = (prev.budget.commitments ?? []).map((item) =>
          item.id === commitmentId ? { ...item, isPaid: !item.isPaid } : item,
        );
        return {
          ...prev,
          budget: {
            ...prev.budget,
            commitments: nextCommitments,
            updatedAt: Date.now(),
          },
        };
      });
    },
    [commitSnapshot],
  );

  const addCommitment = useCallback(
    (name: string, amountVnd: number, dueDay = 1) => {
      const cleanName = name.trim();
      const cleanAmt = Math.max(0, Math.round(amountVnd));
      if (!cleanName || cleanAmt <= 0) return;

      const cleanDay = Math.max(1, Math.min(31, Math.round(dueDay)));
      commitSnapshot((prev) => {
        const nextCommitments = [
          ...(prev.budget.commitments ?? []),
          {
            id: makeId("com"),
            name: cleanName.slice(0, 80),
            amountVnd: cleanAmt,
            dueDay: cleanDay,
            isPaid: false,
          },
        ];
        const totalFixed = nextCommitments.reduce(
          (sum, c) => sum + c.amountVnd,
          0,
        );
        return {
          ...prev,
          budget: {
            ...prev.budget,
            fixedCommitments: Math.max(prev.budget.fixedCommitments, totalFixed),
            commitments: nextCommitments,
            updatedAt: Date.now(),
          },
        };
      });
      setStatusMessage(`Đã thêm khoản cố định: ${cleanName}`);
    },
    [makeId, commitSnapshot, setStatusMessage],
  );

  const setActiveEventMode = useCallback(
    (eventName: string | null, budgetVnd = 0) => {
      const normalized = eventName?.trim() || null;
      commitSnapshot((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          activeEventName: normalized,
          activeEventBudgetVnd: normalized ? Math.max(0, Math.round(budgetVnd)) : 0,
          updatedAt: Date.now(),
        },
      }));
      setStatusMessage(
        normalized
          ? `Đã bật Chế độ Sự kiện "${normalized}" — khoản gắn thẻ sẽ tách riêng khỏi Safe-to-Spend.`
          : "Đã tắt Chế độ Sự kiện / Chuyến đi.",
      );
    },
    [commitSnapshot, setStatusMessage],
  );

  const simulateWhatIf = useCallback(
    (purchaseAmount: number): WhatIfSimulationResult => {
      return simulateWhatIfPurchase(cashflow, purchaseAmount);
    },
    [cashflow],
  );

  const applyQuickOnboarding = useCallback(
    (params: {
      liquidBalanceVnd: number;
      fixedCommitmentsVnd: number;
      monthlyIncomeTargetVnd?: number;
      resetWalletBalanceToLiquid?: boolean;
      primaryAccountId?: string;
    }) => {
      const plan = computeQuickOnboardingPlan({
        liquidBalanceVnd: params.liquidBalanceVnd,
        fixedCommitmentsVnd: params.fixedCommitmentsVnd,
      });
      const now = Date.now();
      const targetId = params.primaryAccountId;

      commitSnapshot((prev) => {
        let nextAccounts = prev.accounts;
        if (params.resetWalletBalanceToLiquid && targetId) {
          nextAccounts = prev.accounts.map((a) =>
            a.id === targetId
              ? {
                  ...a,
                  initialBalance: Math.round(params.liquidBalanceVnd),
                  trustedThroughDate: now,
                  updatedAt: now,
                }
              : a,
          );
        }

        return {
          ...prev,
          accounts: nextAccounts,
          budget: {
            ...prev.budget,
            monthlyIncomeTarget:
              params.monthlyIncomeTargetVnd ?? prev.budget.monthlyIncomeTarget,
            fixedCommitments: Math.max(0, Math.round(params.fixedCommitmentsVnd)),
            monthlySpendingCap: plan.spendableMonthVnd,
            updatedAt: now,
          },
        };
      });

      setStatusMessage(plan.summaryMessage);
      return plan;
    },
    [commitSnapshot, setStatusMessage],
  );

  return {
    updateBudget,
    toggleCommitmentPaid,
    addCommitment,
    setActiveEventMode,
    simulateWhatIf,
    applyQuickOnboarding,
  };
}
