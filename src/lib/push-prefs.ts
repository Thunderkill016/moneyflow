/**
 * TASK-130 — Web notification prefs for due commitments (privacy-first).
 * Client-only localStorage. Default OFF — never auto-enable notifications.
 */

export const PUSH_PREFS_KEY = "moneyflow-push-prefs-v1";

/** How many calendar days before due date to remind (0 = today + overdue only). */
export type PushDaysAhead = 0 | 1 | 3;

export type PushPrefs = {
  /** Master opt-in. Default false. */
  enabled: boolean;
  /** Remind N days before due (and overdue). Default 1. */
  daysAhead: PushDaysAhead;
  /**
   * Include commitment names in notification body.
   * Default false — only counts (“Bạn có N khoản…”). Never amounts.
   */
  includeNames: boolean;
  /** Local calendar date (YYYY-MM-DD) we last showed a due reminder. */
  lastNotifiedOn: string | null;
  /** Count of items in last notification (telemetry-free local only). */
  lastNotifiedCount: number;
  /** ISO when prefs were last saved by user. */
  updatedAt: string | null;
};

export const PUSH_DAYS_AHEAD_OPTIONS: {
  value: PushDaysAhead;
  label: string;
  description: string;
}[] = [
  {
    value: 0,
    label: "Chỉ hôm nay / quá hạn",
    description: "Nhắc khi đến hạn trong ngày hoặc đã trễ.",
  },
  {
    value: 1,
    label: "Trước 1 ngày",
    description: "Nhắc trước một ngày và khi đến hạn.",
  },
  {
    value: 3,
    label: "Trước 3 ngày",
    description: "Nhắc sớm hơn cho các khoản sắp đến.",
  },
];

const DAYS_AHEAD_VALUES: PushDaysAhead[] = [0, 1, 3];

export function isPushDaysAhead(value: unknown): value is PushDaysAhead {
  return typeof value === "number" && (DAYS_AHEAD_VALUES as number[]).includes(value);
}

export function isPushPrefs(value: unknown): value is PushPrefs {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PushPrefs>;
  return (
    typeof item.enabled === "boolean" &&
    isPushDaysAhead(item.daysAhead) &&
    typeof item.includeNames === "boolean" &&
    (item.lastNotifiedOn === null || typeof item.lastNotifiedOn === "string") &&
    typeof item.lastNotifiedCount === "number" &&
    Number.isFinite(item.lastNotifiedCount) &&
    item.lastNotifiedCount >= 0 &&
    (item.updatedAt === null || typeof item.updatedAt === "string")
  );
}

export function defaultPushPrefs(): PushPrefs {
  return {
    enabled: false,
    daysAhead: 1,
    includeNames: false,
    lastNotifiedOn: null,
    lastNotifiedCount: 0,
    updatedAt: null,
  };
}

export function readPushPrefs(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): PushPrefs {
  if (!storage) return defaultPushPrefs();
  try {
    const raw = storage.getItem(PUSH_PREFS_KEY);
    if (!raw) return defaultPushPrefs();
    const parsed: unknown = JSON.parse(raw);
    if (!isPushPrefs(parsed)) {
      storage.removeItem(PUSH_PREFS_KEY);
      return defaultPushPrefs();
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(PUSH_PREFS_KEY);
    } catch {
      /* ignore */
    }
    return defaultPushPrefs();
  }
}

export function writePushPrefs(
  prefs: PushPrefs,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  if (!isPushPrefs(prefs)) return;
  storage.setItem(PUSH_PREFS_KEY, JSON.stringify(prefs));
}

/** Save user-edited fields; stamps `updatedAt`. Keeps last-notified unless provided. */
export function savePushPrefs(
  input: {
    enabled: boolean;
    daysAhead: PushDaysAhead;
    includeNames: boolean;
    lastNotifiedOn?: string | null;
    lastNotifiedCount?: number;
    now?: Date;
  },
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): PushPrefs {
  const current = readPushPrefs(storage);
  const now = input.now ?? new Date();
  const next: PushPrefs = {
    enabled: input.enabled,
    daysAhead: input.daysAhead,
    includeNames: input.includeNames,
    lastNotifiedOn:
      input.lastNotifiedOn !== undefined
        ? input.lastNotifiedOn
        : current.lastNotifiedOn,
    lastNotifiedCount:
      input.lastNotifiedCount !== undefined
        ? input.lastNotifiedCount
        : current.lastNotifiedCount,
    updatedAt: now.toISOString(),
  };
  writePushPrefs(next, storage);
  return next;
}

/** Record that we fired a due reminder for `localDate` (YYYY-MM-DD). */
export function recordPushNotified(
  localDate: string,
  count: number,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): PushPrefs {
  const current = readPushPrefs(storage);
  const next: PushPrefs = {
    ...current,
    lastNotifiedOn: localDate,
    lastNotifiedCount: Math.max(0, Math.floor(count)),
  };
  writePushPrefs(next, storage);
  return next;
}

export function pushDaysAheadLabel(value: PushDaysAhead): string {
  return PUSH_DAYS_AHEAD_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

/** Format ISO for activity display (vi-VN, Asia/Ho_Chi_Minh). */
export function formatPushActivityAt(
  iso: string | null,
  emptyLabel = "Chưa bật",
): string {
  if (!iso) return emptyLabel;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
