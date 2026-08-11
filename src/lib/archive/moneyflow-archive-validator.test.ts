import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_MONEY_MAX,
  ARCHIVE_MONEY_MIN,
  ARCHIVE_RESTORE_ORDER,
  ARCHIVE_SCHEMA_GENERATION,
  ARCHIVE_TABLE_INVENTORY,
  ARCHIVE_VERSION,
} from "./moneyflow-archive.ts";
import {
  validateMoneyFlowArchive,
  type ArchiveRejectionCode,
} from "./moneyflow-archive-validator.ts";

/**
 * R5 — the archive contract must be executable, not merely described.
 *
 * Every financial rule asserted here was read out of a write RPC, because the
 * database enforces almost none of them: a bulk restore that skipped these
 * checks would commit a corrupt ledger that passes every constraint.
 */

function uuid(suffix: number): string {
  return `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
}

const CATEGORY_EXPENSE = uuid(11);
const CATEGORY_EXPENSE_2 = uuid(12);
const CATEGORY_INCOME = uuid(13);
const ACCOUNT_A = uuid(21);
const ACCOUNT_B = uuid(22);
const ACCOUNT_USD = uuid(23);
const TX_INCOME = uuid(31);
const TX_EXPENSE = uuid(32);
const TX_SPLIT = uuid(33);
const TX_TRANSFER = uuid(34);

const TIMESTAMP = "2026-08-11T10:00:00.000Z";
const DATE = "2026-08-11";

function category(id: string, kind: "income" | "expense", archived = false) {
  return {
    id,
    name: kind === "income" ? "Lương" : "Ăn uống",
    kind,
    icon: null,
    color: null,
    is_default: false,
    is_archived: archived,
    created_at: TIMESTAMP,
  };
}

function account(id: string, currency = "VND") {
  return {
    id,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: currency,
    initial_balance_minor: 0,
    credit_limit_minor: null,
    icon: null,
    color: null,
    is_archived: false,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  };
}

function transaction(id: string, kind: "income" | "expense" | "transfer") {
  return {
    id,
    kind,
    note: "",
    occurred_on: DATE,
    idempotency_key: uuid(Number.parseInt(id.slice(-3), 10) + 500),
    review_status: "reviewed",
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    deleted_at: null,
  };
}

function entry(
  id: string,
  transactionId: string,
  accountId: string,
  categoryId: string | null,
  amountMinor: number,
) {
  return {
    id,
    transaction_id: transactionId,
    account_id: accountId,
    category_id: categoryId,
    amount_minor: amountMinor,
    reconciliation_state: "pending",
    cleared_at: null,
    reconciliation_id: null,
    created_at: TIMESTAMP,
  };
}

/** A realistic, fully valid archive covering all four transaction shapes. */
function buildTables(): Record<string, unknown> {
  return {
    profile: {
      full_name: "Người dùng",
      avatar_url: null,
      currency_code: "VND",
      locale: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
    },
    categories: [
      category(CATEGORY_EXPENSE, "expense"),
      category(CATEGORY_EXPENSE_2, "expense"),
      category(CATEGORY_INCOME, "income"),
    ],
    accounts: [account(ACCOUNT_A), account(ACCOUNT_B), account(ACCOUNT_USD, "USD")],
    importBatches: [],
    savingsGoals: [],
    recurringIncomeTemplates: [],
    recurringCommitments: [],
    monthlyBudgets: [],
    inboxRules: [],
    accountReconciliations: [],
    transactions: [
      transaction(TX_INCOME, "income"),
      transaction(TX_EXPENSE, "expense"),
      transaction(TX_SPLIT, "expense"),
      transaction(TX_TRANSFER, "transfer"),
    ],
    inboxCandidates: [],
    savingsGoalAllocations: [],
    incomeTemplateOccurrences: [],
    commitmentOccurrences: [],
    transactionImportProvenance: [],
    transactionEntries: [
      entry(uuid(41), TX_INCOME, ACCOUNT_A, CATEGORY_INCOME, 5_000_000),
      entry(uuid(42), TX_EXPENSE, ACCOUNT_A, CATEGORY_EXPENSE, -120_000),
      entry(uuid(43), TX_SPLIT, ACCOUNT_A, CATEGORY_EXPENSE, -70_000),
      entry(uuid(44), TX_SPLIT, ACCOUNT_A, CATEGORY_EXPENSE_2, -30_000),
      entry(uuid(45), TX_TRANSFER, ACCOUNT_A, null, -200_000),
      entry(uuid(46), TX_TRANSFER, ACCOUNT_B, null, 200_000),
    ],
    accountReconciliationEvents: [],
    auditHistory: [],
  };
}

function countsFor(tables: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const value = tables[collection];
    counts[collection] = collection === "profile" ? 1 : Array.isArray(value) ? value.length : 0;
  }
  return counts;
}

function buildArchive(mutate?: (tables: Record<string, unknown>) => void): Record<string, unknown> {
  const tables = buildTables();
  mutate?.(tables);
  return {
    archive_version: ARCHIVE_VERSION,
    archive_id: uuid(1),
    produced_at: TIMESTAMP,
    schema_generation: ARCHIVE_SCHEMA_GENERATION,
    tenant_row_counts: countsFor(tables),
    tables,
  };
}

function codes(input: unknown): ArchiveRejectionCode[] {
  const result = validateMoneyFlowArchive(input);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

function assertRejects(input: unknown, code: ArchiveRejectionCode) {
  const found = codes(input);
  assert.ok(
    found.includes(code),
    `expected rejection ${code}, got ${found.join(", ") || "no rejection"}`,
  );
}

function assertAccepts(input: unknown) {
  const result = validateMoneyFlowArchive(input);
  assert.ok(
    result.ok,
    `expected acceptance, got ${result.ok ? "" : result.errors.map((e) => `${e.code}@${e.path}`).join(", ")}`,
  );
}

// --- A. envelope ---------------------------------------------------------------

test("a fully populated realistic archive is accepted", () => {
  assertAccepts(buildArchive());
});

test("a minimal empty-tenant archive is accepted", () => {
  const archive = buildArchive((tables) => {
    for (const collection of ALL_ARCHIVE_COLLECTIONS) {
      if (collection !== "profile") tables[collection] = [];
    }
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertAccepts(archive);
});

test("a non-object root is rejected", () => {
  for (const input of [null, undefined, 42, "archive", [], true]) {
    assertRejects(input, "archive_not_object");
  }
});

test("an unsupported archive version is rejected", () => {
  assertRejects({ ...buildArchive(), archive_version: 2 }, "archive_version_unsupported");
  assertRejects({ ...buildArchive(), archive_version: "1" }, "archive_version_unsupported");
});

test("a malformed archive_id is rejected", () => {
  assertRejects({ ...buildArchive(), archive_id: "not-a-uuid" }, "archive_id_malformed");
  assertRejects({ ...buildArchive(), archive_id: 1 }, "archive_id_malformed");
});

test("a malformed produced_at is rejected", () => {
  assertRejects({ ...buildArchive(), produced_at: "2026-08-11" }, "produced_at_malformed");
  assertRejects({ ...buildArchive(), produced_at: "not a date" }, "produced_at_malformed");
  assertRejects({ ...buildArchive(), produced_at: 0 }, "produced_at_malformed");
});

test("an unsupported schema generation is rejected", () => {
  assertRejects(
    { ...buildArchive(), schema_generation: "19990101000000" },
    "schema_generation_unsupported",
  );
});

test("a missing envelope field is rejected", () => {
  const archive = buildArchive();
  delete archive.produced_at;
  assertRejects(archive, "archive_missing_key");
});

test("an unknown envelope key is rejected rather than ignored", () => {
  assertRejects({ ...buildArchive(), extra_field: 1 }, "archive_unknown_key");
});

test("a row-count mismatch is rejected", () => {
  const archive = buildArchive();
  (archive.tenant_row_counts as Record<string, number>).transactions = 99;
  assertRejects(archive, "row_counts_mismatch");
});

test("a missing collection is rejected", () => {
  const archive = buildArchive();
  delete (archive.tables as Record<string, unknown>).monthlyBudgets;
  assertRejects(archive, "collection_missing");
});

test("an unknown collection is rejected rather than silently discarded", () => {
  const archive = buildArchive((tables) => {
    tables.secretLedger = [];
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "collection_unknown");
});

test("a non-array collection is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      tables.categories = {};
    }),
    "collection_not_array",
  );
});

// --- B. ownership --------------------------------------------------------------

test("a replayable user_id on a row is rejected, not trusted or dropped", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.categories as Record<string, unknown>[])[0].user_id = uuid(999);
    }),
    "owner_authority_field_present",
  );
});

test("owner-authority aliases are all rejected", () => {
  for (const key of ["userId", "owner_id", "target_user_id", "auth_user_id", "tenant_id"]) {
    assertRejects(
      buildArchive((tables) => {
        (tables.accounts as Record<string, unknown>[])[0][key] = uuid(999);
      }),
      "owner_authority_field_present",
    );
  }
});

test("the profile carries no id, so source tenant identity cannot become the target's", () => {
  // The absence is the contract: `profiles.id` *is* the auth user id.
  assertRejects(
    buildArchive((tables) => {
      (tables.profile as Record<string, unknown>).id = uuid(999);
    }),
    "row_unknown_field",
  );
});

test("audit history carries neither user_id nor actor_user_id", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.auditHistory as unknown[]).push({
        id: uuid(61),
        actor_kind: "user",
        actor_user_id: uuid(999),
        action: "transaction_created",
        entity_type: "financial_transaction",
        entity_id: TX_INCOME,
        related_transaction_id: null,
        occurred_at: TIMESTAMP,
      });
    }),
    "owner_authority_field_present",
  );
});

test("audit history keeps no request_id transport metadata", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.auditHistory as unknown[]).push({
        id: uuid(62),
        actor_kind: "system",
        action: "entry_created",
        entity_type: "transaction_entry",
        entity_id: uuid(41),
        related_transaction_id: TX_INCOME,
        occurred_at: TIMESTAMP,
        request_id: "req_abc123",
      });
    }),
    "row_unknown_field",
  );
});

test("a valid sanitized audit history row is accepted", () => {
  const archive = buildArchive((tables) => {
    (tables.auditHistory as unknown[]).push({
      id: uuid(63),
      actor_kind: "user",
      action: "transaction_created",
      entity_type: "financial_transaction",
      entity_id: TX_INCOME,
      related_transaction_id: TX_INCOME,
      occurred_at: TIMESTAMP,
    });
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertAccepts(archive);
});

// --- C. money ------------------------------------------------------------------

test("money boundary values are accepted exactly", () => {
  for (const amount of [1, -1, ARCHIVE_MONEY_MAX, ARCHIVE_MONEY_MIN]) {
    const archive = buildArchive((tables) => {
      (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = amount;
    });
    assertAccepts(archive);
  }
  const zero = buildArchive((tables) => {
    (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = 0;
  });
  assertAccepts(zero);
});

test("money beyond the safe-integer bound is rejected, never rounded", () => {
  for (const amount of [ARCHIVE_MONEY_MAX + 2, ARCHIVE_MONEY_MIN - 2, 2 ** 60]) {
    assertRejects(
      buildArchive((tables) => {
        (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = amount;
      }),
      "money_out_of_safe_range",
    );
  }
});

test("fractional money is rejected, never truncated", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = 1.5;
    }),
    "money_not_integer",
  );
});

test("NaN and Infinity money are rejected", () => {
  for (const amount of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assertRejects(
      buildArchive((tables) => {
        (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = amount;
      }),
      "money_not_integer",
    );
  }
});

test("stringified money is rejected, never coerced", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.accounts as Record<string, unknown>[])[0].initial_balance_minor = "120000";
    }),
    "field_not_money",
  );
});

test("stringified booleans and null defaults are rejected, never coerced", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.categories as Record<string, unknown>[])[0].is_archived = "false";
    }),
    "field_not_boolean",
  );
  assertRejects(
    buildArchive((tables) => {
      (tables.categories as Record<string, unknown>[])[0].is_archived = null;
    }),
    "field_null_not_allowed",
  );
});

test("table CHECK constraints are enforced before mutation, not left to INSERT", () => {
  // Evaluator finding: money that is safe-integer but violates the owning
  // table's CHECK would have passed validation and failed mid-restore.
  const cases: [string, () => Record<string, unknown>, ArchiveRejectionCode][] = [
    [
      "savings goal target must be positive",
      () =>
        buildArchive((tables) => {
          (tables.savingsGoals as unknown[]).push(goal({ target_minor: -5, allocated_minor: 0 }));
        }),
      "money_out_of_allowed_range",
    ],
    [
      "budget limit must be positive",
      () =>
        buildArchive((tables) => {
          (tables.monthlyBudgets as unknown[]).push({
            id: uuid(101),
            category_id: CATEGORY_EXPENSE,
            month_start: "2026-08-01",
            limit_minor: 0,
            created_at: TIMESTAMP,
            updated_at: TIMESTAMP,
          });
        }),
      "money_out_of_allowed_range",
    ],
    [
      "a goal allocation may not be zero",
      () =>
        buildArchive((tables) => {
          (tables.savingsGoals as unknown[]).push(goal());
          (tables.savingsGoalAllocations as unknown[]).push({
            id: uuid(102),
            goal_id: uuid(100),
            amount_minor: 0,
            created_at: TIMESTAMP,
          });
        }),
      "money_must_not_be_zero",
    ],
    [
      "a currency code must match the three-letter pattern",
      () =>
        buildArchive((tables) => {
          (tables.accounts as Record<string, unknown>[])[0].currency_code = "vnd";
        }),
      "field_pattern_mismatch",
    ],
    [
      "a whitespace-only name is rejected like the trimmed CHECK does",
      () =>
        buildArchive((tables) => {
          (tables.categories as Record<string, unknown>[])[0].name = "   ";
        }),
      "field_too_short",
    ],
    [
      "a negative credit limit is rejected",
      () =>
        buildArchive((tables) => {
          (tables.accounts as Record<string, unknown>[])[0].credit_limit_minor = -1;
        }),
      "money_out_of_allowed_range",
    ],
  ];

  for (const [label, build, code] of cases) {
    const archive = build();
    archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
    const found = codes(archive);
    assert.ok(found.includes(code), `${label}: expected ${code}, got ${found.join(", ")}`);
  }
});

test("cross-field and month-start CHECKs are enforced before mutation", () => {
  const allocationOverrun = buildArchive((tables) => {
    (tables.savingsGoals as unknown[]).push(
      goal({ target_minor: 1_000, allocated_minor: 1_001 }),
    );
  });
  allocationOverrun.tenant_row_counts = countsFor(
    allocationOverrun.tables as Record<string, unknown>,
  );
  assertRejects(allocationOverrun, "allocated_exceeds_target");

  const midMonth = buildArchive((tables) => {
    (tables.monthlyBudgets as unknown[]).push({
      id: uuid(103),
      category_id: CATEGORY_EXPENSE,
      month_start: "2026-08-15",
      limit_minor: 500_000,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    });
  });
  midMonth.tenant_row_counts = countsFor(midMonth.tables as Record<string, unknown>);
  assertRejects(midMonth, "month_start_not_first_of_month");

  const validBudget = buildArchive((tables) => {
    (tables.savingsGoals as unknown[]).push(goal({ target_minor: 1_000, allocated_minor: 1_000 }));
    (tables.monthlyBudgets as unknown[]).push({
      id: uuid(104),
      category_id: CATEGORY_EXPENSE,
      month_start: "2026-08-01",
      limit_minor: 500_000,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    });
  });
  validBudget.tenant_row_counts = countsFor(validBudget.tables as Record<string, unknown>);
  assertAccepts(validBudget);
});

test("an unknown key in tenant_row_counts is rejected", () => {
  const archive = buildArchive();
  (archive.tenant_row_counts as Record<string, number>).madeUpTable = 0;
  assertRejects(archive, "row_counts_unknown_collection");
});

test("the parsed-object evidence boundary is explicit, not a security claim", () => {
  // RFC 8259 §4: duplicate member names are not interoperable. JSON.parse keeps
  // the last value and discards the rest, so by the time this validator runs the
  // duplicate is already gone. This test records that limitation as executable
  // evidence rather than letting a future reader assume raw-key protection.
  const parsed = JSON.parse('{"archive_version": 2, "archive_version": 1}') as Record<
    string,
    unknown
  >;
  assert.equal(parsed.archive_version, 1, "JSON.parse keeps the last duplicate member");
  assert.equal(Object.keys(parsed).length, 1, "the earlier duplicate is unobservable here");
});

function goal(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(100),
    name: "Quỹ dự phòng",
    target_minor: 10_000_000,
    allocated_minor: 0,
    deadline: null,
    is_archived: false,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    ...overrides,
  };
}

// --- D. identity and references ------------------------------------------------

test("a duplicate row id is rejected", () => {
  const archive = buildArchive((tables) => {
    const categories = tables.categories as Record<string, unknown>[];
    categories.push({ ...category(CATEGORY_EXPENSE, "expense") });
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "duplicate_row_id");
});

test("a dangling account reference is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[0].account_id = uuid(888);
    }),
    "reference_not_found",
  );
});

test("a dangling category reference is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[1].category_id = uuid(888);
    }),
    "reference_not_found",
  );
});

test("a dangling transaction reference is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[0].transaction_id = uuid(888);
    }),
    "reference_not_found",
  );
});

test("a dangling approved_transaction_id is rejected", () => {
  const archive = buildArchive((tables) => {
    (tables.inboxCandidates as unknown[]).push(candidate(uuid(71), { approved_transaction_id: uuid(888) }));
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "reference_not_found");
});

test("a dangling reconciliation reference is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[0].reconciliation_id = uuid(888);
    }),
    "reference_not_found",
  );
});

test("a dangling transfer_pair_id is rejected", () => {
  const archive = buildArchive((tables) => {
    (tables.inboxCandidates as unknown[]).push(candidate(uuid(72), { transfer_pair_id: uuid(888) }));
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "reference_not_found");
});

test("a candidate paired with itself is rejected", () => {
  const archive = buildArchive((tables) => {
    (tables.inboxCandidates as unknown[]).push(candidate(uuid(73), { transfer_pair_id: uuid(73) }));
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "self_reference_to_own_row");
});

test("two mutually paired candidates are accepted", () => {
  const archive = buildArchive((tables) => {
    (tables.inboxCandidates as unknown[]).push(
      candidate(uuid(74), { transfer_pair_id: uuid(75) }),
      candidate(uuid(75), { transfer_pair_id: uuid(74) }),
    );
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertAccepts(archive);
});

function candidate(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    kind: "expense",
    amount_minor: 50_000,
    merchant: "Cửa hàng",
    note: "",
    occurred_on: DATE,
    source: "csv",
    confidence: "high",
    status: "pending",
    possible_duplicate: false,
    possible_transfer: false,
    category_id: null,
    category_name: null,
    account_id: null,
    account_name: null,
    raw_snippet: null,
    import_batch_id: null,
    local_id: null,
    source_row_index: null,
    source_external_id: null,
    fingerprint_version: null,
    fingerprint: null,
    parser_version: null,
    mapping_version: null,
    match_status: null,
    match_reason: null,
    match_confidence: null,
    transfer_pair_id: null,
    approved_transaction_id: null,
    approved_at: null,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    ...overrides,
  };
}

// --- E. income and expense shapes ---------------------------------------------

test("a positive expense entry is rejected even though every total balances", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[1].amount_minor = 120_000;
    }),
    "expense_entry_sign_invalid",
  );
});

test("a negative income entry is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[0].amount_minor = -5_000_000;
    }),
    "income_entry_sign_invalid",
  );
});

test("an income entry pointing at an expense category is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[0].category_id = CATEGORY_EXPENSE;
    }),
    "entry_category_kind_mismatch",
  );
});

test("an expense entry pointing at an income category is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[1].category_id = CATEGORY_INCOME;
    }),
    "entry_category_kind_mismatch",
  );
});

test("an income transaction with two entries is rejected", () => {
  const archive = buildArchive((tables) => {
    (tables.transactionEntries as unknown[]).push(
      entry(uuid(47), TX_INCOME, ACCOUNT_A, CATEGORY_INCOME, 1_000),
    );
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "income_entry_count_invalid");
});

test("an expense entry without a category is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[1].category_id = null;
    }),
    "entry_category_missing",
  );
});

test("a transaction with no entries at all is rejected as incomplete", () => {
  const archive = buildArchive((tables) => {
    tables.transactionEntries = (tables.transactionEntries as Record<string, unknown>[]).filter(
      (row) => row.transaction_id !== TX_EXPENSE,
    );
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "transaction_without_entries");
});

test("a zero-amount entry is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[1].amount_minor = 0;
    }),
    "entry_amount_zero",
  );
});

// --- F. transfers --------------------------------------------------------------

test("an unbalanced transfer is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[5].amount_minor = 199_999;
    }),
    "transfer_not_balanced",
  );
});

test("a transfer with the wrong entry count is rejected", () => {
  const archive = buildArchive((tables) => {
    tables.transactionEntries = (tables.transactionEntries as Record<string, unknown>[]).filter(
      (row) => row.id !== uuid(46),
    );
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "transfer_entry_count_invalid");
});

test("a transfer carrying a category is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[4].category_id = CATEGORY_EXPENSE;
    }),
    "transfer_entry_category_present",
  );
});

test("a transfer between two different currencies is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[5].account_id = ACCOUNT_USD;
    }),
    "transfer_currency_mismatch",
  );
});

test("a transfer to the same account is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[5].account_id = ACCOUNT_A;
    }),
    "transfer_same_account",
  );
});

test("a same-signed pair that still sums to zero is impossible, but both-negative is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      const rows = tables.transactionEntries as Record<string, unknown>[];
      rows[4].amount_minor = -200_000;
      rows[5].amount_minor = -200_000;
    }),
    "transfer_sign_invalid",
  );
});

// --- G. splits -----------------------------------------------------------------

test("an exact split is accepted", () => {
  assertAccepts(buildArchive());
});

test("a split spread across two accounts is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[3].account_id = ACCOUNT_B;
    }),
    "split_account_mismatch",
  );
});

test("a split reusing one category twice is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[3].category_id = CATEGORY_EXPENSE;
    }),
    "split_duplicate_category",
  );
});

test("a split with a positive line is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.transactionEntries as Record<string, unknown>[])[3].amount_minor = 30_000;
    }),
    "expense_entry_sign_invalid",
  );
});

test("a split with more than twelve lines is rejected", () => {
  const archive = buildArchive((tables) => {
    const rows = tables.transactionEntries as Record<string, unknown>[];
    const categories = tables.categories as Record<string, unknown>[];
    for (let index = 0; index < 12; index += 1) {
      const categoryId = uuid(200 + index);
      categories.push(category(categoryId, "expense"));
      rows.push(entry(uuid(300 + index), TX_SPLIT, ACCOUNT_A, categoryId, -1_000));
    }
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "expense_entry_count_invalid");
});

// --- H. historical states ------------------------------------------------------

test("a historical transaction whose category was archived later is accepted", () => {
  // Live creation raises `category_archived`; a faithful restore must not.
  const archive = buildArchive((tables) => {
    const categories = tables.categories as Record<string, unknown>[];
    categories[0] = category(CATEGORY_EXPENSE, "expense", true);
  });
  assertAccepts(archive);
});

test("an inbox rule whose category was archived later is accepted", () => {
  // Reachable today: `inbox_rules_validate_category` fires only on insert or on
  // update of the rule's own columns, and nothing cascades from archiving a
  // category to its rules, so this state exists in real tenants.
  const archive = buildArchive((tables) => {
    (tables.categories as Record<string, unknown>[])[0] = category(CATEGORY_EXPENSE, "expense", true);
    (tables.inboxRules as unknown[]).push({
      id: uuid(81),
      stage: "candidate",
      priority: 10,
      enabled: true,
      match_field: "merchant",
      contains_text: "coffee",
      category_id: CATEGORY_EXPENSE,
      merchant_name: null,
      version: 1,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    });
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertAccepts(archive);
});

test("a soft-deleted transaction round-trips as soft-deleted", () => {
  const archive = buildArchive((tables) => {
    (tables.transactions as Record<string, unknown>[])[1].deleted_at = TIMESTAMP;
  });
  assertAccepts(archive);
  const result = validateMoneyFlowArchive(archive);
  assert.ok(result.ok);
  const restored = (result.archive.tables as Record<string, Record<string, unknown>[]>).transactions[1];
  assert.equal(restored.deleted_at, TIMESTAMP);
});

// --- I. security ---------------------------------------------------------------

test("a nested access token anywhere in the archive is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.importBatches as unknown[]).push({ access_token: "secret-value" });
    }),
    "forbidden_secret_field",
  );
});

test("a password hash is rejected", () => {
  assertRejects(
    buildArchive((tables) => {
      (tables.profile as Record<string, unknown>).password_hash = "argon2id$...";
    }),
    "forbidden_secret_field",
  );
});

test("secrets hidden inside opaque JSON payloads are still rejected", () => {
  const archive = buildArchive((tables) => {
    (tables.importBatches as unknown[]).push({
      id: uuid(91),
      file_name: "sao-ke.csv",
      source: "csv",
      status: "parsed",
      row_count: 0,
      warning_count: 0,
      skipped_rows: 0,
      map_confidence: 0,
      headers: [],
      // The strict schema accepts column_map as opaque JSON, so the recursive
      // scan is the only thing standing between a nested secret and the archive.
      column_map: { nested: { service_role_key: "eyJ..." } },
      local_id: null,
      created_at: TIMESTAMP,
      committed_at: null,
      updated_at: TIMESTAMP,
    });
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertRejects(archive, "forbidden_secret_field");
});

test("provider and infrastructure metadata is rejected", () => {
  for (const key of ["supabase_url", "database_url", "anon_key", "jwt", "authorization", "cookie"]) {
    assertRejects(
      buildArchive((tables) => {
        (tables.profile as Record<string, unknown>)[key] = "x";
      }),
      key === "supabase_url" || key === "database_url" || key === "anon_key"
        ? "forbidden_secret_field"
        : "forbidden_secret_field",
    );
  }
});

test("legitimate MoneyFlow field names are not mistaken for secrets", () => {
  // Guards against a lazy substring scan: none of these may trip the detector.
  const archive = buildArchive((tables) => {
    (tables.inboxCandidates as unknown[]).push(
      candidate(uuid(95), {
        fingerprint: "abc123",
        fingerprint_version: 1,
        parser_version: "v2",
        raw_snippet: "GRAB *ăn uống",
        local_id: "row-7",
      }),
    );
  });
  archive.tenant_row_counts = countsFor(archive.tables as Record<string, unknown>);
  assertAccepts(archive);
});

// --- K. purity and determinism -------------------------------------------------

test("the validator does not mutate its input", () => {
  const archive = buildArchive();
  const before = JSON.stringify(archive);
  validateMoneyFlowArchive(archive);
  assert.equal(JSON.stringify(archive), before);
});

test("validation is deterministic for the same input", () => {
  const archive = buildArchive((tables) => {
    (tables.transactionEntries as Record<string, unknown>[])[1].amount_minor = 500;
  });
  const first = validateMoneyFlowArchive(archive);
  const second = validateMoneyFlowArchive(archive);
  assert.deepEqual(first, second);
});

test("rejections never echo archive values", () => {
  const secretNote = "chuyển tiền cho mẹ 5 triệu";
  const archive = buildArchive((tables) => {
    (tables.transactions as Record<string, unknown>[])[1].note = secretNote;
    (tables.transactionEntries as Record<string, unknown>[])[1].amount_minor = 1.5;
  });
  const result = validateMoneyFlowArchive(archive);
  assert.ok(!result.ok);
  const serialized = JSON.stringify(result.errors);
  assert.ok(!serialized.includes(secretNote), "error output must not contain archive content");
  assert.ok(!serialized.includes("1.5"), "error output must not contain the offending value");
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error).sort(), ["code", "path"]);
  }
});

test("the pure validator imports no runtime, database or provider module", () => {
  const source = readFileSync(new URL("./moneyflow-archive-validator.ts", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import[^;]*?from\s+"([^"]+)";/gmu)].map((match) => match[1]);
  assert.deepEqual(imports, ["./moneyflow-archive.ts"]);
  // Strip comments first: the module's own documentation names the things it
  // deliberately avoids, and prose must not fail a check about executable code.
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");
  for (const forbidden of ["supabase", "next/", "react", "node:", "process.env", "globalThis"]) {
    assert.ok(!code.includes(forbidden), `validator must not reference ${forbidden}`);
  }
});

// --- Inventory drift ------------------------------------------------------------

test("the archive inventory matches purge_user_tenant_data exactly", () => {
  // Test-only, bounded parsing: the runtime never reads migration text. If a
  // later PR changes the purge inventory without updating the archive contract,
  // this fails.
  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260804160000_financial_mutation_audit.sql", import.meta.url),
    "utf8",
  );
  const body = migration.slice(migration.indexOf("function public.purge_user_tenant_data"));
  const purged = new Set(
    [...body.matchAll(/delete from public\.([a-z_]+)\s+where/gu)].map((match) => match[1]),
  );
  assert.equal(purged.size, 19, "expected the purge function to cover nineteen tenant tables");
  const inventory = new Set(ARCHIVE_TABLE_INVENTORY.map((entry) => entry.table));
  assert.deepEqual([...inventory].sort(), [...purged].sort());
});

test("every inventory table has exactly one disposition and a unique restore position", () => {
  const positions = ARCHIVE_TABLE_INVENTORY.map((entry) => entry.restoreOrder);
  assert.equal(new Set(positions).size, positions.length, "restore positions must be unique");
  assert.deepEqual([...positions].sort((a, b) => a - b), Array.from({ length: 19 }, (_, i) => i + 1));
  for (const entry of ARCHIVE_TABLE_INVENTORY) {
    assert.ok(["restorable", "history", "excluded"].includes(entry.disposition));
    if (entry.disposition !== "restorable") {
      assert.ok(entry.reason, `${entry.table} must record why it is not restorable`);
    }
  }
  assert.equal(new Set(ALL_ARCHIVE_COLLECTIONS).size, 19);
  assert.equal(ARCHIVE_RESTORE_ORDER[0], "profiles");
  assert.equal(ARCHIVE_RESTORE_ORDER.at(-1), "financial_mutation_audit_events");
});

test("the audit table is the only non-replayable collection", () => {
  const history = ARCHIVE_TABLE_INVENTORY.filter((entry) => entry.disposition === "history");
  assert.deepEqual(
    history.map((entry) => entry.table),
    ["financial_mutation_audit_events"],
  );
});
