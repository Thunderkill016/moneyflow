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
  THEME_OPTIONS,
  applyThemeToDocument,
  defaultThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "@/lib/theme-prefs";

/**
 * Appearance settings — theme preference (light / dark / system).
 */
export function AppearanceSettingsPage({ viewer }: { viewer: ViewerSummary }) {
  const formId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [preference, setPreference] = useState<ThemePreference>(
    defaultThemePreference(),
  );
  const [saved, setSaved] = useState<ThemePreference>(defaultThemePreference());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const dirty = preference !== saved;

  function reload() {
    try {
      const current = readThemePreference();
      setPreference(current);
      setSaved(current);
      applyThemeToDocument(current);
      setInboxCount(countPending(readStoredCandidates()));
      setError(null);
    } catch {
      setError("Không đọc được tùy chọn giao diện. Thử tải lại trang.");
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

  useEffect(() => {
    if (!ready || preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      applyThemeToDocument("system");
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [ready, preference]);

  function onSelect(value: ThemePreference) {
    setPreference(value);
    applyThemeToDocument(value);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const next = saveThemePreference(preference);
      applyThemeToDocument(next);
      setSaved(next);
      setPreference(next);
      setNotice("Đã lưu giao diện.");
      setError(null);
    } catch {
      setError("Không lưu được giao diện. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setPreference(saved);
    applyThemeToDocument(saved);
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
      <main className="dashboard privacy-workspace appearance-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Cài đặt</p>
            <h1>Giao diện</h1>
            <p>
              Chọn chế độ sáng, tối hoặc theo hệ thống. Tùy chọn lưu trên thiết
              bị này.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
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
            aria-label="Đang tải giao diện"
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
              aria-labelledby={`${formId}-theme-heading`}
            >
              <h2 id={`${formId}-theme-heading`}>Chủ đề</h2>
              <p className="privacy-panel-lead">
                Áp dụng ngay khi chọn. Bấm Lưu để ghi nhớ cho lần mở sau.
              </p>
              <fieldset className="privacy-fieldset">
                <legend className="sr-only">Chế độ giao diện</legend>
                <div
                  className="privacy-radio-list"
                  role="radiogroup"
                  aria-label="Chế độ giao diện"
                >
                  {THEME_OPTIONS.map((option) => {
                    const inputId = `${formId}-theme-${option.value}`;
                    const selected = preference === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={inputId}
                        className={`privacy-radio-card${selected ? " is-selected" : ""}`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="theme"
                          value={option.value}
                          checked={selected}
                          onChange={() => onSelect(option.value)}
                          disabled={saving}
                        />
                        <span className="privacy-radio-body">
                          <span className="privacy-radio-label">
                            {option.label}
                          </span>
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
                onClick={onReset}
                disabled={saving || !dirty}
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
