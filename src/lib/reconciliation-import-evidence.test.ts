import assert from "node:assert/strict";
import test from "node:test";
import type { AccountReconciliationEntry } from "./reconciliation.ts";
import {
  findExactDifferenceCandidates,
  reconciliationImportEvidenceLabel,
} from "./reconciliation-import-evidence.ts";

function entry({
  id,
  impact,
  occurredOn = "2026-08-10",
  state = "pending",
}: {
  id: string;
  impact: number;
  occurredOn?: string;
  state?: "pending" | "cleared" | "reconciled";
}): AccountReconciliationEntry {
  return {
    transaction: {
      id,
      kind: impact >= 0 ? "income" : "expense",
      categoryId: `category-${id}`,
      category: "Khác",
      note: id,
      accountId: "account-a",
      account: "Tài khoản A",
      amount: Math.abs(impact),
      occurredOn,
      occurredAt: `${occurredOn}T01:00:00.000Z`,
      relativeDate: occurredOn,
    },
    impact,
    direction: impact >= 0 ? "in" : "out",
    transferCounterparty: null,
    entryId: `entry-${id}`,
    transactionId: id,
    accountId: "account-a",
    state,
    clearedAt: state === "pending" ? null : "2026-08-10T02:00:00.000Z",
    reconciliationId: state === "reconciled" ? "session-a" : null,
    entryCount: 1,
  };
}

test("exact-difference hint returns only eligible pending account legs", () => {
  const candidates = findExactDifferenceCandidates(
    [
      entry({ id: "exact", impact: -250_000 }),
      entry({ id: "other", impact: -100_000 }),
      entry({ id: "later", impact: -250_000, occurredOn: "2026-08-11" }),
      entry({ id: "cleared", impact: -250_000, state: "cleared" }),
      entry({ id: "reconciled", impact: -250_000, state: "reconciled" }),
    ],
    "2026-08-10",
    -250_000,
  );

  assert.deepEqual(candidates.map((item) => item.transaction.id), ["exact"]);
});

test("exact-difference hint never runs at zero or for unsafe differences", () => {
  const rows = [entry({ id: "zero", impact: 100_000 })];
  assert.deepEqual(findExactDifferenceCandidates(rows, "2026-08-10", 0), []);
  assert.deepEqual(
    findExactDifferenceCandidates(rows, "2026-08-10", Number.MAX_SAFE_INTEGER + 1),
    [],
  );
});

test("multiple equal pending impacts remain multiple review candidates", () => {
  const candidates = findExactDifferenceCandidates(
    [entry({ id: "a", impact: 50_000 }), entry({ id: "b", impact: 50_000 })],
    "2026-08-10",
    50_000,
  );

  assert.deepEqual(candidates.map((item) => item.transaction.id), ["a", "b"]);
});

test("import evidence label keeps the original one-based statement row understandable", () => {
  assert.equal(
    reconciliationImportEvidenceLabel({
      source: "csv",
      sourceRowIndex: 11,
      originalDescription: "CARD PAYMENT",
      importBatchId: "batch-a",
    }),
    "CSV · dòng 12",
  );
  assert.equal(
    reconciliationImportEvidenceLabel({
      source: "email",
      sourceRowIndex: null,
      originalDescription: "Receipt",
      importBatchId: null,
    }),
    "Email",
  );
});
