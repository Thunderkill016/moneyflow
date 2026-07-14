/**
 * First-run onboarding (wireframes-inbox §3).
 * Flag is client-only (localStorage) — no server persistence yet.
 */

export const ONBOARDING_STORAGE_KEY = "moneyflow-onboarding-done";
export const ONBOARDING_PATH = "/onboarding";

/**
 * After onboarding skip / already-done redirect.
 * Prefer `/inbox` once TASK-005 ships; home is safe until then.
 */
export const ONBOARDING_SKIP_HREF = "/";

export type CaptureMethod = "paste" | "upload" | "quick";

export const CAPTURE_METHOD_HREF: Record<CaptureMethod, string> = {
  paste: "/capture/paste",
  upload: "/capture/upload",
  quick: "/capture/quick",
};

export function isOnboardingDoneValue(raw: string | null | undefined): boolean {
  return raw === "1" || raw === "true";
}

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return isOnboardingDoneValue(window.localStorage.getItem(ONBOARDING_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
}

export function captureHref(method: CaptureMethod): string {
  return CAPTURE_METHOD_HREF[method];
}
