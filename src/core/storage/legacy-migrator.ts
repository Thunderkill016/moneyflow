import { z } from "zod";
import { computeAccountBalances, deduplicateTransactions } from "../engine/ledger.engine.ts";
import {
  AccountSchema,
  type Account,
  type AccountGroup,
  type CurrencyCode,
} from "../schema/account.schema.ts";
import {
  BudgetConfigSchema,
  DEFAULT_BUDGET_CONFIG,
  type BudgetConfig,
  type CommitmentItem,
} from "../schema/budget.schema.ts";
import {
  TransactionSchema,
  type Transaction,
  type TransactionType,
} from "../schema/transaction.schema.ts";

export interface LegacyMoneyFlowSnapshot {
  version: 2 | 3;
  accounts: Account[];
  transactions: Transaction[];
  budget: BudgetConfig;
  updatedAt: number;
}

export const LegacySnapshotSchema = z.object({
  version: z.union([z.literal(2), z.literal(3)]),
  accounts: z.array(AccountSchema),
  transactions: z.array(TransactionSchema),
  budget: BudgetConfigSchema,
  updatedAt: z.number().int().nonnegative(),
});

export type MigrationSourceFormat =
  | "moneyflow-v3"
  | "moneyflow-v2"
  | "neon-archive-v1"
  | "flutter-fintech-v1";

export interface MigrationImportResult {
  snapshot: LegacyMoneyFlowSnapshot;
  sourceFormat: MigrationSourceFormat;
  sourceLabel: string;
  importedAccounts: number;
  importedTransactions: number;
  skippedDuplicates: number;
  warnings: string[];
}

function foldAsciiLower(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "d")
    .toLowerCase()
    .trim();
}

export function mapLegacyCategoryToCoreId(
  rawIdOrName: string | null | undefined,
  txType: TransactionType,
): string {
  if (txType === "TRANSFER") return "chuyen-vi";
  if (txType === "RECONCILE") return "khop-so-du";
  const key = foldAsciiLower(rawIdOrName ?? "");
  if (!key) return txType === "INCOME" ? "thu-nhap" : "an-uong";

  if (txType === "INCOME") {
    if (key.includes("refund") || key.includes("hoan")) return "mua-sam";
    return "thu-nhap";
  }

  if (
    key.includes("coffee") ||
    key.includes("food") ||
    key.includes("an") ||
    key.includes("uong") ||
    key.includes("cafe") ||
    key.includes("dining") ||
    key.includes("grocer") ||
    key.includes("nhau")
  ) {
    return "an-uong";
  }
  if (
    key.includes("transport") ||
    key.includes("di chuyen") ||
    key.includes("di-chuyen") ||
    key.includes("xang") ||
    key.includes("grab") ||
    key.includes("taxi")
  ) {
    return "di-chuyen";
  }
  if (
    key.includes("shop") ||
    key.includes("mua") ||
    key.includes("sam") ||
    key.includes("clothes")
  ) {
    return "mua-sam";
  }
  if (
    key.includes("bill") ||
    key.includes("hoa don") ||
    key.includes("hoa-don") ||
    key.includes("rent") ||
    key.includes("nha") ||
    key.includes("dien") ||
    key.includes("nuoc") ||
    key.includes("internet")
  ) {
    return "hoa-don";
  }
  if (
    key.includes("entertain") ||
    key.includes("giai tri") ||
    key.includes("giai-tri") ||
    key.includes("travel") ||
    key.includes("du lich") ||
    key.includes("game") ||
    key.includes("film") ||
    key.includes("phim")
  ) {
    return "giai-tri";
  }
  if (
    key.includes("health") ||
    key.includes("suc khoe") ||
    key.includes("suc-khoe") ||
    key.includes("thuoc") ||
    key.includes("gym")
  ) {
    return "suc-khoe";
  }
  if (key.includes("tich luy") || key.includes("tich-luy") || key.includes("invest")) {
    return "tich-luy";
  }

  return "an-uong";
}

function parseTimestampMs(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) {
      const parsedDay = Date.parse(`${trimmed}T12:00:00`);
      if (Number.isFinite(parsedDay)) return parsedDay;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallback;
}

