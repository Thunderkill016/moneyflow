import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSourceObservation,
  normalizeSourceObservations,
  type SourceObservation,
} from "./source-observation.ts";

const accountScope = {
  kind: "account" as const,
  institutionKey: "example-bank",
  accountKey: "opaque-account-a",
  accountKeyPersistence: "safe" as const,
};

function baseObservation(
  overrides: Partial<SourceObservation> = {},
): SourceObservation {
  return {
    transport: "xlsx",
    locator: { sourceRowIndex: 17, sourceSheetIndex: 0 },
    date: {
      value: "05/09/2026",
      format: "dmy-date",
      calendarSemantics: "date-only",
    },
    amount: {
      value: 120_000,
      currency: "VND",
      direction: "debit",
      amountSemantics: "absolute",
    },
    merchant: "Synthetic Merchant",
    note: "",
    rawSnippet: "synthetic structural fixture",
    parserVersion: "example-bank-xlsx@1.0",
    mappingVersion: 1,
    ...overrides,
  };
}

test("observation locator is provenance, not financial identity", () => {
  const first = normalizeSourceObservation(
    baseObservation({ locator: { sourceRowIndex: 4, sourceSheetIndex: 0 } }),
  );
  const overlappingExport = normalizeSourceObservation(
    baseObservation({ locator: { sourceRowIndex: 99, sourceSheetIndex: 2 } }),
  );

  assert.equal(first.ok, true);
  assert.equal(overlappingExport.ok, true);
  if (!first.ok || !overlappingExport.ok) return;

  assert.equal(first.candidate.sourceRowIndex, 4);
  assert.equal(overlappingExport.candidate.sourceRowIndex, 99);
  assert.equal(first.candidate.sourceExternalId, undefined);
  assert.equal(overlappingExport.candidate.sourceExternalId, undefined);
  assert.deepEqual(
    {
      kind: first.candidate.kind,
      amount: first.candidate.amount,
      merchant: first.candidate.merchant,
      occurredOn: first.candidate.occurredOn,
    },
    {
      kind: overlappingExport.candidate.kind,
      amount: overlappingExport.candidate.amount,
      merchant: overlappingExport.candidate.merchant,
      occurredOn: overlappingExport.candidate.occurredOn,
    },
  );
});

test("confirmed source-stable identity becomes namespaced source identity", () => {
  const result = normalizeSourceObservation(
    baseObservation({
      identity: {
        value: "txn-123",
        evidence: "confirmed",
        stability: "source-stable",
        scope: accountScope,
      },
      lifecycle: "posted",
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.candidate.sourceExternalId,
    "mf-src-v1|account|example-bank|opaque-account-a|txn-123",
  );
  assert.equal(result.candidate.sourceLifecycleState, "posted");
  assert.deepEqual(result.candidate.findings, []);
});

test("observed-but-unverified identity stays review evidence and cannot become sourceExternalId", () => {
  const result = normalizeSourceObservation(
    baseObservation({
      identity: {
        value: "1942",
        evidence: "observed-but-unverified",
        stability: "source-stable",
        scope: accountScope,
      },
      lifecycle: "posted",
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.candidate.sourceExternalId, undefined);
  assert.equal(result.candidate.sourceLifecycleState, undefined);
  assert.deepEqual(
    result.candidate.findings.map((finding) => finding.code),
    [
      "source_identity_not_persistable",
      "source_lifecycle_without_stable_identity",
    ],
  );
});

test("ambiguous financial semantics fail closed before candidate creation", () => {
  const badDate = normalizeSourceObservation(
    baseObservation({
      date: {
        value: "01/02/2026",
        format: "unknown",
        calendarSemantics: "date-only",
      },
    }),
  );
  assert.equal(badDate.ok, false);
  if (!badDate.ok) {
    assert.deepEqual(badDate.findings.map((finding) => finding.code), [
      "unknown_date_format",
    ]);
  }

  const badDirection = normalizeSourceObservation(
    baseObservation({
      amount: {
        value: 120_000,
        currency: "VND",
        direction: "unknown",
        amountSemantics: "absolute",
      },
    }),
  );
  assert.equal(badDirection.ok, false);
  if (!badDirection.ok) {
    assert.deepEqual(badDirection.findings.map((finding) => finding.code), [
      "ambiguous_direction",
    ]);
    assert.equal(badDirection.findings[0]?.field, "direction");
  }
});

test("removed observation requires confirmed stable identity", () => {
  const result = normalizeSourceObservation(
    baseObservation({ lifecycle: "removed" }),
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.findings.map((finding) => finding.code), [
      "source_removed_without_stable_identity",
    ]);
  }
});

test("batch normalization separates accepted candidates from rejected observations", () => {
  const { candidates, rejected } = normalizeSourceObservations([
    baseObservation(),
    baseObservation({
      locator: { sourceRowIndex: 18 },
      amount: {
        value: 10.5,
        currency: "VND",
        direction: "credit",
        amountSemantics: "absolute",
      },
    }),
  ]);

  assert.equal(candidates.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(candidates[0]?.sourceRowIndex, 17);
  assert.equal(rejected[0]?.observation.locator.sourceRowIndex, 18);
  assert.deepEqual(rejected[0]?.findings.map((finding) => finding.code), [
    "invalid_amount",
  ]);
});
