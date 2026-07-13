import assert from "node:assert/strict";
import test from "node:test";
import { dailyGoalSaving, goalProgress, goalTotals, type SavingsGoal } from "./goals.ts";

const goal: SavingsGoal = { id: "goal", name: "Quỹ khẩn cấp", target: 3_000_000, allocated: 1_000_000, deadline: "2026-07-24", isArchived: false };

test("goal progress is bounded", () => {
  assert.equal(goalProgress(goal), 33);
  assert.equal(goalProgress({ ...goal, allocated: 4_000_000 }), 100);
});

test("daily saving uses the remaining target and deadline", () => {
  assert.equal(dailyGoalSaving(goal, "2026-07-14"), 200_000);
  assert.equal(dailyGoalSaving({ ...goal, deadline: null }, "2026-07-14"), 0);
});

test("archived goals do not reserve money or daily plans", () => {
  assert.deepEqual(goalTotals([goal, { ...goal, id: "archived", isArchived: true }], "2026-07-14"), { target: 3_000_000, allocated: 1_000_000, plannedDaily: 200_000 });
});
