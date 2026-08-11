/**
 * MoneyFlow archive v1 — the contract shared by the future export producer,
 * the pure validator, the database dependency-graph tests and the restore RPC.
 *
 * This module is the single canonical place where the archive inventory, the
 * table dispositions, the restore order and the row shapes live. Nineteen table
 * names are never copied into an unrelated file: everything derives from
 * `ARCHIVE_TABLE_INVENTORY` below.
 *
 * Scope note: R5 defines and validates the contract. It does not export, does
 * not restore, and does not touch a database.
 */

/** Bumped only by a reviewed contract change. Unsupported versions fail closed. */
export const ARCHIVE_VERSION = 1 as const;

/**
 * The migration generation this contract was derived from — the timestamp
 * prefix of the newest migration that shaped a tenant table. Restore compares
 * it so an archive produced against a materially different schema is rejected
 * rather than half-understood.
 */
export const ARCHIVE_SCHEMA_GENERATION = "20260804160000" as const;

/**
 * MoneyFlow stores money as `bigint` đồng, but the application contract is
 * bounded by JavaScript safe-integer semantics — the same bound
 * `create_money_transaction` enforces with `amount_exceeds_safe_integer`.
 */
export const ARCHIVE_MONEY_MAX = 9007199254740991;
export const ARCHIVE_MONEY_MIN = -9007199254740991;

/**
 * `create_split_expense` accepts 2..12 lines and writes one entry per line, all
 * on the same account, each negative. A plain expense has one entry. So a
 * legitimate `expense` transaction carries between 1 and 12 entries.
 */
export const SPLIT_MIN_LINES = 2;
export const SPLIT_MAX_LINES = 12;
export const EXPENSE_MIN_ENTRIES = 1;
export const EXPENSE_MAX_ENTRIES = SPLIT_MAX_LINES;
/** `create_account_transfer` writes exactly two entries with null categories. */
export const TRANSFER_ENTRY_COUNT = 2;
/** `create_money_transaction` writes exactly one entry for income. */
export const INCOME_ENTRY_COUNT = 1;

/**
 * How each tenant table `purge_user_tenant_data` deletes is treated.
 *
 * - `restorable` — live state the restore reconstructs.
 * - `history` — preserved for the user's own evidence but **never** inserted
 *   into the live table it came from. Replaying it would fabricate provenance.
 * - `excluded` — deliberately absent, with a reason.
 *
 * No table may be silently absent merely because a slice does not yet restore it.
 */
export type ArchiveDisposition = "restorable" | "history" | "excluded";

export type ArchiveTableSpec = {
  /** Postgres table name, as it appears in `purge_user_tenant_data`. */
  readonly table: string;
  readonly disposition: ArchiveDisposition;
  /** Key of the collection inside the archive payload. */
  readonly collection: string;
  /** Position in the restore insert order (reverse of the purge delete order). */
  readonly restoreOrder: number;
  readonly reason?: string;
};

/**
 * Anchored to `purge_user_tenant_data`. `restoreOrder` is the reverse of that
 * function's delete order, which is a topological order verified against every
 * foreign key in both `CREATE TABLE` and `ALTER TABLE` statements.
 */
