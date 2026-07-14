/**
 * Privacy settings preferences (wireframes-inbox §18).
 * Client-only localStorage — retention intent + opt-in improve parser.
 */

export const PRIVACY_PREFS_KEY = "moneyflow-privacy-prefs-v1";

/** How long to keep original import raw after parse. */
export type RawRetention = "delete_now" | "days_7" | "days_30";

export type PrivacyPrefs = {
  /** Raw file retention policy (local intent). Default: 7 days. */
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
    label: "Xóa ngay sau khi parse",
    description: "Không giữ file/raw gốc sau khi đã tách ứng viên.",
  },
  {
    value: "days_7",
    label: "Giữ 7 ngày",
    description: "Giữ raw ngắn hạn để mở lại / gỡ lỗi map cột.",
  },
  {
    value: "days_30",
    label: "Giữ 30 ngày",
    description: "Giữ lâu hơn nếu bạn hay xem lại sao kê.",
  },
];

const RETENTION_VALUES: RawRetention[] = ["delete_now", "days_7", "days_30"];

export function isRawRetention(value: unknown): value is RawRetention {
  return typeof value === "string" && (RETENTION_VALUES as string[]).includes(value);
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
