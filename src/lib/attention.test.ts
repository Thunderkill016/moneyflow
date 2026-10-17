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

test("buildAttentionItems keeps a rounded-100% under-limit budget as near", () => {
  // Issue #714 repro: 4.990.000/5.000.000 rounds to 100% yet still holds
  // 10.000 ₫ — the chip must read "Gần hạn mức", never "Đã vượt".
  const items = buildAttentionItems({
    budgets: [baseBudget({ id: "edge", spent: 4_990_000, limit: 5_000_000 })],
    commitments: [],
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "budget-edge");
  assert.equal(chip?.tone, "info");
  assert.equal(chip?.label, "Ăn uống: Gần hạn mức (5 tr/5 tr)");
});

test("buildAttentionItems treats a fully-spent budget as near, not over", () => {
  // spent == limit leaves no overshoot — "Đã vượt 0 ₫" would be a false claim.
  const items = buildAttentionItems({
    budgets: [
      baseBudget({ id: "at-limit", spent: 5_000_000, limit: 5_000_000 }),
    ],
    commitments: [],
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "budget-at-limit");
  assert.equal(chip?.tone, "info");
  assert.equal(chip?.label, "Ăn uống: Gần hạn mức (5 tr/5 tr)");
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

const baseCommitment = (over: Partial<RecurringCommitment>): RecurringCommitment => ({
  id: "c1",
  name: "Internet",
  amount: 500_000,
  dueDay: 20,
  dueDate: "2026-07-20",
  accountId: "a1",
  accountName: "Cash",
  categoryId: "c1",
  categoryName: "Hóa đơn",
  categoryIcon: null,
  categoryColor: null,
  isArchived: false,
  isPaid: false,
  transactionId: null,
  ...over,
});

test("buildAttentionItems surfaces commitments due within the next 7 days", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [
      baseCommitment({ id: "soon", dueDate: "2026-07-19" }), // today+4
      baseCommitment({ id: "edge", dueDate: "2026-07-22" }), // today+7
      baseCommitment({ id: "far", dueDate: "2026-07-23" }), // today+8 — outside
      baseCommitment({ id: "paid", isPaid: true, transactionId: "t1" }),
      baseCommitment({ id: "arch", isArchived: true }),
    ],
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "bills-upcoming");
  assert.ok(chip, "expected an upcoming chip");
  assert.match(chip!.label, /2 hóa đơn sắp đến hạn/);
  // Due/overdue rows stay in their own chip — no double counting.
  assert.ok(!items.some((i) => i.id === "bill-soon"));
});

test("buildAttentionItems flags a paid commitment whose recorded amount differs", () => {
  const items = buildAttentionItems({
    budgets: [],
    commitments: [
      baseCommitment({ id: "drift", isPaid: true, transactionId: "t-drift" }),
      baseCommitment({ id: "exact", isPaid: true, transactionId: "t-exact" }),
      baseCommitment({ id: "unknown", isPaid: true, transactionId: "t-gone" }),
    ],
    paidAmountByTransactionId: new Map([
      ["t-drift", 600_000], // declared 500k, recorded 600k → drift
      ["t-exact", 500_000],
      // t-gone unreadable → "paid, amount unknown" stays silent (no invent)
    ]),
    today: "2026-07-15",
  });
  const chip = items.find((i) => i.id === "bill-drift");
  assert.ok(chip, "expected a drift chip");
  assert.match(chip!.label, /Internet/);
  assert.match(chip!.label, /600/);
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
