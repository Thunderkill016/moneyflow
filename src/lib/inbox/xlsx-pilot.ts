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
  workbookFirstSheetToMatrix,
  type XlsxEvidenceCell,
  type XlsxEvidenceResult,
} from "./parse-xlsx.ts";

const HEADER_SCAN_LIMIT = 25;
const HEADER_CONFIDENCE_FLOOR = 0.85;

export const XLSX_PILOT_UNKNOWNS = [
  "exact_headers_unrecorded",
  "source_reference_stability_unknown",
  "debit_credit_semantics_unverified",
  "fee_semantics_unverified",
  "overlap_dedupe_unverified",
] as const;

export type XlsxPilotUnknown = (typeof XLSX_PILOT_UNKNOWNS)[number];

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

type HeaderCandidate = {
  index: number;
  map: CsvColumnMap;
  confidence: number;
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
        map: mapped.map,
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
    header && firstEvidenceRow?.[0]
      ? firstEvidenceRow[0].rowIndex
      : null;

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
    unknowns: [...XLSX_PILOT_UNKNOWNS],
  };
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
 * confidence. It never enables a bank-specific map or invents stable identity.
 * The inspection object contains structural metadata only; no cell text, amount,
 * description, account number, sheet name or raw row is returned.
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
    workbook = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), {
      type: "array",
      cellDates: true,
    });
  } catch {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const extracted = workbookFirstSheetToMatrix(workbook, sheetIndex);
  if ("error" in extracted) {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const header = findLikelyXlsxHeaderRow(extracted.matrix);
  if (!header || header.index === 0) {
    return {
      result: parseXlsxStatement(data, options),
      inspection,
    };
  }

  const result = parseStatementFromMatrix(extracted.matrix.slice(header.index), {
    ...options,
    fileName: options.fileName ?? "statement.xlsx",
  });

  return {
    result: offsetParsedRows(result, header.index),
    inspection,
  };
}

type ParseXlsxOptions = ParseCsvOptions & {
  sheetIndex?: number;
};
