import type { CandidateSource } from "./inbox/candidate-store.ts";
import type { AccountReconciliationEntry } from "./reconciliation.ts";

export type ReconciliationImportEvidence = {
  source: CandidateSource;
  sourceRowIndex: number | null;
  originalDescription: string;
  importBatchId: string | null;
};

export type ReconciliationImportEvidenceData = {
  byTransactionId: Record<string, ReconciliationImportEvidence>;
  dataError: string | null;
};

const SOURCE_LABELS: Record<CandidateSource, string> = {
  paste: "Dán",
  csv: "CSV",
  xlsx: "XLSX",
  pdf: "PDF",
  manual: "Nhập tay",
  notification: "Thông báo",
  email: "Email",
};

export function emptyReconciliationImportEvidence(
  dataError: string | null = null,
): ReconciliationImportEvidenceData {
  return { byTransactionId: {}, dataError };
}

export function reconciliationImportSourceLabel(source: CandidateSource) {
  return SOURCE_LABELS[source];
}

export function reconciliationImportEvidenceLabel(
  evidence: ReconciliationImportEvidence,
) {
  const source = reconciliationImportSourceLabel(evidence.source);
  return evidence.sourceRowIndex === null
    ? source
    : `${source} · dòng ${evidence.sourceRowIndex + 1}`;
}

/**
 * Returns pending account legs whose signed impact exactly explains the current
 * statement difference. This is a review hint only: amount equality is not
 * proof that the statement contains the transaction, so callers must never
 * mutate reconciliation state from this result automatically.
 */
export function findExactDifferenceCandidates(
  entries: AccountReconciliationEntry[],
  statementDate: string,
  difference: number,
) {
  if (!Number.isSafeInteger(difference) || difference === 0) return [];

  return entries.filter(
    (entry) =>
      entry.state === "pending" &&
      entry.transaction.occurredOn <= statementDate &&
      Number.isSafeInteger(entry.impact) &&
      entry.impact === difference,
  );
}
