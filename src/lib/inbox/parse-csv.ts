/**
 * CSV statement parser (wireframes-inbox §8).
 * Heuristic column map: date / amount / description.
 * Money amounts are integer VND đồng (minor units). No float.
 */

import type {
  CandidateConfidence,
  CandidateKind,
  CreateCandidateInput,
} from "./candidate-store.ts";
import { parseVndAmountToken, todayInHoChiMinh } from "./parse-text.ts";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export type CsvColumnRole = "date" | "amount" | "desc" | "debit" | "credit" | "ignore";

export type CsvColumnMap = {
  date: number | null;
  amount: number | null;
  desc: number | null;
  debit: number | null;
  credit: number | null;
};

export type UncertainCsvField = "amount" | "merchant" | "date" | "kind";

export type ParsedCsvRow = {
  kind: CandidateKind;
  /** Absolute amount in VND đồng (integer, > 0). */
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  confidence: CandidateConfidence;
  uncertainFields: UncertainCsvField[];
  explanations: string[];
  rawSnippet: string;
  rowIndex: number;
};

export type ParseCsvResult = {
  ok: boolean;
  fileName: string;
  headers: string[];
  columnMap: CsvColumnMap;
  /** 0–1 heuristic confidence of auto-map. */
  mapConfidence: number;
  rows: ParsedCsvRow[];
  skippedRows: number;
  warningCount: number;
  error?: string;
};

export type ParseCsvOptions = {
  fileName?: string;
  /** Override "today" as YYYY-MM-DD. */
  today?: string;
  /** Max data rows to parse (safety). Default 5000. */
  maxRows?: number;
  /**
   * Power-user column map override (TASK-131).
   * When set, replaces auto-detect; mapConfidence becomes 1.
   */
  columnMap?: CsvColumnMap;
};

const DATE_HEADERS =
  /^(date|ngay|ngày|transaction\s*date|posted|posting\s*date|trans\s*date|thoi\s*gian|thời\s*gian|ngay\s*gd|ngày\s*gd|txn\s*date|value\s*date)$/i;
const AMOUNT_HEADERS =
  /^(amount|so\s*tien|số\s*tiền|money|value|giao\s*dich|phat\s*sinh|phát\s*sinh|so_tien|sotien|amt|transaction\s*amount|tong|tổng)$/i;
const DEBIT_HEADERS =
  /^(debit|chi|withdraw|withdrawal|ps\s*no|phat\s*sinh\s*no|phát\s*sinh\s*nợ|ghi\s*no|ghi\s*nợ)$/i;
const CREDIT_HEADERS =
  /^(credit|thu|deposit|ps\s*co|phat\s*sinh\s*co|phát\s*sinh\s*có|ghi\s*co|ghi\s*có)$/i;
const DESC_HEADERS =
  /^(desc|description|mo\s*ta|mô\s*tả|content|noi\s*dung|nội\s*dung|merchant|narration|detail|details|dien\s*giai|diễn\s*giải|memo|note|ghi\s*chu|ghi\s*chú|remark|remarks|transaction\s*details?)$/i;

const INCOME_HINT =
  /\b(luong|lương|salary|thu\s*nhập|thu nhap|nhận|nhan|hoàn\s*tiền|hoan tien|refund|\+|deposit|credit)\b/i;
const TRANSFER_HINT =
  /\b(ck|chuyen|chuyển|transfer|nội\s*bộ|noi bo|chuyển\s*khoản|chuyen khoan)\b/i;

/**
 * Split CSV text into rows of cells (RFC4180-ish: quotes, commas, CRLF).
 */
export function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  while (i < input.length) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      cell = "";
      // Skip trailing empty-only rows later; keep structural rows
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }

  // Last cell / row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length > 0));
}

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Score header name against a role pattern (higher = better).
 */
function scoreHeader(header: string, pattern: RegExp): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  if (pattern.test(h)) return 3;
  // Partial contains for multi-word headers
  const compact = h.toLowerCase().replace(/[_\s]+/g, " ");
  if (pattern.source.includes("amount") && /amount|số tiền|so tien|tiền|tien/.test(compact)) {
    return 2;
  }
  if (pattern.source.includes("date") && /date|ngày|ngay/.test(compact)) return 2;
  if (
    pattern.source.includes("desc") &&
    /mô tả|mo ta|nội dung|noi dung|diễn giải|dien giai|description|merchant|memo/.test(compact)
  ) {
    return 2;
  }
  return 0;
}

