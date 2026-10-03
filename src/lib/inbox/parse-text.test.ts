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

test("explicit transaction amount is invariant to balance and fee field order", () => {
  // Synthetic grammar fixtures: these do not establish any bank's format support.
  for (const sign of ["-", "+"]) {
    const fields = [
      `GD: ${sign}250.000 VND`,
      "Số dư: 3.450.000 VND",
      "Phí giao dịch: 2.000 VND",
    ];
    for (const order of [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ]) {
      const text = `${order.map((index) => fields[index]).join(" | ")} | 03/10/2026 | ND: CIRCLE K`;
      const row = parsePasteLine(text, { today: "2026-10-03" });
      assert.equal(row?.amount, 250_000, text);
      assert.equal(row?.kind, sign === "+" ? "income" : "expense", text);
      assert.ok(!row?.uncertainFields.includes("amount"), text);
      assert.equal(row?.rawSnippet, text, "source evidence remains unchanged");
    }
  }
});

test("labelled transaction amount tolerates folded labels and bare identifiers", () => {
  for (const label of [
    "GD",
    "Giao dịch",
    "So tien giao dich",
    "SỐ TIỀN GIAO DỊCH",
  ]) {
    const row = parsePasteLine(
      `TK 0011004567890 | SD: 3,450,000VND | ${label}=-250,000VND | 03/10/2026`,
      { today: "2026-10-03" },
    );
    assert.equal(row?.amount, 250_000, label);
    assert.ok(!row?.uncertainFields.includes("amount"), label);
  }
});

test("explicit transaction labels retain review for unknown or repeated money", () => {
  for (const extra of ["100.000 VND", "GD: -100.000 VND", "GD: -250.000 VND"]) {
    const row = parsePasteLine(
      `SD: 3.450.000 VND | GD: -250.000 VND | ${extra} | 03/10/2026`,
      { today: "2026-10-03" },
    );
    assert.equal(row?.amount, 250_000, extra);
    assert.ok(row?.uncertainFields.includes("amount"), extra);
    assert.equal(row?.confidence, "low", extra);
  }
});

test("note labels cannot resolve a competing transaction amount", () => {
  const row = parsePasteLine(
    "SD: 3.450.000 VND | GD: -250.000 VND | ND: ghi lai GD: -100.000 VND | 03/10/2026",
    { today: "2026-10-03" },
  );
  assert.equal(row?.amount, 250_000);
  assert.ok(row?.uncertainFields.includes("amount"));
  const noteOnly = parsePasteLine(
    "SD: 3.450.000 VND | ND: ghi lai GD: -250.000 VND | 03/10/2026",
    { today: "2026-10-03" },
  );
  assert.equal(
    noteOnly?.amount,
    3_450_000,
    "note must not override the existing fallback",
  );
  assert.ok(noteOnly?.uncertainFields.includes("amount"));
});

test("amount labels do not remove missing-date or unknown-kind review", () => {
  const row = parsePasteLine(
    "SD: 3.450.000 VND | GD: 250.000 VND | ND: CIRCLE K",
    { today: "2026-10-03" },
  );
  assert.equal(row?.amount, 250_000);
  assert.ok(!row?.uncertainFields.includes("amount"));
  assert.ok(row?.uncertainFields.includes("date"));
  assert.ok(row?.uncertainFields.includes("kind"));
  assert.equal(row?.confidence, "low");
});

test("separators inside notes cannot promote quoted amount labels", () => {
  for (const note of [
    'ND: "invoice | GD: -250.000 VND"',
    "Ghi chú: invoice; GD: -250.000 VND",
    "Description: copied | Số tiền giao dịch: -250.000 VND",
  ]) {
    const row = parsePasteLine(`SD: 3.450.000 VND | ${note} | 03/10/2026`, {
      today: "2026-10-03",
    });
    assert.equal(
      row?.amount,
      3_450_000,
      "retain fallback instead of promoting a note label",
    );
    assert.ok(row?.uncertainFields.includes("amount"), note);
  }
  const row = parsePasteLine(
    'GD: -250.000 VND | ND: "invoice | SD: 100.000 VND" | 03/10/2026',
    { today: "2026-10-03" },
  );
  assert.equal(row?.amount, 250_000);
  assert.ok(
    row?.uncertainFields.includes("amount"),
    "quoted balance is unknown competing money",
  );
});

