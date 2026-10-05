/**
 * Paste-anything text parser (wireframes-inbox §6).
 * Money amounts are integer VND đồng (minor units). No float.
 */

import { normalizeStrictSourceDate } from "./source-adapter.ts";
import { todayInVietnam } from "../vietnam-date.ts";
import type {
  CandidateConfidence,
  CandidateKind,
  CreateCandidateInput,
} from "./candidate-store.ts";

export type PasteSourceHint = "auto" | "sms" | "wallet" | "other";

export type UncertainField = "amount" | "merchant" | "date" | "kind";

export type ParsedCandidate = {
  kind: CandidateKind;
  /** Absolute amount in VND đồng (integer, > 0). */
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  confidence: CandidateConfidence;
  uncertainFields: UncertainField[];
  /** Vietnamese tips for fields that need review. */
  explanations: string[];
  rawSnippet: string;
  /** Set when a local rule matched (TASK-014). */
  category?: string;
  matchedRuleId?: string;
  matchedRuleSummary?: string;
};

export type ParseTextOptions = {
  sourceHint?: PasteSourceHint;
  /** Override "today" as YYYY-MM-DD (Asia/Ho_Chi_Minh-friendly). */
  today?: string;
};

export type ParseTextResult = {
  ok: boolean;
  candidates: ParsedCandidate[];
  needsReviewCount: number;
  /** User-facing error when nothing usable was found. */
  error?: string;
};

// Match folded Vietnamese text: JavaScript word boundaries do not treat
// accented Vietnamese letters as word characters.
const INCOME_HINT =
  /\b(luong|salary|thu\s+nhap|nhan|cong|hoan\s+tien|refund)\b/i;
const TRANSFER_HINT = /\b(ck|chuyen|transfer)\b/i;
const INTERNAL_TRANSFER_HINT =
  /\b(noi\s+bo|giua\s+(?:cac\s+)?tai\s+khoan\s+cua\s+minh)\b/i;
const EXPENSE_HINT =
  /\b(chi|thanh\s+toan|mua|cafe|ca\s+phe|grab|an\s+uong|tien\s+an|do\s+xang)\b/i;

function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d");
}

const KNOWN_MERCHANTS: { pattern: RegExp; name: string }[] = [
  { pattern: /\bhighlands?\b/i, name: "Highlands Coffee" },
  { pattern: /\bcircle\s*k\b/i, name: "Circle K" },
  { pattern: /\bgrab\b/i, name: "Grab" },
  { pattern: /\bshopee\b/i, name: "Shopee" },
  { pattern: /\blazada\b/i, name: "Lazada" },
  { pattern: /\bmomo\b/i, name: "MoMo" },
  { pattern: /\bzalo\s*pay\b/i, name: "ZaloPay" },
  { pattern: /\bvinmart|winmart\b/i, name: "WinMart" },
  { pattern: /\bgs25\b/i, name: "GS25" },
  { pattern: /\b7\s*-\s*eleven|7eleven\b/i, name: "7-Eleven" },
];

/** Match amount tokens: 45k, 1.5tr, 45.000, 45,000₫, -120000 VND, etc. */
const AMOUNT_TOKEN =
  /([+-])?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*)(k|K|nghìn|nghin|ngàn|ngan|triệu|trieu|tr|m|M)?(\s*)(đ|d|vnd|VND|₫)?/g;

const DATE_TOKEN =
  /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}([/.\-])\d{1,2}(?:\2\d{2,4})?)\b/g;
const DATE_AMOUNT_SEPARATOR = "|";

// Aliased from the single owner so inbox parsers keep their local name while the
// rule itself lives in one tested place. Re-exported as a binding rather than
// `export … from`, because this module also calls it below.
export const todayInHoChiMinh = todayInVietnam;

/**
 * Parse a single amount token body into integer VND đồng.
 * Returns null if unsafe / zero / unparseable.
 */
