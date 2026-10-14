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
import { GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION } from "./goal-linkage-archive-validator.ts";
import {
  COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithCommitmentInterval,
} from "./interval-commitment-archive-validator.ts";

const TIMESTAMP = "2026-10-15T03:00:00.000Z";
const ACCOUNT_ID = "29240000-0000-4000-8000-000000000099";
const CATEGORY_ID = "29250000-0000-4000-8000-000000000099";
const COMMITMENT_ID = "29270000-0000-4000-8000-000000000099";

type JsonObject = Record<string, unknown>;

function commitmentRow(
  intervalMonths?: unknown,
  options: { id?: string; name?: string } = {},
): JsonObject {
  const row: JsonObject = {
    id: options.id ?? COMMITMENT_ID,
    name: options.name ?? "Tiền nhà",
    amount_minor: 4000000,
    due_day: 5,
    account_id: ACCOUNT_ID,
    category_id: CATEGORY_ID,
    is_archived: false,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  };
  if (intervalMonths !== undefined) row.interval_months = intervalMonths;
  return row;
}

function buildArchive(
  generation: string,
  recurringCommitments: JsonObject[],
): JsonObject {
  const tables: JsonObject = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    tables[collection] = [];
  }
  tables.profile = {
    full_name: "Cadence Owner",
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
      name: "Tiền nhà",
      kind: "expense",
      icon: null,
      color: null,
      is_default: false,
      is_archived: false,
      created_at: TIMESTAMP,
    },
  ];
  tables.recurringCommitments = recurringCommitments;

  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const value = tables[collection];
    counts[collection] =
      collection === "profile" ? 1 : Array.isArray(value) ? value.length : 0;
  }

  return {
    archive_version: ARCHIVE_VERSION,
    archive_id: "29210000-0000-4000-8000-000000000099",
    produced_at: TIMESTAMP,
    schema_generation: generation,
    tenant_row_counts: counts,
    tables,
  };
}

function codes(input: unknown): string[] {
  const result = validateMoneyFlowArchiveWithCommitmentInterval(input);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

test("current cadence generation accepts monthly and non-monthly rows", () => {
  const result = validateMoneyFlowArchiveWithCommitmentInterval(
    buildArchive(COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION, [
      commitmentRow(1),
      commitmentRow(12, {
        id: "29270000-0000-4000-8000-000000000098",
        name: "Bảo hiểm xe",
      }),
    ]),
  );
  assert.ok(
    result.ok,
    `expected acceptance, got ${result.ok ? "" : result.errors.map((e) => `${e.code}@${e.path}`).join(", ")}`,
  );
});

test("cadence generation rejects a row missing interval_months entirely", () => {
  const found = codes(
    buildArchive(COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION, [
      commitmentRow(),
    ]),
  );
  assert.ok(found.includes("row_missing_field"), `got ${found.join(", ")}`);
});

test("cadence generation rejects malformed and out-of-range intervals", () => {
  for (const [value, expectedCode] of [
    ["12", "field_not_integer"],
    [1.5, "field_not_integer"],
    [0, "field_out_of_range"],
    [25, "field_out_of_range"],
    [null, "field_not_integer"],
  ] as const) {
    const found = codes(
      buildArchive(COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION, [
        commitmentRow(value),
      ]),
    );
    assert.ok(
      found.includes(expectedCode),
      `interval ${JSON.stringify(value)} should report ${expectedCode}, got ${found.join(", ")}`,
    );
  }
});

test("historical generations delegate unchanged (no interval required)", () => {
  for (const generation of [
    LEGACY_ARCHIVE_SCHEMA_GENERATION,
    SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    PAYEE_ARCHIVE_SCHEMA_GENERATION,
    GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
  ]) {
    const result = validateMoneyFlowArchiveWithCommitmentInterval(
      buildArchive(generation, [commitmentRow()]),
    );
    assert.ok(
      result.ok,
      `generation ${generation} without interval_months stays restorable, got ${
        result.ok ? "" : result.errors.map((e) => e.code).join(", ")
      }`,
    );
  }
});

test("ingress accepts every known generation and rejects unknown ones", async () => {
  const { ingestArchiveText } =
    await import("./interval-commitment-archive-ingress.ts");
  for (const generation of [
    LEGACY_ARCHIVE_SCHEMA_GENERATION,
    SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    PAYEE_ARCHIVE_SCHEMA_GENERATION,
    GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
    COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION,
  ]) {
    const isCurrent =
      generation === COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION;
    const result = ingestArchiveText(
      JSON.stringify(
        buildArchive(generation, [commitmentRow(isCurrent ? 3 : undefined)]),
      ),
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
  const found = codes(buildArchive("19990101000000", [commitmentRow(12)]));
  assert.ok(
    found.includes("schema_generation_unsupported"),
    `got ${found.join(", ")}`,
  );
});
