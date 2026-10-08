/**
 * Backend provider seam (#774): `supabase` (default, production today) or
 * `neon` (opt-in migration PoC). The flag only exists to prove the Neon
 * path on the scratch project — production stays on supabase until the
 * owner approves cutover, and this flag is never flipped in Vercel.
 */
export type BackendProvider = "supabase" | "neon";

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

export function getBackendProvider(): BackendProvider {
  const raw = process.env.MF_BACKEND_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "supabase") return "supabase";
  if (raw === "neon") return "neon";
  throw new BackendConfigurationError(
    'MF_BACKEND_PROVIDER must be "supabase" or "neon".',
  );
}

export type NeonBackendConfig = {
  /** Managed Better Auth base, e.g. https://ep-…neonauth…/neondb/auth */
  authBaseUrl: string;
  /** Neon Data API PostgREST base, e.g. https://ep-…apirest…/neondb/rest/v1 */
  dataApiUrl: string;
  /** JWKS endpoint used to verify Data API JWTs (Bearer path). */
  jwksUrl: string;
  /** HMAC secret for the Next.js session cookie cache (server-only). */
  cookieSecret: string;
};

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    // Path is meaningful here (…/neondb/auth, …/neondb/rest/v1) — keep it,
    // but reject anything else appended.
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Null in demo mode; throws when authenticated mode is missing Neon config. */
export function getNeonBackendConfig(): NeonBackendConfig | null {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase();
  if (appMode === "demo") return null;

  const authBaseUrl = normalizeOrigin(process.env.NEON_AUTH_BASE_URL);
  const dataApiUrl = normalizeOrigin(process.env.NEON_DATA_API_URL);
  const jwksUrl = normalizeOrigin(process.env.NEON_JWKS_URL);
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

  if (!authBaseUrl || !dataApiUrl || !cookieSecret) {
    throw new BackendConfigurationError(
      "Neon backend requires NEON_AUTH_BASE_URL, NEON_DATA_API_URL and NEON_AUTH_COOKIE_SECRET.",
    );
  }
  if (cookieSecret.length < 32) {
    throw new BackendConfigurationError(
      "NEON_AUTH_COOKIE_SECRET must be at least 32 characters.",
    );
  }
  return {
    authBaseUrl,
    dataApiUrl,
    // JWKS sits under the auth base on managed Neon Auth.
    jwksUrl: jwksUrl ?? `${authBaseUrl}/.well-known/jwks.json`,
    cookieSecret,
  };
}

/**
 * True when the active provider is fully configured for authenticated mode —
 * the provider-agnostic equivalent of isSupabaseConfigured() for call sites
 * that only need "demo or authenticated" gating.
 */
export function isBackendConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase() === "demo")
    return false;
  if (getBackendProvider() === "neon") return getNeonBackendConfig() !== null;
  // Lazy import avoided: getSupabaseConfig mirrors the demo check and throws
  // on missing vars — that IS the intended fail-fast for misconfiguration.
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    return Boolean(url && key);
  } catch {
    return false;
  }
}
