/**
 * First-run onboarding — thu chi (TASK-102 / R2 polish).
 * 3 steps: trust → cash wallet (VN defaults) → optional quick expense | skip → /insights.
 * Flag is client-only (localStorage) — no server persistence yet.
 * Never exit to /inbox (lab).
 */

export const ONBOARDING_STORAGE_KEY = "moneyflow-onboarding-done";
export const ONBOARDING_PATH = "/onboarding";

/**
 * After onboarding skip / finish / already-done redirect.
 * Product home = Tổng quan thu chi.
 */
export const ONBOARDING_SKIP_HREF = "/insights";
export const ONBOARDING_DONE_HREF = "/insights";

/** Optional step-3 path: ghi chi nhanh (not paste/upload). */
export const ONBOARDING_QUICK_EXPENSE_HREF = "/capture/quick";

/** Allowed post-onboarding destinations (never lab /inbox). */
export const ONBOARDING_EXIT_HREFS = [
  ONBOARDING_SKIP_HREF,
  ONBOARDING_DONE_HREF,
  ONBOARDING_QUICK_EXPENSE_HREF,
] as const;

export const DEFAULT_CASH_WALLET_NAME = "Tiền mặt";
/** Onboarding cash wallet is always VND (đồng). */
export const DEFAULT_CASH_WALLET_CURRENCY = "VND";

/** Step 3 primary: first expense; secondary: go to insights. */
export const ONBOARDING_PRIMARY_CTA = "Ghi chi đầu";
export const ONBOARDING_SECONDARY_CTA = "Vào tổng quan";

export const ONBOARDING_STEP_COUNT = 3 as const;

export type OnboardingStep = 1 | 2 | 3;

export const ONBOARDING_STEPS = [
  { step: 1 as const, title: "Cam kết của MoneyFlow", shortLabel: "Cam kết" },
  { step: 2 as const, title: "Ví tiền mặt", shortLabel: "Ví" },
  { step: 3 as const, title: "Ghi chi đầu tiên", shortLabel: "Ghi chi" },
] as const;

/** Visible progress label: "Bước 1/3". */
export function formatOnboardingProgressLabel(step: number): string {
  const n = isValidOnboardingStep(step) ? step : 1;
  return `Bước ${n}/${ONBOARDING_STEP_COUNT}`;
}

export function isValidOnboardingStep(step: number): step is OnboardingStep {
  return step === 1 || step === 2 || step === 3;
}

/** True only for product exits after onboarding (insights or quick ghi chi). */
export function isOnboardingExitHref(href: string): boolean {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) {
    return false;
  }
  const path = href.split("?")[0]!.split("#")[0]!;
  if (path === "/insights" || path === "/capture/quick") return true;
  return false;
}

/** Step 1 — trust: no bank password + export (+ delete). */
export const TRUST_PROMISES = [
  "Không hỏi mật khẩu / OTP ngân hàng",
  "Xuất dữ liệu (CSV) bất cứ lúc nào",
  "Có thể xóa dữ liệu bất cứ lúc nào",
] as const;

export type CashWalletDraft = {
  name: string;
  /** Integer minor units (VND đồng). */
  initialBalance: number;
};

export type CashWalletAccountLike = {
  id: string;
  name: string;
  kind: string;
  initialBalance?: number;
  isArchived?: boolean;
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

/** First active cash wallet, if any. */
export function findCashWallet(
  accounts: readonly CashWalletAccountLike[],
): CashWalletAccountLike | null {
  return accounts.find((account) => account.kind === "cash" && !account.isArchived) ?? null;
}

export function normalizeCashWalletName(raw: string): string {
  const name = raw.trim();
  if (!name) return DEFAULT_CASH_WALLET_NAME;
  return name.slice(0, 80);
}

export function isValidCashWalletDraft(draft: CashWalletDraft): boolean {
  const name = draft.name.trim();
  if (name.length < 1 || name.length > 80) return false;
  if (!Number.isSafeInteger(draft.initialBalance) || draft.initialBalance < 0) return false;
  return true;
}

/**
 * Build save payload for create/update cash wallet.
 * Money stays integer minor units; currency defaults to VND.
 */
export function buildCashWalletInput(
  draft: CashWalletDraft,
  existingId?: string,
): {
  id?: string;
  name: string;
  kind: "cash";
  currencyCode: "VND";
  initialBalance: number;
} {
  const initialBalance =
    Number.isSafeInteger(draft.initialBalance) && draft.initialBalance >= 0
      ? draft.initialBalance
      : 0;
  return {
    ...(existingId ? { id: existingId } : {}),
    name: normalizeCashWalletName(draft.name),
    kind: "cash",
    currencyCode: DEFAULT_CASH_WALLET_CURRENCY,
    initialBalance,
  };
}

export function draftFromCashWallet(
  account: CashWalletAccountLike | null | undefined,
): CashWalletDraft {
  if (!account) {
    return { name: DEFAULT_CASH_WALLET_NAME, initialBalance: 0 };
  }
  return {
    name: account.name || DEFAULT_CASH_WALLET_NAME,
    initialBalance:
      typeof account.initialBalance === "number" && Number.isSafeInteger(account.initialBalance)
        ? Math.max(0, account.initialBalance)
        : 0,
  };
}
