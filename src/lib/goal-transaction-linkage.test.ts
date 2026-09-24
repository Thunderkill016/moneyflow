/**
 * Goal ↔ transaction linkage contracts (docs/plans/active/goal-transaction-linkage.md).
 *
 * The tag is annotation-only history: it answers "which goal is this
 * transaction related to" and must never enter funding/progress arithmetic —
 * `savings_goal_allocations` stays the single authority there. These tests
 * pin the semantics the pgTAP suite verifies on the database side onto the
 * client/source surface: sentinel update semantics, archived-goal rules,
 * picker availability, related-count wording and workspace wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildOptimisticTransaction,
  buildUpdatedTransaction,
} from "./optimistic-transactions.ts";
import type { GoalOption } from "./transactions/contracts.ts";
import type { Transaction } from "./sample-data.ts";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const accounts = [{ id: "account-1", name: "Tiền mặt", currencyCode: "VND" }];
const categories = [
  { id: "category-food", name: "Ăn uống", kind: "expense" as const, icon: null, color: null },
];
const goals: GoalOption[] = [
  { id: "goal-active", name: "Quỹ khẩn cấp", isArchived: false },
  { id: "goal-archived", name: "Xe máy", isArchived: true },
];

function taggedRow(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "server-uuid-1",
    kind: "expense",
    categoryId: "category-food",
    category: "Ăn uống",
    note: "Cà phê",
    accountId: "account-1",
    account: "Tiền mặt",
    amount: 25_000,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T10:00:00.000Z",
    relativeDate: "Vừa xong",
    goalId: "goal-active",
    goalName: "Quỹ khẩn cấp",
    ...overrides,
  };
}

test("migration keeps the tag annotation-only and tenant-safe", () => {
  const sql = read("supabase/migrations/20260924120000_transaction_goal_linkage.sql");
  // Composite ownership FK — a goal id alone can never cross tenants.
  assert.match(sql, /foreign key \(goal_id, user_id\)/);
  assert.match(sql, /references public\.savings_goals \(id, user_id\)/);
  assert.match(sql, /on delete restrict/i);
  // Partial index feeds the related-transaction count.
  assert.match(sql, /where goal_id is not null/);
  // Reconciled rows accept a goal-only edit like a payee-only edit.
  assert.match(sql, /- 'payee' - 'goal_id'/);
  // New assignment is validated under FOR SHARE against archive races.
  assert.match(sql, /for share/i);
  assert.match(sql, /goal_not_found_or_archived/);
  // The tag never touches allocation/progress arithmetic.
  assert.doesNotMatch(sql, /update public\.savings_goal_allocations|insert into public\.savings_goal_allocations/);
});

test("update sentinel: omitted preserves, null clears, uuid assigns", () => {
  const base = {
    id: "server-uuid-1",
    kind: "expense" as const,
    accountId: "account-1",
    categoryId: "category-food",
    amount: 30_000,
    occurredOn: "2026-07-26",
    note: "Sửa",
  };
  // Omitted → preserve both id and resolved name.
  const preserved = buildUpdatedTransaction(taggedRow(), { ...base }, accounts, categories, goals);
  assert.ok(preserved.ok);
  assert.equal(preserved.transaction.goalId, "goal-active");
  assert.equal(preserved.transaction.goalName, "Quỹ khẩn cấp");
  // Explicit null → clear.
  const cleared = buildUpdatedTransaction(taggedRow(), { ...base, goalId: null }, accounts, categories, goals);
  assert.ok(cleared.ok);
  assert.equal(cleared.transaction.goalId, undefined);
  assert.equal(cleared.transaction.goalName, undefined);
  // New id → assign and resolve the display name.
  const assigned = buildUpdatedTransaction(
    taggedRow({ goalId: undefined, goalName: undefined }),
    { ...base, goalId: "goal-active" },
    accounts,
    categories,
    goals,
  );
  assert.ok(assigned.ok);
  assert.equal(assigned.transaction.goalId, "goal-active");
  assert.equal(assigned.transaction.goalName, "Quỹ khẩn cấp");
});

test("an archived tag survives unrelated edits with its name intact", () => {
  // Demo/history case: the tagged goal is archived, so it is absent from the
  // active picker options — the name must still resolve from the row itself.
  const result = buildUpdatedTransaction(
    taggedRow({ goalId: "goal-archived", goalName: "Xe máy" }),
    {
      id: "server-uuid-1",
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 30_000,
      occurredOn: "2026-07-26",
      note: "Chỉ sửa ghi chú",
      // goalId omitted entirely — the picker may not even have rendered.
    },
    accounts,
    categories,
    goals,
  );
  assert.ok(result.ok);
  assert.equal(result.transaction.goalId, "goal-archived");
  assert.equal(result.transaction.goalName, "Xe máy");
});

test("optimistic create resolves the goal name only for a supplied tag", () => {
  const tagged = buildOptimisticTransaction(
    {
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 52_000,
      note: "Bữa trưa",
      occurredOn: "2026-07-25",
      idempotencyKey: "request-goal",
      goalId: "goal-active",
    },
    accounts,
    categories,
    new Date("2026-07-25T12:00:00.000Z"),
    goals,
  );
  assert.ok(tagged.ok);
  assert.equal(tagged.transaction.goalId, "goal-active");
  assert.equal(tagged.transaction.goalName, "Quỹ khẩn cấp");

  const untagged = buildOptimisticTransaction(
    {
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 52_000,
      note: "Bữa trưa",
      occurredOn: "2026-07-25",
      idempotencyKey: "request-plain",
      goalId: null,
    },
    accounts,
    categories,
    new Date("2026-07-25T12:00:00.000Z"),
    goals,
  );
  assert.ok(untagged.ok);
  assert.equal(untagged.transaction.goalId, undefined);
  assert.equal(untagged.transaction.goalName, undefined);
});

test("server actions validate, send the sentinel and map the calm error", () => {
  const actions = read("src/app/actions/transactions.ts");
  // Authenticated ids are uuids; demo ids never pass through this file.
  assert.match(actions, /goalId: z\.string\(\)\.uuid\(\)/);
  // The sentinel follows presence, not the value — null is a real signal.
  assert.match(actions, /p_goal_id_is_set: value\.goalId !== undefined/);
  assert.match(actions, /p_goal_id: parsed\.data\.goalId \?\? null/);
  // Calm Vietnamese mapping, never a raw database error.
  assert.match(actions, /goal_not_found_or_archived/);
});

test("feed parsing accepts the nullable goal projection", () => {
  const finance = read("src/server/finance.ts");
  assert.match(finance, /goal_id: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
  assert.match(finance, /goal_name: z\.string\(\)\.nullable\(\)\.optional\(\)/);
  assert.match(finance, /goalId: row\.goal_id \?\? undefined/);
  assert.match(finance, /goalName: row\.goal_name \?\? undefined/);
  // Both the live feed and the deleted feed select the same columns.
  assert.match(finance, /payee,goal_id,goal_name/);
});

test("add dialog offers only active goals and never implies funding", () => {
  const dialog = read("src/components/add-transaction-dialog.tsx");
  // Picker exists only when at least one active goal can be assigned.
  assert.match(dialog, /goals\.some\(\(goal\) => !goal\.isArchived\)/);
  // Options exclude archived goals — historical tags are display-only here.
  assert.match(dialog, /\.filter\(\(goal\) => !goal\.isArchived\)/);
  // The create payload carries the selection; null means "no goal".
  assert.match(dialog, /goalId: goalId \|\| null/);
  // "Liên quan" wording — never "đã góp" or progress language.
  assert.match(dialog, /Mục tiêu liên quan/);
  assert.doesNotMatch(dialog, /đã góp|góp vào mục tiêu/i);
});

test("edit dialog hides the picker for transfers and preserves on missing data", () => {
  const dialog = read("src/components/edit-transaction-dialog.tsx");
  // Transfers never see the goal picker.
  assert.match(dialog, /\{!isTransfer && goals\.length > 0 \? \(/);
  // goalId stays undefined when the goal list failed to load — the server
  // then preserves whatever tag exists instead of receiving a silent clear.
  assert.match(dialog, /goals\.length > 0 \? \(goalId === "" \? null : goalId\) : undefined/);
  // The currently tagged archived goal stays selectable as "keep"…
  assert.match(dialog, /tagged && tagged\.isArchived \? \[\.\.\.active, tagged\] : active/);
  // …and is labelled honestly as archived.
  assert.match(dialog, /đã lưu trữ/);
});

test("transaction rows render the tag as related context, not funding", () => {
  const workspace = read("src/components/transactions/transactions-workspace.tsx");
  const css = read("src/components/transactions/transactions-workspace.module.css");
  assert.match(workspace, /styles\.rowGoal/);
  assert.match(css, /\.rowGoal/);
  // Quiet provenance-line copy — "Mục tiêu ·" labels context, not contribution.
  assert.match(workspace, /Mục tiêu ·/);
  assert.doesNotMatch(workspace, /đã góp|tiến độ mục tiêu/i);
});

test("goals page counts related transactions without touching progress", () => {
  const server = read("src/server/goals.ts");
  const page = read("src/components/planning/goals-page.tsx");
  // A separate lightweight count query — allocations stay the progress source.
  assert.match(server, /relatedCounts/);
  assert.match(page, /relatedCounts\?\.\[goal\.id\]/);
  assert.match(page, /giao dịch liên quan/);
});

test("workspaces thread goals into the hook and both dialogs", () => {
  const dashboard = read("src/components/moneyflow-dashboard.tsx");
  const ledger = read("src/components/transactions/transactions-workspace.tsx");
  const quick = read("src/components/inbox/capture-quick-page.tsx");
  for (const src of [dashboard, ledger, quick]) {
    assert.match(src, /goals=\{workspace\.goals\}/);
  }
  for (const src of [dashboard, ledger]) {
    assert.match(src, /goals: workspace\.goals/);
  }
});

test("archive surface carries goal_id only through the generation-aware layer", () => {
  const backup = read("src/lib/archive/archive-backup.ts");
  const settings = read("src/components/backup-settings-page.tsx");
  const validator = read("src/lib/archive/goal-linkage-archive-validator.ts");
  const base = read("src/lib/archive/moneyflow-archive.ts");
  // Both ingress points go through the goal-aware layer.
  assert.match(backup, /goal-linkage-archive-ingress/);
  assert.match(settings, /goal-linkage-archive-ingress/);
  // The current generation owns the field; the base transactions spec must
  // not grow it (other tables legitimately carry their own goal_id refs).
  assert.match(validator, /20260924120000/);
  const transactionsSpec = base.match(
    /transactions: \{\s*idField: "id",\s*fields: \{[\s\S]*?\},\s*\},/,
  );
  assert.ok(transactionsSpec, "transactions row spec must exist");
  assert.doesNotMatch(transactionsSpec[0], /goal_id/);
});
