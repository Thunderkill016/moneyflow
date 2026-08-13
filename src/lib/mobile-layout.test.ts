import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PRIMARY_NAV } from "./nav-ia.ts";

/**
 * TASK-112 — Mobile responsive contracts for current chrome.
 * Source assertions stay on local owners; runtime geometry is blocked by the
 * cross-device and minimum-target Playwright audits.
 */

const ROOT = process.cwd();
const SHELL_PATH = join(ROOT, "src/components/layout/app-shell.tsx");
const SHELL_CSS_PATH = join(ROOT, "src/components/layout/app-shell.module.css");
const SHEET_PATH = join(ROOT, "src/components/ui/sheet.tsx");
const RESPONSIVE_AUDIT_PATH = join(ROOT, "e2e/audit/responsive-audit.ts");
const TARGET_AUDIT_PATH = join(
  ROOT,
  "e2e/audit/minimum-target-size.responsive.audit.spec.ts",
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function mobileCss(): string {
  const source = read(SHELL_CSS_PATH);
  const start = source.indexOf("@media (max-width: 760px)");
  assert.ok(start >= 0, "expected App Shell mobile breakpoint");
  return source.slice(start);
}

test("mobile tabs = 5 (4 primary + Thêm)", () => {
  const mobilePrimary = PRIMARY_NAV.filter(
    (item) => item.kind === "action" || item.mobileTab,
  );
  assert.equal(mobilePrimary.length, 4);

  const source = read(SHELL_PATH);
  assert.match(source, /label:\s*"Thêm"/);
  assert.match(source, /className=\{styles\.mobileNav\}/);
  assert.match(source, /styles\.mobileNavItem,[\s\S]*styles\.mobileCapture,/u);
  assert.match(
    source,
    /const mobileTabs: NavItem\[] = \[\s*\.\.\.PRIMARY_NAV\.filter/,
  );
});

test("App Shell owns five-column bottom navigation and safe-area reserve", () => {
  const block = mobileCss();
  assert.match(
    block,
    /\.mobileNav\s*\{[\s\S]*?position:\s*fixed[\s\S]*?bottom:\s*calc\([\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/u,
  );
  assert.match(block, /safe-area-inset-bottom/u);
  assert.match(
    block,
    /\.shell\s*\{[\s\S]*?padding-bottom:\s*var\(--mf-shell-mobile-nav-reserve\)/u,
  );
});

test("capture is a nav item, not a second floating FAB", () => {
  const shell = read(SHELL_PATH);
  const styles = read(SHELL_CSS_PATH);
  assert.match(shell, /styles\.mobileCapture/u);
  assert.match(styles, /\.mobileCapture\s*\{/u);
  assert.doesNotMatch(shell, /mobile-fab/iu);
  assert.doesNotMatch(styles, /\.mobile-fab/iu);
});

test("Sheet primitive owns edge geometry without legacy dialog selectors", () => {
  // Comments stripped: the primitive documents *why* `dvh` is wrong by naming it,
  // and prose must never decide a check about executable code.
  const source = read(SHEET_PATH)
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
  assert.match(source, /bottom:\s*\n?\s*"fixed inset-x-0 bottom-0/u);
  assert.match(source, /w-full max-w-none/u);
  assert.match(source, /right:\s*\n?\s*"fixed inset-y-0 right-0/u);
  assert.match(source, /h-svh max-h-svh/u);
  /**
   * `dvh` is forbidden here on purpose.
   *
   * The dynamic viewport unit tracks mobile browser chrome, so a sheet sized in
   * it grows and shrinks under the user's thumb as the address bar hides and
   * returns. The owner's physical run reported exactly that as unstable sheet
   * positioning, so `svh` — the smallest viewport state — is the contract.
   */
  assert.doesNotMatch(source, /dvh/u);
  assert.doesNotMatch(source, /transaction-dialog/u);
  assert.doesNotMatch(source, /account-dialog/u);
});

test("runtime audit blocks document overflow, clipped dialogs and offscreen controls", () => {
  const source = read(RESPONSIVE_AUDIT_PATH);
  assert.match(source, /document-horizontal-overflow/u);
  assert.match(source, /interactive-outside-viewport/u);
  assert.match(source, /dialog-clipped-without-scroll/u);
  assert.match(source, /financial-value-wrapped/u);
  assert.match(source, /toEqual\(\[\]\)/u);
});

test("minimum target audit keeps core routes at the 44px product floor", () => {
  const source = read(TARGET_AUDIT_PATH);
  assert.match(source, /const MINIMUM_TARGET_SIZE = 44/u);
  assert.match(source, /new Set\(\[320, 390, 1_366\]\)/u);
  assert.match(source, /settings-notifications/u);
  assert.match(source, /settings-privacy/u);
  assert.match(source, /toEqual\(\[\]\)/u);
});
