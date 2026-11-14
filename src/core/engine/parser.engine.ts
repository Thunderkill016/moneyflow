import type { Account } from "../schema/account.schema.ts";
import type { TransactionType } from "../schema/transaction.schema.ts";

export interface ParsedQuickCommand {
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  note: string;
}

const AMOUNT_TOKEN_REGEX =
  /([+-]?\d+(?:[.,]\d+)?\s*(?:tr\d*|triệu|trieu|m|k|nghìn|nghin|ngàn|ngan|đ|d|vnd)?|\d{1,3}(?:[.,]\d{3})+)/giu;

const INCOME_KEYWORDS = [
  "lương",
  "luong",
  "thưởng",
  "thuong",
  "thu nhập",
  "thu nhap",
  "hoàn tiền",
  "hoan tien",
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

export function parseVietnameseAmount(rawToken: string): {
  amount: number;
  hasExplicitPlus: boolean;
} | null {
  const cleaned = rawToken.trim().toLowerCase();
  if (!cleaned) return null;

  const hasExplicitPlus = cleaned.startsWith("+");
  const unsigned = cleaned.replace(/^[+-]\s*/u, "");

  // Handle "1tr5" -> 1_500_000, "2tr25" -> 2_250_000
  const trSplit = unsigned.match(/^(\d+)tr(\d+)$/u);
  if (trSplit) {
    const whole = Number.parseInt(trSplit[1], 10);
    const fracStr = trSplit[2];
    const frac = Number.parseInt(fracStr, 10) / 10 ** fracStr.length;
    return {
      amount: Math.round((whole + frac) * 1_000_000),
      hasExplicitPlus,
    };
  }

  // Handle grouped thousands like "120.000" or "120,000"
  if (/^\d{1,3}(?:[.,]\d{3})+$/u.test(unsigned)) {
    const digitsOnly = unsigned.replace(/[.,]/gu, "");
    const value = Number.parseInt(digitsOnly, 10);
    return value > 0 ? { amount: value, hasExplicitPlus } : null;
  }

  const unitMatch = unsigned.match(
    /^(\d+(?:[.,]\d+)?)\s*(tr|triệu|trieu|m|k|nghìn|nghin|ngàn|ngan|đ|d|vnd)?$/u,
  );
  if (!unitMatch) return null;

  const num = Number.parseFloat(unitMatch[1].replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return null;

  const unit = unitMatch[2] ?? "";
  let multiplier = 1;
  if (unit === "k" || unit.startsWith("ngh") || unit.startsWith("ngà") || unit.startsWith("nga")) {
    multiplier = 1_000;
  } else if (unit === "tr" || unit.startsWith("tri") || unit === "m") {
    multiplier = 1_000_000;
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

function inferCategoryId(textLower: string): string {
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
    const parsed = parseVietnameseAmount(lastMatch[0]);
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

    const isIncome =
      parsed.hasExplicitPlus || INCOME_KEYWORDS.some((kw) => containsKeyword(lower, kw));

    if (isIncome) {
      results.push({
        type: "INCOME",
        amount: parsed.amount,
        categoryId: "thu-nhap",
        accountId: liquidDefault.id,
        note,
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
