import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  layout: readFileSync("src/components/planning/planning-layout.tsx", "utf8"),
  layoutCss: readFileSync(
    "src/components/planning/planning-workspace.module.css",
    "utf8",
  ),
  card: readFileSync("src/components/planning/planning-card.tsx", "utf8"),
  cardCss: readFileSync(
    "src/components/planning/planning-card.module.css",
    "utf8",
  ),
  budgets: readFileSync("src/components/planning/budgets-page.tsx", "utf8"),
  budgetDialog: readFileSync(
    "src/components/planning/budget-dialog.tsx",
    "utf8",
  ),
  commitments: readFileSync(
    "src/components/planning/commitments-page.tsx",
    "utf8",
  ),
  commitmentDialog: readFileSync(
    "src/components/planning/commitment-dialog.tsx",
    "utf8",
  ),
  income: readFileSync(
    "src/components/planning/income-templates-page.tsx",
    "utf8",
  ),
  incomeDialog: readFileSync(
    "src/components/planning/income-template-dialog.tsx",
    "utf8",
  ),
  goals: readFileSync("src/components/planning/goals-page.tsx", "utf8"),
  goalDialogs: readFileSync(
    "src/components/planning/goal-dialogs.tsx",
    "utf8",
  ),
  packet: readFileSync(
    "docs/plans/completed/2026-08-08-ui-phase-7-planning.md",
    "utf8",
  ),
};

const pages = [files.budgets, files.commitments, files.income, files.goals];
const dialogs = [
  files.budgetDialog,
  files.commitmentDialog,
  files.incomeDialog,
  files.goalDialogs,
];
const retiredDashboardPath = ["/", "insights"].join("");

test("Planning routes compose one local Phase 7 system", () => {
  for (const source of pages) {
    assert.match(source, /PlanningWorkspace/);
    assert.match(source, /PlanningHeader/);
    assert.match(source, /PlanningSection/);
    assert.match(source, /planningStyles/);
    assert.doesNotMatch(source, /className="dashboard\b/);
    assert.doesNotMatch(source, /className="(?:budgets|commitments|goals)-workspace"/);
    assert.doesNotMatch(source, /className="font-mono"/);
    assert.doesNotMatch(source, /window\.confirm\(/);
    assert.equal(source.includes(`href="${retiredDashboardPath}"`), false);
  }

  assert.match(files.layout, /data-slot="planning-workspace"/);
  assert.match(files.layout, /data-slot="planning-header"/);
  assert.match(files.layout, /data-slot="planning-summary"/);
  assert.match(files.layout, /data-slot="planning-review"/);
  assert.match(files.layout, /@\/components\/ui\/dialog/);
  assert.match(files.layout, /initialFocusRef=\{cancelRef\}/);
  assert.match(files.layout, /ref=\{cancelRef\}/);
  assert.match(files.card, /data-slot="planning-card"/);
  assert.match(files.card, /data-tone=\{tone\}/);
});

test("Planning CSS is locally owned and responsive without rescue rules", () => {
  for (const source of [files.layoutCss, files.cardCss]) {
    assert.doesNotMatch(source, /:global\s*\(|!important/);
  }
  assert.match(files.layoutCss, /@media \(max-width: 900px\)/);
  assert.match(files.layoutCss, /@media \(max-width: 700px\)/);
  assert.match(files.layoutCss, /@media \(max-width: 390px\)/);
  assert.match(files.cardCss, /\[data-tone="over"\]/);
  assert.match(files.cardCss, /\[data-tone="paid"\]/);
});

test("Planning dialogs use shared lifecycle and field-specific validation", () => {
  for (const source of dialogs) {
    assert.match(source, /@\/components\/ui\/dialog/);
    assert.match(source, /@\/components\/ui\/button/);
    assert.match(source, /@\/components\/ui\/text-field/);
    assert.match(source, /dismissible=\{!submitting\}/);
    assert.doesNotMatch(source, /<dialog\b|className="account-dialog"/);
  }
  assert.match(files.budgetDialog, /limitRef\.current\?\.focus\(\)/);
  assert.match(files.commitmentDialog, /amountRef\.current\?\.focus\(\)/);
  assert.match(files.incomeDialog, /dueDayRef\.current\?\.focus\(\)/);
  assert.match(files.goalDialogs, /targetRef\.current\?\.focus\(\)/);
});

test("Budgets preserve history, comparison and ledger drill-down", () => {
  assert.match(files.budgets, /workspace\.previousBudgets/);
  assert.match(files.budgets, /compareBudgetAmount/);
  assert.match(files.budgets, /budgetTransactionsHref/);
  assert.match(files.budgets, /data-slot="planning-period-nav"/);
  assert.match(files.budgets, /Xóa hạn mức ngân sách\?/);
  assert.match(files.budgets, /Các giao dịch và số dư tài khoản vẫn được giữ nguyên/);
});

test("recurring reviews distinguish expected items from real ledger mutations", () => {
  assert.match(files.commitments, /Dự kiến phải trả/);
  assert.match(files.commitments, /không phải tiền đã bị khóa hoặc giữ riêng/);
  assert.match(files.commitments, /Tạo giao dịch chi/);
  assert.match(files.commitments, /Xóa giao dịch liên kết/);
  assert.doesNotMatch(files.commitments, /Giữ trước tiền hóa đơn|có thể chi/);

  assert.match(files.income, /Dự kiến chưa nhận/);
  assert.match(files.income, /không cộng nó vào số dư hoặc thu nhập/);
  assert.match(files.income, /Tạo giao dịch thu/);
  assert.match(files.income, /Xóa giao dịch liên kết/);
});

test("Goals use planning-earmark truth instead of cash-locking claims", () => {
  const goalSources = `${files.goals}\n${files.goalDialogs}`;
  assert.match(goalSources, /Đã đánh dấu/);
  assert.match(goalSources, /không tạo giao dịch/);
  assert.match(goalSources, /số dư tài khoản và tổng tài sản không đổi/);
  assert.doesNotMatch(
    goalSources,
    /Khóa một phần số dư|Khóa theo kế hoạch|Mở khóa tiền|phần có thể chi|Rút tiền/,
  );
});

test("Phase 7 completed packet records accepted delivery and planning truth", () => {
  assert.match(files.packet, /Status:\*\* accepted/);
  assert.match(files.packet, /Implementation PR:\*\* #308/);
  assert.match(files.packet, /Production:\*\* `dpl_4tr8rU45ZvixXt31WUVSNuUKQu6G` READY/);
  assert.match(files.packet, /Goal allocation is a planning earmark/);
  assert.match(files.packet, /Current program closure/);
});
