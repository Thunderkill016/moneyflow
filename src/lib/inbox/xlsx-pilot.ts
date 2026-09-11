import * as XLSX from "xlsx";
import {
  emptyColumnMap,
  mapCsvColumns,
  parseStatementFromMatrix,
  type CsvColumnMap,
  type ParseCsvOptions,
  type ParseCsvResult,
} from "./parse-csv.ts";
import {
  parseXlsxStatement,
  readXlsxSourceEvidence,
  xlsxCellToString,
  type XlsxEvidenceCell,
  type XlsxEvidenceResult,
} from "./parse-xlsx.ts";

const HEADER_SCAN_LIMIT = 25;
const HEADER_CONFIDENCE_FLOOR = 0.85;
const TRANSACTION_DATE_HEADERS =
  /^(transaction\s*date|trans\s*date|txn\s*date|ngay\s*giao\s*dich|ngày\s*giao\s*dịch|ngay\s*gd|ngày\s*gd)$/i;
const STANDALONE_DIRECTION_HEADERS =
  /^(change|direction|sign|thay\s*doi|thay\s*đổi)$/i;

export const XLSX_PILOT_UNKNOWS = [
  "exact_headers_unrecorded",
  "source_reference_stability_unknown",
  "debit_credit_semantics_unverified",
  "fee_semantics_unverified",
  "overlap_dedupe_unverified",
] as const;

export type XlsxPilotUnknown = (typeof XLSX_PILOT_UNKNOWS)[number];

export type XlsxPilotInspection =
  | {
      ok: true;
      sheetNumber: number;
      rowCount: number;
      columnCount: number;
      dateSystem: "1900" | "1904";
      candidateHeaderRow: number | null;
      columnMap: CsvColumnMap;
      mapConfidence: number;
      numericColumns: number[];
      dateLikeColumns: number[];
      formulaCellCount: number;
      unknowns: XlsxPilotUnknown[];
    }
  | {
      ok: false;
      reason: "unreadable_excel_evidence";
    };

export type XlsxPilotParseResult = {
  result: ParseCsvResult;
  inspection: XlsxPilotInspection;
};

type ParseXlsxOptions = ParseCsvOptions & {
  sheetIndex?: number;
};

type HeaderCandidate = {
  index: number;
  map: CsvColumnMap;
  confidence: number;
};

type IndexedMatrix = {
  matrix: string[][];
  rowNumbers: number[];
};

function textForEvidenceCell(cell: XlsxEvidenceCell): string {
  if (typeof cell.rawValue === "string") return cell.rawValue.trim();
  if (typeof cell.formattedText === "string") return cell.formattedText.trim();
  if (typeof cell.rawValue === "number" && Number.isFinite(cell.rawValue)) {
    return String(cell.rawValue);
  }
  if (typeof cell.rawValue === "boolean") {
    return cell.rawValue ? "TRUE" : "FALSE";
  }
  return "";
}

function normalizePilotHeader(header: string): string {
  return header.trim().replace(/[_\s]+/g, " ");
}

function preferExplicitTransactionDate(
  headers: string[],
  map: CsvColumnMap,
): CsvColumnMap {
  const transactionDateIndex = headers.findIndex((header) =>
    TRANSACTION_DATE_HEADERS.test(normalizePilotHeader(header)),
  );
  return transactionDateIndex >= 0
    ? { ...map, date: transactionDateIndex }
    : map;
}

/**
 * Some statement exports represent direction in a dedicated column while the
 * amount itself remains unsigned (for example `+` / `-` beside `Số tiền`).
 * Preserve the generic parser contract by applying that explicit sign to a
 * cloned amount cell before parsing. This intentionally requires an exact
 * direction-style header and standalone sign cells; arbitrary text/hyphens are
 * never treated as financial direction.
 */
function applyStandaloneDirectionToAmount(
  matrix: string[][],
  map: CsvColumnMap,
): string[][] {
  if (
    matrix.length < 2 ||
    map.amount === null ||
    map.debit !== null ||
    map.credit !== null
  ) {
    return matrix;
  }

  const headers = matrix[0] ?? [];
  const directionIndex = headers.findIndex((header) =>
    STANDALONE_DIRECTION_HEADERS.test(normalizePilotHeader(header)),
  );
  if (directionIndex < 0) return matrix;

  let changed = false;
  const next = matrix.map((row, index) => {
    if (index === 0) return row;

    const direction = row[directionIndex]?.trim();
    if (direction !== "+" && direction !== "-") return row;

    const amount = row[map.amount!]?.trim();
    if (
      !amount ||
      /^[+\-–—]/.test(amount) ||
      /^\(.+\)$/.test(amount)
    ) {
      return row;
    }

    const updated = [...row];
    updated[map.amount!] = `${direction}${amount}`;
    changed = true;
    return updated;
  });

  return changed ? next : matrix;
}

export function findLikelyXlsxHeaderRow(
  matrix: string[][],
): HeaderCandidate | null {
  let best: HeaderCandidate | null = null;
  const limit = Math.min(matrix.length, HEADER_SCAN_LIMIT);

  for (let index = 0; index < limit; index += 1) {
    const row = matrix[index] ?? [];
    const nonEmptyTextCells = row.filter(
      (cell) => /[a-zA-ZÀ-ỹ]/.test(cell) && cell.trim().length > 0,
    ).length;
    if (nonEmptyTextCells < 2) continue;

    const mapped = mapCsvColumns(row);
    if (mapped.confidence < HEADER_CONFIDENCE_FLOOR) continue;

    if (!best || mapped.confidence > best.confidence) {
      best = {
        index,
        map: preferExplicitTransactionDate(row, mapped.map),
        confidence: mapped.confidence,
      };
    }
  }

  return best;
}

