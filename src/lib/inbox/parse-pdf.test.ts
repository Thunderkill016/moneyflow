import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { toCsvCandidateInputs } from "./parse-csv.ts";
import {
  buildMfDemoBankPdfBytes,
  decodePdfLiteral,
  extractPdfTextLayer,
  isMfDemoBankTemplate,
  isPdfUpload,
  MF_DEMO_BANK_MARKER,
  parseMfDemoBankText,
  parsePdfStatement,
} from "./parse-pdf.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("decodePdfLiteral handles escapes", () => {
  assert.equal(decodePdfLiteral("Hello"), "Hello");
  assert.equal(decodePdfLiteral("a\\(b\\)c"), "a(b)c");
  assert.equal(decodePdfLiteral("line\\nnext"), "line\nnext");
});

test("fixture sample-mf-demo-bank.pdf → integer money rows", () => {
  const buf = readFileSync(join(fixturesDir, "sample-mf-demo-bank.pdf"));
  const result = parsePdfStatement(buf, {
    fileName: "sample-mf-demo-bank.pdf",
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
  assert.deepEqual(result.columnMap, {
    date: 0,
    amount: 2,
    desc: 1,
    debit: null,
    credit: null,
  });
});

test("buildMfDemoBankPdfBytes matches fixture parse", () => {
  const built = buildMfDemoBankPdfBytes();
  const result = parsePdfStatement(built, {
    fileName: "built.pdf",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.rows.length, 4);
});

test("extractPdfTextLayer finds MF DEMO BANK marker", () => {
  const buf = readFileSync(join(fixturesDir, "sample-mf-demo-bank.pdf"));
  const extracted = extractPdfTextLayer(buf);
  assert.ok(!("error" in extracted), "error" in extracted ? extracted.error : "");
  if (!("error" in extracted)) {
    assert.ok(isMfDemoBankTemplate(extracted.text));
    assert.ok(extracted.text.includes(MF_DEMO_BANK_MARKER));
  }
});

test("unknown bank template → Vietnamese error", () => {
  const pdf = buildMfDemoBankPdfBytes([
    "SOME OTHER BANK STATEMENT",
    "12/07/2026 | Cafe | -10.000",
  ]);
  const result = parsePdfStatement(pdf, { fileName: "other.pdf" });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /MF DEMO BANK|template|mẫu/i);
});

test("parseMfDemoBankText pure text path", () => {
  const text = [
    "MF DEMO BANK - SAO KE",
    "Ngay GD | Noi dung | So tien",
    "01/07/2026 | Cafe A | -50.000",
    "02/07/2026 | LUONG | +1.000.000",
  ].join("\n");
  const result = parseMfDemoBankText(text, {
    fileName: "t.pdf",
    today: "2026-07-15",
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]?.amount, 50_000);
  assert.equal(result.rows[1]?.kind, "income");
});

test("empty / non-pdf → error", () => {
  const empty = parsePdfStatement(new Uint8Array(0), { fileName: "e.pdf" });
  assert.equal(empty.ok, false);
  assert.match(empty.error ?? "", /trống|không đọc/i);

  const garbage = parsePdfStatement(new Uint8Array([1, 2, 3, 4]), {
    fileName: "bad.pdf",
  });
  assert.equal(garbage.ok, false);
});

test("toCsvCandidateInputs source pdf", () => {
  const buf = readFileSync(join(fixturesDir, "sample-mf-demo-bank.pdf"));
  const result = parsePdfStatement(buf, { today: "2026-07-15" });
  const inputs = toCsvCandidateInputs(result.rows, "imp-pdf-1", "pdf");
  assert.equal(inputs.length, result.rows.length);
  assert.ok(inputs.every((i) => i.source === "pdf"));
  assert.ok(inputs.every((i) => i.importBatchId === "imp-pdf-1"));
  assert.deepEqual(
    inputs.map((item) => item.sourceRowIndex),
    result.rows.map((row) => row.rowIndex),
  );
});

test("isPdfUpload", () => {
  assert.equal(isPdfUpload({ name: "a.pdf" }), true);
  assert.equal(isPdfUpload({ name: "a.PDF" }), true);
  assert.equal(isPdfUpload({ name: "blob", type: "application/pdf" }), true);
  assert.equal(isPdfUpload({ name: "a.csv" }), false);
});
