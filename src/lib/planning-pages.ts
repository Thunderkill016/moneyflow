/**
 * R6 / Q4 — Budgets / commitments / goals / categories full-page contracts:
 * shared card shell tones + calm thresholds + empty 1-CTA (never multi).
 */

export type PlanningCardTone =
  | "ok"
  | "watch"
  | "near"
  | "over"
  | "soon"
  | "overdue"
  | "paid"
  | "achieved";

/** Full-page empty: one primary CTA max (no secondary on happy path). */
export type PlanningPageEmptyConfig = {
  icon: "target" | "calendar" | "flag" | "spark" | "search";
  title: string;
  description: string;
  /** Omit when archived-only empty, filter empty, or action unavailable. */
  actionLabel?: string;
};

export const PAGE_EMPTY_BUDGET: PlanningPageEmptyConfig = {
  icon: "target",
  title: "Chưa có ngân sách tháng này",
  description: "Bắt đầu với một danh mục bạn muốn kiểm soát tốt hơn.",
  actionLabel: "Tạo ngân sách đầu tiên",
};

export const PAGE_EMPTY_COMMITMENT: PlanningPageEmptyConfig = {
  icon: "calendar",
  title: "Chưa có khoản định kỳ",
  description: "Thêm tiền nhà hoặc hóa đơn để MoneyFlow giữ trước cho bạn.",
  actionLabel: "Thêm khoản đầu tiên",
};

export const PAGE_EMPTY_COMMITMENT_ARCHIVED: PlanningPageEmptyConfig = {
  icon: "calendar",
  title: "Không có khoản đã lưu trữ",
  description: "Các khoản bạn lưu trữ sẽ xuất hiện tại đây.",
};

export const PAGE_EMPTY_GOAL: PlanningPageEmptyConfig = {
  icon: "flag",
  title: "Chưa có mục tiêu tiết kiệm",
  description: "Bắt đầu với một mục tiêu đủ gần để bạn thấy tiến bộ mỗi tuần.",
  actionLabel: "Tạo mục tiêu đầu tiên",
};

export const PAGE_EMPTY_GOAL_ARCHIVED: PlanningPageEmptyConfig = {
  icon: "flag",
  title: "Không có mục tiêu đã lưu trữ",
  description: "Mục tiêu được lưu trữ sẽ xuất hiện tại đây.",
};

export const PAGE_EMPTY_CATEGORY: PlanningPageEmptyConfig = {
  icon: "spark",
  title: "Chưa có danh mục",
  description: "Thêm danh mục chi hoặc thu để gán khi ghi giao dịch.",
  actionLabel: "Thêm danh mục",
};

/** Filter empty: copy only — no second primary competing with shell add. */
export const PAGE_EMPTY_CATEGORY_FILTER: PlanningPageEmptyConfig = {
  icon: "search",
  title: "Không có danh mục phù hợp bộ lọc",
  description: "Thử chọn “Tất cả” hoặc thêm danh mục mới.",
};

/** Exactly one primary action or none — never multi-CTA empty. */
export function pageEmptyPrimaryCtaCount(config: PlanningPageEmptyConfig): number {
  return config.actionLabel?.trim() ? 1 : 0;
}

export function assertPageEmptyOneCtaOrNone(config: PlanningPageEmptyConfig): void {
  const count = pageEmptyPrimaryCtaCount(config);
  if (count > 1) {
    throw new Error(`Planning page empty must have at most one CTA, got ${count}`);
  }
}

/**
 * Commitment due tone (calm bands, pairs with text label — never color-only):
 * - paid
 * - overdue: past due
 * - soon: due within 3 days (incl. today)
 * - ok: further out
 */
export function commitmentDueTone(
  item: { isPaid: boolean; dueDate: string },
  today: string,
): Extract<PlanningCardTone, "paid" | "ok" | "soon" | "overdue"> {
  if (item.isPaid) return "paid";
  const days = Math.round(
    (Date.parse(`${item.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "ok";
}

/**
 * Calm due copy — factual, no guilt language.
 * Must always return text so status is not color-only.
 */
export function commitmentDueLabel(
  item: { isPaid: boolean; dueDate: string },
  today: string,
): string {
  if (item.isPaid) return "Đã thanh toán";
  const days = Math.round(
    (Date.parse(`${item.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
  if (days === 0) return "Đến hạn hôm nay";
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days <= 3) return `Còn ${days} ngày`;
  return `Còn ${days} ngày`;
}

/** Map budget threshold → planning card tone (shared shell). */
export function budgetToneToCard(
  level: "ok" | "watch" | "near" | "over",
): PlanningCardTone {
  return level;
}
