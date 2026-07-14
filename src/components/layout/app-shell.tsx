"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { UserChip, type ViewerSummary } from "@/components/user-chip";

/** Default badge when page does not pass `inboxCount` from candidate store. */
const INBOX_BADGE_COUNT = 0;

type NavHrefItem = {
  kind: "link";
  label: string;
  icon: IconName;
  href: string;
  badge?: number;
  mobileTab?: boolean;
};

type NavActionItem = {
  kind: "action";
  label: string;
  icon: IconName;
  action: "capture";
  mobileTab?: boolean;
};

type NavItem = NavHrefItem | NavActionItem;

const desktopNav: NavItem[] = [
  { kind: "link", label: "Inbox", icon: "inbox", href: "/inbox", badge: INBOX_BADGE_COUNT, mobileTab: true },
  { kind: "action", label: "Capture", icon: "plus", action: "capture", mobileTab: true },
  { kind: "link", label: "Timeline", icon: "timeline", href: "/timeline", mobileTab: true },
  { kind: "link", label: "Tài khoản", icon: "wallet", href: "/accounts", mobileTab: true },
  { kind: "link", label: "Quy tắc", icon: "rules", href: "/rules" },
  { kind: "link", label: "Imports", icon: "imports", href: "/imports" },
  { kind: "link", label: "Insights", icon: "chart", href: "/insights" },
];

const morePrimary: { label: string; href: string; icon: IconName }[] = [
  { label: "Quy tắc", href: "/rules", icon: "rules" },
  { label: "Imports", href: "/imports", icon: "imports" },
  { label: "Insights", href: "/insights", icon: "chart" },
  { label: "Cài đặt", href: "/settings", icon: "settings" },
];

/** Legacy routes kept reachable from More until IA fully migrates. */
const moreLegacy: { label: string; href: string; icon: IconName }[] = [
  { label: "Giao dịch", href: "/transactions", icon: "arrows" },
  { label: "Ngân sách", href: "/budgets", icon: "target" },
  { label: "Báo cáo", href: "/reports", icon: "chart" },
  { label: "Định kỳ", href: "/commitments", icon: "calendar" },
  { label: "Mục tiêu", href: "/goals", icon: "flag" },
  { label: "Tổng quan (cũ)", href: "/", icon: "home" },
];

const captureOptions: { label: string; description: string; href: string; icon: IconName }[] = [
  {
    label: "Dán text / SMS",
    description: "Dán tin nhắn hoặc dòng ghi chép",
    href: "/capture/paste",
    icon: "paste",
  },
  {
    label: "Tải sao kê / file",
    description: "CSV, Excel hoặc PDF sao kê",
    href: "/capture/upload",
    icon: "upload",
  },
  {
    label: "Thêm nhanh 1 khoản",
    description: "Nhập tay một giao dịch",
    href: "/capture/quick",
    icon: "plus",
  },
];

const mobileTabs: NavItem[] = [
  ...desktopNav.filter((item) => item.mobileTab),
  { kind: "link", label: "Thêm", icon: "more", href: "#more" },
];

function pathIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  /** Override placeholder badge (default 0). */
  inboxCount?: number;
  notice?: string;
  children: React.ReactNode;
};

