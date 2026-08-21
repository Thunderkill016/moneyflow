/**
 * Power-user Direct CSV planning (TASK-131 / #434).
 *
 * The preview stays client-side and conservative. Authenticated commit now uses
 * the persisted acquisition/provenance boundary; demo can still use the legacy
 * browser-local post payload. Client fingerprints are preview aids only — the
 * database computes the canonical persisted candidate fingerprint.
 * Money = integer VND đồng. Pure helpers — no I/O.
 */

import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  TransactionKind,
} from "../sample-data.ts";
import type { CandidateConfidence } from "./candidate-store.ts";
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
  confidence: CandidateConfidence;
  rawSnippet: string;
  /** Preview-only fingerprint. Persisted candidates are fingerprinted by DB. */
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

/**
 * Minimal source evidence sent to the authenticated Direct CSV commit action.
 * There is intentionally no `sourceExternalId`: ordinary CSV rows do not expose
 * a bank/provider stable identifier in the current parser contract.
 */
export type DirectCsvAcquisitionRow = {
  rowIndex: number;
  kind: TransactionKind;
  amount: number;
  occurredOn: string;
  note: string;
  merchant: string;
  categoryId: string;
  accountId: string;
  confidence: CandidateConfidence;
  rawSnippet: string;
};

/** Legacy browser-local demo post payload. */
export type DirectImportPostItem = {
  input: CreateTransactionInput;
  fingerprint: string;
  rowIndex: number;
};

function isMoneyKind(kind: ParsedCsvRow["kind"]): kind is TransactionKind {
  return kind === "expense" || kind === "income";
}

/**
 * Fingerprint for a previewed ledger row (matches the current client ledger
 * fingerprint helper). This is not persisted as source identity.
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

/** Build import preview: map parsed CSV rows → ready rows with conservative dedupe. */
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
    const evidence = {
      confidence: item.confidence,
      rawSnippet: item.rawSnippet,
    };

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
        ...evidence,
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
        ...evidence,
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
        ...evidence,
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
        ...evidence,
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
        ...evidence,
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
          ...evidence,
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
          ...evidence,
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
      ...evidence,
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

/** Build authenticated acquisition rows without inventing source IDs/fingerprints. */
export function toDirectImportAcquisitionRows(
  ready: DirectImportRowPlan[],
): DirectCsvAcquisitionRow[] {
  return ready
    .filter((row) => row.status === "ready")
    .map((row) => ({
      rowIndex: row.rowIndex,
      kind: row.kind,
      amount: row.amount,
      occurredOn: row.occurredOn,
      note: row.note,
      merchant: row.merchant,
      categoryId: row.categoryId,
      accountId: row.accountId,
      confidence: row.confidence,
      rawSnippet: row.rawSnippet,
    }));
}

/** Build browser-local demo create payloads. Caller supplies idempotency keys. */
export function toDirectImportPosts(
  ready: DirectImportRowPlan[],
  makeIdempotencyKey: () => string,
): DirectImportPostItem[] {
  return ready
    .filter((r) => r.status === "ready")
    .map((r) => ({
      rowIndex: r.rowIndex,
      fingerprint: r.fingerprint,
      input: {
        kind: r.kind,
        categoryId: r.categoryId,
        accountId: r.accountId,
        amount: r.amount,
        note: r.note,
        occurredOn: r.occurredOn,
        idempotencyKey: makeIdempotencyKey(),
      },
    }));
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