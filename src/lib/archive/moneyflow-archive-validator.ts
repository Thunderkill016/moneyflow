/**
 * Pure, fail-closed validation of a MoneyFlow archive v1.
 *
 * Purity is part of the contract: no Supabase, no network, no filesystem, no
 * database, no `process.env`, no React, no Next runtime, no provider import.
 * The only import is the archive contract itself.
 *
 * Evidence boundary — this validator operates on an **already-parsed**
 * JavaScript value. RFC 8259 §4 notes that duplicate object member names are
 * not interoperable: implementations may keep the last value, reject, or expose
 * all of them. `JSON.parse` keeps the last and discards the rest *before* this
 * function is ever called, so this validator cannot and does not claim to detect
 * duplicate raw JSON keys. Raw-text ingress protection belongs to the later file
 * ingress slice; no hand-written JSON parser is introduced here to fake the
 * claim.
 */

import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_ENVELOPE_KEYS,
  ARCHIVE_MONEY_MAX,
  ARCHIVE_MONEY_MIN,
  ARCHIVE_ROW_SPECS,
  ARCHIVE_SCHEMA_GENERATION,
  ARCHIVE_VERSION,
  EXPENSE_MAX_ENTRIES,
  EXPENSE_MIN_ENTRIES,
  FORBIDDEN_SECRET_KEYS,
  INCOME_ENTRY_COUNT,
  OWNER_AUTHORITY_KEYS,
  SECRET_KEY_SUBSTRINGS,
  TRANSFER_ENTRY_COUNT,
  type ArchiveFieldSpec,
  type MoneyFlowArchive,
} from "./moneyflow-archive.ts";

/**
 * A rejection carries a stable code and a structural path only — never the
 * offending value. An archive holds a user's whole financial history; echoing
 * its contents into an error object would leak it into logs and UI surfaces.
 */
export type ArchiveRejection = {
  readonly code: ArchiveRejectionCode;
  readonly path: string;
};

export type ArchiveRejectionCode =
  | "archive_not_object"
  | "archive_unknown_key"
  | "archive_missing_key"
  | "archive_version_unsupported"
  | "archive_id_malformed"
  | "produced_at_malformed"
  | "schema_generation_unsupported"
  | "row_counts_not_object"
  | "row_counts_unknown_collection"
  | "row_counts_malformed"
  | "row_counts_mismatch"
  | "tables_not_object"
  | "collection_missing"
  | "collection_unknown"
  | "collection_not_array"
  | "profile_not_object"
  | "row_not_object"
  | "row_unknown_field"
  | "row_missing_field"
  | "owner_authority_field_present"
  | "forbidden_secret_field"
  | "field_not_uuid"
  | "field_not_text"
  | "field_too_long"
  | "field_too_short"
  | "field_pattern_mismatch"
  | "field_not_boolean"
  | "field_not_integer"
  | "field_out_of_range"
  | "field_not_money"
  | "money_not_integer"
  | "money_out_of_safe_range"
  | "money_out_of_allowed_range"
  | "money_must_not_be_zero"
  | "field_not_date"
  | "month_start_not_first_of_month"
  | "allocated_exceeds_target"
  | "entry_reconciliation_shape_invalid"
  | "reconciliation_status_shape_invalid"
  | "candidate_approval_shape_invalid"
  | "candidate_applied_rule_pair_invalid"
  | "field_not_timestamp"
  | "field_not_enum_value"
  | "field_not_json_array"
  | "field_not_json_object"
  | "field_null_not_allowed"
  | "duplicate_row_id"
  | "reference_not_found"
  | "self_reference_to_own_row"
  | "transaction_without_entries"
  | "income_entry_count_invalid"
  | "income_entry_sign_invalid"
  | "expense_entry_count_invalid"
  | "expense_entry_sign_invalid"
  | "entry_category_missing"
  | "entry_category_kind_mismatch"
  | "split_account_mismatch"
  | "split_duplicate_category"
  | "transfer_entry_count_invalid"
  | "transfer_entry_category_present"
  | "transfer_not_balanced"
  | "transfer_sign_invalid"
  | "transfer_same_account"
  | "transfer_currency_mismatch"
  | "entry_amount_zero";

