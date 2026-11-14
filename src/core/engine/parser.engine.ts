import type { Account } from "../schema/account.schema.ts";
import type { TransactionType } from "../schema/transaction.schema.ts";
import { computeTransactionFingerprint } from "./ledger.engine.ts";

export interface ParsedQuickCommand {
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  note: string;
  isRefund?: boolean;
}

export interface ParsedBankSmsResult {
  type: "EXPENSE" | "INCOME";
  amount: number;
  accountId: string;
  categoryId: string;
  note: string;
  isRefund: boolean;
  detectedBalance?: number;
  bankLabel: string;
  occurredAt: number;
  fingerprint: string;
}

const AMOUNT_TOKEN_REGEX =
  /(?<![\p{L}\p{N}])([+-]?\d+(?:[.,]\d+)?\s*(?:tr\d*|triệu|trieu|củ\d*|cu\d*|lít\d*|lit\d*|m|k|nghìn|nghin|ngàn|ngan|đ|d|vnd)?|\d{1,3}(?:[.,]\d{3})+)(?![\p{L}\p{N}])/giu;

const REFUND_KEYWORDS = ["hoàn tiền", "hoan tien", "cashback", "refund"];

const BANK_HINTS: ReadonlyArray<{
  label: string;
  smsKeywords: readonly string[];
  accountKeywords: readonly string[];
}> = [
  {
    label: "Techcombank",
    smsKeywords: ["techcombank", "tcb"],
    accountKeywords: ["techcombank", "tcb"],
  },
  {
    label: "Vietcombank",
    smsKeywords: ["vietcombank", "vcb"],
    accountKeywords: ["vietcombank", "vcb"],
  },
  {
    label: "MB Bank",
    smsKeywords: ["mb bank", "mbbank", "mb-"],
    accountKeywords: ["mb", "mbbank"],
  },
  {
    label: "TPBank",
    smsKeywords: ["tpbank", "tpb"],
    accountKeywords: ["tpbank", "tpb"],
  },
  {
    label: "VIB",
    smsKeywords: ["vib", "the tin dung vib"],
    accountKeywords: ["vib"],
  },
  {
    label: "MoMo",
    smsKeywords: ["momo", "vi momo"],
    accountKeywords: ["momo"],
  },
  {
    label: "ACB",
    smsKeywords: ["acb"],
    accountKeywords: ["acb"],
  },
  {
    label: "VPBank",
    smsKeywords: ["vpbank"],
    accountKeywords: ["vpbank"],
  },
];

const INCOME_KEYWORDS = [
  "lương",
  "luong",
  "thưởng",
  "thuong",
  "thu nhập",
  "thu nhap",
  "hoàn tiền",
  "hoan tien",
  "cashback",
  "refund",
  "lãi",
  "lai",
  "cổ tức",
  "co tuc",
  "bán",
  "ban",
];

const INVESTMENT_KEYWORDS = [
  "vàng",
  "vang",
  "btc",
  "bitcoin",
  "eth",
  "usdt",
  "crypto",
  "tiết kiệm",
  "tiet kiem",
  "tích lũy",
  "tich luy",
  "đầu tư",
  "dau tu",
  "chứng khoán",
  "chung khoan",
  "cổ phiếu",
  "co phieu",
  "quỹ",
  "quy",
];

const EXPENSE_CATEGORY_RULES: ReadonlyArray<{
  categoryId: string;
  keywords: readonly string[];
}> = [
  {
    categoryId: "an-uong",
    keywords: [
      "cf",
      "cafe",
      "cà phê",
      "ca phe",
      "trà sữa",
      "tra sua",
      "ăn",
      "an",
      "cơm",
      "com",
      "phở",
      "pho",
      "bún",
      "bun",
      "nhậu",
      "nhau",
      "trưa",
      "tối",
      "sáng",
      "đồ uống",
    ],
  },
  {
    categoryId: "di-chuyen",
    keywords: [
      "xăng",
      "xang",
      "grab",
      "be",
      "xanh sm",
      "taxi",
      "gửi xe",
      "gui xe",
      "vé xe",
      "rửa xe",
      "cầu đường",
    ],
  },
  {
    categoryId: "mua-sam",
    keywords: [
      "mua",
      "shopee",
      "lazada",
      "tiki",
      "tiktok",
      "siêu thị",
      "sieu thi",
      "quần áo",
      "quan ao",
      "giày",
    ],
  },
  {
    categoryId: "hoa-don",
    keywords: [
      "điện",
      "dien",
      "nước",
      "nuoc",
      "internet",
      "wifi",
      "thuê nhà",
      "thue nha",
      "nhà",
      "tiền nhà",
      "điện thoại",
      "4g",
    ],
  },
  {
    categoryId: "giai-tri",
    keywords: [
      "phim",
      "rạp",
      "rap",
      "game",
      "netflix",
      "spotify",
      "du lịch",
      "du lich",
      "bar",
      "karaoke",
    ],
  },
  {
    categoryId: "suc-khoe",
    keywords: [
      "thuốc",
      "thuoc",
      "khám",
      "kham",
      "bệnh viện",
      "nha khoa",
      "gym",
      "yoga",
      "thể thao",
    ],
  },
];

