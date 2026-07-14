import assert from "node:assert/strict";
import test from "node:test";
import {
  activeCategories,
  defaultCategoryMeta,
  isCategoryNameUnique,
  isValidCategoryName,
  normalizeCategoryName,
  validateSaveCategory,
  type CategorySummary,
} from "./categories.ts";

const seed: CategorySummary[] = [
  {
    id: "e1",
    name: "Ăn uống",
    kind: "expense",
    icon: "bowl",
    color: "coral",
    isDefault: true,
    isArchived: false,
  },
  {
    id: "i1",
    name: "Lương",
    kind: "income",
    icon: "wallet",
    color: "green",
    isDefault: true,
    isArchived: false,
  },
  {
    id: "e2",
    name: "Cafe",
    kind: "expense",
    icon: null,
    color: null,
    isDefault: false,
    isArchived: true,
  },
];

test("normalizeCategoryName trims and collapses spaces", () => {
  assert.equal(normalizeCategoryName("  Ăn  uống  "), "Ăn uống");
  assert.equal(normalizeCategoryName("\tLương\n"), "Lương");
});

test("isValidCategoryName rejects empty and over-long", () => {
  assert.equal(isValidCategoryName(""), false);
  assert.equal(isValidCategoryName("   "), false);
  assert.equal(isValidCategoryName("Ăn uống"), true);
  assert.equal(isValidCategoryName("a".repeat(60)), true);
  assert.equal(isValidCategoryName("a".repeat(61)), false);
});

test("name unique per kind — same name allowed across income vs expense", () => {
  assert.equal(isCategoryNameUnique("Ăn uống", "expense", seed), false);
  assert.equal(isCategoryNameUnique("Ăn uống", "income", seed), true);
  assert.equal(isCategoryNameUnique("Lương", "income", seed), false);
  assert.equal(isCategoryNameUnique("Lương", "expense", seed), true);
});

test("name unique includes archived categories", () => {
  assert.equal(isCategoryNameUnique("Cafe", "expense", seed), false);
});

test("rename may keep own name", () => {
  assert.equal(isCategoryNameUnique("Ăn uống", "expense", seed, "e1"), true);
  assert.equal(isCategoryNameUnique("Cafe", "expense", seed, "e2"), true);
});

test("validateSaveCategory success and uniqueness error", () => {
  const ok = validateSaveCategory(
    { name: "  Di chuyển  ", kind: "expense" },
    seed,
  );
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.name, "Di chuyển");

  const dup = validateSaveCategory({ name: "Ăn uống", kind: "expense" }, seed);
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.match(dup.message, /cùng tên/);
});

test("activeCategories filters archived", () => {
  assert.deepEqual(
    activeCategories(seed).map((item) => item.id),
    ["e1", "i1"],
  );
});

test("defaultCategoryMeta differs by kind", () => {
  assert.equal(defaultCategoryMeta("income").color, "green");
  assert.equal(defaultCategoryMeta("expense").icon, "spark");
});
