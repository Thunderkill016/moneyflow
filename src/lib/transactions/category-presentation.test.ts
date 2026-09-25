import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryMetaFor,
  categoryMetaIndex,
  categoryMeta,
  resolveCategoryMeta,
} from "./category-presentation.ts";

const stored = (
  name: string,
  kind: "expense" | "income",
  icon: string | null,
  color: string | null,
) => ({ name, kind, icon, color });

test("resolveCategoryMeta prefers the stored icon/color over the name-keyed default", () => {
  // A user-edited default keeps its own identity, not the seed palette.
  assert.deepEqual(resolveCategoryMeta("Ăn uống", { icon: "coffee", color: "amber" }), {
    icon: "coffee",
    color: "amber",
  });
});

test("resolveCategoryMeta rejects a stored color outside the palette", () => {
  // Old rows may carry colors written before the palette contract existed —
  // they degrade to the name-keyed default rather than emitting a class that
  // has no stylesheet owner.
  assert.deepEqual(
    resolveCategoryMeta("Ăn uống", { icon: "coffee", color: "chartreuse" }),
    { icon: "coffee", color: "coral" },
  );
});

test("resolveCategoryMeta falls back to the name-keyed default then the generic meta", () => {
  assert.deepEqual(resolveCategoryMeta("Ăn uống"), categoryMeta["Ăn uống"]);
  assert.deepEqual(resolveCategoryMeta("Ăn uống", { icon: null, color: null }), {
    icon: "bowl",
    color: "coral",
  });
  // Unknown category names degrade to the generic meta, never a crash.
  assert.deepEqual(
    resolveCategoryMeta("Danh mục lạ"),
    categoryMeta["Thu nhập khác"],
  );
  assert.deepEqual(resolveCategoryMeta("Danh mục lạ", null), {
    icon: "bank",
    color: "green",
  });
});

test("categoryMetaIndex is keyed by kind so same-name categories keep separate identities", () => {
  const index = categoryMetaIndex([
    stored("Quà tặng", "expense", "gift", "pink"),
    stored("Quà tặng", "income", "coins", "green"),
  ]);

  assert.deepEqual(categoryMetaFor(index, "expense", "Quà tặng"), {
    icon: "gift",
    color: "pink",
  });
  assert.deepEqual(categoryMetaFor(index, "income", "Quà tặng"), {
    icon: "coins",
    color: "green",
  });
});

test("categoryMetaFor falls back to defaults for names not in the index", () => {
  const index = categoryMetaIndex([
    stored("Cà phê", "expense", "coffee", "amber"),
  ]);

  // Unknown name with stored entry.
  assert.deepEqual(categoryMetaFor(index, "expense", "Cà phê"), {
    icon: "coffee",
    color: "amber",
  });
  // Default name not stored in the index falls back to the name-keyed meta.
  assert.deepEqual(
    categoryMetaFor(index, "expense", "Ăn uống"),
    categoryMeta["Ăn uống"],
  );
  // The virtual transfer row keeps its neutral arrows identity.
  assert.deepEqual(
    categoryMetaFor(index, "transfer", "Chuyển tiền"),
    categoryMeta["Chuyển tiền"],
  );
  // Fully unknown names fall back to the generic meta.
  assert.deepEqual(
    categoryMetaFor(index, "expense", "Không tồn tại"),
    categoryMeta["Thu nhập khác"],
  );
});
