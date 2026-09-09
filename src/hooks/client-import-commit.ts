import { commitImportBatchCandidatesAction } from "@/app/actions/import-commit";
import {
  addCandidatesForClient,
  markBatchCommittedForClient,
} from "@/hooks/client-inbox";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import type { ImportBatch } from "@/lib/inbox/import-batch-store";
import type { CreateCandidateWithProvenanceInput } from "@/lib/inbox/provenance";

export type ClientImportCommitResult =
  | {
      ok: true;
      candidates: InboxCandidate[];
      batch: ImportBatch | null;
      replayed: boolean;
    }
  | { ok: false; message: string; retrySafe: boolean };

/**
 * Demo remains device-local. Authenticated generic preview commits through one
 * database transaction and can safely retry the same unchanged batch intent.
 */
export async function commitImportBatchForClient(
  isDemo: boolean,
  batchId: string,
  inputs: CreateCandidateWithProvenanceInput[],
): Promise<ClientImportCommitResult> {
  if (isDemo) {
    const addResult = await addCandidatesForClient(true, inputs);
    if (!addResult.ok) {
      return { ok: false, message: addResult.message, retrySafe: false };
    }
    const markResult = await markBatchCommittedForClient(true, batchId);
    if (!markResult.ok) {
      return { ok: false, message: markResult.message, retrySafe: false };
    }
    return {
      ok: true,
      candidates: addResult.candidates,
      batch: markResult.batch,
      replayed: false,
    };
  }

  return commitImportBatchCandidatesAction(batchId, inputs);
}
