/**
 * Inbox review helpers (wireframes-inbox §10–12).
 * Approve maps candidates → ledger inputs; bulk never auto-posts low conf without opt-in.
 * Money stays integer VND đồng.
 */

import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  CreateTransferInput,
  TransactionKind,
} from "../sample-data.ts";
import {
  CONFIDENCE_LABELS,
  SOURCE_LABELS,
  type CandidateConfidence,
  type InboxCandidate,
} from "./candidate-store.ts";

export type ExplainLineKind = "parser" | "rule" | "source" | "raw" | "audit";

export type ExplainLine = {
  kind: ExplainLineKind;
  text: string;
};

export type BulkReviewAction = "approve" | "reject" | "category";

export type CandidateReviewDraft = {
  kind: InboxCandidate["kind"];
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  categoryId: string;
  accountId: string;
  /** Transfer only: destination account. */
  destinationAccountId: string;
  possibleDuplicate: boolean;
};

const PARSER_BY_SOURCE: Record<InboxCandidate["source"], string> = {
  paste: "paste_text@1.0",
  csv: "csv_import@1.0",
  xlsx: "xlsx_import@1.0",
  pdf: "pdf_import@1.0",
  manual: "manual_entry@1.0",
  notification: "notification@1.0",
  email: "email@1.0",
};

/** Confidence levels allowed for bulk approve without opt-in. */
export function meetsBulkApproveThreshold(
  confidence: CandidateConfidence,
  includeLowConfidence: boolean,
): boolean {
  if (confidence === "low") return includeLowConfidence;
  return true;
}

export function partitionBulkApprove(
  candidates: InboxCandidate[],
  selectedIds: string[],
  includeLowConfidence: boolean,
): { eligible: InboxCandidate[]; skippedLow: InboxCandidate[] } {
  const selected = candidates.filter(
    (item) => item.status === "pending" && selectedIds.includes(item.id),
  );
  const eligible: InboxCandidate[] = [];
  const skippedLow: InboxCandidate[] = [];
  for (const item of selected) {
    if (meetsBulkApproveThreshold(item.confidence, includeLowConfidence)) {
      eligible.push(item);
    } else {
      skippedLow.push(item);
    }
  }
  return { eligible, skippedLow };
}

export function buildExplainLines(candidate: InboxCandidate): ExplainLine[] {
  const lines: ExplainLine[] = [];
  const parser = PARSER_BY_SOURCE[candidate.source] ?? "unknown@0";
  lines.push({ kind: "parser", text: `Parser: ${parser}` });

  if (candidate.rawSnippet) {
    const amountMatch = candidate.rawSnippet.match(
      /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(k|K|đ|₫|vnd|VND)?/i,
    );
    if (amountMatch) {
      lines.push({
        kind: "parser",
        text: `Amount regex khớp “${amountMatch[0].trim()}”`,
      });
    } else {
      lines.push({
        kind: "parser",
        text: `Đã trích từ snippet (độ tin: ${CONFIDENCE_LABELS[candidate.confidence]})`,
      });
    }
  } else {
    lines.push({
      kind: "parser",
      text: `Độ tin: ${CONFIDENCE_LABELS[candidate.confidence]}`,
    });
  }

  if (candidate.category) {
    lines.push({
      kind: "rule",
      text: `Gợi ý danh mục: ${candidate.merchant || "—"} → ${candidate.category}`,
    });
  } else {
    lines.push({
      kind: "rule",
      text: "Chưa có rule danh mục — hãy chọn khi duyệt",
    });
  }

  if (candidate.account) {
    lines.push({
      kind: "rule",
      text: `Gợi ý tài khoản: ${candidate.account}`,
    });
  }

  const batch =
    candidate.importBatchId != null && candidate.importBatchId.length > 0
      ? ` · batch ${candidate.importBatchId}`
      : "";
  lines.push({
    kind: "source",
    text: `Nguồn: ${SOURCE_LABELS[candidate.source]}${batch}`,
  });

  if (candidate.possibleDuplicate) {
    lines.push({
      kind: "audit",
      text: "Cảnh báo: có thể trùng với giao dịch khác",
    });
  }

  lines.push({
    kind: "audit",
    text: `Tạo lúc: ${formatAuditTime(candidate.createdAt)} · id ${candidate.id}`,
  });

  if (candidate.rawSnippet) {
    lines.push({ kind: "raw", text: candidate.rawSnippet });
  }

  return lines;
}

function formatAuditTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(ms));
  } catch {
    return iso;
  }
}

export function draftFromCandidate(
  candidate: InboxCandidate,
  accounts: AccountOption[],
  categories: CategoryOption[],
): CandidateReviewDraft {
  const moneyKind: TransactionKind =
    candidate.kind === "income" ? "income" : "expense";
  const categoryId = resolveCategoryId(candidate, categories, moneyKind) ?? "";
  const accountId = resolveAccountId(candidate, accounts) ?? accounts[0]?.id ?? "";
  const otherAccount =
    accounts.find((item) => item.id !== accountId)?.id ?? accounts[0]?.id ?? "";

  return {
    kind: candidate.kind,
    amount: candidate.amount,
    merchant: candidate.merchant,
    note: candidate.note,
    occurredOn: candidate.occurredOn,
    categoryId,
    accountId,
    destinationAccountId: otherAccount,
    possibleDuplicate: candidate.possibleDuplicate === true,
  };
}

