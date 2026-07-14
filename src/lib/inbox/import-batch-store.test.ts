import assert from "node:assert/strict";
import test from "node:test";
import {
  createImportBatch,
  formatImportBatchDateShort,
  formatImportBatchStats,
  getStoredImportBatch,
  importBatchSourceLabel,
  importBatchStatusLabel,
  isImportBatch,
  markImportBatchCancelled,
  markImportBatchCommitted,
  sortImportBatchesNewestFirst,
  upsertImportBatch,
  writeStoredImportBatches,
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

test("importBatchStatusLabel Vietnamese", () => {
  assert.equal(importBatchStatusLabel("parsed"), "Chờ xác nhận");
  assert.equal(importBatchStatusLabel("committed"), "Đã vào Inbox");
  assert.equal(importBatchStatusLabel("cancelled"), "Đã hủy");
});

test("importBatchSourceLabel", () => {
  assert.equal(importBatchSourceLabel("csv"), "CSV");
  assert.equal(importBatchSourceLabel("xlsx"), "Excel");
  assert.equal(importBatchSourceLabel("pdf"), "PDF");
  assert.equal(importBatchSourceLabel("paste"), "Dán text");
});

test("formatImportBatchDateShort formats local day/month", () => {
  assert.equal(formatImportBatchDateShort("not-a-date"), "—");
  const short = formatImportBatchDateShort("2026-07-14T12:00:00.000Z");
  assert.match(short, /^\d{2}\/\d{2}$/);
});

test("formatImportBatchStats wireframe-style", () => {
  assert.equal(
    formatImportBatchStats({
      rowCount: 120,
      warningCount: 4,
      skippedRows: 0,
      status: "committed",
    }),
    "120 dòng · 4 lỗi",
  );
  assert.equal(
    formatImportBatchStats({
      rowCount: 3,
      warningCount: 0,
      skippedRows: 2,
      status: "parsed",
    }),
    "3 dòng · 0 lỗi · bỏ 2",
  );
  assert.equal(
    formatImportBatchStats({
      rowCount: 0,
      warningCount: 0,
      skippedRows: 0,
      status: "cancelled",
    }),
    "Đã hủy",
  );
});

test("sortImportBatchesNewestFirst", () => {
  const older = createImportBatch({
    id: "imp-old",
    fileName: "old.csv",
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
    createdAt: "2026-07-01T00:00:00.000Z",
  });
  const newer = createImportBatch({
    id: "imp-new",
    fileName: "new.csv",
    source: "csv",
    rowCount: 2,
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
    createdAt: "2026-07-14T00:00:00.000Z",
  });
  const sorted = sortImportBatchesNewestFirst([older, newer]);
  assert.equal(sorted[0]?.id, "imp-new");
  assert.equal(sorted[1]?.id, "imp-old");
});

test("get / commit / cancel batch in memory storage helpers", () => {
  // jsdom-less node tests: storage APIs no-op without window; pure create still works.
  const a = createImportBatch({
    id: "imp-storage",
    fileName: "b.csv",
    source: "csv",
    rowCount: 2,
    warningCount: 1,
    mapConfidence: 0.8,
    headers: ["Date", "Amount"],
    columnMap: {
      date: 0,
      amount: 1,
      desc: null,
      debit: null,
      credit: null,
    },
  });
  assert.equal(a.status, "parsed");
  // Without window, get/mark return empty/null — ensure no throw
  assert.equal(getStoredImportBatch("imp-storage"), null);
  assert.equal(markImportBatchCommitted("missing"), null);
  assert.equal(markImportBatchCancelled("missing"), null);
  writeStoredImportBatches([]);
});
