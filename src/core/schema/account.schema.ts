import { z } from "zod";

export const ACCOUNT_GROUPS = ["LIQUID", "INVESTMENT", "DEBT"] as const;
export const AccountGroupSchema = z.enum(ACCOUNT_GROUPS);
export type AccountGroup = z.infer<typeof AccountGroupSchema>;

export const CURRENCY_CODES = ["VND", "USD", "BTC", "XAU"] as const;
export const CurrencyCodeSchema = z.enum(CURRENCY_CODES);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Reference VND conversion multipliers for Net Worth aggregation across multi-currency wallets.
 */
export const VND_PER_UNIT: Readonly<Record<CurrencyCode, number>> = {
  VND: 1,
  USD: 25_400,
  BTC: 2_400_000_000,
  XAU: 92_000_000,
};

export const AccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  group: AccountGroupSchema,
  currency: CurrencyCodeSchema,
  initialBalance: z.number().finite(),
  currentBalance: z.number().finite(),
  isArchived: z.boolean(),
  updatedAt: z.number().int().nonnegative(),
});

export interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  currency: CurrencyCode;
  initialBalance: number;
  currentBalance: number;
  isArchived: boolean;
  updatedAt: number;
}

export function convertToVnd(amount: number, currency: CurrencyCode): number {
  return Math.round(amount * VND_PER_UNIT[currency]);
}
