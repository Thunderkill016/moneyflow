import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { parseXlsxPilotStatement } from "./xlsx-pilot.ts";

function workbookBytes(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Synthetic statement");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

test("observed debit/credit amount headers map to generic debit/credit roles", () => {
  const bytes = workbookBytes([
    ["SAO KÊ TÀI KHOẢN"],
    ["Ngày giao dịch", "Số tham chiếu", "Số tiền ghi nợ", "Số tiền ghi có", "Mô tả"],
    ["25/11/2025", "9432 - 00001", 22000, "", "Phí mẫu"],
    ["25/11/2025", "9733 - 00002", "", 1409751, "Lãi mẫu"],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "synthetic-vcb-shape.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.columnMap, {
    date: 0,
    amount: null,
    desc: 4,
    debit: 2,
    credit: 3,
  });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 22000);
  assert.equal(result.rows[0]!.occurredOn, "2025-11-25");
  assert.equal(result.rows[0]!.sourceExternalId, undefined);
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 1409751);
  assert.equal(result.rows[1]!.occurredOn, "2025-11-25");
  assert.equal(result.rows[1]!.sourceExternalId, undefined);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.candidateHeaderRow, 2);
  assert.deepEqual(inspection.columnMap, result.columnMap);
});
