/**
 * Due commitments → virtual inbox candidates (Stage-1 bounded experiment).
 *
 * Suggestions are DERIVED, never persisted: approving one routes through the
 * existing pay_recurring_commitment RPC / demo occurrence path, so only the
 * commitment's declared values can post. The only reviewer-editable field is
 * the paid-on date; anything else belongs to /commitments edits.
 */

import type { InboxCandidate } from "../inbox/candidate-store.ts";
import type { CandidateReviewDraft } from "../inbox/review.ts";
import { draftFromCandidate } from "../inbox/review.ts";
import type { AccountOption, CategoryOption } from "../transactions/contracts.ts";
import type { RecurringCommitment } from "./commitments.ts";

const SUGGESTION_PREFIX = "commitment:";

export function commitmentSuggestionId(
  commitmentId: string,
  monthStart: string,
): string {
  return `${SUGGESTION_PREFIX}${commitmentId}:${monthStart}`;
}

export function parseCommitmentSuggestionId(
  id: string,
): { commitmentId: string; monthStart: string } | null {
  if (!id.startsWith(SUGGESTION_PREFIX)) return null;
  const rest = id.slice(SUGGESTION_PREFIX.length);
  const sep = rest.lastIndexOf(":");
  if (sep <= 0) return null;
  const commitmentId = rest.slice(0, sep);
  const monthStart = rest.slice(sep + 1);
  if (!commitmentId || !/^\d{4}-\d{2}-01$/.test(monthStart)) return null;
  return { commitmentId, monthStart };
}

/**
 * Pending virtual candidates for active commitments whose due date has
 * arrived or passed. Deterministic order: due date, then suggestion id.
 */
export function buildCommitmentSuggestions(
  commitments: RecurringCommitment[],
  monthStart: string,
  today: string,
): InboxCandidate[] {
  return commitments
    .filter(
      (item) => !item.isArchived && !item.isPaid && item.dueDate <= today,
    )
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: commitmentSuggestionId(item.id, monthStart),
      kind: "expense" as const,
      amount: item.amount,
      merchant: item.name,
      note: `Khoản định kỳ · đến hạn ${item.dueDate}`,
      occurredOn: today,
      source: "commitment" as const,
      confidence: "high" as const,
      status: "pending" as const,
      accountId: item.accountId,
      account: item.accountName,
      categoryId: item.categoryId,
      category: item.categoryName,
      createdAt: `${monthStart}T00:00:00.000Z`,
    }));
}

/**
 * Commitment suggestions post the commitment's declared values; the review
 * dialog may only adjust the paid-on date. Returns true when any other field
 * was edited — the caller must refuse instead of silently posting different
 * values than the reviewer saw.
 */
export function commitmentSuggestionEditBlocked(
  candidate: InboxCandidate,
  draft: CandidateReviewDraft,
  accounts: AccountOption[],
  categories: CategoryOption[],
): boolean {
  const initial = draftFromCandidate(candidate, accounts, categories);
  return (
    draft.kind !== initial.kind ||
    draft.amount !== initial.amount ||
    draft.merchant !== initial.merchant ||
    draft.note !== initial.note ||
    draft.categoryId !== initial.categoryId ||
    draft.accountId !== initial.accountId ||
    draft.destinationAccountId !== initial.destinationAccountId
  );
}
