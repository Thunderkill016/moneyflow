import type { MonthlyCashflowSummary } from "../../core/engine/cashflow.engine.ts";

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

  const topCategory = summary.categoryBreakdown[0];
  if (topCategory) {
    highlights.push({
      title: `Nhóm chi lớn nhất: ${topCategory.shortLabel}`,
      detail: `Chiếm ${topCategory.sharePct}% tổng chi tiêu tháng.`,
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
