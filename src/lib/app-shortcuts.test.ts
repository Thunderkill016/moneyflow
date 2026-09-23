import assert from "node:assert/strict";
import test from "node:test";
import { isEditableKeyboardTarget } from "./keyboard.ts";
import {
  isSearchShortcut,
  isSlashSearchShortcut,
  pathnameOwnsSlashSearch,
  shouldIgnoreShortcutTarget,
  TRANSACTIONS_SEARCH_HREF,
  wantsLedgerSearchFocus,
} from "./app-shortcuts.ts";

test("isSearchShortcut matches Cmd/Ctrl+K", () => {
  assert.equal(isSearchShortcut({ key: "k", metaKey: true }), true);
  assert.equal(isSearchShortcut({ key: "K", ctrlKey: true }), true);
  assert.equal(isSearchShortcut({ key: "k" }), false);
  assert.equal(isSearchShortcut({ key: "k", metaKey: true, altKey: true }), false);
  assert.equal(isSearchShortcut({ key: "j", metaKey: true }), false);
});

test("isSlashSearchShortcut matches a bare '/' only", () => {
  assert.equal(isSlashSearchShortcut({ key: "/" }), true);
  assert.equal(isSlashSearchShortcut({ key: "/", metaKey: true }), false);
  assert.equal(isSlashSearchShortcut({ key: "/", ctrlKey: true }), false);
  assert.equal(isSlashSearchShortcut({ key: "/", altKey: true }), false);
  assert.equal(isSlashSearchShortcut({ key: "k" }), false);
});

test("pathnameOwnsSlashSearch yields only to the ledger workspace", () => {
  assert.equal(pathnameOwnsSlashSearch("/transactions"), true);
  assert.equal(pathnameOwnsSlashSearch("/transactions/trash"), false);
  assert.equal(pathnameOwnsSlashSearch("/timeline"), false);
  assert.equal(pathnameOwnsSlashSearch("/inbox"), false);
});

test("TRANSACTIONS_SEARCH_HREF and wantsLedgerSearchFocus (R5)", () => {
  assert.equal(TRANSACTIONS_SEARCH_HREF, "/transactions?focus=search");
  assert.equal(wantsLedgerSearchFocus("?focus=search"), true);
  assert.equal(wantsLedgerSearchFocus({ get: (n) => (n === "focus" ? "search" : null) }), true);
  assert.equal(wantsLedgerSearchFocus("?focus=other"), false);
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

test("'/' guard seam: app search fields stay editable for printable keys", () => {
  // ⌘K is allowed to re-focus the app search input, but "/" is real text —
  // the slash path must use isEditableKeyboardTarget so typing "/" into a
  // search field is never swallowed.
  assert.equal(
    isEditableKeyboardTarget({ tagName: "INPUT" } as unknown as EventTarget),
    true,
  );
  if (typeof document === "undefined") return;
  const search = document.createElement("input");
  search.setAttribute("data-app-search", "true");
  assert.equal(isEditableKeyboardTarget(search), true);
  assert.equal(shouldIgnoreShortcutTarget(search), false);
});
