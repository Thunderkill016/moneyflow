import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "../money.ts";
import type { RecurringCommitment } from "./commitments.ts";
import type { RecurringIncomeTemplate } from "./income-templates.ts";
import {
  buildCommittedRemainder,
  committedRemainderLabel,
} from "./committed-remainder.ts";

const MONTH = "2026-09-01";

const commitmentBase = {
  id: "one",
  name: "Internet",
  amount: 250_000,
  dueDay: 15,
  dueDate: "2026-09-15",
  accountId: "a",
  accountName: "Bank",
  categoryId: "c",
  categoryName: "Hóa đơn",
  categoryIcon: null,
  categoryColor: null,
  isArchived: false,
  isPaid: false,
  transactionId: null,
} satisfies RecurringCommitment;

const incomeBase = {
  id: "salary",
  name: "Lương tháng",
  amount: 20_000_000,
  dueDay: 5,
  dueDate: "2026-09-05",
  accountId: "a",
  accountName: "Bank",
  categoryId: "c",
  categoryName: "Lương",
  categoryIcon: null,
  categoryColor: null,
  isArchived: false,
  isReceived: false,
  transactionId: null,
} satisfies RecurringIncomeTemplate;

const vndAccounts = [
  { currencyCode: "VND" },
  { currencyCode: "VND" },
];

function build(overrides: Partial<Parameters<typeof buildCommittedRemainder>[0]> = {}) {
  return buildCommittedRemainder({
    currentBalance: 10_000_000,
    accounts: vndAccounts,
    commitments: [],
    incomeTemplates: [],
    monthStart: MONTH,
    ...overrides,
  });
}

test("remainder is balance minus unpaid declared commitments, integer đồng", () => {
  const result = build({
    commitments: [
      commitmentBase,
      { ...commitmentBase, id: "two", amount: 650_000, dueDay: 25, dueDate: "2026-09-25" },
    ],
  });
  assert.equal(result.complete, true);
  assert.equal(result.remainder, 9_100_000);
  assert.equal(result.obligationTotal, 900_000);
  assert.equal(result.obligationCount, 2);
  assert.equal(result.expectedIncome, 0);
  assert.equal(result.expectedIncomeIncluded, false);
  assert.deepEqual(result.gaps, []);
});

test("paid and archived commitments do not reduce the remainder", () => {
  const result = build({
    commitments: [
      commitmentBase,
      { ...commitmentBase, id: "paid", amount: 500_000, isPaid: true, transactionId: "t" },
      { ...commitmentBase, id: "archived", amount: 1_000_000, isArchived: true },
    ],
  });
  assert.equal(result.remainder, 9_750_000);
  assert.equal(result.obligationCount, 1);
});

test("negative remainder is kept: obligations exceeding balance are signal", () => {
  const result = build({
    currentBalance: 500_000,
    commitments: [commitmentBase, { ...commitmentBase, id: "two", amount: 650_000 }],
  });
  assert.equal(result.complete, true);
  assert.equal(result.remainder, -400_000);
  assert.equal(
    committedRemainderLabel(result),
    "Thiếu 400.000 ₫ cho 2 khoản định kỳ đã khai báo tháng này",
  );
});

