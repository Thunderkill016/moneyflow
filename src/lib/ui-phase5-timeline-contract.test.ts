import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/timeline/page.tsx", "utf8");
const workspace = readFileSync(
  "src/components/transactions/timeline-workspace.tsx",
  "utf8",
);
const ledgerHook = readFileSync(
  "src/hooks/use-transaction-ledger.ts",
  "utf8",
);

test("timeline route selects the explicit read-only owner", () => {
  assert.match(route, /@\/components\/transactions\/timeline-workspace/);
  assert.match(route, /<TimelineWorkspace/);
  assert.doesNotMatch(route, /<TransactionsWorkspace/);
});

test("timeline reads reviewed ledger state without mounting mutation UI", () => {
  assert.match(workspace, /useTransactionLedger/);
  assert.match(workspace, /getTransactionReviewStatus/);
  assert.match(workspace, /=== "reviewed"/);
  assert.match(workspace, /data-slot="timeline-workspace"/);
  assert.match(workspace, /data-slot="timeline-row"/);
  assert.doesNotMatch(workspace, /useTransactions/);
  assert.doesNotMatch(
    workspace,
    /AddTransactionDialog|EditTransactionDialog|TransferDialog|SplitExpenseDialog/,
  );
  assert.doesNotMatch(
    workspace,
    /deleteTransaction|updateTransaction|bulkSetReviewStatus|bulkUpdateCategory/,
  );
  assert.doesNotMatch(
    workspace,
    /Lọc theo danh mục|Lọc theo trạng thái kiểm tra|Đánh dấu đã duyệt/,
  );
});

test("read-only ledger hook hydrates demo storage without importing writes", () => {
  assert.match(ledgerHook, /readStoredTransactions/);
  assert.match(ledgerHook, /initialTransactions\.map\(withReviewStatus\)/);
  assert.match(ledgerHook, /isDemo/);
  assert.doesNotMatch(ledgerHook, /writeStoredTransactions/);
  assert.doesNotMatch(ledgerHook, /@\/app\/actions\//);
  assert.doesNotMatch(
    ledgerHook,
    /createTransactionAction|updateTransactionAction|deleteTransactionAction/,
  );
});
