import {
  ingestArchiveBytes as ingestGoalLinkageArchiveBytes,
  ingestArchiveText as ingestGoalLinkageArchiveText,
} from "./goal-linkage-archive-ingress.ts";
import {
  redactValidatorPath,
  type ArchiveIngressResult,
} from "./archive-ingress.ts";
import {
  COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION,
  validateMoneyFlowArchiveWithCommitmentInterval,
} from "./interval-commitment-archive-validator.ts";

function isCurrentGeneration(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).schema_generation ===
      COMMITMENT_INTERVAL_ARCHIVE_SCHEMA_GENERATION
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
  const validated = validateMoneyFlowArchiveWithCommitmentInterval(parsed);
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
 * goal-linkage generation-aware validator chain unchanged. Only when those
 * reach their domain validator and reject a structurally sound JSON value do
 * we try the 20261016090000 (commitment cadence) validator. Historical
 * archives keep the exact old path and error behavior.
 */
export function ingestArchiveBytes(bytes: Uint8Array): ArchiveIngressResult {
  const legacy = ingestGoalLinkageArchiveBytes(bytes);
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
  const legacy = ingestGoalLinkageArchiveText(text, knownBytes);
  if (legacy.ok || legacy.code !== "archive_invalid") return legacy;

  const measured = new TextEncoder().encode(text).byteLength;
  return (
    validateCurrentAfterLegacyScan(text, Math.max(measured, knownBytes ?? 0)) ??
    legacy
  );
}
