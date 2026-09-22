import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isAppSearchTarget,
  isEditableKeyboardTarget,
  isInteractiveKeyboardTarget,
  moveFocusIndex,
} from "../keyboard.ts";
import {
  resolveLedgerEscape,
  resolveLedgerShortcut,
} from "./keyboard.ts";

test("resolveLedgerShortcut maps navigation, row actions, add and search", () => {
  assert.equal(resolveLedgerShortcut("j"), "next");
  assert.equal(resolveLedgerShortcut("J"), "next");
  assert.equal(resolveLedgerShortcut("k"), "prev");
  assert.equal(resolveLedgerShortcut("e"), "edit");
  assert.equal(resolveLedgerShortcut("Enter"), "edit");
  assert.equal(resolveLedgerShortcut("x"), "toggle_select");
  assert.equal(resolveLedgerShortcut("Delete"), "delete");
  assert.equal(resolveLedgerShortcut("Backspace"), "delete");
  assert.equal(resolveLedgerShortcut("n"), "add");
  assert.equal(resolveLedgerShortcut("/"), "search");
  assert.equal(resolveLedgerShortcut("z"), null);
  assert.equal(resolveLedgerShortcut("Escape"), null);
  assert.equal(resolveLedgerShortcut(""), null);
});

test("resolveLedgerShortcut ignores modifier chords", () => {
  assert.equal(resolveLedgerShortcut("j", { metaKey: true }), null);
  assert.equal(resolveLedgerShortcut("e", { ctrlKey: true }), null);
  assert.equal(resolveLedgerShortcut("/", { altKey: true }), null);
  assert.equal(resolveLedgerShortcut("Backspace", { metaKey: true }), null);
});

test("moveFocusIndex clamps at both ends without looping", () => {
  assert.equal(moveFocusIndex(-1, 1, 5), 0);
  assert.equal(moveFocusIndex(-1, -1, 5), 4);
  assert.equal(moveFocusIndex(0, -1, 5), 0);
  assert.equal(moveFocusIndex(4, 1, 5), 4);
  assert.equal(moveFocusIndex(2, 1, 5), 3);
  assert.equal(moveFocusIndex(2, -1, 5), 1);
  assert.equal(moveFocusIndex(0, 1, 0), -1);
  assert.equal(moveFocusIndex(9, 1, 5), 0);
});

test("resolveLedgerEscape peels search, then selection, then row focus", () => {
  assert.equal(
    resolveLedgerEscape({
      searchActive: true,
      hasSelection: true,
      hasRowFocus: true,
    }),
    "search",
  );
  assert.equal(
    resolveLedgerEscape({
      searchActive: false,
      hasSelection: true,
      hasRowFocus: true,
    }),
    "selection",
  );
  assert.equal(
    resolveLedgerEscape({
      searchActive: false,
      hasSelection: false,
      hasRowFocus: true,
    }),
    "row_focus",
  );
  assert.equal(
    resolveLedgerEscape({
      searchActive: false,
      hasSelection: false,
      hasRowFocus: false,
    }),
    null,
  );
});

test("isEditableKeyboardTarget guards fields and contenteditable", () => {
  assert.equal(isEditableKeyboardTarget(null), false);
  assert.equal(isEditableKeyboardTarget({} as EventTarget), false);
  assert.equal(
    isEditableKeyboardTarget({ tagName: "INPUT" } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableKeyboardTarget({ tagName: "TEXTAREA" } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableKeyboardTarget({
      tagName: "DIV",
      isContentEditable: true,
    } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableKeyboardTarget({
      tagName: "DIV",
      isContentEditable: false,
    } as unknown as EventTarget),
    false,
  );
});

test("isInteractiveKeyboardTarget defers Enter to real controls", () => {
  const button = {
    tagName: "BUTTON",
    closest: (selector: string) =>
      selector.includes("button") ? ({ tagName: "BUTTON" } as unknown) : null,
  };
  assert.equal(
    isInteractiveKeyboardTarget(button as unknown as EventTarget),
    true,
  );
  assert.equal(
    isInteractiveKeyboardTarget({
      tagName: "INPUT",
    } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isInteractiveKeyboardTarget({
      tagName: "DIV",
      closest: () => null,
    } as unknown as EventTarget),
    false,
  );
  assert.equal(isInteractiveKeyboardTarget(null), false);
});

test("isAppSearchTarget detects the data-app-search marker", () => {
  const input = {
    closest: (selector: string) =>
      selector === "[data-app-search='true']" ? ({} as unknown) : null,
  };
  assert.equal(isAppSearchTarget(input as unknown as EventTarget), true);
  assert.equal(
    isAppSearchTarget({ closest: () => null } as unknown as EventTarget),
    false,
  );
  assert.equal(isAppSearchTarget(null), false);
});

/*
 * Source-pin contract — the ledger workspace must keep the key layer wired
 * the same way the inbox does (row index attribute, aria-current, focused
 * class, legend text, shared guards).
 */
test("ledger workspace pins the keyboard contract in source", () => {
  const workspace = readFileSync(
    "src/components/transactions/transactions-workspace.tsx",
    "utf8",
  );
  const workspaceCss = readFileSync(
    "src/components/transactions/transactions-workspace.module.css",
    "utf8",
  );
  const inboxKeyboard = readFileSync("src/lib/inbox/keyboard.ts", "utf8");

  assert.match(workspace, /resolveLedgerShortcut/);
  assert.match(workspace, /resolveLedgerEscape/);
  assert.match(workspace, /isEditableKeyboardTarget\(event\.target\)/);
  assert.match(workspace, /moveFocusIndex\(current, action === "next"/);
  assert.match(workspace, /data-ledger-index=\{rowIndex\}/);
  assert.match(workspace, /aria-current=\{rowFocused \? "true" : undefined\}/);
  assert.match(workspace, /handleEditClick\(row\)/);
  assert.match(workspace, /handleDelete\(row\)/);
  assert.match(workspace, /toggleTransactionSelection\(row\.id\)/);
  assert.match(workspace, /router\.push\("\/commitments"\)/);
  assert.match(workspace, /searchInputRef\.current\?\.focus\(\)/);
  assert.match(workspace, /<kbd>J<\/kbd>\/<kbd>K<\/kbd> di chuyển/);
  assert.match(workspace, /aria-label="Phím tắt sổ giao dịch"/);

  assert.match(workspaceCss, /\.focused\s*\{[^}]*box-shadow: inset 3px 0 0/);
  assert.match(
    workspaceCss,
    /@media \(forced-colors: active\)[\s\S]*\.focused[\s\S]*outline: 2px solid Highlight/,
  );
  assert.match(workspaceCss, /\.listFooter kbd/);

  // The shared helpers own the implementation; inbox re-exports them.
  assert.match(
    inboxKeyboard,
    /export \{ isEditableKeyboardTarget, moveFocusIndex \} from "\.\.\/keyboard\.ts"/,
  );
});
