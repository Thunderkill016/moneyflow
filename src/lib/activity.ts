import type { InboxCandidate } from "./inbox/candidate-store.ts";
import { SOURCE_LABELS } from "./inbox/candidate-store.ts";
import type { CandidateProvenance } from "./inbox/provenance.ts";
import {
  attentionReasonLabel,
  classifyCandidateReadiness,
  type CandidateAttentionReason,
} from "./inbox/readiness.ts";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "./transactions/contracts.ts";

export type ActivityFilter = "all" | "attention" | "incoming" | "posted";

export type ActivityLedgerItem = {
  type: "ledger_transaction";
  key: string;
  occurredOn: string;
  observedAt: string;
  attention: boolean;
  stateLabel: "Cần xem lại" | "Đã vào sổ";
  primaryLabel: string;
  secondaryLabel: string;
  amount: number;
  amountKind: Transaction["kind"];
  searchText: string;
  href: string;
  actionLabel: string;
  transaction: Transaction;
};

export type ActivityCandidateItem = {
  type: "inbox_candidate";
  key: string;
  occurredOn: string;
  observedAt: string;
  attention: boolean;
  readinessKnown: boolean;
  stateLabel: "Cần xử lý" | "Chờ vào sổ";
  primaryLabel: string;
  secondaryLabel: string;
  sourceLabel: string;
  provenanceLabel: string | null;
  attentionLabels: string[];
  amount: number;
  amountKind: InboxCandidate["kind"];
  searchText: string;
  href: string;
  actionLabel: "Xử lý" | "Mở Cần xem";
  candidate: InboxCandidate & Partial<CandidateProvenance>;
};

export type ActivityItem = ActivityLedgerItem | ActivityCandidateItem;

export type ActivityBuildInput = {
  transactions: Transaction[];
  candidates: Array<InboxCandidate & Partial<CandidateProvenance>>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  /**
   * False when the posted-ledger read is not authoritative. Some upstream
   * loaders intentionally return safe fallback values alongside dataError;
   * Activity must never promote those fallback rows into financial facts.
   */
  ledgerAvailable?: boolean;
  /**
   * False when the finance read failed. Candidate rows can still be shown as
   * pending evidence, but Activity must not infer readiness from missing account,
   * category or ledger context and turn an outage into fake maintenance work.
   */
  candidateReadinessAvailable?: boolean;
};

function normalizeSearchPart(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("vi-VN") ?? "";
}

function searchable(...values: Array<string | null | undefined>): string {
  return values.map(normalizeSearchPart).filter(Boolean).join(" ");
}

function candidateSourceLabel(candidate: InboxCandidate): string {
  const source = SOURCE_LABELS[candidate.source];
  if (source === "csv" || source === "xlsx" || source === "pdf") {
    return source.toUpperCase();
  }
  return source.charAt(0).toLocaleUpperCase("vi-VN") + source.slice(1);
}

function provenanceLabel(
  candidate: InboxCandidate & Partial<CandidateProvenance>,
): string | null {
  switch (candidate.sourceLifecycleState) {
    case "pending":
      return "Bằng chứng nguồn đang chờ";
    case "posted":
      return "Bằng chứng nguồn đã được ghi nhận";
    case "removed":
      return "Nguồn báo mục này đã được gỡ";
    default:
      break;
  }

  switch (candidate.matchStatus) {
    case "duplicate":
      return "Có bằng chứng trùng cần đối chiếu";
    case "suspected_transfer":
      return "Có dấu hiệu chuyển khoản nội bộ";
    case "invalid":
      return "Bằng chứng nguồn chưa hợp lệ";
    case "would_create":
      return "Bằng chứng nguồn có thể tạo giao dịch";
    default:
      return null;
  }
}

function candidateSecondaryLabel(candidate: InboxCandidate): string {
  const parts = [candidate.category, candidate.account].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  return parts.length > 0 ? parts.join(" · ") : "Chưa đủ thông tin ghi sổ";
}

function transactionSecondaryLabel(transaction: Transaction): string {
  if (transaction.kind === "transfer") {
    return [transaction.account, transaction.destinationAccount]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" → ");
  }
  return [transaction.category, transaction.account]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" · ");
}

