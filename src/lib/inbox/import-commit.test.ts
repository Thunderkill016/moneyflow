import assert from "node:assert/strict";
import test from "node:test";
import {
  IMPORT_COMMIT_INTENT_VERSION,
  serializeImportCommitIntent,
} from "./import-commit.ts";

const batchId = "63010000-0000-4000-8000-000000000001";

function candidateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "63020000-0000-4000-8000-000000000001",
    user_id: "63000000-0000-4000-8000-000000000001",
    kind: "expense",
    amount_minor: 45_000,
    merchant: "Highlands",
    note: "",
    occurred_on: "2026-09-09",
    source: "csv",
    confidence: "high",
    status: "pending",
    possible_duplicate: false,
    category_id: null,
    category_name: null,
    account_id: null,
    account_name: null,
    raw_snippet: "09/09/2026 | Highlands | -45000",
    import_batch_id: batchId,
    local_id: null,
    source_row_index: 1,
    source_external_id: null,
    source_lifecycle_state: null,
    source_predecessor_external_id: null,
    parser_version: "csv_import@1.0",
    mapping_version: 1,
    created_at: "2026-09-09T09:00:00.000Z",
    ...overrides,
  };
}

test("commit intent has an explicit contract version", () => {
  const parsed = JSON.parse(serializeImportCommitIntent(batchId, [candidateRow()]));
  assert.equal(parsed.version, IMPORT_COMMIT_INTENT_VERSION);
  assert.equal(parsed.batch_id, batchId);
});

test("generated ids, user ids, local ids and timestamps do not change retry intent", () => {
  const first = serializeImportCommitIntent(batchId, [candidateRow()]);
  const replay = serializeImportCommitIntent(batchId, [
    candidateRow({
      id: "63020000-0000-4000-8000-000000000099",
      user_id: "63000000-0000-4000-8000-000000000099",
      local_id: "client-local-id",
      created_at: "2026-09-09T10:00:00.000Z",
    }),
  ]);
  assert.equal(replay, first);
});

test("financial or provenance changes produce a different retry intent", () => {
  const first = serializeImportCommitIntent(batchId, [candidateRow()]);
  assert.notEqual(
    serializeImportCommitIntent(batchId, [candidateRow({ amount_minor: 46_000 })]),
    first,
  );
  assert.notEqual(
    serializeImportCommitIntent(batchId, [candidateRow({ source_row_index: 2 })]),
    first,
  );
});

test("candidate source order remains part of the intent", () => {
  const firstRow = candidateRow({ source_row_index: 1, amount_minor: 10_000 });
  const secondRow = candidateRow({ source_row_index: 2, amount_minor: 20_000 });
  assert.notEqual(
    serializeImportCommitIntent(batchId, [firstRow, secondRow]),
    serializeImportCommitIntent(batchId, [secondRow, firstRow]),
  );
});

test("batch identity is part of the retry intent", () => {
  const first = serializeImportCommitIntent(batchId, [candidateRow()]);
  assert.notEqual(
    serializeImportCommitIntent(
      "63010000-0000-4000-8000-000000000002",
      [candidateRow()],
    ),
    first,
  );
});
