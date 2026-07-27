import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const authForm = readFileSync("src/components/auth-form.tsx", "utf8");
const authStyles = readFileSync("src/components/auth-form.module.css", "utf8");
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");

test("authentication uses the Calm Ledger module instead of a global patch", () => {
  assert.doesNotMatch(rootLayout, /auth-refresh\.css/);
  assert.match(authForm, /auth-form\.module\.css/);
  assert.match(rootLayout, /document-theme\.css/);
});

test("authentication preserves Google and password controls", () => {
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

test("auth copy does not restore a spending recommendation", () => {
  assert.doesNotMatch(authForm, /hôm nay bạn có thể chi bao nhiêu/i);
  assert.doesNotMatch(authForm, /có thể chi hôm nay/i);
  assert.match(authForm, /Chuyển ví không tính là chi/);
});

test("authentication is responsive, themed and motion accessible", () => {
  assert.match(authStyles, /min-height:\s*100svh/);
  assert.match(authStyles, /@media \(max-width: 760px\)/);
  assert.match(authStyles, /min-height:\s*48px/);
  assert.match(authStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(authStyles, /!important/);
});
