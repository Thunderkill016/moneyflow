"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { UserChip, type ViewerSummary } from "@/components/user-chip";

const navItems: { label: string; icon: IconName; href: string; mobileTab?: boolean }[] = [
  { label: "Tổng quan", icon: "home", href: "/", mobileTab: true },
  { label: "Giao dịch", icon: "arrows", href: "/transactions", mobileTab: true },
  { label: "Ngân sách", icon: "target", href: "/budgets", mobileTab: true },
  { label: "Báo cáo", icon: "chart", href: "/reports", mobileTab: true },
  { label: "Định kỳ", icon: "calendar", href: "/commitments" },
  { label: "Mục tiêu", icon: "flag", href: "/goals" },
  { label: "Tài khoản", icon: "wallet", href: "/accounts", mobileTab: true },
];

const mobileItems = navItems.filter((item) => item.mobileTab);

export type PrimaryAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: IconName;
};

export type AppShellProps = {
  viewer: ViewerSummary;
  primaryAction?: PrimaryAction;
  fabAction?: PrimaryAction;
  searchBar?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  notice?: string;
  children: React.ReactNode;
};

export function AppShell({
  viewer,
  primaryAction,
  fabAction,
  searchBar,
  notice,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang tổng quan">
          <span className="brand-mark"><span /></span>
          <span>MoneyFlow</span>
        </Link>
        <nav>
          {navItems.map((item) => (
            <Link
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              key={item.label}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#cai-dat"><Icon name="settings" /><span>Cài đặt</span></a>
          <UserChip viewer={viewer} />
        </div>
      </aside>

      {/* Main Column */}
      <div className="page-column">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/" aria-label="MoneyFlow">
            <span className="brand-mark"><span /></span>
            <span>MoneyFlow</span>
          </Link>

          {searchBar ? (
            <div className="desktop-search">
              <Icon name="search" />
              <input
                value={searchBar.value}
                onChange={(e) => searchBar.onChange(e.target.value)}
                aria-label="Tìm giao dịch"
                placeholder={searchBar.placeholder ?? "Tìm giao dịch..."}
              />
              <kbd>⌘ K</kbd>
            </div>
          ) : pathname === "/" ? (
            <div className="desktop-search">
              <Icon name="search" />
              <input aria-label="Tìm kiếm" placeholder="Tìm giao dịch..." readOnly />
              <kbd>⌘ K</kbd>
            </div>
          ) : (
            <div />
          )}

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Thông báo">
              <Icon name="bell" />
              {pathname === "/" && <span className="notification-dot" />}
            </button>
            {primaryAction && (
              primaryAction.href ? (
                <Link
                  className="secondary-button desktop-add"
                  href={primaryAction.href}
                  aria-disabled={primaryAction.disabled}
                >
                  <Icon name={primaryAction.icon ?? "arrowDown"} />
                  {primaryAction.label}
                </Link>
              ) : (
                <button
                  className="primary-button desktop-add"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  <Icon name={primaryAction.icon ?? "plus"} />
                  {primaryAction.label}
                </button>
              )
            )}
            <span className="mobile-avatar avatar">
              {viewer.displayName?.[0]?.toUpperCase() ?? (viewer.isDemo ? "M" : "U")}
            </span>
          </div>
        </header>

        {children}
      </div>

      {/* Mobile Bottom Tab Bar — 5 tabs only */}
      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {mobileItems.map((item) => (
          <Link
            href={item.href}
            className={pathname === item.href ? "active" : ""}
            key={item.label}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile FAB */}
      {fabAction && (
        <button
          className="mobile-fab"
          onClick={fabAction.onClick}
          disabled={fabAction.disabled}
          aria-label={fabAction.label}
        >
          <Icon name={fabAction.icon ?? "plus"} />
        </button>
      )}

      {/* Toast */}
      {(() => {
        const text = (notice || "").toLowerCase();
        let variant: "success" | "error" | "warning" | "info" = "success";
        let icon: IconName = "check";
        
        if (text.includes("lỗi") || text.includes("thất bại") || text.includes("không thể") || text.includes("hãy")) {
          variant = "error";
          icon = "bell";
        } else if (text.includes("cảnh báo") || text.includes("chưa") || text.includes("yêu cầu")) {
          variant = "warning";
          icon = "bell";
        } else if (text.includes("thông tin") || text.includes("chi tiết") || text.includes("đang")) {
          variant = "info";
          icon = "bell";
        }

        return (
          <div className={`toast ${notice ? "visible" : ""} ${variant}`} role="status" aria-live="polite">
            <span><Icon name={icon} /></span>
            <span>{notice}</span>
          </div>
        );
      })()}
    </div>
  );
}
