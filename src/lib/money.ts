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
 * Vietnamese shorthand units — the way people actually write đồng.
 *
 * `k` is nghìn (×1 000); `tr`, `triệu`, `trieu` and `củ` are triệu
 * (×1 000 000); `tỷ`, `tỉ` and `ty` are tỷ (×1 000 000 000). Digits after the
 * unit are the fraction of that unit (`1tr5` = 1,5 triệu = 1 500 000), and a
 * `.`/`,` inside the number means the same (`1,5tr`, `1.5tr`). Bare `m` stays
 * unsupported on purpose — it reads as million or minute and must not guess.
 *
 * Any entry that looks like shorthand is parsed by these rules or rejected
 * with `NaN`: a malformed unit must never fall through to the digits-only
 * path and silently drop the unit (`k50`, `tr`, `1tr5x`).
 */
const VND_SHORTHAND_SCALE: Record<string, number> = {
  k: 1_000,
  tr: 1_000_000,
  triệu: 1_000_000,
  trieu: 1_000_000,
  củ: 1_000_000,
  tỷ: 1_000_000_000,
  tỉ: 1_000_000_000,
  ty: 1_000_000_000,
};

/** A complete unit anywhere in the entry forces the shorthand grammar. */
const VND_SHORTHAND_UNIT = /k|triệu|trieu|tr|củ|tỷ|tỉ|ty/iu;

/**
 * A half-typed unit at the end of the entry — `1t`, `3 c` — counts as
 * shorthand too, so the formatter keeps it on screen instead of swallowing
 * the `t` out of `tr` mid-typing, and the parser refuses to read a stray
 * partial unit as a plain integer. The prefix must follow a digit, a
 * separator, a space or the string start, which keeps pasted words like
 * `Total: 45.000` or `cat` on the normal digits-only path.
 */
const VND_SHORTHAND_TYPING_TAIL =
  /(?:^|[\d.,\u00a0\s])(?:k|triệu|triệ|trieu|trie|tri|tr|tỷ|tỉ|ty|t|củ|c)$/iu;

/** `<number> <unit> <unit-fraction digits>` — the whole entry, nothing else. */
const VND_SHORTHAND_PATTERN =
  /^([\d.,\u00a0\s]*\d[\d.,\u00a0\s]*?)[\u00a0\s]*(k|triệu|trieu|tr|củ|tỷ|tỉ|ty)(\d*)$/iu;

/**
 * Characters kept on screen while shorthand is being typed: digits,
 * separators, spaces and the alphabet of every unit. Anything else (`₫`,
 * stray letters) is cleaned away exactly like the plain path cleans it.
 */
const VND_SHORTHAND_NOISE = /[^\d.,\u00a0\sktriecuệủỷỉy]/giu;

/**
 * Does this entry look like shorthand — a complete unit, or the tail of one
 * still being typed? Everything matching is governed by the shorthand rules:
 * valid input scales to an integer, invalid input rejects, and neither is
 * ever re-read as a stripped-digit guess.
 */
function isVndShorthandCandidate(value: string) {
  const normalized = value.normalize("NFKC").trim();
  return (
    VND_SHORTHAND_UNIT.test(normalized) ||
    VND_SHORTHAND_TYPING_TAIL.test(normalized)
  );
}

/**
 * Split the leading number of a shorthand into whole and fraction digits.
 *
 * Three-digit groups keep the plain contract's grouping rule (`1.234tr` =
 * 1 234 triệu); a single separator with any other tail is the decimal
 * fraction (`1,5tr`, `12,5tr`). Anything messier — `1.2.3`, a leading
 * separator, three or more parts — fails closed.
 */
function splitVndShorthandNumber(text: string) {
  const cleaned = text.trim();
  if (!/^\d[\d.,\u00a0\s]*$/u.test(cleaned)) return null;
  const groups = cleaned.split(/[.,\u00a0\s]+/u);
  if (groups.length === 1) return { whole: groups[0], fraction: "" };
  const [head, ...tails] = groups;
  if (head.length <= 3 && tails.every((group) => group.length === 3)) {
    return { whole: groups.join(""), fraction: "" };
  }
  if (groups.length === 2) return { whole: head, fraction: tails[0] };
  return null;
}

/**
 * Parse `<number><unit>` shorthand to an exact integer, or `NaN` when it is
 * malformed or finer than one đồng. `undefined` means the entry carries no
 * shorthand at all and the caller keeps the plain contract.
 *
 * All scales are powers of ten, so the unit fraction is resolved with digit
 * strings — never floats: `tr5` contributes `5 × 10⁵`, and a fraction longer
 * than the unit can express is only exact on trailing zeros (`1tr5000000` =
 * 1 500 000); anything else is refused rather than rounded.
 */
function parseVndShorthand(value: string): number | undefined {
  if (!isVndShorthandCandidate(value)) return undefined;
  const match = VND_SHORTHAND_PATTERN.exec(value.normalize("NFKC").trim());
  const parts = match ? splitVndShorthandNumber(match[1]) : null;
  if (!match || !parts) return Number.NaN;
  const [, , unit, tail = ""] = match;
  // `1,5tr5` carries two fractions — one from the separator, one after the
  // unit — and guessing either is the silent rewrite this contract forbids.
  if (parts.fraction && tail) return Number.NaN;
  const scale = VND_SHORTHAND_SCALE[unit.toLowerCase()];
  const whole = Number(parts.whole);
  if (!scale || !Number.isSafeInteger(whole)) return Number.NaN;
  const fraction = parts.fraction || tail;
  const shift = Math.log10(scale);
  let fractionUnits = 0;
  if (fraction.length > shift) {
    if (!/^0+$/u.test(fraction.slice(shift))) return Number.NaN;
    fractionUnits = Number(fraction.slice(0, shift));
  } else if (fraction) {
    fractionUnits = Number(fraction) * 10 ** (shift - fraction.length);
  }
  const total = whole * scale + fractionUnits;
  return Number.isSafeInteger(total) ? total : Number.NaN;
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
  // Shorthand-looking text answers to the shorthand rules instead — it is a
  // scaled integer or invalid input there, never a fraction attempt.
  if (parseVndShorthand(value) !== undefined) return false;
  const numeric = numericPortion(value);
  if (!numeric) return false;
  // A trailing separator is mid-typing, not yet a fraction: `12.` is on its way to
  // `12.500`, and rejecting it would fight the user as they type.
  return FRACTION_TAIL.test(numeric);
}

/**
 * Digits-only major units; grouping separators are accepted and removed, and
 * a Vietnamese unit suffix scales the entry (`50k`, `1tr5`, `2tỷ`).
 *
 * Returns `NaN` for a fraction attempt or a malformed shorthand so callers
 * reject it instead of saving a different number from the one the user
 * believes they typed.
 */
export function parseMoneyInput(value: string) {
  const shorthand = parseVndShorthand(value);
  if (shorthand !== undefined) return shorthand;
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
 *
 * Shorthand is kept on screen as typed too — expanding `50k` to `50.000` while
 * the user is still reaching for the `5` in `1tr5` would destroy the entry,
 * and stripping the unit would silently divide the amount they believe they
 * typed.
 */
export function formatMoneyInput(value: string) {
  if (isVndShorthandCandidate(value)) {
    return value
      .normalize("NFKC")
      .replace(VND_SHORTHAND_NOISE, "")
      .trim();
  }
  if (isFractionAttempt(value)) return numericPortion(value);
  const amount = parseMoneyInput(value);
  return Number.isSafeInteger(amount) && amount
    ? new Intl.NumberFormat("vi-VN").format(amount)
    : "";
}
