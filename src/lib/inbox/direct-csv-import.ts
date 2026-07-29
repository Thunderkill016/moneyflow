/**
 * Power-user direct CSV → ledger (TASK-131).
 * Mapped CSV rows become approved income/expense transactions.
 * Dedupe via fingerprint against existing ledger + within-batch.
 * Transfers are skipped (need two accounts — use Inbox path).
 * Money = integer VND đồng. Pure planning helpers — no I/O.
 */

import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  TransactionKind,
} from "../sample-data.ts";
import {
  fnv1aHex,
  fingerprintParts,
  ledgerFingerprint,
  type LedgerLike,
} from "./detect.ts";
import type { ParsedCsvRow } from "./parse-csv.ts";

export type DirectImportMapping = {
  accountId: string;
  expenseCategoryId: string;
  incomeCategoryId: string;
  /** Skip rows matching ledger / earlier batch rows. Default true. */
  skipDuplicates?: boolean;
  /** Skip transfer-kind rows. Default true. */
  skipTransfers?: boolean;
};

export type DirectImportRowStatus =
  | "ready"
  | "duplicate"
  | "skipped_transfer"
  | "skipped_invalid";

export type DirectImportRowPlan = {
  rowIndex: number;
  kind: TransactionKind;
  amount: number;
  occurredOn: string;
  note: string;
  merchant: string;
  categoryId: string;
  accountId: string;
  fingerprint: string;
  status: DirectImportRowStatus;
  duplicateOfLedgerId?: string;
  reason?: string;
};

export type DirectImportPlan = {
  rows: DirectImportRowPlan[];
  ready: DirectImportRowPlan[];
  readyCount: number;
  duplicateCount: number;
  transferSkipped: number;
  invalidSkipped: number;
  totalParsed: number;
};

export type DirectImportPostItem = {
  identity: string;
  input: CreateTransactionInput;
  fingerprint: string;
  rowIndex: number;
};

function isMoneyKind(kind: ParsedCsvRow["kind"]): kind is TransactionKind {
  return kind === "expense" || kind === "income";
}

/**
 * Fingerprint for a planned ledger row (matches ledger after post).
 * Uses accountId|date|amount|note material — same as ledgerFingerprint.
 */
export function directImportFingerprint(item: {
  accountId: string;
  amount: number;
  occurredOn: string;
  note: string;
}): string {
  return fnv1aHex(
    fingerprintParts({
      amount: item.amount,
      occurredOn: item.occurredOn,
      accountId: item.accountId,
      note: item.note,
    }),
  );
}

function resolveCategoryId(
  kind: TransactionKind,
  mapping: DirectImportMapping,
  categories: CategoryOption[],
): string | null {
  const id =
    kind === "income" ? mapping.incomeCategoryId : mapping.expenseCategoryId;
  const found = categories.find((c) => c.id === id && c.kind === kind);
  return found ? found.id : null;
}

/**
 * Build import plan: map parsed CSV rows → ready posts with dedupe.
 */
