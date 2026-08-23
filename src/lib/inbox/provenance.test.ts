import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_IMPORT_MAPPING_VERSION,
  batchProvenanceFromRow,
  candidateProvenanceFromRow,
  candidateProvenanceInsertPatch,
  dryRunUserMessage,
  parseInboxDryRunResult,
  parserVersionForSource,
} from "./provenance.ts";

test("parserVersionForSource is deterministic for current capture sources", () => {
  assert.equal(parserVersionForSource("csv"), "csv_import@1.0");
  assert.equal(parserVersionForSource("paste"), "paste_text@1.0");
});

test("candidate provenance maps nullable Supabase fields without inventing data", () => {
  assert.deepEqual(
    candidateProvenanceFromRow({
      source_row_index: 7,
      source_external_id: "bank-7",
      fingerprint_version: 1,
      fingerprint: "abc",
      parser_version: "csv_import@2.0",
      mapping_version: 2,
      match_status: "duplicate",
      match_reason: "fingerprint_transaction_match",
      match_confidence: 0.85,
      possible_transfer: false,
      transfer_pair_id: null,
      approved_transaction_id: null,
      approved_at: null,
      applied_rule_id: null,
      applied_rule_version: null,
    }),
    {
      sourceRowIndex: 7,
      sourceExternalId: "bank-7",
      sourceLifecycleState: undefined,
      sourcePredecessorExternalId: undefined,
      fingerprintVersion: 1,
      fingerprint: "abc",
      parserVersion: "csv_import@2.0",
      mappingVersion: 2,
      matchStatus: "duplicate",
      matchReason: "fingerprint_transaction_match",
      matchConfidence: 0.85,
      possibleTransfer: undefined,
      transferPairId: undefined,
      approvedTransactionId: undefined,
      approvedAt: undefined,
      appliedRuleId: undefined,
      appliedRuleVersion: undefined,
    },
  );
});

test("candidate provenance retains a concrete applied rule revision", () => {
  assert.deepEqual(
    candidateProvenanceFromRow({
      applied_rule_id: "26410000-0000-4000-8000-000000000001",
      applied_rule_version: "4",
    }),
    {
      sourceRowIndex: undefined,
      sourceExternalId: undefined,
      sourceLifecycleState: undefined,
      sourcePredecessorExternalId: undefined,
      fingerprintVersion: undefined,
      fingerprint: undefined,
      parserVersion: undefined,
      mappingVersion: undefined,
      matchStatus: undefined,
      matchReason: undefined,
      matchConfidence: undefined,
      possibleTransfer: undefined,
      transferPairId: undefined,
      approvedTransactionId: undefined,
      approvedAt: undefined,
      appliedRuleId: "26410000-0000-4000-8000-000000000001",
      appliedRuleVersion: 4,
    },
  );
});

test("batch provenance keeps unknown historical versions unknown", () => {
  assert.deepEqual(
    batchProvenanceFromRow({ parser_version: null, mapping_version: null }),
    { parserVersion: undefined, mappingVersion: undefined },
  );
});

test("candidate insert patch provides current explicit parser/mapping defaults", () => {
  const patch = candidateProvenanceInsertPatch({
    kind: "expense",
    amount: 45_000,
    merchant: "Cafe",
    occurredOn: "2026-08-01",
    source: "csv",
    confidence: "high",
    sourceRowIndex: 3,
  });
  assert.deepEqual(patch, {
    source_row_index: 3,
    source_external_id: null,
    source_lifecycle_state: null,
    source_predecessor_external_id: null,
    parser_version: "csv_import@1.0",
    mapping_version: CURRENT_IMPORT_MAPPING_VERSION,
  });
});

test("candidate insert patch emits rule columns only for a complete evidence pair", () => {
  const patch = candidateProvenanceInsertPatch({
    kind: "expense",
    amount: 45_000,
    merchant: "Cafe",
    occurredOn: "2026-08-01",
    source: "paste",
    confidence: "high",
    appliedRuleId: "26410000-0000-4000-8000-000000000001",
    appliedRuleVersion: 4,
  });
  assert.equal(patch.applied_rule_id, "26410000-0000-4000-8000-000000000001");
  assert.equal(patch.applied_rule_version, 4);
});

test("parseInboxDryRunResult accepts numeric strings from JSON boundaries", () => {
  assert.deepEqual(
    parseInboxDryRunResult({
      status: "duplicate",
      reason: "source_external_id_match",
      confidence: "1",
      matched_transaction_id: "00000000-0000-4000-8000-000000000001",
    }),
    {
      status: "duplicate",
      reason: "source_external_id_match",
      confidence: 1,
      matchedCandidateId: undefined,
      matchedTransactionId: "00000000-0000-4000-8000-000000000001",
    },
  );
});

test("parseInboxDryRunResult rejects unsupported states and invalid confidence", () => {
  assert.throws(
    () => parseInboxDryRunResult({ status: "would_update", reason: "x", confidence: 1 }),
    /invalid_inbox_dry_run/,
  );
  assert.throws(
    () => parseInboxDryRunResult({ status: "duplicate", reason: "x", confidence: 2 }),
    /invalid_inbox_dry_run/,
  );
});

test("dry-run messages distinguish exact and heuristic duplicates", () => {
  assert.equal(
    dryRunUserMessage({
      status: "duplicate",
      reason: "source_external_id_match",
      confidence: 1,
    }),
    "Giao dịch này đã được nhập từ cùng mã nguồn.",
  );
  assert.match(
    dryRunUserMessage({
      status: "duplicate",
      reason: "fingerprint_transaction_match",
      confidence: 0.85,
    }),
    /rất giống/,
  );
});

test("dry-run message makes lifecycle-only source changes explicit", () => {
  assert.match(
    dryRunUserMessage({
      status: "duplicate",
      reason: "source_external_id_lifecycle_changed",
      confidence: 1,
    }),
    /trạng thái xử lý đã thay đổi/,
  );
});