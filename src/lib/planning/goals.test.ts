import assert from "node:assert/strict";
import test from "node:test";
import {
  countGoalPaceAttention,
  dailyGoalSaving,
  expectedAllocatedByNow,
  type GoalAllocation,
  goalFundingInWindow,
  goalIsOverdue,
  goalPaceStartDate,
  goalPaceStatus,
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
  createdAt: "2026-07-01",
  isArchived: false,
};

test("goal progress is bounded", () => {
  assert.equal(goalProgress(goal), 33);
  assert.equal(goalProgress({ ...goal, allocated: 4_000_000 }), 100);
});

test("goal progress never claims 100 while money is still missing", () => {
  // 2_990_000 / 3_000_000 = 99.67% — rounding would claim completion and
  // disable the allocate action while "Còn thiếu" is still positive.
  assert.equal(goalProgress({ ...goal, allocated: 2_990_000 }), 99);
  assert.equal(goalProgress({ ...goal, allocated: 3_000_000 }), 100);
});

test("overdue goals have no invented daily pace", () => {
  assert.equal(dailyGoalSaving(goal, "2026-07-25"), 0);
  assert.equal(goalIsOverdue(goal, "2026-07-25"), true);
  assert.equal(goalIsOverdue(goal, "2026-07-24"), false);
  assert.equal(goalIsOverdue({ ...goal, deadline: null }, "2026-07-25"), false);
  assert.equal(
    goalIsOverdue({ ...goal, allocated: 3_000_000 }, "2026-07-25"),
    false,
    "a fully funded goal is achieved, not overdue",
  );
  assert.equal(goalIsOverdue({ ...goal, isArchived: true }, "2026-07-25"), false);
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

const allocation = (
  amount: number,
  createdAt: string,
  goalId = "goal",
): GoalAllocation => ({ goalId, amount, createdAt });

test("funding window sums only positive marks on the goal inside the window", () => {
  const allocations = [
    allocation(500_000, "2026-07-10"),
    allocation(200_000, "2026-07-14"),
    allocation(300_000, "2026-06-15"), // before the 30-day window (starts 06-16)
    allocation(-100_000, "2026-07-12"), // a release is not a "đánh dấu"
    allocation(900_000, "2026-07-11", "other-goal"),
  ];
  assert.deepEqual(
    goalFundingInWindow(goal, allocations, "2026-07-15", 30),
    { total: 700_000, count: 2 },
  );
});

test("funding window includes today and the exact window start", () => {
  const allocations = [
    allocation(100_000, "2026-07-15"),
    allocation(50_000, "2026-06-16"), // 30 days ending 2026-07-15 starts 06-16
    allocation(25_000, "2026-06-15"),
  ];
  assert.deepEqual(
    goalFundingInWindow(goal, allocations, "2026-07-15", 30),
    { total: 150_000, count: 2 },
  );
});

test("pace start prefers creation date and falls back to earliest allocation", () => {
  assert.equal(goalPaceStartDate(goal, []), "2026-07-01");
  assert.equal(
    goalPaceStartDate({ ...goal, createdAt: null }, [
      allocation(100_000, "2026-07-05"),
      allocation(200_000, "2026-07-03"),
    ]),
    "2026-07-03",
  );
  assert.equal(goalPaceStartDate({ ...goal, createdAt: null }, []), null);
});

test("expected allocation is the linear share clamped to [0, target]", () => {
  // created 07-01, deadline 07-24 → 23-day plan; 13 days elapsed by 07-14.
  assert.equal(
    expectedAllocatedByNow(goal, "2026-07-14", "2026-07-01"),
    Math.floor((13 / 23) * 3_000_000),
  );
  assert.equal(expectedAllocatedByNow(goal, "2026-07-01", "2026-07-01"), 0);
  assert.equal(
    expectedAllocatedByNow(goal, "2026-08-01", "2026-07-01"),
    3_000_000,
    "past the deadline the linear plan saturates at the target",
  );
});

test("expected allocation withholds when there is no honest slope", () => {
  assert.equal(
    expectedAllocatedByNow({ ...goal, deadline: null }, "2026-07-14", "2026-07-01"),
    null,
  );
  assert.equal(expectedAllocatedByNow(goal, "2026-07-14", null), null);
  assert.equal(
    expectedAllocatedByNow(goal, "2026-07-14", "2026-07-24"),
    null,
    "deadline on the start date is a zero-length plan",
  );
});

test("pace status withholds without a deadline, anchor, or remaining need", () => {
  const today = "2026-07-14";
  assert.equal(goalPaceStatus({ ...goal, deadline: null }, today, []), null);
  assert.equal(
    goalPaceStatus({ ...goal, createdAt: null }, today, []),
    null,
    "no creation date and no allocation history means no pace claim",
  );
  assert.equal(
    goalPaceStatus({ ...goal, allocated: 3_000_000 }, today, []),
    null,
    "a fully funded goal is achieved, not paced",
  );
  assert.equal(goalPaceStatus({ ...goal, isArchived: true }, today, []), null);
});

test("pace status compares the mark against the even-pace expectation", () => {
  // expected ≈ 1,695,652 against 1,000,000 marked → behind by ≈ 695,652.
  const behind = goalPaceStatus(goal, "2026-07-14", []);
  assert.equal(behind?.state, "behind");
  assert.equal(behind?.expected, Math.floor((13 / 23) * 3_000_000));
  assert.equal(behind?.actual, 1_000_000);
  assert.equal(behind?.delta, 1_000_000 - behind!.expected);

  const onTrack = goalPaceStatus(
    { ...goal, allocated: Math.floor((13 / 23) * 3_000_000) },
    "2026-07-14",
    [],
  );
  assert.equal(onTrack?.state, "on-track");

  const ahead = goalPaceStatus({ ...goal, allocated: 2_500_000 }, "2026-07-14", []);
  assert.equal(ahead?.state, "ahead");

  const late = goalPaceStatus(goal, "2026-07-25", []);
  assert.equal(late?.state, "past-deadline");
  assert.equal(late?.expected, 3_000_000);
});

test("pace start can come from the earliest allocation when creation is unknown", () => {
  const pace = goalPaceStatus({ ...goal, createdAt: null }, "2026-07-14", [
    allocation(100_000, "2026-07-05"),
    allocation(200_000, "2026-07-03"),
    allocation(50_000, "2026-07-01", "other-goal"),
  ]);
  // 11 days into a 21-day plan → expected floor(11/21 × 3,000,000) = 1,571,428.
  assert.equal(pace?.expected, 1_571_428);
  assert.equal(pace?.state, "behind");
});

test("pace attention counts overdue and behind goals without goal objects", () => {
  const behindGoal: SavingsGoal = { ...goal, id: "behind" };
  const overdueGoal: SavingsGoal = {
    ...goal,
    id: "overdue",
    deadline: "2026-07-10",
  };
  const onTrackGoal: SavingsGoal = {
    ...goal,
    id: "ok",
    allocated: Math.floor((13 / 23) * 3_000_000),
  };
  const anchored: SavingsGoal = { ...goal, id: "no-anchor", createdAt: null };
  const achieved: SavingsGoal = { ...goal, id: "done", allocated: 3_000_000 };
  assert.equal(
    countGoalPaceAttention(
      [behindGoal, overdueGoal, onTrackGoal, anchored, achieved],
      "2026-07-14",
    ),
    2,
  );
});
