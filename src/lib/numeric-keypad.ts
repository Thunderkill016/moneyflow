/**
 * Pure helpers for the on-screen numeric keypad used by keypad-first capture.
 *
 * Amounts are kept as plain digit strings here; display formatting always goes
 * through `formatMoneyInput` in `src/lib/money.ts` so the keypad and typing
 * share one pipeline and one source of truth.
 */

import { parseMoneyInput } from "./money.ts";

const MAX_DIGITS = 15;

/**
 * Resolve the current field value to the digit string keypad taps append to.
 * Formatted values ("50.000") and shorthand drafts ("50k") resolve to their
 * numeric meaning; anything unparseable falls back to its raw digits.
 */
function currentDigits(current: string): string {
  const numeric = parseMoneyInput(current);
  if (numeric) return String(numeric);
  return current.replace(/\D/g, "");
}

/** Append a keypad digit ("0"-"9" or "00") to the current raw amount. */
export function appendKeypadDigit(current: string, digit: string): string {
  const digitsOnly = currentDigits(current);
  if (digit !== "00" && !/^[0-9]$/.test(digit)) return digitsOnly;
  if (digit === "00") {
    // Never start an amount with "00".
    if (!digitsOnly) return "";
    return (digitsOnly + "00").slice(0, MAX_DIGITS);
  }
  // Strip leading zeros ("0" then "5" becomes "5", not "05").
  return (digitsOnly + digit).replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
}

/** Remove the last digit (keypad backspace). */
export function backspaceKeypad(current: string): string {
  return currentDigits(current).slice(0, -1);
}

/** Clear the whole amount (keypad clear). */
export function clearKeypad(): string {
  return "";
}
