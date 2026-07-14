/**
 * XLSX / XLS statement parser (TASK-022, wireframes-inbox §8).
 * Reads **first sheet only** via SheetJS (`xlsx`), then reuses CSV column
 * heuristics + integer VND đồng parsing.
 *
 * Dependency justified: bank/credit statements in VN often arrive as Excel;
 * upload UI already accepts .xlsx/.xls. First-sheet → matrix is enough —
 * no full spreadsheet editor needed.
 */

import * as XLSX from "xlsx";
import {
  parseStatementFromMatrix,
  type ParseCsvOptions,
  type ParseCsvResult,
} from "./parse-csv.ts";

export type ParseXlsxOptions = ParseCsvOptions & {
  /** 0-based sheet index. Default 0 (first sheet). */
  sheetIndex?: number;
};

function emptyXlsxFail(fileName: string, error: string): ParseCsvResult {
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

/**
 * Normalize a sheet cell to a trimmed string for shared heuristics.
 * Numbers → decimal string without scientific notation when safe;
 * Dates → YYYY-MM-DD (local calendar parts).
 */
export function xlsxCellToString(cell: unknown): string {
  if (cell == null) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return "";
    // Prefer integer text for whole numbers (money, dates serials already converted).
    if (Number.isInteger(cell)) return String(cell);
    // Avoid float money: keep full digit string from sheet (raw path).
    return String(cell);
  }
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return "";
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(cell).trim();
}

/**
 * Convert first (or chosen) workbook sheet to a string matrix.
 * Empty trailing rows dropped; empty columns kept for column index stability.
 */
export function workbookFirstSheetToMatrix(
  workbook: XLSX.WorkBook,
  sheetIndex = 0,
): { sheetName: string; matrix: string[][] } | { error: string } {
  const names = workbook.SheetNames ?? [];
  if (names.length === 0) {
    return { error: "File Excel không có sheet nào." };
  }
  const index = Math.max(0, Math.min(sheetIndex, names.length - 1));
  const sheetName = names[index]!;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { error: `Không đọc được sheet “${sheetName}”.` };
  }

  // raw: true keeps numbers as numbers (better for integer money);
  // cellDates converts Excel date serials to Date for YYYY-MM-DD.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });

  const matrix = aoa
    .map((row) => {
      const cells = Array.isArray(row) ? row : [];
      return cells.map((c) => xlsxCellToString(c));
    })
    .filter((row) => row.some((c) => c.length > 0));

  if (matrix.length === 0) {
    return { error: `Sheet “${sheetName}” trống hoặc không có ô dữ liệu.` };
  }

  return { sheetName, matrix };
}

/**
 * Parse an XLSX/XLS ArrayBuffer (or Uint8Array) — first sheet only by default.
 */
export function parseXlsxStatement(
  data: ArrayBuffer | Uint8Array,
  options: ParseXlsxOptions = {},
): ParseCsvResult {
  const fileName = options.fileName ?? "statement.xlsx";
  const sheetIndex = options.sheetIndex ?? 0;

  if (!data || (data as ArrayBuffer).byteLength === 0) {
    return emptyXlsxFail(fileName, "File Excel trống hoặc không đọc được.");
  }

  let workbook: XLSX.WorkBook;
  try {
    const bytes =
      data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      // Dense not required; first sheet only is enough for statements.
    });
  } catch {
    return emptyXlsxFail(
      fileName,
      "Không mở được file Excel. Thử lưu lại .xlsx hoặc xuất CSV UTF-8.",
    );
  }

  const extracted = workbookFirstSheetToMatrix(workbook, sheetIndex);
  if ("error" in extracted) {
    return emptyXlsxFail(fileName, extracted.error);
  }

  const result = parseStatementFromMatrix(extracted.matrix, {
    ...options,
    fileName,
  });

  // Annotate sheet in error-free path via map confidence note is enough;
  // callers use source: "xlsx" on the import batch.
  if (!result.ok && result.error) {
    return {
      ...result,
      error: `${result.error} (sheet “${extracted.sheetName}”).`,
    };
  }

  return result;
}

/** True when filename/mime looks like Excel (xlsx or legacy xls). */
export function isExcelUpload(file: { name: string; type?: string }): boolean {
  const lower = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.ms-excel"
  );
}
