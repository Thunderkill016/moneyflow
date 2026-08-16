"use client";

import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import {
  viewerInitial,
  viewerLabel,
  type ViewerSummary,
} from "@/components/user-chip";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CAPTURE_OPTIONS } from "@/lib/capture/options";
import {
  ADVANCED_NAV_LINKS,
  MORE_NAV_LINKS,
  PLANNING_LINKS,
} from "@/lib/nav-ia";
import styles from "./app-shell.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function pathIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CaptureSheetOverlay({
  open,
  onClose,
  inboxCount,
  placementClasses,
}: {
  open: boolean;
  onClose: () => void;
  inboxCount: number;
  placementClasses: string;
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
      className={cx(styles.shellSheet, placementClasses)}
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

export function MoreSheetOverlay({
  open,
  onClose,
  pathname,
  inboxCount,
  viewer,
  placementClasses,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  inboxCount: number;
  viewer: ViewerSummary;
  placementClasses: string;
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
      className={cx(styles.shellSheet, placementClasses)}
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
