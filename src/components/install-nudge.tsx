"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { installPromptStore, type InstallState } from "@/lib/pwa";
import styles from "./install-nudge.module.css";

/**
 * Install nudge — a dismissible "Thêm MoneyFlow vào màn hình chính"
 * banner shown inside the mobile welcome. Honest states only:
 * `promptable` fires the real deferred prompt; `manual` (iOS Safari,
 * which never fires beforeinstallprompt) shows the real steps;
 * `installed`/`unavailable` render nothing.
 *
 * Dismissal is device-local (localStorage) — the nudge never nags the
 * same device twice.
 */

const DISMISS_KEY = "mf_install_nudge_dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Storage can be unavailable in private mode — showing the nudge
    // once more is safer than crashing the welcome screen.
    return false;
  }
}

export function InstallNudge() {
  const store = installPromptStore();
  const state = useSyncExternalStore(
    store.subscribe,
    store.state,
    (): InstallState => "unavailable",
  );
  // SSR renders nothing — the localStorage flag only exists client-side.
  // The server snapshot hides the nudge; the client snapshot reads the
  // real flag on hydration without a setState-in-effect round trip.
  const storedDismissed = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismissed = storedDismissed || dismissedNow;
  const [asking, setAsking] = useState(false);

  if (dismissed || (state !== "promptable" && state !== "manual")) {
    return null;
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* advisory — a failed write just means the nudge can show again */
    }
    setDismissedNow(true);
  }

  async function handleInstall() {
    if (asking) return;
    setAsking(true);
    try {
      await store.promptInstall();
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className={styles.nudge} aria-label="Cài đặt ứng dụng">
      <Download size={18} className={styles.icon} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.title}>Thêm MoneyFlow vào màn hình chính</p>
        {state === "manual" ? (
          <p className={styles.body}>
            Safari: nút <strong>Chia sẻ</strong> →{" "}
            <strong>Thêm vào màn hình chính</strong>.
          </p>
        ) : (
          <p className={styles.body}>
            Mở nhanh như một ứng dụng — không gửi thêm dữ liệu nào.
          </p>
        )}
      </div>
      {state === "promptable" ? (
        <button
          type="button"
          className={styles.installButton}
          onClick={handleInstall}
          disabled={asking}
        >
          {asking ? "Đang mở…" : "Cài đặt"}
        </button>
      ) : null}
      <button
        type="button"
        className={styles.dismiss}
        onClick={dismiss}
        aria-label="Ẩn gợi ý cài đặt"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
