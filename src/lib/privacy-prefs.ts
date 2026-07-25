/**
 * Privacy settings preferences (wireframes-inbox §18).
 * Client-only localStorage — enforced parsed-draft retention + parser opt-in.
 */

export const PRIVACY_PREFS_KEY = "moneyflow-privacy-prefs-v1";

/** How long parsed import drafts may remain available in this browser. */
export type RawRetention = "delete_now" | "days_7" | "days_30";

export type PrivacyPrefs = {
  /** Parsed import draft retention policy. Default: 7 days. */
  rawRetention: RawRetention;
  /**
   * Opt-in: allow anonymized samples to improve parser.
   * Default off — never share without explicit consent.
   */
  improveParser: boolean;
  /** ISO timestamp of last data export (client-recorded). */
  lastExportAt: string | null;
  /** ISO timestamp of last local wipe / delete action (client-recorded). */
  lastDeleteAt: string | null;
  /** ISO when prefs were last saved by user. */
  updatedAt: string | null;
};

export const RAW_RETENTION_OPTIONS: {
  value: RawRetention;
  label: string;
  description: string;
}[] = [
  {
    value: "delete_now",
    label: "Chỉ giữ trong phiên xem trước",
    description:
      "Không ghi draft đã parse vào bộ nhớ dài hạn; đóng tab hoặc hoàn tất import là mất.",
  },
  {
    value: "days_7",
    label: "Giữ draft 7 ngày",
    description: "Tự xóa draft đã parse quá 7 ngày khi MoneyFlow được mở lại.",
  },
  {
    value: "days_30",
    label: "Giữ draft 30 ngày",
    description: "Tự xóa draft đã parse quá 30 ngày khi MoneyFlow được mở lại.",
  },
];

const RETENTION_VALUES: RawRetention[] = ["delete_now", "days_7", "days_30"];
const DAY_MS = 86_400_000;

export function isRawRetention(value: unknown): value is RawRetention {
  return typeof value === "string" && (RETENTION_VALUES as string[]).includes(value);
}

/**
 * Maximum persistent age for parsed import drafts.
 * `null` means session-only storage: nothing may remain in localStorage.
 */
export function rawRetentionMaxAgeMs(value: RawRetention): number | null {
  if (value === "delete_now") return null;
  return (value === "days_7" ? 7 : 30) * DAY_MS;
}

export function isPrivacyPrefs(value: unknown): value is PrivacyPrefs {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PrivacyPrefs>;
  return (
    isRawRetention(item.rawRetention) &&
    typeof item.improveParser === "boolean" &&
    (item.lastExportAt === null || typeof item.lastExportAt === "string") &&
    (item.lastDeleteAt === null || typeof item.lastDeleteAt === "string") &&
    (item.updatedAt === null || typeof item.updatedAt === "string")
  );
}

export function defaultPrivacyPrefs(): PrivacyPrefs {
  return {
    rawRetention: "days_7",
    improveParser: false,
    lastExportAt: null,
    lastDeleteAt: null,
    updatedAt: null,
  };
}

export function readPrivacyPrefs(): PrivacyPrefs {
  if (typeof window === "undefined") return defaultPrivacyPrefs();
  try {
    const raw = window.localStorage.getItem(PRIVACY_PREFS_KEY);
    if (!raw) return defaultPrivacyPrefs();
    const parsed: unknown = JSON.parse(raw);
    if (!isPrivacyPrefs(parsed)) {
      window.localStorage.removeItem(PRIVACY_PREFS_KEY);
      return defaultPrivacyPrefs();
    }
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(PRIVACY_PREFS_KEY);
    } catch {
      /* ignore */
    }
    return defaultPrivacyPrefs();
  }
}

export function writePrivacyPrefs(prefs: PrivacyPrefs): void {
  if (typeof window === "undefined") return;
  if (!isPrivacyPrefs(prefs)) return;
  window.localStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(prefs));
}

/**
 * Save user-edited fields; stamps `updatedAt`.
 * Keeps activity log timestamps unless provided.
 */
export function savePrivacyPrefs(input: {
  rawRetention: RawRetention;
  improveParser: boolean;
  lastExportAt?: string | null;
  lastDeleteAt?: string | null;
  now?: Date;
}): PrivacyPrefs {
  const current = readPrivacyPrefs();
  const now = input.now ?? new Date();
  const next: PrivacyPrefs = {
    rawRetention: input.rawRetention,
    improveParser: input.improveParser,
    lastExportAt:
      input.lastExportAt !== undefined ? input.lastExportAt : current.lastExportAt,
    lastDeleteAt:
      input.lastDeleteAt !== undefined ? input.lastDeleteAt : current.lastDeleteAt,
    updatedAt: now.toISOString(),
  };
  writePrivacyPrefs(next);
  return next;
}

/** Record last export time (for activity log on privacy page). */
export function recordPrivacyExport(now: Date = new Date()): PrivacyPrefs {
  const current = readPrivacyPrefs();
  const next: PrivacyPrefs = {
    ...current,
    lastExportAt: now.toISOString(),
    updatedAt: current.updatedAt,
  };
  writePrivacyPrefs(next);
  return next;
}

/** Record last delete/wipe time (for activity log on privacy page). */
export function recordPrivacyDelete(now: Date = new Date()): PrivacyPrefs {
  const current = readPrivacyPrefs();
  const next: PrivacyPrefs = {
    ...current,
    lastDeleteAt: now.toISOString(),
    updatedAt: current.updatedAt,
  };
  writePrivacyPrefs(next);
  return next;
}

export function rawRetentionLabel(value: RawRetention): string {
  return RAW_RETENTION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Format ISO for Nhật ký (vi-VN, Asia/Ho_Chi_Minh). */
export function formatPrivacyActivityAt(
  iso: string | null,
  emptyLabel = "Chưa có",
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
