import { commitImportBatchCandidatesAction } from "@/app/actions/import-commit";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import type { CreateCandidateWithProvenanceInput } from "@/lib/inbox/provenance";
import {
  addCandidatesForClient as addCandidatesForClientCore,
  loadImportBatchesForClient as loadImportBatchesForClientCore,
  markBatchCommittedForClient as markBatchCommittedForClientCore,
  type ClientInboxResult,
} from "./client-inbox-core";

export * from "./client-inbox-core";

function singleBatchId(inputs: CreateCandidateWithProvenanceInput[]): string | null {
  if (inputs.length === 0) return null;
  const first = inputs[0]?.importBatchId;
  if (!first) return null;
  return inputs.every((input) => input.importBatchId === first) ? first : null;
}

/**
 * Authenticated candidates that belong to one import batch commit atomically with
 * that batch. Non-batch capture paths and demo mode keep the established behavior.
 */
export async function addCandidatesForClient(
  isDemo: boolean,
  inputs: CreateCandidateWithProvenanceInput[],
): Promise<ClientInboxResult<{ candidates: InboxCandidate[] }>> {
  const batchId = isDemo ? null : singleBatchId(inputs);
  if (!batchId) return addCandidatesForClientCore(isDemo, inputs);

  const result = await commitImportBatchCandidatesAction(batchId, inputs);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, candidates: result.candidates };
}

/** Preserve the durable first commit timestamp after the atomic RPC succeeds. */
export async function markBatchCommittedForClient(
  isDemo: boolean,
  id: string,
) {
  if (!isDemo) {
    const listed = await loadImportBatchesForClientCore(false);
    if (listed.ok) {
      const existing = listed.batches.find((batch) => batch.id === id);
      if (existing?.status === "committed") {
        return { ok: true as const, batch: existing };
      }
    }
  }
  return markBatchCommittedForClientCore(isDemo, id);
}
