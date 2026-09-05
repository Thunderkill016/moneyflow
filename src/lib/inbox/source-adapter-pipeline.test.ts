import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateToInsertRow,
  prepareCandidateForServer,
} from "./inbox-map.ts";
import {
  toCsvCandidateInputs,
  type ParsedCsvRow,
} from "./parse-csv.ts";
import { sourceAdapterRowToParsedCsvRow } from "./source-adapter-bridge.ts";
import {
  canonicalizeSourceExternalId,
  type NormalizedSourceAdapterRow,
} from "./source-adapter.ts";

const accountScope = {
  kind: "account" as const,
  institutionKey: "example-bank",
  accountKey: "opaque-account-a",
  accountKeyPersistence: "safe" as const,
};

function sourceId(value: string): string {
  const result = canonicalizeSourceExternalId({
    value,
    evidence: "confirmed",
    stability: "source-stable",
    scope: accountScope,
  });
  assert.ok(result);
  return result;
}

test("accepted adapter evidence survives adapter bridge through DB insert payload", () => {
  const current = sourceId("posted-123");
  const predecessor = sourceId("pending-123");
  const adapted: NormalizedSourceAdapterRow = {
    kind: "expense",
    amount: 120_000,
    merchant: "Synthetic Merchant",
    note: "",
    occurredOn: "2026-09-05",
    confidence: "high",
    rawSnippet: "synthetic structural fixture",
    sourceRowIndex: 17,
    sourceExternalId: current,
    sourceLifecycleState: "posted",
    sourcePredecessorExternalId: predecessor,
    parserVersion: "example-bank-xlsx@1.0",
    mappingVersion: 1,
    findings: [],
  };
  const parsed = sourceAdapterRowToParsedCsvRow(adapted);

  const [input] = toCsvCandidateInputs(
    [parsed],
    "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "xlsx",
  );
  assert.ok(input);

  const prepared = prepareCandidateForServer(input);
  const row = candidateToInsertRow(prepared, "user-1");

  assert.equal(parsed.rowIndex, 17);
  assert.equal(row.source_row_index, 17);
  assert.equal(row.source_external_id, current);
  assert.equal(row.source_lifecycle_state, "posted");
  assert.equal(row.source_predecessor_external_id, predecessor);
  assert.equal(row.parser_version, "example-bank-xlsx@1.0");
  assert.equal(row.mapping_version, 1);
  assert.equal(row.status, "pending");
});

test("adapter findings become review evidence without creating financial authority", () => {
  const parsed = sourceAdapterRowToParsedCsvRow({
    kind: "expense",
    amount: 90_000,
    merchant: "Synthetic Merchant",
    note: "",
    occurredOn: "2026-09-05",
    confidence: "medium",
    rawSnippet: "synthetic",
    sourceRowIndex: 4,
    parserVersion: "example@1.0",
    mappingVersion: 1,
    findings: [
      { field: "direction", code: "review_direction", message: "Review direction" },
      { field: "identity", code: "no_stable_id", message: "No stable ID" },
    ],
  });

  assert.deepEqual(parsed.uncertainFields, ["kind"]);
  assert.deepEqual(parsed.explanations, ["Review direction", "No stable ID"]);
  assert.equal(parsed.sourceExternalId, undefined);
});

test("row order changes cannot change or invent stable source identity", () => {
  const stable = sourceId("txn-777");
  const base: Omit<ParsedCsvRow, "rowIndex" | "sourceRowIndex"> = {
    kind: "income",
    amount: 1_000_000,
    merchant: "Synthetic Income",
    note: "",
    occurredOn: "2026-09-04",
    confidence: "high",
    uncertainFields: [],
    explanations: [],
    rawSnippet: "synthetic",
    sourceExternalId: stable,
    parserVersion: "example-bank-xlsx@1.0",
    mappingVersion: 1,
  };

  const first = toCsvCandidateInputs(
    [{ ...base, rowIndex: 2, sourceRowIndex: 2 }],
    "batch-a",
    "xlsx",
  )[0];
  const reordered = toCsvCandidateInputs(
    [{ ...base, rowIndex: 99, sourceRowIndex: 99 }],
    "batch-b",
    "xlsx",
  )[0];

  assert.equal(first?.sourceExternalId, stable);
  assert.equal(reordered?.sourceExternalId, stable);
  assert.notEqual(first?.sourceRowIndex, reordered?.sourceRowIndex);
});

test("generic no-id rows remain heuristic candidates without synthetic identity", () => {
  const parsed: ParsedCsvRow = {
    kind: "expense",
    amount: 45_000,
    merchant: "Generic CSV",
    note: "",
    occurredOn: "2026-09-03",
    confidence: "medium",
    uncertainFields: ["kind"],
    explanations: ["review"],
    rawSnippet: "generic",
    rowIndex: 3,
  };

  const [input] = toCsvCandidateInputs([parsed], "batch-generic", "csv");
  assert.equal(input?.sourceExternalId, undefined);
  assert.equal(input?.sourceRowIndex, 3);

  const prepared = prepareCandidateForServer(input!);
  const row = candidateToInsertRow(prepared, "user-1");
  assert.equal(row.source_external_id, null);
  assert.equal(row.source_lifecycle_state, null);
  assert.equal(row.source_predecessor_external_id, null);
});
