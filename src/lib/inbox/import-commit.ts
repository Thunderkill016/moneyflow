export const IMPORT_COMMIT_INTENT_VERSION = 1;

const VOLATILE_COMMIT_ROW_FIELDS = new Set([
  "id",
  "user_id",
  "created_at",
  "local_id",
]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item === undefined) continue;
    normalized[key] = canonicalize(item);
  }
  return normalized;
}

/**
 * Build the stable financial-intent payload used only to guard batch replay.
 * Generated candidate ids, local migration ids and timestamps are deliberately
 * excluded: retrying the same user intent may regenerate those values.
 *
 * Candidate order remains significant because source row order is evidence.
 * This is not a fuzzy dedupe fingerprint and must never become ledger identity.
 */
export function serializeImportCommitIntent(
  batchId: string,
  candidateRows: Record<string, unknown>[],
): string {
  const candidates = candidateRows.map((row) => {
    const stableRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (VOLATILE_COMMIT_ROW_FIELDS.has(key)) continue;
      stableRow[key] = key === "import_batch_id" ? batchId : value;
    }
    if (!("import_batch_id" in stableRow)) stableRow.import_batch_id = batchId;
    return stableRow;
  });

  return JSON.stringify(
    canonicalize({
      version: IMPORT_COMMIT_INTENT_VERSION,
      batch_id: batchId,
      candidates,
    }),
  );
}