export type ArchiveValidationResult =
  | { readonly ok: true; readonly archive: MoneyFlowArchive }
  | { readonly ok: false; readonly errors: readonly ArchiveRejection[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Strict calendar check — rejects `2026-02-30`, which the regex alone accepts. */
function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * `Date.parse` is not strict enough on its own: `Date.parse("2026-02-30T10:00:00Z")`
 * silently normalizes to 2 March instead of returning NaN, so an impossible
 * calendar date would reach a `timestamptz` INSERT and fail there. The date part
 * is therefore checked as strictly as `isRealDate`, and the clock components are
 * range-checked because the regex alone would accept `99:99:99`.
 */
function isRealTimestamp(value: string): boolean {
  if (!TIMESTAMP_RE.test(value)) return false;
  if (!isRealDate(value.slice(0, 10))) return false;
  const hours = Number.parseInt(value.slice(11, 13), 10);
  const minutes = Number.parseInt(value.slice(14, 16), 10);
  const seconds = Number.parseInt(value.slice(17, 19), 10);
  if (hours > 23 || minutes > 59 || seconds > 59) return false;
  return !Number.isNaN(Date.parse(value));
}

/**
 * PostgreSQL canonicalizes `uuid` values, so two archive ids differing only in
 * hex letter case are the *same* row to the database. Indexing raw strings would
 * miss the duplicate here and fail on the primary key mid-restore instead.
 */
function canonicalUuid(value: string): string {
  return value.toLowerCase();
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

const OWNER_AUTHORITY_SET = new Set<string>(OWNER_AUTHORITY_KEYS.map(normalizeKey));
const FORBIDDEN_SECRET_SET = new Set<string>(FORBIDDEN_SECRET_KEYS.map(normalizeKey));

function isOwnerAuthorityKey(key: string): boolean {
  return OWNER_AUTHORITY_SET.has(normalizeKey(key));
}

function isForbiddenSecretKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (FORBIDDEN_SECRET_SET.has(normalized)) return true;
  return SECRET_KEY_SUBSTRINGS.some((needle) => normalized.includes(needle));
}

/**
 * Defence in depth behind the strict per-row schemas: walk the whole input and
 * reject any key that names a secret or an ownership authority, however deeply
 * nested — including inside the free-form `headers` / `column_map` payloads that
 * the strict schemas accept as opaque JSON.
 */
function scanForbiddenKeys(value: unknown, path: string, errors: ArchiveRejection[], depth = 0): void {
  // Archives are shallow by construction; the bound stops a pathological input
  // from turning defence in depth into unbounded recursion.
  if (depth > 24) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, `${path}[${index}]`, errors, depth + 1));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) {
    const childPath = path === "" ? key : `${path}.${key}`;
    if (isOwnerAuthorityKey(key)) {
      errors.push({ code: "owner_authority_field_present", path: childPath });
    } else if (isForbiddenSecretKey(key)) {
      errors.push({ code: "forbidden_secret_field", path: childPath });
    }
    scanForbiddenKeys(value[key], childPath, errors, depth + 1);
  }
}

