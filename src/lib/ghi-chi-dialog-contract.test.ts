/**
 * R4 — Ghi chi dialog UX: amount autofocus, learned/recent categories,
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

test("R4: quick capture learns coherent presets and keeps recent category ordering", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /orderCategoriesByRecent/);
  assert.match(src, /pushRecentCategoryId/);
  assert.match(src, /pushRecentPreset/);
  assert.match(src, /pickKnownCategoryForKind/);
  assert.match(src, /isRecentCategoryId/);
  assert.match(src, /data-slot="capture-fast-defaults"/);
  assert.match(src, /data-slot="capture-category-suggestions"/);
  assert.match(src, /\.slice\(0, 2\)/);
  assert.match(src, /data-recent/);
  assert.match(src, /Gần đây/);
  assert.match(src, /hay dùng trước/);
});

test("R4: save-and-add-another keeps a controlled dialog session alive", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /Lưu xong thêm tiếp/);
  assert.match(src, /Lưu & thêm tiếp/);
  assert.match(src, /keepOpen/);
  assert.match(src, /keepOpenSession/);
  assert.match(src, /effectiveOpen = open \|\| keepOpenSession/);
  assert.match(src, /if \(keepOpen\) setKeepOpenSession\(true\)/);
  assert.match(src, /open=\{effectiveOpen\}/);
  assert.match(src, /KEEP_OPEN_SUCCESS|Đã lưu · nhập khoản tiếp/);
  assert.match(src, /<Alert tone="success" live="polite"/);
  assert.match(src, /Giữ form mở/);
});

test("R4: default dialog copy resolves to concise thu chi titles", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /title = "Ghi chi tiêu"/);
  assert.match(src, /Ghi khoản chi/);
  assert.match(src, /Ghi khoản thu/);
  assert.doesNotMatch(src, /Chỉ nhập số tiền rồi lưu/);
  assert.doesNotMatch(src, /Không cần chọn lại nếu đúng/);
});

test("R4: local form owner supports compact corrections and secondary detail", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const css = read("src/components/transactions/transaction-form.module.css");
  const fastCss = read("src/components/transactions/capture-fast-path.module.css");
  assert.match(src, /styles\.formStatus/);
  assert.match(src, /styles\.categoryRecent/);
  assert.match(src, /styles\.recentBadge/);
  assert.match(src, /styles\.keepOpenRow/);
  assert.match(src, />Khác</);
  assert.match(src, /\+ Ghi chú/);
  assert.match(css, /\.formStatus/);
  assert.match(css, /\.categoryRecent/);
  assert.match(css, /\.recentBadge/);
  assert.match(css, /\.keepOpenRow/);
  assert.match(fastCss, /\.categoryActions/);
  assert.match(fastCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(fastCss, /overflow-x:\s*auto/);
});

test("R4: constrained mobile capture keeps secondary detail out of the closed keyboard path", () => {
  const css = read("src/components/transactions/transaction-form.module.css");
  const fastCss = read("src/components/transactions/capture-fast-path.module.css");
  assert.match(
    css,
    /@media \(max-width: 620px\) and \(max-height: 640px\)/,
  );
  assert.match(
    fastCss,
    /@media \(max-width: 620px\) and \(max-height: 640px\)/,
  );
  assert.match(fastCss, /\.secondaryDisclosure:not\(\[open\]\)/);
  assert.match(fastCss, /\.footerActions\.footerActions/);
  assert.doesNotMatch(fastCss, /!important/);
  assert.doesNotMatch(css, /dvh/);
});