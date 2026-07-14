"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { UserChip, type ViewerSummary } from "@/components/user-chip";
import { CAPTURE_OPTIONS } from "@/lib/capture/options";
import {
  APP_HOME_HREF,
  GHI_CHI_TIEU_HREF,
  GHI_CHI_TIEU_LABEL,
  isPlanningPath,
  MORE_NAV_LINKS,
  PLANNING_LINKS,
  PRIMARY_NAV,
  type PrimaryNavItem,
} from "@/lib/nav-ia";

/** Default badge when page does not pass `inboxCount` from candidate store. */
const INBOX_BADGE_COUNT = 0;

/** Default topbar/FAB CTA when a page does not pass primaryAction / fabAction. */
const DEFAULT_GHI_CHI_ACTION: PrimaryAction = {
  label: GHI_CHI_TIEU_LABEL,
  href: GHI_CHI_TIEU_HREF,
  icon: "plus",
};

type NavItem = PrimaryNavItem | {
  kind: "link";
  label: string;
  icon: IconName;
  href: string;
  badge?: number;
  mobileTab?: boolean;
};

const mobileTabs: NavItem[] = [
  ...PRIMARY_NAV.filter(
    (item) => item.kind === "action" || item.mobileTab,
  ),
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
  /** Override placeholder badge (default 0). Shown on More → Hộp thư. */
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

  const resolvedPrimary = primaryAction ?? DEFAULT_GHI_CHI_ACTION;
  /** FAB stays global “Ghi chi tiêu” unless the page sets `fabAction`. */
  const resolvedFab = fabAction ?? DEFAULT_GHI_CHI_ACTION;

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
        <Link className="brand" href={APP_HOME_HREF} aria-label="Money Flow, về Tổng quan">
          <span className="brand-mark"><span /></span>
          <span>Money Flow</span>
        </Link>
        <nav>
          {PRIMARY_NAV.map((item) => {
            if (item.kind === "action") {
              const captureActive = captureOpen || pathIsActive(pathname, "/capture");
              return (
                <button
                  type="button"
                  key={item.label}
                  className={captureActive ? "active" : ""}
                  onClick={openCapture}
                  aria-current={captureActive ? "page" : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            }
            const insightsRelated =
              item.href === "/insights" && isPlanningPath(pathname);
            const active = pathIsActive(pathname, item.href) || insightsRelated;
            return (
              <Link
                href={item.href}
                className={active ? "active" : ""}
                key={item.label}
                aria-current={active ? "page" : undefined}
                title={
                  insightsRelated
                    ? "Kế hoạch (ngân sách · định kỳ · mục tiêu) nằm dưới Tổng quan"
                    : undefined
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
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
          <Link
            className="mobile-brand brand"
            href={APP_HOME_HREF}
            aria-label="Money Flow, về Tổng quan"
          >
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
            {resolvedPrimary.href ? (
              <Link
                className="primary-button desktop-add"
                href={resolvedPrimary.href}
                aria-disabled={resolvedPrimary.disabled || undefined}
                onClick={
                  resolvedPrimary.disabled
                    ? (event) => event.preventDefault()
                    : undefined
                }
              >
                <Icon name={resolvedPrimary.icon ?? "plus"} />
                {resolvedPrimary.label}
              </Link>
            ) : (
              <button
                type="button"
                className="primary-button desktop-add"
                onClick={resolvedPrimary.onClick}
                disabled={resolvedPrimary.disabled}
              >
                <Icon name={resolvedPrimary.icon ?? "plus"} />
                {resolvedPrimary.label}
              </button>
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
            const captureActive = captureOpen || pathIsActive(pathname, "/capture");
            return (
              <button
                type="button"
                key={item.label}
                className={captureActive ? "active" : ""}
                onClick={openCapture}
                aria-current={captureActive ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          }
          if (item.href === "#more") {
            const moreActive =
              moreOpen ||
              MORE_NAV_LINKS.some((m) => pathIsActive(pathname, m.href)) ||
              PLANNING_LINKS.some((m) => pathIsActive(pathname, m.href));
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
                {inboxCount > 0 ? (
                  <span className="nav-badge mobile-nav-badge" aria-hidden="true">
                    {inboxCount > 99 ? "99+" : inboxCount}
                  </span>
                ) : null}
              </button>
            );
          }
          const insightsRelated =
            item.href === "/insights" && isPlanningPath(pathname);
          const active = pathIsActive(pathname, item.href) || insightsRelated;
          return (
            <Link
              href={item.href}
              className={active ? "active" : ""}
              key={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {resolvedFab.href ? (
        <Link
          className="mobile-fab"
          href={resolvedFab.href}
          aria-label={resolvedFab.label}
          aria-disabled={resolvedFab.disabled || undefined}
          onClick={
            resolvedFab.disabled
              ? (event) => event.preventDefault()
              : undefined
          }
        >
          <Icon name={resolvedFab.icon ?? "plus"} />
        </Link>
      ) : (
        <button
          className="mobile-fab"
          onClick={resolvedFab.onClick}
          disabled={resolvedFab.disabled}
          aria-label={resolvedFab.label}
          type="button"
        >
          <Icon name={resolvedFab.icon ?? "plus"} />
        </button>
      )}

      <CaptureSheet
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        titleId={captureTitleId}
        inboxCount={inboxCount}
      />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        titleId={moreTitleId}
        pathname={pathname}
        inboxCount={inboxCount}
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
  inboxCount,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  inboxCount: number;
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
        <h2 id={titleId}>Ghi giao dịch</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>
      <p className="capture-sheet-lead">
        Chọn cách ghi nhanh hoặc đưa dữ liệu vào để duyệt trước khi vào sổ.
      </p>
      <div className="capture-sheet-actions">
        {CAPTURE_OPTIONS.map((option) => (
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
      <p className="capture-sheet-alt">
        <Link href="/inbox" onClick={onClose}>
          Mở Hộp thư
          {inboxCount > 0 ? ` (${inboxCount > 99 ? "99+" : inboxCount})` : ""}
        </Link>
        {" · "}
        <Link href="/capture" onClick={onClose}>
          Trang Capture
        </Link>
      </p>
      <button type="button" className="secondary-button capture-sheet-cancel" onClick={onClose}>
        Hủy
      </button>
    </dialog>
  );
}

function MoreSheet({
  open,
  onClose,
  titleId,
  pathname,
  inboxCount,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  pathname: string;
  inboxCount: number;
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
      <nav className="more-sheet-nav" aria-label="Công cụ khác">
        {MORE_NAV_LINKS.map((item) => {
          const badge =
            item.href === "/inbox" && inboxCount > 0 ? inboxCount : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={pathIsActive(pathname, item.href) ? "active" : ""}
              onClick={onClose}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {badge != null ? (
                <span className="nav-badge" aria-label={`${badge} mục chờ duyệt`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <p className="more-sheet-section-label">Kế hoạch · từ Tổng quan</p>
      <nav className="more-sheet-nav" aria-label="Kế hoạch tài chính">
        {PLANNING_LINKS.map((item) => (
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
