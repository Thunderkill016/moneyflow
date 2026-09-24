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

test("buildAttentionItems shows spent/limit figures on budget chips", () => {
  const items = buildAttentionItems({
    budgets: [
      baseBudget({ id: "near", spent: 4_200_000, limit: 5_000_000 }),
      baseBudget({
        id: "over",
        spent: 6_200_000,
        limit: 5_000_000,
        categoryName: "Mua sắm",
      }),
    ],
    commitments: [],
    today: "2026-07-15",
  });
  assert.equal(
    items.find((i) => i.id === "budget-near")?.label,
    "Ăn uống: Gần hạn mức (4,2 tr/5 tr)",
  );
  assert.equal(
    items.find((i) => i.id === "budget-over")?.label,
    "Mua sắm: Đã vượt 1,2 tr (6,2 tr/5 tr)",
  );
});

test("buildAttentionItems keeps the status cue when compact figures collapse", () => {
  const items = buildAttentionItems({
    budgets: [baseBudget({ id: "near", spent: 1_000_000, limit: 1_010_000 })],
    commitments: [],
    today: "2026-07-15",
  });
  assert.equal(
    items.find((i) => i.id === "budget-near")?.label,
    "Ăn uống: Gần hạn mức (1 tr/1 tr)",
  );
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

test("buildAttentionItems surfaces goals that are overdue or behind pace as a count", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    goalPaceAttentionCount: 2,
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "goals-pace");
  assert.ok(chip, "expected a goal-pace chip");
  assert.equal(chip.href, "/goals");
  assert.match(chip.label, /2/);
  assert.match(chip.label, /mục tiêu/);
});

test("buildAttentionItems stays silent on goals when none need pace attention", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    goalPaceAttentionCount: 0,
    today: "2026-07-15",
  });
  assert.ok(!items.some((i) => i.id === "goals-pace"));
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

test("buildAttentionItems stays silent when backup state is unavailable", () => {
  // Demo and deploy-skew both surface backup:null — never invent a reminder.
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    today: "2026-09-21",
    backup: null,
  });
  assert.ok(!items.some((i) => i.id === "backup-reminder"));
});

test("buildAttentionItems stays quiet for a fresh backup or fresh account", () => {
  const fresh = buildAttentionItems({
    budgets: [],
    commitments: [],
    today: "2026-09-21",
    backup: { lastBackupAt: "2026-09-01", accountCreatedAt: "2026-01-01" },
  });
  assert.ok(!fresh.some((i) => i.id === "backup-reminder"));

  const young = buildAttentionItems({
    budgets: [],
    commitments: [],
    today: "2026-09-21",
    backup: { lastBackupAt: null, accountCreatedAt: "2026-09-01" },
  });
  assert.ok(!young.some((i) => i.id === "backup-reminder"));
});

test("buildAttentionItems reminds when the newest backup is stale", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    today: "2026-09-21",
    backup: { lastBackupAt: "2026-08-01", accountCreatedAt: "2026-01-01" },
  });
  const chip = items.find((i) => i.id === "backup-reminder");
  assert.ok(chip, "expected a backup reminder chip");
  assert.equal(chip.href, "/settings/backup");
  assert.match(chip.label, /51 ngày/);
});

test("buildAttentionItems names a missing backup without dressing account age as backup age", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [],
    today: "2026-09-21",
    backup: { lastBackupAt: null, accountCreatedAt: "2026-01-01" },
  });
  const chip = items.find((i) => i.id === "backup-reminder");
  assert.ok(chip, "expected a backup reminder chip");
  assert.equal(chip.label, "Chưa có bản sao lưu nào");
});

test("backup reminder yields to budget and bill chips inside the strip cap", () => {
  const items = buildAttentionItems({
    budgets: [
      baseBudget({ id: "a", spent: 1_200_000 }),
      baseBudget({ id: "b", spent: 1_200_000, categoryName: "Mua sắm" }),
      baseBudget({ id: "c", spent: 1_200_000, categoryName: "Di chuyển" }),
      baseBudget({ id: "d", spent: 1_200_000, categoryName: "Nhà ở" }),
    ],
    commitments: [],
    today: "2026-09-21",
    backup: { lastBackupAt: "2026-08-01", accountCreatedAt: "2026-01-01" },
  });
  assert.equal(items.length, 4);
  assert.ok(!items.some((i) => i.id === "backup-reminder"));
});