export function AppShell({
  viewer,
  primaryAction,
  fabAction,
  searchBar,
  inboxCount = INBOX_BADGE_COUNT,
  notice,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const captureTitleId = useId();
  const moreTitleId = useId();

  const navWithBadge = desktopNav.map((item) =>
    item.kind === "link" && item.href === "/inbox"
      ? { ...item, badge: inboxCount }
      : item,
  );

  function openCapture() {
    setMoreOpen(false);
    setCaptureOpen(true);
  }

  function openMore() {
    setCaptureOpen(false);
    setMoreOpen(true);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/inbox" aria-label="Money Flow, về Inbox">
          <span className="brand-mark"><span /></span>
          <span>Money Flow</span>
        </Link>
        <nav>
          {navWithBadge.map((item) => {
            if (item.kind === "action") {
              return (
                <button
                  type="button"
                  key={item.label}
                  className={captureOpen ? "active" : ""}
                  onClick={openCapture}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                href={item.href}
                className={pathIsActive(pathname, item.href) ? "active" : ""}
                key={item.label}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span className="nav-badge" aria-label={`${item.badge} mục chờ duyệt`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            className={pathIsActive(pathname, "/settings") ? "active" : ""}
          >
            <Icon name="settings" />
            <span>Cài đặt</span>
          </Link>
          <UserChip viewer={viewer} />
        </div>
      </aside>

      <div className="page-column">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/inbox" aria-label="Money Flow, về Inbox">
            <span className="brand-mark"><span /></span>
            <span>Money Flow</span>
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
          ) : (
            <div className="desktop-search">
              <Icon name="search" />
              <input aria-label="Tìm kiếm" placeholder="Tìm giao dịch..." readOnly />
              <kbd>⌘ K</kbd>
            </div>
          )}

          <div className="topbar-actions">
            <button
              type="button"
              className="primary-button desktop-add"
              onClick={openCapture}
            >
              <Icon name="plus" />
              Capture
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
                  className="secondary-button desktop-add"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  type="button"
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

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {mobileTabs.map((item) => {
          if (item.kind === "action") {
            return (
              <button
                type="button"
                key={item.label}
                className={captureOpen ? "active" : ""}
                onClick={openCapture}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          }
          if (item.href === "#more") {
            const moreActive =
              moreOpen ||
              morePrimary.some((m) => pathIsActive(pathname, m.href)) ||
              moreLegacy.some((m) => pathIsActive(pathname, m.href));
            return (
              <button
                type="button"
                key={item.label}
                className={moreActive ? "active" : ""}
                onClick={openMore}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          }
          const badge =
            item.href === "/inbox" && inboxCount > 0 ? inboxCount : undefined;
          return (
            <Link
              href={item.href}
              className={pathIsActive(pathname, item.href) ? "active" : ""}
              key={item.label}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {badge != null ? (
                <span className="nav-badge mobile-nav-badge" aria-hidden="true">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {fabAction && (
        <button
          className="mobile-fab"
          onClick={fabAction.onClick}
          disabled={fabAction.disabled}
          aria-label={fabAction.label}
          type="button"
        >
          <Icon name={fabAction.icon ?? "plus"} />
        </button>
      )}

      <CaptureSheet
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        titleId={captureTitleId}
      />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        titleId={moreTitleId}
        pathname={pathname}
      />

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

function CaptureSheet({
  open,
  onClose,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="capture-sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialog-handle" />
      <div className="dialog-heading">
        <h2 id={titleId}>Đưa giao dịch vào</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>
      <p className="capture-sheet-lead">
        Chọn cách đưa dữ liệu vào hộp thư — bạn duyệt trước khi vào sổ.
      </p>
      <div className="capture-sheet-actions">
        {captureOptions.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="capture-sheet-option"
            onClick={onClose}
          >
            <span className="capture-sheet-option-icon">
              <Icon name={option.icon} />
            </span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <Icon name="arrowRight" />
          </Link>
        ))}
      </div>
      <button type="button" className="secondary-button capture-sheet-cancel" onClick={onClose}>
        Hủy
      </button>
      <p className="capture-sheet-alt">
        <Link href="/capture" onClick={onClose}>
          Mở trang Capture
        </Link>
      </p>
    </dialog>
  );
}

function MoreSheet({
  open,
  onClose,
  titleId,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  pathname: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="more-sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialog-handle" />
      <div className="dialog-heading">
        <h2 id={titleId}>Thêm</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>
      <nav className="more-sheet-nav" aria-label="Mục khác">
        {morePrimary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathIsActive(pathname, item.href) ? "active" : ""}
            onClick={onClose}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <p className="more-sheet-section-label">Cũ · vẫn dùng được</p>
      <nav className="more-sheet-nav" aria-label="Màn hình cũ">
        {moreLegacy.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathIsActive(pathname, item.href) ? "active" : ""}
            onClick={onClose}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </dialog>
  );
}
