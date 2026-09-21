import { z } from "zod";

import { minorSchema, minor } from "../../lib/minor.ts";
import { buildSnapshotBasis } from "./basis.ts";
import type { AccountsWorkspace } from "../accounts.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
} from "./types.ts";
import { CapabilityError, basisSchema } from "./types.ts";

export const accountsListInputSchema = z.object({
  /** Include archived (hidden) accounts; default false. */
  includeArchived: z.boolean().default(false),
});

/*
 * Balances carry the account's own currency code — the workspace can hold
 * non-VND accounts, and stamping "VND" on them would be a lie. The snapshot
 * basis still explains where the figure comes from.
 */
const accountAmountSchema = z.object({
  amount: minorSchema,
  currency: z.string().length(3),
  basis: basisSchema,
});

export const accountsListOutputSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["cash", "bank", "e_wallet", "credit_card", "savings"]),
      currencyCode: z.string().length(3),
      isArchived: z.boolean(),
      initialBalance: accountAmountSchema,
      balance: accountAmountSchema,
    }),
  ),
});

export type AccountsListInput = z.input<typeof accountsListInputSchema>;
export type AccountsListOutput = z.infer<typeof accountsListOutputSchema>;

async function defaultLoad(): Promise<AccountsWorkspace> {
  const { getAccountsWorkspace } = await import("../accounts.ts");
  return getAccountsWorkspace();
}

export async function run(
  ctx: CapabilityContext,
  input: AccountsListInput,
  deps: CapabilityDeps = {},
): Promise<AccountsListOutput> {
  const workspace = await (deps.loadAccountsWorkspace ?? defaultLoad)();
  if (workspace.dataError) {
    throw new CapabilityError("internal", workspace.dataError);
  }

  const basis = buildSnapshotBasis({
    formula:
      "account_balances workspace snapshot; not derived from listed transactions",
    computedAt: ctx.now,
    capabilityVersion: "accounts.list@1",
  });

  const accounts = workspace.accounts
    .filter((account) => input.includeArchived === true || !account.isArchived)
    .map((account) => ({
      id: account.id,
      name: account.name,
      kind: account.kind,
      currencyCode: account.currencyCode,
      isArchived: account.isArchived,
      initialBalance: {
        amount: minor(account.initialBalance),
        currency: account.currencyCode,
        basis,
      },
      balance: {
        amount: minor(account.balance),
        currency: account.currencyCode,
        basis,
      },
    }));

  return { accounts };
}

export const definition: CapabilityDefinition<
  AccountsListInput,
  AccountsListOutput
> = {
  id: "accounts.list",
  version: "1",
  title: "Danh sách tài khoản / List accounts",
  description:
    "Danh sách tài khoản và số dư hiện tại / Accounts with current balances, from the workspace snapshot.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: accountsListInputSchema,
  output: accountsListOutputSchema,
  run,
};
