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

test("pilot parser skips a high-confidence Excel preamble and preserves worksheet row numbers", () => {
  const bytes = workbookBytes([
    ["Sao kê tài khoản thử nghiệm"],
    [],
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
  assert.equal(result.rows[0]!.rowIndex, 5);
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 125000);
  assert.equal(result.rows[0]!.occurredOn, "2026-09-10");
  assert.equal(result.rows[1]!.rowIndex, 6);
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 50000);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.sheetNumber, 1);
  assert.equal(inspection.candidateHeaderRow, 4);
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

test("public VCB-style statement uses standalone change sign for direction", () => {
  const bytes = workbookBytes([
    ["SAO KÊ TÀI KHOẢN"],
    ["Ngày thực hiện: 26/10/2019"],
    ["Số dư đầu kỳ", 3700511],
    ["Ngày giao dịch", "Số tham chiếu", "Thay đổi", "Số tiền", "Mô tả"],
    ["25/10/2019", "DD4400 - 046045", "+", 332, "GIAO DICH TRA LAI TU DONG"],
    ["25/10/2019", "9713 - 0045853", "-", 24173, "POS SAMPLE"],
    ["26/10/2019", "9401 - 0001000000", "-", 2300, "THU PHI DICH VU MAU"],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "vcb-public-shape.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0]!.rowIndex, 5);
  assert.equal(result.rows[0]!.amount, 332);
  assert.equal(result.rows[0]!.kind, "income");
  assert.equal(result.rows[0]!.occurredOn, "2019-10-25");
  assert.equal(result.rows[0]!.uncertainFields.includes("kind"), false);
  assert.equal(result.rows[1]!.amount, 24173);
  assert.equal(result.rows[1]!.kind, "expense");
  assert.equal(result.rows[1]!.occurredOn, "2019-10-25");
  assert.equal(result.rows[1]!.uncertainFields.includes("kind"), false);
  assert.equal(result.rows[2]!.rowIndex, 7);
  assert.equal(result.rows[2]!.amount, 2300);
  assert.equal(result.rows[2]!.kind, "expense");
  assert.equal(result.rows[2]!.uncertainFields.includes("kind"), false);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.candidateHeaderRow, 4);
  assert.deepEqual(inspection.columnMap, {
    date: 0,
    amount: 3,
    desc: 4,
    debit: null,
    credit: null,
  });
});

test("reference hyphens are not inferred as financial direction", () => {
  const bytes = workbookBytes([
    ["Ngày giao dịch", "Số tham chiếu", "Số tiền", "Mô tả"],
    ["25/10/2019", "9713 - 0045853", 24173, "POS SAMPLE"],
  ]);

  const { result } = parseXlsxPilotStatement(bytes, {
    fileName: "reference-hyphen.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.uncertainFields.includes("kind"), true);
});

test("public ACB-style statement prefers transaction date over effective date", () => {
  const bytes = workbookBytes([
    ["SAO KÊ TÀI KHOẢN"],
    ["Thời gian sao kê", "05 / 2026"],
    [
      "Ngày hiệu lực",
      "Ngày giao dịch",
      "Số GD",
      "Nội dung giao dịch",
      "Ghi nợ",
      "Ghi có",
      "Số dư",
    ],
    [
      "04/05/2026",
      "02/05/2026 14:31:00",
      "9462",
      "Thanh toán mẫu",
      34060,
      "",
      288000,
    ],
    [
      "05/05/2026",
      "05/05/2026 09:15:00",
      "9463",
      "Hoàn tiền mẫu",
      "",
      50000,
      338000,
    ],
    [
      "06/05/2026",
      "06/05/2026 08:00:00",
      "9464",
      "THU PHI DICH VU MAU",
      15000,
      "",
      323000,
    ],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "acb-public-shape.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 3);
  assert.equal(result.columnMap.date, 1);
  assert.equal(result.rows[0]!.rowIndex, 4);
  assert.equal(result.rows[0]!.occurredOn, "2026-05-02");
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 34060);
  assert.equal(result.rows[1]!.occurredOn, "2026-05-05");
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 50000);
  assert.equal(result.rows[2]!.occurredOn, "2026-05-06");
  assert.equal(result.rows[2]!.kind, "expense");
  assert.equal(result.rows[2]!.amount, 15000);
  assert.equal(result.rows[2]!.uncertainFields.includes("kind"), false);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.candidateHeaderRow, 3);
  assert.deepEqual(inspection.columnMap, {
    date: 1,
    amount: null,
    desc: 3,
    debit: 4,
    credit: 5,
  });
});

test("public VietinBank eFAST-style bilingual statement uses debit/credit and transaction date roles", () => {
  const bytes = workbookBytes([
    ["LỊCH SỬ GIAO DỊCH - TRANSACTION HISTORY"],
    ["VietinBank eFAST"],
    ["2. Chi tiết lịch sử giao dịch/ Transaction history detail"],
    [
      "STT/ No",
      "Ngày hạch toán/ Accounting date",
      "Nợ/ Debit",
      "Có/ Credit",
      "Số dư TK/ Account Balance",
      "Số giao dịch/ Transaction number",
      "Số tài khoản đối ứng/ Corresponsive account",
      "Tên tài khoản đối ứng/ Corresponsive name",
      "Mã định danh TK thụ hưởng/ To virtual account",
      "Mô tả giao dịch/ Transaction description",
      "Ngày phát sinh giao dịch/ Transaction date",
    ],
    [
      1,
      "31-03-2026 23:06:16",
      300,
      0,
      834051,
      "1944",
      "",
      "",
      "",
      "VAT",
      "30-03-2026 23:06:16",
    ],
    [
      2,
      "31-03-2026 01:46:59",
      0,
      151,
      837351,
      "1942",
      "",
      "",
      "",
      "Tra lai tai khoan DDA",
      "31-03-2026 01:46:59",
    ],
    [
      3,
      "31-03-2026 23:06:16",
      3000,
      0,
      834351,
      "1943",
      "",
      "",
      "",
      "FEE-DLY: Service Fees",
      "31-03-2026 23:06:16",
    ],
  ]);

  const { result, inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "vietinbank-public-shape.xlsx",
    today: "2026-09-11",
  });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.columnMap, {
    date: 10,
    amount: null,
    desc: 9,
    debit: 2,
    credit: 3,
  });
  assert.equal(result.rows[0]!.occurredOn, "2026-03-30");
  assert.equal(result.rows[0]!.kind, "expense");
  assert.equal(result.rows[0]!.amount, 300);
  assert.equal(result.rows[1]!.occurredOn, "2026-03-31");
  assert.equal(result.rows[1]!.kind, "income");
  assert.equal(result.rows[1]!.amount, 151);
  assert.equal(result.rows[2]!.kind, "expense");
  assert.equal(result.rows[2]!.amount, 3000);
  assert.equal(result.rows[2]!.uncertainFields.includes("kind"), false);

  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.candidateHeaderRow, 4);
  assert.deepEqual(inspection.columnMap, result.columnMap);
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
  const bytes = new TextEncoder().encode(
    "Ngay,Noi dung,So tien\n10/09/2026,Mau,1000",
  );
  const { inspection } = parseXlsxPilotStatement(bytes, {
    fileName: "not-really.xlsx",
    today: "2026-09-11",
  });

  assert.deepEqual(inspection, {
    ok: false,
    reason: "unreadable_excel_evidence",
  });
});
