/**
 * Vietnamese money-expression parser for voice capture.
 *
 * Turns a speech transcript like "ăn sáng hai chục" into a proposed VND amount
 * (20_000) plus the remaining text for category matching.
 *
 * Design notes:
 * - This parser PROPOSES, never posts. Ambiguity is surfaced to the user via
 *   the mandatory confirm card; nothing here writes to the ledger.
 * - Vietnamese price speech routinely drops zeros ("một trăm" = 100.000đ,
 *   "hai chục" = 20.000đ). When no explicit large unit (nghìn/triệu/tỷ) is
 *   present and the literal value is < 1000, a ×1000 price-shorthand is applied
 *   and flagged (`shorthand: true`) so the UI can show it clearly.
 * - Slang ("củ", "chai", "xị") is normalized only in scale position
 *   (preceded by a number word) to avoid clobbering nouns like "chai nước".
 */

export type VoiceAmountParse = {
  /** Proposed VND integer, or null when no amount could be parsed. */
  amount: number | null;
  /** Raw matched substring (normalized), or null. */
  amountText: string | null;
  /** True when the ×1000 price-shorthand was applied. */
  shorthand: boolean;
  /** Transcript with the amount span removed — used for category matching. */
  rest: string;
  /** Normalized transcript (lowercase, collapsed whitespace). */
  transcript: string;
};

const DIGIT_VALUES: Record<string, number> = {
  "không": 0,
  "một": 1,
  "hai": 2,
  "ba": 3,
  "bốn": 4,
  "năm": 5,
  "sáu": 6,
  "bảy": 7,
  "tám": 8,
  "chín": 9,
};

/** Ones-words valid after "mươi" / tens (includes colloquial variants). */
const ONES_VALUES: Record<string, number> = {
  ...DIGIT_VALUES,
  "mốt": 1,
  "tư": 4,
  "lăm": 5,
};

const BIG_SCALES: Record<string, number> = {
  "tỷ": 1_000_000_000,
  "triệu": 1_000_000,
  "nghìn": 1_000,
  "ngàn": 1_000,
};

const AMOUNT_VOCAB = new Set([
  ...Object.keys(DIGIT_VALUES),
  ...["mốt", "tư", "lăm"],
  "mười",
  "mươi",
  "chục",
  "trăm",
  "linh",
  "lẻ",
  "rưỡi",
  ...Object.keys(BIG_SCALES),
  "đồng",
]);

function isDigitToken(token: string): boolean {
  return /^(\d{1,3}(\.\d{3})+|\d{1,3}(,\d{3})+|\d+[.,]\d+|\d+)$/.test(token);
}

function parseDigitToken(token: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) return parseInt(token.replace(/\./g, ""), 10);
  if (/^\d{1,3}(,\d{3})+$/.test(token)) return parseInt(token.replace(/,/g, ""), 10);
  if (/^\d+[.,]\d+$/.test(token)) return parseFloat(token.replace(",", "."));
  return parseInt(token, 10);
}

function isDigitWord(token: string): boolean {
  return token in DIGIT_VALUES;
}

function isOnesWord(token: string): boolean {
  return token in ONES_VALUES;
}