function inferAccountGroupFromLegacy(
  kindOrName: string | null | undefined,
): AccountGroup {
  const key = foldAsciiLower(kindOrName ?? "");
  if (
    key.includes("credit") ||
    key.includes("debt") ||
    key.includes("loan") ||
    key.includes("tin dung") ||
    key.includes("the ") ||
    key.includes("no") ||
    key.includes("ung ho") ||
    key.includes("receivable")
  ) {
    return "DEBT";
  }
  if (
    key.includes("invest") ||
    key.includes("saving") ||
    key.includes("tich luy") ||
    key.includes("tiet kiem") ||
    key.includes("vang") ||
    key.includes("gold") ||
    key.includes("btc") ||
    key.includes("crypto") ||
    key.includes("stock") ||
    key.includes("chung khoan")
  ) {
    return "INVESTMENT";
  }
  return "LIQUID";
}

function normalizeCurrencyCode(raw: unknown): CurrencyCode {
  const upper = typeof raw === "string" ? raw.trim().toUpperCase() : "VND";
  if (upper === "USD" || upper === "BTC" || upper === "XAU") return upper;
  return "VND";
}

function parseNeonArchiveV1(
  root: Record<string, unknown>,
  now: number,
): MigrationImportResult {
  const tables = root.tables as Record<string, unknown>;
  const warnings: string[] = [];

  const rawCategories = Array.isArray(tables.categories) ? tables.categories : [];
  const categoryNameById = new Map<string, string>();
  for (const item of rawCategories) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id === "string" && typeof row.name === "string") {
      categoryNameById.set(row.id, row.name);
    }
  }

  const rawAccounts = Array.isArray(tables.accounts) ? tables.accounts : [];
  const accounts: Account[] = rawAccounts
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((row, idx) => {
      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `neon-acc-${idx + 1}`;
      const name =
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim().slice(0, 80)
          : `Tài khoản ${idx + 1}`;
      const kind = typeof row.kind === "string" ? row.kind : "";
      const group = inferAccountGroupFromLegacy(`${kind} ${name}`);
      const initialBalance =
        typeof row.initial_balance_minor === "number" && Number.isFinite(row.initial_balance_minor)
          ? Math.round(row.initial_balance_minor)
          : 0;
      const updatedAt = parseTimestampMs(row.updated_at ?? row.created_at, now);
      const trustedThroughDate =
        row.trusted_through !== undefined && row.trusted_through !== null
          ? parseTimestampMs(row.trusted_through, updatedAt)
          : null;

      return {
        id,
        name,
        group,
        currency: normalizeCurrencyCode(row.currency_code),
        initialBalance,
        currentBalance: initialBalance,
        isArchived: Boolean(row.is_archived),
        ...(trustedThroughDate ? { trustedThroughDate } : {}),
        updatedAt,
      };
    });

  if (accounts.length === 0) {
    accounts.push({
      id: "acc-tcb",
      name: "Tài khoản chính (Archive)",
      group: "LIQUID",
      currency: "VND",
      initialBalance: 0,
      currentBalance: 0,
      isArchived: false,
      updatedAt: now,
    });
    warnings.push("Archive không có danh sách ví; đã tạo 1 ví mặc định để hứng giao dịch.");
  }

  const fallbackAccountId =
    accounts.find((a) => !a.isArchived && a.group === "LIQUID")?.id ?? accounts[0].id;

  const rawEntries = Array.isArray(tables.transactionEntries)
    ? tables.transactionEntries
    : [];
  const entriesByTxId = new Map<string, Array<Record<string, unknown>>>();
  for (const item of rawEntries) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const txId = typeof row.transaction_id === "string" ? row.transaction_id : "";
    if (!txId) continue;
    const bucket = entriesByTxId.get(txId);
    if (bucket) bucket.push(row);
    else entriesByTxId.set(txId, [row]);
  }

  const rawTxs = Array.isArray(tables.transactions) ? tables.transactions : [];
  const rawTransactions: Transaction[] = [];

  for (let i = 0; i < rawTxs.length; i += 1) {
    const item = rawTxs[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `neon-tx-${i + 1}`;
    const legs = entriesByTxId.get(id) ?? [];
    const kind = foldAsciiLower(typeof row.kind === "string" ? row.kind : "");
    const occurredAt = parseTimestampMs(row.occurred_on ?? row.created_at, now);
    const updatedAt = parseTimestampMs(row.updated_at ?? row.created_at, now);
    const isDeleted = row.deleted_at !== null && row.deleted_at !== undefined;
    const syncStatus = isDeleted ? "DELETED" : "SYNCED";

    const rawNote = typeof row.note === "string" ? row.note.trim() : "";
    const payee = typeof row.payee === "string" ? row.payee.trim() : "";
    const note =
      payee && rawNote && !rawNote.toLowerCase().includes(payee.toLowerCase())
        ? `${payee} — ${rawNote}`.slice(0, 240)
        : (rawNote || payee || "Giao dịch di cư từ Archive").slice(0, 240);

    const isRefund = Boolean(row.is_refund);
    const excludeFromReports = Boolean(row.excluded_from_reports);

    if (kind === "transfer" || (legs.length >= 2 && kind !== "income" && kind !== "expense")) {
      const outLeg =
        legs.find((l) => typeof l.amount_minor === "number" && l.amount_minor < 0) ?? legs[0];
      const inLeg =
        legs.find((l) => typeof l.amount_minor === "number" && l.amount_minor > 0) ?? legs[1];
      const fromId =
        typeof outLeg?.account_id === "string" ? outLeg.account_id : fallbackAccountId;
      const toId =
        typeof inLeg?.account_id === "string" ? inLeg.account_id : fallbackAccountId;
      const amount = Math.round(
        Math.abs(
          Number(outLeg?.amount_minor ?? inLeg?.amount_minor ?? 0),
        ),
      );
      if (amount > 0 && fromId !== toId) {
        rawTransactions.push({
          id,
          type: "TRANSFER",
          amount,
          accountId: fromId,
          toAccountId: toId,
          categoryId: "chuyen-vi",
          note,
          occurredAt,
          syncStatus,
          updatedAt,
          ...(excludeFromReports ? { excludeFromReports: true } : {}),
        });
        continue;
      }
    }

    const primaryLeg = legs[0];
    const legMinor =
      typeof primaryLeg?.amount_minor === "number" ? Math.round(primaryLeg.amount_minor) : 0;
    const amount = Math.abs(legMinor);
    if (amount <= 0) continue;

    const accountId =
      typeof primaryLeg?.account_id === "string"
        ? primaryLeg.account_id
        : fallbackAccountId;
    const legacyCatId =
      typeof primaryLeg?.category_id === "string" ? primaryLeg.category_id : "";
    const catNameOrId = categoryNameById.get(legacyCatId) ?? legacyCatId;

    if (kind === "reconcile" || kind === "adjustment") {
      rawTransactions.push({
        id,
        type: "RECONCILE",
        amount,
        reconcileDelta: legMinor !== 0 ? legMinor : amount,
        accountId,
        categoryId: "khop-so-du",
        note,
        occurredAt,
        syncStatus,
        updatedAt,
      });
      continue;
    }

    const resolvedType: TransactionType =
      kind === "income" || (kind !== "expense" && legMinor > 0) ? "INCOME" : "EXPENSE";

    rawTransactions.push({
      id,
      type: resolvedType,
      amount,
      accountId,
      categoryId: mapLegacyCategoryToCoreId(catNameOrId || note, resolvedType),
      note,
      occurredAt,
      syncStatus,
      updatedAt,
      ...(isRefund ? { isRefund: true } : {}),
      ...(excludeFromReports ? { excludeFromReports: true } : {}),
    });
  }

  // Reconstruct budget limits & fixed commitments cleanly from archive tables
  const rawCommitments = Array.isArray(tables.recurringCommitments)
    ? tables.recurringCommitments
    : Array.isArray(tables.recurring_commitments)
      ? tables.recurring_commitments
      : [];
  const commitments: CommitmentItem[] = [];
  let fixedCommitmentsSum = 0;
  for (let i = 0; i < rawCommitments.length; i += 1) {
    const item = rawCommitments[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.is_archived) continue;
    const amt = typeof row.amount_minor === "number" ? Math.round(row.amount_minor) : 0;
    if (amt <= 0) continue;
    fixedCommitmentsSum += amt;
    commitments.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `arch-com-${i + 1}`,
      name:
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim().slice(0, 80)
          : `Khoản cố định ${i + 1}`,
      amountVnd: amt,
      dueDay:
        typeof row.due_day === "number" && row.due_day >= 1 && row.due_day <= 31
          ? Math.round(row.due_day)
          : 1,
      isPaid: Boolean(row.is_paid),
    });
  }

  const rawBudgets = Array.isArray(tables.monthlyBudgets) ? tables.monthlyBudgets : [];
  const categoryLimits: Record<string, number> = { ...DEFAULT_BUDGET_CONFIG.categoryLimits };
  for (const item of rawBudgets) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const limit = typeof row.limit_minor === "number" ? Math.round(row.limit_minor) : 0;
    if (limit <= 0) continue;
    const legacyCatId = typeof row.category_id === "string" ? row.category_id : "";
    const coreCatId = mapLegacyCategoryToCoreId(
      categoryNameById.get(legacyCatId) ?? legacyCatId,
      "EXPENSE",
    );
    categoryLimits[coreCatId] = limit;
  }

  const budgetSum = Object.values(categoryLimits).reduce((a, b) => a + b, 0);
  const budget: BudgetConfig = {
    ...DEFAULT_BUDGET_CONFIG,
    fixedCommitments:
      fixedCommitmentsSum > 0
        ? fixedCommitmentsSum
        : DEFAULT_BUDGET_CONFIG.fixedCommitments,
    monthlySpendingCap:
      budgetSum > 0 ? budgetSum : DEFAULT_BUDGET_CONFIG.monthlySpendingCap,
    categoryLimits,
    commitments,
    updatedAt: now,
  };

  const deduped = deduplicateTransactions(rawTransactions, []);
  const computedAccounts = computeAccountBalances(accounts, deduped.unique);

  return {
    snapshot: {
      version: 3,
      accounts: computedAccounts,
      transactions: deduped.unique,
      budget,
      updatedAt: now,
    },
    sourceFormat: "neon-archive-v1",
    sourceLabel: "Neon / Supabase Archive v1",
    importedAccounts: computedAccounts.length,
    importedTransactions: deduped.unique.length,
    skippedDuplicates: deduped.skippedCount,
    warnings,
  };
}

