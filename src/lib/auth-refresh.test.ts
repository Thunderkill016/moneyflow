import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const authForm = readFileSync("src/components/auth-form.tsx", "utf8");
const authStyles = readFileSync("src/components/auth-form.module.css", "utf8");
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");

test("authentication uses the product-owned module and document theme", () => {
  assert.doesNotMatch(rootLayout, /auth-refresh\.css/);
  assert.match(authForm, /auth-form\.module\.css/);
  assert.match(rootLayout, /document-theme\.css/);
});

test("authentication preserves Google, password and recovery controls", () => {
  assert.match(authForm, /form action=\{signInWithGoogle\}/);
  assert.match(authForm, /styles\.googleButton/);
  assert.match(authForm, /name="email"/);
  assert.match(authForm, /name="password"/);
  assert.match(
    authForm,
    /mode === "login" \? "current-password" : "new-password"/,
  );
  assert.match(authForm, /href="\/forgot-password"/);
});

test("auth copy stays factual and task-focused", () => {
  assert.doesNotMatch(authForm, /hôm nay bạn có thể chi bao nhiêu/i);
  assert.doesNotMatch(authForm, /có thể chi hôm nay/i);
  assert.doesNotMatch(authForm, /Bức tranh hôm nay/i);
  assert.match(authForm, /MoneyFlow không yêu cầu mật khẩu ngân hàng/);
  assert.match(authForm, /title: "Đăng nhập"/);
  assert.match(authForm, /submit: "Đăng nhập"/);
});

test("authentication is centered, responsive, themed and motion accessible", () => {
  assert.match(authStyles, /min-height:\s*100svh/);
  assert.match(authStyles, /place-items:\s*center/);
  assert.match(authStyles, /@media \(max-width: 520px\)/);
  assert.match(authStyles, /min-height:\s*5[02]px/);
  assert.match(authStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(authStyles, /\.story\b/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(authStyles, /!important/);
});
