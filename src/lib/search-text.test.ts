import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSearchText } from "./search-text.ts";

test("normalizeSearchText folds Vietnamese diacritics so unaccented typing matches", () => {
  assert.equal(normalizeSearchText("Ăn uống"), "an uong");
  assert.equal(normalizeSearchText("Tiền điện"), "tien dien");
  assert.equal(normalizeSearchText("Đồ dùng cá nhân"), "do dung ca nhan");
});

test("normalizeSearchText folds đ/Đ to d — they carry no NFD decomposition", () => {
  assert.equal(normalizeSearchText("đ"), "d");
  assert.equal(normalizeSearchText("Đ"), "d");
  assert.equal(normalizeSearchText("Đà Nẵng"), "da nang");
});

test("normalizeSearchText keeps case-insensitivity and trims edges", () => {
  assert.equal(normalizeSearchText("  GRAB Đi Làm  "), "grab di lam");
  assert.equal(normalizeSearchText(""), "");
  assert.equal(normalizeSearchText("   "), "");
});

test("normalizeSearchText folds queries typed with diacritics identically", () => {
  assert.equal(normalizeSearchText("uống"), "uong");
  // Precomposed and NFD-decomposed spellings of the same word fold the same.
  assert.equal(
    normalizeSearchText("uống"),
    normalizeSearchText("uống".normalize("NFD")),
  );
});

test("normalizeSearchText keeps substring semantics: 'an' still lands inside 'bàn'", () => {
  assert.ok(normalizeSearchText("bàn").includes(normalizeSearchText("an")));
  assert.ok(!normalizeSearchText("cơm trưa").includes(normalizeSearchText("xổ số")));
});