export const ARCHIVE_TABLE_INVENTORY: readonly ArchiveTableSpec[] = [
  { table: "profiles", disposition: "restorable", collection: "profile", restoreOrder: 1 },
  { table: "categories", disposition: "restorable", collection: "categories", restoreOrder: 2 },
  { table: "accounts", disposition: "restorable", collection: "accounts", restoreOrder: 3 },
  { table: "import_batches", disposition: "restorable", collection: "importBatches", restoreOrder: 4 },
  { table: "savings_goals", disposition: "restorable", collection: "savingsGoals", restoreOrder: 5 },
  {
    table: "recurring_income_templates",
    disposition: "restorable",
    collection: "recurringIncomeTemplates",
    restoreOrder: 6,
  },
  {
    table: "recurring_commitments",
    disposition: "restorable",
    collection: "recurringCommitments",
    restoreOrder: 7,
  },
  { table: "monthly_budgets", disposition: "restorable", collection: "monthlyBudgets", restoreOrder: 8 },
  { table: "inbox_rules", disposition: "restorable", collection: "inboxRules", restoreOrder: 9 },
  {
    table: "account_reconciliations",
    disposition: "restorable",
    collection: "accountReconciliations",
    restoreOrder: 10,
  },
  {
    table: "financial_transactions",
    disposition: "restorable",
    collection: "transactions",
    restoreOrder: 11,
  },
  { table: "inbox_candidates", disposition: "restorable", collection: "inboxCandidates", restoreOrder: 12 },
  {
    table: "savings_goal_allocations",
    disposition: "restorable",
    collection: "savingsGoalAllocations",
    restoreOrder: 13,
  },
  {
    table: "income_template_occurrences",
    disposition: "restorable",
    collection: "incomeTemplateOccurrences",
    restoreOrder: 14,
  },
  {
    table: "commitment_occurrences",
    disposition: "restorable",
    collection: "commitmentOccurrences",
    restoreOrder: 15,
  },
  {
    table: "transaction_import_provenance",
    disposition: "restorable",
    collection: "transactionImportProvenance",
    restoreOrder: 16,
  },
  {
    table: "transaction_entries",
    disposition: "restorable",
    collection: "transactionEntries",
    restoreOrder: 17,
  },
  {
    table: "account_reconciliation_events",
    disposition: "restorable",
    collection: "accountReconciliationEvents",
    restoreOrder: 18,
  },
  {
    table: "financial_mutation_audit_events",
    disposition: "history",
    collection: "auditHistory",
    restoreOrder: 19,
    reason:
      "Describes mutations that happened in the source lifecycle. Inserting them into the live audit table would fabricate provenance for the target tenant, so they are preserved as non-replayable history only. Restore must create its own restore-time provenance instead.",
  },
];

/** Collections holding live restorable state. */
export const RESTORABLE_COLLECTIONS = ARCHIVE_TABLE_INVENTORY.filter(
  (entry) => entry.disposition === "restorable",
).map((entry) => entry.collection);

/** Collections preserved as non-replayable history. */
export const HISTORY_COLLECTIONS = ARCHIVE_TABLE_INVENTORY.filter(
  (entry) => entry.disposition === "history",
).map((entry) => entry.collection);

/** Every collection an archive payload may contain. Anything else is rejected. */
export const ALL_ARCHIVE_COLLECTIONS = ARCHIVE_TABLE_INVENTORY.map((entry) => entry.collection);

/** The order the restore must insert in. */
export const ARCHIVE_RESTORE_ORDER = [...ARCHIVE_TABLE_INVENTORY]
  .sort((left, right) => left.restoreOrder - right.restoreOrder)
  .map((entry) => entry.table);

// --- Enum vocabularies, mirrored from the migrations ---------------------------

export const TRANSACTION_KINDS = ["income", "expense", "transfer"] as const;
export const CATEGORY_KINDS = ["income", "expense"] as const;
export const ACCOUNT_KINDS = ["cash", "bank", "e_wallet", "credit_card", "savings"] as const;
export const TRANSACTION_REVIEW_STATUSES = ["needs_review", "reviewed"] as const;
export const ENTRY_RECONCILIATION_STATES = ["pending", "cleared", "reconciled"] as const;
export const IMPORT_BATCH_SOURCES = ["csv", "xlsx", "pdf", "paste"] as const;
export const IMPORT_BATCH_STATUSES = ["parsed", "committed", "cancelled"] as const;
export const IMPORT_MATCH_STATUSES = [
  "would_create",
  "duplicate",
  "suspected_transfer",
  "invalid",
] as const;
export const INBOX_CANDIDATE_SOURCES = [
  "paste",
  "csv",
  "xlsx",
  "pdf",
  "manual",
  "notification",
  "email",
] as const;
export const INBOX_CANDIDATE_STATUSES = ["pending", "approved", "rejected"] as const;
export const INBOX_CANDIDATE_CONFIDENCES = ["high", "medium", "low"] as const;
export const RECONCILIATION_STATUSES = ["open", "completed"] as const;
export const RECONCILIATION_EVENT_KINDS = ["started", "completed", "reopened"] as const;
export const AUDIT_ACTOR_KINDS = ["user", "system"] as const;
export const AUDIT_ACTIONS = [
  "transaction_created",
  "transaction_updated",
  "transaction_soft_deleted",
  "transaction_restored",
  "transaction_review_changed",
  "entry_created",
  "entry_financial_changed",
  "entry_category_changed",
  "entry_reconciliation_changed",
  "reconciliation_started",
  "reconciliation_completed",
  "reconciliation_reopened",
] as const;
export const AUDIT_ENTITY_TYPES = [
  "financial_transaction",
  "transaction_entry",
  "account_reconciliation",
] as const;
export const RULE_MATCH_FIELDS = ["merchant", "note", "raw", "any"] as const;

