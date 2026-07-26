/**
 * Calm Ledger — auth surfaces stay grounded in the manual thu/chi product.
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
  "có thể chi",
] as const;

function source(): string {
  return readFileSync(AUTH_FORM, "utf8");
}

test("auth form exists", () => {
  assert.ok(source().includes("export function AuthForm"));
});

test("login copy is a continuation of the user's ledger", () => {
  const s = source();
  assert.match(s, /Mở sổ thu chi và tiếp tục/);
  assert.match(s, /Chào mừng trở lại/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy promises a private ledger, not inferred advice", () => {
  const s = source();
  assert.match(s, /Tạo một sổ riêng/);
  assert.match(s, /theo dõi thu, chi và các ví/);
  assert.equal(s.includes("nên tiêu"), false);
});

test("auth story states the manual-first trust contract", () => {
  const s = source();
  assert.match(s, /Không cần mật khẩu ngân hàng/);
  assert.match(s, /Xuất CSV bất cứ lúc nào/);
  assert.match(s, /Chuyển ví không tính là chi/);
});
