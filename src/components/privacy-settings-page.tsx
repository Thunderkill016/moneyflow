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
import { getPendingCountForClient } from "@/hooks/client-inbox";
import {
  PARSER_IMPROVEMENT_AVAILABLE,
  RAW_RETENTION_OPTIONS,
  defaultPrivacyPrefs,
  formatPrivacyActivityAt,
  readPrivacyPrefs,
  savePrivacyPrefs,
  type PrivacyPrefs,
  type RawRetention,
} from "@/lib/privacy-prefs";
import styles from "./settings/settings-surfaces.module.css";

export function PrivacySettingsPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [prefs, setPrefs] = useState<PrivacyPrefs>(defaultPrivacyPrefs);
  const [rawRetention, setRawRetention] = useState<RawRetention>("days_7");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");

  function reload() {
    try {
      const stored = readPrivacyPrefs();
      setPrefs(stored);
      setRawRetention(stored.rawRetention);
      setDirty(false);
      setError(null);
    } catch {
      setError("Không đọc được tùy chọn quyền riêng tư trên trình duyệt. Thử lại.");
    }
  }

  /* Demo keeps pending candidates on the device; an authenticated workspace
     owns them on the server and its local store is cleared after migration.
     getPendingCountForClient is the one reader that knows both. */
  useEffect(() => {
    let cancelled = false;
    void getPendingCountForClient(viewer.isDemo).then((count) => {
      if (!cancelled) setInboxCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const next = savePrivacyPrefs({
        rawRetention,
        improveParser: false,
      });
      setPrefs(next);
      setDirty(false);
      setNotice("Đã lưu thời gian giữ draft import.");
      setError(null);
    } catch {
      setError("Không lưu được tùy chọn. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setRawRetention(prefs.rawRetention);
    setDirty(false);
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: saving ? "Đang lưu…" : "Lưu",
        onClick: () =>
          (document.getElementById("privacy-settings-form") as HTMLFormElement | null)?.requestSubmit(),
        disabled: saving || !ready || Boolean(error) || !dirty,
        icon: "check",
      }}
    >
      <SecondaryWorkspace slot="settings-privacy-workspace">
        <SecondaryHeader
          section="Cài đặt · Quyền dữ liệu"
          title="Quyền riêng tư"
          description={
            <>
              <p>
                MoneyFlow không hỏi mật khẩu ngân hàng hoặc OTP. Trang này chỉ quản
                lý thời gian giữ draft import trên thiết bị và hiển thị trạng thái
                những khả năng dữ liệu đang thực sự hoạt động.
              </p>
              <ul className={styles.trustBar} aria-label="Cam kết tin cậy">
                <li>
                  <Icon name="lock" />
                  Không mật khẩu ngân hàng
                </li>
                <li>
                  <Icon name="arrowDown" />
                  Xuất giao dịch/Inbox
                </li>
                <li>
                  <Icon name="trash" />
                  Yêu cầu xóa tài khoản
                </li>
              </ul>
            </>
          }
          actions={
            <>
              <LinkButton href="/settings" intent="secondary" targetSize="important">
                Cài đặt
              </LinkButton>
              <LinkButton
                href="/settings/export"
                intent="secondary"
                targetSize="important"
              >
                Xuất dữ liệu
              </LinkButton>
              <LinkButton href="/privacy" intent="quiet" targetSize="important">
                Chính sách
              </LinkButton>
            </>
          }
        />

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải quyền riêng tư">
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

        {ready && !error ? (
          <form id="privacy-settings-form" className={styles.form} onSubmit={onSubmit} noValidate>
            <SecondarySection
              title="Giữ draft import trên thiết bị"
              description={
                <p>
                  MoneyFlow không giữ file gốc trong preference này. Chỉ các dòng đã
                  parse và đoạn mô tả ngắn có thể được giữ để tiếp tục xem trước.
                </p>
              }
              contained
              slot="settings-section"
            >
              <fieldset>
                <legend className="sr-only">Thời gian giữ draft import</legend>
                <div className={styles.radioList}>
                  {RAW_RETENTION_OPTIONS.map((option) => {
                    const selected = rawRetention === option.value;
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
                          name="rawRetention"
                          value={option.value}
                          checked={selected}
                          onChange={() => {
                            setRawRetention(option.value);
                            setDirty(true);
                          }}
                          disabled={saving}
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
              title="Cải thiện parser"
              description={<p>Trạng thái khả năng gửi mẫu để cải thiện parser.</p>}
              contained
              slot="privacy-capability-status"
            >
              <div className={`${styles.checkRow} ${styles.disabledCapability}`}>
                <input type="checkbox" checked={false} disabled readOnly />
                <span className={styles.checkBody}>
                  <span className={styles.checkTitle}>Chia sẻ mẫu đã ẩn danh</span>
                  <span className={styles.checkDescription}>
                    Chưa khả dụng. MoneyFlow hiện không có pipeline gửi mẫu parser,
                    quy tắc ẩn danh, thời gian lưu hoặc cơ chế rút consent để thực thi
                    khả năng này.
                  </span>
                </span>
              </div>
              <span className={styles.capabilityStatus}>
                {PARSER_IMPROVEMENT_AVAILABLE ? "Đang khả dụng" : "Chưa khả dụng · không ghi consent"}
              </span>
            </SecondarySection>

            <SecondarySection
              title="Nhật ký trên thiết bị"
              description={<p>Các mốc này chỉ được lưu trong browser hiện tại.</p>}
              contained
              slot="settings-section"
            >
              <ul className={styles.activityList}>
                <li>
                  <span className={styles.activityLabel}>Xuất dữ liệu gần nhất</span>
                  <time className={styles.activityValue} dateTime={prefs.lastExportAt ?? undefined}>
                    {formatPrivacyActivityAt(prefs.lastExportAt)}
                  </time>
                </li>
                <li>
                  <span className={styles.activityLabel}>Xóa dữ liệu gần nhất</span>
                  <time className={styles.activityValue} dateTime={prefs.lastDeleteAt ?? undefined}>
                    {formatPrivacyActivityAt(prefs.lastDeleteAt)}
                  </time>
                </li>
                <li>
                  <span className={styles.activityLabel}>Lưu tùy chọn gần nhất</span>
                  <time className={styles.activityValue} dateTime={prefs.updatedAt ?? undefined}>
                    {formatPrivacyActivityAt(prefs.updatedAt)}
                  </time>
                </li>
              </ul>
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
                Hoàn tác
              </Button>
            </div>
          </form>
        ) : null}
      </SecondaryWorkspace>
    </AppShell>
  );
}
