import assert from "node:assert/strict";
import test from "node:test";
import { captureConsequence, categoryMonthTotal } from "./capture-consequence.ts";
import { topExpenseCategories } from "./finance.ts";
import type { Transaction } from "./sample-data.ts";

const base: Transaction = {
  id: "a",
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "",
  accountId: "acc",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: "2026-07-05",
  occurredAt: "2026-07-05T05:00:00.000Z",
  relativeDate: "5 tháng 7",
};

const second: Transaction = { ...base, id: "b", amount: 50_000, occurredOn: "2026-07-09" };
const otherCategory: Transaction = {
  ...base,
  id: "c",
  category: "Di chuyển",
  amount: 30_000,
};
const lastMonth: Transaction = { ...base, id: "d", amount: 900_000, occurredOn: "2026-06-30" };
const transfer: Transaction = {
  ...base,
  id: "e",
  kind: "transfer",
  category: "Chuyển khoản",
  amount: 2_000_000,
  destinationAccount: "Ngân hàng",
};

test("the line states what was recorded and what it adds up to", () => {
  const line = captureConsequence({
    saved: second,
    transactions: [base, second, otherCategory, lastMonth],
  });

  assert.match(line, /^Đã ghi khoản chi/u);
  assert.match(line, /Ăn uống tháng này/u);
  // 100k + 50k this month; June's 900k must not be counted.
  assert.ok(line.includes("150.000"), line);
  assert.ok(!line.includes("900.000"), line);
});

test("the running total agrees with the dashboard's own category figure", () => {
  const ledger = [base, second, otherCategory, lastMonth];
  const share = topExpenseCategories(ledger, { today: "2026-07-14" }).find(
    (item) => item.name === "Ăn uống",
  );
  assert.ok(share);

  assert.equal(
    categoryMonthTotal(ledger, "Ăn uống", "expense", "2026-07-14"),
    share.amount,
    "a figure that disagreed with the dashboard would be worse than none",
  );
});

test("a split row contributes only its own line, as the dashboard counts it", () => {
  const split = {
    ...base,
    id: "split",
    amount: 300_000,
    occurredOn: "2026-07-12",
    splits: [
      { category: "Ăn uống", amount: 200_000 },
      { category: "Di chuyển", amount: 100_000 },
    ],
  } as Transaction;

  const ledger = [base, split];
  const share = topExpenseCategories(ledger, { today: "2026-07-14" }).find(
    (item) => item.name === "Ăn uống",
  );
  assert.ok(share);
  assert.equal(categoryMonthTotal(ledger, "Ăn uống", "expense", "2026-07-14"), share.amount);
  assert.equal(categoryMonthTotal(ledger, "Ăn uống", "expense", "2026-07-14"), 300_000);
});

test("transfers get a plain confirmation and never a category total", () => {
  const line = captureConsequence({ saved: transfer, transactions: [base, transfer] });

  assert.equal(line, "Đã chuyển tiền 2.000.000 ₫.");
  assert.ok(!line.includes("tháng này"), "a transfer belongs to no category total");
});

test("the first entry in a category says nothing redundant", () => {
  const line = captureConsequence({ saved: base, transactions: [base] });

  assert.equal(line, "Đã ghi khoản chi 100.000 ₫.");
  assert.ok(
    !line.includes("tháng này"),
    "repeating the same number back as a total is noise, not payoff",
  );
});

test("income is summed against income, never mixed with expense", () => {
  const salary: Transaction = {
    ...base,
    id: "s1",
    kind: "income",
    category: "Lương",
    amount: 10_000_000,
  };
  const bonus: Transaction = { ...salary, id: "s2", amount: 2_000_000, occurredOn: "2026-07-20" };
  const line = captureConsequence({ saved: bonus, transactions: [base, salary, bonus] });

  assert.match(line, /^Đã ghi khoản thu/u);
  assert.ok(line.includes("12.000.000"), line);
  assert.ok(!line.includes("100.000"), "the expense must not leak into an income total");
});

/*
 * The boundary that matters. `docs/product/PRINCIPLES.md` forbids presenting daily
 * spending guidance without a researched contract and reliable income-cycle,
 * commitment and reserve data. Restating a user's own recorded numbers is not
 * guidance; telling them what to do about those numbers is. Enforcing that with a
 * vocabulary ban makes it a property of the code rather than a promise in a PR.
 */
test("the line never gives advice, only what the user recorded", () => {
  const forbidden =
    /nên|đừng|hãy|cảnh báo|vượt mức|tiết kiệm|cắt giảm|quá nhiều|hạn chế|khuyên|cẩn thận|coi chừng/iu;

  const lines = [
    captureConsequence({ saved: second, transactions: [base, second] }),
    captureConsequence({ saved: base, transactions: [base] }),
    captureConsequence({ saved: transfer, transactions: [transfer] }),
  ];

  for (const line of lines) {
    assert.doesNotMatch(line, forbidden, `advice leaked into: ${line}`);
    // No safe-to-spend figure may appear: that stays withdrawn until MoneyFlow can
    // prove a complete income-based or next-payday plan.
    assert.doesNotMatch(line, /có thể (chi|tiêu)|còn được|an toàn để/iu, line);
  }
});
