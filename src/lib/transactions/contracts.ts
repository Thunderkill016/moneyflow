export type TransactionKind = "expense" | "income";

/** Multi-entry expense lines. Present when one expense is split across categories. */
export type TransactionSplitLine = {
  categoryId: string;
  category: string;
  amount: number;
};

export type Transaction = {
  id: string;
  kind: TransactionKind | "transfer";
  categoryId: string;
  category: string;
  note: string;
  accountId: string;
  account: string;
  destinationAccountId?: string;
  destinationAccount?: string;
  isRecurringPayment?: boolean;
  /** Two or more lines when an expense is split across categories. */
  splits?: TransactionSplitLine[];
  amount: number;
  occurredOn: string;
  occurredAt: string;
  relativeDate: string;
};

export type AccountOption = {
  id: string;
  name: string;
  /** ISO 4217; defaults to VND when omitted by legacy callers. */
  currencyCode?: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: TransactionKind;
  icon: string | null;
  color: string | null;
};

type InboxApprovalCommand = {
  /** Present only when a reviewed Inbox candidate owns this create command. */
  inboxCandidateId?: string;
};

export type CreateTransactionInput = InboxApprovalCommand & {
  kind: TransactionKind;
  categoryId: string;
  accountId: string;
  amount: number;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
};

export type CreateTransferInput = InboxApprovalCommand & {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
};

/** One expense with two or more category lines, each stored in integer minor units. */
export type CreateSplitExpenseInput = {
  accountId: string;
  note: string;
  occurredOn: string;
  idempotencyKey: string;
  lines: { categoryId: string; amount: number }[];
};

export type UpdateMoneyTransactionInput = Omit<
  CreateTransactionInput,
  "idempotencyKey" | "inboxCandidateId"
> & {
  id: string;
};

export type UpdateTransferInput = Omit<
  CreateTransferInput,
  "idempotencyKey" | "inboxCandidateId"
> & {
  id: string;
  kind: "transfer";
};
