import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  mapCsvColumns,
  parseCsvAmountCell,
  parseCsvDateCell,
  parseCsvMatrix,
  parseCsvStatement,
  toCsvCandidateInputs,
  validateUploadFile,
  MAX_UPLOAD_BYTES,
  type ParsedCsvRow,
} from "./parse-csv.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("parseCsvMatrix handles quotes and commas", () => {
  const text = 'a,b,"c,d"\n1,2,"3,4"\n';
  const matrix = parseCsvMatrix(text);
  assert.deepEqual(matrix[0], ["a", "b", "c,d"]);
  assert.deepEqual(matrix[1], ["1", "2", "3,4"]);
});

test("parseCsvAmountCell: separators, paren negative, k unit → integer đồng", () => {
  assert.equal(parseCsvAmountCell("45.000").amount, 45_000);
  assert.equal(parseCsvAmountCell("45,000").amount, 45_000);
  assert.equal(parseCsvAmountCell("1 200 000").amount, 1_200_000);
  assert.equal(parseCsvAmountCell("-120000").amount, 120_000);
  assert.equal(parseCsvAmountCell("-120000").signedNegative, true);
  assert.equal(parseCsvAmountCell("(320.000)").amount, 320_000);
  assert.equal(parseCsvAmountCell("(320.000)").signedNegative, true);
  assert.equal(parseCsvAmountCell("45k").amount, 45_000);
  assert.equal(parseCsvAmountCell("0").amount, null);
  assert.equal(parseCsvAmountCell("").amount, null);
});

test("parseCsvDateCell: ISO / DMY / partial", () => {
  assert.deepEqual(parseCsvDateCell("2026-07-12", "2026-07-15"), {
    date: "2026-07-12",
    found: true,
  });
  assert.deepEqual(parseCsvDateCell("12/07/2026", "2026-07-15"), {
    date: "2026-07-12",
    found: true,
  });
  assert.deepEqual(parseCsvDateCell("11/07", "2026-07-15"), {
    date: "2026-07-11",
    found: true,
  });
  assert.equal(parseCsvDateCell("", "2026-07-15").found, false);
  assert.equal(parseCsvDateCell("", "2026-07-15").date, "2026-07-15");
});

test("mapCsvColumns maps Vietnamese headers", () => {
  const { map, confidence } = mapCsvColumns(["Ngày", "Mô tả", "Số tiền"]);
  assert.equal(map.date, 0);
  assert.equal(map.desc, 1);
  assert.equal(map.amount, 2);
  assert.ok(confidence >= 0.7);
});

test("mapCsvColumns maps debit/credit layout", () => {
  const { map } = mapCsvColumns(["Date", "Narration", "Debit", "Credit"]);
  assert.equal(map.date, 0);
  assert.equal(map.desc, 1);
  assert.equal(map.debit, 2);
  assert.equal(map.credit, 3);
});

test("fixture sample-bank.csv → candidates with integer money", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const result = parseCsvStatement(text, {
    fileName: "sample-bank.csv",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0]?.amount, 45_000);
  assert.equal(result.rows[0]?.kind, "expense");
  assert.equal(result.rows[0]?.occurredOn, "2026-07-12");
  assert.ok(result.rows[0]?.merchant.toLowerCase().includes("highlands"));
  assert.equal(result.rows[1]?.amount, 25_000_000);
  assert.equal(result.rows[1]?.kind, "income");
  assert.equal(result.rows[2]?.amount, 89_000);
  assert.equal(result.rows[3]?.kind, "transfer");
  assert.ok(result.rows.every((r) => Number.isSafeInteger(r.amount) && r.amount > 0));
});

test("fixture sample-generic.csv quoted amounts", () => {
  const text = readFileSync(join(fixturesDir, "sample-generic.csv"), "utf8");
  const result = parseCsvStatement(text, {
    fileName: "sample-generic.csv",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0]?.amount, 156_000);
  assert.equal(result.rows[1]?.amount, 320_000);
  assert.equal(result.rows[1]?.kind, "expense");
  assert.equal(result.rows[2]?.kind, "income");
  assert.equal(result.rows[2]?.amount, 45_000);
});

test("toCsvCandidateInputs attaches batch id + source csv without inventing identity", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const result = parseCsvStatement(text, { today: "2026-07-15" });
  const inputs = toCsvCandidateInputs(result.rows, "imp-test-1");
  assert.equal(inputs.length, result.rows.length);
  assert.ok(inputs.every((i) => i.source === "csv"));
  assert.ok(inputs.every((i) => i.importBatchId === "imp-test-1"));
  assert.ok(inputs.every((i) => i.status === "pending"));
  assert.ok(inputs.every((i) => i.sourceExternalId === undefined));
  assert.deepEqual(
    inputs.map((i) => i.sourceRowIndex),
    result.rows.map((row) => row.rowIndex),
  );
});

test("toCsvCandidateInputs preserves evidence-aware source lineage through preview commit", () => {
  const row: ParsedCsvRow = {
    kind: "expense",
    amount: 89_000,
    merchant: "Merchant",
    note: "",
    occurredOn: "2026-09-05",
    confidence: "high",
    uncertainFields: [],
    explanations: [],
    rawSnippet: "synthetic",
    rowIndex: 9,
    sourceRowIndex: 42,
    sourceExternalId: "mf-src-v1|account|bank|acct|posted-1",
    sourceLifecycleState: "posted",
    sourcePredecessorExternalId: "mf-src-v1|account|bank|acct|pending-1",
    parserVersion: "source-adapter@1.0",
    mappingVersion: 3,
  };

  const [input] = toCsvCandidateInputs([row], "batch-1", "xlsx");
  assert.equal(input?.source, "xlsx");
  assert.equal(input?.sourceRowIndex, 42);
  assert.equal(input?.sourceExternalId, row.sourceExternalId);
  assert.equal(input?.sourceLifecycleState, "posted");
  assert.equal(input?.sourcePredecessorExternalId, row.sourcePredecessorExternalId);
  assert.equal(input?.parserVersion, "source-adapter@1.0");
  assert.equal(input?.mappingVersion, 3);
});

test("parseCsvStatement empty / no amount column → error", () => {
  const empty = parseCsvStatement("   ");
  assert.equal(empty.ok, false);
  assert.match(empty.error ?? "", /trống|không đọc/i);

  const noMoney = parseCsvStatement("foo,bar\nx,y\n");
  assert.equal(noMoney.ok, false);
});

test("validateUploadFile size and type", () => {
  assert.equal(
    validateUploadFile({ name: "ok.csv", size: 100, type: "text/csv" }).ok,
    true,
  );
  const big = validateUploadFile({
    name: "big.csv",
    size: MAX_UPLOAD_BYTES + 1,
  });
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.error, /10MB/);

  const pdf = validateUploadFile({ name: "scan.pdf", size: 1000 });
  assert.equal(pdf.ok, true);
  if (pdf.ok) assert.equal(pdf.kind, "pdf");

  const xlsx = validateUploadFile({ name: "book.xlsx", size: 2000 });
  assert.equal(xlsx.ok, true);
  if (xlsx.ok) assert.equal(xlsx.kind, "xlsx");
});
