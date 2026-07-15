import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultQuickAddPrefs,
  isQuickAddPrefs,
  orderCategoriesByRecent,
  pushRecentCategoryId,
  todayInVietnam,
} from "./quick-add-prefs.ts";

test("validates prefs shape", () => {
  assert.equal(
    isQuickAddPrefs({
      kind: "expense",
      accountId: "a1",
      categoryId: "c1",
      keepOpen: true,
    }),
    true,
  );
  assert.equal(
    isQuickAddPrefs({
      kind: "expense",
      accountId: "a1",
      categoryId: "c1",
      keepOpen: false,
      recentCategoryIds: ["c1", "c2"],
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
  assert.equal(isQuickAddPrefs({ kind: "transfer" }), false);
  assert.equal(isQuickAddPrefs(null), false);
  assert.equal(isQuickAddPrefs(defaultQuickAddPrefs()), true);
});

test("formats Vietnam calendar date as YYYY-MM-DD", () => {
  // Fixed UTC instant → VN is +7
  const date = new Date("2026-07-14T20:30:00.000Z"); // 2026-07-15 03:30 VN
  assert.equal(todayInVietnam(date), "2026-07-15");
});

test("pushRecentCategoryId keeps newest first and dedupes", () => {
  assert.deepEqual(pushRecentCategoryId([], "c1"), ["c1"]);
  assert.deepEqual(pushRecentCategoryId(["c1", "c2"], "c2"), ["c2", "c1"]);
  assert.deepEqual(pushRecentCategoryId(["c1", "c2"], "c3"), ["c3", "c1", "c2"]);
  const many = pushRecentCategoryId(["a", "b", "c", "d", "e", "f"], "g");
  assert.equal(many.length, 6);
  assert.equal(many[0], "g");
});

test("orderCategoriesByRecent surfaces recent first", () => {
  const cats = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    orderCategoriesByRecent(cats, ["c", "a"]).map((x) => x.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(orderCategoriesByRecent(cats, undefined), cats);
});
