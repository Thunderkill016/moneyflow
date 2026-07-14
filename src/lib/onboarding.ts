/**
 * First-run onboarding — thu chi (TASK-102).
 * 3 steps: trust → cash wallet → optional quick expense | skip → /insights.
 * Flag is client-only (localStorage) — no server persistence yet.
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

export const DEFAULT_CASH_WALLET_NAME = "Tiền mặt";

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
 * Money stays integer minor units.
 */
export function buildCashWalletInput(
  draft: CashWalletDraft,
  existingId?: string,
): {
  id?: string;
  name: string;
  kind: "cash";
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
