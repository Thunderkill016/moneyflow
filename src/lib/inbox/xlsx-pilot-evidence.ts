import { candidateFingerprint } from "./detect.ts";
import type {
  ParsedCsvRow,
  UncertainCsvField,
} from "./parse-csv.ts";
import {
  parseXlsxPilotStatement,
  type XlsxPilotInspection,
} from "./xlsx-pilot.ts";

export const XLSX_PILOT_EVIDENCE_VERSION = 1;

export type XlsxPilotEvidenceFileSummary = {
  label: "file-1" | "file-2";
  inspection: XlsxPilotInspection;
  parse: {
    ok: boolean;
    candidateCount: number;
    skippedRows: number;
    warningCount: number;
    confidenceCounts: {
      high: number;
      medium: number;
      low: number;
    };
    uncertainFieldCounts: Record<UncertainCsvField, number>;
  };
};

export type XlsxPilotOverlapSummary = {
  /**
   * This is heuristic overlap evidence for two exports that the operator knows
   * came from the same account/context. It is never source/provider identity.
   */
  method: "same-account-client-fingerprint-v1";
  comparable: boolean;
  sharedCandidateCount: number;
  file1OnlyCandidateCount: number;
  file2OnlyCandidateCount: number;
  caveats: string[];
};

export type XlsxPilotPrivacySafeEvidenceReport = {
  version: typeof XLSX_PILOT_EVIDENCE_VERSION;
  privacy: {
    rawRowsIncluded: false;
    realFileNamesIncluded: false;
    amountsIncluded: false;
    descriptionsIncluded: false;
    accountIdentifiersIncluded: false;
    perRowFingerprintsIncluded: false;
  };
  files: XlsxPilotEvidenceFileSummary[];
  overlap?: XlsxPilotOverlapSummary;
};

export type XlsxPilotEvidenceInput = {
  data: ArrayBuffer | Uint8Array;
  /** Optional deterministic clock override for parser tests/evidence replay. */
  today?: string;
};

const UNCERTAIN_FIELDS: UncertainCsvField[] = [
  "amount",
  "merchant",
  "date",
  "kind",
];

const SAME_ACCOUNT_EVIDENCE_SCOPE = "moneyflow-evidence-same-account";

function summarizeRows(rows: ParsedCsvRow[]) {
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  const uncertainFieldCounts: Record<UncertainCsvField, number> = {
    amount: 0,
    merchant: 0,
    date: 0,
    kind: 0,
  };

  for (const row of rows) {
    confidenceCounts[row.confidence] += 1;
    const uncertain = new Set(row.uncertainFields);
    for (const field of UNCERTAIN_FIELDS) {
      if (uncertain.has(field)) uncertainFieldCounts[field] += 1;
    }
  }

  return { confidenceCounts, uncertainFieldCounts };
}

function safeFileSummary(
  input: XlsxPilotEvidenceInput,
  label: XlsxPilotEvidenceFileSummary["label"],
): { summary: XlsxPilotEvidenceFileSummary; rows: ParsedCsvRow[] } {
  const { result, inspection } = parseXlsxPilotStatement(input.data, {
    fileName: `${label}.xlsx`,
    today: input.today,
  });
  const rows = result.ok ? result.rows : [];
  const { confidenceCounts, uncertainFieldCounts } = summarizeRows(rows);

  return {
    summary: {
      label,
      inspection,
      parse: {
        ok: result.ok,
        candidateCount: rows.length,
        skippedRows: result.skippedRows,
        warningCount: result.warningCount,
        confidenceCounts,
        uncertainFieldCounts,
      },
    },
    rows,
  };
}

/**
 * Compute the existing client candidate fingerprint in-memory with a fixed
 * same-account scope. The hash is intentionally never returned. This keeps the
 * comparison aligned with current heuristic reconciliation semantics while
 * preventing a durable per-row identifier from escaping the evidence report.
 */
function privateSameAccountFingerprint(row: ParsedCsvRow): string {
  return candidateFingerprint({
    amount: row.amount,
    occurredOn: row.occurredOn,
    accountId: SAME_ACCOUNT_EVIDENCE_SCOPE,
    merchant: row.merchant,
    note: row.note,
    rawSnippet: row.rawSnippet,
  });
}

function fingerprintMultiplicity(rows: ParsedCsvRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const fingerprint = privateSameAccountFingerprint(row);
    counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
  }
  return counts;
}

function overlapSummary(
  file1Rows: ParsedCsvRow[],
  file2Rows: ParsedCsvRow[],
  comparable: boolean,
): XlsxPilotOverlapSummary {
  if (!comparable) {
    return {
      method: "same-account-client-fingerprint-v1",
      comparable: false,
      sharedCandidateCount: 0,
      file1OnlyCandidateCount: file1Rows.length,
      file2OnlyCandidateCount: file2Rows.length,
      caveats: [
        "At least one file did not parse successfully; overlap counts are not comparable.",
        "This report never proves provider-stable transaction identity.",
      ],
    };
  }

  const left = fingerprintMultiplicity(file1Rows);
  const right = fingerprintMultiplicity(file2Rows);
  let sharedCandidateCount = 0;

  for (const [fingerprint, leftCount] of left) {
    const rightCount = right.get(fingerprint) ?? 0;
    sharedCandidateCount += Math.min(leftCount, rightCount);
  }

  return {
    method: "same-account-client-fingerprint-v1",
    comparable: true,
    sharedCandidateCount,
    file1OnlyCandidateCount: file1Rows.length - sharedCandidateCount,
    file2OnlyCandidateCount: file2Rows.length - sharedCandidateCount,
    caveats: [
      "The operator must verify both files represent the same bank account/export context.",
      "Overlap uses MoneyFlow's current heuristic client fingerprint only; it is not sourceExternalId and does not prove provider reference stability.",
      "Counts can change when a bank changes normalized date, amount, description, or other fingerprint material between exports.",
    ],
  };
}

/**
 * Build a report safe to paste into issue/task evidence. The function may inspect
 * sensitive statement content in memory, but the returned value contains only
 * structural metadata and aggregate counts. No raw row value or per-row hash is
 * returned.
 */
export function buildPrivacySafeXlsxPilotEvidence(
  inputs: readonly [XlsxPilotEvidenceInput] | readonly [XlsxPilotEvidenceInput, XlsxPilotEvidenceInput],
): XlsxPilotPrivacySafeEvidenceReport {
  const first = safeFileSummary(inputs[0], "file-1");
  const files = [first.summary];
  let overlap: XlsxPilotOverlapSummary | undefined;

  if (inputs.length === 2) {
    const second = safeFileSummary(inputs[1], "file-2");
    files.push(second.summary);
    overlap = overlapSummary(
      first.rows,
      second.rows,
      first.summary.parse.ok && second.summary.parse.ok,
    );
  }

  return {
    version: XLSX_PILOT_EVIDENCE_VERSION,
    privacy: {
      rawRowsIncluded: false,
      realFileNamesIncluded: false,
      amountsIncluded: false,
      descriptionsIncluded: false,
      accountIdentifiersIncluded: false,
      perRowFingerprintsIncluded: false,
    },
    files,
    overlap,
  };
}
