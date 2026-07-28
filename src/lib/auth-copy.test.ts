/**
 * Calm Ledger — auth surfaces stay grounded in the manual-first thu/chi product
 * and the approved MoneyFlow brand message.
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

test("login copy continues the user's existing ledger", () => {
  const s = source();
  assert.match(s, /Mở lại sổ của bạn/);
  assert.match(s, /Tiếp tục từ số dư và giao dịch gần nhất của bạn/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy promises a private factual ledger, not inferred advice", () => {
  const s = source();
  assert.match(s, /Tạo một sổ riêng/);
  assert.match(s, /ghi thu, chi và chuyển tiền rõ ràng/);
  assert.equal(s.includes("nên tiêu"), false);
});

test("auth story states the approved manual-first trust contract", () => {
  const s = source();
  assert.match(s, /manual-first/);
  assert.match(s, /Không cần mật khẩu ngân hàng/);
  assert.match(s, /Xuất CSV bất cứ lúc nào/);
  assert.match(s, /Thu, chi và chuyển tiền tách bạch/);
});
