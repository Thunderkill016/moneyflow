import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appShell = readFileSync(
  join(root, "src/components/layout/app-shell.tsx"),
  "utf8",
);
const appShellStyles = readFileSync(
  join(root, "src/components/layout/app-shell.module.css"),
  "utf8",
);
const sheet = readFileSync(
  join(root, "src/components/ui/sheet.tsx"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const accountsPage = readFileSync(
  join(root, "src/components/accounts/accounts-workspace.tsx"),
  "utf8",
);
const transactionForm = readFileSync(
  join(root, "src/components/transactions/transaction-form.module.css"),
  "utf8",
);
const toast = readFileSync(
  join(root, "src/components/ui/toast.tsx"),
  "utf8",
);

test("App Shell composes the approved shared owners", () => {
  assert.match(appShell, /import \{ BrandLockup \}/u);
  assert.match(appShell, /import \{ Sheet \}/u);
  assert.match(appShell, /ToastRegion/u);
  assert.match(appShell, /Button,/u);
  assert.match(appShell, /IconButton,/u);
  assert.match(appShell, /LinkButton,/u);
  assert.doesNotMatch(appShell, /function Brand\(/u);
  assert.doesNotMatch(appShell, /<dialog/u);
  assert.doesNotMatch(appShell, /function Toast\(/u);
});

test("capture chooser uses deliberate centered modal placement", () => {
  assert.match(sheet, /type SheetSide = "center" \| "left"/u);
  assert.match(sheet, /center:\s*"m-auto h-auto/u);
  assert.match(appShell, /title="Ghi giao dịch"[\s\S]*side="center"/u);
  assert.match(appShell, /title="Thêm & tài khoản"[\s\S]*side="right"/u);
});

test("route capabilities replace structural chrome inference", () => {
  assert.match(appShell, /showPrimaryActionOnMobile/u);
  assert.match(accountsPage, /showPrimaryActionOnMobile/u);
  assert.doesNotMatch(appShell, /body:has/u);
});

test("active shell IA no longer contains the retired insights branch", () => {
  const retiredRoute = `/${"ins"}${"ights"}`;
  assert.equal(appShell.includes(`item.href === "${retiredRoute}"`), false);
  assert.doesNotMatch(appShell, /isPlanningPath/u);
});

test("viewport and safe-area geometry are explicit and single-owner", () => {
  assert.match(layout, /viewportFit:\s*"cover"/u);
  // Geometry updated by the evolutionary UI refresh: the bar floats, so its height
  // shrank while the touch target stayed above the 44px product floor, and the reserve
  // now includes the floating inset so content still clears it.
  assert.match(appShellStyles, /--mf-shell-mobile-nav-height:\s*66px/u);
  assert.match(appShellStyles, /--mf-shell-mobile-nav-inset:\s*10px/u);
  assert.match(
    appShellStyles,
    /--mf-shell-mobile-nav-reserve:\s*calc\([\s\S]*?nav-height\)[\s\S]*?nav-inset\)[\s\S]*?safe-area-inset-bottom/u,
  );
  assert.match(appShellStyles, /--mf-shell-mobile-nav-reserve:\s*calc\(/u);
  assert.match(appShellStyles, /safe-area-inset-bottom/u);
  assert.match(appShellStyles, /scroll-padding-top/u);
  assert.match(appShellStyles, /scroll-padding-bottom/u);
  assert.match(appShellStyles, /scroll-margin-bottom/u);
  assert.match(appShell, /root\.dataset\.moneyflowShell = "mounted"/u);
  assert.doesNotMatch(appShellStyles, /calc\(76px/u);
  assert.doesNotMatch(appShellStyles, /calc\(82px/u);
  assert.doesNotMatch(appShellStyles, /calc\(104px/u);
});

test("server-rendered shell owns mobile reserve before the mounted document marker", () => {
  const shellOwner = appShellStyles.match(/\.shell\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.match(shellOwner, /--mf-shell-mobile-nav-height:\s*66px/u);
  assert.match(shellOwner, /--mf-shell-mobile-nav-inset:\s*10px/u);
  assert.match(shellOwner, /--mf-shell-mobile-nav-reserve:\s*calc\(/u);
  assert.match(shellOwner, /--mf-shell-layer-mobile-nav:\s*50/u);
  assert.match(shellOwner, /--mf-shell-layer-feedback:\s*60/u);
});

test("normal shell layers are separate from modal top-layer behavior", () => {
  assert.match(appShellStyles, /--mf-shell-layer-topbar/u);
  assert.match(appShellStyles, /--mf-shell-layer-sidebar/u);
  assert.match(appShellStyles, /--mf-shell-layer-mobile-nav/u);
  assert.match(appShellStyles, /--mf-shell-layer-feedback/u);
  assert.doesNotMatch(appShellStyles, /\.shellSheet\s*\{[^}]*z-index/u);
});

test("Phase 5 retires the MobileShellContract transaction remainder", () => {
  assert.doesNotMatch(layout, /MobileShellContract/u);
  assert.equal(
    existsSync(join(root, "src/components/mobile-shell-contract.tsx")),
    false,
  );
  assert.equal(
    existsSync(join(root, "src/components/mobile-shell-contract.module.css")),
    false,
  );
  assert.match(transactionForm, /\.amountControl/u);
  assert.match(transactionForm, /background:\s*var\(--mf-surface\)/u);
  assert.match(transactionForm, /color:\s*var\(--mf-text\)/u);
  // `svh` replaced `dvh` after a physical-phone run: the dynamic unit resizes the
  // dialog as mobile browser chrome hides and returns.
  assert.match(transactionForm, /100svh/u);
  assert.doesNotMatch(transactionForm, /dvh/u);
});

test("signed-in logo guardrail generation stays retired after direct BrandLockup adoption", () => {
  assert.equal(existsSync(join(root, "src/app/ai-uiux-guardrails.css")), false);
  assert.match(appShell, /<BrandLockup[\s\S]*ariaLabel="MoneyFlow, về Tổng quan"/u);
  assert.doesNotMatch(appShell, /url\("\/icon\.svg"\)/u);
});

test("ToastRegion accepts shell-owned positioning without duplicating live policy", () => {
  assert.match(toast, /React\.ComponentPropsWithoutRef<"section">/u);
  assert.match(toast, /\.\.\.props/u);
  assert.match(appShell, /bottom: "var\(--mf-shell-feedback-bottom\)"/u);
  assert.match(appShell, /zIndex: "var\(--mf-shell-layer-feedback\)"/u);
});