function parseFlutterFintechV1(
  root: Record<string, unknown>,
  now: number,
): MigrationImportResult {
  const warnings: string[] = [];
  const rawWallets = Array.isArray(root.wallets) ? root.wallets : [];
  const rawTxs = Array.isArray(root.transactions) ? root.transactions : [];
  const rawBudgets =
    root.budgets && typeof root.budgets === "object"
      ? (root.budgets as Record<string, unknown>)
      : {};

  const txEffectByWallet = new Map<string, number>();
  const transactions: Transaction[] = [];

  for (let i = 0; i < rawTxs.length; i += 1) {
    const item = rawTxs[i];
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `flutter-tx-${i + 1}`;
    const rawKind = foldAsciiLower(
      typeof row.kind === "string"
        ? row.kind
        : typeof row.type === "string"
          ? row.type
          : "expense",
    );
    const type: TransactionType =
      rawKind === "income"
        ? "INCOME"
        : rawKind === "transfer"
          ? "TRANSFER"
          : "EXPENSE";
    const amount = typeof row.amount === "number" ? Math.round(Math.abs(row.amount)) : 0;
    if (amount <= 0) continue;

    const walletId =
      typeof row.walletId === "string" && row.walletId.trim()
        ? row.walletId.trim()
        : "vcb";
    const toWalletId =
      typeof row.toWalletId === "string" && row.toWalletId.trim()
        ? row.toWalletId.trim()
        : undefined;
    const occurredAt = parseTimestampMs(row.timestamp ?? row.createdAt, now);
    const note =
      typeof row.note === "string" && row.note.trim()
        ? row.note.trim().slice(0, 240)
        : "Giao dịch từ Mobile Flutter";
    const rawCategory =
      typeof row.categoryId === "string"
        ? row.categoryId
        : typeof row.category === "string"
          ? row.category
          : note;
    const categoryId = mapLegacyCategoryToCoreId(rawCategory, type);

    if (type === "TRANSFER" && toWalletId && toWalletId !== walletId) {
      txEffectByWallet.set(walletId, (txEffectByWallet.get(walletId) ?? 0) - amount);
      txEffectByWallet.set(toWalletId, (txEffectByWallet.get(toWalletId) ?? 0) + amount);
      transactions.push({
        id,
        type: "TRANSFER",
        amount,
        accountId: walletId,
        toAccountId: toWalletId,
        categoryId: "chuyen-vi",
        note,
        occurredAt,
        syncStatus: "SYNCED",
        updatedAt: now,
      });
    } else if (type === "INCOME") {
      txEffectByWallet.set(walletId, (txEffectByWallet.get(walletId) ?? 0) + amount);
      transactions.push({
        id,
        type: "INCOME",
        amount,
        accountId: walletId,
        categoryId,
        note,
        occurredAt,
        syncStatus: "SYNCED",
        updatedAt: now,
      });
    } else {
      txEffectByWallet.set(walletId, (txEffectByWallet.get(walletId) ?? 0) - amount);
      transactions.push({
        id,
        type: "EXPENSE",
        amount,
        accountId: walletId,
        categoryId,
        note,
        occurredAt,
        syncStatus: "SYNCED",
        updatedAt: now,
      });
    }
  }

  // Flutter stores LIVE balance on each wallet, so back-compute initialBalance
  // so computeAccountBalances reproduces exact live wallet balances cleanly.
  const accounts: Account[] = rawWallets
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((row, idx) => {
      const id =
        typeof row.id === "string" && row.id.trim() ? row.id.trim() : `wallet-${idx + 1}`;
      const name =
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim().slice(0, 80)
          : `Ví ${idx + 1}`;
      const liveBalance =
        typeof row.balance === "number" && Number.isFinite(row.balance)
          ? Math.round(row.balance)
          : 0;
      const effect = txEffectByWallet.get(id) ?? 0;
      const initialBalance = liveBalance - effect;

      return {
        id,
        name,
        group: inferAccountGroupFromLegacy(name),
        currency: "VND" as CurrencyCode,
        initialBalance,
        currentBalance: liveBalance,
        isArchived: false,
        updatedAt: now,
      };
    });

  if (accounts.length === 0) {
    warnings.push("Không tìm thấy ví nào trong payload Flutter.");
  }

  const categoryLimits: Record<string, number> = { ...DEFAULT_BUDGET_CONFIG.categoryLimits };
  for (const [rawCat, rawVal] of Object.entries(rawBudgets)) {
    const val = typeof rawVal === "number" ? Math.round(rawVal) : 0;
    if (val <= 0) continue;
    const coreCatId = mapLegacyCategoryToCoreId(rawCat, "EXPENSE");
    categoryLimits[coreCatId] = Math.max(categoryLimits[coreCatId] ?? 0, val);
  }

  const budgetCap = Object.values(categoryLimits).reduce((a, b) => a + b, 0);
  const deduped = deduplicateTransactions(transactions, []);
  const computedAccounts = computeAccountBalances(accounts, deduped.unique);

  return {
    snapshot: {
      version: 3,
      accounts: computedAccounts,
      transactions: deduped.unique,
      budget: {
        ...DEFAULT_BUDGET_CONFIG,
        monthlySpendingCap:
          budgetCap > 0 ? budgetCap : DEFAULT_BUDGET_CONFIG.monthlySpendingCap,
        categoryLimits,
        updatedAt: now,
      },
      updatedAt: now,
    },
    sourceFormat: "flutter-fintech-v1",
    sourceLabel: "Flutter Mobile (mf_fintech_state_v1)",
    importedAccounts: computedAccounts.length,
    importedTransactions: deduped.unique.length,
    skippedDuplicates: deduped.skippedCount,
    warnings,
  };
}

