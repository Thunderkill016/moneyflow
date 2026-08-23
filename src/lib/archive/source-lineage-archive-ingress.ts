import {
  ingestArchiveBytes as ingestLegacyArchiveBytes,
  ingestArchiveText as ingestLegacyArchiveText,
  redactValidatorPath,
  type ArchiveIngressResult,
} from "./archive-ingress.ts";
import {
  SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithSourceLineage,
} from "./source-lineage-archive-validator.ts";

function isCurrentGeneration(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).schema_generation ===
      SOURCE_LINEAGE_ARCHIVE_SCHEMA_GENERATION
  );
}

function validateCurrentAfterLegacyScan(
  text: string,
  bytes: number,
): ArchiveIngressResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // The legacy ingress already parsed this exact text before returning
    // archive_invalid, so this is defensive only.
    return { ok: false, code: "invalid_json_syntax" };
  }

  if (!isCurrentGeneration(parsed)) return null;
  const validated = validateMoneyFlowArchiveWithSourceLineage(parsed);
  if (!validated.ok) {
    return {
      ok: false,
      code: "archive_invalid",
      errors: validated.errors.map((rejection) => ({
        code: rejection.code,
        path: redactValidatorPath(rejection.path),
      })),
    };
  }

  return { ok: true, archive: validated.archive, bytes };
}

/**
 * Preserve R8's byte/UTF-8/duplicate-key/depth scanner unchanged. Only when that
 * proven ingress reaches its domain validator and rejects a structurally sound
 * JSON value do we try the #442 generation-aware validator. Historical archives
 * therefore keep the exact old path and error behavior.
 */
export function ingestArchiveBytes(bytes: Uint8Array): ArchiveIngressResult {
  const legacy = ingestLegacyArchiveBytes(bytes);
  if (legacy.ok || legacy.code !== "archive_invalid") return legacy;

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return legacy;
  }

  return validateCurrentAfterLegacyScan(text, bytes.byteLength) ?? legacy;
}

export function ingestArchiveText(
  text: string,
  knownBytes?: number,
): ArchiveIngressResult {
  const legacy = ingestLegacyArchiveText(text, knownBytes);
  if (legacy.ok || legacy.code !== "archive_invalid") return legacy;

  const measured = new TextEncoder().encode(text).byteLength;
  return validateCurrentAfterLegacyScan(text, Math.max(measured, knownBytes ?? 0)) ?? legacy;
}
