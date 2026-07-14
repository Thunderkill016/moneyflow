import assert from "node:assert/strict";
import test from "node:test";
import {
  createImportBatch,
  isImportBatch,
  upsertImportBatch,
  type ImportBatch,
} from "./import-batch-store.ts";

const valid: ImportBatch = {
  id: "imp-1",
  fileName: "MB_T06.csv",
  source: "csv",
  status: "parsed",
  rowCount: 4,
  warningCount: 1,
  skippedRows: 0,
  mapConfidence: 0.86,
  headers: ["Ngày", "Mô tả", "Số tiền"],
  columnMap: {
    date: 0,
    amount: 2,
    desc: 1,
    debit: null,
    credit: null,
  },
  createdAt: "2026-07-15T10:00:00.000Z",
};

test("isImportBatch accepts complete meta", () => {
  assert.equal(isImportBatch(valid), true);
  assert.equal(
    isImportBatch({
      ...valid,
      status: "committed",
      committedAt: "2026-07-15T10:01:00.000Z",
    }),
    true,
  );
});

test("isImportBatch rejects bad shapes", () => {
  assert.equal(isImportBatch({ ...valid, rowCount: -1 }), false);
  assert.equal(isImportBatch({ ...valid, source: "xml" }), false);
  assert.equal(isImportBatch({ ...valid, columnMap: { date: 0 } }), false);
});

test("createImportBatch defaults status parsed", () => {
  const batch = createImportBatch({
    fileName: "a.csv",
    source: "csv",
    rowCount: 2,
    warningCount: 0,
    mapConfidence: 0.5,
    headers: ["Date", "Amount"],
    columnMap: {
      date: 0,
      amount: 1,
      desc: null,
      debit: null,
      credit: null,
    },
  });
  assert.equal(batch.status, "parsed");
  assert.ok(batch.id.startsWith("imp-"));
  assert.equal(batch.skippedRows, 0);
});

test("upsertImportBatch inserts and replaces", () => {
  const a = createImportBatch({
    id: "imp-a",
    fileName: "a.csv",
    source: "csv",
    rowCount: 1,
    warningCount: 0,
    mapConfidence: 1,
    headers: ["a"],
    columnMap: {
      date: null,
      amount: null,
      desc: null,
      debit: null,
      credit: null,
    },
  });
  const list1 = upsertImportBatch([], a);
  assert.equal(list1.length, 1);
  const updated = { ...a, rowCount: 9 };
  const list2 = upsertImportBatch(list1, updated);
  assert.equal(list2.length, 1);
  assert.equal(list2[0]?.rowCount, 9);
});