function validateField(
  value: unknown,
  spec: ArchiveFieldSpec,
  path: string,
  errors: ArchiveRejection[],
): void {
  if (value === null || value === undefined) {
    if (!spec.nullable) errors.push({ code: "field_null_not_allowed", path });
    return;
  }

  switch (spec.kind) {
    case "uuid":
    case "ref": {
      if (typeof value !== "string" || !UUID_RE.test(value)) {
        errors.push({ code: "field_not_uuid", path });
      }
      return;
    }
    case "text": {
      if (typeof value !== "string") {
        errors.push({ code: "field_not_text", path });
        return;
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        errors.push({ code: "field_too_long", path });
      }
      // The tables check trimmed length, so `"   "` is not a valid name.
      if (spec.minLength !== undefined && value.trim().length < spec.minLength) {
        errors.push({ code: "field_too_short", path });
      }
      if (spec.pattern !== undefined && !spec.pattern.test(value)) {
        errors.push({ code: "field_pattern_mismatch", path });
      }
      return;
    }
    case "money": {
      if (typeof value !== "number") {
        errors.push({ code: "field_not_money", path });
        return;
      }
      // Number.isInteger is false for NaN and Infinity, so both land here.
      if (!Number.isInteger(value)) {
        errors.push({ code: "money_not_integer", path });
        return;
      }
      if (!Number.isSafeInteger(value) || value > ARCHIVE_MONEY_MAX || value < ARCHIVE_MONEY_MIN) {
        errors.push({ code: "money_out_of_safe_range", path });
        return;
      }
      // Mirrors the owning table's CHECK, so a rejection happens here rather
      // than as a failed INSERT after the restore has begun writing.
      if (spec.min !== undefined && value < spec.min) {
        errors.push({ code: "money_out_of_allowed_range", path });
      }
      if (spec.nonZero && value === 0) {
        errors.push({ code: "money_must_not_be_zero", path });
      }
      return;
    }
    case "integer": {
      if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
        errors.push({ code: "field_not_integer", path });
        return;
      }
      if (
        (spec.min !== undefined && value < spec.min) ||
        (spec.max !== undefined && value > spec.max)
      ) {
        errors.push({ code: "field_out_of_range", path });
      }
      return;
    }
    case "unitNumber": {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
        errors.push({ code: "field_out_of_range", path });
      }
      return;
    }
    case "boolean": {
      if (typeof value !== "boolean") errors.push({ code: "field_not_boolean", path });
      return;
    }
    case "date": {
      if (typeof value !== "string" || !DATE_RE.test(value) || !isRealDate(value)) {
        errors.push({ code: "field_not_date", path });
      }
      return;
    }
    case "monthStart": {
      if (typeof value !== "string" || !DATE_RE.test(value) || !isRealDate(value)) {
        errors.push({ code: "field_not_date", path });
        return;
      }
      if (!value.endsWith("-01")) {
        errors.push({ code: "month_start_not_first_of_month", path });
      }
      return;
    }
    case "timestamp": {
      if (typeof value !== "string" || !isRealTimestamp(value)) {
        errors.push({ code: "field_not_timestamp", path });
      }
      return;
    }
    case "enum": {
      if (typeof value !== "string" || !spec.values.includes(value)) {
        errors.push({ code: "field_not_enum_value", path });
      }
      return;
    }
    case "jsonArray": {
      if (!Array.isArray(value)) errors.push({ code: "field_not_json_array", path });
      return;
    }
    case "jsonObject": {
      if (!isPlainObject(value)) errors.push({ code: "field_not_json_object", path });
      return;
    }
  }
}

function validateRow(
  row: unknown,
  collection: string,
  path: string,
  errors: ArchiveRejection[],
): void {
  if (!isPlainObject(row)) {
    errors.push({ code: "row_not_object", path });
    return;
  }
  const spec = ARCHIVE_ROW_SPECS[collection];
  if (!spec) return;

  for (const key of Object.keys(row)) {
    if (!(key in spec.fields)) {
      // The forbidden-key scan already reported owner-authority and secret
      // names with their specific codes; anything else unknown is still fatal.
      if (!isOwnerAuthorityKey(key) && !isForbiddenSecretKey(key)) {
        errors.push({ code: "row_unknown_field", path: `${path}.${key}` });
      }
    }
  }

  for (const [field, fieldSpec] of Object.entries(spec.fields)) {
    if (!(field in row)) {
      errors.push({ code: "row_missing_field", path: `${path}.${field}` });
      continue;
    }
    validateField(row[field], fieldSpec, `${path}.${field}`, errors);
  }

  validateRowShapeChecks(row, collection, path, errors);
}

/**
 * Cross-field CHECK constraints, which no single field spec can express. Without
 * these the validator would report `ok` and let a restore begin writing, only to
 * fail on an INSERT — exactly the "validate before mutation" promise it makes.
 *
 * Each rule mirrors a named constraint in the migrations.
 */
function validateRowShapeChecks(
  row: Record<string, unknown>,
  collection: string,
  path: string,
  errors: ArchiveRejection[],
): void {
  const isNull = (value: unknown) => value === null || value === undefined;

  switch (collection) {
    // `allocated_minor >= 0 and allocated_minor <= target_minor`
    case "savingsGoals": {
      const allocated = row.allocated_minor;
      const target = row.target_minor;
      if (
        typeof allocated === "number" &&
        typeof target === "number" &&
        Number.isSafeInteger(allocated) &&
        Number.isSafeInteger(target) &&
        allocated > target
      ) {
        errors.push({ code: "allocated_exceeds_target", path: `${path}.allocated_minor` });
      }
      return;
    }
    // `transaction_entries_reconciliation_shape_check`
    case "transactionEntries": {
      const state = row.reconciliation_state;
      const cleared = !isNull(row.cleared_at);
      const linked = !isNull(row.reconciliation_id);
      const valid =
        (state === "pending" && !cleared && !linked) ||
        (state === "cleared" && cleared && !linked) ||
        (state === "reconciled" && cleared && linked);
      if (!valid) {
        errors.push({ code: "entry_reconciliation_shape_invalid", path });
      }
      return;
    }
    // `account_reconciliations_status_shape_check`
    case "accountReconciliations": {
      const status = row.status;
      const completionFields = [
        row.completed_at,
        row.calculated_balance_minor,
        row.pending_account_leg_count,
        row.cleared_account_leg_count,
        row.reconciled_account_leg_count,
      ];
      const allNull = completionFields.every(isNull);
      const noneNull = completionFields.every((value) => !isNull(value));
      if ((status === "open" && !allNull) || (status === "completed" && !noneNull)) {
        errors.push({ code: "reconciliation_status_shape_invalid", path });
      }
      return;
    }
    case "inboxCandidates": {
      // `inbox_candidates_approval_link_check`
      if (
        !isNull(row.approved_transaction_id) &&
        !(row.status === "approved" && !isNull(row.approved_at))
      ) {
        errors.push({ code: "candidate_approval_shape_invalid", path });
      }
      // `inbox_candidates_applied_rule_pair_check`
      if (isNull(row.applied_rule_id) !== isNull(row.applied_rule_version)) {
        errors.push({ code: "candidate_applied_rule_pair_invalid", path });
      }
      return;
    }
    default:
      return;
  }
}

