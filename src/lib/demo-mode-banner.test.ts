/**
 * TASK-113 — Demo mode sticky banner in AppShell when viewer.isDemo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SHELL_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.tsx",
);
const CSS_PATH = join(process.cwd(), "src/app/globals.css");

function shell(): string {
  return readFileSync(SHELL_PATH, "utf8");
}

function css(): string {
  return readFileSync(CSS_PATH, "utf8");
}

test("AppShell shows demo banner only when viewer.isDemo", () => {
  const source = shell();
  assert.match(source, /viewer\.isDemo\s*\?/);
  assert.match(source, /className=\{styles\.demoBanner\}/);
  assert.ok(
    source.includes("Chế độ demo — dữ liệu lưu trên trình duyệt"),
    "expected sticky demo copy",
  );
  assert.match(source, /href="\/register"/);
  assert.match(source, /Đăng ký/);
});

test("demo banner CSS is sticky under topbar", () => {
  const source = css();
  assert.match(source, /\.demo-mode-banner\s*\{/);
  assert.match(source, /position:\s*sticky/);
  assert.match(source, /\.demo-mode-banner-cta\s*\{/);
});

/**
 * Q5 — Mobile FAB Ghi chi must stay tappable above the demo banner.
 * Banner is sticky top chrome only; FAB is fixed bottom above nav with
 * higher z-index so short viewports never bury the primary CTA.
 */
function ruleBlock(source: string, selector: string): string {
  const re = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const m = source.match(re);
  assert.ok(m, `expected CSS rule for ${selector}`);
  return m[1];
}

function cssVarInt(source: string, name: string): number {
  const re = new RegExp(`${name.replace(/-/g, "\\-")}:\\s*(\\d+)`);
  const m = source.match(re);
  assert.ok(m, `expected CSS custom property ${name}`);
  return Number(m[1]);
}

test("Q5: demo banner is top sticky, never fixed bottom over FAB", () => {
  const source = css();
  const block = ruleBlock(source, ".demo-mode-banner");
  assert.match(block, /position:\s*sticky/);
  assert.match(block, /top:\s*\d+px/);
  assert.doesNotMatch(block, /position:\s*fixed/);
  assert.doesNotMatch(block, /bottom:\s*/);
  // Stays in sticky layer — below mobile chrome tokens
  assert.match(block, /z-index:\s*var\(--z-sticky\)/);
});

test("Q5: mobile FAB z-index is above demo banner sticky layer", () => {
  const source = css();
  const sticky = cssVarInt(source, "--z-sticky");
  const fabZ = cssVarInt(source, "--z-mobile-fab");
  const navZ = cssVarInt(source, "--z-mobile-nav");
  assert.ok(fabZ > sticky, `FAB z (${fabZ}) must exceed sticky banner (${sticky})`);
  assert.ok(navZ > fabZ, `nav z (${navZ}) should sit above FAB (${fabZ})`);

  // Fixed bottom FAB must use the mobile-fab token (not a bare z that can drift under banner)
  const fixedFab = source.match(
    /\.mobile-fab\s*\{[^}]*position:\s*fixed[^}]*\}/,
  );
  assert.ok(fixedFab, "expected fixed .mobile-fab rule");
  assert.match(fixedFab[0], /z-index:\s*var\(--z-mobile-fab\)/);
  assert.match(fixedFab[0], /bottom:\s*calc/);
  assert.match(source, /\.mobile-nav\s*\{[^}]*z-index:\s*var\(--z-mobile-nav\)/);
});

test("Q5: mobile demo banner stays single-line so it cannot grow over FAB", () => {
  const source = css();
  // Compact: text ellipsis keeps banner height predictable under topbar
  const textRule = ruleBlock(source, ".demo-mode-banner-text");
  assert.match(textRule, /text-overflow:\s*ellipsis/);
  assert.match(textRule, /white-space:\s*nowrap/);
  assert.match(textRule, /overflow:\s*hidden/);

  // Mobile override: under 66px topbar, capped height, sticky z (not bottom chrome)
  assert.match(
    source,
    /\.demo-mode-banner\s*\{[^}]*top:\s*66px;\s*z-index:\s*var\(--z-sticky\)/,
  );
  assert.match(
    source,
    /\.demo-mode-banner\s*\{[^}]*max-height:\s*44px/,
  );
  assert.match(
    source,
    /\.demo-mode-banner\s*\{[^}]*flex-wrap:\s*nowrap/,
  );
});