export function parseVndAmountToken(
  rawNumber: string,
  unit?: string | null,
): number | null {
  const unitNorm = (unit ?? "").toLowerCase().trim();
  const cleaned = rawNumber.trim();
  if (!cleaned) return null;

  // Multiplier units first (k / tr) — may include decimal: 1.5tr, 45k
  if (
    unitNorm === "k" ||
    unitNorm === "nghìn" ||
    unitNorm === "nghin" ||
    unitNorm === "ngàn" ||
    unitNorm === "ngan"
  ) {
    const base = parseDecimalLoose(cleaned);
    if (base === null) return null;
    return toSafeInt(Math.round(base * 1_000));
  }
  if (
    unitNorm === "tr" ||
    unitNorm === "triệu" ||
    unitNorm === "trieu" ||
    unitNorm === "m"
  ) {
    const base = parseDecimalLoose(cleaned);
    if (base === null) return null;
    return toSafeInt(Math.round(base * 1_000_000));
  }

  // Integer with thousand separators: 45.000 / 45,000 / 1.250.000
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    const digits = cleaned.replace(/[.,]/g, "");
    const n = Number(digits);
    return toSafeInt(n);
  }

  // Plain integer digits
  if (/^\d+$/.test(cleaned)) {
    return toSafeInt(Number(cleaned));
  }

  // Decimal without unit is ambiguous (e.g. 45.5) — reject for money safety
  return null;
}

