/**
 * R5 — Transactions: AppShell searchBar for ⌘K; transfer “không tính chi” everywhere.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  isSearchShortcut,
  TRANSACTIONS_SEARCH_HREF,
  wantsLedgerSearchFocus,
} from "./app-shortcuts.ts";
import {
  TRANSFER_LIST_HINT,
  TRANSFER_NOT_EXPENSE_HINT,
} from "./transfers.ts";

const root = join(import.meta.dirname, "../..");

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("R5: TRANSACTIONS_SEARCH_HREF focuses ledger search after ⌘K navigate", () => {
  assert.equal(TRANSACTIONS_SEARCH_HREF, "/transactions?focus=search");
  assert.equal(wantsLedgerSearchFocus("?focus=search"), true);
  assert.equal(wantsLedgerSearchFocus("focus=search"), true);
  assert.equal(wantsLedgerSearchFocus("?q=coffee"), false);
  assert.equal(wantsLedgerSearchFocus(""), false);
});

test("R5: ⌘K still recognized as search shortcut", () => {
  assert.equal(isSearchShortcut({ key: "k", metaKey: true }), true);
  assert.equal(isSearchShortcut({ key: "k", ctrlKey: true }), true);
});

test("R5: transactions page wires AppShell searchBar to query state", () => {
  const page = readSrc("src/components/transactions-page.tsx");
  assert.match(page, /searchBar=\{\{/);
  assert.match(page, /value:\s*query/);
  assert.match(page, /onChange:\s*setQuery|onChange:\s*\(v\)\s*=>\s*setQuery/);
  assert.match(page, /transferRowSubtitle/);
});

test("R5: AppShell ⌘K navigates with focus=search when no searchBar", () => {
  const shell = readSrc("src/components/layout/app-shell.tsx");
  assert.match(shell, /TRANSACTIONS_SEARCH_HREF|focus=search/);
  assert.match(shell, /wantsLedgerSearchFocus|focus=search/);
  assert.match(shell, /searchInputRef\.current\.focus/);
});

test("R5: transfer list hint constant is “không tính chi”", () => {
  assert.equal(TRANSFER_NOT_EXPENSE_HINT, "không tính chi");
  assert.equal(TRANSFER_LIST_HINT, "Chuyển khoản · không tính chi");
});

test("R5: transfer surfaces use shared not-expense copy", () => {
  const tx = readSrc("src/components/transactions-page.tsx");
  const dash = readSrc("src/components/moneyflow-dashboard.tsx");
  const transferDlg = readSrc("src/components/transfer-dialog.tsx");
  const editDlg = readSrc("src/components/edit-transaction-dialog.tsx");

  for (const [label, src] of [
    ["transactions-page", tx],
    ["moneyflow-dashboard", dash],
  ] as const) {
    assert.match(src, /transferRowSubtitle/, `${label} must use transferRowSubtitle`);
  }

  assert.match(
    transferDlg,
    /TRANSFER_LIST_HINT|TRANSFER_NOT_EXPENSE_HINT|không tính chi/,
    "transfer dialog must say không tính chi",
  );
  assert.match(
    editDlg,
    /TRANSFER_LIST_HINT|TRANSFER_NOT_EXPENSE_HINT|không tính chi/,
    "edit transfer dialog must say không tính chi",
  );
});
