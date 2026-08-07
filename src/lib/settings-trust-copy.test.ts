/**
 * Phase 8 — Settings, export, privacy and deletion trust contracts.
 * Lock exact capability scope instead of legacy global class names.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const HUB = join(ROOT, "src/components/settings-hub-page.tsx");
const PRIVACY = join(ROOT, "src/components/privacy-settings-page.tsx");
const EXPORT = join(ROOT, "src/components/export-settings-page.tsx");
const DELETE = join(ROOT, "src/components/delete-account-page.tsx");
const RECEIPT = join(ROOT, "src/app/account-deletion-result/page.tsx");
const EXPORT_LIB = join(ROOT, "src/lib/export-data.ts");
const DELETE_LIB = join(ROOT, "src/lib/delete-account.ts");
const SETTINGS_CSS = join(
  ROOT,
  "src/components/settings/settings-surfaces.module.css",
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function normalizeSource(source: string): string {
  return source.replace(/\s+/gu, " ").trim();
}

test("settings hub states ownership boundaries without branding Inbox as the product", () => {
  const source = read(HUB);
  assert.match(source, /không hỏi mật khẩu ngân hàng/i);
  assert.match(source, /Xuất giao dịch bất cứ lúc nào/i);
  assert.match(source, /Xóa khi bạn yêu cầu/i);
  assert.match(source, /href: "\/settings\/privacy"/);
  assert.match(source, /href: "\/settings\/export"/);
  assert.match(source, /href: "\/settings\/delete-account"/);
  assert.match(source, /chưa phải bản sao lưu đầy đủ/i);
  assert.doesNotMatch(source, /Universal Financial Inbox|Đưa dữ liệu vào Inbox/);
});

test("privacy page describes local retention and unavailable parser sharing truthfully", () => {
  const source = read(PRIVACY);
  assert.match(source, /không hỏi mật khẩu ngân hàng hoặc OTP/i);
  assert.match(source, /href="\/settings\/export"/);
  assert.match(source, /href="\/privacy"/);
  assert.match(source, /Chưa khả dụng · không ghi consent/);
  assert.match(source, /không có pipeline gửi mẫu parser/i);
  assert.match(source, /checked=\{false\} disabled readOnly/);
  assert.doesNotMatch(source, /Universal Financial Inbox/);
});

test("export page labels the file as transactions/Inbox subset, not backup", () => {
  const source = normalizeSource(read(EXPORT));
  assert.match(source, /File được tạo trên thiết bị/i);
  assert.match(source, /export giao dịch\/Inbox/i);
  assert.match(source, /chưa phải bản sao lưu đầy đủ/i);
  assert.match(source, /Accounts, categories, budgets, goals/i);
  assert.match(source, /data-slot="export-summary"/);
  assert.doesNotMatch(
    source,
    /(?:^|[.!?]\s*)Đây là bản sao lưu đầy đủ có thể khôi phục tài khoản/i,
  );
});

test("export kind options still frame candidates as advanced data", () => {
  const source = read(EXPORT_LIB);
  assert.match(source, /Sổ thu chi|giao dịch đã ghi/i);
  assert.ok(
    /Nâng cao|nâng cao|tùy chọn/.test(source),
    "candidate export option must remain advanced or optional",
  );
});

test("delete account preserves server-first order, final review and explicit receipt", () => {
  const page = read(DELETE);
  assert.match(page, /href="\/settings\/export"/);
  assert.match(page, /không thể hoàn tác|Không thể hoàn tác/i);
  assert.match(page, /finalizeAccountDeletion\(confirmText\)/);
  assert.match(page, /slot="delete-account-review"/);
  assert.match(page, /Máy chủ xóa trước/);

  const lib = read(DELETE_LIB);
  assert.match(lib, /SERVER_DELETE_READY_VI/);
  assert.match(lib, /Supabase/);
  assert.match(lib, /xóa vĩnh viễn/i);

  const receipt = read(RECEIPT);
  assert.match(receipt, /data-slot="account-deletion-receipt"/);
  assert.match(receipt, /cleanup chưa xác minh đầy đủ/);
  assert.match(receipt, /Chỉ dọn được một phần/);
});

test("Settings trust presentation is locally owned", () => {
  const css = read(SETTINGS_CSS);
  assert.match(css, /\.trustBar\b/);
  assert.match(css, /\.hubCard\b/);
  assert.match(css, /\.dangerPanel\b/);
  assert.match(css, /\.capabilityStatus\b/);
});