function parseDecimalLoose(value: string): number | null {
  // 1.5 or 1,5
  if (/^\d+[.,]\d+$/.test(value)) {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  // 1.234.5 invalid for our purposes
  return null;
}

function toSafeInt(n: number): number | null {
  if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

export type ExtractedAmount = {
  amount: number;
  index: number;
  length: number;
  signedNegative: boolean;
  raw: string;
  /**
   * The token carried a sign, a magnitude unit or a currency suffix — direct
   * evidence that the writer meant money rather than an identifier. A bare run
   * of digits can survive the guards below and still be an account number, so
   * this is what `selectPrimaryAmount` ranks on.
   */
  hasMoneyMarker: boolean;
};

export function extractAmounts(line: string): ExtractedAmount[] {
  const results: ExtractedAmount[] = [];
  const amountLine = line.replace(new RegExp(DATE_TOKEN.source, "g"), (token) =>
    /^\d{1,2}\.\d{1,2}$/.test(token) ? token : DATE_AMOUNT_SEPARATOR.repeat(token.length),
  );
  const re = new RegExp(AMOUNT_TOKEN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(amountLine)) !== null) {
    const sign = match[1] ?? "";
    const num = match[2] ?? "";
    const unit = match[4] ?? "";
    const currency = match[6] ?? "";
    const amount = parseVndAmountToken(num, unit || null);
    if (amount === null) continue;

    const hasMoneyMarker = Boolean(unit || currency || sign);
    // Bare integers need stronger evidence they are money (not account/date fragments).
    if (!hasMoneyMarker) {
      // Ignore short codes / years
      if (amount < 1000) continue;
      if (amount >= 1900 && amount <= 2100) continue;
      // Ignore last-4 account digits: TK ****1234, *1234, #1234
      const before = line.slice(Math.max(0, match.index - 4), match.index);
      if (/[*#xX]$/.test(before) || /\*{2,}$/.test(before)) continue;
      // Prefer thousand-separated form (45.000) or 5+ digit plain amounts
      const looksGrouped = /^\d{1,3}([.,]\d{3})+$/.test(num);
      if (!looksGrouped && amount < 10_000) continue;
    }

    const leadingWhitespace = match[0].length - match[0].trimStart().length;
    const raw = match[0].trim();
    results.push({
      amount,
      index: match.index + leadingWhitespace,
      length: raw.length,
      signedNegative: sign === "-",
      raw,
      hasMoneyMarker,
    });
  }
  return results;
}

function labelledAmountRole(line: string, amount: ExtractedAmount) {
  if (!amount.hasMoneyMarker) return "unknown";
  const prefix = foldVietnamese(line.slice(0, amount.index));
  // A note can itself contain separators and quoted labels. Conservatively
  // treat the rest of the line as note evidence, rather than promote its labels.
  if (/\b(?:nd|noi\s+dung|ghi\s+chu|description|note)\s*[:=]/i.test(prefix)) {
    return "unknown";
  }
  // Check fees first: "Phí giao dịch:" contains a transaction-looking suffix.
  if (
    /(?:^|[|;\n:])\s*(?:sd|so\s+du|phi(?:\s+(?:gd|giao\s+dich))?)\s*[:=]\s*$/i.test(
      prefix,
    )
  ) {
    return "non-transaction";
  }
  if (
    /(?:^|[|;\n:])\s*(?:gd|giao\s+dich|so\s+tien\s+giao\s+dich)\s*[:=]\s*$/i.test(
      prefix,
    )
  ) {
    return "transaction";
  }
  return "unknown";
}

/**
 * Money-marked tokens outrank bare identifiers. With source text, bounded field
 * labels can prioritize a transaction over balances and fees. Unclassified or
 * repeated marked money stays ambiguous; without labels, preserve tier/order.
 */
export function selectPrimaryAmount(
  amounts: ExtractedAmount[],
  line?: string,
): { primary: ExtractedAmount; ambiguous: boolean } | null {
  if (amounts.length === 0) return null;

  const marked = amounts.filter((item) => item.hasMoneyMarker);
  const tier = marked.length > 0 ? marked : amounts;

  if (line !== undefined) {
    const labelled = tier.map((amount) => ({
      amount,
      role: labelledAmountRole(line, amount),
    }));
    const transactions = labelled.filter((item) => item.role === "transaction");
    if (transactions.length) {
      return {
        primary: transactions[0]!.amount,
        ambiguous:
          transactions.length > 1 ||
          labelled.some((item) => item.role === "unknown"),
      };
    }
  }

  return { primary: tier[0]!, ambiguous: tier.length > 1 };
}

type ExtractedDate = {
  date: string;
  issue?: "missing" | "invalid" | "conflicting" | "inferred-year";
};

function extractDate(line: string, today: string): ExtractedDate {
  const anchor = normalizeStrictSourceDate({
    value: today,
    format: "iso-date",
    calendarSemantics: "date-only",
  });
  if (!anchor.ok) throw new Error("invalid_paste_date_anchor");
  const dates: string[] = [];
  let invalid = false;
  let inferredYear = false;
  // Consume the full date, including unsupported two-digit years, so a bad
  // year cannot be silently discarded and reinterpreted as day/month.
  const tokens = line.matchAll(new RegExp(DATE_TOKEN.source, "g"));
  for (const match of tokens) {
    const raw = match[1]!;
    const iso = /^\d{4}-/.test(raw);
    const parts = raw.split(/[/.\-]/);
    const missingYear = !iso && parts.length === 2;
    const value = iso
      ? raw
      : `${parts[0]}/${parts[1]}/${missingYear ? today.slice(0, 4) : parts[2]}`;
    const result = normalizeStrictSourceDate({
      value,
      format: iso ? "iso-date" : "dmy-date",
      calendarSemantics: "date-only",
    });
    if (!result.ok) invalid = true;
    else dates.push(result.date);
    inferredYear ||= missingYear;
  }
  for (const match of foldVietnamese(line).matchAll(
    /\bhom\s+(nay|qua|kia)\b/gi,
  )) {
    const daysAgo = { nay: 0, qua: 1, kia: 2 }[match[1]!.toLowerCase()]!;
    const date = new Date(`${today}T00:00:00Z`);
    // Shift calendar days rather than local instants; the anchor already uses
    // the Vietnam day and must not depend on the host timezone.
    date.setUTCDate(date.getUTCDate() - daysAgo);
    dates.push(date.toISOString().slice(0, 10));
  }
  if (invalid) return { date: today, issue: "invalid" };
  if (new Set(dates).size > 1) return { date: today, issue: "conflicting" };
  if (!dates.length) return { date: today, issue: "missing" };
  return {
    date: dates[0]!,
    ...(inferredYear ? { issue: "inferred-year" as const } : {}),
  };
}

function detectKind(
  line: string,
  signedNegative: boolean,
): { kind: CandidateKind; uncertain: boolean } {
  const folded = foldVietnamese(line);
  const internal = INTERNAL_TRANSFER_HINT.test(folded);
  const expense = EXPENSE_HINT.test(folded);
  const income =
    INCOME_HINT.test(folded) || (line.includes("+") && !signedNegative);
  if (internal) return { kind: "transfer", uncertain: expense || income };
  if (expense && !income) return { kind: "expense", uncertain: false };
  if (income && !expense) return { kind: "income", uncertain: signedNegative };
  if (TRANSFER_HINT.test(folded)) return { kind: "expense", uncertain: true };
  if (signedNegative && !income) return { kind: "expense", uncertain: false };
  // Source labels do not establish the economic meaning of an unsigned row.
  // Keep the existing expense suggestion, but require the user to review it.
  return { kind: "expense", uncertain: true };
}

function extractMerchant(line: string): {
  merchant: string;
  uncertain: boolean;
} {
  for (const entry of KNOWN_MERCHANTS) {
    if (entry.pattern.test(line)) {
      return { merchant: entry.name, uncertain: false };
    }
  }

  // Remove amount tokens and common noise
  let rest = line;
  rest = rest.replace(new RegExp(AMOUNT_TOKEN.source, "g"), " ");
  rest = rest.replace(
    /\b(20\d{2}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}(?:[/.]20\d{2})?)\b/g,
    " ",
  );
  rest = rest.replace(
    /\b(vnd|đ|tien mat|tiền mặt|cash|sms|nh|vi|ví|so du|số dư|tk|gd|tai|tại|phat sinh|phát sinh)\b/gi,
    " ",
  );
  rest = rest.replace(/[|•·:;,+\-–—]+/g, " ");
  rest = rest.replace(/\s+/g, " ").trim();

  // Drop pure noise words
  rest = rest
    .split(" ")
    .filter((w) => w.length > 1 || /[a-zA-ZÀ-ỹ]/.test(w))
    .join(" ")
    .trim();

  if (!rest) {
    return { merchant: "Không rõ", uncertain: true };
  }

  // Title-case short merchant phrases
  const merchant = rest.length > 48 ? rest.slice(0, 48).trim() : rest;
  const looksGeneric =
    /^(chi|thu|giao dich|giao dịch|note|ghi chu|ghi chú)$/i.test(merchant);
  return {
    merchant: capitalizeWords(merchant),
    uncertain: looksGeneric || merchant.length < 2,
  };
}

function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      // Keep all-caps bank codes short
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function scoreConfidence(uncertain: UncertainField[]): CandidateConfidence {
  if (uncertain.length === 0) return "high";
  if (uncertain.length === 1 && uncertain[0] === "date") return "medium";
  if (uncertain.includes("amount") || uncertain.includes("merchant"))
    return "low";
  if (uncertain.length >= 2) return "low";
  return "medium";
}

function buildExplanations(
  fields: UncertainField[],
  dateIssue?: ExtractedDate["issue"],
): string[] {
  const tips: string[] = [];
  if (fields.includes("amount")) {
    tips.push("Không chắc số tiền — kiểm tra trước khi duyệt.");
  }
  if (fields.includes("merchant")) {
    tips.push("Chưa rõ nơi chi / người nhận — bổ sung khi duyệt.");
  }
  if (fields.includes("date")) {
    const dateTips = {
      missing: "Không thấy ngày trong text — dùng hôm nay.",
      invalid:
        "Ngày trong text không hợp lệ hoặc chưa xác định — tạm dùng hôm nay, hãy sửa trước khi duyệt.",
      conflicting:
        "Các ngày trong text mâu thuẫn — tạm dùng hôm nay, hãy chọn ngày đúng trước khi duyệt.",
      "inferred-year":
        "Text chưa có năm — tạm dùng năm hiện tại, hãy kiểm tra trước khi duyệt.",
    };
    tips.push(dateTips[dateIssue ?? "missing"]);
  }
  if (fields.includes("kind")) {
    tips.push(
      "Chưa chắc chi / thu / chuyển khoản — kiểm tra loại giao dịch trước khi duyệt.",
    );
  }
  return tips;
}

/**
 * Parse one non-empty line into at most one candidate (primary amount).
 */
export function parsePasteLine(
  line: string,
  options: ParseTextOptions = {},
): ParsedCandidate | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const today = options.today ?? todayInHoChiMinh();
  const selected = selectPrimaryAmount(extractAmounts(trimmed), trimmed);
  if (!selected) return null;

  const primary = selected.primary;
  const uncertainFields: UncertainField[] = [];

  if (selected.ambiguous) {
    uncertainFields.push("amount");
  }

  const { date, issue: dateIssue } = extractDate(trimmed, today);
  if (dateIssue) uncertainFields.push("date");

  const { kind, uncertain: kindUncertain } = detectKind(
    trimmed,
    primary.signedNegative,
  );
  if (kindUncertain) uncertainFields.push("kind");

  const { merchant, uncertain: merchantUncertain } = extractMerchant(trimmed);
  if (merchantUncertain) uncertainFields.push("merchant");

  // Dedupe uncertain fields
  const unique = [...new Set(uncertainFields)];
  // Field explanations are preview-only; low confidence persists into Inbox
  // and prevents an ambiguous kind or invalid/conflicting date becoming ready
  // because a rule supplied account/category defaults.
  const confidence =
    kindUncertain || (dateIssue && dateIssue !== "missing")
      ? "low"
      : scoreConfidence(unique);

  return {
    kind,
    amount: primary.amount,
    merchant,
    note: "",
    occurredOn: date,
    confidence,
    uncertainFields: unique,
    explanations: buildExplanations(unique, dateIssue),
    rawSnippet: trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed,
  };
}

/**
 * Parse multi-line paste text into inbox candidate drafts.
 */
export function parsePasteText(
  text: string,
  options: ParseTextOptions = {},
): ParseTextResult {
  const raw = text ?? "";
  if (!raw.trim()) {
    return {
      ok: false,
      candidates: [],
      needsReviewCount: 0,
      error: "Dán nội dung trước khi phân tích.",
    };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Also try whole text as one block if multi-amount single paragraph
  const candidates: ParsedCandidate[] = [];
  for (const line of lines) {
    const parsed = parsePasteLine(line, options);
    if (parsed) candidates.push(parsed);
  }

  // Single paragraph with multiple amounts on one line: split by amount regions
  if (candidates.length === 0 && lines.length === 1) {
    const line = lines[0]!;
    const amounts = extractAmounts(line);
    if (amounts.length > 1) {
      for (const amt of amounts) {
        const slice = line.slice(
          Math.max(0, amt.index - 24),
          Math.min(line.length, amt.index + amt.length + 24),
        );
        const parsed = parsePasteLine(slice, options);
        if (parsed) {
          candidates.push({
            ...parsed,
            amount: amt.amount,
            rawSnippet: line.length > 160 ? `${line.slice(0, 157)}…` : line,
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      candidates: [],
      needsReviewCount: 0,
      error:
        "Không tìm thấy số tiền hợp lệ. Thử dạng “cafe 45k” hoặc “45.000 VND”.",
    };
  }

  const needsReviewCount = candidates.filter(
    (c) => c.confidence === "low" || c.uncertainFields.length > 0,
  ).length;

  return {
    ok: true,
    candidates,
    needsReviewCount,
  };
}

/** Map parsed rows to store inputs (source always paste). */
export function toCreateCandidateInputs(
  parsed: ParsedCandidate[],
  options?: { account?: { id: string; name: string } },
): CreateCandidateInput[] {
  return parsed.map((item) => ({
    kind: item.kind,
    amount: item.amount,
    merchant: item.merchant,
    note: item.note,
    occurredOn: item.occurredOn,
    source: "paste" as const,
    confidence: item.confidence,
    status: "pending" as const,
    rawSnippet: item.rawSnippet,
    category: item.category,
    accountId: options?.account?.id,
    account: options?.account?.name,
  }));
}

export const SOURCE_HINT_LABELS: Record<PasteSourceHint, string> = {
  auto: "Tự nhận",
  sms: "SMS NH",
  wallet: "Ví",
  other: "Khác",
};
