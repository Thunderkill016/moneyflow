import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

/*
 * Contract: the multi-device optimistic-concurrency increment
 * (docs/operations/multi-device-write-semantics.md). The precondition is
 * optional, checked under the row lock, and the client surfaces an honest
 * stale-write message. Pins catch a future refactor that drops the check or
 * quietly weakens it.
 */

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);
const migrationFile = readdirSync(migrationsDir).find((name) =>
  name.includes("expected_updated_at"),
);
const migration = migrationFile
  ? readFileSync(new URL(migrationFile, migrationsDir), "utf8")
  : "";
const actionSource = readFileSync(
  new URL("../app/actions/transactions.ts", import.meta.url),
  "utf8",
);
const financeSource = readFileSync(
  new URL("../server/finance.ts", import.meta.url),
  "utf8",
);
const hookSource = readFileSync(
  new URL("../hooks/use-transactions.ts", import.meta.url),
  "utf8",
);

describe("optimistic concurrency contract", () => {
  it("migration adds the optional precondition parameter", () => {
    assert.ok(migrationFile, "expected_updated_at migration must exist");
    assert.ok(
      migration.includes("p_expected_updated_at timestamptz default null"),
    );
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
        "drop function if exists public.update_money_transaction(\n  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text\n)",
      ),
    );
    // Exactly one live signature afterwards (no ambiguous overloads).
    const creates = migration.split(
      "create function public.update_money_transaction(",
    );
    assert.equal(creates.length - 1, 1);
  });

  it("grant surface stays authenticated-only", () => {
    assert.ok(migration.includes("to authenticated"));
    assert.ok(migration.includes("from public, anon"));
  });

  it("feed exposes updated_at end-to-end", () => {
    assert.ok(migration.includes("transaction_record.updated_at"));
    assert.ok(actionSource.includes("updated_at"));
    assert.ok(financeSource.includes("updated_at: z.string().optional()"));
    assert.ok(financeSource.includes("updatedAt: row.updated_at"));
  });

  it("action forwards the precondition and maps stale_write honestly", () => {
    assert.ok(actionSource.includes("p_expected_updated_at"));
    assert.ok(actionSource.includes('"stale_write"'));
    assert.ok(actionSource.includes("Tải lại"));
  });

  it("the hook attaches the version it read — single and bulk paths", () => {
    assert.ok(hookSource.includes("expectedUpdatedAt: existing.updatedAt"));
    assert.ok(hookSource.includes("expectedUpdatedAt: transaction.updatedAt"));
  });

  it("null precondition keeps last-write-wins for older callers", () => {
    assert.ok(migration.includes("p_expected_updated_at is not null"));
    assert.ok(actionSource.includes("expectedUpdatedAt ?? null"));
  });
});
