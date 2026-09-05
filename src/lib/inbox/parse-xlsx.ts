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
import type { ExcelDateSystem } from "./source-adapter.ts";

export type ParseXlsxOptions = ParseCsvOptions & {
  /** 0-based sheet index. Default 0 (first sheet). */
  sheetIndex?: number;
};

export type XlsxEvidenceCell = {
  /** 1-based worksheet row, matching what a user sees in Excel. */
  rowIndex: number;
  /** 0-based worksheet column, matching existing column-map conventions. */
  columnIndex: number;
  address: string;
  cellType: string | null;
  /** Raw SheetJS cell value. Date-like Excel cells stay numeric on this path. */
  rawValue: unknown;
  /** Workbook number format (`z`) when the source stores one. */
  numberFormat?: string;
  /** SheetJS display text (`w`); review-only, never stable identity. */
  formattedText?: string;
  /** Source formula text when present. Never evaluated by MoneyFlow here. */
  formula?: string;
  /** True only when the source number-format syntax itself is date/time-like. */
  dateLikeFormat: boolean;
};

export type XlsxEvidenceResult =
  | {
      ok: true;
      sheetName: string;
      dateSystem: ExcelDateSystem;
      /** Rectangular cells over the worksheet `!ref`, preserving empty positions. */
      rows: XlsxEvidenceCell[][];
    }
  | { ok: false; error: string };

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

function toBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

const OLE_COMPOUND_SIGNATURE = [
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
] as const;
const BIFF_SECOND_BYTES = new Set([0x00, 0x02, 0x04, 0x08]);

/**
 * Strict evidence mode accepts only binary Excel-family signatures that can
 * carry typed cells. This intentionally rejects SheetJS' plaintext fallback,
 * where arbitrary bytes may otherwise be interpreted as CSV/TSV.
 */
export function hasSupportedExcelEvidenceSignature(
  data: ArrayBuffer | Uint8Array,
): boolean {
  const bytes = toBytes(data);
  if (bytes.length < 2) return false;

  // OOXML XLSX/XLSM packages are ZIP containers. SheetJS identifies these by
  // a leading 0x50 byte; requiring the PK pair avoids plain-text fallback.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return true;

  // BIFF5/8 XLS normally uses the OLE/CFB compound container.
  if (
    bytes.length >= OLE_COMPOUND_SIGNATURE.length &&
    OLE_COMPOUND_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return true;
  }

  // Earlier BIFF streams can start directly with a BOF record. SheetJS' file
  // type detector treats 0x09 as BIFF; constrain byte 1 to known BOF versions.
  return bytes[0] === 0x09 && BIFF_SECOND_BYTES.has(bytes[1]!);
}

/**
 * Read the workbook epoch exactly as declared by Excel workbook metadata.
 * Missing/false means the default 1900 system; true means 1904.
 */
export function xlsxWorkbookDateSystem(
  workbook: XLSX.WorkBook,
): ExcelDateSystem {
  const wbProps = workbook.Workbook?.WBProps as
    | { date1904?: unknown }
    | undefined;
  const date1904 = wbProps?.date1904;
  return date1904 === true || date1904 === 1 ? "1904" : "1900";
}

/**
 * Evidence-only XLS/XLSX reader for future strict source adapters.
 *
 * It deliberately differs from the legacy generic parser:
 * - only typed Excel-family binary signatures are accepted;
 * - `cellDates:false` preserves Excel date codes as numbers;
 * - `cellNF:true` preserves source number-format metadata;
 * - workbook epoch is returned explicitly;
 * - no financial fields, dates, directions, or identities are inferred.
 *
 * The returned evidence is in-memory input to an adapter. It does not persist a
 * workbook, create Inbox candidates, or mutate ledger state.
 */
export function readXlsxSourceEvidence(
  data: ArrayBuffer | Uint8Array,
  options: Pick<ParseXlsxOptions, "sheetIndex"> = {},
): XlsxEvidenceResult {
  if (!data || (data as ArrayBuffer).byteLength === 0) {
    return { ok: false, error: "File Excel trống hoặc không đọc được." };
  }
  if (!hasSupportedExcelEvidenceSignature(data)) {
    return {
      ok: false,
      error:
        "File không có chữ ký XLS/XLSX đủ tin cậy để đọc bằng chứng nguồn.",
    };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(toBytes(data), {
      type: "array",
      cellDates: false,
      cellNF: true,
    });
  } catch {
    return {
      ok: false,
      error: "Không mở được file Excel để đọc bằng chứng nguồn.",
    };
  }

  const names = workbook.SheetNames ?? [];
  if (names.length === 0) {
    return { ok: false, error: "File Excel không có sheet nào." };
  }
  const requested = options.sheetIndex ?? 0;
  const index = Math.max(0, Math.min(requested, names.length - 1));
  const sheetName = names[index]!;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) {
    return { ok: false, error: `Sheet “${sheetName}” trống hoặc không đọc được.` };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows: XlsxEvidenceCell[][] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells: XlsxEvidenceCell[] = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[address];
      const numberFormat =
        typeof cell?.z === "string" && cell.z.length > 0 ? cell.z : undefined;
      cells.push({
        rowIndex: row + 1,
        columnIndex: column,
        address,
        cellType: typeof cell?.t === "string" ? cell.t : null,
        rawValue: cell?.v ?? null,
        numberFormat,
        formattedText:
          typeof cell?.w === "string" && cell.w.length > 0 ? cell.w : undefined,
        formula:
          typeof cell?.f === "string" && cell.f.length > 0 ? cell.f : undefined,
        dateLikeFormat:
          numberFormat !== undefined && XLSX.SSF.is_date(numberFormat),
      });
    }
    rows.push(cells);
  }

  return {
    ok: true,
    sheetName,
    dateSystem: xlsxWorkbookDateSystem(workbook),
    rows,
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
 * This is the legacy generic path and intentionally retains its current behavior.
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
    workbook = XLSX.read(toBytes(data), {
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