export function mapCsvColumns(headers: string[]): {
  map: CsvColumnMap;
  confidence: number;
} {
  const map: CsvColumnMap = {
    date: null,
    amount: null,
    desc: null,
    debit: null,
    credit: null,
  };

  let bestDate = 0;
  let bestAmount = 0;
  let bestDesc = 0;
  let bestDebit = 0;
  let bestCredit = 0;

  headers.forEach((header, index) => {
    const d = scoreHeader(header, DATE_HEADERS);
    if (d > bestDate) {
      bestDate = d;
      map.date = index;
    }
    const a = scoreHeader(header, AMOUNT_HEADERS);
    if (a > bestAmount) {
      bestAmount = a;
      map.amount = index;
    }
    const deb = scoreHeader(header, DEBIT_HEADERS);
    if (deb > bestDebit) {
      bestDebit = deb;
      map.debit = index;
    }
    const cre = scoreHeader(header, CREDIT_HEADERS);
    if (cre > bestCredit) {
      bestCredit = cre;
      map.credit = index;
    }
    const de = scoreHeader(header, DESC_HEADERS);
    if (de > bestDesc) {
      bestDesc = de;
      map.desc = index;
    }
  });

  // If amount column not found but debit/credit exist, clear amount
  if (map.amount === null && (map.debit !== null || map.credit !== null)) {
    // fine
  }

  // Positional fallback when headers are generic / missing names
  if (map.date === null && headers.length >= 1) {
    // Prefer first column as date only if it looks like date samples later
    map.date = 0;
    bestDate = Math.max(bestDate, 1);
  }
  if (map.amount === null && map.debit === null && map.credit === null) {
    // Common layouts: date, desc, amount OR date, amount, desc
    if (headers.length >= 3) {
      map.amount = headers.length - 1;
      bestAmount = Math.max(bestAmount, 1);
    } else if (headers.length === 2) {
      map.amount = 1;
      bestAmount = Math.max(bestAmount, 1);
    }
  }
  if (map.desc === null && headers.length >= 2) {
    // Middle column often description
    if (headers.length >= 3) {
      map.desc = 1;
      bestDesc = Math.max(bestDesc, 1);
    } else {
      map.desc = map.date === 0 ? 1 : 0;
      bestDesc = Math.max(bestDesc, 1);
    }
  }

  const rolesHit =
    (map.date !== null ? 1 : 0) +
    (map.amount !== null || map.debit !== null || map.credit !== null ? 1 : 0) +
    (map.desc !== null ? 1 : 0);
  const nameHits = (bestDate >= 2 ? 1 : 0) + (bestAmount >= 2 || bestDebit >= 2 || bestCredit >= 2 ? 1 : 0) + (bestDesc >= 2 ? 1 : 0);
  const confidence = Math.min(1, (rolesHit / 3) * 0.55 + (nameHits / 3) * 0.45);

  return { map, confidence };
}

/**
 * Parse a cell into integer VND đồng. Supports:
 * 45000, 45.000, 45,000, 45.000 VND, -120000, (120000), 45k
 */
export function parseCsvAmountCell(raw: string): {
  amount: number | null;
  signedNegative: boolean;
} {
  const text = (raw ?? "").trim();
  if (!text || /^[-–—]$/.test(text) || text === "0") {
    return { amount: null, signedNegative: false };
  }

  let signedNegative = false;
  let body = text;

  // Accounting negative: (1.200.000)
  const paren = body.match(/^\((.+)\)$/);
  if (paren) {
    signedNegative = true;
    body = paren[1]!.trim();
  }
  if (/^[-–—]/.test(body)) {
    signedNegative = true;
    body = body.replace(/^[-–—]\s*/, "");
  }
  if (body.startsWith("+")) {
    body = body.slice(1).trim();
  }

  // Strip currency words/symbols
  body = body
    .replace(/\b(vnd|vnđ|đồng|dong)\b/gi, "")
    .replace(/[₫đ]/g, "")
    .trim();

  // Unit suffix k / tr
  const unitMatch = body.match(/^(.+?)\s*(k|tr|triệu|trieu|m)$/i);
  if (unitMatch) {
    const amount = parseVndAmountToken(unitMatch[1]!.trim(), unitMatch[2]!);
    return { amount, signedNegative };
  }

  // Strip spaces used as thousand separators: 1 200 000
  body = body.replace(/\s/g, "");

  const amount = parseVndAmountToken(body);
  return { amount, signedNegative };
}

