/**
 * Client facade: demo → localStorage; authed → Supabase (+ one-shot migrate).
 * Money stays integer VND đồng throughout.
 */

import {
  createInboxCandidatesAction,
  createImportBatchAction,
  deleteImportBatchAction,
  listInboxAction,
  migrateLocalInboxAction,
  updateImportBatchStatusAction,
  updateInboxCandidateAction,
  applyCandidateListMutationAction,
} from "@/app/actions/inbox";
import {
  addStoredCandidate,
  countPending,
  createCandidate,
  readStoredCandidates,
  writeStoredCandidates,
  type InboxCandidate,
  type UpdateCandidateInput,
} from "@/lib/inbox/candidate-store";
import {
  addStoredImportBatch,
  markImportBatchCancelled,
  markImportBatchCommitted,
  readStoredImportBatches,
  removeStoredImportBatch,
  writeStoredImportBatches,
  type ImportBatch,
} from "@/lib/inbox/import-batch-store";
import { prepareCandidateForServer, prepareBatchForServer } from "@/lib/inbox/inbox-map";
import type {
  CreateCandidateWithProvenanceInput,
  CreateImportBatchWithProvenanceInput,
} from "@/lib/inbox/provenance";

export type ClientInboxResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; message: string }
  : ({ ok: true } & T) | { ok: false; message: string };

export const INBOX_MIGRATED_MARKER_KEY = "moneyflow-inbox-server-migrated-v1";

export function readMigratedMarker(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(INBOX_MIGRATED_MARKER_KEY);
  } catch {
    return null;
  }
}

export function writeMigratedMarker(userKey = "authed"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INBOX_MIGRATED_MARKER_KEY, userKey);
  } catch {
    /* ignore quota */
  }
}

/** Clear local inbox stores after successful server migrate (keep rules/prefs). */
export function clearLocalInboxAfterMigrate(): void {
  if (typeof window === "undefined") return;
  writeStoredCandidates([]);
  writeStoredImportBatches([]);
  writeMigratedMarker("authed");
}

/**
 * Load candidates for UI. When authed: migrate local once if server empty, then list.
 */
export async function loadInboxForClient(
  isDemo: boolean,
): Promise<ClientInboxResult<{ candidates: InboxCandidate[]; batches: ImportBatch[] }>> {
  if (isDemo) {
    try {
      return {
        ok: true,
        candidates: readStoredCandidates(),
        batches: readStoredImportBatches(),
      };
    } catch {
      return { ok: false, message: "Không tải được inbox trên thiết bị." };
    }
  }

  try {
    const localCandidates = readStoredCandidates();
    const localBatches = readStoredImportBatches();

    const migrateResult = await migrateLocalInboxAction({
      candidates: localCandidates,
      batches: localBatches,
    });

    if (!migrateResult.ok) {
      const listed = await listInboxAction();
      if (!listed.ok) return { ok: false, message: listed.message };
      return {
        ok: true,
        candidates: listed.candidates,
        batches: listed.batches,
      };
    }

    if (
      migrateResult.candidates.length > 0 ||
      migrateResult.batches.length > 0 ||
      readMigratedMarker()
    ) {
      const hadLocalWork =
        localCandidates.some((c) => !c.id.startsWith("cand-demo-")) ||
        localBatches.length > 0;
      if (hadLocalWork) {
        clearLocalInboxAfterMigrate();
      } else {
        writeMigratedMarker("authed");
      }
    }

    return {
      ok: true,
      candidates: migrateResult.candidates,
      batches: migrateResult.batches,
    };
  } catch {
    return { ok: false, message: "Không tải được Inbox từ máy chủ." };
  }
}

export async function addCandidatesForClient(
  isDemo: boolean,
  inputs: CreateCandidateWithProvenanceInput[],
): Promise<ClientInboxResult<{ candidates: InboxCandidate[] }>> {
  if (inputs.length === 0) {
    return { ok: true, candidates: [] };
  }

  if (isDemo) {
    try {
      const created = inputs.map((input) => addStoredCandidate(input));
      return { ok: true, candidates: created };
    } catch {
      return { ok: false, message: "Không lưu được vào Inbox trên thiết bị." };
    }
  }

  const prepared = inputs.map((input) => {
    const candidate = prepareCandidateForServer(input);
    return {
      kind: candidate.kind,
      amount: candidate.amount,
      merchant: candidate.merchant,
      note: candidate.note,
      occurredOn: candidate.occurredOn,
      source: candidate.source,
      confidence: candidate.confidence,
      status: candidate.status,
      possibleDuplicate: candidate.possibleDuplicate,
      categoryId: candidate.categoryId,
      category: candidate.category,
      accountId: candidate.accountId,
      account: candidate.account,
      rawSnippet: candidate.rawSnippet,
      importBatchId: candidate.importBatchId,
      sourceRowIndex: candidate.sourceRowIndex,
      sourceExternalId: candidate.sourceExternalId,
      parserVersion: candidate.parserVersion,
      mappingVersion: candidate.mappingVersion,
      id: candidate.id,
      createdAt: candidate.createdAt,
    } satisfies CreateCandidateWithProvenanceInput;
  });

  const result = await createInboxCandidatesAction(prepared);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, candidates: result.candidates ?? [] };
}

