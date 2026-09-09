import type { ParsedCsvRow, UncertainCsvField } from "./parse-csv.ts";
import type { NormalizedSourceAdapterRow } from "./source-adapter.ts";

const REVIEW_FIELDS = new Set<UncertainCsvField>([
  "amount",
  "date",
  "kind",
  "merchant",
]);

function uncertainFieldsFromAdapterRow(
  row: NormalizedSourceAdapterRow,
): UncertainCsvField[] {
  const fields: UncertainCsvField[] = [];
  for (const finding of row.findings) {
    const field = finding.field === "direction" ? "kind" : finding.field;
    if (REVIEW_FIELDS.has(field as UncertainCsvField)) {
      fields.push(field as UncertainCsvField);
    }
  }
  return [...new Set(fields)];
}

/**
 * Pure bridge from an accepted adapter row into the existing import-draft row.
 * It preserves source evidence verbatim and turns adapter findings into review
 * explanations; it does not perform matching, persistence, or ledger mutation.
 */
export function sourceAdapterRowToParsedCsvRow(
  row: NormalizedSourceAdapterRow,
): ParsedCsvRow {
  return {
    kind: row.kind,
    amount: row.amount,
    merchant: row.merchant,
    note: row.note,
    occurredOn: row.occurredOn,
    confidence: row.confidence,
    uncertainFields: uncertainFieldsFromAdapterRow(row),
    explanations: row.findings.map((finding) => finding.message),
    rawSnippet: row.rawSnippet,
    rowIndex: row.sourceRowIndex,
    sourceRowIndex: row.sourceRowIndex,
    sourceExternalId: row.sourceExternalId,
    sourceLifecycleState: row.sourceLifecycleState,
    sourcePredecessorExternalId: row.sourcePredecessorExternalId,
    parserVersion: row.parserVersion,
    mappingVersion: row.mappingVersion,
  };
}

export function sourceAdapterRowsToParsedCsvRows(
  rows: NormalizedSourceAdapterRow[],
): ParsedCsvRow[] {
  return rows.map(sourceAdapterRowToParsedCsvRow);
}
