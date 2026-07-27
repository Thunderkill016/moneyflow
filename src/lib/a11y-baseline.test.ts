import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

/**
 * TASK-119 — A11y baseline contracts for insights + add money dialog.
 * Source-level guards (no browser); complements unit tests in money.test.ts.
 */

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("globals.css: focus-visible ring on interactive + money form controls", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /button:focus-visible/);
  assert.match(css, /input:focus-visible/);
  assert.match(css, /a:focus-visible/);
  // Amount field sets outline:0 — must re-enable focus-visible specifically.
  assert.match(css, /\.amount-field input:focus-visible/);
  assert.match(css, /\.segmented-control button:focus-visible/);
  assert.match(css, /\.category-choice:focus-visible/);
  assert.match(css, /outline:\s*2px solid var\(--color-border-focus\)/);
});

test("AddTransactionDialog: labels, kind signs, native modal focus trap", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /showModal\(\)/);
  assert.match(src, /aria-labelledby="transaction-dialog-title"/);
  assert.match(src, /htmlFor="add-tx-amount"|id="add-tx-amount"/);
  assert.match(src, /Số tiền/);
  assert.match(src, /Tài khoản/);
  assert.match(src, /Ghi chú/);
  // Expense/income not color-only in kind control + amount sign.
  assert.match(src, /Khoản chi \(−\)|−\s*Khoản chi|aria-label=.*chi/i);
  assert.match(src, /Khoản thu \(\+\)|\+\s*Khoản thu|aria-label=.*thu/i);
  assert.match(src, /amount-kind-sign|moneyKindPrefix/);
  // Focus restore after close (dialog focus trap companion).
  assert.match(src, /previouslyFocused|restoreFocus|activeElement/);
});

test("Insights dashboard: signed money for thu/chi KPI + recent rows", () => {
  const src = readDashboardSource();
  assert.match(src, /MoneyValue/);
  // KPI thu/chi use explicit ledger kinds, not color alone.
  assert.match(src, /mode="kind"[\s\S]{0,100}kind="income"/);
  assert.match(src, /mode="kind"[\s\S]{0,100}kind="expense"/);
  // Category spend rows (all expenses) use the shared expense-kind contract.
  assert.match(
    src,
    /amount=\{item\.amount\}[\s\S]{0,100}kind="expense"/,
  );
});
