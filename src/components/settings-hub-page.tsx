"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";

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
    description: "Thêm, đổi tên hoặc ẩn danh mục chi tiêu và thu nhập.",
    icon: "spark",
  },
  {
    href: "/settings/privacy",
    title: "Quyền riêng tư",
    description: "Giữ file gốc, opt-in cải thiện parser, nhật ký xuất/xóa.",
    icon: "lock",
  },
  {
    href: "/settings/notifications",
    title: "Thông báo cam kết",
    description: "Opt-in nhắc khoản đến hạn. Không hiện số tiền.",
    icon: "bell",
  },
  {
    href: "/settings/export",
    title: "Xuất dữ liệu",
    description: "Tải giao dịch đã duyệt hoặc ứng viên Inbox (CSV/JSON).",
    icon: "arrowDown",
  },
  {
    href: "/settings/appearance",
    title: "Giao diện",
    description: "Chế độ sáng, tối hoặc theo hệ thống.",
    icon: "spark",
  },
  {
    href: "/settings/delete-account",
    title: "Xóa tài khoản",
    description: "Xóa dữ liệu trên thiết bị. Không hoàn tác.",
    icon: "trash",
    danger: true,
  },
];

/**
 * Settings hub (sitemap /settings).
 * Links privacy, export, appearance, delete-account.
 */
export function SettingsHubPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);

  function reload() {
    try {
      setInboxCount(countPending(readStoredCandidates()));
      setError(null);
    } catch {
      setError("Không tải được cài đặt. Thử lại.");
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <AppShell viewer={viewer} inboxCount={inboxCount}>
      <main className="dashboard privacy-workspace settings-hub-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Tài khoản</p>
            <h1>Cài đặt</h1>
            <p>
              Danh mục thu chi, quyền riêng tư, thông báo cam kết, xuất dữ liệu,
              giao diện và xóa tài khoản. Dữ liệu của bạn thuộc về bạn.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Inbox
            </Link>
          </div>
        </section>

        {!ready && (
          <section
            className="panel privacy-loading"
            aria-busy="true"
            aria-label="Đang tải cài đặt"
          >
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="settings-hub-skeleton">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="settings-hub-skel-row" key={index}>
                  <span className="loading-line settings-hub-skel-icon" />
                  <span className="loading-line settings-hub-skel-text" />
                </div>
              ))}
            </div>
          </section>
        )}

        {ready && error && (
          <section className="panel privacy-error" role="alert">
            <p>{error}</p>
            <button type="button" className="secondary-button" onClick={reload}>
              Thử lại
            </button>
          </section>
        )}

        {ready && !error && (
          <nav className="settings-hub-nav" aria-label="Mục cài đặt">
            <ul className="settings-hub-list">
              {SETTINGS_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`settings-hub-card${item.danger ? " is-danger" : ""}`}
                  >
                    <span
                      className={`settings-hub-icon${item.danger ? " is-danger" : ""}`}
                      aria-hidden
                    >
                      <Icon name={item.icon} />
                    </span>
                    <span className="settings-hub-body">
                      <span className="settings-hub-title">{item.title}</span>
                      <span className="settings-hub-desc">{item.description}</span>
                    </span>
                    <Icon name="arrowRight" className="settings-hub-chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </AppShell>
  );
}