function buildLedgerItem(transaction: Transaction): ActivityLedgerItem {
  const attention = transaction.reviewStatus === "needs_review";
  return {
    type: "ledger_transaction",
    key: `transaction:${transaction.id}`,
    occurredOn: transaction.occurredOn,
    observedAt: transaction.occurredAt,
    attention,
    stateLabel: attention ? "Cần xem lại" : "Đã vào sổ",
    primaryLabel: transaction.note || transaction.category || "Giao dịch",
    secondaryLabel: transactionSecondaryLabel(transaction),
    amount: transaction.amount,
    amountKind: transaction.kind,
    searchText: searchable(
      transaction.note,
      transaction.category,
      transaction.account,
      transaction.destinationAccount,
      attention ? "cần xem lại" : "đã vào sổ",
    ),
    href: attention
      ? `/transactions?review=needs_review&open=${encodeURIComponent(transaction.id)}`
      : `/transactions?open=${encodeURIComponent(transaction.id)}`,
    actionLabel: attention ? "Xem lại" : "Mở giao dịch",
    transaction,
  };
}

function buildCandidateItem(
  candidate: InboxCandidate & Partial<CandidateProvenance>,
  accounts: AccountOption[],
  categories: CategoryOption[],
  readinessAvailable: boolean,
): ActivityCandidateItem {
  const readiness = readinessAvailable
    ? classifyCandidateReadiness(candidate, accounts, categories)
    : null;
  const attention = readiness?.state === "needs_attention";
  const reasons: CandidateAttentionReason[] =
    readiness?.state === "needs_attention" ? readiness.reasons : [];
  const attentionLabels = reasons.map(attentionReasonLabel);
  const sourceLabel = candidateSourceLabel(candidate);

  return {
    type: "inbox_candidate",
    key: `candidate:${candidate.id}`,
    occurredOn: candidate.occurredOn,
    observedAt: candidate.createdAt,
    attention,
    readinessKnown: readinessAvailable,
    stateLabel: attention ? "Cần xử lý" : "Chờ vào sổ",
    primaryLabel: candidate.merchant || candidate.note || "Mục chờ vào sổ",
    secondaryLabel: candidateSecondaryLabel(candidate),
    sourceLabel,
    provenanceLabel: provenanceLabel(candidate),
    attentionLabels,
    amount: candidate.amount,
    amountKind: candidate.kind,
    searchText: searchable(
      candidate.merchant,
      candidate.note,
      candidate.category,
      candidate.account,
      sourceLabel,
      attention ? "cần xử lý" : "chờ vào sổ",
      ...attentionLabels,
    ),
    href: `/inbox?candidate=${encodeURIComponent(candidate.id)}`,
    actionLabel: attention ? "Xử lý" : "Mở Cần xem",
    candidate,
  };
}

function newestFirst(left: ActivityItem, right: ActivityItem): number {
  return (
    right.occurredOn.localeCompare(left.occurredOn) ||
    right.observedAt.localeCompare(left.observedAt) ||
    right.key.localeCompare(left.key)
  );
}

export function buildActivityItems({
  transactions,
  candidates,
  accounts,
  categories,
  ledgerAvailable = true,
  candidateReadinessAvailable,
}: ActivityBuildInput): ActivityItem[] {
  const readinessAvailable = candidateReadinessAvailable ?? ledgerAvailable;
  const transactionItems = ledgerAvailable ? transactions.map(buildLedgerItem) : [];
  const candidateItems = candidates
    .filter((candidate) => candidate.status === "pending")
    .map((candidate) =>
      buildCandidateItem(candidate, accounts, categories, readinessAvailable),
    );

  return [...transactionItems, ...candidateItems].sort(newestFirst);
}

export function filterActivityItems(
  items: ActivityItem[],
  filter: ActivityFilter,
  query = "",
): ActivityItem[] {
  const normalizedQuery = normalizeSearchPart(query);
  return items.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "attention" && item.attention) ||
      (filter === "incoming" && item.type === "inbox_candidate") ||
      (filter === "posted" && item.type === "ledger_transaction");
    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;
    return item.searchText.includes(normalizedQuery);
  });
}

export function countActivityAttention(items: ActivityItem[]): number {
  return items.reduce((count, item) => count + (item.attention ? 1 : 0), 0);
}

export function countIncomingActivity(items: ActivityItem[]): number {
  return items.reduce(
    (count, item) => count + (item.type === "inbox_candidate" ? 1 : 0),
    0,
  );
}
