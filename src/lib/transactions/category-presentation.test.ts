import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_ICON_NAMES,
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

test("archived categories keep their stored identity in the meta index", () => {
  /*
   * Regression: loaders that feed presentation indexes must include archived
   * rows — a historical transaction still points at a category the user
   * archived, and dropping it would silently re-derive the name-keyed look.
   */
  const archivedRow = {
    ...stored("Quà cũ", "expense", "gift", "pink"),
    isArchived: true,
  };
  const index = categoryMetaIndex([
    stored("Ăn uống", "expense", "coffee", "amber"),
    archivedRow,
  ]);

  assert.deepEqual(categoryMetaFor(index, "expense", "Quà cũ"), {
    icon: "gift",
    color: "pink",
  });
});

test("resolveCategoryMeta honors feed-carried icon/color and the caller fallback", () => {
  /*
   * Planning feeds join category_icon/category_color per row, so an archived
   * category keeps its identity without any index at all.
   */
  assert.deepEqual(
    resolveCategoryMeta("Quà cũ", { icon: "gift", color: "pink" }),
    { icon: "gift", color: "pink" },
  );
  // Feed fields are null only when no category is linked — the surface's own
  // fallback still beats the generic meta.
  assert.deepEqual(
    resolveCategoryMeta("Quà cũ", { icon: null, color: null }, {
      icon: "receipt",
      color: "cyan",
    }),
    { icon: "receipt", color: "cyan" },
  );
  // A known name keeps its name-keyed default before the caller fallback.
  assert.deepEqual(
    resolveCategoryMeta("Ăn uống", null, { icon: "receipt", color: "cyan" }),
    { icon: "bowl", color: "coral" },
  );
});

test("CATEGORY_ICON_NAMES covers the writable set without internal glyphs", () => {
  // "plus" is the seeded "Thu nhập khác" icon — writable for legacy rows even
  // though the picker no longer offers it. "arrows" is internal-only for the
  // virtual transfer row and must never be persisted.
  assert.ok((CATEGORY_ICON_NAMES as readonly string[]).includes("plus"));
  assert.ok(!(CATEGORY_ICON_NAMES as readonly string[]).includes("arrows"));
  assert.ok(new Set(CATEGORY_ICON_NAMES).size === CATEGORY_ICON_NAMES.length);
});
