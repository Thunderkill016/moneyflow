import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDisplayName, resolveDisplayName } from "./profile.ts";

test("prefers the saved profile display name", () => {
  assert.equal(resolveDisplayName("  Nguyễn   Minh Anh  ", { full_name: "Tên Google" }), "Nguyễn Minh Anh");
});

test("falls back to common Google metadata fields", () => {
  assert.equal(resolveDisplayName("", { full_name: "Nguyễn Google" }), "Nguyễn Google");
  assert.equal(resolveDisplayName(null, { name: "Tên Google" }), "Tên Google");
  assert.equal(resolveDisplayName(null, {}), null);
});

test("normalizes and bounds untrusted profile names", () => {
  assert.equal(normalizeDisplayName("   "), null);
  assert.equal(normalizeDisplayName("a".repeat(100))?.length, 80);
});