test("amount roles require a complete field label and a money marker", () => {
  for (const extra of [
    "Mã giao dịch: -100.000 VND",
    "Hạn mức số dư: 100.000 VND",
  ]) {
    const row = parsePasteLine(
      `SD: 3.450.000 VND | GD: -250.000 VND | ${extra}`,
      { today: "2026-10-03" },
    );
    assert.equal(row?.amount, 250_000);
    assert.ok(row?.uncertainFields.includes("amount"), extra);
  }
  const text = "SD: 3.450.000 VND | GD: 123456";
  const selected = selectPrimaryAmount(extractAmounts(text), text);
  assert.equal(
    selected?.primary.amount,
    3_450_000,
    "an unmarked identifier is not an explicit money field",
  );
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
  const row = parsePasteLine("12/07/2026 Highlands Coffee 45.000", {
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
  const text = ["cafe 45k", "Grab 89.000", "no amount here", "luong 15tr"].join(
    "\n",
  );
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

test("toCreateCandidateInputs stamps a chosen account on every pasted candidate", () => {
  const result = parsePasteText("Highlands 45k\nGrab 89k", {
    today: "2026-07-15",
  });
  const withAccount = toCreateCandidateInputs(result.candidates, {
    account: { id: "acc-mb", name: "MB Bank" },
  });
  assert.ok(withAccount.length >= 1);
  assert.ok(withAccount.every((i) => i.accountId === "acc-mb"));
  assert.ok(withAccount.every((i) => i.account === "MB Bank"));

  const without = toCreateCandidateInputs(result.candidates);
  assert.equal(without[0]?.accountId, undefined);
  assert.equal(without[0]?.account, undefined);
});

test("Vietnamese relative days resolve against the supplied calendar day", () => {
  for (const [text, today, expected] of [
    ["đổ xăng 185k hôm qua", "2026-09-28", "2026-09-27"],
    ["cafe 45k hôm kia", "2026-09-28", "2026-09-26"],
    ["cafe 45k hom qua", "2026-01-01", "2025-12-31"],
    ["cafe 45k hôm kia", "2024-03-01", "2024-02-28"],
    ["cafe 45k hôm nay", "2026-09-28", "2026-09-28"],
  ]) {
    const row = parsePasteLine(text!, { today: today! });
    assert.ok(row);
    assert.equal(row.occurredOn, expected, text);
    assert.ok(!row.uncertainFields.includes("date"), text);
  }
});

test("explicit dates must be real calendar days and conflicting days require review", () => {
  for (const text of [
    "cafe 45k 31/02/2026",
    "cafe 45k 2026-02-29",
    "cafe 45k 14/08/26",
    "cafe 45k 12/07/2026 13/07/2026",
    "cafe 45k 28/09/2026 hôm qua",
    "cafe 45k hôm qua hôm kia",
  ]) {
    const row = parsePasteLine(text, { today: "2026-09-28" });
    assert.ok(row);
    assert.ok(row.uncertainFields.includes("date"), text);
    assert.notEqual(row.confidence, "high", text);
    assert.match(
      row.explanations.join(" "),
      /ngày.*(hợp lệ|mâu thuẫn|xác định)/i,
    );
  }
  for (const text of ["cafe 45k 29/02/2024", "cafe 45k 29-02-2024"]) {
    const row = parsePasteLine(text, { today: "2026-09-28" });
    assert.equal(row?.occurredOn, "2024-02-29");
    assert.ok(!row?.uncertainFields.includes("date"));
  }
});

test("a day/month without a year retains review for the inferred year", () => {
  const row = parsePasteLine("Highlands 45k 12/07", { today: "2026-09-28" });
  assert.equal(row?.occurredOn, "2026-07-12");
  assert.ok(row?.uncertainFields.includes("date"));
  assert.match(row!.explanations.join(" "), /năm/);
});

test("payment transfers are expenses while ownership-unknown transfers stay reviewable", () => {
  for (const text of [
    "chuyển khoản tiền ăn 50k cho quán",
    "chuyen khoan thanh toan 50k cho quan",
    "CK mua đồ 50k",
  ]) {
    const row = parsePasteLine(text, { today: "2026-09-28" });
    assert.equal(row?.kind, "expense", text);
    assert.ok(!row?.uncertainFields.includes("kind"), text);
  }
  for (const text of ["chuyển khoản 50k", "CK cho bạn 50k", "transfer 50k"]) {
    const row = parsePasteLine(text, { today: "2026-09-28" });
    assert.ok(row?.uncertainFields.includes("kind"), text);
  }
  for (const text of ["CK nội bộ 50k", "chuyển giữa tài khoản của mình 50k"]) {
    const row = parsePasteLine(text, { today: "2026-09-28" });
    assert.equal(row?.kind, "transfer", text);
    assert.ok(!row?.uncertainFields.includes("kind"), text);
  }
});

test("repeated equivalent date cues agree while contradictory financial cues stay uncertain", () => {
  const date = parsePasteLine("cafe 45k 27/09/2026 hôm qua", {
    today: "2026-09-28",
  });
  assert.equal(date?.occurredOn, "2026-09-27");
  assert.ok(!date?.uncertainFields.includes("date"));
  for (const text of [
    "chuyển nội bộ mua đồ 50k",
    "thu nhập mua đồ 50k",
    "lương -50k",
  ]) {
    assert.ok(parsePasteLine(text)?.uncertainFields.includes("kind"), text);
  }
  assert.throws(
    () => parsePasteLine("cafe 45k hôm qua", { today: "2026-02-31" }),
    /invalid_paste_date_anchor/,
  );
});

test("invalid source dates retain low confidence when persisted as candidate drafts", () => {
  const parsed = parsePasteText("Highlands 45k 31/02/2026", {
    today: "2026-09-28",
  });
  assert.equal(parsed.needsReviewCount, 1);
  assert.equal(parsed.candidates[0]?.confidence, "low");
  const inputs = toCreateCandidateInputs(parsed.candidates);
  assert.equal(inputs[0]?.confidence, "low");
  assert.equal(inputs[0]?.occurredOn, "2026-09-28");
  assert.equal(inputs[0]?.status, "pending");
});

test("generic transfer wording remains review-required after candidate conversion", () => {
  const parsed = parsePasteText("transfer Highlands 45k 27/09/2026", {
    today: "2026-09-28",
  });
  assert.equal(parsed.candidates[0]?.confidence, "low");
  assert.equal(
    toCreateCandidateInputs(parsed.candidates)[0]?.confidence,
    "low",
  );
});
