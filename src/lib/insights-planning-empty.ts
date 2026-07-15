/**
 * R3 — Insights ledger empty + planning-card empty contracts.
 * Compact empties: description + at most one primary CTA (no secondary).
 */

import {
  WEEKLY_SUMMARY_EMPTY_LEDGER,
  WEEKLY_SUMMARY_EMPTY_WEEK,
  WEEKLY_SUMMARY_REPORTS_HREF,
  WEEKLY_SUMMARY_REPORTS_LABEL,
} from "./weekly-summary.ts";

export type PlanningCardEmptyConfig = {
  description: string;
  /** Omit when parent surface already owns the primary action (e.g. empty ledger). */
  actionLabel?: string;
  actionHref?: string;
};

/** Full-page ledger empty on Insights (EmptyState). */
export const INSIGHTS_LEDGER_EMPTY = {
  title: "Chưa có giao dịch nào",
  description:
    "Ghi khoản chi đầu tiên để thấy số dư, thu–chi tháng và danh mục chi tiêu.",
} as const;

export const PLANNING_EMPTY_BUDGET: PlanningCardEmptyConfig = {
  description: "Chưa đặt hạn mức cho tháng này.",
  actionLabel: "Thiết lập ngân sách",
  actionHref: "/budgets",
};

export const PLANNING_EMPTY_GOAL: PlanningCardEmptyConfig = {
  description: "Dành tiền cho một điều bạn muốn đạt được.",
  actionLabel: "Tạo mục tiêu",
  actionHref: "/goals",
};

export const PLANNING_EMPTY_COMMITMENT: PlanningCardEmptyConfig = {
  description: "Chưa có hóa đơn cần giữ trước.",
  actionLabel: "Thêm khoản định kỳ",
  actionHref: "/commitments",
};

export const PLANNING_EMPTY_INCOME: PlanningCardEmptyConfig = {
  description: "Chưa có lương định kỳ.",
  actionLabel: "Thêm lương định kỳ",
  actionHref: "/income-templates",
};

/** Ledger empty: copy only — primary CTA lives on EmptyState / hero. */
export const PLANNING_EMPTY_WEEKLY_LEDGER: PlanningCardEmptyConfig = {
  description: WEEKLY_SUMMARY_EMPTY_LEDGER,
};

/** Has ledger but quiet week: one CTA to reports. */
export const PLANNING_EMPTY_WEEKLY_WEEK: PlanningCardEmptyConfig = {
  description: WEEKLY_SUMMARY_EMPTY_WEEK,
  actionLabel: WEEKLY_SUMMARY_REPORTS_LABEL.replace(/\s*→\s*$/, "").trim() || WEEKLY_SUMMARY_REPORTS_LABEL,
  actionHref: WEEKLY_SUMMARY_REPORTS_HREF,
};

/** Exactly one primary action (or none for progressive empty). */
export function planningEmptyActionCount(config: PlanningCardEmptyConfig): number {
  const hasLabel = Boolean(config.actionLabel?.trim());
  const hasHref = Boolean(config.actionHref?.trim());
  if (!hasLabel && !hasHref) return 0;
  if (hasLabel && hasHref) return 1;
  // Partial config is invalid — treat as zero so tests catch misuse
  return 0;
}

export function assertOneCtaOrNone(config: PlanningCardEmptyConfig): void {
  const count = planningEmptyActionCount(config);
  if (count > 1) {
    throw new Error(`Planning empty must have at most one CTA, got ${count}`);
  }
  if (Boolean(config.actionLabel) !== Boolean(config.actionHref)) {
    throw new Error("Planning empty CTA requires both actionLabel and actionHref");
  }
}
