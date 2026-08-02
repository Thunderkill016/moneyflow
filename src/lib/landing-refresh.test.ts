import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const landingPage = readFileSync("src/components/landing-page.tsx", "utf8");
const landingStyles = readFileSync(
  "src/components/landing-page.module.css",
  "utf8",
);
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");

test("public UI uses the document theme authority", () => {
  assert.match(rootLayout, /import "\.\/document-theme\.css"/);
  assert.doesNotMatch(rootLayout, /landing-refresh\.css/);
  assert.doesNotMatch(rootLayout, /landing-dark-mode-guardrails\.css/);
  assert.match(landingPage, /landing-page\.module\.css/);
  assert.match(documentTheme, /--mf-canvas/);
});

test("landing keeps a real conversion path and labeled product evidence", () => {
  assert.match(landingPage, /href="\/register"/);
  assert.match(landingPage, /href="#giao-dien"/);
  assert.doesNotMatch(landingPage, /Thử demo không cần tài khoản/);
  assert.doesNotMatch(landingPage, /href="\/dashboard"/);
  assert.match(landingPage, /Giao diện thật từ bản kiểm thử/);
  assert.match(landingPage, /Chuyển nội bộ không bị tính thành chi tiêu/);
});

test("landing is responsive, theme-aware and motion accessible", () => {
  assert.match(landingStyles, /min-height:\s*calc\(100svh - 68px\)/);
  assert.match(landingStyles, /@media \(max-width: 980px\)/);
  assert.match(landingStyles, /@media \(max-width: 760px\)/);
  assert.match(landingStyles, /min-height:\s*44px/);
  assert.match(landingStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(landingStyles, /!important/);
});
