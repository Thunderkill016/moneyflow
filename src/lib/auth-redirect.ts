/**
 * Default path after successful login / session restore.
 * Product home = Tổng quan thu chi (`/insights`). Inbox remains a capture tool (lab).
 * Wave A MF-100 / research G5 — see docs/AUTOPILOT_PLAN.md.
 * R2: never land post-auth on /inbox.
 */
export const POST_AUTH_REDIRECT = "/insights";

/** Lab capture hub — not a valid first destination after auth/onboarding. */
function isInboxPath(pathname: string): boolean {
  return pathname === "/inbox" || pathname.startsWith("/inbox/");
}

/** Only same-origin relative paths; blocks open redirects and /inbox dumps. */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string = POST_AUTH_REDIRECT,
): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  const pathOnly = value.split("?")[0]!.split("#")[0]!;
  if (isInboxPath(pathOnly)) {
    return fallback;
  }
  return value;
}
