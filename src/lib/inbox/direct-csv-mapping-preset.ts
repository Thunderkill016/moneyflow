import type { CsvColumnMap } from "./parse-csv.ts";
import {
  CURRENT_IMPORT_MAPPING_VERSION,
  parserVersionForSource,
} from "./provenance.ts";

export const DIRECT_CSV_MAPPING_PRESET_VERSION = 2;
export const DIRECT_CSV_MAPPING_PRESET_STORAGE_KEY =
  "moneyflow-direct-csv-mapping-preset-v2";

export type DirectCsvMappingSemanticContext = {
  parserVersion: string;
  mappingVersion: number;
};

export const CURRENT_DIRECT_CSV_MAPPING_CONTEXT: DirectCsvMappingSemanticContext = {
  parserVersion: parserVersionForSource("csv"),
  mappingVersion: CURRENT_IMPORT_MAPPING_VERSION,
};

export type DirectCsvMappingPreset = {
  version: typeof DIRECT_CSV_MAPPING_PRESET_VERSION;
  headerShape: string;
  parserVersion: string;
  mappingVersion: number;
  columnMap: CsvColumnMap;
};

function normalizedHeader(header: string): string {
  return header
    .replace(/^\uFEFF/u, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("vi");
}

export function directCsvHeaderShape(headers: string[]): string | null {
  if (headers.length === 0) return null;
  const shape = headers.map(normalizedHeader);
  if (shape.some((header) => header.length === 0)) return null;
  return shape.join("\u001f");
}

function validColumnIndex(index: number | null, headerCount: number): boolean {
  return index === null || (Number.isInteger(index) && index >= 0 && index < headerCount);
}

function validColumnMap(map: CsvColumnMap, headerCount: number): boolean {
  return (
    validColumnIndex(map.date, headerCount) &&
    validColumnIndex(map.amount, headerCount) &&
    validColumnIndex(map.desc, headerCount) &&
    validColumnIndex(map.debit, headerCount) &&
    validColumnIndex(map.credit, headerCount) &&
    (map.amount !== null || map.debit !== null || map.credit !== null)
  );
}

function validSemanticContext(
  context: DirectCsvMappingSemanticContext,
): boolean {
  return (
    typeof context.parserVersion === "string" &&
    context.parserVersion.length >= 1 &&
    context.parserVersion.length <= 80 &&
    Number.isSafeInteger(context.mappingVersion) &&
    context.mappingVersion >= 1
  );
}

function copyColumnMap(map: CsvColumnMap): CsvColumnMap {
  return {
    date: map.date,
    amount: map.amount,
    desc: map.desc,
    debit: map.debit,
    credit: map.credit,
  };
}

function isColumnIndex(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

function parseStoredColumnMap(value: unknown): CsvColumnMap | null {
  if (!value || typeof value !== "object") return null;
  const map = value as Partial<CsvColumnMap>;
  if (
    !isColumnIndex(map.date) ||
    !isColumnIndex(map.amount) ||
    !isColumnIndex(map.desc) ||
    !isColumnIndex(map.debit) ||
    !isColumnIndex(map.credit)
  ) {
    return null;
  }
  return {
    date: map.date,
    amount: map.amount,
    desc: map.desc,
    debit: map.debit,
    credit: map.credit,
  };
}

export function createDirectCsvMappingPreset(
  headers: string[],
  columnMap: CsvColumnMap,
  context: DirectCsvMappingSemanticContext = CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
): DirectCsvMappingPreset | null {
  const headerShape = directCsvHeaderShape(headers);
  if (
    !headerShape ||
    !validColumnMap(columnMap, headers.length) ||
    !validSemanticContext(context)
  ) {
    return null;
  }
  return {
    version: DIRECT_CSV_MAPPING_PRESET_VERSION,
    headerShape,
    parserVersion: context.parserVersion,
    mappingVersion: context.mappingVersion,
    columnMap: copyColumnMap(columnMap),
  };
}

export function resolveDirectCsvMappingPreset(
  headers: string[],
  preset: DirectCsvMappingPreset | null,
  context: DirectCsvMappingSemanticContext = CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
): CsvColumnMap | null {
  const headerShape = directCsvHeaderShape(headers);
  if (
    !preset ||
    preset.version !== DIRECT_CSV_MAPPING_PRESET_VERSION ||
    !validSemanticContext(context) ||
    !headerShape ||
    preset.headerShape !== headerShape ||
    preset.parserVersion !== context.parserVersion ||
    preset.mappingVersion !== context.mappingVersion ||
    !validColumnMap(preset.columnMap, headers.length)
  ) {
    return null;
  }
  return copyColumnMap(preset.columnMap);
}

function parseStoredDirectCsvMappingPreset(
  rawPreset: string | null,
): DirectCsvMappingPreset | null {
  if (!rawPreset) return null;
  try {
    const value: unknown = JSON.parse(rawPreset);
    if (!value || typeof value !== "object") return null;
    const preset = value as Partial<DirectCsvMappingPreset>;
    const columnMap = parseStoredColumnMap(preset.columnMap);
    const parserVersion = preset.parserVersion;
    const mappingVersion = preset.mappingVersion;
    if (
      preset.version !== DIRECT_CSV_MAPPING_PRESET_VERSION ||
      typeof preset.headerShape !== "string" ||
      preset.headerShape.length === 0 ||
      typeof parserVersion !== "string" ||
      typeof mappingVersion !== "number" ||
      !Number.isSafeInteger(mappingVersion) ||
      !columnMap
    ) {
      return null;
    }
    const context: DirectCsvMappingSemanticContext = {
      parserVersion,
      mappingVersion,
    };
    if (!validSemanticContext(context)) return null;
    return {
      version: DIRECT_CSV_MAPPING_PRESET_VERSION,
      headerShape: preset.headerShape,
      parserVersion: context.parserVersion,
      mappingVersion: context.mappingVersion,
      columnMap,
    };
  } catch {
    return null;
  }
}

export function readDirectCsvMappingPreset(
  rawPreset: string | null,
  headers: string[],
  context: DirectCsvMappingSemanticContext = CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
): CsvColumnMap | null {
  return resolveDirectCsvMappingPreset(
    headers,
    parseStoredDirectCsvMappingPreset(rawPreset),
    context,
  );
}

export function writeDirectCsvMappingPreset(
  storage: Pick<Storage, "setItem">,
  preset: DirectCsvMappingPreset,
): void {
  storage.setItem(
    DIRECT_CSV_MAPPING_PRESET_STORAGE_KEY,
    JSON.stringify({
      version: preset.version,
      headerShape: preset.headerShape,
      parserVersion: preset.parserVersion,
      mappingVersion: preset.mappingVersion,
      columnMap: copyColumnMap(preset.columnMap),
    }),
  );
}