test("a commitment lacking a usable amount withholds the figure", () => {
  for (const amount of [Number.NaN, 0, -50, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = build({
      commitments: [{ ...commitmentBase, amount }],
    });
    assert.equal(result.complete, false);
    assert.equal(result.remainder, null);
    assert.ok(result.gaps.includes("commitment-amount-invalid"));
    assert.equal(committedRemainderLabel(result), null);
  }
});

test("a foreign-currency account withholds the figure — it cannot fold into đồng", () => {
  const result = build({
    accounts: [...vndAccounts, { currencyCode: "USD" }],
    commitments: [commitmentBase],
  });
  assert.equal(result.complete, false);
  assert.equal(result.remainder, null);
  assert.ok(result.gaps.includes("account-currency-foreign"));
  assert.equal(committedRemainderLabel(result), null);
});

test("an unparseable currency code cannot be proven VND", () => {
  const result = build({
    accounts: [{ currencyCode: "VND" }, { currencyCode: "đồng" }],
    commitments: [commitmentBase],
  });
  assert.equal(result.complete, false);
  assert.ok(result.gaps.includes("account-currency-unknown"));
});

test("omitted currency code follows the domain default of VND", () => {
  const result = build({
    accounts: [{ currencyCode: "VND" }, {}],
    commitments: [commitmentBase],
  });
  assert.equal(result.complete, true);
  assert.equal(result.remainder, 9_750_000);
});

test("no declared commitments is honest empty, not a zero claim", () => {
  const result = build({ commitments: [] });
  assert.equal(result.complete, true);
  assert.equal(result.remainder, 10_000_000);
  assert.equal(result.obligationCount, 0);
  // The number exists but says nothing — the line must not render.
  assert.equal(committedRemainderLabel(result), null);
});

test("all commitments paid this month also renders nothing", () => {
  const result = build({
    commitments: [{ ...commitmentBase, isPaid: true, transactionId: "t" }],
  });
  assert.equal(result.complete, true);
  assert.equal(result.obligationCount, 0);
  assert.equal(committedRemainderLabel(result), null);
});

test("month boundary: only unpaid occurrences dated inside the month count", () => {
  const result = build({
    commitments: [
      commitmentBase, // 2026-09-15 — in month
      { ...commitmentBase, id: "next", amount: 700_000, dueDate: "2026-10-05" },
      { ...commitmentBase, id: "prev", amount: 300_000, dueDate: "2026-08-31" },
    ],
    monthStart: MONTH,
  });
  assert.equal(result.complete, true);
  assert.equal(result.obligationTotal, 250_000);
  assert.equal(result.obligationCount, 1);
});

test("month boundary: last-day occurrences clamped into the month count", () => {
  const result = build({
    commitments: [
      { ...commitmentBase, dueDay: 31, dueDate: "2026-02-28" },
    ],
    monthStart: "2026-02-01",
  });
  assert.equal(result.complete, true);
  assert.equal(result.obligationCount, 1);
  assert.equal(result.remainder, 9_750_000);
});

test("an undateable unpaid occurrence withholds rather than guesses", () => {
  const result = build({
    commitments: [{ ...commitmentBase, dueDate: "someday" }],
  });
  assert.equal(result.complete, false);
  assert.equal(result.remainder, null);
  assert.ok(result.gaps.includes("commitment-occurrence-invalid"));
});

test("a malformed month cannot scope the claim", () => {
  const result = build({ commitments: [commitmentBase], monthStart: "2026-09" });
  assert.equal(result.complete, false);
  assert.ok(result.gaps.includes("invalid-month"));
  assert.equal(result.remainder, null);
});

test("a non-integer balance withholds the figure", () => {
  const result = build({ currentBalance: 10.5, commitments: [commitmentBase] });
  assert.equal(result.complete, false);
  assert.ok(result.gaps.includes("unsafe-balance"));
  assert.equal(result.remainder, null);
});

test("expected income is reported separately, never silently folded", () => {
  const result = build({
    commitments: [commitmentBase],
    incomeTemplates: [
      incomeBase,
      { ...incomeBase, id: "received", amount: 3_000_000, isReceived: true, transactionId: "t" },
      { ...incomeBase, id: "other-month", amount: 1_000_000, dueDate: "2026-10-05" },
      { ...incomeBase, id: "archived", amount: 2_000_000, isArchived: true },
    ],
  });
  assert.equal(result.complete, true);
  assert.equal(result.remainder, 9_750_000);
  assert.equal(result.expectedIncome, 20_000_000);
  assert.equal(result.expectedIncomeCount, 1);
  assert.equal(
    committedRemainderLabel(result),
    "Còn 9.750.000 ₫ sau 1 khoản định kỳ đã khai báo tháng này · chưa gồm 20.000.000 ₫ thu dự kiến",
  );
});

test("folding expected income in is opt-in and labeled as included", () => {
  const result = buildCommittedRemainder(
    {
      currentBalance: 10_000_000,
      accounts: vndAccounts,
      commitments: [commitmentBase],
      incomeTemplates: [incomeBase],
      monthStart: MONTH,
    },
    { includeExpectedIncome: true },
  );
  assert.equal(result.remainder, 29_750_000);
  assert.equal(result.expectedIncomeIncluded, true);
  assert.match(
    committedRemainderLabel(result)!,
    /kể cả 20\.000\.000 ₫ thu dự kiến/,
  );
});

test("no income disclosure when the caller passes no templates at all", () => {
  // The dashboard withholds the suffix unless it actually holds resolved
  // income rows — an omitted key must never imply "nothing expected".
  const result = buildCommittedRemainder({
    currentBalance: 10_000_000,
    accounts: vndAccounts,
    commitments: [commitmentBase],
    monthStart: MONTH,
  });
  assert.equal(result.complete, true);
  assert.equal(result.expectedIncome, 0);
  const label = committedRemainderLabel(result);
  assert.equal(
    label,
    "Còn 9.750.000 ₫ sau 1 khoản định kỳ đã khai báo tháng này",
  );
  assert.doesNotMatch(label!, /thu dự kiến/);
});

test("an income template lacking a usable amount withholds the figure", () => {
  const result = build({
    commitments: [commitmentBase],
    incomeTemplates: [{ ...incomeBase, amount: Number.NaN }],
  });
  assert.equal(result.complete, false);
  assert.equal(result.remainder, null);
  assert.ok(result.gaps.includes("income-amount-invalid"));
});

test("label names operands and never advises", () => {
  const result = build({ commitments: [commitmentBase] });
  const label = committedRemainderLabel(result, formatMoney);
  assert.equal(label, "Còn 9.750.000 ₫ sau 1 khoản định kỳ đã khai báo tháng này");
  assert.doesNotMatch(label!, /có thể (chi|tiêu)|an toàn để|safe/iu);
});