export function mergeSnapshotsZeroLoss(
  base: LegacyMoneyFlowSnapshot,
  incoming: LegacyMoneyFlowSnapshot,
): {
  snapshot: LegacyMoneyFlowSnapshot;
  addedAccounts: number;
  addedTransactions: number;
  skippedDuplicates: number;
} {
  const existingAccIds = new Set(base.accounts.map((a) => a.id));
  const mergedAccounts = [...base.accounts];
  let addedAccounts = 0;

  for (const acc of incoming.accounts) {
    if (!existingAccIds.has(acc.id)) {
      existingAccIds.add(acc.id);
      mergedAccounts.push(acc);
      addedAccounts += 1;
    }
  }

  const deduped = deduplicateTransactions(incoming.transactions, base.transactions);
  const mergedTransactions = [...deduped.unique, ...base.transactions];

  const recomputedAccounts = computeAccountBalances(
    mergedAccounts,
    mergedTransactions,
  );

  const now = Date.now();
  return {
    snapshot: {
      version: 3,
      accounts: recomputedAccounts,
      transactions: mergedTransactions,
      budget: {
        ...base.budget,
        categoryLimits: {
          ...base.budget.categoryLimits,
          ...incoming.budget.categoryLimits,
        },
        updatedAt: now,
      },
      updatedAt: now,
    },
    addedAccounts,
    addedTransactions: deduped.unique.length,
    skippedDuplicates: deduped.skippedCount,
  };
}

