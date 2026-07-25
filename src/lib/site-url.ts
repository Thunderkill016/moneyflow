export const CANONICAL_SITE_ORIGIN = "https://mfvn.vercel.app";
export const LEGACY_SITE_HOST = "moneyflow-vn.vercel.app";
const LOCAL_SITE_ORIGIN = "http://localhost:3000";

export function normalizeSiteOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function hostWithoutPort(host: string | null | undefined): string {
  return (host ?? "").split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
}

export function isLegacySiteHost(host: string | null | undefined): boolean {
  return hostWithoutPort(host) === LEGACY_SITE_HOST;
}

export function resolveSiteOrigin(
  configuredOrigin: string | null | undefined,
  environment: string | null | undefined,
): string {
  const configured = normalizeSiteOrigin(configuredOrigin);
  const isProduction = environment === "production";

  if (isProduction) {
    if (!configured || isLegacySiteHost(new URL(configured).host)) {
      return CANONICAL_SITE_ORIGIN;
    }
    return configured;
  }

  return configured ?? LOCAL_SITE_ORIGIN;
}

export function getSiteOrigin(): string {
  return resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV);
}
