/**
 * Default path after successful login / session restore.
 * Product home = Tổng quan thu chi (`/dashboard`). Inbox remains a capture tool (lab).
 * Wave A MF-100 / research G5 — see docs/AUTOPILOT_PLAN.md.
 * R2: never land post-auth on /inbox.
 */
export const POST_AUTH_REDIRECT = "/dashboard";

const REDIRECT_VALIDATION_ORIGIN = "https://moneyflow.invalid";
const UNSAFE_REDIRECT_CHARS = /[\u0000-\u001f\u007f\\]/;

/** Lab capture hub — not a valid first destination after auth/onboarding. */
function isInboxPath(pathname: string): boolean {
  return pathname === "/inbox" || pathname.startsWith("/inbox/");
}

/** Only same-origin relative paths; blocks open redirects and /inbox dumps. */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string = POST_AUTH_REDIRECT,
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    UNSAFE_REDIRECT_CHARS.test(value)
  ) {
    return fallback;
  }

  let destination: URL;
  try {
    destination = new URL(value, REDIRECT_VALIDATION_ORIGIN);
  } catch {
    return fallback;
  }

  // WHATWG URL parsing treats backslashes as path separators for special
  // schemes. Validate the resolved origin instead of trusting a leading slash.
  if (destination.origin !== REDIRECT_VALIDATION_ORIGIN) {
    return fallback;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(destination.pathname);
  } catch {
    return fallback;
  }
  if (
    decodedPathname.startsWith("//") ||
    UNSAFE_REDIRECT_CHARS.test(decodedPathname) ||
    isInboxPath(decodedPathname)
  ) {
    return fallback;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