export function migrateAnyLegacyPayload(
  rawJson: string,
  now = Date.now(),
): MigrationImportResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawJson);
  } catch {
    throw new Error("File JSON không hợp lệ.");
  }

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Cấu trúc file không phải đối tượng JSON hợp lệ.");
  }

  let root = decoded as Record<string, unknown>;

  // Support Flutter SharedPreferences wrapper keys ("flutter.mf_fintech_state_v1" or "mf_fintech_state_v1")
  const flutterWrapped =
    root["flutter.mf_fintech_state_v1"] ?? root["mf_fintech_state_v1"];
  if (typeof flutterWrapped === "string") {
    try {
      const inner = JSON.parse(flutterWrapped);
      if (inner && typeof inner === "object") {
        root = inner as Record<string, unknown>;
      }
    } catch {
      throw new Error("Chuỗi JSON bên trong mf_fintech_state_v1 bị lỗi cú pháp.");
    }
  }

  // 1. MoneyFlow Neon / Supabase Archive v1
  if (
    root.archive_version === 1 &&
    root.tables &&
    typeof root.tables === "object"
  ) {
    return parseNeonArchiveV1(root, now);
  }

  // 2. Flutter Mobile state (mf_fintech_state_v1)
  if (Array.isArray(root.wallets) && Array.isArray(root.transactions)) {
    return parseFlutterFintechV1(root, now);
  }

  // 3. Web Clean v2 / v3 Snapshot or Backup Wrapper
  const candidate =
    "snapshot" in root && root.snapshot ? root.snapshot : root;
  const parsed = LegacySnapshotSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      "Cấu trúc file backup không đúng chuẩn MoneyFlow v2/v3, Archive v1 hoặc Flutter Mobile.",
    );
  }

  const deduped = deduplicateTransactions(parsed.data.transactions, []);
  const computedAccounts = computeAccountBalances(
    parsed.data.accounts,
    deduped.unique,
  );
  const sourceFormat: MigrationSourceFormat =
    parsed.data.version === 3 ? "moneyflow-v3" : "moneyflow-v2";

  return {
    snapshot: {
      version: parsed.data.version,
      accounts: computedAccounts,
      transactions: deduped.unique,
      budget: parsed.data.budget,
      updatedAt: now,
    },
    sourceFormat,
    sourceLabel:
      sourceFormat === "moneyflow-v3" ? "MoneyFlow v3 Backup" : "MoneyFlow v2 Backup",
    importedAccounts: computedAccounts.length,
    importedTransactions: deduped.unique.length,
    skippedDuplicates: deduped.skippedCount,
    warnings: [],
  };
}