/**
 * Owner-authority field names. These must never appear in an archive record:
 * target ownership comes from `auth.uid()` at restore time, never from the
 * archive. Presence is a rejection, not something to trust or quietly drop.
 */
export const OWNER_AUTHORITY_KEYS = [
  "user_id",
  "userId",
  "owner_id",
  "ownerId",
  "target_user_id",
  "targetUserId",
  "auth_user_id",
  "authUserId",
  "actor_user_id",
  "actorUserId",
  "tenant_id",
  "tenantId",
] as const;

/**
 * Defence in depth behind the strict schemas: key names that must never carry
 * archive data. Matching is on normalized whole-word-ish segments rather than
 * naive substrings, so legitimate MoneyFlow fields are not flagged.
 */
export const FORBIDDEN_SECRET_KEYS = [
  "password",
  "passwordhash",
  "passwordsalt",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "token",
  "jwt",
  "servicerole",
  "servicerolekey",
  "secret",
  "clientsecret",
  "oauthtoken",
  "oauthsecret",
  "captchasecret",
  "turnstilesecret",
  "apikey",
  "anonkey",
  "publishablekey",
  "authorization",
  "cookie",
  "sessioncookie",
  "sessiontoken",
  "credential",
  "credentials",
  "privatekey",
  "supabaseurl",
  "databaseurl",
  "connectionstring",
  "dsn",
] as const;

/**
 * Substrings that make a key forbidden wherever they appear, so variants like
 * `auth_token` or `stripe_secret_key` are caught without enumerating them.
 *
 * Deliberately narrow. Every one was checked against the real archive field
 * names — `fingerprint`, `parser_version`, `raw_snippet`, `column_map`,
 * `currency_code`, `locale`, `timezone`, `possible_duplicate` and the rest — so
 * none of them produce a substring false positive. Anything broader (`key`,
 * `id`, `dsn`) stays out of this list and is matched exactly instead.
 */
export const SECRET_KEY_SUBSTRINGS = [
  "password",
  "token",
  "secret",
  "credential",
  "apikey",
  "jwt",
  "servicerole",
  "privatekey",
  "authorization",
  "cookie",
  "connectionstring",
] as const;

// --- Field specification -------------------------------------------------------

export type ArchiveFieldSpec =
  | { readonly kind: "uuid"; readonly nullable?: boolean }
  | {
      readonly kind: "text";
      readonly nullable?: boolean;
      readonly maxLength?: number;
      /** Minimum length after trimming, mirroring the table's own CHECK. */
      readonly minLength?: number;
      readonly pattern?: RegExp;
    }
  | {
      readonly kind: "money";
      readonly nullable?: boolean;
      /**
       * Mirrors the table's own CHECK. Without these, an archive holding
       * `target_minor = -5` would pass validation and then fail at INSERT —
       * which would break the promise that nothing is written after a rejection.
       */
      readonly min?: number;
      readonly nonZero?: boolean;
    }
  | {
      readonly kind: "integer";
      readonly nullable?: boolean;
      readonly min?: number;
      readonly max?: number;
    }
  | { readonly kind: "unitNumber"; readonly nullable?: boolean }
  | { readonly kind: "boolean"; readonly nullable?: boolean }
  | { readonly kind: "date"; readonly nullable?: boolean }
  /**
   * A date that must be the first day of its month. `monthly_budgets`,
   * `commitment_occurrences` and `income_template_occurrences` all carry
   * `check (month_start = date_trunc('month', month_start)::date)`.
   */
  | { readonly kind: "monthStart"; readonly nullable?: boolean }
  | { readonly kind: "timestamp"; readonly nullable?: boolean }
  | { readonly kind: "enum"; readonly values: readonly string[]; readonly nullable?: boolean }
  | { readonly kind: "jsonArray"; readonly nullable?: boolean }
  | { readonly kind: "jsonObject"; readonly nullable?: boolean }
  | {
      /** A uuid that must resolve to a row in another collection. */
      readonly kind: "ref";
      readonly collection: string;
      readonly nullable?: boolean;
    };