function normalizeTranscript(raw: string): string {
  let text = raw.normalize("NFC").toLowerCase();
  // Collapse digit separators BEFORE stripping punctuation.
  text = text.replace(/\b\d{1,3}(\.\d{3})+\b/g, (m) => m.replace(/\./g, "")); // 20.000 -> 20000
  text = text.replace(/\b\d{1,3}(,\d{3})+\b/g, (m) => m.replace(/,/g, "")); // 20,000 -> 20000
  text = text.replace(/(\d),(\d)/g, "$1.$2"); // decimal comma: 2,5 -> 2.5
  // Separate digits glued to letters: "20đ" -> "20 đ", "2tr" -> "2 tr".
  text = text.replace(/(\d)([^\d\s.,])/g, "$1 $2");
  text = text.replace(/([^\d\s.,])(\d)/g, "$1 $2");
  // Drop remaining punctuation (keep letters, digits, whitespace, decimal dot).
  text = text.replace(/[^\p{L}\p{N}\s.]/gu, " ");
  text = text.replace(/\s+/g, " ").trim();
  // "20k" -> "20 nghìn", "2tr" -> "2 triệu"
  text = text.replace(/(\d+)\s*k\b/g, "$1 nghìn");
  text = text.replace(/(\d+)\s*tr\b/g, "$1 triệu");
  // "20 đ" -> "20 đồng"
  text = text.replace(/(^|\s)đ(\s|$)/g, "$1đồng$2");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function normalizeSlang(tokens: string[]): string[] {
  const out = [...tokens];
  const SLANG: Record<string, string> = {
    "củ": "triệu",
    "chai": "triệu",
    "xị": "trăm nghìn",
  };
  for (let i = 0; i < out.length; i++) {
    const word = out[i]!;
    const replacement = SLANG[word];
    if (!replacement) continue;
    const prev = out[i - 1];
    const next = out[i + 1];
    const prevIsNumber =
      prev !== undefined && (isDigitToken(prev) || isDigitWord(prev));
    const nextIsScaleish =
      next === undefined ||
      next === "rưỡi" ||
      next in BIG_SCALES ||
      isDigitWord(next);
    // Only treat as money slang in scale position: "2 củ", "một chai".
    // "2 chai nước" keeps "chai" as a noun so the amount span stays sane.
    if (prevIsNumber && nextIsScaleish) {
      out.splice(i, 1, ...replacement.split(" "));
    }
  }
  return out;
}

type ChunkParse = { value: number; next: number } | null;

/** Parse a sub-thousand chunk (e.g. ["một","trăm","hai","mươi","ba"] -> 123). */
function parseChunk(tokens: string[]): ChunkParse {
  let i = 0;
  let value = 0;
  let consumedAny = false;

  // Hundreds: "[d] trăm" | "trăm"
  if (tokens[i] === "trăm") {
    value = 100;
    i += 1;
    consumedAny = true;
  } else if (isDigitWord(tokens[i]!) && tokens[i + 1] === "trăm") {
    value = DIGIT_VALUES[tokens[i]!]! * 100;
    i += 2;
    consumedAny = true;
  }
  // "trăm rưỡi" = 150, "hai trăm rưỡi" = 250
  if (consumedAny && tokens[i] === "rưỡi") {
    value += 50;
    i += 1;
  }
  // "một trăm linh/lẻ năm" = 105
  if (tokens[i] === "linh" || tokens[i] === "lẻ") {
    i += 1;
    if (isOnesWord(tokens[i]!)) {
      value += ONES_VALUES[tokens[i]!]!;
      i += 1;
      consumedAny = true;
    }
    return consumedAny ? { value, next: i } : null;
  }
  // Tens
  if (tokens[i] === "mười") {
    value += 10;
    i += 1;
    consumedAny = true;
    if (isOnesWord(tokens[i]!)) {
      value += ONES_VALUES[tokens[i]!]!;
      i += 1;
    }
  } else if (isDigitWord(tokens[i]!) && tokens[i + 1] === "mươi") {
    value += DIGIT_VALUES[tokens[i]!]! * 10;
    i += 2;
    consumedAny = true;
    if (isOnesWord(tokens[i]!)) {
      value += ONES_VALUES[tokens[i]!]!;
      i += 1;
    }
  } else if (isDigitWord(tokens[i]!) && tokens[i + 1] === "chục") {
    value += DIGIT_VALUES[tokens[i]!]! * 10;
    i += 2;
    consumedAny = true;
  } else if (tokens[i] === "chục") {
    value += 10;
    i += 1;
    consumedAny = true;
  } else if (
    isDigitWord(tokens[i]!) &&
    tokens[i + 1] !== undefined &&
    isOnesWord(tokens[i + 1]!)
  ) {
    // Colloquial tens without "mươi": "hai mốt" = 21, "ba lăm" = 35.
    value += DIGIT_VALUES[tokens[i]!]! * 10 + ONES_VALUES[tokens[i + 1]!]!;
    i += 2;
    consumedAny = true;
  } else if (consumedAny && isOnesWord(tokens[i]!)) {
    // Colloquial dropped "mươi" after hundreds: "một trăm hai" = 120.
    // (102 must be said "một trăm linh/lẻ hai" — handled above.)
    value += ONES_VALUES[tokens[i]!]! * 10;
    i += 1;
  } else if (!consumedAny && isOnesWord(tokens[i]!)) {
    value += ONES_VALUES[tokens[i]!]!;
    i += 1;
    consumedAny = true;
  } else if (!consumedAny && isDigitToken(tokens[i]!)) {
    value += parseDigitToken(tokens[i]!);
    i += 1;
    consumedAny = true;
  }
  if (!consumedAny) return null;
  return { value, next: i };
}

/**
 * Parse a full amount token span, e.g.
 * ["hai","tỷ","ba","trăm","triệu"] -> 2_300_000_000.
 * Returns null when the span cannot be fully consumed.
 */
function parseFullAmount(tokens: string[]): { value: number; shorthand: boolean } | null {
  let total = 0;
  let chunk: string[] = [];
  let sawBigScale = false;

  const flush = (scale: number): boolean => {
    let chunkValue: number;
    if (chunk.length === 0) {
      chunkValue = 1; // bare "nghìn" = 1000
    } else {
      const parsed = parseChunk(chunk);
      if (!parsed || parsed.next !== chunk.length) return false;
      chunkValue = parsed.value;
    }
    total += chunkValue * scale;
    chunk = [];
    return true;
  };

  const list = [...tokens, "\0"];
  for (let i = 0; i < list.length; i++) {
    const token = list[i]!;
    if (token === "\0") break;
    if (token === "đồng") continue; // unit marker, no numeric meaning
    const scale = BIG_SCALES[token];
    if (scale !== undefined) {
      sawBigScale = true;
      if (!flush(scale)) return null;
      // "triệu rưỡi" = 1.5M — half of the just-applied scale.
      if (list[i + 1] === "rưỡi") {
        total += scale / 2;
        i += 1;
      }
      continue;
    }
    chunk.push(token);
  }
  if (chunk.length > 0) {
    const parsed = parseChunk(chunk);
    if (!parsed || parsed.next !== chunk.length) return null;
    total += parsed.value;
  }

  let amount = Math.round(total);
  if (amount <= 0) return null;
  let shorthand = false;
  if (!sawBigScale && amount < 1000) {
    // Price shorthand: "hai chục" spoken at a shop means 20.000đ, not 20đ.
    amount = amount * 1000;
    shorthand = true;
  }
  return { value: amount, shorthand };
}

function isAmountToken(token: string): boolean {
  return isDigitToken(token) || AMOUNT_VOCAB.has(token);
}

/**
 * Find the longest contiguous run of amount vocabulary. Returns token indices.
 */
function findAmountSpan(tokens: string[]): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let start = -1;
  for (let i = 0; i <= tokens.length; i++) {
    const isAmount = i < tokens.length && isAmountToken(tokens[i]!);
    if (isAmount && start === -1) start = i;
    if (!isAmount && start !== -1) {
      if (!best || i - start > best.end - best.start) {
        best = { start, end: i };
      }
      start = -1;
    }
  }
  return best;
}

