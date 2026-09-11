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

test("observed withdraw/deposit headers map to generic debit/credit roles", () => {
  const bytes = workbookBytes([
    ["SAO KÊ TÀI KHOẢN"],
    [
      "Ngày",
      "Số GD",
      "Nội dung giao dịch",
      "Số tiền rút ra",
      "Số tiền gửi vào",
      "Số dư",
    ],
    ["05/09/2026", "1001", "Thanh toán mẫu", 125000, "", 875000],
    ["06/09/2026", "1002", "Hoàn tiền mẫu", "", 50000, 925000],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "synthetic-acb-shape.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.columnMap, {
    date: 0,
    amount: null,
    desc: 2,
    debit: 3,
    credit: 4,
  });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 125000);
  assert.equal(result.rows[0]!.occurredOn, "2026-09-05");
  assert.equal(result.rows[0]!.uncertainFields.includes("kind"), false);
  assert.equal(result.rows[0]!.sourceExternalId, undefined);
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 50000);
  assert.equal(result.rows[1]!.occurredOn, "2026-09-06");
  assert.equal(result.rows[1]!.uncertainFields.includes("kind"), false);
  assert.equal(result.rows[1]!.sourceExternalId, undefined);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.candidateHeaderRow, 2);
  assert.deepEqual(inspection.columnMap, result.columnMap);
});
