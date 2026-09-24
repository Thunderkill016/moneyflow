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
const fastCaptureCss = readFileSync(
  "src/components/transactions/capture-fast-path.module.css",
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
  assert.doesNotMatch(workspace, /window\.confirm\(/);
  assert.match(workspace, /SecondaryReviewDialog/);
  assert.match(workspace, /confirmLabel="Xóa giao dịch"/);
  assert.match(workspace, /confirmLabel="Đổi danh mục"/);
  assert.match(workspace, /setDeleteTarget\(transaction\)/);
  assert.match(workspace, /Bạn có thể hoàn tác trong 8 giây/);
  assert.match(workspace, /deleteTransaction\(transaction\.id\)/);
  assert.match(workspace, /restoreTransaction\(snapshot\)/);
  assert.match(workspace, /label: "Hoàn tác"/);
});

test("undo window pauses on toast hold and survives unrelated notices", () => {
  const shell = readFileSync("src/components/layout/app-shell.tsx", "utf8");
  const toast = readFileSync("src/components/ui/toast.tsx", "utf8");
  const countdown = readFileSync("src/lib/pausable-countdown.ts", "utf8");

  // WCAG 2.2.1: the undo toast holds the only recovery path, so hover/focus
  // on the toast region must pause the countdown rather than run it out.
  assert.match(toast, /onHoldChange\?: \(held: boolean\) => void/);
  assert.match(toast, /onMouseEnter[\s\S]*onMouseLeave[\s\S]*onFocus[\s\S]*onBlur/);
  assert.match(shell, /onNoticeHoldChange\?: \(held: boolean\) => void/);
  assert.match(shell, /onHoldChange=\{onNoticeHoldChange\}/);
  assert.match(workspace, /onNoticeHoldChange=\{handleNoticeHold\}/);
  assert.match(workspace, /pauseSlot\(undoSlotRef\.current\)/);
  assert.match(workspace, /resumeSlot\(undoSlotRef\.current/);
  assert.match(countdown, /export function pauseCountdown/);
  assert.match(countdown, /export function resumeCountdown/);

  // An unrelated notice may share the toast but must not kill a live undo —
  // showNotice no longer clears pendingUndo, and the undo message resurfaces
  // when the newer text expires.
  const showNoticeBody =
    workspace.match(/function showNotice\([\s\S]*?\n  \}/)?.[0] ?? "";
  assert.ok(showNoticeBody.length > 0, "showNotice body must be found");
  assert.doesNotMatch(showNoticeBody, /setPendingUndo\(null\)/);
  assert.doesNotMatch(showNoticeBody, /pendingUndoRef\.current = null/);
  assert.match(workspace, /setNotice\(undo\.message\)/);

  // "Hoàn tác" is gated on its own snapshots' restore, not the global flag.
  const undoBlock =
    workspace.match(/label: "Hoàn tác"([\s\S]*?)recentSaved/)?.[1] ?? "";
  assert.ok(undoBlock.length > 0, "undo action must render before recentSaved");
  assert.match(undoBlock, /disabled: pendingUndo\.snapshots\.some/);
  assert.match(undoBlock, /mutatingIds\.has\(item\.id\)/);
  assert.doesNotMatch(undoBlock, /disabled: isMutating/);
});

test("row-scoped mutations freeze their own row, not the whole register", () => {
  const hook = readFileSync("src/hooks/use-transactions.ts", "utf8");

  // The hook exposes the per-row busy registry alongside the global flag.
  assert.match(hook, /mutatingIds/);
  assert.match(hook, /addMutatingIds|markMutating/);
  assert.match(hook, /removeMutatingIds|clearMutating/);

  // Single-row delete/update/restore mark only their own id; they no longer
  // hold the workspace-wide isMutating flag.
  for (const op of [
    /async function deleteTransaction\(\s*id: string,?\s*\)[\s\S]*?\n  \}/,
    /async function restoreTransaction\(\s*transaction: Transaction,?\s*\)[\s\S]*?\n  \}/,
    /async function updateTransaction\([\s\S]*?\n  \}/,
  ]) {
    const body = hook.match(op)?.[0];
    assert.ok(body, `hook body not found for ${op}`);
    assert.doesNotMatch(body, /setIsMutating/);
  }

  // Row controls consult the per-row check; bulk/form surfaces keep the
  // global flag.
  assert.match(workspace, /function rowBusy\(id: string\)/);
  assert.match(workspace, /mutatingIds\.has\(id\)/);
  assert.match(workspace, /disabled=\{rowBusy\(transaction\.id\)\}/);
});

test("bulk edit stays on the single-row RPC path with confirmed skip reporting", () => {
  assert.match(workspace, /planBulkDateChange\(transactions, selectedIds/);
  assert.match(workspace, /planBulkDelete\(transactions, selectedIds\)/);
  assert.match(workspace, /bulkUpdateDate\(\{/);
  assert.match(workspace, /bulkDeleteTransactions\(\{/);
  assert.match(workspace, /summarizeBulkSkips/);
  assert.match(workspace, /type="date"/);
  assert.match(workspace, /aria-label="Ngày mới cho giao dịch đã chọn"/);
  assert.match(workspace, /intent="destructive"/);
  assert.match(workspace, /Xóa đã chọn/);
  assert.match(workspace, /slot="bulk-date-review"/);
  assert.match(workspace, /slot="bulk-delete-review"/);
  assert.match(workspace, /confirmLabel="Đổi ngày"/);
  assert.match(workspace, /confirmLabel="Xóa đã chọn"/);
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
  assert.doesNotMatch(fastCaptureCss, /:global\s*\(|!important/);
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
  assert.match(transactionFormCss, /max-height: calc\(100svh - 24px\)/);
  assert.doesNotMatch(transactionFormCss, /dvh/u);
  assert.match(transactionFormCss, /@media \(max-width: 360px\)/);
});

test("quick capture keeps amount first and makes correction compact", () => {
  const addDialog = dialogSources[0].source;
  assert.match(
    addDialog,
    /data-slot="capture-amount-step"[\s\S]*data-slot="capture-type-step"[\s\S]*data-slot="capture-required-choices"[\s\S]*data-slot="capture-optional-details"/,
  );
  assert.match(addDialog, /data-slot="capture-fast-defaults"/);
  assert.match(addDialog, /data-slot="capture-category-suggestions"/);
  assert.match(addDialog, /aria-label="Đổi nhanh danh mục"/);
  assert.match(addDialog, /data-slot="capture-category-choice"/);
  assert.match(addDialog, />Khác</);
  assert.match(addDialog, /Ghi chú \(không bắt buộc\)/);
  assert.match(addDialog, /pushRecentPreset/);
  assert.match(addDialog, /\.slice\(0, 2\)/);
  assert.match(fastCaptureCss, /\.categoryActions/);
  assert.match(fastCaptureCss, /\.morePanel\s*\{[\s\S]*display: none/);
  assert.match(fastCaptureCss, /\.moreDisclosure\[open\] > \.morePanel\s*\{[\s\S]*display: grid/);
  assert.doesNotMatch(fastCaptureCss, /overflow-x:\s*auto/u);
  assert.doesNotMatch(
    fastCaptureCss,
    /\.secondaryDisclosure:not\(\[open\]\)[\s\S]*display:\s*none/u,
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