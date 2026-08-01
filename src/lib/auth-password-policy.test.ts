import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordLengthError,
} from "./auth-password-policy.ts";

test("password policy rejects values below twelve characters", () => {
  assert.equal(
    passwordLengthError("a".repeat(PASSWORD_MIN_LENGTH - 1)),
    `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  );
});

test("password policy accepts the supported length boundaries", () => {
  assert.equal(passwordLengthError("a".repeat(PASSWORD_MIN_LENGTH)), null);
  assert.equal(passwordLengthError("a".repeat(PASSWORD_MAX_LENGTH)), null);
});

test("password policy rejects values above the provider-safe maximum", () => {
  assert.equal(
    passwordLengthError("a".repeat(PASSWORD_MAX_LENGTH + 1)),
    `Mật khẩu không được dài quá ${PASSWORD_MAX_LENGTH} ký tự.`,
  );
});