export async function updateCandidateForClient(
  isDemo: boolean,
  input: UpdateCandidateInput,
  currentList: InboxCandidate[],
): Promise<ClientInboxResult<{ candidates: InboxCandidate[] }>> {
  if (isDemo) {
    try {
      const next = currentList.map((item) => {
        if (item.id !== input.id) return item;
        return { ...item, ...input, id: item.id };
      });
      writeStoredCandidates(next);
      return { ok: true, candidates: next };
    } catch {
      return { ok: false, message: "Không cập nhật được trên thiết bị." };
    }
  }

  const result = await updateInboxCandidateAction(input);
  if (!result.ok) return { ok: false, message: result.message };

  const next = currentList.map((item) =>
    item.id === result.candidate?.id ? (result.candidate as InboxCandidate) : item,
  );
  return { ok: true, candidates: next };
}

function changedStatusesAlreadyApplied(
  serverCandidates: InboxCandidate[],
  nextList: InboxCandidate[],
  changedIds: string[],
): boolean {
  const changed = new Set(changedIds);
  const desiredStatus = new Map(
    nextList
      .filter((candidate) => changed.has(candidate.id))
      .map((candidate) => [candidate.id, candidate.status]),
  );
  const serverStatus = new Map(
    serverCandidates.map((candidate) => [candidate.id, candidate.status]),
  );
  return [...desiredStatus].every(
    ([id, status]) => serverStatus.get(id) === status,
  );
}

/**
 * After approve/reject/bulk helpers mutate a full list, persist changed rows.
 */
export async function persistCandidateListForClient(
  isDemo: boolean,
  nextList: InboxCandidate[],
  changedIds: string[],
): Promise<ClientInboxResult<{ candidates: InboxCandidate[] }>> {
  if (isDemo) {
    try {
      writeStoredCandidates(nextList);
      return { ok: true, candidates: nextList };
    } catch {
      return { ok: false, message: "Không lưu được Inbox trên thiết bị." };
    }
  }

  const changed = new Set(changedIds);
  const includesApproved = nextList.some(
    (candidate) => changed.has(candidate.id) && candidate.status === "approved",
  );
  if (includesApproved) {
    const listed = await listInboxAction();
    if (
      listed.ok &&
      changedStatusesAlreadyApplied(listed.candidates, nextList, changedIds)
    ) {
      return { ok: true, candidates: listed.candidates };
    }
  }

  const result = await applyCandidateListMutationAction(nextList, changedIds);
  if (!result.ok) {
    const listed = await listInboxAction();
    if (
      listed.ok &&
      changedStatusesAlreadyApplied(listed.candidates, nextList, changedIds)
    ) {
      return { ok: true, candidates: listed.candidates };
    }
    return { ok: false, message: result.message };
  }
  return { ok: true, candidates: result.candidates ?? nextList };
}

export async function addImportBatchForClient(
  isDemo: boolean,
  input: CreateImportBatchWithProvenanceInput,
): Promise<ClientInboxResult<{ batch: ImportBatch }>> {
  if (isDemo) {
    try {
      const batch = addStoredImportBatch(input);
      return { ok: true, batch };
    } catch {
      return { ok: false, message: "Không lưu được lượt import trên thiết bị." };
    }
  }

  const prepared = prepareBatchForServer(input);
  const result = await createImportBatchAction({
    ...input,
    id: prepared.id,
    createdAt: prepared.createdAt,
    parserVersion: prepared.parserVersion,
    mappingVersion: prepared.mappingVersion,
  });
  if (!result.ok) return { ok: false, message: result.message };
  if (!result.batch) return { ok: false, message: "Không nhận được lượt import." };
  return { ok: true, batch: result.batch };
}

export async function markBatchCommittedForClient(
  isDemo: boolean,
  id: string,
): Promise<ClientInboxResult<{ batch: ImportBatch | null }>> {
  if (isDemo) {
    try {
      const batch = markImportBatchCommitted(id);
      return { ok: true, batch };
    } catch {
      return { ok: false, message: "Không cập nhật được lượt import." };
    }
  }

  const result = await updateImportBatchStatusAction(id, "committed");
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, batch: result.batch ?? null };
}

export async function markBatchCancelledForClient(
  isDemo: boolean,
  id: string,
): Promise<ClientInboxResult<{ batch: ImportBatch | null }>> {
  if (isDemo) {
    try {
      const batch = markImportBatchCancelled(id);
      return { ok: true, batch };
    } catch {
      return { ok: false, message: "Không hủy được lượt import." };
    }
  }

  const result = await updateImportBatchStatusAction(id, "cancelled");
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, batch: result.batch ?? null };
}

export async function deleteImportBatchForClient(
  isDemo: boolean,
  id: string,
): Promise<ClientInboxResult> {
  if (isDemo) {
    try {
      removeStoredImportBatch(id);
      return { ok: true };
    } catch {
      return { ok: false, message: "Không xóa được meta import trên thiết bị." };
    }
  }

  const result = await deleteImportBatchAction(id);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function loadImportBatchesForClient(
  isDemo: boolean,
): Promise<ClientInboxResult<{ batches: ImportBatch[]; pendingCount: number }>> {
  if (isDemo) {
    try {
      return {
        ok: true,
        batches: readStoredImportBatches(),
        pendingCount: countPending(readStoredCandidates()),
      };
    } catch {
      return { ok: false, message: "Không đọc được lịch sử import." };
    }
  }

  const listed = await listInboxAction();
  if (!listed.ok) return { ok: false, message: listed.message };
  return {
    ok: true,
    batches: listed.batches,
    pendingCount: countPending(listed.candidates),
  };
}

export async function getPendingCountForClient(isDemo: boolean): Promise<number> {
  if (isDemo) {
    try {
      return countPending(readStoredCandidates());
    } catch {
      return 0;
    }
  }
  const listed = await listInboxAction();
  if (!listed.ok) return 0;
  return countPending(listed.candidates);
}

export { createCandidate };
