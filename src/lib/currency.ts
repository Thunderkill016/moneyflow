import type { AccountSummary } from "./accounts.ts";

/** ISO 4217 codes users may assign to accounts (post-MVP read-only FX). */
export const SUPPORTED_CURRENCY_CODES = [
  "VND",
  "USD",
  "EUR",
  "JPY",
  "SGD",
  "THB",
  "GBP",
  "AUD",
  "KRW",
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

const CURRENCY_LABELS: Record<SupportedCurrencyCode, string> = {
  VND: "VND — Đồng Việt Nam",
  USD: "USD — Đô la Mỹ",
  EUR: "EUR — Euro",
  JPY: "JPY — Yên Nhật",
  SGD: "SGD — Đô la Singapore",
  THB: "THB — Baht Thái",
  GBP: "GBP — Bảng Anh",
  AUD: "AUD — Đô la Úc",
  KRW: "KRW — Won Hàn",
};

/** ISO 4217 fraction digits for supported codes (others default to 2). */
export function currencyFractionDigits(currencyCode: string): number {
  const code = normalizeCurrencyCode(currencyCode);
  if (code === "VND" || code === "JPY" || code === "KRW") return 0;
  return 2;
}

export function normalizeCurrencyCode(code: string | null | undefined): string {
  const upper = (code ?? "VND").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return "VND";
}

export function isSupportedCurrencyCode(code: string): code is SupportedCurrencyCode {
  return (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(normalizeCurrencyCode(code));
}

export function currencySelectLabel(code: string): string {
  const normalized = normalizeCurrencyCode(code);
  if (isSupportedCurrencyCode(normalized)) return CURRENCY_LABELS[normalized];
  return normalized;
}

export function currencySymbolHint(currencyCode: string): string {
  const code = normalizeCurrencyCode(currencyCode);
  if (code === "VND") return "₫";
  return code;
}

export type CurrencyTotal = {
  currencyCode: string;
  total: number;
  count: number;
};

/**
 * Sum balances per currency. Never mixes FX into one number.
 * Active accounts only (caller filters archived if needed).
 */
export function totalsByCurrency(accounts: Pick<AccountSummary, "currencyCode" | "balance">[]): CurrencyTotal[] {
  const map = new Map<string, CurrencyTotal>();
  for (const account of accounts) {
    const currencyCode = normalizeCurrencyCode(account.currencyCode);
    const balance = account.balance;
    if (!Number.isSafeInteger(balance)) continue;
    const current = map.get(currencyCode);
    if (current) {
      const next = current.total + balance;
      if (!Number.isSafeInteger(next)) continue;
      current.total = next;
      current.count += 1;
    } else {
      map.set(currencyCode, { currencyCode, total: balance, count: 1 });
    }
  }
  // VND first, then alpha
  return [...map.values()].sort((a, b) => {
    if (a.currencyCode === "VND") return -1;
    if (b.currencyCode === "VND") return 1;
    return a.currencyCode.localeCompare(b.currencyCode);
  });
}

/** Primary VND total for dashboard reporting; FX accounts are excluded. */
export function vndTotalBalance(accounts: Pick<AccountSummary, "currencyCode" | "balance">[]): number {
  return totalsByCurrency(accounts)
    .filter((row) => row.currencyCode === "VND")
    .reduce((sum, row) => sum + row.total, 0);
}

/**
 * Same-currency transfer only. No FX rate / cross-currency move.
 */
export function canTransferSameCurrency(
  source: Pick<AccountSummary, "id" | "currencyCode" | "isArchived">,
  destination: Pick<AccountSummary, "id" | "currencyCode" | "isArchived">,
): boolean {
  if (source.id === destination.id) return false;
  if (source.isArchived || destination.isArchived) return false;
  return normalizeCurrencyCode(source.currencyCode) === normalizeCurrencyCode(destination.currencyCode);
}

export function transferCurrencyMismatchMessage(): string {
  return "Chỉ chuyển được giữa hai tài khoản cùng loại tiền. Chưa hỗ trợ đổi ngoại tệ.";
}