export function parseCsvDateCell(raw: string, today: string): {
  date: string;
  found: boolean;
} {
  const text = (raw ?? "").trim();
  if (!text) return { date: today, found: false };

  // ISO YYYY-MM-DD (optional time)
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, found: true };
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyFull = text.match(/\b(\d{1,2})[/.−-](\d{1,2})[/.−-](20\d{2})\b/);
  if (dmyFull) {
    const dd = dmyFull[1]!.padStart(2, "0");
    const mm = dmyFull[2]!.padStart(2, "0");
    return { date: `${dmyFull[3]}-${mm}-${dd}`, found: true };
  }

  // YYYY/MM/DD
  const ymd = text.match(/\b(20\d{2})[/.](\d{1,2})[/.](\d{1,2})\b/);
  if (ymd) {
    const mm = ymd[2]!.padStart(2, "0");
    const dd = ymd[3]!.padStart(2, "0");
    return { date: `${ymd[1]}-${mm}-${dd}`, found: true };
  }

  // DD/MM (current year)
  const dmy = text.match(/\b(\d{1,2})[/.](\d{1,2})\b/);
  if (dmy) {
    const year = today.slice(0, 4);
    const dd = dmy[1]!.padStart(2, "0");
    const mm = dmy[2]!.padStart(2, "0");
    return { date: `${year}-${mm}-${dd}`, found: true };
  }

  return { date: today, found: false };
}

function detectKindFromText(
  text: string,
  signedNegative: boolean,
  fromCredit: boolean,
  fromDebit: boolean,
): { kind: CandidateKind; uncertain: boolean } {
  if (TRANSFER_HINT.test(text)) return { kind: "transfer", uncertain: false };
  if (fromCredit && !fromDebit) return { kind: "income", uncertain: false };
  if (fromDebit && !fromCredit) return { kind: "expense", uncertain: false };
  if (INCOME_HINT.test(text) || (text.includes("+") && !signedNegative)) {
    return { kind: "income", uncertain: false };
  }
  if (signedNegative) return { kind: "expense", uncertain: false };
  // Default expense for bank statement lines
  return { kind: "expense", uncertain: true };
}

function scoreConfidence(fields: UncertainCsvField[]): CandidateConfidence {
  if (fields.length === 0) return "high";
  if (fields.length === 1 && fields[0] === "date") return "medium";
  if (fields.includes("amount") || fields.includes("merchant")) return "low";
  if (fields.length >= 2) return "low";
  return "medium";
}

function buildExplanations(fields: UncertainCsvField[]): string[] {
  const tips: string[] = [];
  if (fields.includes("amount")) {
    tips.push("Không chắc số tiền — kiểm tra trước khi duyệt.");
  }
  if (fields.includes("merchant")) {
    tips.push("Mô tả trống hoặc mơ hồ — bổ sung khi duyệt.");
  }
  if (fields.includes("date")) {
    tips.push("Không parse được ngày — dùng hôm nay.");
  }
  if (fields.includes("kind")) {
    tips.push("Chưa chắc chi / thu / chuyển — mặc định khoản chi.");
  }
  return tips;
}

function cellAt(row: string[], index: number | null): string {
  if (index === null || index < 0 || index >= row.length) return "";
  return row[index] ?? "";
}

function merchantFromDesc(desc: string): { merchant: string; uncertain: boolean } {
  const cleaned = desc.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return { merchant: "Không rõ", uncertain: true };
  }
  const merchant = cleaned.length > 64 ? `${cleaned.slice(0, 61).trim()}…` : cleaned;
  return { merchant, uncertain: cleaned.length < 2 };
}

/**
 * Parse a full CSV statement text into candidate drafts.
 */
export function parseCsvStatement(
  text: string,
  options: ParseCsvOptions = {},
): ParseCsvResult {
  const fileName = options.fileName ?? "statement.csv";

  if (!text || !text.trim()) {
    return emptyFail(fileName, "File trống hoặc không đọc được nội dung.");
  }

  const matrix = parseCsvMatrix(text);
  if (matrix.length === 0) {
    return emptyFail(fileName, "Không tìm thấy dòng dữ liệu trong CSV.");
  }

  return parseStatementFromMatrix(matrix, options);
}

