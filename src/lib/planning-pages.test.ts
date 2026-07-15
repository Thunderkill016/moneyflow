/**
 * R6 / Q4 — Budgets/commitments/goals/categories: shared shell + empty 1 CTA.
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
const BUDGETS = join(root, "src/components/budgets-page.tsx");
const COMMITMENTS = join(root, "src/components/commitments-page.tsx");
const GOALS = join(root, "src/components/goals-page.tsx");
const CATEGORIES = join(root, "src/components/categories-page.tsx");
const SHELL = join(root, "src/components/planning-card.tsx");
const CSS = join(root, "src/app/globals.css");

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
    .map((c) => `${c.title} ${c.description} ${c.actionLabel ?? ""}`)
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

test("PlanningCard shell component exists", () => {
  assert.ok(existsSync(SHELL), "planning-card.tsx must exist");
  const source = read(SHELL);
  assert.match(source, /export function PlanningCard/);
  assert.match(source, /planning-card/);
  assert.match(source, /planning-card--/);
});

test("budgets / commitments / goals pages use PlanningCard shell", () => {
  for (const path of [BUDGETS, COMMITMENTS, GOALS]) {
    const source = read(path);
    assert.match(source, /PlanningCard/, `${path} must use PlanningCard`);
    assert.match(source, /from "@\/components\/planning-card"/, `${path} import`);
  }
});

test("Q4 budgets / commitments / goals / categories empties: EmptyState + 1 primary CTA", () => {
  const budgets = read(BUDGETS);
  const commitments = read(COMMITMENTS);
  const goals = read(GOALS);
  const categories = read(CATEGORIES);

  assert.match(budgets, /EmptyState/);
  assert.match(budgets, /PAGE_EMPTY_BUDGET/);
  assert.doesNotMatch(budgets, /budget-page-empty/);
  // No secondary CTA on happy-path empty
  assert.doesNotMatch(budgets, /secondaryLabel/);

  assert.match(commitments, /EmptyState/);
  assert.match(commitments, /PAGE_EMPTY_COMMITMENT/);
  assert.match(commitments, /commitmentDueTone|commitmentDueLabel/);
  // Error empty uses one primary CTA, not secondary-only multi chrome
  assert.doesNotMatch(commitments, /secondaryLabel/);
  assert.match(commitments, /actionLabel="Về Tổng quan"|actionHref="\/insights"/);

  assert.match(goals, /EmptyState/);
  assert.match(goals, /PAGE_EMPTY_GOAL/);
  assert.doesNotMatch(goals, /budget-page-empty/);
  assert.doesNotMatch(goals, /secondaryLabel/);

  assert.match(categories, /EmptyState/);
  assert.match(categories, /PAGE_EMPTY_CATEGORY/);
  assert.match(categories, /PAGE_EMPTY_CATEGORY_FILTER/);
  assert.doesNotMatch(categories, /secondaryLabel/);
  // No ad-hoc multi-button empty block
  assert.doesNotMatch(categories, /account-empty/);
});

test("CSS defines shared planning-card shell + calm tone modifiers", () => {
  const css = read(CSS);
  assert.match(css, /\.planning-card\b/);
  assert.match(css, /\.planning-card--near/);
  assert.match(css, /\.planning-card--over/);
  assert.match(css, /\.planning-card--soon/);
  assert.match(css, /\.planning-card--overdue/);
  assert.match(css, /\.planning-card--paid/);
  assert.match(css, /\.planning-card--achieved/);
});
