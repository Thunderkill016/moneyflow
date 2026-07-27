"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Icon, type IconName } from "@/components/icons";
import {
  UserChip,
  viewerInitial,
  viewerLabel,
  type ViewerSummary,
} from "@/components/user-chip";
import { CAPTURE_OPTIONS } from "@/lib/capture/options";
import {
  isSearchShortcut,
  shouldIgnoreShortcutTarget,
  TRANSACTIONS_SEARCH_HREF,
  wantsLedgerSearchFocus,
} from "@/lib/app-shortcuts";
import {
  APP_HOME_HREF,
  GHI_CHI_TIEU_HREF,
  GHI_CHI_TIEU_LABEL,
  isPlanningPath,
  ADVANCED_NAV_LINKS,
  MORE_NAV_LINKS,
  PLANNING_LINKS,
  PRIMARY_NAV,
  type PrimaryNavItem,
} from "@/lib/nav-ia";
import styles from "./app-shell.module.css";

const INBOX_BADGE_COUNT = 0;

const DEFAULT_GHI_CHI_ACTION: PrimaryAction = {
  label: GHI_CHI_TIEU_LABEL,
  href: GHI_CHI_TIEU_HREF,
  icon: "plus",
};

type NavItem =
  | PrimaryNavItem
  | {
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

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type PrimaryAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: IconName;
};

export type NoticeAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
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
  inboxCount?: number;
  notice?: string;
  noticeAction?: NoticeAction;
  children: React.ReactNode;
};