/**
 * Shared statement heuristics over a string matrix (CSV or first XLSX sheet).
 * Money amounts stay integer VND đồng.
 */
export function parseStatementFromMatrix(
  matrix: string[][],
  options: ParseCsvOptions = {},
): ParseCsvResult {
  const fileName = options.fileName ?? "statement.csv";
  const today = options.today ?? todayInHoChiMinh();
  const maxRows = options.maxRows ?? 5000;

  if (!matrix || matrix.length === 0) {
    return emptyFail(fileName, "Không tìm thấy dòng dữ liệu trong file.");
  }

  // Header = first row if it looks non-numeric / has text labels
  const first = matrix[0]!;
  const hasHeader = looksLikeHeaderRow(first);
  const headers = hasHeader
    ? first.map((h, i) => normalizeHeader(h) || `Cột ${i + 1}`)
    : first.map((_, i) => `Cột ${i + 1}`);
  const dataRows = hasHeader ? matrix.slice(1) : matrix;

  if (dataRows.length === 0) {
    return emptyFail(
      fileName,
      "File chỉ có tiêu đề, không có dòng giao dịch.",
    );
  }

  const auto = mapCsvColumns(hasHeader ? first : headers);
  const map = options.columnMap
    ? normalizeColumnMap(options.columnMap)
    : auto.map;
  const confidence = options.columnMap ? 1 : auto.confidence;

  if (
    map.amount === null &&
    map.debit === null &&
    map.credit === null
  ) {
    return {
      ok: false,
      fileName,
      headers,
      columnMap: map,
      mapConfidence: confidence,
      rows: [],
      skippedRows: dataRows.length,
      warningCount: 0,
      error: "Không nhận ra cột số tiền. Kiểm tra file có cột Amount / Số tiền.",
    };
  }

  const rows: ParsedCsvRow[] = [];
  let skippedRows = 0;
  const limit = Math.min(dataRows.length, maxRows);

  for (let i = 0; i < limit; i++) {
    const rawRow = dataRows[i]!;
    const parsed = parseDataRow(rawRow, map, today, i + (hasHeader ? 2 : 1));
    if (!parsed) {
      skippedRows += 1;
      continue;
    }
    rows.push(parsed);
  }

  if (dataRows.length > maxRows) {
    skippedRows += dataRows.length - maxRows;
  }

  if (rows.length === 0) {
    return {
      ok: false,
      fileName,
      headers,
      columnMap: map,
      mapConfidence: confidence,
      rows: [],
      skippedRows,
      warningCount: 0,
      error:
        "Không trích được giao dịch hợp lệ. Cần cột ngày, số tiền và mô tả.",
    };
  }

  const warningCount = rows.filter(
    (r) => r.confidence === "low" || r.uncertainFields.length > 0,
  ).length;

  return {
    ok: true,
    fileName,
    headers,
    columnMap: map,
    mapConfidence: confidence,
    rows,
    skippedRows,
    warningCount,
  };
}

function emptyFail(fileName: string, error: string): ParseCsvResult {
  return {
    ok: false,
    fileName,
    headers: [],
    columnMap: {
      date: null,
      amount: null,
      desc: null,
      debit: null,
      credit: null,
    },
    mapConfidence: 0,
    rows: [],
    skippedRows: 0,
    warningCount: 0,
    error,
  };
}

/** Clamp optional indices; invalid indices become null. */
export function normalizeColumnMap(map: CsvColumnMap): CsvColumnMap {
  const clamp = (n: number | null): number | null =>
    n === null || !Number.isInteger(n) || n < 0 ? null : n;
  return {
    date: clamp(map.date),
    amount: clamp(map.amount),
    desc: clamp(map.desc),
    debit: clamp(map.debit),
    credit: clamp(map.credit),
  };
}

/** Empty map for UI state before auto-detect. */
export function emptyColumnMap(): CsvColumnMap {
  return {
    date: null,
    amount: null,
    desc: null,
    debit: null,
    credit: null,
  };
}

