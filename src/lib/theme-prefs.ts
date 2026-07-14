/**
 * Appearance / theme preference (settings hub).
 * Stored in localStorage as `moneyflow-theme` — same key as root layout bootstrap.
 */

export const THEME_STORAGE_KEY = "moneyflow-theme";

/** User-facing preference (may resolve via system). */
export type ThemePreference = "light" | "dark" | "system";

/** Resolved theme applied to `<html data-theme>`. */
export type ResolvedTheme = "light" | "dark";

export const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  {
    value: "system",
    label: "Theo hệ thống",
    description: "Tự theo chế độ sáng/tối của thiết bị.",
  },
  {
    value: "light",
    label: "Sáng",
    description: "Giao diện sáng cố định.",
  },
  {
    value: "dark",
    label: "Tối",
    description: "Giao diện tối cố định.",
  },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function defaultThemePreference(): ThemePreference {
  return "system";
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark = false,
): ResolvedTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/**
 * Read preference from storage. Safe for SSR (returns default).
 */
export function readThemePreference(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): ThemePreference {
  if (!storage) return defaultThemePreference();
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* private mode / blocked storage */
  }
  return defaultThemePreference();
}

/**
 * Persist preference and return it.
 */
export function saveThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): ThemePreference {
  if (!isThemePreference(preference)) {
    throw new Error("Invalid theme preference");
  }
  if (storage) {
    try {
      storage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      throw new Error("Không lưu được giao diện trên thiết bị này.");
    }
  }
  return preference;
}

/**
 * Apply resolved theme to document root.
 */
export function applyThemeToDocument(
  preference: ThemePreference,
  doc: Document | null = typeof document !== "undefined" ? document : null,
  matchMedia: ((query: string) => MediaQueryList) | null = typeof window !==
  "undefined"
    ? window.matchMedia.bind(window)
    : null,
): ResolvedTheme {
  const prefersDark = matchMedia
    ? matchMedia("(prefers-color-scheme: dark)").matches
    : false;
  const resolved = resolveTheme(preference, prefersDark);
  if (doc?.documentElement) {
    doc.documentElement.setAttribute("data-theme", resolved);
  }
  return resolved;
}
