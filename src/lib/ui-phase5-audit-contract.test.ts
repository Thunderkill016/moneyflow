import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moneyCss = readFileSync(
  "src/components/money-value.module.css",
  "utf8",
);
const transactionFormCss = readFileSync(
  "src/components/transactions/transaction-form.module.css",
  "utf8",
);
const modalAudit = readFileSync(
  "e2e/audit/modal-dialog.responsive.audit.spec.ts",
  "utf8",
);
const responsiveAudit = readFileSync(
  "e2e/audit/responsive.audit.spec.ts",
  "utf8",
);

test("large ledger money remains complete and unwrapped at phone widths", () => {
  assert.match(moneyCss, /\[data-slot="ledger-summary"\] \.value/);
  assert.match(moneyCss, /\[data-slot="timeline-summary"\] \.value/);
  assert.match(moneyCss, /\[data-slot="ledger-row"\] \.value/);
  assert.match(moneyCss, /\[data-slot="timeline-row"\] \.value/);
  assert.match(moneyCss, /@media \(max-width: 430px\)/);
  assert.match(moneyCss, /white-space:\s*nowrap/);
  assert.match(moneyCss, /overflow-wrap:\s*normal/);
  assert.doesNotMatch(moneyCss, /text-overflow:\s*ellipsis/);
});

test("transaction forms own deterministic full-width phone sheet geometry", () => {
  assert.match(transactionFormCss, /@media \(max-width: 620px\)/);
  assert.match(transactionFormCss, /\.dialog\.dialog\s*\{/);
  assert.match(transactionFormCss, /width:\s*100%/);
  assert.match(transactionFormCss, /max-width:\s*none/);
  assert.match(transactionFormCss, /margin:\s*auto 0 0/);
  assert.doesNotMatch(transactionFormCss, /\.transaction-dialog/);
});

test("dialog audit targets the shared primitive instead of retired transaction classes", () => {
  assert.match(modalAudit, /dialog\[data-slot=\\?"dialog\\?"\]\[open\]/);
  assert.doesNotMatch(modalAudit, /dialog\.transaction-dialog/);
});

test("SAFE-09 targets stable Phase 5 day-group and ledger-row slots", () => {
  assert.match(responsiveAudit, /data-slot=\\?"ledger-day-group\\?"/);
  assert.match(responsiveAudit, /data-slot=\\?"ledger-row\\?"/);
  assert.doesNotMatch(responsiveAudit, /\.date-group-header:visible/);
  assert.doesNotMatch(responsiveAudit, /querySelector<HTMLElement>\("\.manager-row"\)/);
});
