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
const timelineWorkspace = readFileSync(
  "src/components/transactions/timeline-workspace.tsx",
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
const emptyState = readFileSync(
  "src/components/ui/empty-state.tsx",
  "utf8",
);
const dialogSources = [
  "src/components/add-transaction-dialog.tsx",
  "src/components/edit-transaction-dialog.tsx",
  "src/components/split-expense-dialog.tsx",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));
const transferDialog = readFileSync(
  "src/components/transfer-dialog.tsx",
  "utf8",
);
const packet = readFileSync(
  "docs/plans/completed/2026-08-08-ui-phase-5-transactions-capture.md",
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

test("transactions and timeline routes use explicit Phase 5 owners", () => {
  assert.match(
    transactionsRoute,
    /@\/components\/transactions\/transactions-workspace/,
  );
  assert.match(transactionsRoute, /<TransactionsWorkspace/);
  assert.doesNotMatch(transactionsRoute, /@\/components\/transactions-page/);
  assert.match(
    timelineRoute,
    /@\/components\/transactions\/timeline-workspace/,
  );
  assert.match(timelineRoute, /<TimelineWorkspace/);
  assert.doesNotMatch(timelineRoute, /<TransactionsWorkspace/);
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

test("timeline is a read-only approved-ledger boundary", () => {
  assert.match(timelineWorkspace, /data-slot="timeline-workspace"/);
  assert.match(timelineWorkspace, /data-slot="timeline-summary"/);
  assert.match(timelineWorkspace, /data-slot="timeline-search"/);
  assert.match(timelineWorkspace, /data-slot="timeline-row"/);
  assert.match(timelineWorkspace, /getTransactionReviewStatus/);
  assert.match(timelineWorkspace, /=== "reviewed"/);
  assert.doesNotMatch(timelineWorkspace, /useTransactions/);
  assert.doesNotMatch(timelineWorkspace, /AddTransactionDialog|EditTransactionDialog/);
  assert.doesNotMatch(
    timelineWorkspace,
    /deleteTransaction|updateTransaction|bulkSetReviewStatus|bulkUpdateCategory/,
  );
  assert.doesNotMatch(
    timelineWorkspace,
    /Lọc theo danh mục|Lọc theo trạng thái kiểm tra|Đánh dấu đã duyệt/,
  );
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
  assert.match(
    timelineWorkspace,
    /filter\(\(item\) => item\.kind === "income"\)[\s\S]*filter\(\(item\) => item\.kind === "expense"\)/,
  );
  assert.match(
    timelineWorkspace,
    /return \{ income, expense, net: income - expense \}/,
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

test("Phase 5 add, edit and split dialogs use the shared lifecycle and local transaction form owner", () => {
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
  assert.match(dialogSources[2].source, /initialFocusRef=\{firstAmountRef\}/);
  assert.doesNotMatch(transactionFormCss, /:global\s*\(|!important/);
});

test("Transfer keeps the shared lifecycle while later phases may own its presentation", () => {
  assert.match(transferDialog, /@\/components\/ui\/dialog/);
  assert.match(transferDialog, /dismissible=\{!submitting\}/);
  assert.match(transferDialog, /initialFocusRef=\{amountRef\}/);
  assert.match(transferDialog, /targetSize="important"/);
  assert.doesNotMatch(transferDialog, /<dialog\b/);
  assert.doesNotMatch(transferDialog, /transaction-dialog|dialog-heading|dialog-footer-actions/);
  assert.doesNotMatch(transferDialog, /primary-button|secondary-button|icon-button/);
});

test("direct quick capture reuses the shared dialog and its phone geometry", () => {
  assert.match(quickCapture, /capture-quick-page\.module\.css/);
  assert.match(quickCapture, /data-slot="capture-quick-workspace"/);
  assert.match(quickCapture, /<AddTransactionDialog[\s\S]*open=\{formOpen\}/);
  assert.match(quickCapture, /title="Ghi giao dịch"/);
  assert.match(quickCapture, /onTransferRequested=\{canTransfer \? openTransfer : undefined\}/);
  // `svh` replaced `dvh` after a physical-phone run: the dynamic unit resizes the
  // dialog as mobile browser chrome hides and returns.
  assert.match(transactionFormCss, /max-height: calc\(100svh - 24px\)/);
  assert.doesNotMatch(transactionFormCss, /dvh/u);
  assert.match(transactionFormCss, /@media \(max-width: 360px\)/);
});

test("quick capture keeps amount first with visible defaults before optional detail", () => {
  const addDialog = dialogSources[0].source;
  assert.match(
    addDialog,
    /data-slot="capture-amount-step"[\s\S]*data-slot="capture-type-step"[\s\S]*data-slot="capture-required-choices"[\s\S]*data-slot="capture-optional-details"/,
  );
  assert.match(addDialog, /data-slot="capture-account-choice"/);
  assert.match(addDialog, /data-slot="capture-category-choice"/);
  assert.match(addDialog, /<SelectField[\s\S]*label="Tài khoản"/);
  assert.match(
    transactionFormCss,
    /\.quickConfirmations[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/u,
  );
  assert.match(transactionFormCss, /\.optionalDisclosure/u);
});

test("shared empty state exposes stable semantic action slots", () => {
  assert.match(emptyState, /data-slot="empty-state"/);
  assert.match(emptyState, /data-slot="empty-state-actions"/);
  assert.match(emptyState, /data-slot="empty-state-primary-action"/);
  assert.match(emptyState, /data-slot="empty-state-secondary-action"/);
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

test("Phase 5 completed packet records accepted delivery and production evidence", () => {
  assert.match(packet, /Status:\*\* accepted/);
  assert.match(packet, /Implementation PR:\*\* #306/);
  assert.match(packet, /Production:\*\* `dpl_GCYtqTVBnRuKLrEd3k7G7TnTkbbt` READY/);
  assert.match(packet, /Current program closure/);
});