export interface ParseAmountOptions {
  autoMultiplyThousandForBareSmallNumber?: boolean;
}

export function parseVietnameseAmount(
  rawToken: string,
  options?: ParseAmountOptions,
): {
  amount: number;
  hasExplicitPlus: boolean;
} | null {
  const cleaned = rawToken.trim().toLowerCase().normalize("NFC");
  if (!cleaned) return null;

  const hasExplicitPlus = cleaned.startsWith("+");
  const unsigned = cleaned.replace(/^[+-]\s*/u, "");

  // Handle "1tr5" -> 1_500_000, "1tr35" -> 1_350_000, "1củ5" / "1cu5" -> 1_500_000
  const millionSplit = unsigned.match(/^(\d+)\s*(?:tr|củ|cu)(\d+)$/u);
  if (millionSplit) {
    const whole = Number.parseInt(millionSplit[1], 10);
    const fracStr = millionSplit[2];
    const frac = Number.parseInt(fracStr, 10) / 10 ** fracStr.length;
    return {
      amount: Math.round((whole + frac) * 1_000_000),
      hasExplicitPlus,
    };
  }

  // Handle "2lít5" -> 250_000
  const litSplit = unsigned.match(/^(\d+)\s*(?:lít|lit)(\d+)$/u);
  if (litSplit) {
    const whole = Number.parseInt(litSplit[1], 10);
    const fracStr = litSplit[2];
    const frac = Number.parseInt(fracStr, 10) / 10 ** fracStr.length;
    return {
      amount: Math.round((whole + frac) * 100_000),
      hasExplicitPlus,
    };
  }

  // Handle grouped thousands like "120.000", "120,000", "120.000đ", or "120,000 VND"
  const groupedCurrencyMatch = unsigned.match(
    /^(\d{1,3}(?:[.,]\d{3})+)\s*(?:vnđ|vnd|đ|d)?$/u,
  );
  if (groupedCurrencyMatch) {
    const digitsOnly = groupedCurrencyMatch[1].replace(/[.,]/gu, "");
    const value = Number.parseInt(digitsOnly, 10);
    return value > 0 ? { amount: value, hasExplicitPlus } : null;
  }

  const unitMatch = unsigned.match(
    /^(\d+(?:[.,]\d+)?)\s*(tr|triệu|trieu|củ|cu|lít|lit|m|k|nghìn|nghin|ngàn|ngan|đ|d|vnd)?$/u,
  );
  if (!unitMatch) return null;

  const num = Number.parseFloat(unitMatch[1].replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return null;

  const unit = unitMatch[2] ?? "";
  let multiplier = 1;
  if (
    unit === "k" ||
    unit.startsWith("ngh") ||
    unit.startsWith("ngà") ||
    unit.startsWith("nga")
  ) {
    multiplier = 1_000;
  } else if (unit === "lít" || unit === "lit") {
    multiplier = 100_000;
  } else if (
    unit === "tr" ||
    unit.startsWith("tri") ||
    unit === "m" ||
    unit === "củ" ||
    unit === "cu"
  ) {
    multiplier = 1_000_000;
  } else if (
    unit === "" &&
    options?.autoMultiplyThousandForBareSmallNumber &&
    num < 1_000
  ) {
    multiplier = 1_000;
  }

  return {
    amount: Math.round(num * multiplier),
    hasExplicitPlus,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(textLower: string, keyword: string): boolean {
  const normalizedText = textLower.normalize("NFC");
  const normalizedKeyword = keyword.normalize("NFC");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(normalizedKeyword)}(?![\\p{L}\\p{N}])`,
    "u",
  );
  return pattern.test(normalizedText);
}

export function inferCategoryId(textLower: string): string {
  for (const rule of EXPENSE_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => containsKeyword(textLower, kw))) {
      return rule.categoryId;
    }
  }
  return "an-uong";
}

export function parseQuickInput(
  rawInput: string,
  accounts: readonly Account[],
  defaultAccountId: string,
): ParsedQuickCommand[] {
  const segments = rawInput
    .split(/[,;\n]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const liquidDefault =
    accounts.find((acc) => acc.id === defaultAccountId && !acc.isArchived) ??
    accounts.find((acc) => acc.group === "LIQUID" && !acc.isArchived) ??
    accounts[0];

  if (!liquidDefault) return [];

  const investmentTarget = accounts.find(
    (acc) => acc.group === "INVESTMENT" && !acc.isArchived && acc.id !== liquidDefault.id,
  );

  const results: ParsedQuickCommand[] = [];

  for (const segment of segments) {
    const matches = [...segment.matchAll(AMOUNT_TOKEN_REGEX)];
    if (matches.length === 0) continue;

    // Prefer the last amount token in the phrase (e.g. "cơm tấm 2 phần 70k" -> 70k)
    const lastMatch = matches[matches.length - 1];
    const parsed = parseVietnameseAmount(lastMatch[0], {
      autoMultiplyThousandForBareSmallNumber: true,
    });
    if (!parsed) continue;

    const noteText = segment
      .replace(lastMatch[0], "")
      .replace(/\s+/gu, " ")
      .trim();
    const note = noteText || segment;
    const lower = segment.toLowerCase();

    const isInvestmentTransfer =
      investmentTarget !== undefined &&
      INVESTMENT_KEYWORDS.some((kw) => containsKeyword(lower, kw)) &&
      !parsed.hasExplicitPlus;

    if (isInvestmentTransfer && investmentTarget) {
      results.push({
        type: "TRANSFER",
        amount: parsed.amount,
        categoryId: "tich-luy",
        accountId: liquidDefault.id,
        toAccountId: investmentTarget.id,
        note,
      });
      continue;
    }

    const isRefund = REFUND_KEYWORDS.some((kw) => containsKeyword(lower, kw));
    const isIncome =
      isRefund ||
      parsed.hasExplicitPlus ||
      INCOME_KEYWORDS.some((kw) => containsKeyword(lower, kw));

    if (isIncome) {
      let categoryId = "thu-nhap";
      if (isRefund) {
        const cleanedRefundText = REFUND_KEYWORDS.reduce(
          (acc, kw) => acc.replace(new RegExp(escapeRegExp(kw), "giu"), " "),
          lower,
        );
        const inferred = inferCategoryId(cleanedRefundText);
        categoryId =
          EXPENSE_CATEGORY_RULES.some((rule) =>
            rule.keywords.some((kw) => containsKeyword(cleanedRefundText, kw)),
          )
            ? inferred
            : "mua-sam";
      }
      results.push({
        type: "INCOME",
        amount: parsed.amount,
        categoryId,
        accountId: liquidDefault.id,
        note,
        ...(isRefund ? { isRefund: true } : {}),
      });
      continue;
    }

    results.push({
      type: "EXPENSE",
      amount: parsed.amount,
      categoryId: inferCategoryId(lower),
      accountId: liquidDefault.id,
      note,
    });
  }

  return results;
}

function parseIntegerMoneyChunk(raw: string): number | null {
  const digits = raw.replace(/[^\d]/gu, "");
  if (!digits) return null;
  const val = Number.parseInt(digits, 10);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function parseBankNotificationSms(
  rawSms: string,
  accounts: readonly Account[],
  defaultAccountId: string,
  now = Date.now(),
): ParsedBankSmsResult | null {
  const normalized = rawSms.trim().normalize("NFC");
  if (!normalized) return null;
  const lower = normalized.toLowerCase();

  let matchedBankLabel = "Ngân hàng / Ví";
  let targetAccount =
    accounts.find((acc) => acc.id === defaultAccountId && !acc.isArchived) ??
    accounts.find((acc) => acc.group === "LIQUID" && !acc.isArchived) ??
    accounts[0];

  for (const hint of BANK_HINTS) {
    if (hint.smsKeywords.some((kw) => containsKeyword(lower, kw) || lower.includes(kw))) {
      matchedBankLabel = hint.label;
      const byName = accounts.find(
        (acc) =>
          !acc.isArchived &&
          hint.accountKeywords.some((ak) => acc.name.toLowerCase().includes(ak)),
      );
      if (byName) {
        targetAccount = byName;
      }
      break;
    }
  }

  if (!targetAccount) return null;

  let detectedBalance: number | undefined;
  let workingText = normalized;
  const balanceMatch = normalized.match(
    /(?:số\s*dư(?:\s*(?:khả\s*dụng|hiện\s*tại|ví|tk))?|so\s*du(?:\s*(?:kha\s*dung|hien\s*tai|vi|tk))?|sd)\s*[:=]?\s*([+-]?\s*\d[\d.,]*)\s*(?:vnd|vnđ|đ|d)?/iu,
  );
  if (balanceMatch) {
    const parsedBal = parseIntegerMoneyChunk(balanceMatch[1]);
    if (parsedBal !== null) {
      detectedBalance = parsedBal;
    }
    workingText = workingText.replace(balanceMatch[0], " ");
  }

  // Strip account numbers, dates, and HH:mm timestamps before locating transaction amount
  const sanitizedForAmount = workingText
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gu, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/gu, " ")
    .replace(/\b(?:tk|stk)\s*[:.]?\s*[\dxX*]+/giu, " ");

  const signedMoneyMatch = sanitizedForAmount.match(
    /([+-])\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(vnd|vnđ|đ|d|k|tr|m)?/iu,
  );
  const currencyMoneyMatch = sanitizedForAmount.match(
    /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(vnd|vnđ|đ|k|tr|m)/iu,
  );

  let amount: number | null = null;
  let explicitSign: "+" | "-" | null = null;

  if (signedMoneyMatch) {
    explicitSign = signedMoneyMatch[1] === "+" ? "+" : "-";
    const parsed = parseVietnameseAmount(
      `${signedMoneyMatch[2]}${signedMoneyMatch[3] ?? ""}`,
      { autoMultiplyThousandForBareSmallNumber: false },
    );
    amount = parsed?.amount ?? parseIntegerMoneyChunk(signedMoneyMatch[2]);
  } else if (currencyMoneyMatch) {
    const parsed = parseVietnameseAmount(
      `${currencyMoneyMatch[1]}${currencyMoneyMatch[2] ?? ""}`,
      { autoMultiplyThousandForBareSmallNumber: false },
    );
    amount = parsed?.amount ?? parseIntegerMoneyChunk(currencyMoneyMatch[1]);
  }

  if (!amount || amount <= 0) return null;

  const isRefund = REFUND_KEYWORDS.some((kw) => containsKeyword(lower, kw));
  const looksPositive =
    explicitSign === "+" ||
    isRefund ||
    ["nhận được", "nhan duoc", "cộng ", "cong ", "biến động +", "bien dong +", "tiền vào", "tien vao"].some(
      (kw) => lower.includes(kw),
    );
  const looksNegative =
    explicitSign === "-" ||
    ["thanh toán", "thanh toan", "chi tiêu", "chi tieu", "trừ ", "tru ", "giảm ", "giam ", "chuyển đến", "chuyen den"].some(
      (kw) => lower.includes(kw),
    );

  const type: "EXPENSE" | "INCOME" =
    looksPositive && !looksNegative ? "INCOME" : explicitSign === "+" ? "INCOME" : "EXPENSE";

  const contentMatch = workingText.match(
    /(?:nd|nội\s*dung|noi\s*dung|diễn\s*giải|dien\s*giai)\s*[:=-]\s*([^\n.;]+)/iu,
  );
  const merchantMatch = workingText.match(
    /(?:tại|tai|qua)\s+([\p{L}\p{N}][\p{L}\p{N} &._-]{1,48})/u,
  );

  const noteRaw =
    contentMatch?.[1]?.trim() ||
    merchantMatch?.[1]?.replace(/\s+qua\s+.*$/iu, "").trim() ||
    `${matchedBankLabel} (${type === "INCOME" ? "Nhận tiền" : "Thanh toán"})`;
  const note = noteRaw.slice(0, 120);

  const categoryText = `${note} ${workingText}`.toLowerCase();
  const categoryId =
    type === "INCOME"
      ? isRefund
        ? EXPENSE_CATEGORY_RULES.some((rule) =>
            rule.keywords.some((kw) => containsKeyword(categoryText, kw)),
          )
          ? inferCategoryId(categoryText)
          : "mua-sam"
        : "thu-nhap"
      : inferCategoryId(categoryText);

  const occurredAt = now;
  const fingerprint = computeTransactionFingerprint({
    occurredAt,
    type,
    amount,
    note,
    accountId: targetAccount.id,
  });

  return {
    type,
    amount,
    accountId: targetAccount.id,
    categoryId,
    note,
    isRefund,
    detectedBalance,
    bankLabel: matchedBankLabel,
    occurredAt,
    fingerprint,
  };
}
