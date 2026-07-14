import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAmounts,
  parsePasteLine,
  parsePasteText,
  parseVndAmountToken,
  toCreateCandidateInputs,
} from "./parse-text.ts";

test("parseVndAmountToken: k / tr / thousand separators → integer đồng", () => {
  assert.equal(parseVndAmountToken("45", "k"), 45_000);
  assert.equal(parseVndAmountToken("1.5", "tr"), 1_500_000);
  assert.equal(parseVndAmountToken("1,5", "tr"), 1_500_000);
  assert.equal(parseVndAmountToken("2", "triệu"), 2_000_000);
  assert.equal(parseVndAmountToken("45.000"), 45_000);
  assert.equal(parseVndAmountToken("45,000"), 45_000);
  assert.equal(parseVndAmountToken("1.250.000"), 1_250_000);
  assert.equal(parseVndAmountToken("89000"), 89_000);
  assert.equal(parseVndAmountToken("0", "k"), null);
  assert.equal(parseVndAmountToken("45.5"), null);
});

test("extractAmounts finds signed and unit amounts", () => {
  const cafe = extractAmounts("cafe 45k tiền mặt");
  assert.equal(cafe.length, 1);
  assert.equal(cafe[0]?.amount, 45_000);

  const sms = extractAmounts("TK ****1234 -120.000 VND tai Circle K");
  assert.equal(sms.length, 1);
  assert.equal(sms[0]?.amount, 120_000);
  assert.equal(sms[0]?.signedNegative, true);
});

test("parsePasteLine: simple NL cafe 45k", () => {
  const row = parsePasteLine("cafe 45k tiền mặt", { today: "2026-07-15" });
  assert.ok(row);
  assert.equal(row!.amount, 45_000);
  assert.equal(row!.kind, "expense");
  assert.equal(row!.occurredOn, "2026-07-15");
  assert.ok(row!.uncertainFields.includes("date"));
  assert.ok(row!.merchant.toLowerCase().includes("cafe"));
  assert.ok(row!.explanations.some((e) => e.includes("ngày")));
});

test("parsePasteLine: known merchant Highlands + date", () => {
  const row = parsePasteLine("12/07 Highlands Coffee 45.000", {
    today: "2026-07-15",
  });
  assert.ok(row);
  assert.equal(row!.amount, 45_000);
  assert.equal(row!.merchant, "Highlands Coffee");
  assert.equal(row!.occurredOn, "2026-07-12");
  assert.ok(!row!.uncertainFields.includes("merchant"));
  assert.ok(!row!.uncertainFields.includes("date"));
});

test("parsePasteLine: income lương", () => {
  const row = parsePasteLine("Lương CT +25.000.000", { today: "2026-07-15" });
  assert.ok(row);
  assert.equal(row!.kind, "income");
  assert.equal(row!.amount, 25_000_000);
});

test("parsePasteLine: transfer ck", () => {
  const row = parsePasteLine("CK nội bộ 2.000.000", { today: "2026-07-15" });
  assert.ok(row);
  assert.equal(row!.kind, "transfer");
  assert.equal(row!.amount, 2_000_000);
});

test("parsePasteText multi-line → multiple candidates", () => {
  const text = [
    "cafe 45k",
    "Grab 89.000",
    "no amount here",
    "luong 15tr",
  ].join("\n");
  const result = parsePasteText(text, { today: "2026-07-15" });
  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0]?.amount, 45_000);
  assert.equal(result.candidates[1]?.amount, 89_000);
  assert.equal(result.candidates[2]?.kind, "income");
  assert.equal(result.candidates[2]?.amount, 15_000_000);
  assert.ok(result.needsReviewCount >= 1);
});

test("parsePasteText empty / no money → error", () => {
  const empty = parsePasteText("   ");
  assert.equal(empty.ok, false);
  assert.match(empty.error ?? "", /Dán nội dung/);

  const none = parsePasteText("chỉ chữ không có số");
  assert.equal(none.ok, false);
  assert.match(none.error ?? "", /Không tìm thấy/);
});

test("toCreateCandidateInputs maps source paste + integer amount", () => {
  const result = parsePasteText("Highlands 45k", { today: "2026-07-15" });
  const inputs = toCreateCandidateInputs(result.candidates);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0]?.source, "paste");
  assert.equal(inputs[0]?.amount, 45_000);
  assert.equal(Number.isSafeInteger(inputs[0]?.amount), true);
  assert.equal(inputs[0]?.status, "pending");
});
