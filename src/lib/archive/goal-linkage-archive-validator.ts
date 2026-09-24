import type { MoneyFlowArchive } from "./moneyflow-archive.ts";
import {
  PAYEE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithPayee,
} from "./payee-archive-validator.ts";
import type {
  ArchiveRejection,
  ArchiveValidationResult,
} from "./moneyflow-archive-validator.ts";

export const GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION = "20260924120000";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function priorShapeForCurrentArchive(input: JsonObject): unknown {
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.transactions)) {
    return {
      ...input,
      schema_generation: PAYEE_ARCHIVE_SCHEMA_GENERATION,
    };
  }

  const transactions = tables.transactions.map((row) => {
    if (!isObject(row)) return row;
    const prior = { ...row };
    delete prior.goal_id;
    return prior;
  });

  return {
    ...input,
    schema_generation: PAYEE_ARCHIVE_SCHEMA_GENERATION,
    tables: {
      ...tables,
      transactions,
    },
  };
}

function validateCurrentGoalFields(
  input: JsonObject,
): readonly ArchiveRejection[] {
  const errors: ArchiveRejection[] = [];
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.transactions)) return errors;

  const goalIds = new Set<string>();
  if (Array.isArray(tables.savingsGoals)) {
    for (const goal of tables.savingsGoals) {
      if (isObject(goal) && typeof goal.id === "string") goalIds.add(goal.id);
    }
  }

  tables.transactions.forEach((value, index) => {
    const path = `tables.transactions[${index}]`;
    if (!isObject(value)) return;

    if (!("goal_id" in value)) {
      errors.push({ code: "row_missing_field", path: `${path}.goal_id` });
      return;
    }
    const goalId = value.goal_id;
    if (goalId === null) return;
    if (typeof goalId !== "string" || !UUID_RE.test(goalId)) {
      errors.push({ code: "field_not_uuid", path: `${path}.goal_id` });
      return;
    }
    // A dangling tag would fail the composite FK on restore — reject early so
    // the archive never promises linkage it cannot keep.
    if (!goalIds.has(goalId)) {
      errors.push({ code: "reference_not_found", path: `${path}.goal_id` });
    }
  });

  return errors;
}

/**
 * Current archive validator layered over the payee contract.
 *
 * Generations 20260804160000, 20260822094500 and 20260922120000 pass through
 * unchanged. Current generation 20260924120000 must carry `goal_id` on every
 * transactions row; the wrapper strips it in a validation copy and delegates
 * every existing ownership/money/reference invariant to the proven chain.
 * Non-null tags must reference a savingsGoals row inside the same archive.
 * The original archive object is returned, never the validation copy.
 */
export function validateMoneyFlowArchiveWithGoalLinkage(
  input: unknown,
): ArchiveValidationResult {
  if (!isObject(input)) {
    return validateMoneyFlowArchiveWithPayee(input);
  }

  const generation = input.schema_generation;
  if (generation !== GOAL_LINKAGE_ARCHIVE_SCHEMA_GENERATION) {
    return validateMoneyFlowArchiveWithPayee(input);
  }

  const priorResult = validateMoneyFlowArchiveWithPayee(
    priorShapeForCurrentArchive(input),
  );
  if (!priorResult.ok) return priorResult;

  const goalErrors = validateCurrentGoalFields(input);
  if (goalErrors.length > 0) return { ok: false, errors: goalErrors };

  return { ok: true, archive: input as MoneyFlowArchive };
}
