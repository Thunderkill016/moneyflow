import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const normalizeSource = (source: string) => source.replace(/\s+/gu, " ").trim();
const browserConfirm = ["window", "confirm"].join(".");

const reports = read("src/components/reports-page.tsx");
const categories = read("src/components/categories-page.tsx");
const categoryDialog = read("src/components/category-dialog.tsx");
const inbox = read("src/components/inbox/inbox-page.tsx");
const inboxReview = read("src/components/inbox/inbox-review-panel.tsx");
const inboxBulk = read("src/components/inbox/inbox-bulk-bar.tsx");
const rules = read("src/components/inbox/rules-page.tsx");
const imports = read("src/components/inbox/imports-page.tsx");
const importPreview = read("src/components/inbox/import-preview-page.tsx");
const directImport = read("src/components/inbox/direct-csv-import-page.tsx");
const settingsHub = read("src/components/settings-hub-page.tsx");
const exportPage = read("src/components/export-settings-page.tsx");
const privacyPage = read("src/components/privacy-settings-page.tsx");
const deletePage = read("src/components/delete-account-page.tsx");
const deletionReceipt = read("src/app/account-deletion-result/page.tsx");
const timeline = read("src/components/transactions/timeline-workspace.tsx");

test("Reports is locally owned and preserves resolved-range truth", () => {
  const normalizedReports = normalizeSource(reports);
  assert.match(reports, /SecondaryWorkspace slot="reports-workspace"/);
  assert.match(reports, /data-slot="report-periods"/);
  assert.match(reports, /slot="report-metrics"/);
  assert.match(reports, /aria-describedby="report-trend-data"/);
  assert.match(
    normalizedReports,
    /không phải bản sao lưu có thể khôi phục toàn bộ tài khoản/,
  );
  assert.doesNotMatch(reports, new RegExp(browserConfirm.replace(".", "\\.")));
});

test("Categories owns identity and reversible hide review", () => {
  assert.match(categories, /SecondaryWorkspace slot="categories-workspace"/);
  assert.match(categories, /data-slot="category-card"/);
  assert.match(categories, /slot="category-review"/);
  assert.match(categories, /Giao dịch, ngân sách và lịch sử cũ không bị xóa/);
  assert.match(categoryDialog, /label="Biểu tượng"/);
  assert.match(categoryDialog, /label="Màu nhận diện"/);
  assert.doesNotMatch(categories, new RegExp(browserConfirm.replace(".", "\\.")));
});

test("Inbox review is explicit and retries use candidate identity", () => {
  assert.match(inbox, /SecondaryWorkspace slot="inbox-workspace"/);
  assert.match(inbox, /approvalIdempotencyKey\(candidate\.id\)/);
  assert.match(inbox, /không tạo giao dịch trùng/);
  assert.match(inboxReview, /data-slot="inbox-review"/);
  assert.match(inboxReview, /Độ tin thấp/);
  assert.match(inboxBulk, /slot="inbox-bulk-confirmation"/);
  assert.match(inboxBulk, /Xác nhận hành động hàng loạt/);
});

test("Rules and Imports expose review consequences without browser confirms", () => {
  for (const source of [rules, imports, importPreview, directImport]) {
    assert.doesNotMatch(source, new RegExp(browserConfirm.replace(".", "\\.")));
  }
  assert.match(rules, /slot="rule-delete-review"/);
  assert.match(rules, /không tự tạo giao dịch trong sổ/);
  assert.match(imports, /slot="import-delete-review"/);
  assert.match(imports, /Xóa metadata không xóa giao dịch đã được duyệt vào sổ/);
  assert.match(importPreview, /slot="import-preview-commit-review"/);
  assert.match(directImport, /slot="direct-import-review"/);
  assert.match(directImport, /không có undo toàn batch/i);
});

test("Settings states exact export, parser and deletion capabilities", () => {
  assert.match(normalizeSource(settingsHub), /chưa phải bản sao lưu đầy đủ/i);
  assert.match(exportPage, /export giao dịch\/Inbox/);
  assert.match(exportPage, /Accounts, categories, budgets, goals/);
  assert.match(privacyPage, /Chưa khả dụng · không ghi consent/);
  assert.match(deletePage, /slot="delete-account-review"/);
  assert.match(deletePage, /Máy chủ xóa trước/);
  assert.match(deletionReceipt, /data-slot="account-deletion-receipt"/);
  assert.match(deletionReceipt, /cleanup chưa xác minh đầy đủ/);
});

test("Timeline remains the existing Phase 5 local read-only owner", () => {
  assert.match(timeline, /data-slot="timeline-workspace"/);
  assert.match(timeline, /useTransactionLedger/);
  assert.match(timeline, /Dòng thời gian \(đã duyệt\)/);
  assert.doesNotMatch(timeline, /SecondaryWorkspace/);
});