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

test("R4: amount autofocus on open (ref + autoFocus + focus helper)", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /amountInputRef/);
  assert.match(src, /autoFocus/);
  assert.match(src, /focusAmount/);
  assert.match(src, /showModal\(\)/);
  // After open / keep-open save, re-focus amount for <10s entry.
  assert.match(src, /requestAnimationFrame\(\(\) => focusAmount/);
});

test("R4: recent categories order via quick-add prefs helpers", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /orderCategoriesByRecent/);
  assert.match(src, /pushRecentCategoryId/);
  assert.match(src, /pickCategoryForKind/);
  assert.match(src, /isRecentCategoryId/);
  assert.match(src, /category-choice-recent|data-recent/);
  assert.match(src, /Gần đây/);
  assert.match(src, /hay dùng trước/);
});

test("R4: save-and-add-another keep-open UX polish", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /Lưu xong thêm tiếp/);
  assert.match(src, /Lưu & thêm tiếp/);
  assert.match(src, /keepOpen/);
  assert.match(src, /KEEP_OPEN_SUCCESS|Đã lưu · nhập khoản tiếp/);
  assert.match(src, /keep-open-success/);
  assert.match(src, /role="status"/);
  // Primary label reflects mode; hint explains focus loop.
  assert.match(src, /Giữ form mở/);
});

test("R4: default dialog copy is G5 thu chi (not inbox brand)", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /title = "Ghi chi tiêu"/);
  assert.match(src, /eyebrow = "Nhập nhanh"/);
  assert.doesNotMatch(src, /hộp thư|Inbox-first/i);
});

test("R4: CSS supports keep-open success + recent category chips", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.keep-open-success/);
  assert.match(css, /\.category-recent-badge|\.category-choice-recent/);
  assert.match(css, /\.keep-open-hint|\.keep-open-title/);
});
