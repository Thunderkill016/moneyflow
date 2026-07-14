/**
 * Inbox-first information architecture.
 * Primary nav never includes budgets / commitments / goals —
 * those live under Insights cards and More → Kế hoạch.
 */

import type { IconName } from "@/components/icons";

export type SecondaryNavItem = {
  label: string;
  href: string;
  icon: IconName;
  description?: string;
};

/** Routes that must stay off the primary sidebar / mobile tabs. */
export const PLANNING_PATHS = ["/budgets", "/commitments", "/goals"] as const;

/** Ngân sách · Định kỳ · Mục tiêu — secondary only (Insights / More). */
export const PLANNING_LINKS: SecondaryNavItem[] = [
  {
    label: "Ngân sách",
    href: "/budgets",
    icon: "target",
    description: "Hạn mức theo danh mục",
  },
  {
    label: "Định kỳ",
    href: "/commitments",
    icon: "calendar",
    description: "Hóa đơn & khoản giữ trước",
  },
  {
    label: "Mục tiêu",
    href: "/goals",
    icon: "flag",
    description: "Tiết kiệm có đích",
  },
];

/** Other tools reachable from More (not primary activation). */
export const MORE_OTHER_LINKS: SecondaryNavItem[] = [
  { label: "Giao dịch", href: "/transactions", icon: "arrows" },
  { label: "Báo cáo", href: "/reports", icon: "chart" },
];

export function isPlanningPath(pathname: string): boolean {
  return PLANNING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
