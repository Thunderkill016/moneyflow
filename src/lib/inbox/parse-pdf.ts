/**
 * Text-layer PDF statement parser (TASK-023, wireframes-inbox §8).
 * One bank template: **MF DEMO BANK** pipe table (no OCR).
 *
 * Dependency: none — pure JS extract of literal strings from
 * **uncompressed** content streams (works in browser + Node).
 * FlateDecode / image-scan PDFs → clear Vietnamese error (no OCR).
 */

import {
  parseCsvAmountCell,
  parseCsvDateCell,
  type ParseCsvOptions,
  type ParseCsvResult,
  type ParsedCsvRow,
  type UncertainCsvField,
} from "./parse-csv.ts";
import type { CandidateConfidence, CandidateKind } from "./candidate-store.ts";
import { todayInHoChiMinh } from "./parse-text.ts";

/** Marker that identifies the supported text-layer bank template. */
export const MF_DEMO_BANK_MARKER = "MF DEMO BANK";

export type ParsePdfOptions = ParseCsvOptions;

function emptyPdfFail(fileName: string, error: string): ParseCsvResult {
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

/** True when filename/mime looks like PDF. */
export function isPdfUpload(file: { name: string; type?: string }): boolean {
  const lower = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return lower.endsWith(".pdf") || type === "application/pdf";
}

/**
 * Decode PDF literal string `(...)` with basic escape handling.
 */
export function decodePdfLiteral(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next == null) break;
    if (next === "n") {
      out += "\n";
      i += 1;
      continue;
    }
    if (next === "r") {
      out += "\r";
      i += 1;
      continue;
    }
    if (next === "t") {
      out += "\t";
      i += 1;
      continue;
    }
    if (next === "b") {
      out += "\b";
      i += 1;
      continue;
    }
    if (next === "f") {
      out += "\f";
      i += 1;
      continue;
    }
    if (next === "(" || next === ")" || next === "\\") {
      out += next;
      i += 1;
      continue;
    }
    // Octal \ddd
    const oct = raw.slice(i + 1).match(/^([0-7]{1,3})/);
    if (oct) {
      out += String.fromCharCode(parseInt(oct[1]!, 8));
      i += oct[1]!.length;
      continue;
    }
    // Unknown escape — keep next char
    out += next;
    i += 1;
  }
  return out;
}

/**
 * Decode PDF hex string `<...>` (optional UTF-16BE BOM FE FF).
 */
export function decodePdfHex(hexBody: string): string {
  const hex = hexBody.replace(/\s+/g, "");
  if (hex.length % 2 !== 0) return "";
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let s = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      s += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
    }
    return s;
  }
  return String.fromCharCode(...bytes);
}

/**
 * Pull printable text fragments from a PDF content stream (text operators only).
 */
export function extractTextFromContentStream(stream: string): string[] {
  const parts: string[] = [];
  // Match (...) Tj | (...) ' | (...) " | hex <..> Tj | TJ arrays
  const re =
    /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|\[((?:[^\](]*\((?:\\.|[^\\)])*\))*[^\]]*)\]\s*TJ|<\s*[0-9A-Fa-f\s]+\s*>\s*(?:Tj|'|")/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) {
    const token = m[0]!;
    if (token.startsWith("[")) {
      // TJ array: extract each literal / hex
      const inner = token.slice(0, token.lastIndexOf("]"));
      const litRe = /\((?:\\.|[^\\)])*\)|<\s*[0-9A-Fa-f\s]+\s*>/g;
      let lit: RegExpExecArray | null;
      let line = "";
      while ((lit = litRe.exec(inner)) !== null) {
        const piece = lit[0]!;
        if (piece.startsWith("(")) {
          line += decodePdfLiteral(piece.slice(1, -1));
        } else if (piece.startsWith("<")) {
          line += decodePdfHex(piece.slice(1, -1));
        }
      }
      if (line.trim()) parts.push(line);
      continue;
    }
    if (token.startsWith("(")) {
      const close = token.lastIndexOf(")");
      parts.push(decodePdfLiteral(token.slice(1, close)));
      continue;
    }
    if (token.startsWith("<")) {
      const close = token.indexOf(">");
      parts.push(decodePdfHex(token.slice(1, close)));
    }
  }
  return parts;
}

/**
 * Extract text-layer strings from a PDF buffer (no OCR).
 * Uncompressed content streams only (browser-safe, no native zlib).
 */