export type ArchiveRowSpec = {
  /** Primary-key field name, or null when the collection is a single object. */
  readonly idField: string | null;
  readonly fields: Readonly<Record<string, ArchiveFieldSpec>>;
};

/** `currency_code text ... check (currency_code ~ '^[A-Z]{3}$')` in both tables. */
export const CURRENCY_CODE_RE = /^[A-Z]{3}$/u;

const TIMESTAMP: ArchiveFieldSpec = { kind: "timestamp" };
const NULLABLE_TIMESTAMP: ArchiveFieldSpec = { kind: "timestamp", nullable: true };

/**
 * Row shapes, source-neutral: no `user_id` anywhere, and `profiles.id` is
 * deliberately absent because it *is* the source tenant identity and must never
 * become the target's. Derived values are omitted — notably
 * `account_reconciliation_events.difference_minor`, which the schema permits up
 * to ±18014398509481982 (twice the JavaScript safe-integer bound) and which is
 * exactly `statement_balance_minor - calculated_balance_minor`, so restore
 * recomputes it instead of carrying an unrepresentable number.
 */
export const ARCHIVE_ROW_SPECS: Readonly<Record<string, ArchiveRowSpec>> = {
  profile: {
    idField: null,
    fields: {
      full_name: { kind: "text", maxLength: 80 },
      avatar_url: { kind: "text", nullable: true, maxLength: 2000 },
      currency_code: { kind: "text", pattern: CURRENCY_CODE_RE },
      locale: { kind: "text", maxLength: 35 },
      timezone: { kind: "text", maxLength: 64 },
    },
  },
  categories: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      name: { kind: "text", minLength: 1, maxLength: 60 },
      kind: { kind: "enum", values: CATEGORY_KINDS },
      icon: { kind: "text", nullable: true, maxLength: 60 },
      color: { kind: "text", nullable: true, maxLength: 40 },
      is_default: { kind: "boolean" },
      is_archived: { kind: "boolean" },
      created_at: TIMESTAMP,
    },
  },
  accounts: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      name: { kind: "text", minLength: 1, maxLength: 80 },
      kind: { kind: "enum", values: ACCOUNT_KINDS },
      currency_code: { kind: "text", pattern: CURRENCY_CODE_RE },
      initial_balance_minor: { kind: "money" },
      credit_limit_minor: { kind: "money", nullable: true, min: 0 },
      icon: { kind: "text", nullable: true, maxLength: 60 },
      color: { kind: "text", nullable: true, maxLength: 40 },
      is_archived: { kind: "boolean" },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  importBatches: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      file_name: { kind: "text", minLength: 1, maxLength: 260 },
      source: { kind: "enum", values: IMPORT_BATCH_SOURCES },
      status: { kind: "enum", values: IMPORT_BATCH_STATUSES },
      row_count: { kind: "integer", min: 0, max: 1000000 },
      warning_count: { kind: "integer", min: 0, max: 1000000 },
      skipped_rows: { kind: "integer", min: 0, max: 1000000 },
      map_confidence: { kind: "unitNumber" },
      headers: { kind: "jsonArray" },
      column_map: { kind: "jsonObject" },
      local_id: { kind: "text", nullable: true, maxLength: 80 },
      created_at: TIMESTAMP,
      committed_at: NULLABLE_TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  savingsGoals: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      name: { kind: "text", minLength: 1, maxLength: 80 },
      target_minor: { kind: "money", min: 1 },
      allocated_minor: { kind: "money", min: 0 },
      deadline: { kind: "date", nullable: true },
      is_archived: { kind: "boolean" },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  recurringIncomeTemplates: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      name: { kind: "text", minLength: 1, maxLength: 80 },
      amount_minor: { kind: "money", min: 1 },
      due_day: { kind: "integer", min: 1, max: 31 },
      account_id: { kind: "ref", collection: "accounts" },
      category_id: { kind: "ref", collection: "categories" },
      is_archived: { kind: "boolean" },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  recurringCommitments: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      name: { kind: "text", maxLength: 80 },
      amount_minor: { kind: "money" },
      due_day: { kind: "integer", min: 1, max: 31 },
      account_id: { kind: "ref", collection: "accounts" },
      category_id: { kind: "ref", collection: "categories" },
      is_archived: { kind: "boolean" },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  monthlyBudgets: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      category_id: { kind: "ref", collection: "categories" },
      month_start: { kind: "monthStart" },
      limit_minor: { kind: "money", min: 1 },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  inboxRules: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      stage: { kind: "text", maxLength: 20 },
      priority: { kind: "integer", min: 1, max: 100000 },
      enabled: { kind: "boolean" },
      match_field: { kind: "enum", values: RULE_MATCH_FIELDS },
      contains_text: { kind: "text", minLength: 1, maxLength: 120 },
      category_id: { kind: "ref", collection: "categories" },
      merchant_name: { kind: "text", nullable: true, maxLength: 200 },
      version: { kind: "integer", min: 1 },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  accountReconciliations: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      account_id: { kind: "ref", collection: "accounts" },
      statement_date: { kind: "date" },
      statement_balance_minor: { kind: "money" },
      status: { kind: "enum", values: RECONCILIATION_STATUSES },
      calculated_balance_minor: { kind: "money", nullable: true },
      pending_account_leg_count: { kind: "integer", nullable: true, min: 0 },
      cleared_account_leg_count: { kind: "integer", nullable: true, min: 0 },
      reconciled_account_leg_count: { kind: "integer", nullable: true, min: 0 },
      started_at: TIMESTAMP,
      completed_at: NULLABLE_TIMESTAMP,
      last_reopened_at: NULLABLE_TIMESTAMP,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  transactions: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      kind: { kind: "enum", values: TRANSACTION_KINDS },
      note: { kind: "text", maxLength: 500 },
      occurred_on: { kind: "date" },
      idempotency_key: { kind: "uuid" },
      review_status: { kind: "enum", values: TRANSACTION_REVIEW_STATUSES },
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
      deleted_at: NULLABLE_TIMESTAMP,
    },
  },
  inboxCandidates: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      kind: { kind: "enum", values: TRANSACTION_KINDS },
      amount_minor: { kind: "money", min: 1 },
      merchant: { kind: "text", minLength: 1, maxLength: 200 },
      note: { kind: "text", maxLength: 500 },
      occurred_on: { kind: "date" },
      source: { kind: "enum", values: INBOX_CANDIDATE_SOURCES },
      confidence: { kind: "enum", values: INBOX_CANDIDATE_CONFIDENCES },
      status: { kind: "enum", values: INBOX_CANDIDATE_STATUSES },
      possible_duplicate: { kind: "boolean" },
      possible_transfer: { kind: "boolean" },
      category_id: { kind: "ref", collection: "categories", nullable: true },
      category_name: { kind: "text", nullable: true, maxLength: 60 },
      account_id: { kind: "ref", collection: "accounts", nullable: true },
      account_name: { kind: "text", nullable: true, maxLength: 80 },
      raw_snippet: { kind: "text", nullable: true, maxLength: 2000 },
      import_batch_id: { kind: "ref", collection: "importBatches", nullable: true },
      local_id: { kind: "text", nullable: true, maxLength: 80 },
      source_row_index: { kind: "integer", nullable: true, min: 0 },
      source_external_id: { kind: "text", nullable: true, maxLength: 200 },
      fingerprint_version: { kind: "integer", nullable: true, min: 1 },
      fingerprint: { kind: "text", nullable: true, maxLength: 128 },
      parser_version: { kind: "text", nullable: true, maxLength: 80 },
      mapping_version: { kind: "integer", nullable: true, min: 1 },
      match_status: { kind: "enum", values: IMPORT_MATCH_STATUSES, nullable: true },
      match_reason: { kind: "text", nullable: true, maxLength: 500 },
      match_confidence: { kind: "unitNumber", nullable: true },
      transfer_pair_id: { kind: "ref", collection: "inboxCandidates", nullable: true },
      approved_transaction_id: { kind: "ref", collection: "transactions", nullable: true },
      approved_at: NULLABLE_TIMESTAMP,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    },
  },
  savingsGoalAllocations: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      goal_id: { kind: "ref", collection: "savingsGoals" },
      amount_minor: { kind: "money", nonZero: true },
      created_at: TIMESTAMP,
    },
  },
  incomeTemplateOccurrences: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      template_id: { kind: "ref", collection: "recurringIncomeTemplates" },
      month_start: { kind: "monthStart" },
      transaction_id: { kind: "ref", collection: "transactions" },
      received_at: TIMESTAMP,
    },
  },
  commitmentOccurrences: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      commitment_id: { kind: "ref", collection: "recurringCommitments" },
      month_start: { kind: "monthStart" },
      transaction_id: { kind: "ref", collection: "transactions" },
      paid_at: TIMESTAMP,
    },
  },
  transactionImportProvenance: {
    idField: "transaction_id",
    fields: {
      transaction_id: { kind: "ref", collection: "transactions" },
      candidate_id: { kind: "ref", collection: "inboxCandidates" },
      import_batch_id: { kind: "ref", collection: "importBatches", nullable: true },
      source: { kind: "enum", values: INBOX_CANDIDATE_SOURCES },
      source_row_index: { kind: "integer", nullable: true, min: 0 },
      original_description: { kind: "text", maxLength: 2000 },
      source_external_id: { kind: "text", nullable: true, maxLength: 200 },
      fingerprint_version: { kind: "integer", nullable: true, min: 1 },
      fingerprint: { kind: "text", nullable: true, maxLength: 128 },
      parser_version: { kind: "text", nullable: true, maxLength: 80 },
      mapping_version: { kind: "integer", nullable: true, min: 1 },
      match_status: { kind: "enum", values: IMPORT_MATCH_STATUSES },
      match_reason: { kind: "text", nullable: true, maxLength: 500 },
    },
  },
  transactionEntries: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      transaction_id: { kind: "ref", collection: "transactions" },
      account_id: { kind: "ref", collection: "accounts" },
      category_id: { kind: "ref", collection: "categories", nullable: true },
      amount_minor: { kind: "money", nonZero: true },
      reconciliation_state: { kind: "enum", values: ENTRY_RECONCILIATION_STATES },
      cleared_at: NULLABLE_TIMESTAMP,
      reconciliation_id: { kind: "ref", collection: "accountReconciliations", nullable: true },
      created_at: TIMESTAMP,
    },
  },
  accountReconciliationEvents: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      reconciliation_id: { kind: "ref", collection: "accountReconciliations" },
      account_id: { kind: "ref", collection: "accounts" },
      kind: { kind: "enum", values: RECONCILIATION_EVENT_KINDS },
      statement_balance_minor: { kind: "money" },
      calculated_balance_minor: { kind: "money" },
      occurred_at: TIMESTAMP,
    },
  },
  /**
   * Non-replayable history. `user_id` and `actor_user_id` are both omitted:
   * the table's own `financial_mutation_audit_actor_shape_check` proves
   * `actor_user_id` is exactly `user_id` when `actor_kind = 'user'` and NULL
   * when it is `'system'`, so `actor_kind` already carries every bit of
   * information those columns held. `request_id` is transport metadata with no
   * user recovery value and is excluded.
   */
  auditHistory: {
    idField: "id",
    fields: {
      id: { kind: "uuid" },
      actor_kind: { kind: "enum", values: AUDIT_ACTOR_KINDS },
      action: { kind: "enum", values: AUDIT_ACTIONS },
      entity_type: { kind: "enum", values: AUDIT_ENTITY_TYPES },
      entity_id: { kind: "uuid" },
      related_transaction_id: { kind: "uuid", nullable: true },
      occurred_at: TIMESTAMP,
    },
  },
};

// --- Envelope -----------------------------------------------------------------

export type ArchiveEnvelope = {
  readonly archive_version: typeof ARCHIVE_VERSION;
  readonly archive_id: string;
  readonly produced_at: string;
  readonly schema_generation: string;
  readonly tenant_row_counts: Readonly<Record<string, number>>;
};

export type MoneyFlowArchive = ArchiveEnvelope & {
  readonly tables: Readonly<Record<string, unknown>>;
};

/** Envelope keys, used for strict unknown-key rejection. */
export const ARCHIVE_ENVELOPE_KEYS = [
  "archive_version",
  "archive_id",
  "produced_at",
  "schema_generation",
  "tenant_row_counts",
  "tables",
] as const;

export function archiveSpecFor(collection: string): ArchiveTableSpec | undefined {
  return ARCHIVE_TABLE_INVENTORY.find((entry) => entry.collection === collection);
}
