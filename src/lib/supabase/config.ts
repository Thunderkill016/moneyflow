export type AppMode = "demo" | "authenticated";

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export function getAppMode(): AppMode {
  const mode = process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase();
  if (mode === "demo" || mode === "authenticated") return mode;

  throw new SupabaseConfigurationError(
    'NEXT_PUBLIC_APP_MODE must be explicitly configured as "demo" or "authenticated".',
  );
}

function normalizeSupabaseUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Explicit demo mode returns null; authenticated mode requires valid backend configuration. */
export function getSupabaseConfig() {
  if (getAppMode() === "demo") return null;

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError(
      "Authenticated mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
