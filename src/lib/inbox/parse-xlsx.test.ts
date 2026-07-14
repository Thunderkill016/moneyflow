import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as XLSX from "xlsx";
import { toCsvCandidateInputs } from "./parse-csv.ts";
import {
  isExcelUpload,
  parseXlsxStatement,
  workbookFirstSheetToMatrix,
  xlsxCellToString,
} from "./parse-xlsx.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("xlsxCellToString: numbers, dates, empty", () => {
  assert.equal(xlsxCellToString(null), "");
  assert.equal(xlsxCellToString(undefined), "");
  assert.equal(xlsxCellToString(45_000), "45000");
  assert.equal(xlsxCellToString("  Highlands  "), "Highlands");
  assert.equal(xlsxCellToString(true), "TRUE");
  assert.equal(
    xlsxCellToString(new Date(2026, 6, 12)),
    "2026-07-12",
  );
});

test("fixture sample-bank.xlsx → first sheet only, integer money", () => {
  const buf = readFileSync(join(fixturesDir, "sample-bank.xlsx"));
  const result = parseXlsxStatement(buf, {
    fileName: "sample-bank.xlsx",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0]?.amount, 45_000);
  assert.equal(result.rows[0]?.kind, "expense");
  assert.equal(result.rows[0]?.occurredOn, "2026-07-12");
  assert.ok(result.rows[0]?.merchant.toLowerCase().includes("highlands"));
  assert.equal(result.rows[1]?.amount, 25_000_000);
  assert.equal(result.rows[1]?.kind, "income");
  assert.equal(result.rows[2]?.amount, 89_000);
  assert.equal(result.rows[3]?.kind, "transfer");
  assert.ok(
    result.rows.every((r) => Number.isSafeInteger(r.amount) && r.amount > 0),
  );
});

test("first sheet only — second sheet ignored", () => {
  const wb = XLSX.utils.book_new();
  const sheetA = XLSX.utils.aoa_to_sheet([
    ["Ngày", "Mô tả", "Số tiền"],
    ["12/07/2026", "Cafe A", -50_000],
  ]);
  const sheetB = XLSX.utils.aoa_to_sheet([
    ["Ngày", "Mô tả", "Số tiền"],
    ["01/01/2020", "SHOULD NOT PARSE", -9_999_999],
  ]);
  XLSX.utils.book_append_sheet(wb, sheetA, "First");
  XLSX.utils.book_append_sheet(wb, sheetB, "Second");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const result = parseXlsxStatement(buf, {
    fileName: "two-sheets.xlsx",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.amount, 50_000);
  assert.ok(result.rows[0]?.merchant.toLowerCase().includes("cafe"));

  const extracted = workbookFirstSheetToMatrix(wb, 0);
  assert.ok(!("error" in extracted));
  if (!("error" in extracted)) {
    assert.equal(extracted.sheetName, "First");
  }
});

test("empty / corrupt buffer → error", () => {
  const empty = parseXlsxStatement(new Uint8Array(0), {
    fileName: "empty.xlsx",
  });
  assert.equal(empty.ok, false);
  assert.match(empty.error ?? "", /trống|không đọc/i);

  const garbage = parseXlsxStatement(new Uint8Array([1, 2, 3, 4, 5]), {
    fileName: "bad.xlsx",
  });
  assert.equal(garbage.ok, false);
});

test("toCsvCandidateInputs source xlsx", () => {
  const buf = readFileSync(join(fixturesDir, "sample-bank.xlsx"));
  const result = parseXlsxStatement(buf, { today: "2026-07-15" });
  const inputs = toCsvCandidateInputs(result.rows, "imp-xlsx-1", "xlsx");
  assert.equal(inputs.length, result.rows.length);
  assert.ok(inputs.every((i) => i.source === "xlsx"));
  assert.ok(inputs.every((i) => i.importBatchId === "imp-xlsx-1"));
});

test("isExcelUpload", () => {
  assert.equal(isExcelUpload({ name: "a.xlsx" }), true);
  assert.equal(isExcelUpload({ name: "a.xls" }), true);
  assert.equal(isExcelUpload({ name: "a.csv" }), false);
  assert.equal(
    isExcelUpload({
      name: "blob",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    true,
  );
});
