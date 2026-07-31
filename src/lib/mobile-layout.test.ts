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
  assert.match(source, /className=\{styles\.mobileNav\}/);
  // Capture is the center nav item (styles.mobileCapture), not a separate FAB —
  // the Calm Ledger redesign removed the duplicate floating action button.
  assert.match(source, /styles\.mobileNavItem,\s*\n\s*styles\.mobileCapture,/);

  // Exactly five children pattern: filter primary tabs + More entry.
  assert.match(
    source,
    /const mobileTabs: NavItem\[] = \[\s*\.\.\.PRIMARY_NAV\.filter/,
  );
});

/**
 * These two tests used to read `globals.css` for `.mobile-nav` and `.mobile-fab`.
 * Both classes are absent from the DOM — a probe across five routes at 390 and
 * 1366 finds zero nodes — so the rules they asserted never applied, and the tests
 * were green regardless of what the real bottom nav did.
 *
 * Repointed at `app-shell.module.css`, which is what `app-shell.tsx` actually
 * renders. The five-column and safe-area claims are true there, so these become
 * real guards rather than decorative ones.
 */
function shellModule(): string {
  return readFileSync(
    join(process.cwd(), "src/components/layout/app-shell.module.css"),
    "utf8",
  );
}

/** The phone block of the CSS Module, where `.mobileNav` is laid out. */
function moduleMobileBlock(source: string): string {
  const start = source.indexOf("@media (max-width: 760px)");
  assert.ok(start >= 0, "expected a 760px block in app-shell.module.css");
  return source.slice(start);
}

test("CSS: bottom nav is 5 equal columns + safe-area", () => {
  const block = moduleMobileBlock(shellModule());
  const navIdx = block.indexOf(".mobileNav {");
  assert.ok(navIdx >= 0, "expected .mobileNav rule in the module's phone block");
  const nav = block.slice(navIdx, navIdx + 700);

  assert.match(
    nav,
    /grid-template-columns:\s*repeat\(\s*5\s*,\s*minmax\(0,\s*1fr\)\s*\)/,
  );
  // Asserted inside the .mobileNav rule, not merely somewhere in the file: the
  // module uses safe-area in five places, so a file-wide match would pass even if
  // the nav itself lost its inset padding.
  assert.match(nav, /env\(safe-area-inset-bottom\)/);
  assert.match(nav, /position:\s*fixed/);
  assert.match(nav, /bottom:\s*0/);
});

test("CSS: the centre nav item is the capture action, not a separate FAB", () => {
  // The Calm Ledger redesign removed the floating action button; capture became
  // the middle tab. The old test asserted a `.mobile-fab` rule in globals.css and
  // passed for as long as that dead rule sat there.
  const source = shellModule();
  assert.match(source, /\.mobileCapture\s*\{/);
  assert.doesNotMatch(
    shell(),
    /styles\.mobileFab/,
    "a reintroduced FAB needs its own contract, not this one",
  );

  // The shell owns the clearance that keeps the last row above the bottom nav.
  const block = moduleMobileBlock(source);
  const shellIdx = block.indexOf(".shell {");
  assert.ok(shellIdx >= 0, "expected .shell rule in the module's phone block");
  assert.match(
    block.slice(shellIdx, shellIdx + 300),
    /padding-bottom:\s*calc\([^)]*env\(safe-area-inset-bottom\)/,
  );
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
  // `.table-scroll` was asserted here and is gone: no product code renders it.
  // The scroll container that exists is `.import-preview-table-scroll`, asserted
  // below. An earlier check called `.table-scroll` live on a substring match
  // against that longer name — the two are different classes.
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

test("CSS: modal centring cannot outrank bottom-sheet layouts", () => {
  const source = css();

  // Issue #145 fix. `:where()` contributes zero specificity, so every bottom-sheet
  // rule still wins: the phone override in this file at (0,1,0), and the capture
  // chooser's own CSS Module class, also (0,1,0). A bare `dialog:modal` would be
  // (0,1,1) and would flatten all of them into floating cards — which is exactly
  // what happened on the first attempt at this fix.
  assert.match(source, /:where\(dialog:modal\)\s*\{[^}]*margin:\s*auto/);
  assert.doesNotMatch(
    source,
    /(^|\n)\s*dialog:modal\s*\{/,
    "dialog:modal must stay wrapped in :where() so sheet rules keep winning",
  );
});
