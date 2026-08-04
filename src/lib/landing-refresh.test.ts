import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const landingPage = readFileSync("src/components/landing-page.tsx", "utf8");
const landingStyles = readFileSync(
  "src/components/landing-page.module.css",
  "utf8",
);
const publicTheme = readFileSync(
  "src/components/public-brand-theme.module.css",
  "utf8",
);
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");
const rejectedDirection = readFileSync(
  "docs/design/SIGNAL_LEDGER_V3.md",
  "utf8",
);

test("public UI uses semantic theme infrastructure without a named doctrine", () => {
  assert.match(rootLayout, /import "\.\/document-theme\.css"/);
  assert.doesNotMatch(rootLayout, /landing-refresh\.css/);
  assert.doesNotMatch(rootLayout, /landing-dark-mode-guardrails\.css/);
  assert.match(landingPage, /landing-page\.module\.css/);
  assert.match(documentTheme, /--mf-canvas/);
  assert.doesNotMatch(documentTheme, /authority — Signal Ledger/);
  assert.match(rejectedDirection, /Status: rejected \/ superseded/);
  assert.match(rejectedDirection, /historical material only/);
});

test("landing keeps a real conversion path and guided product evidence", () => {
  assert.match(landingPage, /href="\/register"/);
  assert.match(landingPage, /href="#cach-hoat-dong"/);
  assert.doesNotMatch(landingPage, /Thử demo không cần tài khoản/);
  assert.doesNotMatch(landingPage, /href="\/dashboard"/);
  assert.match(landingPage, /Giao diện thật từ môi trường kiểm thử/);
  assert.match(landingPage, /Chuyển nội bộ không bị tính thành chi tiêu/);
  assert.match(landingPage, /Bạn vừa ghi gì\?/);
  assert.match(landingPage, /Số dư nào thay đổi\?/);
  assert.match(landingPage, /Con số đến từ đâu\?/);
  assert.match(landingPage, /Mở lại đúng khoản đứng sau số tổng/);
});

test("landing is responsive, public-light and motion accessible", () => {
  assert.match(
    landingStyles,
    /min-height:\s*min\(760px,\s*calc\(100svh - 72px\)\)/,
  );
  assert.match(landingStyles, /@media \(max-width: 980px\)/);
  assert.match(landingStyles, /@media \(max-width: 680px\)/);
  assert.match(landingStyles, /min-height:\s*44px/);
  assert.match(landingStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(landingStyles, /html\[data-theme="dark"\]/);
  assert.match(publicTheme, /color-scheme:\s*light/);
  assert.doesNotMatch(publicTheme, /html\[data-theme="dark"\]/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(landingStyles, /!important/);
});
