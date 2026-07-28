import assert from "node:assert/strict";
import test from "node:test";
import type { InboxCandidate } from "./candidate-store.ts";
import type { ImportBatch } from "./import-batch-store.ts";
import {
  buildMigratePayloads,
  candidatesForMigrate,
  isDemoSampleCandidate,
  isUuid,
  mapBatchRow,
  mapCandidateRow,
  prepareCandidateForServer,
  shouldMigrateLocal,
} from "./inbox-map.ts";

const candidate: InboxCandidate = {
  id: "cand-local-1",
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands",
  note: "Cafe",
  occurredOn: "2026-07-12",
  source: "paste",
  confidence: "low",
  status: "pending",
  importBatchId: "imp-local-1",
  sourceRowIndex: 7,
  createdAt: "2026-07-12T02:10:00.000Z",
};

const batch: ImportBatch = {
  id: "imp-local-1",
  fileName: "bank.csv",
  source: "csv",
  status: "committed",
  rowCount: 3,
  warningCount: 0,
  skippedRows: 0,
  mapConfidence: 0.9,
  headers: ["Date", "Amount", "Desc"],
  columnMap: { date: 0, amount: 1, desc: 2, debit: null, credit: null },
  parserVersion: "csv-v1",
  mappingVersion: "column-map-v1",
  createdAt: "2026-07-12T01:00:00.000Z",
  committedAt: "2026-07-12T01:05:00.000Z",
};

test("isUuid accepts standard UUIDs only", () => {
  assert.equal(isUuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"), true);
  assert.equal(isUuid("cand-local-1"), false);
  assert.equal(isUuid(""), false);
});

test("filters demo samples from migrate list", () => {
  assert.equal(isDemoSampleCandidate({ id: "cand-demo-1" }), true);
  assert.equal(isDemoSampleCandidate({ id: "cand-local-1" }), false);
  const list = candidatesForMigrate([
    candidate,
    { ...candidate, id: "cand-demo-2" },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.id, "cand-local-1");
});

test("shouldMigrateLocal only when server empty and local has data", () => {
  assert.equal(shouldMigrateLocal(0, 0, [candidate], [batch]), true);
  assert.equal(shouldMigrateLocal(0, 0, [], []), false);
  assert.equal(
    shouldMigrateLocal(0, 0, [{ ...candidate, id: "cand-demo-1" }], []),
    false,
  );
  assert.equal(shouldMigrateLocal(1, 0, [candidate], [batch]), false);
  assert.equal(shouldMigrateLocal(0, 2, [candidate], [batch]), false);
});

test("mapCandidateRow maps amount_minor integer money", () => {
  const mapped = mapCandidateRow({
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    kind: "expense",
    amount_minor: "89000",
    merchant: "Grab",
    note: "",
    occurred_on: "2026-07-11",
    source: "csv",
    confidence: "high",
    status: "pending",
    possible_duplicate: false,
    category_id: null,
    category_name: "Di chuyển",
    account_id: null,
    account_name: null,
    raw_snippet: null,
    import_batch_id: null,
    source_row_index: 9,
    local_id: "cand-x",
    created_at: "2026-07-11T14:22:00.000Z",
  });
  assert.equal(mapped.amount, 89_000);
  assert.equal(mapped.category, "Di chuyển");
  assert.equal(mapped.possibleDuplicate, undefined);
  assert.equal(mapped.sourceRowIndex, 9);
});

test("mapBatchRow preserves column map", () => {
  const mapped = mapBatchRow({
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    file_name: "x.csv",
    source: "csv",
    status: "parsed",
    row_count: 10,
    warning_count: 1,
    skipped_rows: 2,
    map_confidence: 0.8,
    headers: ["a", "b"],
    column_map: { date: 0, amount: 1, desc: 2, debit: null, credit: null },
    parser_version: "csv-v1",
    mapping_version: "column-map-v1",
    local_id: null,
    created_at: "2026-07-12T00:00:00.000Z",
    committed_at: null,
  });
  assert.equal(mapped.rowCount, 10);
  assert.equal(mapped.columnMap.date, 0);
  assert.equal(mapped.columnMap.amount, 1);
  assert.equal(mapped.parserVersion, "csv-v1");
  assert.equal(mapped.mappingVersion, "column-map-v1");
});

test("buildMigratePayloads remaps non-uuid ids and batch refs", () => {
  const { batchRows, candidateRows, batchIdMap } = buildMigratePayloads(
    [batch],
    [candidate],
    "user-1",
  );
  assert.equal(batchRows.length, 1);
  assert.equal(candidateRows.length, 1);
  assert.equal(batchIdMap.has("imp-local-1"), true);
  const serverBatchId = batchIdMap.get("imp-local-1")!;
  assert.equal(isUuid(serverBatchId), true);
  assert.equal(batchRows[0]?.id, serverBatchId);
  assert.equal(batchRows[0]?.local_id, "imp-local-1");
  assert.equal(candidateRows[0]?.local_id, "cand-local-1");
  assert.equal(candidateRows[0]?.import_batch_id, serverBatchId);
  assert.equal(candidateRows[0]?.amount_minor, 45_000);
  assert.equal(candidateRows[0]?.source_row_index, 7);
  assert.equal(candidateRows[0]?.user_id, "user-1");
  assert.equal(batchRows[0]?.parser_version, "csv-v1");
  assert.equal(batchRows[0]?.mapping_version, "column-map-v1");
});

test("prepareCandidateForServer assigns UUID id", () => {
  const prepared = prepareCandidateForServer({
    kind: "expense",
    amount: 12_000,
    merchant: "X",
    occurredOn: "2026-07-10",
    source: "manual",
    confidence: "high",
    importBatchId: "not-a-uuid",
  });
  assert.equal(isUuid(prepared.id), true);
  assert.equal(prepared.importBatchId, undefined);
});
