import { z } from "zod";

export const TRANSACTION_TYPES = [
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "RECONCILE",
] as const;
export const TransactionTypeSchema = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const SYNC_STATUSES = ["SYNCED", "PENDING", "DELETED"] as const;
export const SyncStatusSchema = z.enum(SYNC_STATUSES);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const TransactionSchema = z
  .object({
    id: z.string().min(1),
    type: TransactionTypeSchema,
    amount: z.number().finite().positive(),
    accountId: z.string().min(1),
    toAccountId: z.string().min(1).optional(),
    categoryId: z.string().min(1),
    note: z.string().max(240),
    occurredAt: z.number().int().nonnegative(),
    syncStatus: SyncStatusSchema,
    updatedAt: z.number().int().nonnegative(),
    reconcileDelta: z.number().finite().optional(),
  })
  .superRefine((tx, ctx) => {
    if (tx.type === "TRANSFER") {
      if (!tx.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "TRANSFER transactions require a destination account.",
        });
      } else if (tx.toAccountId === tx.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "Source and destination accounts must be different.",
        });
      }
    }
  });

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId: string;
  note: string;
  occurredAt: number;
  syncStatus: SyncStatus;
  updatedAt: number;
  /** Signed actual - calculated difference recorded on RECONCILE entries. */
  reconcileDelta?: number;
}

export interface Category {
  id: string;
  label: string;
  shortLabel: string;
  kind: "EXPENSE" | "INCOME" | "SYSTEM";
  color: string;
  isQuickTap: boolean;
}

export const CORE_CATEGORIES: readonly Category[] = [
  {
    id: "an-uong",
    label: "Ăn uống & Café",
    shortLabel: "Ăn uống",
    kind: "EXPENSE",
    color: "#f97316",
    isQuickTap: true,
  },
  {
    id: "di-chuyen",
    label: "Di chuyển & Xăng",
    shortLabel: "Di chuyển",
    kind: "EXPENSE",
    color: "#06b6d4",
    isQuickTap: true,
  },
  {
    id: "mua-sam",
    label: "Mua sắm",
    shortLabel: "Mua sắm",
    kind: "EXPENSE",
    color: "#ec4899",
    isQuickTap: true,
  },
  {
    id: "hoa-don",
    label: "Hóa đơn & Nhà",
    shortLabel: "Hóa đơn",
    kind: "EXPENSE",
    color: "#8b5cf6",
    isQuickTap: true,
  },
  {
    id: "giai-tri",
    label: "Giải trí & Du lịch",
    shortLabel: "Giải trí",
    kind: "EXPENSE",
    color: "#eab308",
    isQuickTap: true,
  },
  {
    id: "suc-khoe",
    label: "Sức khỏe",
    shortLabel: "Sức khỏe",
    kind: "EXPENSE",
    color: "#10b981",
    isQuickTap: true,
  },
  {
    id: "thu-nhap",
    label: "Lương & Thu nhập",
    shortLabel: "Thu nhập",
    kind: "INCOME",
    color: "#22c55e",
    isQuickTap: true,
  },
  {
    id: "tich-luy",
    label: "Tích lũy & Đầu tư",
    shortLabel: "Tích lũy",
    kind: "SYSTEM",
    color: "#5b4fe9",
    isQuickTap: true,
  },
  {
    id: "chuyen-vi",
    label: "Chuyển ví nội bộ",
    shortLabel: "Chuyển ví",
    kind: "SYSTEM",
    color: "#3b82f6",
    isQuickTap: false,
  },
  {
    id: "khop-so-du",
    label: "Khớp số dư",
    shortLabel: "Khớp dư",
    kind: "SYSTEM",
    color: "#64748b",
    isQuickTap: false,
  },
] as const;

export const QUICK_TAP_CATEGORIES: readonly Category[] = CORE_CATEGORIES.filter(
  (category) => category.isQuickTap,
);

const CATEGORY_MAP = new Map(
  CORE_CATEGORIES.map((category) => [category.id, category]),
);

export function getCategoryById(id: string): Category {
  return (
    CATEGORY_MAP.get(id) ?? {
      id,
      label: id,
      shortLabel: id,
      kind: "EXPENSE",
      color: "#64748b",
      isQuickTap: false,
    }
  );
}
