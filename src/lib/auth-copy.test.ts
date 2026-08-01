/**
 * Signal Ledger — auth surfaces stay grounded in factual, owner-controlled
 * personal finance instead of promising automated advice.
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
] as const;

function source(): string {
  return readFileSync(AUTH_FORM, "utf8");
}

test("auth form exists", () => {
  assert.ok(source().includes("export function AuthForm"));
});

test("login copy returns the user to their current financial picture", () => {
  const s = source();
  assert.match(s, /Quay lại MoneyFlow/);
  assert.match(s, /Đăng nhập để xem số dư, giao dịch/);
  assert.match(s, /Mở MoneyFlow/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy starts with one factual transaction, not inferred advice", () => {
  const s = source();
  assert.match(s, /Tạo không gian riêng/);
  assert.match(s, /ghi giao dịch đầu tiên của bạn/);
  assert.match(s, /Tạo không gian tài chính/);
  assert.equal(s.includes("nên tiêu"), false);
});

test("auth story states the owner-control and reversibility contract", () => {
  const s = source();
  assert.match(s, /Không yêu cầu mật khẩu ngân hàng/);
  assert.match(s, /Giao dịch có thể sửa và phục hồi/);
  assert.match(s, /Dữ liệu có thể xuất ra CSV/);
  assert.match(s, /bức tranh có thể kiểm tra lại/);
  assert.match(s, /Không cần thiết lập hoàn hảo/);
});
