"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
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
import styles from "./settings/settings-surfaces.module.css";

function permissionLabel(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") return "Đã cho phép";
  if (permission === "denied") return "Bị trình duyệt chặn";
  if (permission === "unsupported") return "Không được hỗ trợ";
  return "Chưa yêu cầu";
}

export function NotificationSettingsPage({ viewer }: { viewer: ViewerSummary }) {
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
      setError("Không đọc được tùy chọn thông báo trên trình duyệt. Thử lại.");
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
    if (saving || !dirty) return;
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
        const nextPermission = await requestNotificationPermission();
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          nextEnabled = false;
          setEnabled(false);
          statusNotice =
            nextPermission === "denied"
              ? "Trình duyệt chặn thông báo — opt-in vẫn tắt."
              : "Chưa được cấp quyền thông báo — opt-in vẫn tắt.";
        } else {
          statusNotice = "Đã bật nhắc cam kết. Nội dung không có số tiền.";
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
      const nextPermission = await requestNotificationPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setNotice(notifyResultMessage("denied"));
        return;
      }
      const result = await showDueNotification({
        title: "Cam kết đến hạn",
        body: "Đây là thông báo thử. MoneyFlow không hiện số tiền trong nhắc nhở.",
        tag: "moneyflow-commitment-test",
        url: "/commitments",
      });
      setNotice(
        result === "shown"
          ? "Đã gửi thông báo thử không có số tiền."
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
        onClick: () =>
          (document.getElementById("notification-settings-form") as HTMLFormElement | null)?.requestSubmit(),
        disabled: saving || !ready || Boolean(error) || !dirty,
        icon: "check",
      }}
    >
      <SecondaryWorkspace slot="settings-notifications-workspace">
        <SecondaryHeader
          section="Cài đặt"
          title="Thông báo cam kết"
          description={
            <p>
              Thông báo mặc định tắt và chỉ được bật sau khi bạn lưu cùng quyền của
              trình duyệt. Nội dung không bao gồm số tiền hoặc số tài khoản.
            </p>
          }
          actions={
            <>
              <LinkButton href="/settings" intent="secondary" targetSize="important">
                Cài đặt
              </LinkButton>
              <LinkButton
                href="/commitments"
                intent="secondary"
                targetSize="important"
              >
                Cam kết
              </LinkButton>
            </>
          }
        />

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải thông báo">
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button type="button" intent="secondary" targetSize="important" onClick={reload}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error && !supported ? (
          <Alert tone="warning" live="polite">
            <AlertDescription>
              Trình duyệt này không hỗ trợ Notification + Service Worker. Cam kết
              vẫn xem được trong ứng dụng nhưng không thể bật thông báo web.
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error ? (
          <form id="notification-settings-form" className={styles.form} onSubmit={onSubmit} noValidate>
            <SecondarySection
              title="Opt-in nhắc nhở"
              description={
                <p>
                  MoneyFlow chỉ yêu cầu quyền khi bạn bật và lưu. Tối đa một nhắc mỗi
                  ngày khi có cam kết trong cửa sổ đến hạn.
                </p>
              }
              contained
              slot="settings-section"
            >
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => {
                    setEnabled(event.target.checked);
                    setDirty(true);
                  }}
                  disabled={saving || !supported}
                />
                <span className={styles.checkBody}>
                  <span className={styles.checkTitle}>Bật nhắc khoản định kỳ đến hạn</span>
                  <span className={styles.checkDescription}>
                    Quyền trình duyệt: {permissionLabel(permission)}. Không tự bật và
                    không gửi số tiền trong nội dung.
                  </span>
                </span>
              </label>
            </SecondarySection>

            <SecondarySection
              title="Cửa sổ nhắc"
              description={
                <p>
                  {enabled
                    ? "Chọn thời điểm bắt đầu coi cam kết là sắp đến hạn."
                    : "Bật opt-in trước để cửa sổ này có hiệu lực."}
                </p>
              }
              contained
              slot="settings-section"
            >
              <fieldset disabled={!enabled || saving}>
                <legend className="sr-only">Số ngày trước hạn</legend>
                <div className={styles.radioList}>
                  {PUSH_DAYS_AHEAD_OPTIONS.map((option) => {
                    const selected = daysAhead === option.value;
                    return (
                      <label
                        key={option.value}
                        className={
                          selected
                            ? `${styles.radioCard} ${styles.radioSelected}`
                            : styles.radioCard
                        }
                      >
                        <input
                          type="radio"
                          name="daysAhead"
                          value={option.value}
                          checked={selected}
                          onChange={() => {
                            setDaysAhead(option.value);
                            setDirty(true);
                          }}
                        />
                        <span className={styles.radioBody}>
                          <span className={styles.radioLabel}>{option.label}</span>
                          <span className={styles.radioDescription}>{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </SecondarySection>

            <SecondarySection
              title="Nội dung thông báo"
              description={<p>Số tiền luôn bị loại khỏi nội dung notification.</p>}
              contained
              slot="settings-section"
            >
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={includeNames}
                  onChange={(event) => {
                    setIncludeNames(event.target.checked);
                    setDirty(true);
                  }}
                  disabled={saving}
                />
                <span className={styles.checkBody}>
                  <span className={styles.checkTitle}>Hiện tên cam kết</span>
                  <span className={styles.checkDescription}>
                    Tắt: chỉ hiện số lượng. Bật: có thể hiện vài tên như “Tiền nhà,
                    Netflix”; vẫn không hiện số tiền.
                  </span>
                </span>
              </label>
            </SecondarySection>

            <SecondarySection
              title="Trạng thái"
              description={<p>Nhật ký này được lưu trên thiết bị hiện tại.</p>}
              contained
              slot="settings-section"
            >
              <ul className={styles.activityList}>
                <li>
                  <span className={styles.activityLabel}>Opt-in đã lưu</span>
                  <span className={styles.activityValue}>{prefs.enabled ? "Đang bật" : "Tắt"}</span>
                </li>
                <li>
                  <span className={styles.activityLabel}>Nhắc gần nhất</span>
                  <span className={styles.activityValue}>
                    {prefs.lastNotifiedOn ?? "Chưa có"}
                    {prefs.lastNotifiedCount > 0 ? ` · ${prefs.lastNotifiedCount} khoản` : ""}
                  </span>
                </li>
                <li>
                  <span className={styles.activityLabel}>Cập nhật tùy chọn</span>
                  <time className={styles.activityValue} dateTime={prefs.updatedAt ?? undefined}>
                    {formatPushActivityAt(prefs.updatedAt, "Chưa lưu")}
                  </time>
                </li>
              </ul>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                pending={testing}
                pendingLabel="Đang gửi…"
                onClick={onTest}
                disabled={testing || !supported}
              >
                <Icon name="bell" />
                Gửi thông báo thử
              </Button>
            </SecondarySection>

            <div className={styles.formActions}>
              <Button
                type="submit"
                intent="primary"
                targetSize="important"
                pending={saving}
                pendingLabel="Đang lưu…"
                disabled={!dirty}
              >
                Lưu
              </Button>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                disabled={saving || !dirty}
                onClick={onReset}
              >
                Hủy thay đổi
              </Button>
            </div>
          </form>
        ) : null}
      </SecondaryWorkspace>
    </AppShell>
  );
}
