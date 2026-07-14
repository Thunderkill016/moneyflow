/**
 * Mask STK / bank-account-like digit runs for UI display (TASK-032).
 * Pure helper — does not mutate stored raw_snippet; use only at render time.
 * Keeps merchant names and typical VND money amounts readable.
 */

/** Continuous digit runs this long are treated as STK/card-like (not short amounts). */
const MIN_STK_DIGITS = 9;

/** Labeled STK/TK can be shorter (6+ digits after label). */
const MIN_LABELED_DIGITS = 6;

/** Keep last N digits visible so users can still recognize the account. */
const VISIBLE_TAIL = 4;

const BULLET = "•";

/**
 * Suffixes that mark a digit run as money, not account number.
 * Avoid bare `\b` after `đ` — JS word chars are [A-Za-z0-9_] only.
 */
const MONEY_SUFFIX =
  /^(?:\s*(?:k|K|tr|triệu|trieu|ngàn|ngan|nghìn|nghin)\b|\s*(?:đ|₫|d|vnd|VND|đồng|dong)(?:\b|(?=\s|$|[^0-9A-Za-z_])))/;

/**
 * Mask a pure digit string, keeping the last {@link VISIBLE_TAIL} digits.
 * e.g. "0123456789012" → "•••••••••9012"
 * Runs shorter than or equal to the tail are left as-is (nothing left to hide).
 */
export function maskDigitRun(digits: string): string {
  if (!digits) return digits;
  if (digits.length <= VISIBLE_TAIL) {
    return digits;
  }
  return BULLET.repeat(digits.length - VISIBLE_TAIL) + digits.slice(-VISIBLE_TAIL);
}

/**
 * Replace each digit in `formatted` with the corresponding char from a
 * fully-masked digit string (preserves spaces/dashes structure).
 */
function applyMaskPreservingSeparators(formatted: string, digitsOnly: string): string {
  const masked = maskDigitRun(digitsOnly);
  let i = 0;
  return formatted.replace(/\d/g, () => masked[i++] ?? BULLET);
}

/**
 * Redact STK-like digit runs in free text for safe UI snippets.
 *
 * - Long continuous runs (≥9 digits) → masked (tail visible)
 * - Labeled STK/TK/account (≥6 digits after label) → masked
 * - Card-like groups (4×4 with spaces/dashes) → masked
 * - Money with separators (45.000) or unit suffix (89k, 1200000đ) → kept
 * - Merchant / alpha text → kept
 */
export function maskAccountLikeDigits(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;

  let out = text;

  // 1) Labeled account numbers: STK 0123…, TK:…, số TK, account no
  // Body is either continuous digits OR spaced/dashed groups — never dots, and
  // never " -45" amount tails (space+sign is not a group separator here).
  out = out.replace(
    /\b((?:s[oốòóọỏõ]\s*)?(?:stk|tk)|account(?:\s*(?:no\.?|number|#))?)\b(\s*[:.#]?\s*)(\d{6,19}|(?:\d{3,5}[\s\-]){1,5}\d{2,5})/gi,
    (full, label: string, sep: string, nums: string) => {
      const digits = nums.replace(/\D/g, "");
      if (digits.length < MIN_LABELED_DIGITS) return full;
      return `${label}${sep}${applyMaskPreservingSeparators(nums, digits)}`;
    },
  );

  // 2) Continuous runs of MIN_STK_DIGITS+ digits (phones, STK, cards without separators)
  out = out.replace(new RegExp(`\\d{${MIN_STK_DIGITS},}`, "g"), (run, offset, whole) => {
    const after = typeof whole === "string" ? whole.slice(Number(offset) + run.length) : "";
    if (MONEY_SUFFIX.test(after)) return run;
    return maskDigitRun(run);
  });

  // 3) Card-style groups: 1234-5678-9012-3456 or spaced
  out = out.replace(
    /\b(\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{3,4})\b/g,
    (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 12) return match;
      return applyMaskPreservingSeparators(match, digits);
    },
  );

  // 4) Spaced STK-style medium runs: 0123 456 789 (9–19 digits total; no dots = not VND format)
  out = out.replace(
    /\b(\d{3,4}(?:[\s\-]\d{3,4}){2,4})\b/g,
    (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < MIN_STK_DIGITS || digits.length > 19) return match;
      return applyMaskPreservingSeparators(match, digits);
    },
  );

  return out;
}

/**
 * Display helper for raw_snippet / preview lines. Empty-safe.
 */
export function maskSnippetForDisplay(
  snippet: string | null | undefined,
): string {
  if (snippet == null) return "";
  if (snippet === "") return "";
  return maskAccountLikeDigits(snippet);
}
