/**
 * Local-first inbox candidates (wireframes-inbox §5).
 * Money amounts are integer VND đồng (minor units). No float.
 */

export const CANDIDATE_STORAGE_KEY = "moneyflow-inbox-candidates-v1";
export const MAX_SOURCE_ROW_INDEX = 1_000_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CandidateSource =
  | "paste"
  | "csv"
  | "xlsx"
  | "pdf"
  | "manual"
  | "notification"
  | "email";

export type CandidateConfidence = "high" | "medium" | "low";

export type CandidateStatus = "pending" | "approved" | "rejected";

export type CandidateKind = "expense" | "income" | "transfer";

export type InboxCandidate = {
  id: string;
  kind: CandidateKind;
  /** Absolute amount in VND đồng (integer, > 0). Sign shown via kind. */
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  source: CandidateSource;
  confidence: CandidateConfidence;
  status: CandidateStatus;
  /** Possible duplicate of another candidate or ledger row. */
  possibleDuplicate?: boolean;
  /** Fingerprint hash (computed; optional on store). */
  fingerprint?: string;
  /** Peer candidate id sharing fingerprint (detection). */
  duplicateOfId?: string;
  /** Suggested transfer pair peer (detection). */
  possibleTransfer?: boolean;
  transferPairId?: string;
  categoryId?: string;
  category?: string;
  accountId?: string;
  account?: string;
  rawSnippet?: string;
  importBatchId?: string;
  /** One-based row number reported by the source parser. */
  sourceRowIndex?: number;
  /** Ledger transaction created when this candidate was approved. */
  financialTransactionId?: string;
  createdAt: string;
};

export type CreateCandidateInput = {
  kind: CandidateKind;
  amount: number;
  merchant: string;
  note?: string;
  occurredOn: string;
  source: CandidateSource;
  confidence: CandidateConfidence;
  status?: CandidateStatus;
  possibleDuplicate?: boolean;
  categoryId?: string;
  category?: string;
  accountId?: string;
  account?: string;
  rawSnippet?: string;
  importBatchId?: string;
  sourceRowIndex?: number;
  financialTransactionId?: string;
  id?: string;
  createdAt?: string;
};

export type UpdateCandidateInput = Partial<
  Omit<
    InboxCandidate,
    "id" | "createdAt" | "sourceRowIndex" | "financialTransactionId"
  >
> & { id: string };

export type ApproveCandidateInput = {
  candidateId: string;
  kind: CandidateKind;
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  accountId: string;
  categoryId: string | null;
  destinationAccountId: string | null;
  possibleDuplicate: boolean;
};

export const SOURCE_LABELS: Record<CandidateSource, string> = {
  paste: "paste",
  csv: "csv",
  xlsx: "xlsx",
  pdf: "pdf",
  manual: "manual",
  notification: "thông báo",
  email: "email",
};

export const CONFIDENCE_LABELS: Record<CandidateConfidence, string> = {
  high: "Khá chắc",
  medium: "Tạm ổn",
  low: "Cần xem",
};

const SOURCES: CandidateSource[] = [
  "paste",
  "csv",
  "xlsx",
  "pdf",
  "manual",
  "notification",
  "email",
];

const CONFIDENCES: CandidateConfidence[] = ["high", "medium", "low"];
const STATUSES: CandidateStatus[] = ["pending", "approved", "rejected"];
const KINDS: CandidateKind[] = ["expense", "income", "transfer"];

