/**
 * Default path after successful login / session restore.
 * Product home = Tổng quan thu chi (`/insights`). Inbox remains a capture tool.
 * Wave A MF-100 / research G5 — see docs/AUTOPILOT_PLAN.md.
 */
export const POST_AUTH_REDIRECT = "/insights";

/** Only same-origin relative paths; blocks open redirects (`//evil.com`). */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string = POST_AUTH_REDIRECT,
): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}
