import type { TransactionType } from "../schema/transaction.schema.ts";
import { inferCategoryId, parseVietnameseAmount } from "./parser.engine.ts";

export interface ParsedCsvImportRow {
  type: Extract<TransactionType, "EXPENSE" | "INCOME">;
  amount: number;
  accountId: string;
  categoryId: string;
  note: string;
  occurredAt: number;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const tabCount = (headerLine.match(/\t/gu) ?? []).length;
  const semiCount = (headerLine.match(/;/gu) ?? []).length;
  const commaCount = (headerLine.match(/,/gu) ?? []).length;
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    return "\t";
  }
  if (semiCount > commaCount && semiCount > 0) {
    return ";";
  }
  return ",";
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function parseFlexibleDate(raw: string | undefined, fallbackMs: number): number {
  if (!raw) return fallbackMs;
  const trimmed = raw.trim();
  if (!trimmed) return fallbackMs;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/u);
  if (dmy) {
    const day = Number.parseInt(dmy[1], 10);
    const month = Number.parseInt(dmy[2], 10) - 1;
    const year = Number.parseInt(dmy[3], 10);
    const ts = new Date(year, month, day, 12, 0, 0, 0).getTime();
    if (Number.isFinite(ts)) return ts;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function parseRawSignedAmount(
  rawCell: string | undefined,
): { amount: number; sign: -1 | 1 | 0 } | null {
  if (!rawCell) return null;
  const cleaned = rawCell.trim().replace(/\s+/gu, "");
  if (!cleaned) return null;

  const isNegative = cleaned.startsWith("-") || /^\(.*\)$/u.test(cleaned);
  const isPositive = cleaned.startsWith("+");
  const unsigned = cleaned.replace(/^[+-]|[()₫đ]/giu, "").replace(/vnd$/iu, "");

  // Handle grouped commas vs decimals cleanly: "1,250,000" -> 1250000
  const normalized = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/u.test(unsigned)
    ? unsigned.replace(/,/gu, "")
    : /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/u.test(unsigned)
      ? unsigned.replace(/\./gu, "").replace(",", ".")
      : unsigned;

  const parsedFromVn = parseVietnameseAmount(normalized, {
    autoMultiplyThousandForBareSmallNumber: false,
  });
  if (parsedFromVn && parsedFromVn.amount > 0) {
    return {
      amount: parsedFromVn.amount,
      sign: isNegative ? -1 : isPositive ? 1 : 0,
    };
  }

  const numeric = Number.parseFloat(normalized.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return {
    amount: Math.round(Math.abs(numeric)),
    sign: isNegative || numeric < 0 ? -1 : isPositive ? 1 : 0,
  };
}

function findColumnIndex(
  normalizedHeaders: readonly string[],
  keywords: readonly string[],
): number {
  return normalizedHeaders.findIndex((header) =>
    keywords.some((kw) => header.includes(kw)),
  );
}

export function parseUniversalCsvImport(
  rawCsv: string,
  defaultAccountId: string,
  now = Date.now(),
): ParsedCsvImportRow[] {
  const lines = rawCsv
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitCsvRow(lines[0], delimiter).map((cell) =>
    cell.toLowerCase().normalize("NFC"),
  );

  const hasHeaderRow = firstCells.some((cell) =>
    [
      "date",
      "ngày",
      "amount",
      "số tiền",
      "ghi chú",
      "note",
      "description",
      "nội dung",
      "category",
      "danh mục",
      "ghi nợ",
      "chi",
      "thu",
    ].some((kw) => cell.includes(kw)),
  );

  let dateIdx = -1;
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  let categoryIdx = -1;
  let noteIdx = -1;
  let typeIdx = -1;
  let startRow = 0;

  if (hasHeaderRow) {
    startRow = 1;
    dateIdx = findColumnIndex(firstCells, ["date", "ngày", "thời gian", "time"]);
    amountIdx = findColumnIndex(firstCells, ["amount", "số tiền", "giá trị", "tiền"]);
    debitIdx = findColumnIndex(firstCells, ["debit", "ghi nợ", "tiền ra", "phát sinh giảm", "chi"]);
    creditIdx = findColumnIndex(firstCells, ["credit", "ghi có", "tiền vào", "phát sinh tăng", "thu"]);
    categoryIdx = findColumnIndex(firstCells, ["category", "danh mục", "nhóm", "hạng mục"]);
    noteIdx = findColumnIndex(firstCells, ["note", "ghi chú", "nội dung", "mô tả", "description", "diễn giải"]);
    typeIdx = findColumnIndex(firstCells, ["type", "loại"]);
  }

  const rows: ParsedCsvImportRow[] = [];

  for (let i = startRow; i < lines.length; i += 1) {
    const cells = splitCsvRow(lines[i], delimiter);
    if (cells.length === 0) continue;

    let amount = 0;
    let inferredType: Extract<TransactionType, "EXPENSE" | "INCOME"> = "EXPENSE";

    if (amountIdx !== -1 && cells[amountIdx]) {
      const parsed = parseRawSignedAmount(cells[amountIdx]);
      if (!parsed) continue;
      amount = parsed.amount;
      if (parsed.sign === 1) inferredType = "INCOME";
    } else if (debitIdx !== -1 || creditIdx !== -1) {
      const credit = creditIdx !== -1 ? parseRawSignedAmount(cells[creditIdx]) : null;
      const debit = debitIdx !== -1 ? parseRawSignedAmount(cells[debitIdx]) : null;
      if (credit && credit.amount > 0) {
        amount = credit.amount;
        inferredType = "INCOME";
      } else if (debit && debit.amount > 0) {
        amount = debit.amount;
        inferredType = "EXPENSE";
      }
    } else {
      // Headerless fallback: detect first numeric cell as amount and join remaining text as note
      for (const cell of cells) {
        const candidate = parseRawSignedAmount(cell);
        if (candidate && candidate.amount > 0) {
          amount = candidate.amount;
          inferredType = candidate.sign === 1 ? "INCOME" : "EXPENSE";
          break;
        }
      }
    }

    if (amount <= 0) continue;

    if (typeIdx !== -1 && cells[typeIdx]) {
      const rawType = cells[typeIdx].toLowerCase().normalize("NFC");
      if (
        rawType.includes("income") ||
        rawType.includes("thu") ||
        rawType.includes("credit") ||
        rawType === "+"
      ) {
        inferredType = "INCOME";
      } else if (
        rawType.includes("expense") ||
        rawType.includes("chi") ||
        rawType.includes("debit")
      ) {
        inferredType = "EXPENSE";
      }
    }

    const rawCategory = categoryIdx !== -1 ? cells[categoryIdx] ?? "" : "";
    const rawNote =
      noteIdx !== -1 && cells[noteIdx]
        ? cells[noteIdx]
        : cells.filter((_, idx) => idx !== amountIdx && idx !== dateIdx).join(" · ");

    const combinedText = `${rawCategory} ${rawNote}`.toLowerCase();
    const categoryId =
      inferredType === "INCOME" ? "thu-nhap" : inferCategoryId(combinedText);

    const occurredAt =
      dateIdx !== -1
        ? parseFlexibleDate(cells[dateIdx], now - (lines.length - i) * 60_000)
        : now - (lines.length - i) * 60_000;

    rows.push({
      type: inferredType,
      amount,
      accountId: defaultAccountId,
      categoryId,
      note: rawNote.trim().slice(0, 200) || "Giao dịch import CSV",
      occurredAt,
    });
  }

  return rows;
}
