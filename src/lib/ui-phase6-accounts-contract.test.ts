import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/accounts/page.tsx", "utf8");
const workspace = readFileSync(
  "src/components/accounts/accounts-workspace.tsx",
  "utf8",
);
const workspaceCss = readFileSync(
  "src/components/accounts/accounts-workspace.module.css",
  "utf8",
);
const accountDialog = readFileSync("src/components/account-dialog.tsx", "utf8");
const accountDialogCss = readFileSync(
  "src/components/accounts/account-dialog.module.css",
  "utf8",
);
const archiveDialog = readFileSync(
  "src/components/accounts/account-archive-dialog.tsx",
  "utf8",
);
const transferDialog = readFileSync(
  "src/components/transfer-dialog.tsx",
  "utf8",
);
const transferCss = readFileSync(
  "src/components/transfers/transfer-dialog.module.css",
  "utf8",
);
const packet = readFileSync(
  "docs/plans/active/ui-phase-6-accounts-transfer.md",
  "utf8",
);

const retiredActiveClasses = [
  "dashboard accounts-workspace",
  "accounts-heading",
  "accounts-summary",
  "account-grid",
  "account-card",
  "archived-list",
  "secondary-button",
  "primary-button",
  "data-alert",
  "font-mono",
];

test("Accounts route uses the explicit Phase 6 workspace", () => {
  assert.match(route, /@\/components\/accounts\/accounts-workspace/);
  assert.match(route, /<AccountsWorkspace/);
  assert.doesNotMatch(route, /@\/components\/accounts-page/);
});

test("Accounts workspace composes Phase 2 primitives and stable evidence slots", () => {
  assert.match(workspace, /@\/components\/ui\/alert/);
  assert.match(workspace, /@\/components\/ui\/button/);
  assert.match(workspace, /@\/components\/ui\/empty-state/);
  assert.match(workspace, /@\/components\/money-value/);
  assert.match(workspace, /data-slot="accounts-workspace"/);
  assert.match(workspace, /data-slot="accounts-summary"/);
  assert.match(workspace, /data-slot="accounts-active-list"/);
  assert.match(workspace, /data-slot="account-card"/);
  assert.match(workspace, /data-slot="accounts-archived-list"/);
  assert.match(workspace, /data-slot="archived-account-row"/);
  assert.match(workspace, /targetSize="important"/);
});

test("active Accounts workspace does not register retired global presentation classes", () => {
  for (const className of retiredActiveClasses) {
    assert.equal(
      workspace.includes(className),
      false,
      `active Accounts workspace still registers ${className}`,
    );
  }
  assert.doesNotMatch(workspaceCss, /:global\s*\(|!important/);
  assert.match(workspaceCss, /@media \(max-width: 760px\)/);
  assert.match(workspaceCss, /@media \(max-width: 390px\)/);
  assert.match(workspaceCss, /@media \(forced-colors: active\)/);
});

test("active and archived totals remain explicit and currency-safe", () => {
  assert.match(workspace, /totalsByCurrency\(activeAccounts\)/);
  assert.match(workspace, /totalsByCurrency\(archivedAccounts\)/);
  assert.match(workspace, /Tổng số dư tài khoản đang hoạt động/);
  assert.match(workspace, /không cộng gộp ngoại tệ/);
  assert.match(workspace, /Vẫn giữ lịch sử, số dư và có thể khôi phục/);
});

test("account archive is a reviewable reversible dialog instead of window.confirm", () => {
  assert.doesNotMatch(workspace, /window\.confirm\(/);
  assert.match(workspace, /<AccountArchiveDialog/);
  assert.match(archiveDialog, /@\/components\/ui\/dialog/);
  assert.match(archiveDialog, /data-slot="account-archive-review"/);
  assert.match(archiveDialog, /initialFocusRef=\{cancelRef\}/);
  assert.match(archiveDialog, /Số dư không còn nằm trong tổng/);
  assert.match(archiveDialog, /có thể khôi phục/);
  assert.match(workspace, /setAccountArchivedAction/);
  assert.match(workspace, /isArchived: archived/);
});

test("account form uses shared field lifecycle and field-specific focus recovery", () => {
  assert.match(accountDialog, /@\/components\/ui\/dialog/);
  assert.match(accountDialog, /@\/components\/ui\/text-field/);
  assert.match(accountDialog, /@\/components\/ui\/select-field/);
  assert.match(accountDialog, /data-slot="account-form"/);
  assert.match(accountDialog, /initialFocusRef=\{nameRef\}/);
  assert.match(accountDialog, /nameRef\.current\?\.focus\(\)/);
  assert.match(accountDialog, /amountRef\.current\?\.focus\(\)/);
  assert.match(accountDialog, /dismissible=\{!submitting\}/);
  assert.match(accountDialog, /Math\.abs\(account\?\.initialBalance/);
  assert.match(accountDialog, /kind === "credit_card" \? -parsedAmount : parsedAmount/);
  assert.doesNotMatch(accountDialog, /<dialog\b|account-dialog|account-form-hint/);
  assert.doesNotMatch(accountDialogCss, /:global\s*\(|!important/);
});

test("Transfer has a dedicated presentation owner and preserves domain mutation ownership", () => {
  assert.match(transferDialog, /transfers\/transfer-dialog\.module\.css/);
  assert.doesNotMatch(
    transferDialog,
    /transactions\/transaction-form\.module\.css/,
  );
  assert.match(transferDialog, /data-slot="transfer-form"/);
  assert.match(transferDialog, /data-slot="transfer-review"/);
  assert.match(transferDialog, /MoneyValue/);
  assert.match(transferDialog, /Cùng loại tiền, tổng tài sản không đổi/);
  assert.match(workspace, /executeTransferMutation/);
  assert.match(workspace, /applyTransferBalances/);
  assert.doesNotMatch(transferCss, /:global\s*\(|!important/);
});

test("Phase 6 packet records bounded authorization and Class 3 archive boundary", () => {
  assert.match(packet, /[`“]Làm đi[`”]/);
  assert.match(packet, /Permission scope:\*\* branch_write/);
  assert.match(packet, /future rule requiring zero balance/);
  assert.match(packet, /separate owner-approved Class 3 packet/);
  assert.match(packet, /Merge and deployment remain owner decisions/);
});
