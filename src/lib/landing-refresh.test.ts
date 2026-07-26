import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const landingPage = readFileSync("src/components/landing-page.tsx", "utf8");
const landingStyles = readFileSync(
  "src/components/landing-page.module.css",
  "utf8",
);
const tokens = readFileSync("src/app/calm-ledger-tokens.css", "utf8");

test("Calm Ledger public UI replaces legacy global landing layers", () => {
  assert.match(rootLayout, /import "\.\/calm-ledger-tokens\.css"/);
  assert.doesNotMatch(rootLayout, /landing-refresh\.css/);
  assert.doesNotMatch(rootLayout, /landing-dark-mode-guardrails\.css/);
  assert.match(landingPage, /landing-page\.module\.css/);
});

test("landing keeps one real conversion action and no fake production demo", () => {
  assert.match(landingPage, /href="\/register"/);
  assert.match(landingPage, /href="#cach-hoat-dong"/);
  assert.doesNotMatch(landingPage, /Thử demo không cần tài khoản/);
  assert.doesNotMatch(landingPage, /href="\/insights"/);
  assert.match(landingPage, /Chuyển ví không tính là chi/);
});

test("landing is responsive, dark-mode aware and motion accessible", () => {
  assert.match(landingStyles, /min-height:\s*calc\(100svh - 72px\)/);
  assert.match(landingStyles, /@media \(max-width: 820px\)/);
  assert.match(landingStyles, /@media \(max-width: 560px\)/);
  assert.match(landingStyles, /min-height:\s*44px/);
  assert.match(landingStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(tokens, /\[data-theme="dark"\]/);
  assert.doesNotMatch(landingStyles, /!important/);
});
