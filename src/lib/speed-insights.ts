const BLOCKED_PATH_PREFIXES = [
  "/auth/",
  "/update-password",
  "/reset-password",
  "/capture/share",
  "/imports/",
] as const;

/**
 * Speed Insights only needs the route shape. Never send search parameters,
 * fragments, callback tokens, share payloads, or import identifiers.
 */
export function sanitizeSpeedInsightsUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (BLOCKED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return null;
    }

    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
