/**
 * R4 — Ghi chi dialog UX: amount autofocus, recent categories order,
 * save-and-add-another polish. Source contracts (no browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("R4: shared Dialog receives the amount focus target", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const dialog = read("src/components/ui/dialog.tsx");
  assert.match(src, /amountInputRef/);
  assert.match(src, /inputRef=\{amountInputRef\}/);
  assert.match(src, /focusAmount/);
  assert.match(src, /initialFocusRef=\{amountInputRef\}/);
  assert.match(src, /requestAnimationFrame\(\(\) => focusAmount/);
  assert.doesNotMatch(src, /<dialog\b|showModal\(\)/);
  assert.match(dialog, /initialFocusRef/);
  assert.match(dialog, /restoreFocusRef/);
  assert.match(dialog, /dialog\.showModal\(\)/);
  assert.match(dialog, /target\.focus\(\)/);
});

test("R4: recent categories order via quick-add prefs helpers", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /orderCategoriesByRecent/);
  assert.match(src, /pushRecentCategoryId/);
  assert.match(src, /pickCategoryForKind/);
  assert.match(src, /isRecentCategoryId/);
  assert.match(src, /data-recent/);
  assert.match(src, /Gần đây/);
  assert.match(src, /hay dùng trước/);
});

test("R4: save-and-add-another keep-open UX polish", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /Lưu xong thêm tiếp/);
  assert.match(src, /Lưu & thêm tiếp/);
  assert.match(src, /keepOpen/);
  assert.match(src, /KEEP_OPEN_SUCCESS|Đã lưu · nhập khoản tiếp/);
  assert.match(src, /<Alert tone="success" live="polite"/);
  assert.match(src, /Giữ form mở/);
});

test("R4: default dialog copy is G5 thu chi (not inbox brand)", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /title = "Ghi chi tiêu"/);
  assert.match(src, /eyebrow = "Nhập nhanh"/);
  assert.doesNotMatch(src, /hộp thư|Inbox-first/i);
});

test("R4: local form owner supports keep-open status and recent category chips", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const css = read("src/components/transactions/transaction-form.module.css");
  assert.match(src, /styles\.formStatus/);
  assert.match(src, /styles\.categoryRecent/);
  assert.match(src, /styles\.recentBadge/);
  assert.match(src, /styles\.keepOpenRow/);
  assert.match(css, /\.formStatus/);
  assert.match(css, /\.categoryRecent/);
  assert.match(css, /\.recentBadge/);
  assert.match(css, /\.keepOpenRow/);
});
