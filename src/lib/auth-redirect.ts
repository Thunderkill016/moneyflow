/**
 * Default path after successful login / session restore.
 * Wireframes (`docs/wireframes-inbox.md` §2) — Inbox-first home.
 */
export const POST_AUTH_REDIRECT = "/inbox";

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
