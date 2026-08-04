import assert from "node:assert/strict";
import test from "node:test";
import { resolveBudgetMonth } from "./planning/budgets.ts";

test("the earliest four-digit month is repaired instead of underflowing the comparison window", () => {
  assert.deepEqual(resolveBudgetMonth("0001-01", "2026-08-01"), {
    monthKey: "2026-08",
    monthStart: "2026-08-01",
    monthEnd: "2026-08-31",
    previousMonthStart: "2026-07-01",
    nextMonthStart: "2026-09-01",
    canGoNext: false,
    adjustment: "invalid",
  });
});
