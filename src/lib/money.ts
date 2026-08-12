import { currencyFractionDigits, normalizeCurrencyCode } from "./currency.ts";

export type MoneySignKind = "income" | "expense" | "transfer";

/**
 * Format integer minor units for a currency.
 * VND minor = 1 đồng; USD/EUR minor = 1 cent (ISO 4217).
 */
export function formatMoney(amount: number, compact = false, currencyCode = "VND") {
  const code = normalizeCurrencyCode(currencyCode);
  const digits = currencyFractionDigits(code);

  if (compact && code === "VND" && Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(millions)} tr`;
  }

  const major = amount / 10 ** digits;
  if (code === "VND") {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(major)} ₫`;
  }

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(major);
  } catch {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(major)} ${code}`;
  }
}

/** Signed display so thu/chi is never color-only (+ / − / ↔). */
export function formatSignedMoney(amount: number, compact = false, currencyCode = "VND") {
  if (amount > 0) return `+ ${formatMoney(amount, compact, currencyCode)}`;
  if (amount < 0) return `− ${formatMoney(Math.abs(amount), compact, currencyCode)}`;
  return formatMoney(0, compact, currencyCode);
}

/** Prefix for a known ledger kind (amount is always positive in store). */
export function moneyKindPrefix(kind: MoneySignKind): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔";
  return "−";
}

export function formatMoneyWithKind(
  amount: number,
  kind: MoneySignKind,
  compact = false,
  currencyCode = "VND",
) {
  const prefix = moneyKindPrefix(kind);
  const body = formatMoney(Math.abs(amount), compact, currencyCode);
  return kind === "transfer" ? `${prefix} ${body}` : `${prefix} ${body}`;
}

/**
 * The money-entry contract.
 *
 * Every shipped amount field takes **whole major units** — đồng for VND — and
 * relies on `formatMoneyInput` to insert grouping separators as you type. A
 * separator therefore never needs to be typed, and cannot mean a fraction.
 *
 * The danger this contract exists to remove: stripping every non-digit made
 * `12,5` parse as `125`, silently multiplying the amount by ten while the field
 * looked accepted. The rule is now explicit — a separator is *grouping* when it
 * splits the digits into three-digit groups, and anything else is a **fraction
 * attempt**, which is rejected rather than reinterpreted.
 *
 * Rejection is signalled with `NaN` on purpose: every caller already guards with
 * `Number.isSafeInteger(...)`, so a rejected entry fails closed everywhere,
 * including the one field where `0` is a legitimate value (an account's opening
 * balance). A zero sentinel would have been silently accepted there.
 */

/**
 * The message a rejected fraction entry shows.
 *
 * Phrased to begin with "Nhập số tiền" on purpose: the dialogs already route an
 * error starting with that prefix to the amount field itself, so the user sees it
 * next to the input rather than in a detached alert.
 */
export const MONEY_FRACTION_ENTRY_MESSAGE =
  "Nhập số tiền nguyên, không dùng dấu thập phân.";

/**
 * A separator followed by one or two digits, at the end of the number.
 *
 * Anchoring on `$` alone was defeated by any trailing non-digit — `12,5₫` and a
 * pasted `12.5 VND` both slipped through, and this repository already treats
 * `"45.000 ₫"` as realistic pasted input. The number is therefore located first
 * and the tail checked within it.
 */
const FRACTION_TAIL = /[.,\u00a0\s](\d{1,2})$/u;

/** Digits and separators only: strips currency marks, signs and stray letters. */
function numericPortion(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\d.,\u00a0\s]/gu, "")
    .trim()
    .replace(/[.,\u00a0\s]+$/u, "");
}

/**
 * Does this text try to express a fraction?
 *
 * Checked against the raw text, because the information is destroyed the moment
 * separators are stripped. Applies to every currency: entry is integer
 * major-units for all of them, so a fraction tail is out of contract regardless
 * of how many minor digits the currency has.
 */
export function isFractionAttempt(value: string): boolean {
  const numeric = numericPortion(value);
  if (!numeric) return false;
  // A trailing separator is mid-typing, not yet a fraction: `12.` is on its way to
  // `12.500`, and rejecting it would fight the user as they type.
  return FRACTION_TAIL.test(numeric);
}

/**
 * Digits-only major units; grouping separators are accepted and removed.
 *
 * Returns `NaN` for a fraction attempt so callers reject it instead of saving a
 * different number from the one the user believes they typed.
 */
export function parseMoneyInput(value: string) {
  if (isFractionAttempt(value)) return Number.NaN;
  // NFKC first: fullwidth digits would otherwise be stripped as non-digits and
  // silently read as an empty amount.
  const digits = value.normalize("NFKC").replace(/\D/gu, "");
  return digits ? Number(digits) : 0;
}

/** Major-unit integer input → minor units for the currency. */
export function parseMoneyInputToMinor(value: string, currencyCode = "VND") {
  const major = parseMoneyInput(value);
  // A rejected entry must stay rejected rather than collapsing to zero.
  if (!Number.isFinite(major)) return Number.NaN;
  const scale = 10 ** currencyFractionDigits(currencyCode);
  const minor = major * scale;
  return Number.isSafeInteger(minor) ? minor : Number.NaN;
}


/** Minor units → digit string for money inputs (whole major units). */
export function formatMoneyInputFromMinor(amount: number, currencyCode = "VND") {
  const scale = 10 ** currencyFractionDigits(currencyCode);
  const major = Math.trunc(Math.abs(amount) / scale);
  return major ? new Intl.NumberFormat("vi-VN").format(major) : "";
}

/**
 * Format while typing, without ever changing the magnitude on screen.
 *
 * A fraction attempt is returned as the user typed it (minus stray characters)
 * so the separator stays visible and the mismatch is theirs to see. Collapsing
 * it into a grouped integer was the silent rewrite this function must not do.
 */
export function formatMoneyInput(value: string) {
  if (isFractionAttempt(value)) return numericPortion(value);
  const amount = parseMoneyInput(value);
  return Number.isSafeInteger(amount) && amount
    ? new Intl.NumberFormat("vi-VN").format(amount)
    : "";
}
