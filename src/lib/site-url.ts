export class SiteConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteConfigurationError";
  }
}

/** Accept only an absolute origin. Paths, credentials, query strings and hashes are configuration errors. */
export function normalizeSiteOrigin(raw: string | null | undefined): string | null {
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

export function hostWithoutPort(host: string | null | undefined): string {
  const firstHost = (host ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (!firstHost) return "";

  try {
    return new URL(`http://${firstHost}`).hostname.toLowerCase();
  } catch {
    return firstHost.replace(/:\d+$/, "");
  }
}

/** LEGACY_SITE_HOSTS is a comma/newline separated migration list managed per deployment. */
export function parseLegacySiteHosts(raw: string | null | undefined): readonly string[] {
  return Array.from(
    new Set(
      (raw ?? "")
        .split(/[\s,]+/)
        .map(hostWithoutPort)
        .filter(Boolean),
    ),
  );
}

export function isLegacySiteHost(
  host: string | null | undefined,
  legacyHosts: readonly string[],
): boolean {
  const normalizedHost = hostWithoutPort(host);
  return Boolean(normalizedHost) && legacyHosts.includes(normalizedHost);
}

export function resolveSiteOrigin(
  configuredOrigin: string | null | undefined,
  environment: string | null | undefined,
): string {
  const origin = normalizeSiteOrigin(configuredOrigin);
  if (!origin) {
    throw new SiteConfigurationError(
      "NEXT_PUBLIC_SITE_URL must be configured as an absolute origin without a path, query string or hash.",
    );
  }

  if (environment === "production" && new URL(origin).protocol !== "https:") {
    throw new SiteConfigurationError("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }

  return origin;
}

export function getSiteOrigin(): string {
  return resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV);
}

export function getLegacySiteHosts(): readonly string[] {
  return parseLegacySiteHosts(process.env.LEGACY_SITE_HOSTS);
}
