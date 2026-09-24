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
import { PAYEE_ARCHIVE_SCHEMA_GENERATION } from "./payee-archive-validator.ts";
import {
  GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithGoalLinkage,
} from "./goal-linkage-archive-validator.ts";

const TIMESTAMP = "2026-07-15T03:00:00.000Z";
const TX_ID = "19220000-0000-4000-8000-000000000099";
const ACCOUNT_ID = "19240000-0000-4000-8000-000000000099";
const CATEGORY_ID = "19250000-0000-4000-8000-000000000099";
const ENTRY_ID = "19260000-0000-4000-8000-000000000099";
const GOAL_ID = "19270000-0000-4000-8000-000000000099";

type JsonObject = Record<string, unknown>;

function transactionRow(
  goalId?: unknown,
  options: { withPayee?: boolean; id?: string } = {},
): JsonObject {
  const row: JsonObject = {
    id: options.id ?? TX_ID,
    kind: "expense",
    note: "Cơm trưa",
    occurred_on: "2026-07-14",
    idempotency_key: "19230000-0000-4000-8000-000000000099",
    review_status: "reviewed",
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    deleted_at: null,
  };
  if (options.withPayee !== false) row.payee = "Lunch Shop";
  if (goalId !== undefined) row.goal_id = goalId;
  return row;
}

function expenseEntry(
  transactionId: string = TX_ID,
  id: string = ENTRY_ID,
): JsonObject {
  return {
    id,
    transaction_id: transactionId,
    account_id: ACCOUNT_ID,
    category_id: CATEGORY_ID,
    amount_minor: -45000,
    reconciliation_state: "pending",
    cleared_at: null,
    reconciliation_id: null,
    created_at: TIMESTAMP,
  };
}

function savingsGoal(id: string = GOAL_ID): JsonObject {
  return {
    id,
    name: "Quỹ khẩn cấp",
    target_minor: 10000000,
    allocated_minor: 0,
    deadline: null,
    is_archived: false,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  };
}

function buildArchive(
  generation: string,
  transactions: JsonObject[],
  options: { withGoal?: boolean } = {},
): JsonObject {
  const tables: JsonObject = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    tables[collection] = [];
  }
  tables.profile = {
    full_name: "Goal Owner",
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
  tables.savingsGoals = options.withGoal === false ? [] : [savingsGoal()];
  tables.transactions = transactions;
  tables.transactionEntries = transactions.map((row, index) =>
    expenseEntry(
      String(row.id),
      `19260000-0000-4000-8000-0000000000${String(90 + index).slice(-2)}`,
    ),
  );

  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const value = tables[collection];
    counts[collection] =
      collection === "profile" ? 1 : Array.isArray(value) ? value.length : 0;
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
  const result = validateMoneyFlowArchiveWithGoalLinkage(input);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

test("current goal generation accepts a tagged and an untagged row", () => {
  const result = validateMoneyFlowArchiveWithGoalLinkage(
    buildArchive(GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION, [
      transactionRow(GOAL_ID),
      transactionRow(null, {
        id: "19220000-0000-4000-8000-000000000098",
      }),
    ]),
  );
  assert.ok(
    result.ok,
    `expected acceptance, got ${result.ok ? "" : result.errors.map((e) => `${e.code}@${e.path}`).join(", ")}`,
  );
});

test("goal generation rejects a row missing the goal_id key entirely", () => {
  const found = codes(
    buildArchive(GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION, [transactionRow()]),
  );
  assert.ok(found.includes("row_missing_field"), `got ${found.join(", ")}`);
});

test("goal generation rejects malformed and dangling goal references", () => {
  const notUuid = codes(
    buildArchive(GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION, [
      transactionRow("demo-goal-laptop"),
    ]),
  );
  assert.ok(notUuid.includes("field_not_uuid"), `got ${notUuid.join(", ")}`);

  const dangling = codes(
    buildArchive(
      GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
      [transactionRow(GOAL_ID)],
      { withGoal: false },
    ),
  );
  assert.ok(
    dangling.includes("reference_not_found"),
    `got ${dangling.join(", ")}`,
  );
});

test("historical generations delegate unchanged (no goal_id required)", () => {
  for (const generation of [
    LEGACY_ARCHIVE_SCHEMA_GENERATION,
    SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    PAYEE_ARCHIVE_SCHEMA_GENERATION,
  ]) {
    const result = validateMoneyFlowArchiveWithGoalLinkage(
      buildArchive(generation, [
        transactionRow(undefined, {
          withPayee: generation === PAYEE_ARCHIVE_SCHEMA_GENERATION,
        }),
      ]),
    );
    assert.ok(
      result.ok,
      `generation ${generation} without goal_id stays restorable, got ${
        result.ok ? "" : result.errors.map((e) => e.code).join(", ")
      }`,
    );
  }
});

test("ingress accepts every known generation and rejects unknown ones", async () => {
  const { ingestArchiveText } =
    await import("./goal-linkage-archive-ingress.ts");
  for (const generation of [
    LEGACY_ARCHIVE_SCHEMA_GENERATION,
    SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    PAYEE_ARCHIVE_SCHEMA_GENERATION,
    GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
  ]) {
    const isGoal = generation === GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION;
    const rows = [
      transactionRow(isGoal ? GOAL_ID : undefined, {
        withPayee: isGoal || generation === PAYEE_ARCHIVE_SCHEMA_GENERATION,
      }),
    ];
    const result = ingestArchiveText(
      JSON.stringify(buildArchive(generation, rows)),
    );
    assert.ok(
      result.ok,
      `generation ${generation} should ingest, got ${result.ok ? "" : result.code}`,
    );
  }
  const unknown = ingestArchiveText(
    JSON.stringify(buildArchive("19990101000000", [])),
  );
  assert.equal(unknown.ok, false);
});

test("unknown generations still fail closed", () => {
  const found = codes(
    buildArchive("19990101000000", [transactionRow(GOAL_ID)]),
  );
  assert.ok(
    found.includes("schema_generation_unsupported"),
    `got ${found.join(", ")}`,
  );
});
