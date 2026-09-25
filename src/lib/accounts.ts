import { z } from "zod";

export type AccountKind = "cash" | "bank" | "e_wallet" | "credit_card" | "savings";

/*
 * Identity palette mirrors the categories token vocabulary — the RPC
 * allowlists are the write boundary for both.
 */
export const ACCOUNT_COLORS = [
  "amber",
  "blue",
  "coral",
  "cyan",
  "green",
  "pink",
  "red",
  "violet",
] as const;
export type AccountColor = (typeof ACCOUNT_COLORS)[number];

export function isAccountColor(value: unknown): value is AccountColor {
  return (ACCOUNT_COLORS as readonly unknown[]).includes(value);
}

/*
 * Icons the account picker offers. The write path validates against this
 * list, so a name may only leave it when no stored row can still reference
 * it.
 */
export const PICKABLE_ACCOUNT_ICONS = [
  "wallet",
  "bank",
  "card",
  "piggy",
  "coins",
  "briefcase",
  "receipt",
  "spark",
] as const;
export const ACCOUNT_ICON_NAMES = [...PICKABLE_ACCOUNT_ICONS] as const;
export type AccountIconName = (typeof ACCOUNT_ICON_NAMES)[number];
export type PickableAccountIcon = (typeof PICKABLE_ACCOUNT_ICONS)[number];

export function isAccountIconName(value: unknown): value is AccountIconName {
  return (ACCOUNT_ICON_NAMES as readonly unknown[]).includes(value);
}

/* Kind-derived identity when no stored preference exists. */
export const ACCOUNT_KIND_DEFAULT_ICONS: Record<AccountKind, AccountIconName> = {
  cash: "wallet",
  bank: "bank",
  e_wallet: "spark",
  credit_card: "card",
  savings: "piggy",
};

export type AccountSummary = {
  id: string;
  name: string;
  kind: AccountKind;
  currencyCode: string;
  initialBalance: number;
  balance: number;
  isArchived: boolean;
  /** Stored picker choice; null falls back to the kind-derived icon. */
  icon: AccountIconName | null;
  /** Stored picker choice; null falls back to the kind-derived tone. */
  color: AccountColor | null;
};

const accountRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(["cash", "bank", "e_wallet", "credit_card", "savings"]),
  currency_code: z.string().length(3),
  initial_balance_minor: z.union([z.number(), z.string()]),
  is_archived: z.boolean(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

function safeMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error("invalid_money");
  return amount;
}

export function mapAccountRow(value: unknown, balanceValue?: unknown): AccountSummary {
  const row = accountRowSchema.parse(value);
  const initialBalance = safeMoney(row.initial_balance_minor);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    currencyCode: row.currency_code,
    initialBalance,
    balance: balanceValue === undefined ? initialBalance : safeMoney(balanceValue),
    isArchived: row.is_archived,
    // Out-of-palette stored values degrade to the kind-derived identity,
    // mirroring the categories guard rather than emitting an unowned tone.
    icon: isAccountIconName(row.icon) ? row.icon : null,
    color: isAccountColor(row.color) ? row.color : null,
  };
}

export type SaveAccountInput = {
  id?: string;
  name: string;
  kind: AccountKind;
  /** ISO 4217; only applied on create (currency is immutable after). */
  currencyCode?: string;
  initialBalance: number;
  icon?: AccountIconName | null;
  color?: AccountColor | null;
};

export const accountKindLabels: Record<AccountKind, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  e_wallet: "Ví điện tử",
  credit_card: "Thẻ tín dụng",
  savings: "Tiết kiệm",
};