function looksLikeHeaderRow(row: string[]): boolean {
  if (row.length === 0) return false;
  let textish = 0;
  let moneyish = 0;
  for (const cell of row) {
    const t = cell.trim();
    if (!t) continue;
    if (parseCsvAmountCell(t).amount !== null && /\d/.test(t)) {
      moneyish += 1;
      continue;
    }
    if (/[a-zA-ZÀ-ỹ]/.test(t) && !/^\d+[.,]?\d*$/.test(t)) {
      textish += 1;
    }
  }
  // Header if mostly labels
  return textish >= Math.max(1, Math.ceil(row.length / 2)) && moneyish === 0;
}

function parseDataRow(
  rawRow: string[],
  map: CsvColumnMap,
  today: string,
  rowIndex: number,
): ParsedCsvRow | null {
  const uncertainFields: UncertainCsvField[] = [];

  // Amount from single column or debit/credit
  let amount: number | null = null;
  let signedNegative = false;
  let fromDebit = false;
  let fromCredit = false;

  if (map.amount !== null) {
    const cell = cellAt(rawRow, map.amount);
    const parsed = parseCsvAmountCell(cell);
    amount = parsed.amount;
    signedNegative = parsed.signedNegative;
  } else {
    const debitCell = cellAt(rawRow, map.debit);
    const creditCell = cellAt(rawRow, map.credit);
    const debit = parseCsvAmountCell(debitCell);
    const credit = parseCsvAmountCell(creditCell);
    if (debit.amount !== null && debit.amount > 0) {
      amount = debit.amount;
      signedNegative = true;
      fromDebit = true;
    } else if (credit.amount !== null && credit.amount > 0) {
      amount = credit.amount;
      signedNegative = false;
      fromCredit = true;
    }
  }

  if (amount === null || amount <= 0) {
    return null;
  }

  const dateCell = cellAt(rawRow, map.date);
  const { date, found: dateFound } = parseCsvDateCell(dateCell, today);
  if (!dateFound) uncertainFields.push("date");

  const desc = cellAt(rawRow, map.desc);
  const { merchant, uncertain: merchantUncertain } = merchantFromDesc(desc);
  if (merchantUncertain) uncertainFields.push("merchant");

  const kindText = [desc, ...rawRow].join(" ");
  const { kind, uncertain: kindUncertain } = detectKindFromText(
    kindText,
    signedNegative,
    fromCredit,
    fromDebit,
  );
  if (kindUncertain) uncertainFields.push("kind");

  const unique = [...new Set(uncertainFields)];
  const confidence = scoreConfidence(unique);
  const rawSnippet = rawRow.join(" | ");
  const snippet =
    rawSnippet.length > 160 ? `${rawSnippet.slice(0, 157)}…` : rawSnippet;

  return {
    kind,
    amount,
    merchant,
    note: "",
    occurredOn: date,
    confidence,
    uncertainFields: unique,
    explanations: buildExplanations(unique),
    rawSnippet: snippet,
    rowIndex,
  };
}

export type ImportCandidateSource = "csv" | "xlsx" | "pdf";

/** Map parsed statement rows to store inputs (source csv/xlsx/pdf + batch id). */
export function toCsvCandidateInputs(
  rows: ParsedCsvRow[],
  importBatchId: string,
  source: ImportCandidateSource = "csv",
): CreateCandidateInput[] {
  return rows.map((item) => ({
    kind: item.kind,
    amount: item.amount,
    merchant: item.merchant,
    note: item.note,
    occurredOn: item.occurredOn,
    source,
    confidence: item.confidence,
    status: "pending" as const,
    rawSnippet: item.rawSnippet,
    importBatchId,
  }));
}

/** Validate upload file before reading. */
export function validateUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}):
  | { ok: true; kind: "csv" | "xlsx" | "pdf" | "other" }
  | { ok: false; error: string } {
  if (!file || !file.name) {
    return { ok: false, error: "Chưa chọn file." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "File trống." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "File quá lớn (tối đa 10MB). Chọn file nhỏ hơn hoặc xuất CSV gọn.",
    };
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || file.type === "text/csv" || file.type === "application/csv") {
    return { ok: true, kind: "csv" };
  }
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  ) {
    return { ok: true, kind: "xlsx" };
  }
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    return { ok: true, kind: "pdf" };
  }
  return {
    ok: false,
    error:
      "Định dạng không hỗ trợ. Chọn CSV, XLS/XLSX, hoặc PDF text-layer (MF DEMO BANK).",
  };
}
