import type { MoneyFlowArchive } from "./moneyflow-archive.ts";
import {
  GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithGoalLinkage,
} from "./goal-linkage-archive-validator.ts";
import type {
  ArchiveRejection,
  ArchiveValidationResult,
} from "./moneyflow-archive-validator.ts";

export const COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION = "20261016090000";
export const COMMITMENT_INTERVAL_MIN = 1;
export const COMMITMENT_INTERVAL_MAX = 24;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function priorShapeForCurrentArchive(input: JsonObject): unknown {
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.recurringCommitments)) {
    return {
      ...input,
      schema_generation: GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
    };
  }

  const recurringCommitments = tables.recurringCommitments.map((row) => {
    if (!isObject(row)) return row;
    const prior = { ...row };
    delete prior.interval_months;
    return prior;
  });

  return {
    ...input,
    schema_generation: GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION,
    tables: {
      ...tables,
      recurringCommitments,
    },
  };
}

function validateCurrentIntervalFields(
  input: JsonObject,
): readonly ArchiveRejection[] {
  const errors: ArchiveRejection[] = [];
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.recurringCommitments)) {
    return errors;
  }

  tables.recurringCommitments.forEach((value, index) => {
    const path = `tables.recurringCommitments[${index}]`;
    if (!isObject(value)) return;

    if (!("interval_months" in value)) {
      errors.push({
        code: "row_missing_field",
        path: `${path}.interval_months`,
      });
      return;
    }
    const interval = value.interval_months;
    if (typeof interval !== "number" || !Number.isInteger(interval)) {
      errors.push({
        code: "field_not_integer",
        path: `${path}.interval_months`,
      });
      return;
    }
    // Same bound as the column CHECK and the upsert RPC — a malformed cadence
    // fails closed instead of restoring an invented cycle.
    if (
      interval < COMMITMENT_INTERVAL_MIN ||
      interval > COMMITMENT_INTERVAL_MAX
    ) {
      errors.push({
        code: "field_out_of_range",
        path: `${path}.interval_months`,
      });
    }
  });

  return errors;
}

/**
 * Current archive validator layered over the goal-linkage contract.
 *
 * Generations 20260804160000, 20260822094500, 20260922120000 and 20260924120000
 * pass through unchanged — archives produced before commitments had a cadence
 * restore as monthly, which invents no new meaning. Current generation
 * 20261016090000 must carry `interval_months` on every recurringCommitments
 * row; the wrapper strips it in a validation copy and delegates every
 * existing ownership/money/reference invariant to the proven chain. The
 * original archive object is returned, never the validation copy.
 */
export function validateMoneyFlowArchiveWithCommitmentInterval(
  input: unknown,
): ArchiveValidationResult {
  if (!isObject(input)) {
    return validateMoneyFlowArchiveWithGoalLinkage(input);
  }

  const generation = input.schema_generation;
  if (generation !== COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION) {
    return validateMoneyFlowArchiveWithGoalLinkage(input);
  }

  const priorResult = validateMoneyFlowArchiveWithGoalLinkage(
    priorShapeForCurrentArchive(input),
  );
  if (!priorResult.ok) return priorResult;

  const intervalErrors = validateCurrentIntervalFields(input);
  if (intervalErrors.length > 0) return { ok: false, errors: intervalErrors };

  return { ok: true, archive: input as MoneyFlowArchive };
}
