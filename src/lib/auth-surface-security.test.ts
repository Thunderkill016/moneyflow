import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/app/(auth)/actions.ts", "utf8");
const form = readFileSync("src/components/auth-form.tsx", "utf8");
const turnstile = readFileSync("src/components/auth-turnstile.tsx", "utf8");

test("registration and password update use the shared strong password policy", () => {
  assert.match(actions, /PASSWORD_MIN_LENGTH/);
  assert.match(actions, /PASSWORD_MAX_LENGTH/);
  assert.match(form, /Ít nhất 12 ký tự/);
  assert.match(form, /ít nhất 12 ký tự/);
});

test("public registration failure does not reveal email existence", () => {
  assert.doesNotMatch(actions, /Email có thể đã được sử dụng/);
  assert.match(
    actions,
    /Không thể tạo tài khoản lúc này\. Kiểm tra thông tin hoặc thử lại sau\./,
  );
});

test("login and password-reset responses remain enumeration-safe", () => {
  assert.match(actions, /Email hoặc mật khẩu không đúng\./);
  assert.match(
    actions,
    /Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu\./,
  );
});

test("email auth flows enforce and forward the shared captcha token", () => {
  assert.match(actions, /CAPTCHA_TOKEN_FIELD/);
  assert.match(actions, /captchaTokenRequiredButMissing/);
  assert.match(actions, /signInWithPassword\([\s\S]*captchaToken/);
  assert.match(actions, /signUp\([\s\S]*captchaToken/);
  assert.match(actions, /resetPasswordForEmail\([\s\S]*captchaToken/);
  assert.match(actions, /error\?\.code === "captcha_failed"/);
});

test("auth form gates submission and resets a dependency-free Turnstile widget", () => {
  assert.match(form, /AuthTurnstile/);
  assert.match(form, /pending \|\| captchaBlocked/);
  assert.match(turnstile, /moneyflow-auth-turnstile/);
  assert.match(turnstile, /turnstile\.render/);
  assert.match(turnstile, /getTurnstile\(\)\?\.reset/);
  assert.match(turnstile, /CAPTCHA_TOKEN_FIELD/);
  assert.match(turnstile, /auth-turnstile\.module\.css/);
  assert.doesNotMatch(turnstile, /style=\{\{/);
  assert.doesNotMatch(turnstile, /@hcaptcha|react-turnstile|marsidev/);
});
