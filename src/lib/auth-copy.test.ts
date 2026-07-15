/**
 * REBUILD Phase 0 — Auth surfaces sell thu chi (G5), never inbox brand.
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
] as const;

function source(): string {
  return readFileSync(AUTH_FORM, "utf8");
}

test("auth form exists", () => {
  assert.ok(source().includes("export function AuthForm"));
});

test("login copy is thu chi, not inbox", () => {
  const s = source();
  assert.match(s, /Tiếp tục quản lý thu chi/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy is thu chi multi-wallet export", () => {
  const s = source();
  assert.match(s, /Ghi thu chi/);
  assert.match(s, /nhiều ví|xuất CSV|CSV/i);
});

test("auth story trust is G5 (no bank password, ownership)", () => {
  const s = source();
  assert.match(s, /Không mật khẩu ngân hàng|không mật khẩu ngân hàng/i);
  assert.match(s, /Dữ liệu của bạn thuộc về bạn/);
  assert.equal(s.includes("Bạn duyệt trước khi vào sổ"), false);
});
