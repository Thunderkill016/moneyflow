/**
 * Planning page domain/presentation contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertPageEmptyOneCtaOrNone,
  budgetToneToCard,
  commitmentDueLabel,
  commitmentDueTone,
  PAGE_EMPTY_BUDGET,
  PAGE_EMPTY_CATEGORY,
  PAGE_EMPTY_CATEGORY_FILTER,
  PAGE_EMPTY_COMMITMENT,
  PAGE_EMPTY_COMMITMENT_ARCHIVED,
  PAGE_EMPTY_GOAL,
  PAGE_EMPTY_GOAL_ARCHIVED,
  pageEmptyPrimaryCtaCount,
} from "./planning-pages.ts";

const root = process.cwd();
const BUDGETS = join(root, "src/components/planning/budgets-page.tsx");
const COMMITMENTS = join(root, "src/components/planning/commitments-page.tsx");
const INCOME = join(root, "src/components/planning/income-templates-page.tsx");
const GOALS = join(root, "src/components/planning/goals-page.tsx");
const CATEGORIES = join(root, "src/components/categories-page.tsx");
const SHELL = join(root, "src/components/planning/planning-card.tsx");
const SHELL_CSS = join(root, "src/components/planning/planning-card.module.css");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("page empty configs: one CTA or none (never multi)", () => {
  for (const config of [
    PAGE_EMPTY_BUDGET,
    PAGE_EMPTY_COMMITMENT,
    PAGE_EMPTY_GOAL,
    PAGE_EMPTY_CATEGORY,
  ]) {
    assert.equal(pageEmptyPrimaryCtaCount(config), 1);
    assertPageEmptyOneCtaOrNone(config);
    assert.ok(config.actionLabel);
  }
  for (const config of [
    PAGE_EMPTY_COMMITMENT_ARCHIVED,
    PAGE_EMPTY_GOAL_ARCHIVED,
    PAGE_EMPTY_CATEGORY_FILTER,
  ]) {
    assert.equal(pageEmptyPrimaryCtaCount(config), 0);
    assertPageEmptyOneCtaOrNone(config);
    assert.equal(config.actionLabel, undefined);
  }
});

test("page empty copy is calm Vietnamese (no guilt)", () => {
  const blob = [
    PAGE_EMPTY_BUDGET,
    PAGE_EMPTY_COMMITMENT,
    PAGE_EMPTY_GOAL,
    PAGE_EMPTY_CATEGORY,
  ]
    .map((config) => `${config.title} ${config.description} ${config.actionLabel ?? ""}`)
    .join(" ");
  assert.doesNotMatch(blob, /lãng phí|tội|phải tiết kiệm|sai lầm|thất bại/i);
});

test("commitmentDueTone maps paid / soon / overdue calmly", () => {
  assert.equal(
    commitmentDueTone({ isPaid: true, dueDate: "2026-07-01" }, "2026-07-15"),
    "paid",
  );
  assert.equal(
    commitmentDueTone({ isPaid: false, dueDate: "2026-07-20" }, "2026-07-15"),
    "ok",
  );
  assert.equal(
    commitmentDueTone({ isPaid: false, dueDate: "2026-07-17" }, "2026-07-15"),
    "soon",
  );
  assert.equal(
    commitmentDueTone({ isPaid: false, dueDate: "2026-07-15" }, "2026-07-15"),
    "soon",
  );
  assert.equal(
    commitmentDueTone({ isPaid: false, dueDate: "2026-07-10" }, "2026-07-15"),
    "overdue",
  );
});

test("commitmentDueLabel is factual text (not color-only)", () => {
  assert.equal(
    commitmentDueLabel({ isPaid: true, dueDate: "2026-07-01" }, "2026-07-15"),
    "Đã thanh toán",
  );
  assert.equal(
    commitmentDueLabel({ isPaid: false, dueDate: "2026-07-15" }, "2026-07-15"),
    "Đến hạn hôm nay",
  );
  assert.equal(
    commitmentDueLabel({ isPaid: false, dueDate: "2026-07-10" }, "2026-07-15"),
    "Quá hạn 5 ngày",
  );
  assert.equal(
    commitmentDueLabel({ isPaid: false, dueDate: "2026-07-18" }, "2026-07-15"),
    "Còn 3 ngày",
  );
  assert.doesNotMatch(
    commitmentDueLabel({ isPaid: false, dueDate: "2026-07-01" }, "2026-07-15"),
    /lãng phí|tội|phải trả ngay/i,
  );
});

test("budgetToneToCard preserves calm threshold bands", () => {
  assert.equal(budgetToneToCard("ok"), "ok");
  assert.equal(budgetToneToCard("watch"), "watch");
  assert.equal(budgetToneToCard("near"), "near");
  assert.equal(budgetToneToCard("over"), "over");
});

test("PlanningCard shell owns its module and tone data", () => {
  assert.ok(existsSync(SHELL), "planning-card.tsx must exist");
  assert.ok(existsSync(SHELL_CSS), "planning-card.module.css must exist");
  const source = read(SHELL);
  assert.match(source, /export function PlanningCard/);
  assert.match(source, /planning-card\.module\.css/);
  assert.match(source, /data-slot="planning-card"/);
  assert.match(source, /data-tone=\{tone\}/);
  assert.doesNotMatch(source, /planning-card--/);
});

test("all four Planning pages use the shared shell and UI empty state", () => {
  for (const path of [BUDGETS, COMMITMENTS, INCOME, GOALS]) {
    const source = read(path);
    assert.match(source, /PlanningCard/, `${path} must use PlanningCard`);
    assert.match(source, /PlanningWorkspace/, `${path} must use PlanningWorkspace`);
    assert.match(source, /from "@\/components\/planning\/planning-card"/, `${path} import`);
    assert.match(source, /@\/components\/ui\/empty-state/);
    assert.doesNotMatch(source, /secondaryLabel/);
  }

  const commitments = read(COMMITMENTS);
  assert.match(commitments, /commitmentDueTone|commitmentDueLabel/);
  assert.match(commitments, /href="\/dashboard"/);

  const categories = read(CATEGORIES);
  assert.match(categories, /EmptyState/);
  assert.match(categories, /PAGE_EMPTY_CATEGORY/);
  assert.match(categories, /PAGE_EMPTY_CATEGORY_FILTER/);
  assert.doesNotMatch(categories, /account-empty/);
});

test("PlanningCard CSS defines calm tone modifiers locally", () => {
  const css = read(SHELL_CSS);
  assert.match(css, /\.card\b/);
  assert.match(css, /\[data-tone="near"\]/);
  assert.match(css, /\[data-tone="over"\]/);
  assert.match(css, /\[data-tone="soon"\]/);
  assert.match(css, /\[data-tone="overdue"\]/);
  assert.match(css, /\[data-tone="paid"\]/);
  assert.match(css, /\[data-tone="achieved"\]/);
  assert.doesNotMatch(css, /:global\s*\(|!important/);
});
