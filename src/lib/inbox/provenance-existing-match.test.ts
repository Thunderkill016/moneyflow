import assert from "node:assert/strict";
import test from "node:test";
import {
  allowsExplicitDuplicateOverride,
  dryRunUserMessage,
  parseInboxDryRunResult,
} from "./provenance.ts";

test("parses a unique existing-transaction review plan", () => {
  const transactionId = "43600000-0000-4000-8000-000000000099";
  const result = parseInboxDryRunResult({
    status: "duplicate",
    reason: "existing_transaction_match",
    confidence: 0.7,
    matched_transaction_id: transactionId,
  });

  assert.equal(result.status, "duplicate");
  assert.equal(result.reason, "existing_transaction_match");
  assert.equal(result.matchedTransactionId, transactionId);
  assert.equal(allowsExplicitDuplicateOverride(result), true);
  assert.match(dryRunUserMessage(result), /gắn nguồn/i);
  assert.match(dryRunUserMessage(result), /không sửa dữ liệu trong sổ/i);
});

test("ambiguous existing matches never expose a target", () => {
  const result = parseInboxDryRunResult({
    status: "duplicate",
    reason: "existing_transaction_ambiguous",
    confidence: 0.4,
  });

  assert.equal(result.matchedTransactionId, undefined);
  assert.equal(allowsExplicitDuplicateOverride(result), true);
  assert.match(dryRunUserMessage(result), /nhiều giao dịch/i);
  assert.match(dryRunUserMessage(result), /không tự chọn/i);
});

test("hard exact-source duplicate never exposes the separate-transaction override", () => {
  const result = parseInboxDryRunResult({
    status: "duplicate",
    reason: "source_external_id_match",
    confidence: 1,
    matched_transaction_id: "43600000-0000-4000-8000-000000000098",
  });

  assert.equal(allowsExplicitDuplicateOverride(result), false);
  assert.match(dryRunUserMessage(result), /cùng mã nguồn/i);
});

test("already-approved candidate never exposes the separate-transaction override", () => {
  const result = parseInboxDryRunResult({
    status: "duplicate",
    reason: "already_approved",
    confidence: 1,
    matched_transaction_id: "43600000-0000-4000-8000-000000000097",
  });

  assert.equal(allowsExplicitDuplicateOverride(result), false);
});
