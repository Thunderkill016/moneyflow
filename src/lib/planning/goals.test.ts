import assert from "node:assert/strict";
import test from "node:test";
import {
  dailyGoalSaving,
  goalProgress,
  goalRemaining,
  goalTotals,
  pickFeaturedGoal,
  type SavingsGoal,
} from "./goals.ts";

const goal: SavingsGoal = {
  id: "goal",
  name: "Quỹ khẩn cấp",
  target: 3_000_000,
  allocated: 1_000_000,
  deadline: "2026-07-24",
  isArchived: false,
};

test("goal progress is bounded", () => {
  assert.equal(goalProgress(goal), 33);
  assert.equal(goalProgress({ ...goal, allocated: 4_000_000 }), 100);
});

test("goal remaining is never negative", () => {
  assert.equal(goalRemaining(goal), 2_000_000);
  assert.equal(goalRemaining({ ...goal, allocated: 4_000_000 }), 0);
});

test("daily saving uses the remaining target and deadline", () => {
  assert.equal(dailyGoalSaving(goal, "2026-07-14"), 200_000);
  assert.equal(dailyGoalSaving({ ...goal, deadline: null }, "2026-07-14"), 0);
});

test("archived goals do not reserve money or daily plans", () => {
  assert.deepEqual(
    goalTotals([goal, { ...goal, id: "archived", isArchived: true }], "2026-07-14"),
    { target: 3_000_000, allocated: 1_000_000, plannedDaily: 200_000 },
  );
});

test("pickFeaturedGoal returns null when empty or all archived", () => {
  assert.equal(pickFeaturedGoal([]), null);
  assert.equal(pickFeaturedGoal([{ ...goal, isArchived: true }]), null);
});

test("pickFeaturedGoal prefers highest progress among active goals", () => {
  const low: SavingsGoal = {
    ...goal,
    id: "low",
    name: "Laptop",
    allocated: 500_000,
    target: 10_000_000,
  };
  const high: SavingsGoal = {
    ...goal,
    id: "high",
    name: "Du lịch",
    allocated: 3_000_000,
    target: 10_000_000,
  };
  const archived: SavingsGoal = {
    ...goal,
    id: "arch",
    name: "Done",
    allocated: 10_000_000,
    target: 10_000_000,
    isArchived: true,
  };
  const featured = pickFeaturedGoal([low, high, archived]);
  assert.equal(featured?.id, "high");
  assert.equal(goalProgress(featured!), 30);
});

test("pickFeaturedGoal tie-breaks by sooner deadline", () => {
  const a: SavingsGoal = {
    ...goal,
    id: "a",
    name: "A",
    allocated: 1_000_000,
    target: 2_000_000,
    deadline: "2026-12-01",
  };
  const b: SavingsGoal = {
    ...goal,
    id: "b",
    name: "B",
    allocated: 1_000_000,
    target: 2_000_000,
    deadline: "2026-08-01",
  };
  assert.equal(pickFeaturedGoal([a, b])?.id, "b");
});
