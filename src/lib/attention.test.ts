import assert from "node:assert/strict";
import test from "node:test";
import { buildAttentionItems } from "./attention.ts";
import type { BudgetSummary } from "./planning/budgets.ts";
import type { RecurringCommitment } from "./planning/commitments.ts";

const baseBudget = (over: Partial<BudgetSummary>): BudgetSummary => ({
  id: "b1",
  categoryId: "c1",
  categoryName: "Ăn uống",
  categoryIcon: null,
  categoryColor: null,
  monthStart: "2026-07-01",
  limit: 1_000_000,
  spent: 500_000,
  ...over,
});

test("buildAttentionItems flags near and over budgets", () => {
  const items = buildAttentionItems({
    budgets: [
      baseBudget({ id: "near", spent: 850_000 }),
      baseBudget({ id: "over", spent: 1_200_000, categoryName: "Mua sắm" }),
      baseBudget({ id: "ok", spent: 100_000, categoryName: "Di chuyển" }),
    ],
    commitments: [],
    today: "2026-07-15",
  });
  assert.ok(items.some((i) => i.id === "budget-near"));
  assert.ok(items.some((i) => i.id === "budget-over"));
  assert.ok(!items.some((i) => i.id === "budget-ok"));
});

test("buildAttentionItems lists due unpaid commitments", () => {
  const bill: RecurringCommitment = {
    id: "bill1",
    name: "Tiền nhà",
    amount: 5_000_000,
    dueDay: 5,
    dueDate: "2026-07-05",
    accountId: "a1",
    accountName: "Cash",
    categoryId: "c1",
    categoryName: "Nhà ở",
    categoryIcon: null,
    categoryColor: null,
    isArchived: false,
    isPaid: false,
    transactionId: null,
  };
  const items = buildAttentionItems({
    budgets: [],
    commitments: [bill],
    today: "2026-07-15",
  });
  assert.equal(items.length, 1);
  assert.match(items[0]!.label, /Tiền nhà/);
});

test("buildAttentionItems includes inbox count calmly", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    inboxCount: 3,
    today: "2026-07-15",
  });
  assert.equal(items[0]!.href, "/inbox");
  assert.match(items[0]!.label, /3/);
  assert.match(items[0]!.label, /cần xem/i);
});

test("buildAttentionItems surfaces unreviewed ledger rows", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    needsReviewCount: 2,
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "needs-review");
  assert.ok(chip, "expected a needs-review chip");
  assert.equal(chip.href, "/transactions?review=needs_review");
  assert.match(chip.label, /2/);
  assert.match(chip.label, /cần kiểm tra/i);
});

test("buildAttentionItems stays quiet when nothing needs review", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    needsReviewCount: 0,
    today: "2026-07-15",
  });
  assert.ok(!items.some((i) => i.id === "needs-review"));
});
