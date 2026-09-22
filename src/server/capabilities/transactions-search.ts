import { z } from "zod";

import type { Transaction } from "../../lib/transactions/contracts.ts";
import { minorSchema, minor } from "../../lib/minor.ts";
import { normalizeSearchText } from "../../lib/search-text.ts";
import { buildBasis, validIsoDate } from "./basis.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
  FinanceWorkspace,
} from "./types.ts";
import { CapabilityError, basisSchema } from "./types.ts";

const dateSchema = z.string().refine(validIsoDate, "date must be YYYY-MM-DD");
export const transactionsSearchInputSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  kind: z.enum(["income", "expense", "transfer"]).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  text: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

const transactionSchema = z.object({
  id: z.string(),
  kind: z.enum(["income", "expense", "transfer"]),
  categoryId: z.string(),
  category: z.string(),
  note: z.string(),
  payee: z.string().optional(),
  accountId: z.string(),
  account: z.string(),
  destinationAccountId: z.string().optional(),
  destinationAccount: z.string().optional(),
  isRecurringPayment: z.boolean().optional(),
  reviewStatus: z.enum(["needs_review", "reviewed"]).optional(),
  splits: z.array(
    z.object({
      categoryId: z.string(),
      category: z.string(),
      amount: minorSchema,
    }),
  ).optional(),
  amount: minorSchema,
  occurredOn: z.string(),
  occurredAt: z.string(),
  relativeDate: z.string(),
});

export const transactionsSearchOutputSchema = z.object({
  items: z.array(transactionSchema),
  nextCursor: z.string().nullable(),
  basis: basisSchema,
});

export type TransactionsSearchInput = z.infer<typeof transactionsSearchInputSchema>;
export type TransactionsSearchOutput = z.infer<typeof transactionsSearchOutputSchema>;

async function defaultLoadFinanceWorkspace(): Promise<FinanceWorkspace> {
  const { getFinanceWorkspace } = await import("../finance.ts");
  return getFinanceWorkspace();
}

function encodeCursor(transaction: Transaction) {
  return Buffer.from(`${transaction.occurredAt}|${transaction.id}`, "utf8").toString("base64");
}

function decodeCursor(cursor: string) {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64").toString("utf8");
  } catch {
    throw new CapabilityError("invalid_input", "Cursor is invalid");
  }
  const separator = decoded.lastIndexOf("|");
  if (separator <= 0 || separator === decoded.length - 1) {
    throw new CapabilityError("invalid_input", "Cursor is invalid");
  }
  return { occurredAt: decoded.slice(0, separator), id: decoded.slice(separator + 1) };
}

function compareTransactions(left: Transaction, right: Transaction) {
  return right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id);
}

function withoutPendingKey(transaction: Transaction): Omit<Transaction, "pendingKey"> {
  const clean = { ...transaction };
  delete clean.pendingKey;
  return clean;
}

function toSearchItem(transaction: Transaction): TransactionsSearchOutput["items"][number] {
  const { splits, payee, ...rest } = withoutPendingKey(transaction);
  return {
    ...rest,
    ...(payee !== undefined ? { payee } : {}),
    ...(splits
      ? { splits: splits.map((line) => ({ ...line, amount: minor(line.amount) })) }
      : {}),
    amount: minor(rest.amount),
  };
}

export async function run(
  ctx: CapabilityContext,
  input: TransactionsSearchInput,
  deps: CapabilityDeps = {},
): Promise<TransactionsSearchOutput> {
  const workspace = await (deps.loadFinanceWorkspace ?? defaultLoadFinanceWorkspace)();
  if (input.from && input.to && input.from > input.to) {
    throw new CapabilityError("invalid_input", "Search range is reversed");
  }
  const matching = workspace.transactions
    .filter((transaction) => !input.from || transaction.occurredOn >= input.from)
    .filter((transaction) => !input.to || transaction.occurredOn <= input.to)
    .filter((transaction) => !input.kind || transaction.kind === input.kind)
    .filter((transaction) => !input.accountId || transaction.accountId === input.accountId)
    .filter((transaction) => !input.categoryId || transaction.categoryId === input.categoryId)
    .filter((transaction) => {
      if (!input.text) return true;
      const needle = normalizeSearchText(input.text);
      return [
        transaction.payee ?? "",
        transaction.note,
        transaction.category,
        transaction.account,
      ].some((value) => normalizeSearchText(value).includes(needle));
    })
    .sort(compareTransactions);

  let startIndex = 0;
  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    const index = matching.findIndex(
      (transaction) =>
        transaction.occurredAt === cursor.occurredAt && transaction.id === cursor.id,
    );
    if (index < 0) throw new CapabilityError("invalid_input", "Cursor is not valid for this search");
    startIndex = index + 1;
  }

  const page = matching.slice(startIndex, startIndex + input.limit);
  const last = page.at(-1);
  const range = input.from && input.to ? { from: input.from, to: input.to } : null;
  const basis = buildBasis({
    formula: "deterministic substring and field filters over the viewer ledger",
    range,
    included: matching,
    allTransactions: workspace.transactions,
    computedAt: ctx.now,
    capabilityVersion: "transactions.search@1",
    targetKind: input.kind === "income" || input.kind === "expense" ? input.kind : undefined,
  });

  return {
    items: page.map(toSearchItem),
    nextCursor: last && startIndex + page.length < matching.length ? encodeCursor(last) : null,
    basis,
  };
}

export const definition: CapabilityDefinition<
  TransactionsSearchInput,
  TransactionsSearchOutput
> = {
  id: "transactions.search",
  version: "1",
  title: "Tìm giao dịch / Transaction search",
  description: "Tìm giao dịch theo bộ lọc xác định / Deterministic ledger search with stable cursor paging.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: transactionsSearchInputSchema,
  output: transactionsSearchOutputSchema,
  run,
};
