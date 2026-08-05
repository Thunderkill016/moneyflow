import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const transactionsRoute = readFileSync(
  "src/app/transactions/page.tsx",
  "utf8",
);
const timelineRoute = readFileSync("src/app/timeline/page.tsx", "utf8");
const workspace = readFileSync(
  "src/components/transactions/transactions-workspace.tsx",
  "utf8",
);
const workspaceCss = readFileSync(
  "src/components/transactions/transactions-workspace.module.css",
  "utf8",
);
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
  assert.match(packet, /“tiếp tục p5”/);
  assert.match(packet, /Permission scope:\*\* branch_write/);
  assert.match(packet, /Merge\/deployment remains an owner decision/);
});