/** Demo seed when localStorage has never been written (optional per TASK-005). */
export const sampleCandidates: InboxCandidate[] = [
  {
    id: "cand-demo-1",
    kind: "expense",
    amount: 45_000,
    merchant: "Highlands Coffee",
    note: "Cafe sáng",
    occurredOn: "2026-07-12",
    source: "paste",
    confidence: "low",
    status: "pending",
    category: "Ăn uống",
    account: "Tiền mặt",
    rawSnippet: "Highlands 45k",
    createdAt: "2026-07-12T02:10:00.000Z",
  },
  {
    id: "cand-demo-2",
    kind: "income",
    amount: 25_000_000,
    merchant: "LUONG CT",
    note: "Lương tháng 7",
    occurredOn: "2026-07-12",
    source: "csv",
    confidence: "high",
    status: "pending",
    category: "Lương",
    account: "Vietcombank",
    createdAt: "2026-07-12T03:00:00.000Z",
  },
  {
    id: "cand-demo-3",
    kind: "expense",
    amount: 89_000,
    merchant: "GRAB *TRIP",
    note: "Di chuyển",
    occurredOn: "2026-07-11",
    source: "csv",
    confidence: "high",
    status: "pending",
    category: "Di chuyển",
    account: "Vietcombank",
    rawSnippet: "GRAB *TRIP 89.000",
    createdAt: "2026-07-11T14:22:00.000Z",
  },
  {
    id: "cand-demo-4",
    kind: "expense",
    amount: 2_000_000,
    merchant: "CK ra tiết kiệm",
    note: "Chuyển sang tiết kiệm",
    occurredOn: "2026-07-10",
    source: "csv",
    confidence: "medium",
    status: "pending",
    account: "Vietcombank",
    rawSnippet: "CK ra tiet kiem 2000000",
    createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "cand-demo-4b",
    kind: "income",
    amount: 2_000_000,
    merchant: "CK vào tiết kiệm",
    note: "Nhận từ VCB",
    occurredOn: "2026-07-10",
    source: "csv",
    confidence: "medium",
    status: "pending",
    account: "Tiết kiệm",
    rawSnippet: "CK vao tiet kiem 2000000",
    createdAt: "2026-07-10T09:01:00.000Z",
  },
  {
    id: "cand-demo-5",
    kind: "expense",
    amount: 156_000,
    merchant: "Circle K",
    note: "Tiện lợi",
    occurredOn: "2026-07-10",
    source: "paste",
    confidence: "medium",
    status: "pending",
    category: "Mua sắm",
    createdAt: "2026-07-10T18:40:00.000Z",
  },
  {
    id: "cand-demo-6",
    kind: "expense",
    amount: 89_000,
    merchant: "GRAB *TRIP",
    note: "Di chuyển",
    occurredOn: "2026-07-11",
    source: "paste",
    confidence: "medium",
    status: "pending",
    account: "Vietcombank",
    rawSnippet: "GRAB *TRIP 89.000",
    createdAt: "2026-07-11T15:00:00.000Z",
  },
];

export function isCandidateSource(value: unknown): value is CandidateSource {
  return typeof value === "string" && (SOURCES as string[]).includes(value);
}

export function isCandidateConfidence(value: unknown): value is CandidateConfidence {
  return typeof value === "string" && (CONFIDENCES as string[]).includes(value);
}

export function isCandidate(value: unknown): value is InboxCandidate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InboxCandidate>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.kind === "string" &&
    (KINDS as string[]).includes(item.kind) &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0 &&
    typeof item.merchant === "string" &&
    typeof item.note === "string" &&
    typeof item.occurredOn === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn) &&
    isCandidateSource(item.source) &&
    isCandidateConfidence(item.confidence) &&
    typeof item.status === "string" &&
    (STATUSES as string[]).includes(item.status) &&
    typeof item.createdAt === "string" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    (item.possibleDuplicate === undefined || typeof item.possibleDuplicate === "boolean") &&
    (item.fingerprint === undefined || typeof item.fingerprint === "string") &&
    (item.duplicateOfId === undefined || typeof item.duplicateOfId === "string") &&
    (item.possibleTransfer === undefined || typeof item.possibleTransfer === "boolean") &&
    (item.transferPairId === undefined || typeof item.transferPairId === "string") &&
    (item.categoryId === undefined || typeof item.categoryId === "string") &&
    (item.category === undefined || typeof item.category === "string") &&
    (item.accountId === undefined || typeof item.accountId === "string") &&
    (item.account === undefined || typeof item.account === "string") &&
    (item.rawSnippet === undefined || typeof item.rawSnippet === "string") &&
    (item.importBatchId === undefined || typeof item.importBatchId === "string") &&
    (item.sourceRowIndex === undefined ||
      (Number.isSafeInteger(item.sourceRowIndex) &&
        item.sourceRowIndex > 0 &&
        item.sourceRowIndex <= MAX_SOURCE_ROW_INDEX)) &&
    (item.financialTransactionId === undefined ||
      (item.status === "approved" &&
        UUID_RE.test(item.financialTransactionId)))
  );
}

export function countPending(candidates: InboxCandidate[]): number {
  return candidates.filter((item) => item.status === "pending").length;
}

export function filterCandidates(
  candidates: InboxCandidate[],
  filter: InboxFilter,
): InboxCandidate[] {
  const pending = candidates.filter((item) => item.status === "pending");
  switch (filter) {
    case "needs_review":
      return pending.filter((item) => item.confidence === "low");
    case "duplicate":
      return pending.filter((item) => item.possibleDuplicate === true);
    case "transfer":
      return pending.filter(
        (item) => item.kind === "transfer" || item.possibleTransfer === true,
      );
    case "all":
    default:
      return pending;
  }
}

