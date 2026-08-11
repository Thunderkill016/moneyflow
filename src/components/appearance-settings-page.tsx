"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  THEME_OPTIONS,
  applyThemeToDocument,
  defaultThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "@/lib/theme-prefs";
import styles from "./settings/settings-surfaces.module.css";

export function AppearanceSettingsPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [preference, setPreference] = useState<ThemePreference>(defaultThemePreference());
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
      setError(null);
    } catch {
      setError("Không đọc được tùy chọn giao diện. Thử tải lại trang.");
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

  useEffect(() => {
    if (!ready || preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeToDocument("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [ready, preference]);

  function onSelect(value: ThemePreference) {
    setPreference(value);
    applyThemeToDocument(value);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const next = saveThemePreference(preference);
      applyThemeToDocument(next);
      setSaved(next);
      setPreference(next);
      setNotice("Đã lưu giao diện trên thiết bị này.");
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
        onClick: () =>
          (document.getElementById("appearance-settings-form") as HTMLFormElement | null)?.requestSubmit(),
        disabled: saving || !ready || Boolean(error) || !dirty,
        icon: "check",
      }}
    >
      <SecondaryWorkspace slot="settings-appearance-workspace">
        <SecondaryHeader
          section="Cài đặt"
          title="Giao diện"
          description={<p>Chọn sáng, tối hoặc theo hệ thống. Tùy chọn được lưu trên thiết bị hiện tại.</p>}
          actions={
            <>
              <LinkButton href="/settings" intent="secondary" targetSize="important">
                Cài đặt
              </LinkButton>
              <LinkButton href="/inbox" intent="quiet" targetSize="important">
                Inbox
              </LinkButton>
            </>
          }
        />

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải giao diện">
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
          <form id="appearance-settings-form" className={styles.form} onSubmit={onSubmit} noValidate>
            <SecondarySection
              title="Chủ đề workspace"
              description={<p>Áp dụng ngay khi chọn; bấm Lưu để ghi nhớ cho lần mở sau.</p>}
              contained
              slot="settings-section"
            >
              <fieldset>
                <legend className="sr-only">Chế độ giao diện</legend>
                <div className={styles.radioList}>
                  {THEME_OPTIONS.map((option) => {
                    const selected = preference === option.value;
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
                          name="theme"
                          value={option.value}
                          checked={selected}
                          onChange={() => onSelect(option.value)}
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
