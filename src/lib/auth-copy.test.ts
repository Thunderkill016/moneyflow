/**
 * Authentication stays direct, factual and task-focused.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const AUTH_FORM = join(process.cwd(), "src/components/auth-form.tsx");
const REGISTER_PAGE = join(
  process.cwd(),
  "src/app/(auth)/register/page.tsx",
);

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
  assert.match(s, /title: "Đăng nhập vào MoneyFlow"/);
  assert.match(s, /Tiếp tục từ giao dịch gần nhất/);
  assert.match(s, /submit: "Đăng nhập"/);
  for (const phrase of FORBIDDEN) {
    assert.equal(s.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("register copy starts a traceable ledger without invented advice", () => {
  const s = source();
  assert.match(s, /title: "Tạo tài khoản MoneyFlow"/);
  assert.match(s, /Ghi thu, chi và chuyển tiền đúng bản chất/);
  assert.match(s, /submit: "Tạo tài khoản"/);
  assert.equal(s.includes("nên tiêu"), false);
});

test("demo notice stays on login and keeps the continue-demo exit", () => {
  const s = source();
  assert.match(s, /Đang ở chế độ demo/);
  assert.match(s, /Dữ liệu demo chỉ được lưu trong trình duyệt này\./);
  assert.match(s, /href="\/dashboard">Tiếp tục bản demo/);
});

test("register demo notice discloses device-local data and the scoped export", () => {
  const s = source();
  // The notice must reach register, not just login.
  assert.match(s, /demoMode[\s\S]*mode === "register"[\s\S]*mode === "login" && !isReauth/);
  assert.match(s, /mode === "register" \?/);
  assert.match(s, /không được\s*\n?\s*chuyển vào tài khoản mới/);
  assert.match(s, /Cài đặt → Xuất dữ liệu/);
  assert.match(s, /chưa phải bản sao lưu đầy đủ/);
  assert.match(s, /href="\/settings\/export"/);
});

test("register page enables the demo notice in demo mode", () => {
  const s = readFileSync(REGISTER_PAGE, "utf8");
  assert.match(s, /demoMode=\{!isSupabaseConfigured\(\)\}/);
});

test("auth keeps the form primary and proof rail factual", () => {
  const s = source();
  assert.doesNotMatch(s, /styles\.story/);
  assert.doesNotMatch(s, /styles\.signalCard/);
  assert.match(s, /styles\.proofRail/);
  assert.match(s, /Thu, chi và chuyển tiền tách biệt/);
  assert.match(s, /Mỗi số tổng đều có chỗ kiểm tra/);
  assert.match(s, /MoneyFlow không yêu cầu mật khẩu ngân hàng/);
  assert.match(s, /Xác minh bảo mật có thể hoàn tất tự động/);
});
