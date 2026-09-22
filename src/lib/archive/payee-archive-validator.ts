import type { MoneyFlowArchive } from "./moneyflow-archive.ts";
import {
  validateMoneyFlowArchiveWithSourceLineage,
  SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
} from "./source-lineage-archive-validator.ts";
import type {
  ArchiveRejection,
  ArchiveValidationResult,
} from "./moneyflow-archive-validator.ts";

export const PAYEE_ARCHIVE_SCHEMA_GENERATION = "20260922120000";
export const PAYEE_MAX_LENGTH = 200;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function priorShapeForCurrentArchive(input: JsonObject): unknown {
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.transactions)) {
    return {
      ...input,
      schema_generation: SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    };
  }

  const transactions = tables.transactions.map((row) => {
    if (!isObject(row)) return row;
    const prior = { ...row };
    delete prior.payee;
    return prior;
  });

  return {
    ...input,
    schema_generation: SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
    tables: {
      ...tables,
      transactions,
    },
  };
}

function validateCurrentPayeeFields(
  input: JsonObject,
): readonly ArchiveRejection[] {
  const errors: ArchiveRejection[] = [];
  const tables = input.tables;
  if (!isObject(tables) || !Array.isArray(tables.transactions)) return errors;

  tables.transactions.forEach((value, index) => {
    const path = `tables.transactions[${index}]`;
    if (!isObject(value)) return;

    if (!("payee" in value)) {
      errors.push({ code: "row_missing_field", path: `${path}.payee` });
      return;
    }
    const payee = value.payee;
    if (typeof payee !== "string") {
      errors.push({ code: "field_not_text", path: `${path}.payee` });
    } else if (payee.length > PAYEE_MAX_LENGTH) {
      errors.push({ code: "field_too_long", path: `${path}.payee` });
    }
  });

  return errors;
}

/**
 * Current archive validator layered over the source-lineage contract.
 *
 * Generations 20260804160000 and 20260822094500 pass through unchanged. Current
 * generation 20260922120000 must carry `payee` on every transactions row; the
 * wrapper strips it in a validation copy and delegates every existing
 * ownership/money/reference invariant to the proven chain. The original archive
 * object is returned, never the normalized validation copy.
 */
export function validateMoneyFlowArchiveWithPayee(
  input: unknown,
): ArchiveValidationResult {
  if (!isObject(input)) {
    return validateMoneyFlowArchiveWithSourceLineage(input);
  }

  const generation = input.schema_generation;
  if (generation !== PAYEE_ARCHIVE_SCHEMA_GENERATION) {
    return validateMoneyFlowArchiveWithSourceLineage(input);
  }

  const priorResult = validateMoneyFlowArchiveWithSourceLineage(
    priorShapeForCurrentArchive(input),
  );
  if (!priorResult.ok) return priorResult;

  const payeeErrors = validateCurrentPayeeFields(input);
  if (payeeErrors.length > 0) return { ok: false, errors: payeeErrors };

  return { ok: true, archive: input as MoneyFlowArchive };
}
