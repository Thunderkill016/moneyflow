import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const compatibilityCss = readFileSync(
  join(root, "src/components/mobile-shell-contract.module.css"),
  "utf8",
);
const appShellCss = readFileSync(
  join(root, "src/components/layout/app-shell.module.css"),
  "utf8",
);
const appShell = readFileSync(
  join(root, "src/components/layout/app-shell.tsx"),
  "utf8",
);
const accountsPage = readFileSync(
  join(root, "src/components/accounts-page.tsx"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");

test("App Shell keeps mobile content and focused controls above fixed navigation", () => {
  assert.match(appShellCss, /@media \(max-width: 760px\)/u);
  assert.match(appShellCss, /--mf-shell-mobile-nav-height:\s*68px/u);
  assert.match(appShellCss, /--mf-shell-mobile-nav-reserve:\s*calc\(/u);
  assert.match(appShellCss, /safe-area-inset-bottom/u);
  assert.match(appShellCss, /padding-bottom:\s*var\(--mf-shell-mobile-nav-reserve\)/u);
  assert.match(appShellCss, /scroll-padding-bottom/u);
  assert.match(appShellCss, /scroll-margin-bottom/u);
  assert.doesNotMatch(compatibilityCss, /dialog\[open\]/u);
  assert.doesNotMatch(compatibilityCss, /padding-bottom:\s*calc\(104px/u);
});

test("accounts keeps a separate mobile add-account action through an explicit capability", () => {
  assert.match(appShell, /showPrimaryActionOnMobile/u);
  assert.match(appShellCss, /\.primaryActionMobileVisible/u);
  assert.match(accountsPage, /showPrimaryActionOnMobile/u);
  assert.doesNotMatch(compatibilityCss, /body:has/u);
  assert.doesNotMatch(compatibilityCss, /button:first-child/u);
});

test("quick-capture amount field retains bounded dark compatibility until Phase 5", () => {
  assert.match(compatibilityCss, /transaction-dialog \.amount-field > div/u);
  assert.match(compatibilityCss, /background:\s*var\(--mf-canvas\)/u);
  assert.match(compatibilityCss, /color:\s*var\(--mf-text\)/u);
  assert.match(compatibilityCss, /placeholder/u);
  assert.match(compatibilityCss, /color:\s*var\(--mf-text-soft\)/u);
  assert.doesNotMatch(
    compatibilityCss,
    /background:\s*(?:white|#fff(?:fff)?)/u,
  );
});

test("root layout mounts only the bounded transaction compatibility remainder", () => {
  assert.match(
    layout,
    /import \{ MobileShellContract \} from "@\/components\/mobile-shell-contract"/u,
  );
  assert.equal((layout.match(/<MobileShellContract \/>/gu) ?? []).length, 1);
  assert.match(appShell, /root\.dataset\.moneyflowShell = "mounted"/u);
});
