import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const refresh = readFileSync("src/app/auth-refresh.css", "utf8");
const authForm = readFileSync("src/components/auth-form.tsx", "utf8");

test("authentication refresh loads after shared public and product styles", () => {
  const productImport = layout.indexOf('import "./ui-refresh.css"');
  const landingImport = layout.indexOf('import "./landing-refresh.css"');
  const authImport = layout.indexOf('import "./auth-refresh.css"');

  assert.ok(productImport >= 0, "product refresh import is missing");
  assert.ok(landingImport > productImport, "landing refresh must follow product styles");
  assert.ok(authImport > landingImport, "auth refresh must load last");
});

test("login refresh preserves Google and password authentication controls", () => {
  assert.match(authForm, /form action=\{signInWithGoogle\}/);
  assert.match(authForm, /className="google-button"/);
  assert.match(authForm, /name="email"/);
  assert.match(authForm, /name="password"/);
  assert.match(authForm, /autoComplete=\{mode === "login" \? "current-password" : "new-password"\}/);
  assert.match(authForm, /href="\/forgot-password"/);
});

test("authentication refresh is mobile, dark-mode and reduced-motion aware", () => {
  assert.match(refresh, /\.auth-page\s*\{/);
  assert.match(refresh, /\.google-button\s*\{/);
  assert.match(refresh, /\.auth-form input:not\(\[type="checkbox"\]\)/);
  assert.match(refresh, /\[data-theme="dark"\] \.auth-card/);
  assert.match(refresh, /@media \(max-width: 760px\)/);
  assert.match(refresh, /min-height:\s*52px !important/);
  assert.match(refresh, /@media \(prefers-reduced-motion: reduce\)/);
});
