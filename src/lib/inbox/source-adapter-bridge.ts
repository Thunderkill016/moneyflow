import type { ParsedCsvRow, UncertainCsvField } from "./parse-csv.ts";
import type { CanonicalSourceCandidate } from "./source-observation.ts";

const REVIEW_FIELDS = new Set<UncertainCsvField>([
  "amount",
  "date",
  "kind",
  "merchant",
]);

function uncertainFieldsFromAdapterRow(
  row: CanonicalSourceCandidate,
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
 * Pure bridge from a canonical source candidate into the existing import-draft
 * row. Source observations must be normalized before reaching this boundary.
 * The bridge preserves source evidence verbatim and turns normalization findings
 * into review explanations; it does not perform matching, persistence, or ledger
 * mutation.
 */
export function sourceAdapterRowToParsedCsvRow(
  row: CanonicalSourceCandidate,
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
  rows: CanonicalSourceCandidate[],
): ParsedCsvRow[] {
  return rows.map(sourceAdapterRowToParsedCsvRow);
}
