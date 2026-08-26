import assert from "node:assert/strict";
import test from "node:test";
import type { RecurringCommitment } from "./commitments.ts";
import type { SavingsGoal } from "./goals.ts";
import {
  fundableIntoGoals,
  reserveExplanation,
  reservePicture,
  reservePictureFromTotals,
} from "./reserve.ts";

function bill(amount: number, overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: `bill-${amount}`,
    name: "Tiền nhà",
    amount,
    dueDay: 5,
    dueDate: "2026-08-05",
    accountId: "acc-bank",
    accountName: "Ngân hàng",
    categoryId: "cat-rent",
    categoryName: "Nhà ở",
    categoryIcon: null,
    categoryColor: null,
    isArchived: false,
    isPaid: false,
    transactionId: null,
    ...overrides,
  };
}

function goal(allocated: number, overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: `goal-${allocated}`,
    name: "Quỹ khẩn cấp",
    target: 10_000_000,
    allocated,
    deadline: null,
    isArchived: false,
    ...overrides,
  };
}

test("unreserved is balance minus bills minus what goals already hold", () => {
  const picture = reservePicture({
    balance: 10_000_000,
    commitments: [bill(3_000_000)],
    goals: [goal(2_000_000)],
  });

  assert.equal(picture.protectedForBills, 3_000_000);
  assert.equal(picture.spendableAfterBills, 7_000_000);
  assert.equal(picture.reservedForGoals, 2_000_000);
  assert.equal(picture.unreserved, 5_000_000);
});

/*
 * The clamp order is mirrored from the SQL and is not cosmetic. `greatest(0, …)`
 * applies to balance-minus-bills BEFORE goals are subtracted. Clamping after
 * would let bills larger than the balance make goal-reserved money look
 * available, and the RPC would then refuse an allocation the screen had just
 * promised.
 */
test("bills larger than the balance clamp to zero before goals are subtracted", () => {
  const picture = reservePicture({
    balance: 2_000_000,
    commitments: [bill(5_000_000)],
    goals: [goal(1_000_000)],
  });

  assert.equal(picture.spendableAfterBills, 0, "clamp must apply before goals");
  assert.equal(picture.unreserved, -1_000_000);
  assert.equal(fundableIntoGoals(picture), 0);
});

test("a shortfall is shown rather than clamped away", () => {
  const picture = reservePicture({
    balance: 4_000_000,
    commitments: [],
    goals: [goal(6_000_000)],
  });

  assert.equal(picture.unreserved, -2_000_000);
  assert.equal(fundableIntoGoals(picture), 0);
});

test("paid and archived bills protect nothing", () => {
  const picture = reservePicture({
    balance: 10_000_000,
    commitments: [
      bill(3_000_000, { isPaid: true, transactionId: "txn-1" }),
      bill(2_000_000, { isArchived: true }),
      bill(1_000_000),
    ],
    goals: [],
  });

  assert.equal(picture.protectedForBills, 1_000_000);
  assert.equal(picture.unreserved, 9_000_000);
});

test("archived goals reserve nothing", () => {
  const picture = reservePicture({
    balance: 10_000_000,
    commitments: [],
    goals: [goal(2_000_000), goal(5_000_000, { isArchived: true })],
  });

  assert.equal(picture.reservedForGoals, 2_000_000);
  assert.equal(picture.unreserved, 8_000_000);
});

test("nothing recorded leaves the whole balance free", () => {
  const picture = reservePicture({ balance: 10_000_000, commitments: [], goals: [] });

  assert.equal(picture.unreserved, 10_000_000);
  assert.equal(fundableIntoGoals(picture), 10_000_000);
});

test("an unsafe balance is refused rather than reported", () => {
  assert.throws(
    () => reservePicture({ balance: 1.5, commitments: [], goals: [] }),
    /unsafe_balance/u,
  );
});

/*
 * The agreement this feature lives or dies on. `adjust_savings_goal` accepts an
 * amount only when
 *
 *     total_allocated + amount <= greatest(0, balance - unpaid_commitments)
 *
 * so the largest acceptable amount is exactly `fundableIntoGoals`. Showing a
 * figure the RPC would then reject would prove the numbers cannot be trusted,
 * which is the one claim the product rests on. This re-implements the RPC's
 * predicate and asserts the boundary from both sides.
 */
test("the shown figure is exactly what the RPC will accept", () => {
  const balance = 10_000_000;
  const commitments = [bill(3_000_000)];
  const goals = [goal(2_000_000)];
  const picture = reservePicture({ balance, commitments, goals });
  const fundable = fundableIntoGoals(picture);

  const rpcAccepts = (amount: number) => {
    const totalAllocated = goals
      .filter((item) => !item.isArchived)
      .reduce((sum, item) => sum + item.allocated, 0);
    const recurringReserved = commitments
      .filter((item) => !item.isArchived && !item.isPaid)
      .reduce((sum, item) => sum + item.amount, 0);
    return totalAllocated + amount <= Math.max(0, balance - recurringReserved);
  };

  assert.equal(fundable, 5_000_000);
  assert.ok(rpcAccepts(fundable), "the exact shown amount must go through");
  assert.ok(!rpcAccepts(fundable + 1), "one đồng more must be refused");
});

test("funding a goal immediately reduces what is still free", () => {
  const inputs = { balance: 10_000_000, protectedForBills: 3_000_000 };
  const before = reservePictureFromTotals({ ...inputs, goals: [goal(2_000_000)] });
  const after = reservePictureFromTotals({ ...inputs, goals: [goal(4_000_000)] });

  assert.equal(before.unreserved, 5_000_000);
  assert.equal(after.unreserved, 3_000_000);
});

test("both entry points agree on the same inputs", () => {
  const commitments = [bill(3_000_000), bill(1_000_000, { isPaid: true, transactionId: "t" })];
  const goals = [goal(2_000_000)];

  assert.deepEqual(
    reservePicture({ balance: 10_000_000, commitments, goals }),
    reservePictureFromTotals({ balance: 10_000_000, protectedForBills: 3_000_000, goals }),
  );
});

test("the explanation names every operand and never advises", () => {
  const forbidden =
    /nên|đừng|hãy|cảnh báo|vượt mức|tiết kiệm được|cắt giảm|quá nhiều|hạn chế|khuyên|cẩn thận|coi chừng/iu;

  const normal = reserveExplanation(
    reservePictureFromTotals({
      balance: 10_000_000,
      protectedForBills: 3_000_000,
      goals: [goal(2_000_000)],
    }),
  );
  assert.match(normal, /10\.000\.000/u);
  assert.match(normal, /3\.000\.000/u);
  assert.match(normal, /2\.000\.000/u);

  const shortfall = reserveExplanation(
    reservePictureFromTotals({ balance: 4_000_000, protectedForBills: 0, goals: [goal(6_000_000)] }),
  );
  const empty = reserveExplanation(
    reservePictureFromTotals({ balance: 5_000_000, protectedForBills: 0, goals: [] }),
  );

  assert.match(shortfall, /ít hơn/u);
  assert.match(empty, /chưa có hoá đơn/u);
  for (const text of [normal, shortfall, empty]) {
    assert.ok(!forbidden.test(text), `advisory wording leaked: ${text}`);
  }
});
