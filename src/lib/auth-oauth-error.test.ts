import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { oauthErrorMessage } from "./auth-oauth-error.ts";

const LOGIN_PAGE = join(process.cwd(), "src/app/(auth)/login/page.tsx");
const AUTH_FORM = join(process.cwd(), "src/components/auth-form.tsx");

test("oauth error codes map to explicit Vietnamese messages", () => {
  assert.equal(
    oauthErrorMessage("callback"),
    "Đăng nhập bằng Google thất bại. Liên kết đã hết hạn hoặc bạn đã từ chối cấp quyền — hãy thử lại.",
  );
  assert.equal(
    oauthErrorMessage("oauth"),
    "Không thể kết nối Google lúc này. Hãy thử lại sau.",
  );
  assert.equal(
    oauthErrorMessage("config"),
    "Dịch vụ đăng nhập chưa được cấu hình. Hãy thử lại sau.",
  );
  assert.equal(
    oauthErrorMessage("reauth-session"),
    "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để xác thực tiếp.",
  );
});

test("login page forwards ?error= to the auth form", () => {
  const page = readFileSync(LOGIN_PAGE, "utf8");
  assert.match(page, /error\?: string/);
  assert.match(page, /authError=\{params\.error\}/);
});

test("auth form renders the oauth error banner in Vietnamese", () => {
  const form = readFileSync(AUTH_FORM, "utf8");
  assert.match(form, /authError\?: string \| null/);
  assert.match(form, /oauthErrorMessage\(authError\)/);
  assert.match(form, /role="alert"/);
});

test("unknown or missing error codes fall back to a generic message", () => {
  assert.equal(oauthErrorMessage("something-else"), "Đăng nhập thất bại. Hãy thử lại.");
  assert.equal(oauthErrorMessage(null), "Đăng nhập thất bại. Hãy thử lại.");
  assert.equal(oauthErrorMessage(undefined), "Đăng nhập thất bại. Hãy thử lại.");
});