type RowIndex = Map<string, Map<string, Record<string, unknown>>>;

function buildRowIndex(
  tables: Record<string, unknown>,
  errors: ArchiveRejection[],
): RowIndex {
  const index: RowIndex = new Map();
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const spec = ARCHIVE_ROW_SPECS[collection];
    if (!spec?.idField) continue;
    const rows = tables[collection];
    if (!Array.isArray(rows)) continue;
    const byId = new Map<string, Record<string, unknown>>();
    rows.forEach((row, position) => {
      if (!isPlainObject(row)) return;
      const rawId = row[spec.idField as string];
      if (typeof rawId !== "string") return;
      const id = canonicalUuid(rawId);
      if (byId.has(id)) {
        errors.push({ code: "duplicate_row_id", path: `tables.${collection}[${position}]` });
        return;
      }
      byId.set(id, row);
    });
    index.set(collection, byId);
  }
  return index;
}

function validateReferences(
  tables: Record<string, unknown>,
  index: RowIndex,
  errors: ArchiveRejection[],
): void {
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const spec = ARCHIVE_ROW_SPECS[collection];
    if (!spec) continue;
    const rows = tables[collection];
    if (!Array.isArray(rows)) continue;

    rows.forEach((row, position) => {
      if (!isPlainObject(row)) return;
      for (const [field, fieldSpec] of Object.entries(spec.fields)) {
        if (fieldSpec.kind !== "ref") continue;
        const rawValue = row[field];
        if (rawValue === null || rawValue === undefined || typeof rawValue !== "string") continue;
        const value = canonicalUuid(rawValue);
        const target = index.get(fieldSpec.collection);
        const path = `tables.${collection}[${position}].${field}`;
        if (!target?.has(value)) {
          errors.push({ code: "reference_not_found", path });
          continue;
        }
        // A self-reference must point at a *different* row. `transfer_pair_id`
        // pairs two candidates; a candidate paired with itself is malformed.
        const ownId = spec.idField ? row[spec.idField] : undefined;
        if (
          fieldSpec.collection === collection &&
          typeof ownId === "string" &&
          canonicalUuid(ownId) === value
        ) {
          errors.push({ code: "self_reference_to_own_row", path });
        }
      }
    });
  }
}

/**
 * Financial invariants that are checkable without database state.
 *
 * Every rule here is taken from a write RPC, because those RPCs are the only
 * place the invariants live — no constraint enforces them, so a bulk restore
 * would silently lose them:
 *
 * - `create_money_transaction` writes one entry, signed
 *   `income ? +amount : -amount`, and rejects `category_kind_mismatch`;
 * - `create_split_expense` writes 2..12 entries, all on one account, each with a
 *   distinct non-archived expense category, each negative;
 * - `create_account_transfer` writes exactly two entries with NULL categories on
 *   two different same-currency accounts, summing to zero.
 *
 * Historical exception, deliberate: an entry's category may be archived. A
 * transaction recorded while the category was active stays valid after the user
 * archives it, so `is_archived` is **not** checked here even though live
 * creation rejects it.
 */
