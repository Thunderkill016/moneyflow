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

/*
 * The `.mobile-fab` half of this test has been removed, and the rest of the Q5
 * suite needs an owner's decision rather than a quiet rewrite.
 *
 * What it asserted: a fixed `.mobile-fab` rule carrying `var(--z-mobile-fab)`,
 * and a `.mobile-nav` rule carrying `var(--z-mobile-nav)`, so the FAB would layer
 * above a sticky demo banner. None of those three classes is in the DOM. The real
 * bottom nav is `styles.mobileNav` and uses a literal `z-index: 50`; the tokens
 * `--z-mobile-fab: 34` and `--z-mobile-nav: 35` are defined in globals.css and
 * referenced by nothing.
 *
 * The banner is the larger problem. `.demo-mode-banner` is not in the DOM either —
 * the shell renders `styles.demoBanner`, which is `margin: 18px auto 0` in normal
 * flow with no z-index and nothing sticky about it. So this suite's entire premise,
 * a sticky banner that a floating button must out-layer, describes a UI that was
 * replaced. Rewriting it means deciding what the demo banner's contract now is,
 * which is not a cleanup decision. Recorded in the work packet.
 *
 * What survives is the token ordering itself, which still documents intent.
 */
test("Q5: mobile chrome z-tokens stay ordered above the sticky layer", () => {
  const source = css();
  const sticky = cssVarInt(source, "--z-sticky");
  const fabZ = cssVarInt(source, "--z-mobile-fab");
  const navZ = cssVarInt(source, "--z-mobile-nav");
  assert.ok(fabZ > sticky, `FAB z (${fabZ}) must exceed sticky banner (${sticky})`);
  assert.ok(navZ > fabZ, `nav z (${navZ}) should sit above FAB (${fabZ})`);
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
