"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Icon, type IconName } from "@/components/icons";
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
import {
  ToastRegion,
  type ToastMessage,
  type ToastTone,
} from "@/components/ui/toast";
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

const CaptureSheetOverlay = dynamic(
  () =>
    import("./app-shell-overlays").then((mod) => mod.CaptureSheetOverlay),
  { ssr: false },
);
const MoreSheetOverlay = dynamic(
  () => import("./app-shell-overlays").then((mod) => mod.MoreSheetOverlay),
  { ssr: false },
);

const INBOX_BADGE_COUNT = 0;

/**
 * Position only — height belongs to `.shellSheet` alone.
 *
 * Keep the class list at the AppShell owner even though the sheet bodies are
 * lazy-loaded. That preserves the single geometry authority established by the
 * physical-phone remediation while letting closed overlays leave first-paint JS.
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

      {captureOpen ? (
        <CaptureSheetOverlay
          open
          onClose={() => setCaptureOpen(false)}
          inboxCount={inboxCount}
          className={APP_SHELL_SHEET_CLASS}
        />
      ) : null}
      {moreOpen ? (
        <MoreSheetOverlay
          open
          onClose={() => setMoreOpen(false)}
          pathname={pathname}
          inboxCount={inboxCount}
          viewer={viewer}
          className={APP_SHELL_SHEET_CLASS}
        />
      ) : null}
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
