import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/*
 * Contract: optimistic concurrency on the remaining update RPCs
 * (docs/operations/multi-device-write-semantics.md), mirroring the
 * update_money_transaction / update_account_transfer increments. Two tabs
 * editing the same account, budget, recurring commitment, savings goal or
 * recurring income template must fail closed with an honest stale message
 * instead of silently overwriting each other.
 */

const root = new URL("./", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const STALE_MESSAGE =
  "Dữ liệu đã được thay đổi ở nơi khác, hãy tải lại và thử lại.";

type RpcSpec = {
  name: string;
  migration: string;
  action: string;
  actionFn: string;
  saveType: string;
  saveTypeFile: string;
  component: string;
  componentCall: string;
  oldSignature: string;
  /** Anchor proving the stale check sits between the row lock and the write. */
  lockAnchor: string;
  checkAnchor: string;
  writeAnchor: string;
};

const migrationDir = "../../supabase/migrations/";

const specs: RpcSpec[] = [
  {
    name: "update_financial_account",
    migration: `${migrationDir}20261006200000_update_financial_account_expected_updated_at.sql`,
    action: "../app/actions/accounts.ts",
    actionFn: "export async function saveAccountAction",
    saveType: "SaveAccountInput",
    saveTypeFile: "./accounts.ts",
    component: "../components/accounts/accounts-workspace.tsx",
    componentCall: "saveAccountAction",
    oldSignature:
      "drop function if exists public.update_financial_account(uuid, text, public.account_kind, bigint, text, text)",
    lockAnchor: "for update",
    checkAnchor: "is distinct from p_expected_updated_at",
    writeAnchor: "update public.accounts",
  },
  {
    name: "upsert_monthly_budget",
    migration: `${migrationDir}20261006201000_upsert_monthly_budget_expected_updated_at.sql`,
    action: "../app/actions/budgets.ts",
    actionFn: "export async function saveBudgetAction",
    saveType: "SaveBudgetInput",
    saveTypeFile: "./planning/budgets.ts",
    component: "../components/planning/budgets-page.tsx",
    componentCall: "saveBudgetAction",
    oldSignature: "drop function if exists public.upsert_monthly_budget(uuid, date, bigint)",
    lockAnchor: "for update",
    checkAnchor: "is distinct from p_expected_updated_at",
    writeAnchor: "insert into public.monthly_budgets",
  },
  {
    name: "upsert_recurring_commitment",
    migration: `${migrationDir}20261006202000_upsert_recurring_commitment_expected_updated_at.sql`,
    action: "../app/actions/commitments.ts",
    actionFn: "export async function saveCommitmentAction",
    saveType: "SaveCommitmentInput",
    saveTypeFile: "./planning/commitments.ts",
    component: "../components/planning/commitments-page.tsx",
    componentCall: "saveCommitmentAction",
    oldSignature:
      "drop function if exists public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid)",
    lockAnchor: "for update",
    checkAnchor: "is distinct from p_expected_updated_at",
    writeAnchor: "update public.recurring_commitments",
  },
  {
    name: "upsert_savings_goal",
    migration: `${migrationDir}20261006203000_upsert_savings_goal_expected_updated_at.sql`,
    action: "../app/actions/goals.ts",
    actionFn: "export async function saveGoalAction",
    saveType: "SaveGoalInput",
    saveTypeFile: "./planning/goals.ts",
    component: "../components/planning/goals-page.tsx",
    componentCall: "saveGoalAction",
    oldSignature: "drop function if exists public.upsert_savings_goal(uuid, text, bigint, date)",
    lockAnchor: "for update",
    checkAnchor: "is distinct from p_expected_updated_at",
    writeAnchor: "update public.savings_goals",
  },
  {
    name: "upsert_recurring_income_template",
    migration: `${migrationDir}20261006204000_upsert_recurring_income_template_expected_updated_at.sql`,
    action: "../app/actions/income-templates.ts",
    actionFn: "export async function saveIncomeTemplateAction",
    saveType: "SaveIncomeTemplateInput",
    saveTypeFile: "./planning/income-templates.ts",
    component: "../components/planning/income-templates-page.tsx",
    componentCall: "saveIncomeTemplateAction",
    oldSignature:
      "drop function if exists public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid)",
    lockAnchor: "for update",
    checkAnchor: "is distinct from p_expected_updated_at",
    writeAnchor: "update public.recurring_income_templates",
  },
];

for (const spec of specs) {
  describe(`optimistic concurrency contract — ${spec.name}`, () => {
    const migration = read(spec.migration);
    const actionSource = read(spec.action);
    const componentSource = read(spec.component);
    const saveTypeSource = read(spec.saveTypeFile);

    it("migration adds the optional precondition parameter", () => {
      assert.ok(migration.includes("p_expected_updated_at timestamptz default null"));
      assert.ok(migration.includes("stale_write"));
    });

    it("stale check runs under the row lock before any write", () => {
      const lock = migration.indexOf(spec.lockAnchor);
      const check = migration.indexOf(spec.checkAnchor);
      const write = migration.indexOf(spec.writeAnchor);
      assert.ok(lock > 0 && check > lock && write > check);
    });

    it("old signature is replaced by the defaulted new signature", () => {
      assert.ok(migration.includes(spec.oldSignature));
      // Exactly one live signature afterwards (no ambiguous overloads).
      const creates = migration.split(`create function public.${spec.name}(`);
      assert.equal(creates.length - 1, 1);
    });

    it("grant surface stays authenticated-only", () => {
      assert.ok(migration.includes("to authenticated"));
      assert.ok(migration.includes("from public, anon"));
    });

    it("the action forwards the precondition and maps stale_write", () => {
      const actionStart = actionSource.indexOf(spec.actionFn);
      assert.ok(actionStart > 0);
      const body = actionSource.slice(actionStart, actionStart + 2600);
      assert.ok(body.includes(`"${spec.name}"`));
      assert.ok(body.includes("p_expected_updated_at:"));
      assert.ok(body.includes("expectedUpdatedAt ?? null"));
      assert.ok(body.includes('"stale_write"'));
      assert.ok(body.includes(STALE_MESSAGE));
    });

    it("the save schema accepts the version the client read", () => {
      assert.ok(actionSource.includes("expectedUpdatedAt: z.string().optional()"));
    });

    it("the Save input type carries the precondition", () => {
      const typeStart = saveTypeSource.indexOf(spec.saveType);
      assert.ok(typeStart > 0);
      const typeBody = saveTypeSource.slice(typeStart, typeStart + 600);
      assert.ok(typeBody.includes("expectedUpdatedAt?: string"));
    });

    it("the component attaches the version it read when opening the edit", () => {
      assert.ok(componentSource.includes(`expectedUpdatedAt: editing?.updatedAt`));
    });

    it("null precondition keeps last-write-wins for older callers", () => {
      assert.ok(migration.includes("p_expected_updated_at is not null"));
      assert.ok(actionSource.includes("expectedUpdatedAt ?? null"));
    });
  });
}