function inspectionFromEvidence(
  evidence: XlsxEvidenceResult,
  sheetIndex: number,
): XlsxPilotInspection {
  if (!evidence.ok) {
    return { ok: false, reason: "unreadable_excel_evidence" };
  }

  const matrix = evidence.rows.map((row) => row.map(textForEvidenceCell));
  const header = findLikelyXlsxHeaderRow(matrix);
  const numericColumns = new Set<number>();
  const dateLikeColumns = new Set<number>();
  let formulaCellCount = 0;

  for (const row of evidence.rows) {
    for (const cell of row) {
      if (cell.cellType === "n" && typeof cell.rawValue === "number") {
        numericColumns.add(cell.columnIndex);
      }
      if (cell.dateLikeFormat) dateLikeColumns.add(cell.columnIndex);
      if (cell.formula) formulaCellCount += 1;
    }
  }

  const firstEvidenceRow = evidence.rows[header?.index ?? -1];
  const candidateHeaderRow =
    header && firstEvidenceRow?.[0] ? firstEvidenceRow[0].rowIndex : null;

  return {
    ok: true,
    sheetNumber: sheetIndex + 1,
    rowCount: evidence.rows.length,
    columnCount: evidence.rows.reduce(
      (max, row) => Math.max(max, row.length),
      0,
    ),
    dateSystem: evidence.dateSystem,
    candidateHeaderRow,
    columnMap: header?.map ?? emptyColumnMap(),
    mapConfidence: header?.confidence ?? 0,
    numericColumns: [...numericColumns].sort((a, b) => a - b),
    dateLikeColumns: [...dateLikeColumns].sort((a, b) => a - b),
    formulaCellCount,
    unknowns: [...XLSX_PILOT_UNKNOWS],
  };
}

/**
 * Convert one worksheet into a rectangular matrix without dropping blank rows.
 * The generic workbook helper intentionally drops empty rows, which is useful
 * for loose parsing but would make source-row provenance drift when a real bank
 * export contains visual spacing before/between rows.
 */
function worksheetToIndexedMatrix(
  workbook: XLSX.WorkBook,
  sheetIndex: number,
): IndexedMatrix | null {
  const names = workbook.SheetNames ?? [];
  if (names.length === 0) return null;
  const index = Math.max(0, Math.min(sheetIndex, names.length - 1));
  const sheet = workbook.Sheets[names[index]!];
  if (!sheet || !sheet["!ref"]) return null;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const matrix: string[][] = [];
  const rowNumbers: number[] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells: string[] = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      cells.push(xlsxCellToString(sheet[address]?.v));
    }
    matrix.push(cells);
    rowNumbers.push(row + 1);
  }

  return { matrix, rowNumbers };
}

function offsetParsedRows(
  result: ParseCsvResult,
  rowOffset: number,
): ParseCsvResult {
  if (!result.ok || rowOffset <= 0) return result;
  return {
    ...result,
    rows: result.rows.map((row) => ({
      ...row,
      rowIndex: row.rowIndex + rowOffset,
      sourceRowIndex:
        row.sourceRowIndex === undefined
          ? undefined
          : row.sourceRowIndex + rowOffset,
    })),
  };
}

/**
 * File-first pilot parser for real Vietnamese bank exports.
 *
 * This stays deliberately generic: it only skips a leading workbook preamble
 * when at least two familiar column roles make a later header row high
 * confidence. When a workbook exposes both posting/value date and an explicit
 * transaction-date column, the latter is preferred for `occurredOn`. A separate
 * standalone direction column can qualify an otherwise unsigned amount, but it
 * never becomes identity or a bank-specific contract. The inspection object
 * contains structural metadata only; no cell text, amount, description, account
 * number, sheet name or raw row is returned.
 */
export function parseXlsxPilotStatement(
  data: ArrayBuffer | Uint8Array,
  options: ParseXlsxOptions = {},
): XlsxPilotParseResult {
  const sheetIndex = options.sheetIndex ?? 0;
  const evidence = readXlsxSourceEvidence(data, { sheetIndex });
  const inspection = inspectionFromEvidence(evidence, sheetIndex);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(
      data instanceof Uint8Array ? data : new Uint8Array(data),
      {
        type: "array",
        cellDates: true,
      },
    );
  } catch {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const indexed = worksheetToIndexedMatrix(workbook, sheetIndex);
  if (!indexed) {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const header = findLikelyXlsxHeaderRow(indexed.matrix);
  if (!header) {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const headerRowNumber = indexed.rowNumbers[header.index];
  if (headerRowNumber === undefined) {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const columnMap = options.columnMap ?? header.map;
  const statementMatrix = applyStandaloneDirectionToAmount(
    indexed.matrix.slice(header.index),
    columnMap,
  );
  const result = parseStatementFromMatrix(statementMatrix, {
    ...options,
    fileName: options.fileName ?? "statement.xlsx",
    columnMap,
  });

  return {
    result: offsetParsedRows(result, headerRowNumber - 1),
    inspection,
  };
}