export type InboxFilter = "all" | "needs_review" | "duplicate" | "transfer";

export function sortCandidatesNewest(candidates: InboxCandidate[]): InboxCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.occurredOn !== b.occurredOn) return b.occurredOn.localeCompare(a.occurredOn);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function createCandidate(input: CreateCandidateInput): InboxCandidate {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("amount must be a positive safe integer (VND đồng)");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    throw new Error("occurredOn must be YYYY-MM-DD");
  }
  if (
    input.sourceRowIndex !== undefined &&
    (!Number.isSafeInteger(input.sourceRowIndex) ||
      input.sourceRowIndex <= 0 ||
      input.sourceRowIndex > MAX_SOURCE_ROW_INDEX)
  ) {
    throw new Error(
      `sourceRowIndex must be an integer between 1 and ${MAX_SOURCE_ROW_INDEX}`,
    );
  }
  if (
    input.financialTransactionId !== undefined &&
    (input.status !== "approved" ||
      !UUID_RE.test(input.financialTransactionId))
  ) {
    throw new Error(
      "financialTransactionId must be a UUID on an approved candidate",
    );
  }
  return {
    id: input.id ?? `cand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    amount: input.amount,
    merchant: input.merchant.trim() || "Không rõ",
    note: (input.note ?? "").trim(),
    occurredOn: input.occurredOn,
    source: input.source,
    confidence: input.confidence,
    status: input.status ?? "pending",
    possibleDuplicate: input.possibleDuplicate,
    categoryId: input.categoryId,
    category: input.category,
    accountId: input.accountId,
    account: input.account,
    rawSnippet: input.rawSnippet,
    importBatchId: input.importBatchId,
    sourceRowIndex: input.sourceRowIndex,
    financialTransactionId: input.financialTransactionId,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function upsertCandidate(
  list: InboxCandidate[],
  candidate: InboxCandidate,
): InboxCandidate[] {
  const index = list.findIndex((item) => item.id === candidate.id);
  if (index === -1) return [candidate, ...list];
  const next = [...list];
  next[index] = candidate;
  return next;
}

export function updateCandidateInList(
  list: InboxCandidate[],
  input: UpdateCandidateInput,
): InboxCandidate[] {
  return list.map((item) => {
    if (item.id !== input.id) return item;
    const patch = { ...input };
    delete (patch as { id?: string }).id;
    const merged = { ...item, ...patch, id: item.id };
    if (!isCandidate(merged)) return item;
    return merged;
  });
}

export function removeCandidateFromList(
  list: InboxCandidate[],
  id: string,
): InboxCandidate[] {
  return list.filter((item) => item.id !== id);
}

export function readStoredCandidates(): InboxCandidate[] {
  if (typeof window === "undefined") return sampleCandidates;
  try {
    const saved = localStorage.getItem(CANDIDATE_STORAGE_KEY);
    if (saved === null) return sampleCandidates.map((item) => ({ ...item }));
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isCandidate)) {
      localStorage.removeItem(CANDIDATE_STORAGE_KEY);
      return sampleCandidates.map((item) => ({ ...item }));
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(CANDIDATE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return sampleCandidates.map((item) => ({ ...item }));
  }
}

export function writeStoredCandidates(candidates: InboxCandidate[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(candidates));
}

export function addStoredCandidate(input: CreateCandidateInput): InboxCandidate {
  const candidate = createCandidate(input);
  const next = upsertCandidate(readStoredCandidates(), candidate);
  writeStoredCandidates(next);
  return candidate;
}

export function updateStoredCandidate(input: UpdateCandidateInput): InboxCandidate[] {
  const next = updateCandidateInList(readStoredCandidates(), input);
  writeStoredCandidates(next);
  return next;
}

export function removeStoredCandidate(id: string): InboxCandidate[] {
  const next = removeCandidateFromList(readStoredCandidates(), id);
  writeStoredCandidates(next);
  return next;
}

/** Format occurredOn (YYYY-MM-DD) as DD/MM for inbox rows. */
export function formatCandidateDate(occurredOn: string): string {
  const parts = occurredOn.split("-");
  if (parts.length !== 3) return occurredOn;
  return `${parts[2]}/${parts[1]}`;
}
