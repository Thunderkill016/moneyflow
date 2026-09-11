import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { buildPrivacySafeXlsxPilotEvidence } from "./xlsx-pilot-evidence.ts";

function workbookBytes(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "PRIVATE ACCOUNT 0123456789");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function vcbRows(preambleRows: number, rows: unknown[][]): unknown[][] {
  return [
    ["SAO KÊ TÀI KHOẢN PRIVATE 0123456789"],
    ...Array.from({ length: preambleRows }, () => []),
    ["Ngày giao dịch", "Số tham chiếu", "Thay đổi", "Số tiền", "Mô tả"],
    ...rows,
  ];
}

test("privacy-safe report excludes statement values, filenames and per-row hashes", () => {
  const bytes = workbookBytes(
    vcbRows(1, [
      ["10/09/2026", "SECRET-REF-001", "-", 987654321, "VERY PRIVATE MERCHANT"],
      ["11/09/2026", "SECRET-REF-002", "+", 123456789, "PRIVATE SALARY"],
    ]),
  );

  const report = buildPrivacySafeXlsxPilotEvidence([
    { data: bytes, today: "2026-09-11" },
  ]);

  assert.equal(report.files.length, 1);
  assert.equal(report.files[0]?.label, "file-1");
  assert.equal(report.files[0]?.parse.ok, true);
  assert.equal(report.files[0]?.parse.candidateCount, 2);
  assert.deepEqual(report.privacy, {
    rawRowsIncluded: false,
    realFileNamesIncluded: false,
    amountsIncluded: false,
    descriptionsIncluded: false,
    accountIdentifiersIncluded: false,
    perRowFingerprintsIncluded: false,
  });

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /PRIVATE ACCOUNT/);
  assert.doesNotMatch(serialized, /0123456789/);
  assert.doesNotMatch(serialized, /SECRET-REF/);
  assert.doesNotMatch(serialized, /987654321/);
  assert.doesNotMatch(serialized, /123456789/);
  assert.doesNotMatch(serialized, /VERY PRIVATE MERCHANT/);
  assert.doesNotMatch(serialized, /PRIVATE SALARY/);
  assert.doesNotMatch(serialized, /fingerprint":"[a-f0-9]/i);
});

test("two same-account exports expose only aggregate normalized overlap counts", () => {
  const first = workbookBytes(
    vcbRows(0, [
      ["09/09/2026", "REF-A", "-", 45000, "COFFEE SAMPLE"],
      ["10/09/2026", "REF-B", "-", 125000, "OVERLAP SAMPLE"],
    ]),
  );
  const second = workbookBytes(
    vcbRows(3, [
      ["10/09/2026", "REF-B", "-", 125000, "OVERLAP SAMPLE"],
      ["11/09/2026", "REF-C", "+", 50000, "REFUND SAMPLE"],
    ]),
  );

  const report = buildPrivacySafeXlsxPilotEvidence([
    { data: first, today: "2026-09-11" },
    { data: second, today: "2026-09-11" },
  ]);

  assert.deepEqual(report.overlap, {
    method: "same-account-client-fingerprint-v1",
    comparable: true,
    sharedCandidateCount: 1,
    file1OnlyCandidateCount: 1,
    file2OnlyCandidateCount: 1,
    caveats: [
      "The operator must verify both files represent the same bank account/export context.",
      "Overlap uses MoneyFlow's current heuristic client fingerprint only; it is not sourceExternalId and does not prove provider reference stability.",
      "Counts can change when a bank changes normalized date, amount, description, or other fingerprint material between exports.",
    ],
  });

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /REF-A|REF-B|REF-C/);
  assert.doesNotMatch(serialized, /COFFEE SAMPLE|OVERLAP SAMPLE|REFUND SAMPLE/);
  assert.doesNotMatch(serialized, /125000|45000|50000/);
});

test("multiplicity is preserved without leaking duplicate fingerprint values", () => {
  const repeated = [
    ["10/09/2026", "REF-D", "-", 10000, "REPEATED SAMPLE"],
    ["10/09/2026", "REF-D", "-", 10000, "REPEATED SAMPLE"],
  ];
  const first = workbookBytes(vcbRows(0, repeated));
  const second = workbookBytes(vcbRows(1, [repeated[0]!]));

  const report = buildPrivacySafeXlsxPilotEvidence([
    { data: first, today: "2026-09-11" },
    { data: second, today: "2026-09-11" },
  ]);

  assert.equal(report.overlap?.sharedCandidateCount, 1);
  assert.equal(report.overlap?.file1OnlyCandidateCount, 1);
  assert.equal(report.overlap?.file2OnlyCandidateCount, 0);
  assert.doesNotMatch(JSON.stringify(report), /REF-D|REPEATED SAMPLE|10000/);
});

test("failed parse is reported as non-comparable without raw parser error text", () => {
  const invalid = new TextEncoder().encode("not an excel workbook");
  const valid = workbookBytes(
    vcbRows(0, [["10/09/2026", "REF-X", "-", 1000, "VALID SAMPLE"]]),
  );

  const report = buildPrivacySafeXlsxPilotEvidence([
    { data: invalid, today: "2026-09-11" },
    { data: valid, today: "2026-09-11" },
  ]);

  assert.equal(report.files[0]?.parse.ok, false);
  assert.equal(report.overlap?.comparable, false);
  assert.equal(report.overlap?.sharedCandidateCount, 0);
  assert.doesNotMatch(JSON.stringify(report), /not an excel workbook|REF-X|VALID SAMPLE/);
});
