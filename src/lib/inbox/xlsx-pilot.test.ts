import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  findLikelyXlsxHeaderRow,
  parseXlsxPilotStatement,
} from "./xlsx-pilot.ts";

function workbookBytes(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Private account sheet");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

test("pilot parser skips a high-confidence Excel preamble without inventing bank semantics", () => {
  const bytes = workbookBytes([
    ["Sao kê tài khoản thử nghiệm"],
    ["Khoảng thời gian thử nghiệm"],
    ["Ngày", "Nội dung", "Ghi nợ", "Ghi có"],
    ["10/09/2026", "Mua hàng mẫu", 125000, ""],
    ["11/09/2026", "Hoàn tiền mẫu", "", 50000],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "sample.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.headers, ["Ngày", "Nội dung", "Ghi nợ", "Ghi có"]);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]!.rowIndex, 4);
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 125000);
  assert.equal(result.rows[0]!.occurredOn, "2026-09-10");
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 50000);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.sheetNumber, 1);
  assert.equal(inspection.candidateHeaderRow, 3);
  assert.equal(inspection.mapConfidence, 1);
  assert.deepEqual(inspection.columnMap, {
    date: 0,
    amount: null,
    desc: 1,
    debit: 2,
    credit: 3,
  });
  assert.deepEqual(inspection.numericColumns, [2, 3]);
  assert.ok(inspection.unknowns.includes("source_reference_stability_unknown"));

  const serialized = JSON.stringify(inspection);
  assert.doesNotMatch(serialized, /Private account sheet/);
  assert.doesNotMatch(serialized, /Sao kê tài khoản thử nghiệm/);
  assert.doesNotMatch(serialized, /Mua hàng mẫu/);
  assert.doesNotMatch(serialized, /125000/);
});

test("header detection stays off when generic column roles are not proven", () => {
  const candidate = findLikelyXlsxHeaderRow([
    ["Báo cáo mẫu"],
    ["Trường A", "Trường B", "Trường C"],
    ["x", "y", "z"],
  ]);

  assert.equal(candidate, null);
});

test("non-Excel bytes do not become trusted pilot evidence", () => {
  const bytes = new TextEncoder().encode("Ngay,Noi dung,So tien\n10/09/2026,Mau,1000");
  const { inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "not-really.xlsx",
    today: "2026-09-11",
  });

  assert.deepEqual(inspection, {
    ok: false,
    reason: "unreadable_excel_evidence",
  });
});
