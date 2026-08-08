import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const authForm = readFileSync("src/components/auth-form.tsx", "utf8");
const authStyles = readFileSync("src/components/auth-form.module.css", "utf8");
const publicTheme = readFileSync(
  "src/components/public-brand-theme.module.css",
  "utf8",
);
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");

const retiredPublicGenerations = [
  "src/app/landing-refresh.css",
  "src/app/landing-dark-mode-guardrails.css",
  "src/app/auth-refresh.css",
];

test("public auth has one light-only semantic presentation owner", () => {
  assert.match(authForm, /public-brand-theme\.module\.css/);
  assert.match(authForm, /themeStyles\.authTheme/);
  assert.match(publicTheme, /\.authTheme\.authTheme/);
  assert.match(publicTheme, /color-scheme:\s*light/);
  assert.match(publicTheme, /--auth-accent:\s*var\(--mf-brand\)/);
  assert.doesNotMatch(publicTheme, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(authStyles, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(authStyles, /#176f55|#105e47|#6fd0aa|#83d6b5|#78d2ad/i);
  assert.match(authStyles, /background:\s*var\(--auth-canvas\)/);
  assert.match(authStyles, /background:\s*var\(--auth-accent\)/);
});

test("root theme bootstrap keeps every public auth route light", () => {
  for (const route of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/privacy",
  ]) {
    assert.match(rootLayout, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(rootLayout, /pathname\.indexOf\('\/auth\/'\) === 0/);
});

test("authentication keeps password-manager and copy-paste mechanisms available", () => {
  assert.match(authForm, /autoComplete="email"/);
  assert.match(authForm, /"current-password"/);
  assert.match(authForm, /"new-password"/);
  assert.doesNotMatch(authForm, /onPaste\s*=/);
  assert.doesNotMatch(authForm, /clipboardData/);
  assert.doesNotMatch(authForm, /preventDefault\(\)/);
  assert.match(authForm, /signInWithGoogle/);
  assert.match(authForm, /AuthTurnstile/);
});

test("all supported auth modes retain labels, recovery and safe feedback", () => {
  assert.match(authForm, /type Mode = "login" \| "register" \| "forgot" \| "update"/);
  assert.match(authForm, /Quên mật khẩu\?/);
  assert.match(authForm, /href="\/forgot-password"/);
  assert.match(authForm, /aria-invalid=/);
  assert.match(authForm, /aria-describedby=/);
  assert.match(authForm, /role="alert"/);
  assert.match(authForm, /role=\{state\.success \? "status" : "alert"\}/);
  assert.match(authForm, /privacyAccepted/);
});

test("retired landing and auth generations stay physically absent", () => {
  for (const path of retiredPublicGenerations) {
    assert.equal(existsSync(path), false, `${path} must remain deleted`);
  }
});