export function resolveAccountId(
  candidate: Pick<InboxCandidate, "accountId" | "account">,
  accounts: AccountOption[],
): string | null {
  if (candidate.accountId) {
    const byId = accounts.find((item) => item.id === candidate.accountId);
    if (byId) return byId.id;
  }
  if (candidate.account) {
    const normalized = candidate.account.trim().toLocaleLowerCase("vi");
    const byName = accounts.find(
      (item) => item.name.trim().toLocaleLowerCase("vi") === normalized,
    );
    if (byName) return byName.id;
    const partial = accounts.find((item) =>
      item.name.trim().toLocaleLowerCase("vi").includes(normalized),
    );
    if (partial) return partial.id;
  }
  return accounts[0]?.id ?? null;
}

export function resolveCategoryId(
  candidate: Pick<InboxCandidate, "categoryId" | "category">,
  categories: CategoryOption[],
  kind: TransactionKind,
): string | null {
  const pool = categories.filter((item) => item.kind === kind);
  if (candidate.categoryId) {
    const byId = pool.find((item) => item.id === candidate.categoryId);
    if (byId) return byId.id;
  }
  if (candidate.category) {
    const normalized = candidate.category.trim().toLocaleLowerCase("vi");
    const byName = pool.find(
      (item) => item.name.trim().toLocaleLowerCase("vi") === normalized,
    );
    if (byName) return byName.id;
  }
  return pool[0]?.id ?? null;
}

export type LedgerPostResult =
  | {
      ok: true;
      mode: "money";
      input: CreateTransactionInput;
    }
  | {
      ok: true;
      mode: "transfer";
      input: CreateTransferInput;
    }
  | { ok: false; message: string };

/**
 * Build ledger create payload from candidate + editable draft.
 * Transfer needs two distinct accounts; money kinds need category + account.
 */
export function buildLedgerPost(
  draft: CandidateReviewDraft,
  accounts: AccountOption[],
  categories: CategoryOption[],
  idempotencyKey: string,
): LedgerPostResult {
  if (!Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
    return { ok: false, message: "Số tiền phải là số nguyên dương (đồng)." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.occurredOn)) {
    return { ok: false, message: "Ngày không hợp lệ (YYYY-MM-DD)." };
  }

  const noteBase = draft.note.trim() || draft.merchant.trim() || "Giao dịch Inbox";

  if (draft.kind === "transfer") {
    const source = accounts.find((item) => item.id === draft.accountId);
    const destination = accounts.find((item) => item.id === draft.destinationAccountId);
    if (!source || !destination) {
      return { ok: false, message: "Chọn đủ hai tài khoản để chuyển." };
    }
    if (source.id === destination.id) {
      return { ok: false, message: "Hai tài khoản chuyển phải khác nhau." };
    }
    return {
      ok: true,
      mode: "transfer",
      input: {
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: draft.amount,
        note: noteBase,
        occurredOn: draft.occurredOn,
        idempotencyKey,
      },
    };
  }

  const kind: TransactionKind = draft.kind;
  const account = accounts.find((item) => item.id === draft.accountId);
  const category = categories.find((item) => item.id === draft.categoryId);
  if (!account) {
    return { ok: false, message: "Chọn tài khoản trước khi duyệt." };
  }
  if (!category || category.kind !== kind) {
    return { ok: false, message: "Chọn danh mục khớp loại thu/chi." };
  }

  return {
    ok: true,
    mode: "money",
    input: {
      kind,
      categoryId: category.id,
      accountId: account.id,
      amount: draft.amount,
      note: noteBase,
      occurredOn: draft.occurredOn,
      idempotencyKey,
    },
  };
}

export function applyBulkCategory(
  list: InboxCandidate[],
  selectedIds: string[],
  category: CategoryOption,
): InboxCandidate[] {
  const idSet = new Set(selectedIds);
  return list.map((item) => {
    if (!idSet.has(item.id) || item.status !== "pending") return item;
    if (item.kind === "transfer") return item;
    if (item.kind !== category.kind) return item;
    return {
      ...item,
      categoryId: category.id,
      category: category.name,
    };
  });
}

export function markCandidatesStatus(
  list: InboxCandidate[],
  ids: string[],
  status: "approved" | "rejected",
  patch?: Partial<Pick<InboxCandidate, "categoryId" | "category" | "accountId" | "account" | "note" | "merchant" | "amount" | "occurredOn" | "kind" | "possibleDuplicate">>,
): InboxCandidate[] {
  const idSet = new Set(ids);
  return list.map((item) => {
    if (!idSet.has(item.id) || item.status !== "pending") return item;
    return { ...item, ...patch, status, id: item.id, createdAt: item.createdAt };
  });
}

export function confidenceScoreLabel(confidence: CandidateConfidence): string {
  if (confidence === "high") return "Khá chắc (~0.9)";
  if (confidence === "medium") return "Tạm ổn (~0.75)";
  return "Cần xem (~0.5)";
}
