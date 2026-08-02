/**
 * Authentication stays direct, factual and task-focused.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const AUTH_FORM = join(process.cwd(), "src/components/auth-form.tsx");

const FORBIDDEN = [
  "hộp thư giao dịch",
  "Đưa dữ liệu vào Inbox",
  "duyệt trước khi vào sổ",
  "có thể chi hôm nay",
  "nên tiêu",
  "Mở MoneyFlow",
  "Bức tranh hôm nay",
  "Tiền chưa có nhiệm vụ",
  "financial operating view",
] as const;

function source(): string {
  return readFileSync(AUTH_FORM, "utf8");
}

test("auth form exists", () => {
  assert.ok(source().includes("export function AuthForm"));
});

test("login copy is direct and uses the expected action", () => {
  const s = source();
  assert.match(s, /title: "Mở lại sổ của bạn"/);
  assert.match(s, /description: "Dùng Google hoặc email đã đăng ký\."/);
  assert.match(s, /submit: "Đăng nhập"/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy starts small without invented advice", () => {
  const s = source();
  assert.match(s, /title: "Bắt đầu một sổ mới"/);
  assert.match(s, /Tạo tài khoản rồi ghi khoản đầu tiên/);
  assert.match(s, /Không cần liên kết ngân hàng/);
  assert.match(s, /submit: "Tạo tài khoản"/);
  assert.equal(s.includes("nên tiêu"), false);
});

test("auth keeps the form primary and uses mode-specific context", () => {
  const s = source();
  assert.doesNotMatch(s, /styles\.story/);
  assert.doesNotMatch(s, /styles\.proofRail/);
  assert.match(s, /styles\.contextPanel/);
  assert.match(s, /Sổ của bạn vẫn ở đây/);
  assert.match(s, /Không cần nhập cả cuộc đời tài chính trong ngày đầu/);
  assert.match(s, /MoneyFlow không yêu cầu mật khẩu ngân hàng/);
  assert.match(s, /Xác minh bảo mật có thể hoàn tất tự động/);
});

test("password fields provide an accessible visibility control", () => {
  const s = source();
  assert.match(s, /passwordVisible/);
  assert.match(s, /aria-label=\{/);
  assert.match(s, /"Ẩn mật khẩu"/);
  assert.match(s, /"Hiện mật khẩu"/);
  assert.match(s, /mode === "login" \? "current-password" : "new-password"/);
});
