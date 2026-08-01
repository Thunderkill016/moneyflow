import { readFileSync } from "node:fs";

function replaceOnce(source: string, before: string, after: string, label: string): string {
  const next = source.replace(before, after);
  if (next === source) throw new Error(`codemod_missing_${label}`);
  return next;
}

function patchReview(source: string): string {
  source = replaceOnce(
    source,
    "export type CandidateReviewDraft = {\n  kind:",
    "export type CandidateReviewDraft = {\n  candidateId: string;\n  kind:",
    "review_candidate_id_type",
  );
  source = replaceOnce(
    source,
    "  return {\n    kind: candidate.kind,",
    "  return {\n    candidateId: candidate.id,\n    kind: candidate.kind,",
    "review_candidate_id_value",
  );
  source = replaceOnce(
    source,
    "      input: {\n        sourceAccountId: source.id,",
    "      input: {\n        inboxCandidateId: draft.candidateId,\n        sourceAccountId: source.id,",
    "review_transfer_command",
  );
  source = replaceOnce(
    source,
    "    input: {\n      kind,",
    "    input: {\n      inboxCandidateId: draft.candidateId,\n      kind,",
    "review_money_command",
  );
  return source;
}

function patchTransactions(source: string): string {
  source = replaceOnce(
    source,
    'import { startTransition, useEffect, useOptimistic, useState } from "react";\n',
    'import { startTransition, useEffect, useOptimistic, useState } from "react";\nimport { approveInboxCandidateAction } from "@/app/actions/inbox-approval";\n',
    "transactions_action_import",
  );
  source = replaceOnce(
    source,
    "\n    const optimistic = buildOptimisticTransaction(input, accounts, categories);",
    `
    if (input.inboxCandidateId) {
      setIsMutating(true);
      try {
        const result = await approveInboxCandidateAction({
          candidateId: input.inboxCandidateId,
          kind: input.kind,
          accountId: input.accountId,
          categoryId: input.categoryId,
          destinationAccountId: null,
          amount: input.amount,
          occurredOn: input.occurredOn,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          allowHeuristicDuplicate: false,
        });
        if (result.ok) {
          setTransactions((current) => [
            result.transaction,
            ...current.filter((item) => item.id !== result.transaction.id),
          ]);
        }
        return result;
      } catch {
        return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
      } finally {
        setIsMutating(false);
      }
    }

    const optimistic = buildOptimisticTransaction(input, accounts, categories);`,
    "transactions_money_atomic",
  );
  source = replaceOnce(
    source,
    `    try {
      const result = await executeTransferMutation({ input, accounts, isDemo });`,
    `    try {
      if (!isDemo && input.inboxCandidateId) {
        const result = await approveInboxCandidateAction({
          candidateId: input.inboxCandidateId,
          kind: "transfer",
          accountId: input.sourceAccountId,
          categoryId: null,
          destinationAccountId: input.destinationAccountId,
          amount: input.amount,
          occurredOn: input.occurredOn,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          allowHeuristicDuplicate: false,
        });
        if (result.ok) {
          setTransactions((current) => [
            result.transaction,
            ...current.filter((item) => item.id !== result.transaction.id),
          ]);
        }
        return result;
      }

      const result = await executeTransferMutation({ input, accounts, isDemo });`,
    "transactions_transfer_atomic",
  );
  return source;
}

function patchClientInbox(source: string): string {
  source = replaceOnce(
    source,
    `  const result = await applyCandidateListMutationAction(nextList, changedIds);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, candidates: result.candidates ?? nextList };`,
    `  const result = await applyCandidateListMutationAction(nextList, changedIds);
  if (!result.ok) {
    const listed = await listInboxAction();
    if (listed.ok) {
      const desiredStatus = new Map(
        nextList
          .filter((candidate) => changedIds.includes(candidate.id))
          .map((candidate) => [candidate.id, candidate.status]),
      );
      const serverStatus = new Map(
        listed.candidates.map((candidate) => [candidate.id, candidate.status]),
      );
      const alreadyApplied = [...desiredStatus].every(
        ([id, status]) => serverStatus.get(id) === status,
      );
      if (alreadyApplied) {
        return { ok: true, candidates: listed.candidates };
      }
    }
    return { ok: false, message: result.message };
  }
  return { ok: true, candidates: result.candidates ?? nextList };`,
    "client_inbox_retry_read",
  );
  return source;
}

const outputs = {
  "src/lib/inbox/review.ts": patchReview(readFileSync("src/lib/inbox/review.ts", "utf8")),
  "src/hooks/use-transactions.ts": patchTransactions(
    readFileSync("src/hooks/use-transactions.ts", "utf8"),
  ),
  "src/hooks/client-inbox.ts": patchClientInbox(
    readFileSync("src/hooks/client-inbox.ts", "utf8"),
  ),
};

const encoded = Object.fromEntries(
  Object.entries(outputs).map(([path, content]) => [
    path,
    Buffer.from(content, "utf8").toString("base64"),
  ]),
);
console.log(`INBOX_ATOMIC_MODULES_BEGIN\n${JSON.stringify(encoded)}\nINBOX_ATOMIC_MODULES_END`);
throw new Error("inbox_atomic_modules_artifact_ready");