export function AppShell({
  viewer,
  primaryAction,
  fabAction,
  searchBar,
  inboxCount = INBOX_BADGE_COUNT,
  notice,
  noticeAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const captureTitleId = useId();
  const moreTitleId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resolvedPrimary = primaryAction ?? DEFAULT_GHI_CHI_ACTION;
  const resolvedMobilePrimary = fabAction ?? DEFAULT_GHI_CHI_ACTION;

  function openCapture() {
    setMoreOpen(false);
    setCaptureOpen(true);
  }

  function openMore() {
    setCaptureOpen(false);
    setMoreOpen(true);
  }

  function runAction(action: PrimaryAction) {
    if (action.disabled) return;
    if (action.href) {
      router.push(action.href);
      return;
    }
    action.onClick?.();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isSearchShortcut(event)) return;
      if (shouldIgnoreShortcutTarget(event.target)) return;
      event.preventDefault();
      if (searchBar && searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
        return;
      }
      if (
        pathname !== "/transactions" &&
        !pathname.startsWith("/transactions/")
      ) {
        router.push(TRANSACTIONS_SEARCH_HREF);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router, searchBar]);

  useEffect(() => {
    if (!searchBar || !searchInputRef.current) return;
    if (typeof window === "undefined") return;
    if (!wantsLedgerSearchFocus(window.location.search)) return;
    const input = searchInputRef.current;
    input.focus();
    input.select();
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [searchBar]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Điều hướng chính">
        <Brand />
        <nav className={styles.primaryNav}>
          {PRIMARY_NAV.map((item) => {
            if (item.kind === "action") {
              const active =
                captureOpen || pathIsActive(pathname, "/capture");
              return (
                <button
                  type="button"
                  key={item.label}
                  className={cx(styles.navButton, active && styles.navActive)}
                  onClick={openCapture}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            }

            const insightsRelated =
              item.href === "/insights" && isPlanningPath(pathname);
            const active =
              pathIsActive(pathname, item.href) || insightsRelated;
            return (
              <Link
                href={item.href}
                className={cx(styles.navLink, active && styles.navActive)}
                key={item.label}
                aria-current={active ? "page" : undefined}
                title={
                  insightsRelated
                    ? "Kế hoạch nằm dưới Tổng quan"
                    : undefined
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link
            href="/settings"
            className={cx(
              styles.settingsLink,
              pathIsActive(pathname, "/settings") && styles.navActive,
            )}
          >
            <Icon name="settings" />
            <span>Cài đặt</span>
          </Link>
          <div className={styles.profileSlot}>
            <UserChip viewer={viewer} />
          </div>
        </div>
      </aside>

      <div className={styles.pageColumn}>
        <header className={styles.topbar}>
          <Brand mobile />

          {searchBar ? (
            <div className={styles.search}>
              <Icon name="search" />
              <input
                ref={searchInputRef}
                data-app-search="true"
                value={searchBar.value}
                onChange={(event) => searchBar.onChange(event.target.value)}
                aria-label="Tìm giao dịch"
                placeholder={searchBar.placeholder ?? "Tìm giao dịch..."}
              />
              <kbd aria-hidden="true">⌘ K</kbd>
            </div>
          ) : (
            <Link
              className={styles.searchLink}
              href={TRANSACTIONS_SEARCH_HREF}
              aria-label="Tìm giao dịch trên sổ (⌘K)"
              prefetch
            >
              <Icon name="search" />
              <span className={styles.searchPlaceholder}>
                Tìm giao dịch...
              </span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </Link>
          )}

          <div className={styles.topbarActions}>
            {resolvedPrimary.href ? (
              <Link
                className={styles.primaryAction}
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
                className={styles.primaryAction}
                onClick={resolvedPrimary.onClick}
                disabled={resolvedPrimary.disabled}
              >
                <Icon name={resolvedPrimary.icon ?? "plus"} />
                {resolvedPrimary.label}
              </button>
            )}

            <button
              type="button"
              className={styles.mobileAccountButton}
              onClick={openMore}
              aria-label={`Mở tài khoản ${viewerLabel(viewer)}`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              <span className={styles.avatar}>{viewerInitial(viewer)}</span>
            </button>
          </div>
        </header>

        {viewer.isDemo ? (
          <div className={styles.demoBanner} role="status" aria-live="polite">
            <Icon name="bell" aria-hidden="true" />
            <span>Chế độ demo — dữ liệu lưu trên trình duyệt</span>
            <Link href="/register">Đăng ký</Link>
          </div>
        ) : null}

        {children}
      </div>

      <nav className={styles.mobileNav} aria-label="Điều hướng di động">
        {mobileTabs.map((item) => {
          if (item.kind === "action") {
            const active = pathIsActive(pathname, "/capture");
            return (
              <button
                type="button"
                key={item.label}
                className={cx(
                  styles.mobileNavItem,
                  styles.mobileCapture,
                  active && styles.mobileNavActive,
                )}
                onClick={() => runAction(resolvedMobilePrimary)}
                aria-current={active ? "page" : undefined}
                aria-label={resolvedMobilePrimary.label}
                disabled={resolvedMobilePrimary.disabled}
              >
                <Icon name={resolvedMobilePrimary.icon ?? item.icon} />
                <span>Ghi</span>
              </button>
            );
          }

          if (item.href === "#more") {
            const active =
              moreOpen ||
              MORE_NAV_LINKS.some((link) =>
                pathIsActive(pathname, link.href),
              ) ||
              PLANNING_LINKS.some((link) =>
                pathIsActive(pathname, link.href),
              ) ||
              ADVANCED_NAV_LINKS.some((link) =>
                pathIsActive(pathname, link.href),
              );
            return (
              <button
                type="button"
                key={item.label}
                className={cx(
                  styles.mobileNavItem,
                  active && styles.mobileNavActive,
                )}
                onClick={openMore}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {inboxCount > 0 ? (
                  <span className={styles.badge} aria-hidden="true">
                    {inboxCount > 99 ? "99+" : inboxCount}
                  </span>
                ) : null}
              </button>
            );
          }

          const insightsRelated =
            item.href === "/insights" && isPlanningPath(pathname);
          const active =
            pathIsActive(pathname, item.href) || insightsRelated;
          return (
            <Link
              href={item.href}
              className={cx(
                styles.mobileNavItem,
                active && styles.mobileNavActive,
              )}
              key={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
        viewer={viewer}
      />
      <Toast notice={notice} action={noticeAction} />
    </div>
  );
}

function Brand({ mobile = false }: { mobile?: boolean }) {
  return (
    <Link
      className={cx(styles.brand, mobile && styles.mobileBrand)}
      href={APP_HOME_HREF}
      aria-label="MoneyFlow, về Tổng quan"
    >
      <span className={styles.brandMark} aria-hidden="true">
        <span />
      </span>
      <span>MoneyFlow</span>
    </Link>
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
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.dialogHandle} />
      <div className={styles.dialogHeading}>
        <h2 id={titleId}>Ghi giao dịch</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Đóng"
        >
          <Icon name="close" />
        </button>
      </div>
      <p className={styles.sheetLead}>
        Chọn cách ghi nhanh hoặc đưa dữ liệu vào để duyệt trước khi vào sổ.
      </p>
      <div className={styles.captureActions}>
        {CAPTURE_OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className={styles.captureOption}
            onClick={onClose}
          >
            <span className={styles.captureOptionIcon}>
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
      <p className={styles.sheetAlt}>
        <Link href="/inbox" onClick={onClose}>
          Mở Hộp thư
          {inboxCount > 0
            ? ` (${inboxCount > 99 ? "99+" : inboxCount})`
            : ""}
        </Link>
        {" · "}
        <Link href="/capture" onClick={onClose}>
          Trang nhập liệu
        </Link>
      </p>
      <button
        type="button"
        className={styles.cancelButton}
        onClick={onClose}
      >
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
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  pathname: string;
  inboxCount: number;
  viewer: ViewerSummary;
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
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.dialogHandle} />
      <div className={styles.dialogHeading}>
        <h2 id={titleId}>Thêm &amp; tài khoản</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Đóng"
        >
          <Icon name="close" />
        </button>
      </div>

      <SheetLinks
        label="Công cụ hàng ngày"
        items={MORE_NAV_LINKS}
        pathname={pathname}
        onClose={onClose}
      />
      <p className={styles.sectionLabel}>Kế hoạch · từ Tổng quan</p>
      <SheetLinks
        label="Kế hoạch tài chính"
        items={PLANNING_LINKS}
        pathname={pathname}
        onClose={onClose}
      />
      <p className={styles.sectionLabel}>Nâng cao · nhập hàng loạt</p>
      <nav className={styles.sheetNav} aria-label="Công cụ nâng cao">
        {ADVANCED_NAV_LINKS.map((item) => {
          const badge =
            item.href === "/inbox" && inboxCount > 0
              ? inboxCount
              : undefined;
          const active = pathIsActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                styles.sheetNavLink,
                active && styles.sheetNavActive,
              )}
              onClick={onClose}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {badge != null ? (
                <span
                  className={styles.badge}
                  aria-label={`${badge} mục chờ duyệt`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <section className={styles.accountSection} aria-label="Tài khoản">
        <div className={styles.accountSummary}>
          <span className={styles.avatar}>{viewerInitial(viewer)}</span>
          <span>
            <strong>{viewerLabel(viewer)}</strong>
            <small>
              {viewer.isDemo
                ? "Dữ liệu demo trên thiết bị"
                : viewer.email || "Tài khoản MoneyFlow"}
            </small>
          </span>
        </div>
        <Link
          href="/settings"
          className={styles.accountAction}
          onClick={onClose}
        >
          <Icon name="settings" />
          <span>Cài đặt tài khoản</span>
        </Link>
        {viewer.isDemo ? (
          <Link
            href="/register"
            className={cx(
              styles.accountAction,
              styles.accountActionPrimary,
            )}
            onClick={onClose}
          >
            <Icon name="arrowRight" />
            <span>Tạo tài khoản</span>
          </Link>
        ) : (
          <form action={signOut} className={styles.signoutForm}>
            <button
              type="submit"
              className={cx(
                styles.accountAction,
                styles.accountActionDanger,
              )}
            >
              <Icon name="arrowRight" />
              <span>Đăng xuất</span>
            </button>
          </form>
        )}
      </section>
    </dialog>
  );
}

function SheetLinks({
  label,
  items,
  pathname,
  onClose,
}: {
  label: string;
  items: typeof MORE_NAV_LINKS;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <nav className={styles.sheetNav} aria-label={label}>
      {items.map((item) => {
        const active = pathIsActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              styles.sheetNavLink,
              active && styles.sheetNavActive,
            )}
            onClick={onClose}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Toast({
  notice,
  action,
}: {
  notice?: string;
  action?: NoticeAction;
}) {
  const text = (notice || "").toLowerCase();
  let variant: "success" | "error" | "warning" | "info" = "success";
  let icon: IconName = "check";

  if (action) {
    variant = "info";
    icon = "restore";
  } else if (
    text.includes("lỗi") ||
    text.includes("thất bại") ||
    text.includes("không thể") ||
    text.includes("hãy") ||
    text.includes("không khôi phục") ||
    text.includes("chưa thể hoàn tác")
  ) {
    variant = "error";
    icon = "bell";
  } else if (
    text.includes("cảnh báo") ||
    text.includes("chưa") ||
    text.includes("yêu cầu")
  ) {
    variant = "warning";
    icon = "bell";
  } else if (
    text.includes("thông tin") ||
    text.includes("chi tiết") ||
    text.includes("đang") ||
    text.includes("khôi phục")
  ) {
    variant = "info";
    icon = "bell";
  }

  return (
    <div
      className={cx(
        styles.toast,
        notice && styles.toastVisible,
        variant === "error" && styles.toastError,
        variant === "warning" && styles.toastWarning,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={styles.toastIcon}>
        <Icon name={icon} />
      </span>
      <span className={styles.toastMessage}>{notice}</span>
      {notice && action ? (
        <button
          type="button"
          className={styles.toastAction}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          <Icon name="restore" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
