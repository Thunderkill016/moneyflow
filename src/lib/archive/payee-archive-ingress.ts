import {
  ingestArchiveBytes as ingestSourceLineageArchiveBytes,
  ingestArchiveText as ingestSourceLineageArchiveText,
} from "./source-lineage-archive-ingress.ts";
import {
  redactValidatorPath,
  type ArchiveIngressResult,
} from "./archive-ingress.ts";
import {
  PAYEE_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithPayee,
} from "./payee-archive-validator.ts";

function isCurrentGeneration(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).schema_generation ===
      PAYEE_ARCHIVE_SCHEMA_GENERATION
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
  const validated = validateMoneyFlowArchiveWithPayee(parsed);
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
 * Preserve the proven byte/UTF-8/duplicate-key/depth scanner and the
 * source-lineage generation-aware validator unchanged. Only when those reach
 * their domain validator and reject a structurally sound JSON value do we try
 * the 20260922120000 (payee) validator. Historical archives keep the exact old
 * path and error behavior.
 */
export function ingestArchiveBytes(bytes: Uint8Array): ArchiveIngressResult {
  const legacy = ingestSourceLineageArchiveBytes(bytes);
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
  const legacy = ingestSourceLineageArchiveText(text, knownBytes);
  if (legacy.ok || legacy.code !== "archive_invalid") return legacy;

  const measured = new TextEncoder().encode(text).byteLength;
  return validateCurrentAfterLegacyScan(text, Math.max(measured, knownBytes ?? 0)) ?? legacy;
}
