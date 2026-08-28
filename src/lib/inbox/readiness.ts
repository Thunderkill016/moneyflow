import type { AccountOption, CategoryOption } from "../sample-data.ts";
import type { InboxCandidate } from "./candidate-store.ts";
import { buildLedgerPost, type CandidateReviewDraft } from "./review.ts";

export type CandidateAttentionReason =
  | "low_confidence"
  | "possible_duplicate"
  | "possible_transfer"
  | "transfer_kind"
  | "invalid_amount"
  | "invalid_date"
  | "account_missing_or_unresolved"
  | "category_missing_or_unresolved"
  | "category_kind_mismatch"
  | "invalid_posting_draft";

export type CandidateReadiness =
  | { state: "ready"; reasons: [] }
  | { state: "needs_attention"; reasons: CandidateAttentionReason[] };

export type PendingCandidatePartition = {
  ready: InboxCandidate[];
  needsAttention: Array<{
    candidate: InboxCandidate;
    reasons: CandidateAttentionReason[];
  }>;
};

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function resolveExplicitAccount(
  candidate: InboxCandidate,
  accounts: AccountOption[],
): AccountOption | null {
  if (candidate.accountId) {
    return accounts.find((item) => item.id === candidate.accountId) ?? null;
  }
  if (!candidate.account?.trim()) return null;
  const wanted = normalizeLabel(candidate.account);
  return accounts.find((item) => normalizeLabel(item.name) === wanted) ?? null;
}

function resolveExplicitCategory(
  candidate: InboxCandidate,
  categories: CategoryOption[],
): CategoryOption | null {
  if (candidate.categoryId) {
    return categories.find((item) => item.id === candidate.categoryId) ?? null;
  }
  if (!candidate.category?.trim()) return null;
  const wanted = normalizeLabel(candidate.category);
  return categories.find((item) => normalizeLabel(item.name) === wanted) ?? null;
}

export function classifyCandidateReadiness(
  candidate: InboxCandidate,
  accounts: AccountOption[],
  categories: CategoryOption[],
): CandidateReadiness {
  if (candidate.status !== "pending") {
    return { state: "needs_attention", reasons: [] };
  }

  const reasons: CandidateAttentionReason[] = [];

  if (candidate.confidence === "low") reasons.push("low_confidence");
  if (candidate.possibleDuplicate === true) reasons.push("possible_duplicate");
  if (candidate.possibleTransfer === true) reasons.push("possible_transfer");
  if (candidate.kind === "transfer") reasons.push("transfer_kind");
  if (!Number.isSafeInteger(candidate.amount) || candidate.amount <= 0) {
    reasons.push("invalid_amount");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.occurredOn)) {
    reasons.push("invalid_date");
  }

  if (candidate.kind !== "transfer") {
    const account = resolveExplicitAccount(candidate, accounts);
    const category = resolveExplicitCategory(candidate, categories);

    if (!account) reasons.push("account_missing_or_unresolved");
    if (!category) {
      reasons.push("category_missing_or_unresolved");
    } else if (category.kind !== candidate.kind) {
      reasons.push("category_kind_mismatch");
    }

    if (reasons.length === 0 && account && category) {
      const draft: CandidateReviewDraft = {
        candidateId: candidate.id,
        kind: candidate.kind,
        amount: candidate.amount,
        merchant: candidate.merchant,
        note: candidate.note,
        occurredOn: candidate.occurredOn,
        categoryId: category.id,
        accountId: account.id,
        destinationAccountId: "",
        possibleDuplicate: false,
        allowHeuristicDuplicate: false,
      };
      const post = buildLedgerPost(
        draft,
        accounts,
        categories,
        `readiness:${candidate.id}`,
      );
      if (!post.ok) reasons.push("invalid_posting_draft");
    }
  }

  if (reasons.length > 0) return { state: "needs_attention", reasons };
  return { state: "ready", reasons: [] };
}

export function partitionPendingCandidates(
  candidates: InboxCandidate[],
  accounts: AccountOption[],
  categories: CategoryOption[],
): PendingCandidatePartition {
  const ready: InboxCandidate[] = [];
  const needsAttention: PendingCandidatePartition["needsAttention"] = [];

  for (const candidate of candidates) {
    if (candidate.status !== "pending") continue;
    const readiness = classifyCandidateReadiness(candidate, accounts, categories);
    if (readiness.state === "ready") {
      ready.push(candidate);
    } else {
      needsAttention.push({ candidate, reasons: readiness.reasons });
    }
  }

  return { ready, needsAttention };
}

export function attentionReasonLabel(reason: CandidateAttentionReason): string {
  switch (reason) {
    case "low_confidence":
      return "Độ tin thấp";
    case "possible_duplicate":
      return "Có thể trùng";
    case "possible_transfer":
      return "Có thể là chuyển khoản";
    case "transfer_kind":
      return "Chuyển khoản cần duyệt riêng";
    case "invalid_amount":
      return "Số tiền chưa hợp lệ";
    case "invalid_date":
      return "Ngày chưa hợp lệ";
    case "account_missing_or_unresolved":
      return "Tài khoản chưa xác định";
    case "category_missing_or_unresolved":
      return "Danh mục chưa xác định";
    case "category_kind_mismatch":
      return "Danh mục không khớp thu/chi";
    case "invalid_posting_draft":
      return "Chưa đạt điều kiện ghi sổ";
  }
}
