import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSpendingPace,
  SPENDING_PACE_LABELS,
  spendingPaceExplanation,
} from "./spending-pace.ts";

test("pace is unavailable without a trustworthy positive integer plan", () => {
  assert.equal(calculateSpendingPace({ spent: 0, budget: 0, today: "2026-07-15" }), null);
  assert.equal(calculateSpendingPace({ spent: -1, budget: 1_000_000, today: "2026-07-15" }), null);
  assert.equal(calculateSpendingPace({ spent: 1, budget: 1.5, today: "2026-07-15" }), null);
  assert.equal(calculateSpendingPace({ spent: 1, budget: 1_000_000, today: "2026-02-30" }), null);
});

test("pace reports remaining room when spending is well behind elapsed time", () => {
  const pace = calculateSpendingPace({
    spent: 900_000,
    budget: 3_000_000,
    today: "2026-07-20",
  });

  assert.ok(pace);
  assert.equal(pace.status, "ahead");
  assert.equal(pace.elapsedPercent, 65);
  assert.equal(pace.spentPercent, 30);
  assert.equal(SPENDING_PACE_LABELS[pace.status], "Còn dư nhịp");
});

test("pace stays on track inside the five percentage point tolerance", () => {
  const pace = calculateSpendingPace({
    spent: 1_500_000,
    budget: 3_000_000,
    today: "2026-07-15",
  });

  assert.ok(pace);
  assert.equal(pace.elapsedPercent, 48);
  assert.equal(pace.spentPercent, 50);
  assert.equal(pace.deltaPercentagePoints, 2);
  assert.equal(pace.status, "on-track");
  assert.equal(spendingPaceExplanation(pace), "Đã dùng 50% kế hoạch khi tháng đã đi qua 48%.");
});

test("pace uses a calm watch state before declaring a large deviation", () => {
  const pace = calculateSpendingPace({
    spent: 1_800_000,
    budget: 3_000_000,
    today: "2026-07-15",
  });

  assert.ok(pace);
  assert.equal(pace.deltaPercentagePoints, 12);
  assert.equal(pace.status, "watch");
  assert.equal(SPENDING_PACE_LABELS[pace.status], "Hơi nhanh");
});

test("pace flags a material deviation without guilt language", () => {
  const pace = calculateSpendingPace({
    spent: 2_400_000,
    budget: 3_000_000,
    today: "2026-07-15",
  });

  assert.ok(pace);
  assert.equal(pace.deltaPercentagePoints, 32);
  assert.equal(pace.status, "over");
  assert.equal(SPENDING_PACE_LABELS[pace.status], "Nhanh hơn kế hoạch");
});

test("remaining daily amount is an integer and never negative", () => {
  const pace = calculateSpendingPace({
    spent: 1_550_000,
    budget: 3_100_000,
    today: "2026-07-16",
  });
  assert.ok(pace);
  assert.equal(pace.remainingDays, 16);
  assert.equal(pace.remainingBudget, 1_550_000);
  assert.equal(pace.remainingPerDay, 96_875);
  assert.ok(Number.isSafeInteger(pace.remainingPerDay));

  const overspent = calculateSpendingPace({
    spent: 3_200_000,
    budget: 3_100_000,
    today: "2026-07-16",
  });
  assert.ok(overspent);
  assert.equal(overspent.remainingBudget, 0);
  assert.equal(overspent.remainingPerDay, 0);
});
