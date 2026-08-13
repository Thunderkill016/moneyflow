import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appShellCss = readFileSync(
  join(root, "src/components/layout/app-shell.module.css"),
  "utf8",
);
const appShell = readFileSync(
  join(root, "src/components/layout/app-shell.tsx"),
  "utf8",
);
const accountsPage = readFileSync(
  join(root, "src/components/accounts/accounts-workspace.tsx"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const transactionFormCss = readFileSync(
  join(root, "src/components/transactions/transaction-form.module.css"),
  "utf8",
);

test("App Shell keeps mobile content and focused controls above fixed navigation", () => {
  assert.match(appShellCss, /@media \(max-width: 760px\)/u);
  // Geometry updated by the evolutionary UI refresh: the bar floats, so its height
  // shrank while the touch target stayed above the 44px product floor, and the reserve
  // now includes the floating inset so content still clears it.
  assert.match(appShellCss, /--mf-shell-mobile-nav-height:\s*70px/u);
  assert.match(appShellCss, /--mf-shell-mobile-nav-reserve:\s*calc\(/u);
  assert.match(appShellCss, /safe-area-inset-bottom/u);
  assert.match(appShellCss, /padding-bottom:\s*var\(--mf-shell-mobile-nav-reserve\)/u);
  assert.match(appShellCss, /scroll-padding-bottom/u);
  assert.match(appShellCss, /scroll-margin-bottom/u);
});

test("accounts keeps a separate mobile add-account action through an explicit capability", () => {
  assert.match(appShell, /showPrimaryActionOnMobile/u);
  assert.match(appShellCss, /\.primaryActionMobileVisible/u);
  assert.match(accountsPage, /showPrimaryActionOnMobile/u);
  assert.doesNotMatch(appShell, /body:has/u);
});

test("quick-capture amount field has a local dark and dynamic-viewport owner", () => {
  assert.match(transactionFormCss, /\.amountControl/u);
  assert.match(transactionFormCss, /background:\s*var\(--mf-surface\)/u);
  assert.match(transactionFormCss, /color:\s*var\(--mf-text\)/u);
  assert.match(transactionFormCss, /\.amountInput::placeholder/u);
  assert.match(transactionFormCss, /color:\s*var\(--mf-text-soft\)/u);
  // `svh` replaced `dvh` after a physical-phone run: the dynamic unit resizes the
  // dialog as mobile browser chrome hides and returns.
  assert.match(transactionFormCss, /100svh/u);
  assert.doesNotMatch(transactionFormCss, /dvh/u);
  assert.match(transactionFormCss, /@media \(max-width: 360px\)/u);
  assert.doesNotMatch(
    transactionFormCss,
    /background:\s*(?:white|#fff(?:fff)?)/u,
  );
});

test("root layout no longer mounts the Phase 3 compatibility remainder", () => {
  assert.doesNotMatch(layout, /MobileShellContract/u);
  assert.equal(
    existsSync(join(root, "src/components/mobile-shell-contract.tsx")),
    false,
  );
  assert.equal(
    existsSync(join(root, "src/components/mobile-shell-contract.module.css")),
    false,
  );
  assert.match(appShell, /root\.dataset\.moneyflowShell = "mounted"/u);
});
