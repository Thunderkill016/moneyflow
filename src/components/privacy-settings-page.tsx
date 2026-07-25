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
 * Privacy settings (wireframes-inbox §18 + R8 G5 trust).
 * Lead with ownership / no bank password; parsed-draft preferences secondary.
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
              <strong>Dữ liệu của bạn thuộc về bạn.</strong> MoneyFlow không hỏi
              mật khẩu ngân hàng. Bạn xuất hoặc xóa bất cứ lúc nào.
            </p>
            <ul className="settings-trust-bar" aria-label="Cam kết tin cậy">
              <li>
                <Icon name="lock" size={14} />
                <span>Không mật khẩu NH</span>
              </li>
              <li>
                <Icon name="arrowDown" size={14} />
                <span>Xuất CSV</span>
              </li>
              <li>
                <Icon name="trash" size={14} />
                <span>Xóa khi muốn</span>
              </li>
            </ul>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
            <Link className="secondary-button" href="/settings/export">
              <Icon name="arrowDown" />
              Xuất dữ liệu
            </Link>
            <Link className="secondary-button" href="/privacy">
              <Icon name="lock" />
              Chính sách
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
              className="panel privacy-panel privacy-trust-panel"
              aria-labelledby={`${formId}-trust-heading`}
            >
              <h2 id={`${formId}-trust-heading`}>Cam kết tin cậy</h2>
              <p className="privacy-panel-lead">
                Không kết nối ngân hàng, không lấy mật khẩu NH / OTP. Sổ thu chi
                của bạn — mang đi (xuất) hoặc xóa khi cần. Chi tiết:{" "}
                <Link href="/privacy">chính sách quyền riêng tư</Link>.
              </p>
              <ul className="privacy-trust-links">
                <li>
                  <Link href="/settings/export">Xuất dữ liệu (CSV/JSON)</Link>
                </li>
                <li>
                  <Link href="/settings/delete-account">Xóa tài khoản / dữ liệu thiết bị</Link>
                </li>
              </ul>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-retention-heading`}
            >
              <h2 id={`${formId}-retention-heading`}>
                Giữ draft import (Nâng cao)
              </h2>
              <p className="privacy-panel-lead">
                MoneyFlow không lưu file gốc. Sau khi đọc file, chỉ các dòng đã
                parse và đoạn mô tả ngắn được giữ trên trình duyệt để bạn xem
                trước. Tùy chọn bên dưới được áp dụng thật khi mở lại ứng dụng.
              </p>
              <fieldset className="privacy-fieldset">
                <legend className="sr-only">Thời gian giữ draft import</legend>
                <div
                  className="privacy-radio-list"
                  role="radiogroup"
                  aria-label="Thời gian giữ draft import"
                >
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
              <h2 id={`${formId}-improve-heading`}>Cải thiện parser (tùy chọn)</h2>
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
                Nhật ký chỉ lưu trên trình duyệt này.{" "}
                <Link href="/settings/export">Xuất dữ liệu</Link> ghi mốc xuất;{" "}
                <Link href="/settings/delete-account">Xóa tài khoản</Link> xóa
                dữ liệu thiết bị (và đăng xuất).
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
