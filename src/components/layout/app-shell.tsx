"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Icon, type IconName } from "@/components/icons";
import { useConnectionState } from "@/hooks/use-connection-state";
import { connectionNotice as connectionNoticeFor } from "@/lib/connectivity";
import {
  UserChip,
  viewerInitial,
  viewerLabel,
  type ViewerSummary,
} from "@/components/user-chip";
import {
  Button,
  IconButton,
  LinkButton,
} from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import {
  ToastRegion,
  type ToastMessage,
  type ToastTone,
} from "@/components/ui/toast";
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
  ADVANCED_NAV_LINKS,
  MORE_NAV_LINKS,
  PLANNING_LINKS,
  PRIMARY_NAV,
  type PrimaryNavItem,
} from "@/lib/nav-ia";
import styles from "./app-shell.module.css";

const INBOX_BADGE_COUNT = 0;

/**
 * Position only — height belongs to `.shellSheet` alone.
 *
 * Any height utility here would compete with `.shellSheet`, and because a CSS-module
 * class and a utility class carry the same specificity the winner would come down to
 * stylesheet order rather than intent. On a real phone that reads as the sheet sizing
 * itself unpredictably. One owner now.
 */
const APP_SHELL_SHEET_CLASS = [
  "w-[min(32rem,100%)]",
  "max-[760px]:inset-x-0",
  "max-[760px]:top-auto",
  "max-[760px]:bottom-0",
  "max-[760px]:w-full",
  "max-[760px]:max-w-none",
  "max-[760px]:rounded-t-3xl",
  "max-[760px]:border-x-0",
  "max-[760px]:border-t",
  "max-[760px]:border-b-0",
].join(" ");

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
  noticeTone?: ToastTone;
  noticeUrgent?: boolean;
  showPrimaryActionOnMobile?: boolean;
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
  noticeTone,
  noticeUrgent = false,
  showPrimaryActionOnMobile = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const connectionState = useConnectionState();
  const connectionNotice = connectionNoticeFor(connectionState);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resolvedPrimary = primaryAction ?? DEFAULT_GHI_CHI_ACTION;
  const resolvedMobilePrimary = fabAction ?? DEFAULT_GHI_CHI_ACTION;
  const toastPresentation = resolveToastPresentation(notice, noticeAction);
  const toastMessages: ToastMessage[] = notice
    ? [
        {
          id: `app-shell:${notice}:${noticeAction?.label ?? ""}`,
          title: (
            <span className={styles.toastTitle}>
              <Icon name={toastPresentation.icon} aria-hidden="true" />
              <span>{notice}</span>
            </span>
          ),
          tone: noticeTone ?? toastPresentation.tone,
          urgent: noticeUrgent,
          action: noticeAction ? (
            <Button
              type="button"
              variant="ghost"
              targetSize="important"
              onClick={noticeAction.onClick}
              disabled={noticeAction.disabled}
            >
              <Icon name="restore" aria-hidden="true" />
              {noticeAction.label}
            </Button>
          ) : undefined,
        },
      ]
    : [];

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
    const root = document.documentElement;
    const previous = root.dataset.moneyflowShell;
    root.dataset.moneyflowShell = "mounted";

    return () => {
      if (previous === undefined) {
        delete root.dataset.moneyflowShell;
      } else {
        root.dataset.moneyflowShell = previous;
      }
    };
  }, []);

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
    <div className={styles.shell} data-app-shell="true">
      <aside className={styles.sidebar} aria-label="Điều hướng chính">
        <BrandLockup
          href={APP_HOME_HREF}
          ariaLabel="MoneyFlow, về Tổng quan"
          size="compact"
          className={styles.brand}
        />
        <nav className={styles.primaryNav}>
          {PRIMARY_NAV.map((item) => {
            if (item.kind === "action") {
              const active =
                captureOpen || pathIsActive(pathname, "/capture");
              return (
                <Button
                  type="button"
                  unstyled
                  targetSize="important"
                  key={item.label}
                  className={cx(styles.navButton, active && styles.navActive)}
                  onClick={openCapture}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  aria-haspopup="dialog"
                  aria-expanded={captureOpen}
                >
                  <Icon name={item.icon} aria-hidden="true" />
                  <span>{item.label}</span>
                </Button>
              );
            }

            const active = pathIsActive(pathname, item.href);
            return (
              <Link
                href={item.href}
                className={cx(styles.navLink, active && styles.navActive)}
                key={item.label}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon name={item.icon} aria-hidden="true" />
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
            aria-label="Cài đặt"
          >
            <Icon name="settings" aria-hidden="true" />
            <span>Cài đặt</span>
          </Link>
          <div className={styles.profileSlot}>
            <UserChip viewer={viewer} />
          </div>
        </div>
      </aside>

      <div className={styles.pageColumn}>
        <header className={styles.topbar}>
          <BrandLockup
            href={APP_HOME_HREF}
            ariaLabel="MoneyFlow, về Tổng quan"
            size="compact"
            className={styles.mobileBrand}
          />

          {searchBar ? (
            <div className={styles.search}>
              <Icon name="search" aria-hidden="true" />
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
              <Icon name="search" aria-hidden="true" />
              <span className={styles.searchPlaceholder}>
                Tìm giao dịch...
              </span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </Link>
          )}

          <div className={styles.topbarActions}>
            {resolvedPrimary.href && !resolvedPrimary.disabled ? (
              <LinkButton
                unstyled
                targetSize="important"
                className={cx(
                  styles.primaryAction,
                  showPrimaryActionOnMobile && styles.primaryActionMobileVisible,
                )}
                href={resolvedPrimary.href}
              >
                <Icon
                  name={resolvedPrimary.icon ?? "plus"}
                  aria-hidden="true"
                />
                {resolvedPrimary.label}
              </LinkButton>
            ) : (
              <Button
                type="button"
                unstyled
                targetSize="important"
                className={cx(
                  styles.primaryAction,
                  showPrimaryActionOnMobile && styles.primaryActionMobileVisible,
                )}
                onClick={resolvedPrimary.onClick}
                disabled={resolvedPrimary.disabled}
              >
                <Icon
                  name={resolvedPrimary.icon ?? "plus"}
                  aria-hidden="true"
                />
                {resolvedPrimary.label}
              </Button>
            )}

            <IconButton
              type="button"
              unstyled
              className={styles.mobileAccountButton}
              onClick={openMore}
              aria-label={`Mở tài khoản ${viewerLabel(viewer)}`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              <span className={styles.avatar}>{viewerInitial(viewer)}</span>
            </IconButton>
          </div>
        </header>

        {viewer.isDemo ? (
          <div className={styles.demoBanner} role="status" aria-live="polite">
            <Icon name="bell" aria-hidden="true" />
            <span>Chế độ demo — dữ liệu lưu trên trình duyệt</span>
            <Link href="/register">Đăng ký</Link>
          </div>
        ) : null}

        {/*
          * Quiet and persistent rather than a dialog: losing signal is not an
          * error the reader caused, and interrupting them mid-entry would be a
          * worse answer than letting them keep typing. `aria-live="polite"`
          * announces it once without cutting across whatever they are doing.
          */}
        {connectionNotice ? (
          <div className={styles.offlineBanner} role="status" aria-live="polite">
            <Icon name="bell" aria-hidden="true" />
            <span>{connectionNotice}</span>
          </div>
        ) : null}

        {children}
      </div>

      <nav className={styles.mobileNav} aria-label="Điều hướng di động">
        {mobileTabs.map((item) => {
          if (item.kind === "action") {
            const active = pathIsActive(pathname, "/capture");
            return (
              <Button
                type="button"
                unstyled
                targetSize="important"
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
                <Icon
                  name={resolvedMobilePrimary.icon ?? item.icon}
                  aria-hidden="true"
                />
                <span>Ghi</span>
              </Button>
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
              <Button
                type="button"
                unstyled
                targetSize="important"
                key={item.label}
                className={cx(
                  styles.mobileNavItem,
                  active && styles.mobileNavActive,
                )}
                onClick={openMore}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <Icon name={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
                {inboxCount > 0 ? (
                  <span className={styles.badge} aria-hidden="true">
                    {inboxCount > 99 ? "99+" : inboxCount}
                  </span>
                ) : null}
              </Button>
            );
          }

          const active = pathIsActive(pathname, item.href);
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
              <Icon name={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CaptureSheet
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        inboxCount={inboxCount}
      />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        inboxCount={inboxCount}
        viewer={viewer}
      />
      <ToastRegion
        messages={toastMessages}
        className={styles.toastRegion}
        style={{
          bottom: "var(--mf-shell-feedback-bottom)",
          zIndex: "var(--mf-shell-layer-feedback)",
        }}
      />
    </div>
  );
}

function CaptureSheet({
  open,
  onClose,
  inboxCount,
}: {
  open: boolean;
  onClose: () => void;
  inboxCount: number;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Ghi giao dịch"
      description="Chọn cách ghi nhanh hoặc đưa dữ liệu vào để duyệt trước khi vào sổ."
      side="center"
      className={cx(styles.shellSheet, APP_SHELL_SHEET_CLASS)}
      footer={
        <Button
          type="button"
          variant="outline"
          targetSize="important"
          className={styles.sheetCancel}
          onClick={onClose}
        >
          Hủy
        </Button>
      }
    >
      <div className={styles.captureActions}>
        {CAPTURE_OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className={styles.captureOption}
            onClick={onClose}
          >
            <span className={styles.captureOptionIcon}>
              <Icon name={option.icon} aria-hidden="true" />
            </span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <Icon name="arrowRight" aria-hidden="true" />
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
    </Sheet>
  );
}

function MoreSheet({
  open,
  onClose,
  pathname,
  inboxCount,
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  inboxCount: number;
  viewer: ViewerSummary;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Thêm & tài khoản"
      description="Mở công cụ, kế hoạch và tùy chọn tài khoản mà không thay đổi luồng ghi chính."
      side="right"
      className={cx(styles.shellSheet, APP_SHELL_SHEET_CLASS)}
    >
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
              <Icon name={item.icon} aria-hidden="true" />
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
          <Icon name="settings" aria-hidden="true" />
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
            <Icon name="arrowRight" aria-hidden="true" />
            <span>Tạo tài khoản</span>
          </Link>
        ) : (
          <form action={signOut} className={styles.signoutForm}>
            <Button
              type="submit"
              unstyled
              targetSize="important"
              className={cx(
                styles.accountAction,
                styles.accountActionDanger,
              )}
            >
              <Icon name="arrowRight" aria-hidden="true" />
              <span>Đăng xuất</span>
            </Button>
          </form>
        )}
      </section>
    </Sheet>
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
            <Icon name={item.icon} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function resolveToastPresentation(
  notice?: string,
  action?: NoticeAction,
): { tone: ToastTone; icon: IconName } {
  const text = (notice || "").toLowerCase();

  if (action) return { tone: "info", icon: "restore" };
  if (
    text.includes("lỗi") ||
    text.includes("thất bại") ||
    text.includes("không thể") ||
    text.includes("không khôi phục") ||
    text.includes("chưa thể hoàn tác")
  ) {
    return { tone: "error", icon: "bell" };
  }
  if (
    text.includes("cảnh báo") ||
    text.includes("chưa") ||
    text.includes("yêu cầu")
  ) {
    return { tone: "warning", icon: "bell" };
  }
  if (
    text.includes("thông tin") ||
    text.includes("chi tiết") ||
    text.includes("đang") ||
    text.includes("khôi phục")
  ) {
    return { tone: "info", icon: "bell" };
  }
  return { tone: "success", icon: "check" };
}
