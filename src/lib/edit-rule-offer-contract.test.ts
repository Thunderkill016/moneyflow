/**
 * Edit-dialog "Lưu thành quy tắc" parity contracts — mirrors the mobile
 * capture edit offer: non-transfer edits only, transaction saves first,
 * the rule write is a separate non-transactional follow-up, and rules
 * only prefill suggestions the reader still approves.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("edit dialog exposes the rule offer only for non-transfer saves", () => {
  const src = read("src/components/edit-transaction-dialog.tsx");
  assert.match(src, /onSaveRule\?: \(input: EditRuleOfferInput\) => Promise<void>/);
  assert.match(src, /\{!isTransfer && onSaveRule \? \(/);
  assert.match(src, /Lưu thành quy tắc tự điền/);
  // The offer copy must state rules prefill — never auto-post.
  assert.match(src, /vẫn do bạn duyệt/);
});

test("the rule is validated before save and written only after it succeeds", () => {
  const src = read("src/components/edit-transaction-dialog.tsx");
  // Payee + category gate happens before the transaction write.
  assert.match(src, /Quy tắc cần nơi giao dịch và danh mục/);
  const gateIdx = src.indexOf("Quy tắc cần nơi giao dịch và danh mục");
  const saveIdx = src.indexOf("result = await onSave(input)");
  const ruleIdx = src.indexOf("await onSaveRule({");
  assert.ok(gateIdx > -1 && saveIdx > -1 && ruleIdx > -1);
  assert.ok(gateIdx < saveIdx, "validation must precede the transaction write");
  assert.ok(saveIdx < ruleIdx, "the rule write must follow a successful save");
  // Merchant match on the form's own payee → the category just chosen.
  assert.match(src, /field: "merchant"/);
  assert.match(src, /contains: payee\.trim\(\)/);
  assert.match(src, /categoryId: selectedCategory/);
  assert.match(src, /enabled: true/);
});

test("workspace persists via saveRuleForClient and never reopens a saved edit", () => {
  const src = read("src/components/transactions/transactions-workspace.tsx");
  assert.match(src, /saveRuleForClient\(viewer\.isDemo, rule\)/);
  assert.match(src, /onSaveRule=\{async \(rule\)/);
  // A failed rule keeps the saved transaction — the notice says so honestly.
  assert.match(src, /chưa tạo được quy tắc/);
  assert.match(src, /"warning"/);
});
