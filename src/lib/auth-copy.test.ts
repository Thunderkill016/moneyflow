/**
 * Authentication stays direct, factual and task-focused.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const AUTH_FORM = "src/components/auth-form.tsx";

function source(): string {
  return readFileSync(AUTH_FORM, "utf8");
}

test("auth form exists", () => {
  assert.ok(source().includes("export function AuthForm"));
});

test("login copy is direct and uses the expected action", () => {
  const s = source();
  assert.match(s, /title: "Đăng nhập"/);
  assert.match(s, /Dùng tài khoản MoneyFlow của bạn để tiếp tục/);
  assert.match(s, /submit: "Đăng nhập"/);
  assert.doesNotMatch(s, /Quay lại sổ của bạn|Một sổ có thể đối chiếu/);
});

test("register copy explains the immediate next step", () => {
  const s = source();
  assert.match(s, /title: "Tạo tài khoản"/);
  assert.match(s, /Bắt đầu với một tài khoản tiền mặt, ngân hàng hoặc ví điện tử/);
  assert.match(s, /submit: "Tạo tài khoản"/);
  assert.doesNotMatch(s, /đúng bản chất ngay từ đầu/);
});

test("recovery copy is mode-specific", () => {
  const s = source();
  assert.match(s, /title: "Quên mật khẩu\?"/);
  assert.match(s, /gửi liên kết đặt lại mật khẩu/);
  assert.match(s, /title: "Đặt mật khẩu mới"/);
});

test("auth keeps the form primary and removes the marketing rail", () => {
  const s = source();
  assert.doesNotMatch(s, /proofPoints/);
  assert.doesNotMatch(s, /styles\.proofRail/);
  assert.doesNotMatch(s, /ArrowRightLeft|Search|ShieldCheck/);
  assert.match(s, /MoneyFlow không yêu cầu mật khẩu ngân hàng/);
});

test("password fields have an accessible show-hide control", () => {
  const s = source();
  assert.match(s, /passwordVisible/);
  assert.match(s, /Hiện mật khẩu/);
  assert.match(s, /Ẩn mật khẩu/);
  assert.match(s, /aria-pressed=\{passwordVisible\}/);
  assert.match(s, /mode === "login" \? "current-password" : "new-password"/);
});
