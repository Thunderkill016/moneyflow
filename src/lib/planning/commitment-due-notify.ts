/**
 * TASK-130 — Privacy-first due-commitment notification copy.
 * Money amounts and account identifiers never appear in the payload.
 */

import type { PushDaysAhead } from "../push-prefs.ts";

/** Minimal commitment shape for due selection (no money required). */
export type DueNotifyCommitment = {
  id: string;
  name: string;
  dueDate: string;
  isPaid: boolean;
  isArchived: boolean;
};

export type DueNotificationPayload = {
  title: string;
  body: string;
  /** Stable tag so OS replaces same-day reminder. */
  tag: string;
  /** Deep-link path (no query secrets). */
  url: string;
  count: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * Active unpaid commitments due within `daysAhead` days (or already overdue).
 * Sorted: most overdue first, then soonest due.
 */
export function selectDueCommitments(
  items: readonly DueNotifyCommitment[],
  today: string,
  daysAhead: PushDaysAhead,
): DueNotifyCommitment[] {
  if (!ISO_DATE.test(today)) return [];
  const ahead = Math.max(0, Math.min(31, daysAhead));
  return items
    .filter((item) => {
      if (item.isArchived || item.isPaid) return false;
      if (!ISO_DATE.test(item.dueDate)) return false;
      const days = daysBetween(today, item.dueDate);
      // overdue (negative) or due within window
      return days <= ahead;
    })
    .sort((a, b) => {
      const da = daysBetween(today, a.dueDate);
      const db = daysBetween(today, b.dueDate);
      return da - db || a.name.localeCompare(b.name, "vi");
    });
}

/**
 * Build OS notification content. Never includes amounts, account names, or STK.
 * When `includeNames` is false: count-only body.
 */
export function buildDueNotification(
  due: readonly DueNotifyCommitment[],
  options: { includeNames: boolean; today: string },
): DueNotificationPayload | null {
  if (due.length === 0) return null;
  const count = due.length;
  const title = count === 1 ? "Cam kết đến hạn" : "Cam kết sắp đến hạn";

  let body: string;
  if (options.includeNames) {
    const names = due
      .slice(0, 3)
      .map((item) => item.name.trim())
      .filter(Boolean);
    const list = names.join(", ");
    const extra = count > 3 ? ` và ${count - 3} khoản khác` : "";
    body = list
      ? `${list}${extra}. Mở Cam kết để xem (không hiện số tiền).`
      : `Bạn có ${count} khoản định kỳ đến hạn. Mở Cam kết để xem.`;
  } else {
    body =
      count === 1
        ? "Bạn có 1 khoản định kỳ đến hạn hoặc sắp đến. Mở Cam kết để xem chi tiết."
        : `Bạn có ${count} khoản định kỳ đến hạn hoặc sắp đến. Mở Cam kết để xem chi tiết.`;
  }

  return {
    title,
    body,
    tag: `moneyflow-commitment-due-${options.today}`,
    url: "/commitments",
    count,
  };
}

/**
 * True if we should attempt a notification today for this prefs snapshot.
 * One reminder per local calendar day when enabled and there is something due.
 */
export function shouldNotifyToday(
  enabled: boolean,
  lastNotifiedOn: string | null,
  today: string,
): boolean {
  if (!enabled) return false;
  if (!ISO_DATE.test(today)) return false;
  if (lastNotifiedOn === today) return false;
  return true;
}

/** Local calendar date YYYY-MM-DD in Asia/Ho_Chi_Minh. */
export function localCalendarDate(
  now: Date = new Date(),
  timeZone = "Asia/Ho_Chi_Minh",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    return now.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}