export function planDirectCsvImport(
  parsed: ParsedCsvRow[],
  ledger: LedgerLike[],
  mapping: DirectImportMapping,
  accounts: AccountOption[],
  categories: CategoryOption[],
): DirectImportPlan {
  const skipDuplicates = mapping.skipDuplicates !== false;
  const skipTransfers = mapping.skipTransfers !== false;

  const account = accounts.find((a) => a.id === mapping.accountId);
  if (!account) {
    return {
      rows: [],
      ready: [],
      readyCount: 0,
      duplicateCount: 0,
      transferSkipped: 0,
      invalidSkipped: parsed.length,
      totalParsed: parsed.length,
    };
  }

  const ledgerByFp = new Map<string, string>();
  for (const row of ledger) {
    if (row.kind === "transfer") continue;
    const fp = ledgerFingerprint(row);
    if (!ledgerByFp.has(fp)) ledgerByFp.set(fp, row.id);
  }

  const seenInBatch = new Map<string, number>();
  const rows: DirectImportRowPlan[] = [];

  for (const item of parsed) {
    if (item.kind === "transfer") {
      rows.push({
        rowIndex: item.rowIndex,
        kind: "expense",
        amount: item.amount,
        occurredOn: item.occurredOn,
        note: item.merchant || item.note || "Chuyển khoản",
        merchant: item.merchant,
        categoryId: "",
        accountId: account.id,
        fingerprint: "",
        status: skipTransfers ? "skipped_transfer" : "skipped_invalid",
        reason: "Dòng chuyển khoản — dùng Inbox để ghép hai tài khoản.",
      });
      continue;
    }

    if (!isMoneyKind(item.kind)) {
      rows.push({
        rowIndex: item.rowIndex,
        kind: "expense",
        amount: item.amount,
        occurredOn: item.occurredOn,
        note: item.merchant || item.note || "",
        merchant: item.merchant,
        categoryId: "",
        accountId: account.id,
        fingerprint: "",
        status: "skipped_invalid",
        reason: "Loại giao dịch không hỗ trợ.",
      });
      continue;
    }

    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) {
      rows.push({
        rowIndex: item.rowIndex,
        kind: item.kind,
        amount: item.amount,
        occurredOn: item.occurredOn,
        note: item.merchant || item.note || "",
        merchant: item.merchant,
        categoryId: "",
        accountId: account.id,
        fingerprint: "",
        status: "skipped_invalid",
        reason: "Số tiền không hợp lệ.",
      });
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn)) {
      rows.push({
        rowIndex: item.rowIndex,
        kind: item.kind,
        amount: item.amount,
        occurredOn: item.occurredOn,
        note: item.merchant || item.note || "",
        merchant: item.merchant,
        categoryId: "",
        accountId: account.id,
        fingerprint: "",
        status: "skipped_invalid",
        reason: "Ngày không hợp lệ.",
      });
      continue;
    }

    const categoryId = resolveCategoryId(item.kind, mapping, categories);
    if (!categoryId) {
      rows.push({
        rowIndex: item.rowIndex,
        kind: item.kind,
        amount: item.amount,
        occurredOn: item.occurredOn,
        note: item.merchant || item.note || "",
        merchant: item.merchant,
        categoryId: "",
        accountId: account.id,
        fingerprint: "",
        status: "skipped_invalid",
        reason: "Chưa chọn danh mục thu/chi phù hợp.",
      });
      continue;
    }

    const note =
      (item.note && item.note.trim()) ||
      (item.merchant && item.merchant.trim()) ||
      (item.kind === "income" ? "Thu nhập import" : "Chi tiêu import");

    const fingerprint = directImportFingerprint({
      accountId: account.id,
      amount: item.amount,
      occurredOn: item.occurredOn,
      note,
    });

    if (skipDuplicates) {
      const ledgerId = ledgerByFp.get(fingerprint);
      if (ledgerId) {
        rows.push({
          rowIndex: item.rowIndex,
          kind: item.kind,
          amount: item.amount,
          occurredOn: item.occurredOn,
          note,
          merchant: item.merchant,
          categoryId,
          accountId: account.id,
          fingerprint,
          status: "duplicate",
          duplicateOfLedgerId: ledgerId,
          reason: "Trùng giao dịch đã có trên sổ (fingerprint).",
        });
        continue;
      }

      const batchPeer = seenInBatch.get(fingerprint);
      if (batchPeer !== undefined) {
        rows.push({
          rowIndex: item.rowIndex,
          kind: item.kind,
          amount: item.amount,
          occurredOn: item.occurredOn,
          note,
          merchant: item.merchant,
          categoryId,
          accountId: account.id,
          fingerprint,
          status: "duplicate",
          reason: `Trùng dòng ${batchPeer} trong cùng file.`,
        });
        continue;
      }
    }

    seenInBatch.set(fingerprint, item.rowIndex);
    rows.push({
      rowIndex: item.rowIndex,
      kind: item.kind,
      amount: item.amount,
      occurredOn: item.occurredOn,
      note,
      merchant: item.merchant,
      categoryId,
      accountId: account.id,
      fingerprint,
      status: "ready",
    });
  }

  const ready = rows.filter((r) => r.status === "ready");
  return {
    rows,
    ready,
    readyCount: ready.length,
    duplicateCount: rows.filter((r) => r.status === "duplicate").length,
    transferSkipped: rows.filter((r) => r.status === "skipped_transfer").length,
    invalidSkipped: rows.filter((r) => r.status === "skipped_invalid").length,
    totalParsed: parsed.length,
  };
}

