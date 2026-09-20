import { z } from "zod";

import type { FinanceWorkspace } from "../finance.ts";
import type { ReportsWorkspace } from "../reports.ts";
import type { LedgerTrustSummary } from "../../lib/ledger-trust.ts";
import type { CustomRangeInput, ReportPeriod } from "../../lib/reports.ts";

export type { FinanceWorkspace, ReportsWorkspace };

export type CapabilityAuthorization = "read" | "write:proposal" | "write:commit";

export type CapabilityContext = {
  viewerId: string;
  today: string;
  now: string;
};

export type CapabilityDeps = {
  loadFinanceWorkspace?: () => Promise<FinanceWorkspace>;
  loadReportsWorkspace?: (
    period: ReportPeriod,
    custom?: CustomRangeInput,
  ) => Promise<ReportsWorkspace>;
  loadLedgerTrust?: () => Promise<LedgerTrustSummary | null>;
};

export type CapabilityDefinition<I, O> = {
  id: string;
  version: "1";
  title: string;
  description: string;
  authorization: CapabilityAuthorization;
  sideEffects: "none";
  idempotent: true;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  run: (ctx: CapabilityContext, input: I, deps?: CapabilityDeps) => Promise<O>;
};

export const excludedReasonSchema = z.enum([
  "transfer",
  "outside_range",
  "needs_review",
  "other_kind",
  "other_currency",
]);

export const ledgerTrustSummarySchema = z.object({
  trustedThrough: z.string().nullable(),
  baseReconciliationThrough: z.string().nullable(),
  status: z.enum(["trusted", "trusted_limited", "blocked"]),
  reason: z.enum([
    "clean_reconciliation_boundary",
    "known_unresolved_work",
    "missing_clean_reconciliation",
    "no_active_accounts",
  ]),
  activeAccountCount: z.number().int(),
  cleanReconciledAccountCount: z.number().int(),
  pendingInboxCount: z.number().int(),
  needsReviewTransactionCount: z.number().int(),
  unreconciledAccountLegCount: z.number().int(),
  earliestUnresolvedOn: z.string().nullable(),
  coverageScope: z.literal("known_ledger_state_only"),
});

const rangeSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.literal("Asia/Ho_Chi_Minh"),
  })
  .nullable();

export const basisSchema = z.object({
  formula: z.string(),
  range: rangeSchema,
  included: z.object({
    count: z.number().int(),
    transactionIds: z.array(z.string()),
  }),
  excluded: z.array(
    z.object({
      reason: excludedReasonSchema,
      count: z.number().int(),
    }),
  ),
  trust: ledgerTrustSummarySchema.nullable(),
  computedAt: z.string(),
  capabilityVersion: z.string(),
});

export type Basis = z.infer<typeof basisSchema>;
export type ExplainedAmount = {
  amount: number;
  currency: "VND";
  basis: Basis;
};

export const explainedAmountSchema = z.object({
  amount: z.number().refine(Number.isSafeInteger, "amount must be a safe integer"),
  currency: z.literal("VND"),
  basis: basisSchema,
});

export type CapabilityErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "not_found"
  | "internal";

export class CapabilityError extends Error {
  readonly code: CapabilityErrorCode;

  constructor(code: CapabilityErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CapabilityError";
    this.code = code;
  }
}
