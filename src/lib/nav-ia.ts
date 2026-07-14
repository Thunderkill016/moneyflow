/**
 * Thu chi primary information architecture (Wave A / G5).
 *
 * Primary (desktop sidebar + mobile tabs):
 *   Tổng quan · Giao dịch · Capture · Tài khoản · More
 *
 * Capture is a primary action (sheet / /capture), not a planning route.
 * Inbox, rules, imports, timeline, reports live under More (or Capture sheet).
 * Budgets / commitments / goals stay secondary (Insights cards + More → Kế hoạch).
 */

import type { IconName } from "@/components/icons";

export type SecondaryNavItem = {
  label: string;
  href: string;
  icon: IconName;
  description?: string;
};

export type PrimaryNavLink = {
  kind: "link";
  label: string;
  href: string;
  icon: IconName;
  mobileTab?: boolean;
};

export type PrimaryNavAction = {
  kind: "action";
  label: string;
  icon: IconName;
  action: "capture";
  mobileTab?: boolean;
};

export type PrimaryNavItem = PrimaryNavLink | PrimaryNavAction;

/**
 * Desktop primary nav order (settings stay in sidebar footer).
 * Mobile tabs = items with mobileTab + More button.
 */
export const PRIMARY_NAV: PrimaryNavItem[] = [
  {
    kind: "link",
    label: "Tổng quan",
    href: "/insights",
    icon: "chart",
    mobileTab: true,
  },
  {
    kind: "link",
    label: "Giao dịch",
    href: "/transactions",
    icon: "arrows",
    mobileTab: true,
  },
  {
    kind: "action",
    label: "Capture",
    icon: "plus",
    action: "capture",
    mobileTab: true,
  },
  {
    kind: "link",
    label: "Tài khoản",
    href: "/accounts",
    icon: "wallet",
    mobileTab: true,
  },
];

/** Href-only primary routes (excludes Capture action). */
export const PRIMARY_NAV_HREFS = PRIMARY_NAV.filter(
  (item): item is PrimaryNavLink => item.kind === "link",
).map((item) => item.href);

/** Default brand / home when logged in. */
export const APP_HOME_HREF = "/insights" as const;

/**
 * Global primary CTA (desktop topbar + mobile FAB) — TASK-105.
 * Opens quick-add expense; pages may override with dialog `onClick` but keep the same label.
 */
export const GHI_CHI_TIEU_LABEL = "Ghi chi tiêu" as const;
export const GHI_CHI_TIEU_HREF = "/capture/quick" as const;

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

/**
 * Tools reachable from More (and optionally Capture sheet).
 * Inbox is demoted here — not primary activation.
 * Giao dịch is primary, so it is not listed again.
 */
export const MORE_NAV_LINKS: SecondaryNavItem[] = [
  {
    label: "Hộp thư",
    href: "/inbox",
    icon: "inbox",
    description: "Duyệt ứng viên trước khi vào sổ",
  },
  {
    label: "Timeline",
    href: "/timeline",
    icon: "timeline",
    description: "Giao dịch đã duyệt",
  },
  {
    label: "Quy tắc",
    href: "/rules",
    icon: "rules",
    description: "Tự gán danh mục khi dán/import",
  },
  {
    label: "Imports",
    href: "/imports",
    icon: "imports",
    description: "Lịch sử file sao kê",
  },
  {
    label: "Báo cáo",
    href: "/reports",
    icon: "chart",
    description: "Thu chi theo kỳ",
  },
  {
    label: "Danh mục",
    href: "/categories",
    icon: "spark",
    description: "Thêm, đổi tên, ẩn danh mục thu chi",
  },
  {
    label: "Cài đặt",
    href: "/settings",
    icon: "settings",
  },
];

/** @deprecated Prefer MORE_NAV_LINKS — kept for call sites that only need “other” tools. */
export const MORE_OTHER_LINKS: SecondaryNavItem[] = MORE_NAV_LINKS.filter(
  (item) => item.href !== "/settings",
);

export function isPlanningPath(pathname: string): boolean {
  return PLANNING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isPrimaryNavHref(href: string): boolean {
  return (PRIMARY_NAV_HREFS as readonly string[]).includes(href);
}
