import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/*
 * Contract: optimistic concurrency on update_account_transfer
 * (docs/operations/multi-device-write-semantics.md), mirroring the
 * update_money_transaction increment from migration
 * 20260923160000_update_money_transaction_expected_updated_at.sql. Two tabs
 * editing the same transfer must fail closed with an honest stale message
 * instead of silently overwriting each other.
 */

const root = new URL("./", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const migration = read(
  "../../supabase/migrations/20261006160000_update_account_transfer_expected_updated_at.sql",
);
const actionSource = read("../app/actions/transactions.ts");
const hookSource = read("../hooks/use-transactions.ts");
const contractsSource = read("./transactions/contracts.ts");

describe("optimistic concurrency contract — update_account_transfer", () => {
  it("migration adds the optional precondition parameter", () => {
    assert.ok(migration.includes("p_expected_updated_at timestamptz default null"));
    assert.ok(migration.includes("stale_write"));
  });

  it("stale check runs under the row lock before any write", () => {
    const lock = migration.indexOf("for update");
    const check = migration.indexOf("is distinct from p_expected_updated_at");
    const write = migration.indexOf("update public.financial_transactions");
    assert.ok(lock > 0 && check > lock && write > check);
  });

  it("old signature is replaced by the defaulted new signature", () => {
    assert.ok(
      migration.includes(
        "drop function if exists public.update_account_transfer(\n  uuid, uuid, uuid, bigint, date, text\n)",
      ),
    );
    // Exactly one live signature afterwards (no ambiguous overloads).
    const creates = migration.split(
      "create function public.update_account_transfer(",
    );
    assert.equal(creates.length - 1, 1);
  });

  it("grant surface stays authenticated-only", () => {
    assert.ok(migration.includes("to authenticated"));
    assert.ok(migration.includes("from public, anon"));
  });

  it("updateTransferAction forwards the precondition", () => {
    const actionStart = actionSource.indexOf(
      "export async function updateTransferAction",
    );
    assert.ok(actionStart > 0);
    const body = actionSource.slice(actionStart, actionStart + 2200);
    assert.ok(body.includes('"update_account_transfer"'));
    assert.ok(body.includes("p_expected_updated_at: value.expectedUpdatedAt ?? null"));
  });

  it("updateTransferAction maps stale_write to an honest Vietnamese message", () => {
    const actionStart = actionSource.indexOf(
      "export async function updateTransferAction",
    );
    const body = actionSource.slice(actionStart, actionStart + 2600);
    assert.ok(body.includes('"stale_write"'));
    assert.ok(
      body.includes("Dữ liệu đã được thay đổi ở nơi khác, hãy tải lại và thử lại."),
    );
  });

  it("updateTransferSchema accepts the version the client read", () => {
    const schemaStart = actionSource.indexOf("const updateTransferSchema");
    assert.ok(schemaStart > 0);
    const schema = actionSource.slice(schemaStart, schemaStart + 500);
    assert.ok(schema.includes("expectedUpdatedAt"));
  });

  it("UpdateTransferInput carries the precondition", () => {
    const typeStart = contractsSource.indexOf("export type UpdateTransferInput");
    assert.ok(typeStart > 0);
    const typeBody = contractsSource.slice(typeStart, typeStart + 400);
    assert.ok(typeBody.includes("expectedUpdatedAt?: string"));
  });

  it("the hook attaches the version it read — single and bulk paths", () => {
    // Single-row edit: transfer branch of the update action call.
    assert.ok(
      hookSource.includes(
        "await updateTransferAction(\n                  existing?.updatedAt",
      ),
    );
    // Bulk "đổi ngày": dateUpdateInput builds the transfer input.
    assert.ok(hookSource.includes("expectedUpdatedAt: transaction.updatedAt"));
  });

  it("null precondition keeps last-write-wins for older callers", () => {
    assert.ok(migration.includes("p_expected_updated_at is not null"));
    assert.ok(actionSource.includes("expectedUpdatedAt ?? null"));
  });
});