function validateTransactionShapes(
  tables: Record<string, unknown>,
  index: RowIndex,
  errors: ArchiveRejection[],
): void {
  const transactions = tables.transactions;
  const entries = tables.transactionEntries;
  if (!Array.isArray(transactions) || !Array.isArray(entries)) return;

  const categories = index.get("categories");
  const accounts = index.get("accounts");

  const entriesByTransaction = new Map<string, Record<string, unknown>[]>();
  for (const entry of entries) {
    if (!isPlainObject(entry)) continue;
    const transactionId = entry.transaction_id;
    if (typeof transactionId !== "string") continue;
    const bucket = entriesByTransaction.get(transactionId);
    if (bucket) bucket.push(entry);
    else entriesByTransaction.set(transactionId, [entry]);
  }

  transactions.forEach((transaction, position) => {
    if (!isPlainObject(transaction)) return;
    const id = transaction.id;
    const kind = transaction.kind;
    if (typeof id !== "string" || typeof kind !== "string") return;
    const path = `tables.transactions[${position}]`;
    const own = entriesByTransaction.get(id) ?? [];

    if (own.length === 0) {
      errors.push({ code: "transaction_without_entries", path });
      return;
    }

    const amounts = own.map((entry) => entry.amount_minor);
    if (amounts.some((amount) => amount === 0)) {
      errors.push({ code: "entry_amount_zero", path });
    }
    // Shape checks below assume numeric amounts; per-field validation has
    // already reported anything non-numeric.
    if (!amounts.every((amount): amount is number => typeof amount === "number")) return;

    if (kind === "income") {
      if (own.length !== INCOME_ENTRY_COUNT) {
        errors.push({ code: "income_entry_count_invalid", path });
      }
      for (const entry of own) {
        if (typeof entry.amount_minor === "number" && entry.amount_minor <= 0) {
          errors.push({ code: "income_entry_sign_invalid", path });
        }
        assertEntryCategoryKind(entry, "income", categories, path, errors);
      }
      return;
    }

    if (kind === "expense") {
      if (own.length < EXPENSE_MIN_ENTRIES || own.length > EXPENSE_MAX_ENTRIES) {
        errors.push({ code: "expense_entry_count_invalid", path });
      }
      for (const entry of own) {
        if (typeof entry.amount_minor === "number" && entry.amount_minor >= 0) {
          errors.push({ code: "expense_entry_sign_invalid", path });
        }
        assertEntryCategoryKind(entry, "expense", categories, path, errors);
      }
      if (own.length > 1) {
        // A split expense is one account with distinct categories per line.
        const accountIds = new Set(own.map((entry) => entry.account_id));
        if (accountIds.size > 1) errors.push({ code: "split_account_mismatch", path });
        const categoryIds = own.map((entry) => entry.category_id);
        if (new Set(categoryIds).size !== categoryIds.length) {
          errors.push({ code: "split_duplicate_category", path });
        }
      }
      return;
    }

    if (kind === "transfer") {
      if (own.length !== TRANSFER_ENTRY_COUNT) {
        errors.push({ code: "transfer_entry_count_invalid", path });
        return;
      }
      if (own.some((entry) => entry.category_id !== null && entry.category_id !== undefined)) {
        errors.push({ code: "transfer_entry_category_present", path });
      }
      const [first, second] = amounts as [number, number];
      if (first + second !== 0) {
        errors.push({ code: "transfer_not_balanced", path });
      }
      const negatives = amounts.filter((amount) => amount < 0).length;
      const positives = amounts.filter((amount) => amount > 0).length;
      if (negatives !== 1 || positives !== 1) {
        errors.push({ code: "transfer_sign_invalid", path });
      }
      const [sourceAccount, destinationAccount] = own.map((entry) => entry.account_id);
      if (sourceAccount === destinationAccount) {
        errors.push({ code: "transfer_same_account", path });
      } else if (
        typeof sourceAccount === "string" &&
        typeof destinationAccount === "string" &&
        accounts
      ) {
        const source = accounts.get(sourceAccount);
        const destination = accounts.get(destinationAccount);
        if (
          source &&
          destination &&
          source.currency_code !== destination.currency_code
        ) {
          errors.push({ code: "transfer_currency_mismatch", path });
        }
      }
    }
  });
}

function assertEntryCategoryKind(
  entry: Record<string, unknown>,
  expected: "income" | "expense",
  categories: Map<string, Record<string, unknown>> | undefined,
  path: string,
  errors: ArchiveRejection[],
): void {
  const categoryId = entry.category_id;
  if (categoryId === null || categoryId === undefined) {
    errors.push({ code: "entry_category_missing", path });
    return;
  }
  if (typeof categoryId !== "string" || !categories) return;
  const category = categories.get(categoryId);
  // A missing category is already reported as `reference_not_found`.
  if (!category) return;
  if (category.kind !== expected) {
    errors.push({ code: "entry_category_kind_mismatch", path });
  }
}

