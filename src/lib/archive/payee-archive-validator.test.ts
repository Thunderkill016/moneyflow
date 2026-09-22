import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_VERSION,
} from "./moneyflow-archive.ts";
import {
  LEGACY_ARCHIVE_SCHEMA_GENERATION,
  SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
} from "./source-lineage-archive-validator.ts";
import {
  PAYEE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithPayee,
} from "./payee-archive-validator.ts";

const TIMESTAMP = "2026-07-15T03:00:00.000Z";
const TX_ID = "19220000-0000-4000-8000-000000000099";
const ACCOUNT_ID = "19240000-0000-4000-8000-000000000099";
const CATEGORY_ID = "19250000-0000-4000-8000-000000000099";
const ENTRY_ID = "19260000-0000-4000-8000-000000000099";

type JsonObject = Record<string, unknown>;

function transactionRow(payee?: unknown): JsonObject {
  const row: JsonObject = {
    id: TX_ID,
    kind: "expense",
    note: "Cơm trưa",
    occurred_on: "2026-07-14",
    idempotency_key: "19230000-0000-4000-8000-000000000099",
    review_status: "reviewed",
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    deleted_at: null,
  };
  if (payee !== undefined) row.payee = payee;
  return row;
}

function expenseEntry(): JsonObject {
  return {
    id: ENTRY_ID,
    transaction_id: TX_ID,
    account_id: ACCOUNT_ID,
    category_id: CATEGORY_ID,
    amount_minor: -45000,
    reconciliation_state: "pending",
    cleared_at: null,
    reconciliation_id: null,
    created_at: TIMESTAMP,
  };
}

function buildArchive(generation: string, transactions: JsonObject[]): JsonObject {
  const tables: JsonObject = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    tables[collection] = [];
  }
  tables.profile = {
    full_name: "Payee Owner",
    avatar_url: null,
    currency_code: "VND",
    locale: "vi-VN",
    timezone: "Asia/Ho_Chi_Minh",
  };
  tables.accounts = [
    {
      id: ACCOUNT_ID,
      name: "Ví tiền mặt",
      kind: "cash",
      currency_code: "VND",
      initial_balance_minor: 0,
      credit_limit_minor: null,
      icon: null,
      color: null,
      is_archived: false,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  ];
  tables.categories = [
    {
      id: CATEGORY_ID,
      name: "Ăn uống",
      kind: "expense",
      icon: null,
      color: null,
      is_default: false,
      is_archived: false,
      created_at: TIMESTAMP,
    },
  ];
  tables.transactions = transactions;
  tables.transactionEntries = transactions.length > 0 ? [expenseEntry()] : [];

  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const value = tables[collection];
    counts[collection] = collection === "profile" ? 1 : Array.isArray(value) ? value.length : 0;
  }

  return {
    archive_version: ARCHIVE_VERSION,
    archive_id: "19210000-0000-4000-8000-000000000099",
    produced_at: TIMESTAMP,
    schema_generation: generation,
    tenant_row_counts: counts,
    tables,
  };
}

function codes(input: unknown): string[] {
  const result = validateMoneyFlowArchiveWithPayee(input);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

test("current payee generation is accepted when every transaction row carries payee", () => {
  const result = validateMoneyFlowArchiveWithPayee(
    buildArchive(PAYEE_ARCHIVE_SCHEMA_GENERATION, [transactionRow("Lunch Shop")]),
  );
  assert.ok(
    result.ok,
    `expected acceptance, got ${result.ok ? "" : result.errors.map((e) => `${e.code}@${e.path}`).join(", ")}`,
  );
});

test("payee generation accepts an empty-string payee", () => {
  const result = validateMoneyFlowArchiveWithPayee(
    buildArchive(PAYEE_ARCHIVE_SCHEMA_GENERATION, [transactionRow("")]),
  );
  assert.ok(
    result.ok,
    `expected acceptance, got ${result.ok ? "" : result.errors.map((e) => `${e.code}@${e.path}`).join(", ")}`,
  );
});

test("payee generation rejects a row missing the payee key entirely", () => {
  const found = codes(
    buildArchive(PAYEE_ARCHIVE_SCHEMA_GENERATION, [transactionRow()]),
  );
  assert.ok(found.includes("row_missing_field"), `got ${found.join(", ")}`);
});

test("payee generation rejects non-string and overlong payee values", () => {
  const nonString = codes(
    buildArchive(PAYEE_ARCHIVE_SCHEMA_GENERATION, [transactionRow(42)]),
  );
  assert.ok(nonString.includes("field_not_text"), `got ${nonString.join(", ")}`);

  const tooLong = codes(
    buildArchive(PAYEE_ARCHIVE_SCHEMA_GENERATION, [transactionRow("x".repeat(201))]),
  );
  assert.ok(tooLong.includes("field_too_long"), `got ${tooLong.join(", ")}`);
});

test("historical generations delegate unchanged (no payee required)", () => {
  const legacy = validateMoneyFlowArchiveWithPayee(
    buildArchive(LEGACY_ARCHIVE_SCHEMA_GENERATION, [transactionRow()]),
  );
  assert.ok(legacy.ok, "legacy generation without payee stays restorable");

  const lineage = validateMoneyFlowArchiveWithPayee(
    buildArchive(SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION, [transactionRow()]),
  );
  assert.ok(lineage.ok, "source-lineage generation without payee stays restorable");
});

test("ingress accepts every known generation and rejects unknown ones", async () => {
  const { ingestArchiveText } = await import("./payee-archive-ingress.ts");
  for (const generation of [
    LEGACY_ARCHIVE_SCHEMA_GENERATION,
    SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    PAYEE_ARCHIVE_SCHEMA_GENERATION,
  ]) {
    const result = ingestArchiveText(
      JSON.stringify(buildArchive(generation, [transactionRow(generation === PAYEE_ARCHIVE_SCHEMA_GENERATION ? "x" : undefined)])),
    );
    assert.ok(result.ok, `generation ${generation} should ingest, got ${result.ok ? "" : result.code}`);
  }
  const unknown = ingestArchiveText(JSON.stringify(buildArchive("19990101000000", [])));
  assert.equal(unknown.ok, false);
});

test("unknown generations still fail closed", () => {
  const found = codes(
    buildArchive("19990101000000", [transactionRow("x")]),
  );
  assert.ok(
    found.includes("schema_generation_unsupported"),
    `got ${found.join(", ")}`,
  );
});
