import assert from "node:assert/strict";
import test from "node:test";
import {
  formatImportBatchMaintenanceEvidence,
  isImportBatch,
  type ImportBatch,
} from "./import-batch-store.ts";

const base: ImportBatch = {
  id: "imp-measurement",
  fileName: "statement.csv",
  source: "csv",
  status: "committed",
  rowCount: 2,
  warningCount: 0,
  skippedRows: 0,
  mapConfidence: 1,
  headers: ["date", "amount"],
  columnMap: {
    date: 0,
    amount: 1,
    desc: null,
    debit: null,
    credit: null,
  },
  createdAt: "2026-09-09T00:00:00.000Z",
};

test("maintenance evidence stays quiet when no attempt was observed", () => {
  assert.equal(formatImportBatchMaintenanceEvidence(base), null);
  assert.equal(
    formatImportBatchMaintenanceEvidence({
      ...base,
      commitAttemptCount: 0,
      commitReplayCount: 0,
    }),
    null,
  );
});

test("maintenance evidence reports counts without financial payload", () => {
  assert.equal(
    formatImportBatchMaintenanceEvidence({
      ...base,
      commitAttemptCount: 2,
      commitReplayCount: 1,
    }),
    "gửi 2 lần · 1 lần đối chiếu lại",
  );
});

test("batch validation accepts historical missing counters but rejects impossible replay order", () => {
  assert.equal(isImportBatch(base), true);
  assert.equal(
    isImportBatch({
      ...base,
      commitAttemptCount: 1,
      commitReplayCount: 2,
    }),
    false,
  );
});
