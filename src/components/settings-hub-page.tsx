"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import { getPendingCountForClient } from "@/hooks/client-inbox";
import styles from "./settings/settings-surfaces.module.css";

type SettingsLink = {
  href: string;
  title: string;
  description: string;
  icon: IconName;
  danger?: boolean;
};

const SETTINGS_LINKS: SettingsLink[] = [
  {
    href: "/categories",
    title: "Danh mục",
    description: "Thêm, sửa, ẩn hoặc hiện lại danh mục thu và chi.",
    icon: "spark",
  },
  {
    href: "/settings/privacy",
    title: "Quyền riêng tư",
    description: "Nơi lưu draft, khả năng đang hoạt động và nhật ký trên thiết bị.",
    icon: "lock",
  },
  {
    href: "/settings/notifications",
    title: "Thông báo cam kết",
    description: "Opt-in nhắc khoản đến hạn mà không hiện số tiền nhạy cảm.",
    icon: "bell",
  },
  {
    href: "/settings/export",
    title: "Xuất giao dịch và Inbox",
    description: "Tải CSV/JSON của các bản ghi được hỗ trợ; chưa phải bản sao lưu đầy đủ.",
    icon: "arrowDown",
  },
  {
    href: "/settings/backup",
    title: "Bản sao lưu MoneyFlow",
    description: "Tải bản sao lưu đầy đủ có thể khôi phục, hoặc khôi phục vào tài khoản mới.",
    icon: "archive",
  },
  {
    href: "/settings/appearance",
    title: "Giao diện",
    description: "Chế độ sáng, tối hoặc theo hệ thống cho workspace đăng nhập.",
    icon: "spark",
  },
  {
    href: "/settings/delete-account",
    title: "Xóa tài khoản",
    description: "Xóa vĩnh viễn tài khoản máy chủ rồi dọn dữ liệu trên thiết bị.",
    icon: "trash",
    danger: true,
  },
];

export function SettingsHubPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);

  /* Demo keeps pending candidates on the device; an authenticated workspace
     owns them on the server and its local store is cleared after migration.
     getPendingCountForClient is the one reader that knows both. */
  function reload() {
    setError(null);
    getPendingCountForClient(viewer.isDemo)
      .then(setInboxCount)
      .catch(() =>
        setError("Không tải được dữ liệu cài đặt trên thiết bị. Hãy thử lại."),
      );
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per route load
  }, []);

  return (
    <AppShell viewer={viewer} inboxCount={inboxCount}>
      <SecondaryWorkspace slot="settings-workspace">
        <SecondaryHeader
          section="Tài khoản"
          title="Cài đặt"
          description={
            <>
              <p>
                Quản lý danh mục, giao diện và các quyền dữ liệu. MoneyFlow phân biệt
                rõ dữ liệu trên máy chủ với dữ liệu tạm hoặc tùy chọn trên thiết bị.
              </p>
              <ul className={styles.trustBar} aria-label="Cam kết tin cậy">
                <li>
                  <Icon name="lock" />
                  Không hỏi mật khẩu ngân hàng
                </li>
                <li>
                  <Icon name="arrowDown" />
                  Xuất giao dịch bất cứ lúc nào
                </li>
                <li>
                  <Icon name="trash" />
                  Xóa khi bạn yêu cầu
                </li>
              </ul>
            </>
          }
          actions={
            <>
              <LinkButton
                href="/settings/export"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="arrowDown" />
                Xuất dữ liệu
              </LinkButton>
              <LinkButton href="/privacy" intent="quiet" targetSize="important">
                Chính sách
              </LinkButton>
            </>
          }
        />

        {!ready ? (
          <section
            className={styles.loading}
            aria-busy="true"
            aria-label="Đang tải cài đặt"
          >
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={reload}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error ? (
          <SecondarySection
            title="Các mục cài đặt"
            description={<p>Mỗi mục ghi rõ phạm vi và hậu quả trước khi bạn thay đổi.</p>}
            slot="settings-section"
          >
            <nav aria-label="Mục cài đặt">
              <ul className={styles.hubList}>
                {SETTINGS_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        item.danger
                          ? `${styles.hubCard} ${styles.hubDanger}`
                          : styles.hubCard
                      }
                    >
                      <span className={styles.hubIcon} aria-hidden="true">
                        <Icon name={item.icon} />
                      </span>
                      <span className={styles.hubBody}>
                        <span className={styles.hubTitle}>{item.title}</span>
                        <span className={styles.hubDescription}>{item.description}</span>
                      </span>
                      <Icon name="arrowRight" className={styles.hubChevron} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </SecondarySection>
        ) : null}
      </SecondaryWorkspace>
    </AppShell>
  );
}
