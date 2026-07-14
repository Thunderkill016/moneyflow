/**
 * Default path after successful login / session restore.
 *
 * Wireframes (`docs/wireframes-inbox.md` §2) prefer `/inbox` once that route exists
 * (TASK-005). Until then post-auth lands on `/` (home dashboard).
 */
export const POST_AUTH_REDIRECT = "/";

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
