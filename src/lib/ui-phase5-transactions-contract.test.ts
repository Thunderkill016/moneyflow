import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const transactionsRoute = readFileSync(
  "src/app/transactions/page.tsx",
  "utf8",
);
const timelineRoute = readFileSync("src/app/timeline/page.tsx", "utf8");
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const workspace = readFileSync(
  "src/components/transactions/transactions-workspace.tsx",
  "utf8",
);
const workspaceCss = readFileSync(
  "src/components/transactions/transactions-workspace.module.css",
  "utf8",
);
const transactionFormCss = readFileSync(
  "src/components/transactions/transaction-form.module.css",
  "utf8",
);
const quickCapture = readFileSync(
  "src/components/inbox/capture-quick-page.tsx",
  "utf8",
);
const dialogSources = [
  "src/components/add-transaction-dialog.tsx",
  "src/components/edit-transaction-dialog.tsx",
  "src/components/transfer-dialog.tsx",
  "src/components/split-expense-dialog.tsx",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));
const packet = readFileSync(
  "docs/plans/active/ui-phase-5-transactions-capture.md",
  "utf8",
);

const retiredClassNames = [
  "transaction-manager",
  "manager-row",
  "transactions-workspace",
  "secondary-button",
  "primary-button",
  "filter-reset-button",
];

test("transactions and timeline routes use the Phase 5 local workspace", () => {
  assert.match(
    transactionsRoute,
    /@\/components\/transactions\/transactions-workspace/,
  );
  assert.match(transactionsRoute, /<TransactionsWorkspace/);
  assert.doesNotMatch(transactionsRoute, /@\/components\/transactions-page/);
  assert.match(timelineRoute, /<TransactionsWorkspace/);
  assert.doesNotMatch(timelineRoute, /@\/components\/transactions-page/);
  assert.equal(existsSync("src/components/transactions-page.tsx"), false);
  assert.equal(existsSync("src/components/transactions-page.module.css"), false);
});

test("ledger presentation composes Phase 2 primitives and stable evidence slots", () => {
  assert.match(workspace, /@\/components\/ui\/alert/);
  assert.match(workspace, /@\/components\/ui\/button/);
  assert.match(workspace, /@\/components\/ui\/empty-state/);
  assert.match(workspace, /data-slot="ledger-summary"/);
  assert.match(workspace, /data-slot="ledger-filters"/);
  assert.match(workspace, /data-slot="ledger-day-group"/);
  assert.match(workspace, /data-slot="ledger-row"/);
  assert.match(workspace, /targetSize="important"/);
});

test("active ledger workspace does not register retired manager and action classes", () => {
  for (const className of retiredClassNames) {
    assert.equal(
      workspace.includes(`className="${className}`),
      false,
      `active workspace still registers ${className}`,
    );
  }
  assert.doesNotMatch(workspaceCss, /:global\s*\(/);
  assert.doesNotMatch(workspaceCss, /!important/);
});

test("filtered summary keeps transfer exclusion and complete integer money flow", () => {
  assert.match(
    workspace,
    /filter\(\(item\) => item\.kind === "income"\)[\s\S]*filter\(\(item\) => item\.kind === "expense"\)/,
  );
  assert.match(workspace, /return \{ income, expense, net: income - expense \}/);
  assert.doesNotMatch(
    workspace,
    /filteredTotals[\s\S]*item\.kind === "transfer"/,
  );
});

test("ledger deletion remains confirmed, soft and recoverable for eight seconds", () => {
  assert.match(workspace, /const DELETE_UNDO_MS = 8000/);
  assert.match(workspace, /window\.confirm\(/);
  assert.match(workspace, /Bạn có thể hoàn tác trong 8 giây/);
  assert.match(workspace, /deleteTransaction\(transaction\.id\)/);
  assert.match(workspace, /restoreTransaction\(snapshot\)/);
  assert.match(workspace, /label: "Hoàn tác"/);
});

test("transaction dialogs use the shared lifecycle and local form owner", () => {
  for (const { path, source } of dialogSources) {
    assert.match(source, /@\/components\/ui\/dialog/, `${path} must use Dialog`);
    assert.match(source, /transaction-form\.module\.css/);
    assert.match(source, /dismissible=\{!submitting\}/);
    assert.match(source, /targetSize="important"/);
    assert.doesNotMatch(source, /<dialog\b/);
    assert.doesNotMatch(source, /transaction-dialog|dialog-heading|dialog-footer-actions/);
    assert.doesNotMatch(source, /primary-button|secondary-button|icon-button/);
  }
  assert.match(dialogSources[0].source, /initialFocusRef=\{amountInputRef\}/);
  assert.match(dialogSources[1].source, /initialFocusRef=\{amountRef\}/);
  assert.match(dialogSources[2].source, /initialFocusRef=\{amountRef\}/);
  assert.match(dialogSources[3].source, /initialFocusRef=\{firstAmountRef\}/);
  assert.doesNotMatch(transactionFormCss, /:global\s*\(|!important/);
});

test("quick capture composes the embedded transaction form behind a local route owner", () => {
  assert.match(quickCapture, /capture-quick-page\.module\.css/);
  assert.match(quickCapture, /data-slot="capture-quick-workspace"/);
  assert.match(quickCapture, /<AddTransactionDialog[\s\S]*embedded/);
  assert.match(dialogSources[0].source, /data-slot="quick-capture-form"/);
  assert.match(transactionFormCss, /max-height: calc\(100dvh - 24px\)/);
  assert.match(transactionFormCss, /@media \(max-width: 360px\)/);
});

test("retired transaction amount shell repair is absent", () => {
  assert.doesNotMatch(rootLayout, /MobileShellContract/);
  assert.equal(existsSync("src/components/mobile-shell-contract.tsx"), false);
  assert.equal(
    existsSync("src/components/mobile-shell-contract.module.css"),
    false,
  );
});

test("local ledger owner defines narrow reflow and forced-colors behavior", () => {
  assert.match(workspaceCss, /@media \(max-width: 760px\)/);
  assert.match(workspaceCss, /@media \(max-width: 360px\)/);
  assert.match(
    workspaceCss,
    /@media \(max-width: 760px\)[\s\S]*grid-template-columns: 38px minmax\(0, 1fr\) auto/,
  );
  assert.match(workspaceCss, /overflow-wrap: anywhere/);
  assert.match(workspaceCss, /@media \(forced-colors: active\)/);
});

test("Phase 5 packet records explicit authorization without merge permission", () => {
  assert.match(packet, /[`“]tiếp tục p5[`”]/);
  assert.match(packet, /Permission scope:\*\* branch_write/);
  assert.match(packet, /Merge (?:and|\/) deployment remain(?:s)? owner decision/);
});