export function extractPdfTextLayer(
  data: ArrayBuffer | Uint8Array,
): { text: string; fragments: string[] } | { error: string } {
  if (!data || (data as ArrayBuffer).byteLength === 0) {
    return { error: "File PDF trống hoặc không đọc được." };
  }

  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data);

  // Detect %PDF header (allow leading whitespace/BOM)
  let headerProbe = "";
  const probeLen = Math.min(bytes.length, 16);
  for (let i = 0; i < probeLen; i++) headerProbe += String.fromCharCode(bytes[i]!);
  if (!/%PDF-/.test(headerProbe)) {
    return { error: "Không phải file PDF hợp lệ (thiếu %PDF-)." };
  }

  // Work on latin1 string for stream boundary search (binary-safe for ASCII operators)
  let latin = "";
  for (let i = 0; i < bytes.length; i++) {
    latin += String.fromCharCode(bytes[i]!);
  }

  const fragments: string[] = [];
  let sawFlateOnly = false;
  let streamCount = 0;

  // Find stream ... endstream pairs; look back for /Filter
  const streamRe = /stream\r?\n/g;
  let sm: RegExpExecArray | null;
  while ((sm = streamRe.exec(latin)) !== null) {
    const contentStart = sm.index + sm[0].length;
    const endIdx = latin.indexOf("endstream", contentStart);
    if (endIdx < 0) continue;
    streamCount += 1;

    // Object header preceding this stream (look back ~400 chars)
    const lookBack = latin.slice(Math.max(0, sm.index - 400), sm.index);
    const isFlate = /\/Filter\s*\/FlateDecode|\/Filter\s*\[\s*\/FlateDecode/.test(
      lookBack,
    );

    let contentLatin = latin.slice(contentStart, endIdx);
    // PDF allows optional \r after stream data before endstream
    if (contentLatin.endsWith("\r")) {
      contentLatin = contentLatin.slice(0, -1);
    }

    if (isFlate) {
      sawFlateOnly = true;
      continue;
    }

    const parts = extractTextFromContentStream(contentLatin);
    fragments.push(...parts);
  }

  // Fallback: some writers embed Tj outside filter-marked blocks we skip
  if (fragments.length === 0) {
    const loose = extractTextFromContentStream(latin);
    // Prefer fragments that look like statement lines / title
    const useful = loose.filter(
      (s) =>
        /MF\s+DEMO\s+BANK/i.test(s) ||
        /\d{1,2}[/.]\d{1,2}/.test(s) ||
        /\|\s*.+\s*\|/.test(s),
    );
    if (useful.length > 0) {
      fragments.push(...useful);
    } else if (loose.length > 0 && !sawFlateOnly) {
      fragments.push(...loose);
    }
  }

  if (fragments.length === 0) {
    if (sawFlateOnly || streamCount > 0) {
      return {
        error:
          "PDF dùng nén FlateDecode hoặc không có text layer đọc được. Money Flow (bước này) chỉ parse PDF text-layer không nén — xuất CSV/Excel, hoặc dùng mẫu MF DEMO BANK.",
      };
    }
    return {
      error:
        "PDF không có lớp chữ (text layer) hoặc bị mã hóa. Xuất CSV/Excel từ ngân hàng — Money Flow chưa hỗ trợ OCR ảnh quét.",
    };
  }

  const text = fragments.join("\n");
  return { text, fragments };
}

const INCOME_HINT =
  /\b(luong|lương|salary|thu\s*nhập|thu nhap|nhận|nhan|hoàn\s*tiền|hoan tien|refund|\+|deposit|credit)\b/i;
const TRANSFER_HINT =
  /\b(ck|chuyen|chuyển|transfer|nội\s*bộ|noi bo|chuyển\s*khoản|chuyen khoan)\b/i;

