/**
 * TASK-130 — Browser helpers for service worker + Notification API.
 * Pure preference/due logic lives in push-prefs + commitment-due-notify.
 */

import {
  buildDueNotification,
  localCalendarDate,
  selectDueCommitments,
  shouldNotifyToday,
  type DueNotifyCommitment,
} from "./commitment-due-notify.ts";
import {
  readPushPrefs,
  recordPushNotified,
  type PushPrefs,
} from "./push-prefs.ts";

export const PUSH_SERVICE_WORKER_URL = "/sw.js";
export const DEFAULT_NOTIFICATION_PATH = "/commitments";

const UNSAFE_URL_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

/**
 * Notification destinations are untrusted input even when current callers use
 * a fixed path. WHATWG URL parsing treats backslashes like path separators, so
 * validate both the raw/decoded value and the resolved origin.
 */
export function safeNotificationPath(
  value: unknown,
  origin = "https://moneyflow.invalid",
): string {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_NOTIFICATION_PATH;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      UNSAFE_URL_CHARACTERS.test(decoded)
    ) {
      return DEFAULT_NOTIFICATION_PATH;
    }

    const base = new URL(origin);
    const target = new URL(value, base);
    if (target.origin !== base.origin) return DEFAULT_NOTIFICATION_PATH;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return DEFAULT_NOTIFICATION_PATH;
  }
}

export type NotifyResult =
  | "shown"
  | "skipped_disabled"
  | "skipped_already_today"
  | "skipped_none_due"
  | "denied"
  | "unsupported"
  | "error";

export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, {
      scope: "/",
    });
    return reg;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Show a privacy-safe due notification via Service Worker when possible.
 * Falls back to `new Notification` if SW registration is missing.
 */
export async function showDueNotification(
  payload: {
    title: string;
    body: string;
    tag: string;
    url: string;
  },
): Promise<"shown" | "denied" | "unsupported" | "error"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission !== "granted") return "denied";

  try {
    const safeUrl = safeNotificationPath(payload.url, window.location.origin);
    const reg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await registerPushServiceWorker());
    if (reg) {
      await reg.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: safeUrl },
        // Keep silent of sensitive extras — no requireInteraction for calm UX
      });
      return "shown";
    }

    // Fallback without SW (rare)
    const n = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icon-192.png",
      data: { url: safeUrl },
    });
    n.onclick = () => {
      try {
        window.focus();
        window.location.assign(safeUrl);
      } catch {
        /* ignore */
      }
      n.close();
    };
    return "shown";
  } catch {
    return "error";
  }
}

/**
 * If prefs enabled and permission granted, notify once per day for due bills.
 * Never includes amounts. Call from commitments page after data load.
 */
export async function maybeNotifyDueCommitments(
  items: readonly DueNotifyCommitment[],
  options: {
    today?: string;
    prefs?: PushPrefs;
    force?: boolean;
  } = {},
): Promise<NotifyResult> {
  if (!isNotificationSupported()) return "unsupported";

  const prefs = options.prefs ?? readPushPrefs();
  const today = options.today ?? localCalendarDate();

  if (!prefs.enabled && !options.force) return "skipped_disabled";
  if (Notification.permission !== "granted") return "denied";
  if (!options.force && !shouldNotifyToday(prefs.enabled, prefs.lastNotifiedOn, today)) {
    return "skipped_already_today";
  }

  const due = selectDueCommitments(items, today, prefs.daysAhead);
  if (due.length === 0) return "skipped_none_due";

  const payload = buildDueNotification(due, {
    includeNames: prefs.includeNames,
    today,
  });
  if (!payload) return "skipped_none_due";

  const result = await showDueNotification(payload);
  if (result === "shown") {
    recordPushNotified(today, payload.count);
  }
  return result === "shown" ? "shown" : result;
}

/** Short Vietnamese status for settings UI. */
export function notifyResultMessage(result: NotifyResult): string {
  switch (result) {
    case "shown":
      return "Đã gửi nhắc nhở (nếu trình duyệt cho phép).";
    case "skipped_disabled":
      return "Nhắc nhở đang tắt. Bật opt-in để nhận thông báo.";
    case "skipped_already_today":
      return "Hôm nay đã nhắc rồi. Sẽ nhắc lại vào ngày mai nếu còn khoản đến hạn.";
    case "skipped_none_due":
      return "Không có khoản định kỳ đến hạn trong cửa sổ đã chọn.";
    case "denied":
      return "Trình duyệt đang chặn thông báo. Hãy cho phép trong cài đặt site.";
    case "unsupported":
      return "Trình duyệt này không hỗ trợ thông báo web.";
    case "error":
      return "Không gửi được thông báo. Thử lại sau.";
    default:
      return "";
  }
}
