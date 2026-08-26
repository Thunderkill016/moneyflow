import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAmounts,
  selectPrimaryAmount,
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

/*
 * The eight formats below are the ones this product actually receives through
 * the PWA Share Target, and each opens with an unmasked account number.
 *
 * The masked fixture above (`TK ****1234`) is kept because it covers the
 * `[*#xX]` guard, but on its own it hid a defect for the whole life of the
 * parser: it is one of only two shapes where the leftmost token is not the
 * account number, so a leftmost-wins rule passed it while getting six of the
 * eight real formats wrong — reading the account number as the amount.
 *
 * These cases pin the amount specifically, because a wrong amount is the one
 * parser error a reviewer cannot catch by eye: 11,004,567,890 ₫ and 250,000 ₫
 * are equally plausible-looking rows in a review queue.
 */
const BANK_SMS: { bank: string; text: string; amount: number }[] = [
  {
    bank: "Vietcombank",
    text: "TK 0011004567890|GD: -250,000VND luc 14-08-2026 09:12|SD: 3,450,000VND|ND: THANH TOAN GRAB",
    amount: 250_000,
  },
  {
    bank: "Techcombank",
    text: "TK 19036758392018 |GD:-85,000VND 14/08/26 12:03| So du:1,250,000VND |ND CHUYEN TIEN AN TRUA",
    amount: 85_000,
  },
  {
    bank: "BIDV",
    text: "BIDV: 21510001234567 08/14 -1,200,000VND SD 5,600,000VND ND:THANH TOAN HOA DON DIEN",
    amount: 1_200_000,
  },
  {
    bank: "MB Bank",
    text: "MBBank: TK 0901234567 +15,000,000VND luc 05/08/2026. So du 18,200,000VND. ND: LUONG THANG 8",
    amount: 15_000_000,
  },
  {
    bank: "ACB",
    text: "ACB:TK 2489163 GD -45,000 VND 14/08 SD 890,000 VND ND MUA CA PHE",
    amount: 45_000,
  },
  {
    bank: "MoMo",
    text: "Ban da thanh toan 120.000d cho Highlands Coffee qua MoMo luc 14/08/2026",
    amount: 120_000,
  },
  {
    bank: "VietinBank",
    text: "VietinBank TK 107865432109 GD: -3.500.000 VND ngay 14/08/2026 SD: 12.000.000 VND ND: CHUYEN KHOAN",
    amount: 3_500_000,
  },
  {
    bank: "TPBank",
    text: "TPBank: 0339 xxxx 12  -68,000VND  14/08/2026  SD:432,000VND  ND: SHOPEE PAY",
    amount: 68_000,
  },
];

test("bank SMS: the amount is read, never the account number", () => {
  for (const { bank, text, amount } of BANK_SMS) {
    const row = parsePasteLine(text, { today: "2026-08-14" });
    assert.ok(row, `${bank}: produced no candidate`);
    assert.equal(row!.amount, amount, `${bank}: wrong amount`);
  }
});

test("selectPrimaryAmount prefers a money-marked token over an earlier bare one", () => {
  const vcb = extractAmounts(BANK_SMS[0]!.text);
  // Not vacuous: the account number really is extracted, and really is first.
  assert.equal(vcb[0]?.amount, 11_004_567_890);
  assert.equal(vcb[0]?.hasMoneyMarker, false);

  const chosen = selectPrimaryAmount(vcb);
  assert.equal(chosen?.primary.amount, 250_000);
  assert.equal(chosen?.primary.hasMoneyMarker, true);
  // The closing balance is also money-marked, so the choice stays flagged.
  assert.equal(chosen?.ambiguous, true);

  assert.equal(selectPrimaryAmount([]), null);
});

test("selectPrimaryAmount falls back to order when nothing is marked", () => {
  const bare = extractAmounts("an trua 50000 hom nay 60000");
  assert.ok(bare.every((item) => !item.hasMoneyMarker));

  const chosen = selectPrimaryAmount(bare);
  assert.equal(chosen?.primary.amount, 50_000);
  assert.equal(chosen?.ambiguous, true);
});

test("a single marked amount is not flagged ambiguous", () => {
  const row = parsePasteLine("cafe 45k tiền mặt", { today: "2026-07-15" });
  assert.ok(row);
  assert.ok(!row!.uncertainFields.includes("amount"));
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