/**
 * Validate an untyped value as a MoneyFlow archive v1.
 *
 * Fails closed: anything not positively recognised is rejected. Nothing is
 * coerced — `"123"` does not become `123`, `"true"` does not become `true`, a
 * float never becomes an integer, and `null` never becomes a default. The input
 * is never mutated.
 */
export function validateMoneyFlowArchive(input: unknown): ArchiveValidationResult {
  const errors: ArchiveRejection[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ code: "archive_not_object", path: "" }] };
  }

  // Defence in depth first, so a nested secret is named precisely even when the
  // surrounding structure is also wrong.
  scanForbiddenKeys(input, "", errors);

  for (const key of Object.keys(input)) {
    if (!(ARCHIVE_ENVELOPE_KEYS as readonly string[]).includes(key)) {
      if (!isOwnerAuthorityKey(key) && !isForbiddenSecretKey(key)) {
        errors.push({ code: "archive_unknown_key", path: key });
      }
    }
  }
  for (const key of ARCHIVE_ENVELOPE_KEYS) {
    if (!(key in input)) errors.push({ code: "archive_missing_key", path: key });
  }

  if (input.archive_version !== ARCHIVE_VERSION) {
    errors.push({ code: "archive_version_unsupported", path: "archive_version" });
  }
  if (typeof input.archive_id !== "string" || !UUID_RE.test(input.archive_id)) {
    errors.push({ code: "archive_id_malformed", path: "archive_id" });
  }
  if (typeof input.produced_at !== "string" || !isRealTimestamp(input.produced_at)) {
    errors.push({ code: "produced_at_malformed", path: "produced_at" });
  }
  if (input.schema_generation !== ARCHIVE_SCHEMA_GENERATION) {
    errors.push({ code: "schema_generation_unsupported", path: "schema_generation" });
  }

  const tables = input.tables;
  if (!isPlainObject(tables)) {
    errors.push({ code: "tables_not_object", path: "tables" });
    return { ok: false, errors };
  }

  for (const key of Object.keys(tables)) {
    if (!ALL_ARCHIVE_COLLECTIONS.includes(key)) {
      errors.push({ code: "collection_unknown", path: `tables.${key}` });
    }
  }
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (!(collection in tables)) {
      errors.push({ code: "collection_missing", path: `tables.${collection}` });
    }
  }

  // `profile` is a single object; every other collection is an array.
  const profile = tables.profile;
  if ("profile" in tables) {
    if (!isPlainObject(profile)) {
      errors.push({ code: "profile_not_object", path: "tables.profile" });
    } else {
      validateRow(profile, "profile", "tables.profile", errors);
    }
  }

  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (collection === "profile" || !(collection in tables)) continue;
    const rows = tables[collection];
    if (!Array.isArray(rows)) {
      errors.push({ code: "collection_not_array", path: `tables.${collection}` });
      continue;
    }
    rows.forEach((row, position) =>
      validateRow(row, collection, `tables.${collection}[${position}]`, errors),
    );
  }

  const counts = input.tenant_row_counts;
  if (!isPlainObject(counts)) {
    if ("tenant_row_counts" in input) {
      errors.push({ code: "row_counts_not_object", path: "tenant_row_counts" });
    }
  } else {
    for (const [key, value] of Object.entries(counts)) {
      const path = `tenant_row_counts.${key}`;
      if (!ALL_ARCHIVE_COLLECTIONS.includes(key)) {
        errors.push({ code: "row_counts_unknown_collection", path });
        continue;
      }
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        errors.push({ code: "row_counts_malformed", path });
        continue;
      }
      const rows = tables[key];
      const actual = key === "profile" ? (isPlainObject(rows) ? 1 : 0) : Array.isArray(rows) ? rows.length : -1;
      if (actual !== value) {
        errors.push({ code: "row_counts_mismatch", path });
      }
    }
    for (const collection of ALL_ARCHIVE_COLLECTIONS) {
      if (!(collection in counts)) {
        errors.push({ code: "row_counts_malformed", path: `tenant_row_counts.${collection}` });
      }
    }
  }

  const index = buildRowIndex(tables, errors);
  validateReferences(tables, index, errors);
  validateTransactionShapes(tables, index, errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, archive: input as unknown as MoneyFlowArchive };
}
