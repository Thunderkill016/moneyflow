"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import {
  isNotificationSupported,
  notificationPermission,
  notifyResultMessage,
  registerPushServiceWorker,
  requestNotificationPermission,
  showDueNotification,
} from "@/lib/push-client";
import {
  PUSH_DAYS_AHEAD_OPTIONS,
  defaultPushPrefs,
  formatPushActivityAt,
  readPushPrefs,
  savePushPrefs,
  type PushDaysAhead,
  type PushPrefs,
} from "@/lib/push-prefs";

/**
 * TASK-130 — Opt-in web notifications for due commitments.
 * Privacy-first: default off; bodies never include amounts.
 */
export function NotificationSettingsPage({ viewer }: { viewer: ViewerSummary }) {
  const formId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [prefs, setPrefs] = useState<PushPrefs>(defaultPushPrefs);
  const [enabled, setEnabled] = useState(false);
  const [daysAhead, setDaysAhead] = useState<PushDaysAhead>(1);
  const [includeNames, setIncludeNames] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [supported, setSupported] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [testing, setTesting] = useState(false);

  function reload() {
    try {
      const stored = readPushPrefs();
      setPrefs(stored);
      setEnabled(stored.enabled);
      setDaysAhead(stored.daysAhead);
      setIncludeNames(stored.includeNames);
      setInboxCount(countPending(readStoredCandidates()));
      setSupported(isNotificationSupported());
      setPermission(notificationPermission());
      setDirty(false);
      setError(null);
    } catch {
      setError("Không đọc được tùy chọn thông báo từ trình duyệt. Thử tải lại trang.");
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let nextEnabled = enabled;
      let statusNotice = "Đã lưu tùy chọn thông báo.";
      if (enabled) {
        if (!isNotificationSupported()) {
          setError("Trình duyệt không hỗ trợ thông báo web.");
          setSaving(false);
          return;
        }
        await registerPushServiceWorker();
        const perm = await requestNotificationPermission();
        setPermission(perm);
        if (perm !== "granted") {
          nextEnabled = false;
          setEnabled(false);
          statusNotice =
            perm === "denied"
              ? "Trình duyệt chặn thông báo — đã giữ tắt opt-in."
              : "Chưa được cấp quyền thông báo — đã giữ tắt opt-in.";
        } else {
          statusNotice =
            "Đã bật nhắc cam kết đến hạn (opt-in). Không gửi số tiền.";
        }
      }

      const next = savePushPrefs({
        enabled: nextEnabled,
        daysAhead,
        includeNames,
      });
      setPrefs(next);
      setDirty(false);
      setNotice(statusNotice);
      setError(null);
    } catch {
      setError("Không lưu được tùy chọn. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setEnabled(prefs.enabled);
    setDaysAhead(prefs.daysAhead);
    setIncludeNames(prefs.includeNames);
    setDirty(false);
  }

  async function onTest() {
    if (testing) return;
    setTesting(true);
    try {
      if (!isNotificationSupported()) {
        setNotice(notifyResultMessage("unsupported"));
        return;
      }
      await registerPushServiceWorker();
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setNotice(notifyResultMessage("denied"));
        return;
      }
      const result = await showDueNotification({
        title: "Cam kết đến hạn",
        body: "Đây là thông báo thử. Money Flow không hiện số tiền trong nhắc nhở.",
        tag: "moneyflow-commitment-test",
        url: "/commitments",
      });
      setNotice(
        result === "shown"
          ? "Đã gửi thông báo thử (không có số tiền)."
          : notifyResultMessage(result),
      );
    } catch {
      setNotice(notifyResultMessage("error"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: saving ? "Đang lưu…" : "Lưu",
        onClick: () => {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          form?.requestSubmit();
        },
        disabled: saving || !ready || Boolean(error) || !dirty,
        icon: "check",
      }}
    >
      <main className="dashboard privacy-workspace notification-settings-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Cài đặt</p>
            <h1>Thông báo cam kết</h1>
            <p>
              Nhắc khi khoản định kỳ đến hạn. Mặc định tắt. Nội dung không gồm
              số tiền hay số tài khoản — chỉ số lượng (hoặc tên nếu bạn bật).
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
            <Link className="secondary-button" href="/commitments">
              <Icon name="calendar" />
              Cam kết
            </Link>
          </div>
        </section>

        {!ready && (
          <section
            className="panel privacy-loading"
            aria-busy="true"
            aria-label="Đang tải tùy chọn thông báo"
          >
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="loading-line" />
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
          <form id={formId} className="privacy-form" onSubmit={onSubmit} noValidate>
            {!supported && (
              <section className="panel privacy-panel" role="status">
                <p>
                  Trình duyệt hiện tại không hỗ trợ thông báo web (Service Worker
                  + Notification). Bạn vẫn có thể theo dõi cam kết trên trang{" "}
                  <Link href="/commitments">Cam kết</Link>.
                </p>
              </section>
            )}

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-opt-in-heading`}
            >
              <h2 id={`${formId}-opt-in-heading`}>Opt-in nhắc nhở</h2>
              <p className="privacy-panel-lead">
                Money Flow không tự bật thông báo. Nhắc chạy trên thiết bị này
                khi bạn mở app (và qua service worker khi được hỗ trợ). Không
                gửi số dư hay số tiền ra ngoài.
              </p>
              <label className="privacy-check-row" htmlFor={`${formId}-enabled`}>
                <input
                  id={`${formId}-enabled`}
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setDirty(true);
                  }}
                  disabled={saving || !supported}
                />
                <span>
                  <span className="privacy-check-title">
                    Bật nhắc khoản định kỳ đến hạn
                  </span>
                  <span className="privacy-check-desc">
                    Quyền trình duyệt:{" "}
                    {permission === "granted"
                      ? "đã cho phép"
                      : permission === "denied"
                        ? "bị chặn"
                        : permission === "unsupported"
                          ? "không hỗ trợ"
                          : "chưa hỏi"}
                    . Tối đa một nhắc mỗi ngày khi có khoản đến hạn.
                  </span>
                </span>
              </label>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-window-heading`}
            >
              <h2 id={`${formId}-window-heading`}>Cửa sổ nhắc</h2>
              <fieldset className="privacy-fieldset">
                <legend className="sr-only">Số ngày trước hạn</legend>
                <div
                  className="privacy-radio-list"
                  role="radiogroup"
                  aria-label="Cửa sổ nhắc cam kết"
                >
                  {PUSH_DAYS_AHEAD_OPTIONS.map((option) => {
                    const inputId = `${formId}-days-${option.value}`;
                    const selected = daysAhead === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={inputId}
                        className={`privacy-radio-card${selected ? " is-selected" : ""}`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="daysAhead"
                          value={option.value}
                          checked={selected}
                          onChange={() => {
                            setDaysAhead(option.value);
                            setDirty(true);
                          }}
                          disabled={saving}
                        />
                        <span className="privacy-radio-body">
                          <span className="privacy-radio-label">{option.label}</span>
                          <span className="privacy-radio-desc">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-privacy-heading`}
            >
              <h2 id={`${formId}-privacy-heading`}>Quyền riêng tư nội dung</h2>
              <label
                className="privacy-check-row"
                htmlFor={`${formId}-names`}
              >
                <input
                  id={`${formId}-names`}
                  type="checkbox"
                  checked={includeNames}
                  onChange={(e) => {
                    setIncludeNames(e.target.checked);
                    setDirty(true);
                  }}
                  disabled={saving}
                />
                <span>
                  <span className="privacy-check-title">
                    Hiện tên khoản (không hiện số tiền)
                  </span>
                  <span className="privacy-check-desc">
                    Tắt mặc định: chỉ “Bạn có N khoản…”. Bật để hiện vài tên như
                    “Tiền nhà, Netflix” — vẫn không gồm số tiền.
                  </span>
                </span>
              </label>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-log-heading`}
            >
              <h2 id={`${formId}-log-heading`}>Trạng thái</h2>
              <ul className="privacy-activity-list">
                <li>
                  <span className="privacy-activity-label">Opt-in</span>
                  <span className="privacy-activity-value">
                    {prefs.enabled ? "Đang bật" : "Tắt"}
                  </span>
                </li>
                <li>
                  <span className="privacy-activity-label">Nhắc gần nhất</span>
                  <span className="privacy-activity-value font-mono">
                    {prefs.lastNotifiedOn ?? "Chưa có"}
                    {prefs.lastNotifiedCount > 0
                      ? ` · ${prefs.lastNotifiedCount} khoản`
                      : ""}
                  </span>
                </li>
                <li>
                  <span className="privacy-activity-label">Cập nhật tùy chọn</span>
                  <time
                    className="privacy-activity-value font-mono"
                    dateTime={prefs.updatedAt ?? undefined}
                  >
                    {formatPushActivityAt(prefs.updatedAt, "Chưa lưu")}
                  </time>
                </li>
              </ul>
              <div className="notification-settings-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onTest}
                  disabled={testing || !supported}
                >
                  <Icon name="bell" />
                  {testing ? "Đang gửi…" : "Gửi thông báo thử"}
                </button>
                {dirty && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={onReset}
                    disabled={saving}
                  >
                    Hủy thay đổi
                  </button>
                )}
              </div>
            </section>
          </form>
        )}
      </main>
    </AppShell>
  );
}
