import assert from "node:assert/strict";
import test from "node:test";
import {
  columnHeaderLabel,
  formatImportPreviewSummary,
  isImportDraft,
  isParsedCsvRow,
  previewDraftRows,
  pruneImportDraftMap,
} from "./import-draft-store.ts";
import type { ParsedCsvRow } from "./parse-csv.ts";

const sampleRow: ParsedCsvRow = {
  kind: "expense",
  amount: 45_000,
  merchant: "Cafe",
  note: "",
  occurredOn: "2026-07-12",
  confidence: "medium",
  uncertainFields: ["kind"],
  explanations: ["Chưa chắc chi / thu / chuyển — mặc định khoản chi."],
  rawSnippet: "2026-07-12 | Cafe | 45000",
  rowIndex: 2,
};

function draft(batchId: string, updatedAt: string) {
  return { batchId, rows: [sampleRow], updatedAt };
}

test("isParsedCsvRow accepts valid draft row", () => {
  assert.equal(isParsedCsvRow(sampleRow), true);
  assert.equal(isParsedCsvRow({ ...sampleRow, amount: 0 }), false);
  assert.equal(isParsedCsvRow({ ...sampleRow, amount: 45.5 }), false);
});

test("isImportDraft validates shape", () => {
  assert.equal(
    isImportDraft({
      batchId: "imp-1",
      rows: [sampleRow],
      updatedAt: "2026-07-15T10:00:00.000Z",
    }),
    true,
  );
  assert.equal(
    isImportDraft({
      batchId: "",
      rows: [],
      updatedAt: "2026-07-15T10:00:00.000Z",
    }),
    false,
  );
});

test("persistent import drafts obey the selected retention window", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  const map = {
    recent: draft("recent", "2026-07-20T11:00:00.000Z"),
    boundary: draft("boundary", "2026-07-13T12:00:00.000Z"),
    expired: draft("expired", "2026-07-13T11:59:59.999Z"),
  };

  assert.deepEqual(Object.keys(pruneImportDraftMap(map, "days_7", now)).sort(), [
    "boundary",
    "recent",
  ]);
  assert.deepEqual(Object.keys(pruneImportDraftMap(map, "days_30", now)).sort(), [
    "boundary",
    "expired",
    "recent",
  ]);
});

test("session-only retention removes every persistent draft", () => {
  const map = {
    recent: draft("recent", "2026-07-20T11:00:00.000Z"),
  };
  assert.deepEqual(
    pruneImportDraftMap(map, "delete_now", new Date("2026-07-20T12:00:00.000Z")),
    {},
  );
});

test("previewDraftRows caps at limit", () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({
    ...sampleRow,
    rowIndex: i + 2,
    merchant: `M${i}`,
  }));
  assert.equal(previewDraftRows(rows, 10).length, 10);
  assert.equal(previewDraftRows(rows, 10)[0]?.merchant, "M0");
  assert.equal(previewDraftRows(rows, 0).length, 0);
});

test("formatImportPreviewSummary Vietnamese counts", () => {
  assert.equal(
    formatImportPreviewSummary({
      rowCount: 120,
      warningCount: 4,
      skippedRows: 0,
      possibleDuplicateCount: 2,
    }),
    "120 dòng · 4 ⚠ · 2 có thể trùng",
  );
  assert.equal(
    formatImportPreviewSummary({
      rowCount: 3,
      warningCount: 0,
      skippedRows: 1,
    }),
    "3 dòng · bỏ qua 1",
  );
});

test("columnHeaderLabel maps index", () => {
  assert.equal(columnHeaderLabel(["Date", "Amount"], 0), "Date");
  assert.equal(columnHeaderLabel(["Date", "Amount"], null), "—");
  assert.equal(columnHeaderLabel(["Date"], 5), "Cột 6");
});
