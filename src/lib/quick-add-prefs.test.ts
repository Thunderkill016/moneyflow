import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultQuickAddPrefs,
  isQuickAddPrefs,
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
  assert.equal(isQuickAddPrefs({ kind: "transfer" }), false);
  assert.equal(isQuickAddPrefs(null), false);
  assert.equal(isQuickAddPrefs(defaultQuickAddPrefs()), true);
});

test("formats Vietnam calendar date as YYYY-MM-DD", () => {
  // Fixed UTC instant → VN is +7
  const date = new Date("2026-07-14T20:30:00.000Z"); // 2026-07-15 03:30 VN
  assert.equal(todayInVietnam(date), "2026-07-15");
});
