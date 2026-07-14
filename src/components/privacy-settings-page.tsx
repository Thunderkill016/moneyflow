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
  RAW_RETENTION_OPTIONS,
  defaultPrivacyPrefs,
  formatPrivacyActivityAt,
  readPrivacyPrefs,
  savePrivacyPrefs,
  type PrivacyPrefs,
  type RawRetention,
} from "@/lib/privacy-prefs";

/**
 * Privacy settings (wireframes-inbox §18).
 * Local prefs: raw retention + opt-in improve parser (default off).
 */
export function PrivacySettingsPage({ viewer }: { viewer: ViewerSummary }) {
  const formId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [prefs, setPrefs] = useState<PrivacyPrefs>(defaultPrivacyPrefs);
  const [rawRetention, setRawRetention] = useState<RawRetention>("days_7");
  const [improveParser, setImproveParser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");

  function reload() {
    try {
      const stored = readPrivacyPrefs();
      setPrefs(stored);
      setRawRetention(stored.rawRetention);
      setImproveParser(stored.improveParser);
      setInboxCount(countPending(readStoredCandidates()));
      setDirty(false);
      setError(null);
    } catch {
      setError("Không đọc được tùy chọn quyền riêng tư từ trình duyệt. Thử tải lại trang.");
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
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function onRetentionChange(value: RawRetention) {
    setRawRetention(value);
    setDirty(true);
  }

  function onImproveChange(checked: boolean) {
    setImproveParser(checked);
    setDirty(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const next = savePrivacyPrefs({
        rawRetention,
        improveParser,
      });
      setPrefs(next);
      setDirty(false);
      setNotice("Đã lưu tùy chọn quyền riêng tư.");
      setError(null);
    } catch {
      setError("Không lưu được tùy chọn. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setRawRetention(prefs.rawRetention);
    setImproveParser(prefs.improveParser);
    setDirty(false);
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
      <main className="dashboard privacy-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Cài đặt</p>
            <h1>Quyền riêng tư</h1>
            <p>
              Kiểm soát thời gian giữ file gốc và việc dùng mẫu ẩn danh. Mặc định
              không gửi dữ liệu để cải thiện parser.
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
            aria-label="Đang tải quyền riêng tư"
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
          <form
            id={formId}
            className="privacy-form"
            onSubmit={onSubmit}
            noValidate
          >
            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-retention-heading`}
            >
              <h2 id={`${formId}-retention-heading`}>Lưu file gốc (raw)</h2>
              <p className="privacy-panel-lead">
                Áp dụng cho meta / bản nháp import trên thiết bị này. Bản
                local-first không upload file gốc lên máy chủ.
              </p>
              <fieldset className="privacy-fieldset">
                <legend className="sr-only">Thời gian giữ file gốc</legend>
                <div className="privacy-radio-list" role="radiogroup" aria-label="Lưu file gốc">
                  {RAW_RETENTION_OPTIONS.map((option) => {
                    const inputId = `${formId}-ret-${option.value}`;
                    const selected = rawRetention === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={inputId}
                        className={`privacy-radio-card${selected ? " is-selected" : ""}`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="rawRetention"
                          value={option.value}
                          checked={selected}
                          onChange={() => onRetentionChange(option.value)}
                          disabled={saving}
                        />
                        <span className="privacy-radio-body">
                          <span className="privacy-radio-label">{option.label}</span>
                          <span className="privacy-radio-desc">{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-improve-heading`}
            >
              <h2 id={`${formId}-improve-heading`}>Cải thiện parser</h2>
              <label
                className="privacy-check-row"
                htmlFor={`${formId}-improve`}
              >
                <input
                  id={`${formId}-improve`}
                  type="checkbox"
                  checked={improveParser}
                  onChange={(e) => onImproveChange(e.target.checked)}
                  disabled={saving}
                />
                <span>
                  <span className="privacy-check-title">
                    Cho phép dùng mẫu đã ẩn danh để cải thiện parser
                  </span>
                  <span className="privacy-check-desc">
                    Tắt mặc định. Không gửi số dư, tên tài khoản hay dữ liệu nhận
                    diện cá nhân khi bật.
                  </span>
                </span>
              </label>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-log-heading`}
            >
              <h2 id={`${formId}-log-heading`}>Nhật ký</h2>
              <ul className="privacy-activity-list">
                <li>
                  <span className="privacy-activity-label">Xuất dữ liệu gần nhất</span>
                  <time
                    className="privacy-activity-value font-mono"
                    dateTime={prefs.lastExportAt ?? undefined}
                  >
                    {formatPrivacyActivityAt(prefs.lastExportAt)}
                  </time>
                </li>
                <li>
                  <span className="privacy-activity-label">Xóa dữ liệu gần nhất</span>
                  <time
                    className="privacy-activity-value font-mono"
                    dateTime={prefs.lastDeleteAt ?? undefined}
                  >
                    {formatPrivacyActivityAt(prefs.lastDeleteAt)}
                  </time>
                </li>
                <li>
                  <span className="privacy-activity-label">Lần lưu tùy chọn</span>
                  <time
                    className="privacy-activity-value font-mono"
                    dateTime={prefs.updatedAt ?? undefined}
                  >
                    {formatPrivacyActivityAt(prefs.updatedAt)}
                  </time>
                </li>
              </ul>
              <p className="privacy-activity-hint">
                Nhật ký chỉ lưu trên trình duyệt này. Trang Xuất / Xóa tài khoản
                (sắp có) sẽ ghi lại các mốc này.
              </p>
            </section>

            <div className="privacy-form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving || !dirty}
              >
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={saving || !dirty}
                onClick={onReset}
              >
                Hoàn tác
              </button>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