export function parseVietnameseMoney(raw: string): VoiceAmountParse {
  const transcript = normalizeTranscript(raw);
  if (!transcript) {
    return { amount: null, amountText: null, shorthand: false, rest: "", transcript };
  }
  const tokens = normalizeSlang(transcript.split(" "));
  const span = findAmountSpan(tokens);
  if (!span) {
    return { amount: null, amountText: null, shorthand: false, rest: transcript, transcript };
  }
  const spanTokens = tokens.slice(span.start, span.end);
  const parsed = parseFullAmount(spanTokens);
  if (parsed === null) {
    return { amount: null, amountText: null, shorthand: false, rest: transcript, transcript };
  }
  const amountText = spanTokens.join(" ");
  const rest = tokens
    .filter((_, idx) => idx < span.start || idx >= span.end)
    .join(" ")
    .trim();
  return {
    amount: parsed.value,
    amountText,
    shorthand: parsed.shorthand,
    rest,
    transcript,
  };
}

export type VoiceKind = "expense" | "income";

const INCOME_HINTS = [
  "lương",
  "thưởng",
  "thưởng tết",
  "nhận được",
  "được cho",
  "tiền về",
  "thu nhập",
  "bán được",
];

/** Very small v1 heuristic: income only when an explicit income hint is present. */
export function detectVoiceKind(text: string): VoiceKind {
  const lower = text.toLowerCase();
  return INCOME_HINTS.some((hint) => lower.includes(hint)) ? "income" : "expense";
}

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: [
      "ăn sáng", "ăn trưa", "ăn tối", "ăn", "uống", "cơm", "phở", "bún",
      "mì", "cà phê", "cafe", "trà sữa", "trà đá", "nhậu", "bánh", "kẹo",
      "ăn vặt", "nhà hàng", "quán", "bún bò", "cơm tấm",
    ],
    category: "Ăn uống",
  },
  {
    keywords: [
      "xăng", "grab", "taxi", "đi lại", "di chuyển", "gửi xe", "rửa xe",
      "vé xe", "xe bus", "bus", "be",
    ],
    category: "Di chuyển",
  },
  {
    keywords: ["điện", "nước", "mạng", "internet", "wifi", "điện thoại", "cước"],
    category: "Hóa đơn",
  },
  {
    keywords: ["chợ", "siêu thị", "mua sắm", "quần áo", "giày", "tạp hóa", "mua"],
    category: "Mua sắm",
  },
  {
    keywords: ["thuốc", "khám", "bệnh", "viện", "bác sĩ", "thuốc tây"],
    category: "Sức khỏe",
  },
  {
    keywords: ["học", "trường", "sách", "học phí", "đóng học"],
    category: "Giáo dục",
  },
  {
    keywords: ["nhà", "trọ", "thuê nhà", "tiền nhà"],
    category: "Nhà ở",
  },
];

/**
 * Suggest a category NAME from free text. The caller matches it against the
 * workspace's real categories (case-insensitive); null means "let the user pick".
 */
export function suggestVoiceCategory(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  // Longest keyword wins: "mua thuốc" -> "thuốc" (Sức khỏe), not "mua" (Mua sắm).
  let best: { category: string; length: number } | null = null;
  for (const entry of CATEGORY_KEYWORDS) {
    for (const keyword of entry.keywords) {
      // Space-boundary check (regex \b is unreliable for Vietnamese).
      if (lower.indexOf(` ${keyword} `) === -1) continue;
      if (!best || keyword.length > best.length) {
        best = { category: entry.category, length: keyword.length };
      }
    }
  }
  return best?.category ?? null;
}
