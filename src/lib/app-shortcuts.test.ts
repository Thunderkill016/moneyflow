import assert from "node:assert/strict";
import test from "node:test";
import { isSearchShortcut, shouldIgnoreShortcutTarget } from "./app-shortcuts.ts";

test("isSearchShortcut matches Cmd/Ctrl+K", () => {
  assert.equal(isSearchShortcut({ key: "k", metaKey: true }), true);
  assert.equal(isSearchShortcut({ key: "K", ctrlKey: true }), true);
  assert.equal(isSearchShortcut({ key: "k" }), false);
  assert.equal(isSearchShortcut({ key: "k", metaKey: true, altKey: true }), false);
  assert.equal(isSearchShortcut({ key: "j", metaKey: true }), false);
});

test("shouldIgnoreShortcutTarget blocks generic text inputs", () => {
  // jsdom may be absent — use minimal element shims via happy path only when document exists
  if (typeof document === "undefined") {
    assert.equal(shouldIgnoreShortcutTarget(null), false);
    return;
  }
  const amount = document.createElement("input");
  amount.type = "text";
  assert.equal(shouldIgnoreShortcutTarget(amount), true);

  const search = document.createElement("input");
  search.setAttribute("data-app-search", "true");
  assert.equal(shouldIgnoreShortcutTarget(search), false);

  const ta = document.createElement("textarea");
  assert.equal(shouldIgnoreShortcutTarget(ta), true);
});
