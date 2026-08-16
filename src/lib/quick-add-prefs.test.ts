import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultQuickAddPrefs,
  isQuickAddPrefs,
  isRecentCategoryId,
  orderCategoriesByRecent,
  pickCategoryForKind,
  pickKnownCategoryForKind,
  pushRecentCategoryId,
  pushRecentPreset,
} from "./quick-add-prefs.ts";

test("validates prefs shape", () => {
  assert.equal(
    isQuickAddPrefs({ kind: "expense", accountId: "a1", categoryId: "c1", keepOpen: true }),
    true,
  );
  assert.equal(
    isQuickAddPrefs({
      kind: "expense",
      accountId: "a1",
      categoryId: "c1",
      keepOpen: false,
      recentCategoryIds: ["c1", "c2"],
      recentPresets: [
        { kind: "expense", accountId: "a1", categoryId: "c1" },
        { kind: "income", accountId: "a2", categoryId: "c2" },
      ],
    }),
    true,
  );
  assert.equal(
    isQuickAddPrefs({
      kind: "expense",
      accountId: "a1",
      categoryId: "c1",
      keepOpen: false,
      recentCategoryIds: [1 as unknown as string],
    }),
    false,
  );
  assert.equal(
    isQuickAddPrefs({
      kind: "expense",
      accountId: "a1",
      categoryId: "c1",
      keepOpen: false,
      recentPresets: [{ kind: "expense", accountId: "", categoryId: "c1" }],
    }),
    false,
  );
  assert.equal(isQuickAddPrefs({ kind: "transfer" }), false);
  assert.equal(isQuickAddPrefs(null), false);
  assert.equal(isQuickAddPrefs(defaultQuickAddPrefs()), true);
});

test("pushRecentCategoryId keeps newest first and dedupes", () => {
  assert.deepEqual(pushRecentCategoryId([], "c1"), ["c1"]);
  assert.deepEqual(pushRecentCategoryId(["c1", "c2"], "c2"), ["c2", "c1"]);
  assert.deepEqual(pushRecentCategoryId(["c1", "c2"], "c3"), ["c3", "c1", "c2"]);
  const many = pushRecentCategoryId(["a", "b", "c", "d", "e", "f"], "g");
  assert.equal(many.length, 6);
  assert.equal(many[0], "g");
});

test("pushRecentPreset keeps coherent newest account/category pairs", () => {
  const expenseCash = { kind: "expense" as const, accountId: "cash", categoryId: "food" };
  const expenseCard = { kind: "expense" as const, accountId: "card", categoryId: "food" };
  const incomeCash = { kind: "income" as const, accountId: "cash", categoryId: "salary" };

  assert.deepEqual(pushRecentPreset([], expenseCash), [expenseCash]);
  assert.deepEqual(pushRecentPreset([expenseCash, incomeCash], expenseCard), [
    expenseCard,
    expenseCash,
    incomeCash,
  ]);
  assert.deepEqual(pushRecentPreset([expenseCash, expenseCard], expenseCash), [
    expenseCash,
    expenseCard,
  ]);
  assert.equal(
    pushRecentPreset(
      [
        expenseCash,
        expenseCard,
        incomeCash,
        { kind: "expense", accountId: "a4", categoryId: "c4" },
        { kind: "expense", accountId: "a5", categoryId: "c5" },
        { kind: "expense", accountId: "a6", categoryId: "c6" },
      ],
      { kind: "expense", accountId: "a7", categoryId: "c7" },
    ).length,
    6,
  );
});

test("orderCategoriesByRecent surfaces recent first", () => {
  const cats = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(orderCategoriesByRecent(cats, ["c", "a"]).map((x) => x.id), ["c", "a", "b"]);
  assert.deepEqual(orderCategoriesByRecent(cats, undefined), cats);
  assert.deepEqual(orderCategoriesByRecent(cats, ["x", "b"]).map((x) => x.id), ["b", "a", "c"]);
});

test("pickKnownCategoryForKind uses only established choices", () => {
  const cats = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(pickKnownCategoryForKind([], ["a"], "a"), "");
  assert.equal(pickKnownCategoryForKind(cats, undefined, undefined), "");
  assert.equal(pickKnownCategoryForKind(cats, ["c", "b"], "b"), "b");
  assert.equal(pickKnownCategoryForKind(cats, ["x", "c", "a"], "missing"), "c");
  assert.equal(pickKnownCategoryForKind(cats, ["x"], undefined), "");
});

test("legacy pickCategoryForKind still permits an intentional taxonomy fallback", () => {
  const cats = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(pickCategoryForKind([], ["a"], "a"), "");
  assert.equal(pickCategoryForKind(cats, undefined, undefined), "a");
  assert.equal(pickCategoryForKind(cats, ["c", "b"], "b"), "b");
  assert.equal(pickCategoryForKind(cats, ["x", "c", "a"], "missing"), "c");
  assert.equal(pickCategoryForKind(cats, ["x"], undefined), "a");
});

test("isRecentCategoryId marks ordered recent set", () => {
  assert.equal(isRecentCategoryId("c1", ["c1", "c2"]), true);
  assert.equal(isRecentCategoryId("c3", ["c1", "c2"]), false);
  assert.equal(isRecentCategoryId("c1", undefined), false);
  assert.equal(isRecentCategoryId("c1", []), false);
});
