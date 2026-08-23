import type { MoneyFlowArchive } from "./moneyflow-archive.ts";
import {
  validateMoneyFlowArchive as validateLegacyMoneyFlowArchive,
  type ArchiveRejection,
  type ArchiveValidationResult,
} from "./moneyflow-archive-validator.ts";

export const LEGACY_ARCHIVE_SCHEMA_GENERATION = "20260804160000";
export const SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION = "20260822094500";

const SOURCE_LIFECYCLE_STATES = new Set(["pending", "posted", "removed"]);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function legacyShapeForCurrentArchive(input: JsonObject): unknown {
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.inboxCandidates)) {
    return {
      ...input,
      schema_generation: LEGACY_ARCHIVE_SCHEMA_GENERATION,
    };
  }

  const inboxCandidates = tables.inboxCandidates.map((row) => {
    if (!isObject(row)) return row;
    const {
      source_lifecycle_state: _sourceLifecycleState,
      source_predecessor_external_id: _sourcePredecessorExternalId,
      ...legacy
    } = row;
    return legacy;
  });

  return {
    ...input,
    schema_generation: LEGACY_ARCHIVE_SCHEMA_GENERATION,
    tables: {
      ...tables,
      inboxCandidates,
    },
  };
}

function validateCurrentSourceFields(input: JsonObject): readonly ArchiveRejection[] {
  const errors: ArchiveRejection[] = [];
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.inboxCandidates)) return errors;

  const identityBySourceId = new Map<string, string>();

  tables.inboxCandidates.forEach((value, index) => {
    const path = `tables.inboxCandidates[${index}]`;
    if (!isObject(value)) return;

    for (const field of [
      "source_lifecycle_state",
      "source_predecessor_external_id",
    ] as const) {
      if (!(field in value)) {
        errors.push({ code: "row_missing_field", path: `${path}.${field}` });
      }
    }

    const lifecycle = value.source_lifecycle_state;
    if (
      lifecycle !== null &&
      (typeof lifecycle !== "string" || !SOURCE_LIFECYCLE_STATES.has(lifecycle))
    ) {
      errors.push({ code: "field_not_enum_value", path: `${path}.source_lifecycle_state` });
    }

    const predecessor = value.source_predecessor_external_id;
    if (predecessor !== null) {
      if (typeof predecessor !== "string") {
        errors.push({
          code: "field_not_text",
          path: `${path}.source_predecessor_external_id`,
        });
      } else if (predecessor.length < 1 || predecessor.length > 200) {
        errors.push({
          code: predecessor.length < 1 ? "field_too_short" : "field_too_long",
          path: `${path}.source_predecessor_external_id`,
        });
      }
    }

    if (
      value.source === "manual" &&
      (lifecycle !== null || predecessor !== null)
    ) {
      errors.push({
        code: "field_pattern_mismatch",
        path: `${path}.source_predecessor_external_id`,
      });
    }

    if (typeof predecessor === "string") {
      if (
        typeof value.source_external_id !== "string" ||
        value.source_external_id.length === 0 ||
        predecessor === value.source_external_id
      ) {
        errors.push({
          code: "field_pattern_mismatch",
          path: `${path}.source_predecessor_external_id`,
        });
      }
    }

    if (
      value.status === "approved" &&
      typeof value.source === "string" &&
      typeof value.source_external_id === "string" &&
      typeof value.approved_transaction_id === "string"
    ) {
      const key = `${value.source}\u0000${value.source_external_id}`;
      const prior = identityBySourceId.get(key);
      if (prior !== undefined && prior !== value.approved_transaction_id) {
        errors.push({ code: "candidate_approval_shape_invalid", path });
      } else {
        identityBySourceId.set(key, value.approved_transaction_id);
      }
    }
  });

  const provenance = tables.transactionImportProvenance;
  if (Array.isArray(provenance)) {
    provenance.forEach((value, index) => {
      if (!isObject(value)) return;
      if (
        typeof value.source !== "string" ||
        typeof value.source_external_id !== "string" ||
        typeof value.transaction_id !== "string"
      ) {
        return;
      }
      const key = `${value.source}\u0000${value.source_external_id}`;
      const prior = identityBySourceId.get(key);
      if (prior !== undefined && prior !== value.transaction_id) {
        errors.push({
          code: "candidate_approval_shape_invalid",
          path: `tables.transactionImportProvenance[${index}]`,
        });
      } else {
        identityBySourceId.set(key, value.transaction_id);
      }
    });
  }

  return errors;
}

/**
 * Current archive validator layered over the proven archive-v1 contract.
 *
 * Historical generation 20260804160000 is passed through unchanged. Current
 * generation 20260822094500 must carry both #442 fields on every Inbox row; the
 * wrapper validates them, strips only those two fields in a validation copy, and
 * delegates every existing ownership/money/reference invariant to R5. The
 * original archive object is returned, never the normalized validation copy.
 */
export function validateMoneyFlowArchiveWithSourceLineage(
  input: unknown,
): ArchiveValidationResult {
  if (!isObject(input)) return validateLegacyMoneyFlowArchive(input);

  const generation = input.schema_generation;
  if (generation === LEGACY_ARCHIVE_SCHEMA_GENERATION) {
    return validateLegacyMoneyFlowArchive(input);
  }
  if (generation !== SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION) {
    return validateLegacyMoneyFlowArchive(input);
  }

  const legacyResult = validateLegacyMoneyFlowArchive(
    legacyShapeForCurrentArchive(input),
  );
  if (!legacyResult.ok) return legacyResult;

  const sourceErrors = validateCurrentSourceFields(input);
  if (sourceErrors.length > 0) return { ok: false, errors: sourceErrors };

  return { ok: true, archive: input as MoneyFlowArchive };
}
