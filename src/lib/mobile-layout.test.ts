import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PRIMARY_NAV } from "./nav-ia.ts";

/**
 * TASK-112 — Mobile responsive contracts for core chrome.
 * Guards against regressions that reintroduce horizontal overflow,
 * FAB covering list ends, or non-full-width dialogs on small viewports.
 */

const CSS_PATH = join(process.cwd(), "src/app/globals.css");
const SHELL_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.tsx",
);

function css(): string {
  return readFileSync(CSS_PATH, "utf8");
}

function shell(): string {
  return readFileSync(SHELL_PATH, "utf8");
}

/**
 * Slice the TASK-112 app-shell mobile block (not smaller 760px snippets for
 * dialog footer / theme toggle / date headers).
 */
function mobileBlock(source: string): string {
  const anchor = "/* Bottom nav + FAB clearance";
  const anchorIdx = source.indexOf(anchor);
  assert.ok(anchorIdx >= 0, "expected TASK-112 mobile chrome comment in globals.css");
  const start = source.lastIndexOf("@media (max-width: 760px)", anchorIdx);
  assert.ok(start >= 0, "expected @media (max-width: 760px) wrapping shell chrome");
  // Full shell media block is large (insights/tx/accounts + chrome).
  return source.slice(start, Math.min(source.length, start + 28000));
}

test("mobile tabs = 5 (4 primary + Thêm)", () => {
  const mobilePrimary = PRIMARY_NAV.filter(
    (item) => item.kind === "action" || item.mobileTab,
  );
  assert.equal(mobilePrimary.length, 4);

  const source = shell();
  assert.match(source, /label:\s*"Thêm"/);
  assert.match(source, /className="mobile-nav"/);
  assert.match(source, /className="mobile-fab"/);

  // Exactly five children pattern: filter primary tabs + More entry.
  assert.match(
    source,
    /const mobileTabs: NavItem\[] = \[\s*\.\.\.PRIMARY_NAV\.filter/,
  );
});

test("CSS: bottom nav is 5 equal columns + safe-area", () => {
  const block = mobileBlock(css());
  assert.match(
    block,
    /grid-template-columns:\s*repeat\(\s*5\s*,\s*minmax\(0,\s*1fr\)\s*\)/,
  );
  assert.match(block, /safe-area-inset-bottom/);
  assert.match(block, /\.mobile-nav\s*\{/);
});

test("CSS: FAB sits above nav and content end clears FAB", () => {
  const source = css();
  assert.match(source, /--mobile-content-end:/);
  assert.match(source, /--mobile-fab-clearance:/);
  assert.match(source, /--mobile-nav-height:/);
  assert.match(source, /--mobile-fab-gap:/);

  const block = mobileBlock(source);
  assert.match(block, /padding-bottom:\s*var\(--mobile-content-end\)/);
  assert.match(block, /\.mobile-fab\s*\{/);
  // Multiline calc is OK — assert token presence near FAB.
  const fabIdx = block.indexOf(".mobile-fab {");
  assert.ok(fabIdx >= 0, "expected .mobile-fab rule in mobile block");
  const fabSlice = block.slice(fabIdx, fabIdx + 600);
  assert.match(fabSlice, /--mobile-nav-height/);
  assert.match(fabSlice, /--mobile-fab-gap/);
  assert.match(fabSlice, /safe-area-inset-bottom/);
});

test("CSS: dialogs full-width bottom sheets on mobile", () => {
  const block = mobileBlock(css());
  // Selector list (not the earlier comment that mentions the class name).
  const dialogRule = /\.transaction-dialog\s*,\s*\n?\s*\.account-dialog\s*\{[\s\S]{0,400}?\}/;
  const match = block.match(dialogRule);
  assert.ok(match, "expected .transaction-dialog, .account-dialog mobile rule");
  const dialogSlice = match[0];
  // Full bleed sheet (not centered card with side margins).
  assert.match(dialogSlice, /width:\s*100%/);
  assert.match(dialogSlice, /max-width:\s*none/);
  assert.match(dialogSlice, /margin:\s*auto 0 0/);
  assert.match(dialogSlice, /border-radius:\s*24px 24px 0 0/);
});

test("CSS: tables / manager lists scroll horizontally instead of page overflow", () => {
  const source = css();
  assert.match(source, /\.table-scroll\s*\{/);
  assert.match(source, /overflow-x:\s*auto/);
  assert.match(source, /\.manager-list\s*\{/);
  assert.match(source, /\.import-preview-table-scroll/);

  const block = mobileBlock(source);
  assert.match(block, /overflow-x:\s*clip/);
  assert.match(block, /\.insights-dashboard/);
  assert.match(block, /\.transactions-workspace/);
  assert.match(block, /\.accounts-workspace/);
});

test("CSS: touch-visible row actions on mobile (no hover-only opacity)", () => {
  const block = mobileBlock(css());
  assert.match(block, /\.delete-button/);
  assert.match(block, /opacity:\s*1/);
});
