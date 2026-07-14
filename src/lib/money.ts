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

/** Digits-only major units (thousand separators ok). */
export function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Major-unit integer input → minor units for the currency. */
export function parseMoneyInputToMinor(value: string, currencyCode = "VND") {
  const major = parseMoneyInput(value);
  const scale = 10 ** currencyFractionDigits(currencyCode);
  const minor = major * scale;
  return Number.isSafeInteger(minor) ? minor : 0;
}

/** Minor units → digit string for money inputs (whole major units). */
export function formatMoneyInputFromMinor(amount: number, currencyCode = "VND") {
  const scale = 10 ** currencyFractionDigits(currencyCode);
  const major = Math.trunc(Math.abs(amount) / scale);
  return major ? new Intl.NumberFormat("vi-VN").format(major) : "";
}

export function formatMoneyInput(value: string) {
  const amount = parseMoneyInput(value);
  return amount ? new Intl.NumberFormat("vi-VN").format(amount) : "";
}
