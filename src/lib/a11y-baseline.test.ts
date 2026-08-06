import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

/**
 * TASK-119 — A11y baseline contracts for insights + add money dialog.
 * Source-level guards (no browser); complements unit and browser evidence.
 */

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("global legacy focus-visible baseline remains available", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /button:focus-visible/);
  assert.match(css, /input:focus-visible/);
  assert.match(css, /a:focus-visible/);
  assert.match(css, /outline:\s*2px solid var\(--color-border-focus\)/);
});

test("AddTransactionDialog delegates modal focus lifecycle to shared Dialog", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const dialog = read("src/components/ui/dialog.tsx");

  assert.match(src, /import \{ Dialog \}/);
  assert.match(src, /initialFocusRef=\{amountInputRef\}/);
  assert.match(src, /dismissible=\{!submitting\}/);
  assert.match(src, /id="add-tx-amount"/);
  assert.match(src, /Số tiền/);
  assert.match(src, /Tài khoản/);
  assert.match(src, /Ghi chú/);
  assert.match(src, /Khoản chi \(−\)/);
  assert.match(src, /Khoản thu \(\+\)/);
  assert.match(src, /moneyKindPrefix/);
  assert.doesNotMatch(src, /<dialog\b|showModal\(\)/);

  assert.match(dialog, /restoreFocusRef/);
  assert.match(dialog, /initialFocusRef/);
  assert.match(dialog, /dialog\.showModal\(\)/);
  assert.match(dialog, /focusTarget\?\.focus\(\)/);
  assert.match(dialog, /onCancel=/);
  assert.match(dialog, /target\.focus\(\)/);
});

test("Insights dashboard: signed money for thu/chi KPI + recent rows", () => {
  const src = readDashboardSource();
  assert.match(src, /MoneyValue/);
  assert.match(src, /mode="kind"[\s\S]{0,100}kind="income"/);
  assert.match(src, /mode="kind"[\s\S]{0,100}kind="expense"/);
  assert.match(
    src,
    /amount=\{item\.amount\}[\s\S]{0,100}kind="expense"/,
  );
});
