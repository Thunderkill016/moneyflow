import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moneyCss = readFileSync(
  "src/components/money-value.module.css",
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
