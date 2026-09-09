import { commitImportBatchCandidatesAction } from "@/app/actions/import-commit";
import type { CreateCandidateWithProvenanceInput } from "@/lib/inbox/provenance";
import {
  addCandidatesForClient as addCandidatesForClientLegacy,
  loadImportBatchesForClient as loadImportBatchesForClientLegacy,
  markBatchCommittedForClient as markBatchCommittedForClientLegacy,
} from "./client-inbox-legacy";

export * from "./client-inbox-legacy";

/**
 * Preserve the existing client facade, but make authenticated batch-bound
 * candidate creation one replay-safe database operation. Non-batch capture paths
 * keep their previous behavior.
 */
export async function addCandidatesForClient(
  isDemo: boolean,
  inputs: CreateCandidateWithProvenanceInput[],
) {
  if (isDemo || inputs.length === 0) {
    return addCandidatesForClientLegacy(isDemo, inputs);
  }

  const batchIds = new Set(
    inputs.map((input) => input.importBatchId).filter((id): id is string => Boolean(id)),
  );
  const batchId = batchIds.size === 1 ? [...batchIds][0] : undefined;
  const allBoundToBatch =
    batchId !== undefined && inputs.every((input) => input.importBatchId === batchId);

  if (!allBoundToBatch || !batchId) {
    return addCandidatesForClientLegacy(false, inputs);
  }

  const result = await commitImportBatchCandidatesAction(batchId, inputs);
  if (!result.ok) return { ok: false as const, message: result.message };
  return { ok: true as const, candidates: result.candidates };
}

/**
 * The atomic commit already marks authenticated batches committed. Keep this
 * legacy call site compatible without rewriting committed_at after a replay.
 */
export async function markBatchCommittedForClient(isDemo: boolean, id: string) {
  if (isDemo) return markBatchCommittedForClientLegacy(true, id);

  const listed = await loadImportBatchesForClientLegacy(false);
  if (listed.ok) {
    const batch = listed.batches.find((item) => item.id === id) ?? null;
    if (batch?.status === "committed") {
      return { ok: true as const, batch };
    }
  }

  return markBatchCommittedForClientLegacy(false, id);
}