/**
 * Identity for one financial request within a mounted import attempt.
 * The raw material stays in memory only; this is not a persisted fingerprint.
 */
export function directImportRowIdentity(row: DirectImportRowPlan): string {
  return JSON.stringify([
    row.rowIndex,
    row.kind,
    row.accountId,
    row.categoryId,
    row.amount,
    row.occurredOn,
    row.note,
    row.fingerprint,
  ]);
}

/**
 * A partial retry is scoped by source row, not by the current dedupe result.
 * This prevents confirmed rows from being posted again when dedupe is disabled.
 */
export function selectDirectImportAttemptRows(
  ready: DirectImportRowPlan[],
  unresolvedRowIndexes: readonly number[],
  retryOnly: boolean,
): DirectImportRowPlan[] {
  if (!retryOnly) return ready;
  const unresolvedRows = new Set(unresolvedRowIndexes);
  return ready.filter((row) => unresolvedRows.has(row.rowIndex));
}

/**
 * Build create payloads for ready rows. Unchanged unresolved rows reuse their
 * prior idempotency keys so an uncertain committed response can be retried.
 */
export function toDirectImportPosts(
  ready: DirectImportRowPlan[],
  makeIdempotencyKey: () => string,
  unresolved: DirectImportPostItem[] = [],
): DirectImportPostItem[] {
  const unresolvedByIdentity = new Map(
    unresolved.map((post) => [post.identity, post]),
  );

  return ready
    .filter((r) => r.status === "ready")
    .map((r) => {
      const identity = directImportRowIdentity(r);
      const prior = unresolvedByIdentity.get(identity);
      return {
        identity,
        rowIndex: r.rowIndex,
        fingerprint: r.fingerprint,
        input: {
          kind: r.kind,
          categoryId: r.categoryId,
          accountId: r.accountId,
          amount: r.amount,
          note: r.note,
          occurredOn: r.occurredOn,
          idempotencyKey:
            prior?.input.idempotencyKey ?? makeIdempotencyKey(),
        },
      };
    });
}

/** Human summary for UI (Vietnamese, calm). */
export function formatDirectImportSummary(plan: DirectImportPlan): string {
  const parts: string[] = [];
  parts.push(`${plan.readyCount} sẽ ghi vào sổ`);
  if (plan.duplicateCount > 0) {
    parts.push(`${plan.duplicateCount} trùng (bỏ qua)`);
  }
  if (plan.transferSkipped > 0) {
    parts.push(`${plan.transferSkipped} chuyển khoản (bỏ qua)`);
  }
  if (plan.invalidSkipped > 0) {
    parts.push(`${plan.invalidSkipped} không hợp lệ`);
  }
  return parts.join(" · ");
}

export function directImportRowStatusLabel(status: DirectImportRowStatus): string {
  switch (status) {
    case "ready":
      return "Sẵn sàng";
    case "duplicate":
      return "Trùng";
    case "skipped_transfer":
      return "Chuyển khoản";
    case "skipped_invalid":
      return "Bỏ qua";
    default:
      return status;
  }
}