function detectKind(
  text: string,
  signedNegative: boolean,
): { kind: CandidateKind; uncertain: boolean } {
  if (TRANSFER_HINT.test(text)) return { kind: "transfer", uncertain: false };
  if (INCOME_HINT.test(text) || (text.includes("+") && !signedNegative)) {
    return { kind: "income", uncertain: false };
  }
  if (signedNegative) return { kind: "expense", uncertain: false };
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

/**
 * Detect supported MF DEMO BANK template in extracted text.
 */
export function isMfDemoBankTemplate(text: string): boolean {
  return text.toUpperCase().includes(MF_DEMO_BANK_MARKER);
}

/**
 * Parse MF DEMO BANK pipe table lines:
 * `DD/MM/YYYY | description | amount`
 * Header line: `Ngay GD | Noi dung | So tien` (optional).
 */
export function parseMfDemoBankText(
  text: string,
  options: ParsePdfOptions = {},
): ParseCsvResult {
  const fileName = options.fileName ?? "statement.pdf";
  const today = options.today ?? todayInHoChiMinh();
  const maxRows = options.maxRows ?? 5000;

  if (!isMfDemoBankTemplate(text)) {
    return emptyPdfFail(
      fileName,
      "PDF text-layer chưa khớp mẫu ngân hàng hỗ trợ (MF DEMO BANK). Hiện chỉ parse một template demo — xuất CSV/Excel hoặc dùng fixture mẫu.",
    );
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headers = ["Ngày GD", "Nội dung", "Số tiền"];
  const rows: ParsedCsvRow[] = [];
  let skippedRows = 0;
  let dataSeen = 0;

  // Pipe row: date | desc | amount
  const pipeRow =
    /^(\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)\s*\|\s*(.+?)\s*\|\s*([+\-–—()]?[\d.,\s]+[kKmM]?)\s*$/;

  for (const line of lines) {
    // Skip title / period / header
    if (/MF\s+DEMO\s+BANK/i.test(line)) continue;
    if (/^Ky\s+sao\s+ke/i.test(line) || /^Kỳ\s+sao\s+kê/i.test(line)) continue;
    if (/^Ngay\s+GD\s*\|/i.test(line) || /^Ngày\s+GD\s*\|/i.test(line)) continue;

    const m = line.match(pipeRow);
    if (!m) {
      // Non-matching content after template start counts as skip only if it looks data-ish
      if (/\d{1,2}[/.]\d{1,2}/.test(line) && /\d/.test(line)) {
        skippedRows += 1;
      }
      continue;
    }

    dataSeen += 1;
    if (rows.length >= maxRows) {
      skippedRows += 1;
      continue;
    }

    const dateRaw = m[1]!;
    const desc = m[2]!.replace(/\s+/g, " ").trim();
    const amountRaw = m[3]!;

    const uncertainFields: UncertainCsvField[] = [];
    const { amount, signedNegative } = parseCsvAmountCell(amountRaw);
    if (amount === null || amount <= 0) {
      skippedRows += 1;
      continue;
    }

    const { date, found: dateFound } = parseCsvDateCell(dateRaw, today);
    if (!dateFound) uncertainFields.push("date");

    let merchant = desc;
    let merchantUncertain = false;
    if (!merchant) {
      merchant = "Không rõ";
      merchantUncertain = true;
    } else if (merchant.length > 64) {
      merchant = `${merchant.slice(0, 61).trim()}…`;
    }
    if (merchantUncertain || merchant.length < 2) {
      uncertainFields.push("merchant");
    }

    const { kind, uncertain: kindUncertain } = detectKind(
      `${desc} ${amountRaw}`,
      signedNegative,
    );
    if (kindUncertain) uncertainFields.push("kind");

    const unique = [...new Set(uncertainFields)];
    const confidence = scoreConfidence(unique);
    const rawSnippet = line.length > 160 ? `${line.slice(0, 157)}…` : line;

    rows.push({
      kind,
      amount,
      merchant,
      note: "",
      occurredOn: date,
      confidence,
      uncertainFields: unique,
      explanations: buildExplanations(unique),
      rawSnippet,
      rowIndex: dataSeen,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      fileName,
      headers,
      columnMap: {
        date: 0,
        amount: 2,
        desc: 1,
        debit: null,
        credit: null,
      },
      mapConfidence: 0.9,
      rows: [],
      skippedRows,
      warningCount: 0,
      error:
        "Nhận ra MF DEMO BANK nhưng không trích được dòng giao dịch (cần dạng: Ngày | Nội dung | Số tiền).",
    };
  }

  const warningCount = rows.filter(
    (r) => r.confidence === "low" || r.uncertainFields.length > 0,
  ).length;

  return {
    ok: true,
    fileName,
    headers,
    columnMap: {
      date: 0,
      amount: 2,
      desc: 1,
      debit: null,
      credit: null,
    },
    mapConfidence: 0.92,
    rows,
    skippedRows,
    warningCount,
  };
}

/**
 * Parse a text-layer PDF ArrayBuffer — MF DEMO BANK template only (no OCR).
 */
export function parsePdfStatement(
  data: ArrayBuffer | Uint8Array,
  options: ParsePdfOptions = {},
): ParseCsvResult {
  const fileName = options.fileName ?? "statement.pdf";

  const extracted = extractPdfTextLayer(data);
  if ("error" in extracted) {
    return emptyPdfFail(fileName, extracted.error);
  }

  return parseMfDemoBankText(extracted.text, { ...options, fileName });
}

/**
 * Build a minimal text-layer PDF for the MF DEMO BANK fixture (tests / tooling).
 * Helvetica / WinAnsi — ASCII content only.
 */
export function buildMfDemoBankPdfBytes(
  extraLines?: string[],
): Uint8Array {
  const lines = extraLines ?? [
    "MF DEMO BANK - SAO KE TAI KHOAN",
    "Ky sao ke: 01/07/2026 - 15/07/2026",
    "Ngay GD | Noi dung | So tien",
    "12/07/2026 | Highlands Coffee | -45.000",
    "12/07/2026 | LUONG CT | +25.000.000",
    "11/07/2026 | GRAB *TRIP | 89.000",
    "10/07/2026 | CK noi bo | 2.000.000",
  ];

  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const ops: string[] = ["BT", "/F1 11 Tf", "14 TL", "50 750 Td"];
  lines.forEach((line, i) => {
    if (i > 0) ops.push("T*");
    ops.push(`(${escape(line)}) Tj`);
  });
  ops.push("ET");
  const stream = `${ops.join("\n")}\n`;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(byteLengthLatin1(pdf));
    pdf += obj;
  }
  const xrefStart = byteLengthLatin1(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    out[i] = pdf.charCodeAt(i) & 0xff;
  }
  return out;
}

function byteLengthLatin1(s: string): number {
  return s.length;
}
