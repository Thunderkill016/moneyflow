/**
 * TASK-113 — Demo mode banner and mobile capture live in the App Shell owner.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SHELL_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.tsx",
);
const CSS_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.module.css",
);

function shell(): string {
  return readFileSync(SHELL_PATH, "utf8");
}

function css(): string {
  return readFileSync(CSS_PATH, "utf8");
}

function ruleBlock(source: string, selector: string): string {
  const re = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const match = source.match(re);
  assert.ok(match, `expected CSS rule for ${selector}`);
  return match[1];
}

function mobileRuleBlock(source: string, selector: string): string {
  const mediaStart = source.indexOf("@media (max-width: 760px)");
  assert.ok(mediaStart >= 0, "expected App Shell mobile breakpoint");
  return ruleBlock(source.slice(mediaStart), selector);
}

test("AppShell shows demo banner only when viewer.isDemo", () => {
  const source = shell();
  assert.match(source, /viewer\.isDemo\s*\?/);
  assert.match(source, /className=\{styles\.demoBanner\}/);
  assert.ok(
    source.includes("Chế độ demo — dữ liệu lưu trên trình duyệt"),
    "expected demo copy",
  );
  assert.match(source, /href="\/register"/);
  assert.match(source, /Đăng ký/);
});

test("demo banner is locally owned and remains normal-flow chrome", () => {
  const block = ruleBlock(css(), ".demoBanner");
  assert.match(block, /min-height:\s*42px/);
  assert.match(block, /display:\s*flex/);
  assert.doesNotMatch(block, /position:\s*(?:fixed|sticky)/);
  assert.doesNotMatch(block, /bottom:\s*/);
});

test("mobile capture is part of the fixed App Shell nav, not a legacy floating FAB", () => {
  const source = css();
  const nav = mobileRuleBlock(source, ".mobileNav");
  assert.match(nav, /position:\s*fixed/);
  // The floating bar is offset from the bottom edge by its inset plus the safe area.
  assert.match(nav, /bottom:\s*calc\(var\(--mf-shell-mobile-nav-inset\)/);
  assert.match(nav, /z-index:\s*var\(--mf-shell-layer-mobile-nav\)/);

  const item = mobileRuleBlock(source, ".mobileNavItem");
  assert.match(item, /min-height:\s*52px/);
  assert.match(shell(), /styles\.mobileCapture/u);
  assert.doesNotMatch(shell(), /mobile-fab/u);
});

test("mobile content reserves bottom-nav safe area without banner overlay", () => {
  const source = css();
  const mobile = source.slice(source.indexOf("@media (max-width: 760px)"));
  assert.match(
    mobile,
    /\.shell\s*\{[^}]*padding-bottom:\s*var\(--mf-shell-mobile-nav-reserve\)/u,
  );
  assert.match(source, /safe-area-inset-bottom/u);
  assert.match(source, /\.demoBanner\s*>\s*span\s*\{[^}]*flex:\s*1/u);
  assert.doesNotMatch(source, /\.demo-mode-banner/u);
  assert.doesNotMatch(source, /\.mobile-fab/u);
});
