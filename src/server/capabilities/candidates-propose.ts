import { z } from "zod";

import { buildAgentSourceExternalId } from "../../lib/inbox/agent-proposal.ts";
import type { InboxDryRunResult } from "../../lib/inbox/provenance.ts";
import type { PersistedInboxCandidate } from "../../lib/inbox/provenance.ts";
import { minorSchema, minor } from "../../lib/minor.ts";
import { validIsoDate } from "./basis.ts";
import type {
  CapabilityContext,
  CapabilityDefinition,
  CapabilityDeps,
} from "./types.ts";
import { CapabilityError } from "./types.ts";

/*
 * Agent write access enters as an Inbox candidate — the same
 * candidate/provenance/matching/approve path every source converges on
 * (617 spec). Nothing here posts to the ledger; `plan_inbox_candidate` only
 * reports what approval would do, and approval stays a human action in-app.
 *
 * `idempotencyKey` becomes `sourceExternalId` namespaced by the OAuth client
 * via `buildAgentSourceExternalId` (`agent|<client|first-party>|<key>`) — the
 * same `|` convention source observations already use (`mf-src-v1|…`). The
 * candidate lifecycle and the approve-time `source_external_id_match`
 * duplicate guard therefore cover agent proposals for free, the proposing
 * client is recorded in durable provenance, and per-client dedup falls out
 * of plain equality.
 */

export const candidatesProposeInputSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  merchant: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
  occurredOn: z.string().refine(validIsoDate, "date must be YYYY-MM-DD"),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  /** Evidence the proposal rests on, stored as the candidate's raw snippet. */
  evidence: z.string().trim().max(2000).optional(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  /** Caller-chosen UUID; replayed calls return the existing candidate. */
  idempotencyKey: z.string().uuid(),
});

const proposedCandidateSchema = z.object({
  id: z.string(),
  kind: z.enum(["income", "expense", "transfer"]),
  amount: minorSchema,
  merchant: z.string(),
  note: z.string(),
  occurredOn: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.literal("agent"),
  sourceExternalId: z.string().nullable(),
  categoryId: z.string().nullable(),
  accountId: z.string().nullable(),
  createdAt: z.string(),
});

const proposalPlanSchema = z
  .object({
    status: z.enum([
      "would_create",
      "duplicate",
      "suspected_transfer",
      "invalid",
    ]),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
    matchedCandidateId: z.string().optional(),
    matchedTransactionId: z.string().optional(),
  })
  .nullable();

export const candidatesProposeOutputSchema = z.object({
  candidate: proposedCandidateSchema,
  /** OAuth client that carried this call; null for first-party sessions. */
  oauthClientId: z.string().nullable(),
  /** Dry-run match result; null when planning was unavailable. */
  plan: proposalPlanSchema,
  deduplicated: z.boolean(),
});

export type CandidatesProposeInput = z.infer<typeof candidatesProposeInputSchema>;
export type CandidatesProposeOutput = z.infer<typeof candidatesProposeOutputSchema>;

async function defaultFindAgentCandidate(
  viewerId: string,
  sourceExternalId: string,
): Promise<PersistedInboxCandidate | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const { INBOX_CANDIDATE_COLUMNS, mapCandidateRow } = await import(
    "../../lib/inbox/inbox-map.ts"
  );
  const supabase = await createClient();
  if (!supabase) throw new CapabilityError("internal", "Supabase unavailable");

  const { data, error } = await supabase
    .from("inbox_candidates")
    .select(INBOX_CANDIDATE_COLUMNS)
    .eq("user_id", viewerId)
    .eq("source", "agent")
    .eq("source_external_id", sourceExternalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new CapabilityError("internal", "Candidate lookup failed", { cause: error });
  return data ? mapCandidateRow(data) : null;
}

async function defaultInsertAgentCandidate(
  viewerId: string,
  candidate: PersistedInboxCandidate,
): Promise<PersistedInboxCandidate> {
  const { createClient } = await import("@/lib/supabase/server");
  const {
    candidateToInsertRow,
    INBOX_CANDIDATE_COLUMNS,
    mapCandidateRow,
  } = await import("../../lib/inbox/inbox-map.ts");
  const supabase = await createClient();
  if (!supabase) throw new CapabilityError("internal", "Supabase unavailable");

  const { data, error } = await supabase
    .from("inbox_candidates")
    .insert(candidateToInsertRow(candidate, viewerId))
    .select(INBOX_CANDIDATE_COLUMNS)
    .single();
  if (error || !data) {
    throw new CapabilityError("internal", "Candidate insert failed", { cause: error });
  }
  return mapCandidateRow(data);
}

async function defaultPlanInboxCandidate(
  candidateId: string,
): Promise<InboxDryRunResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const { parseInboxDryRunResult } = await import("../../lib/inbox/provenance.ts");
  const supabase = await createClient();
  if (!supabase) throw new CapabilityError("internal", "Supabase unavailable");

  const { data, error } = await supabase.rpc("plan_inbox_candidate", {
    p_candidate_id: candidateId,
  });
  if (error) {
    throw new CapabilityError("internal", "Candidate plan failed", { cause: error });
  }
  return parseInboxDryRunResult(data);
}

function toProposedCandidate(
  candidate: PersistedInboxCandidate,
): CandidatesProposeOutput["candidate"] {
  return {
    id: candidate.id,
    kind: candidate.kind,
    amount: minor(candidate.amount),
    merchant: candidate.merchant,
    note: candidate.note,
    occurredOn: candidate.occurredOn,
    status: candidate.status,
    confidence: candidate.confidence,
    source: "agent",
    sourceExternalId: candidate.sourceExternalId ?? null,
    categoryId: candidate.categoryId ?? null,
    accountId: candidate.accountId ?? null,
    createdAt: candidate.createdAt,
  };
}

async function safePlan(
  plan: (candidateId: string) => Promise<InboxDryRunResult>,
  candidateId: string,
): Promise<InboxDryRunResult | null> {
  try {
    return await plan(candidateId);
  } catch {
    // The proposal persisted; a failed dry-run must not mask that fact.
    return null;
  }
}

export async function run(
  ctx: CapabilityContext,
  input: CandidatesProposeInput,
  deps: CapabilityDeps = {},
): Promise<CandidatesProposeOutput> {
  const find = deps.findAgentCandidate ?? defaultFindAgentCandidate;
  const insert = deps.insertAgentCandidate ?? defaultInsertAgentCandidate;
  const plan = deps.planInboxCandidate ?? defaultPlanInboxCandidate;
  const externalId = buildAgentSourceExternalId(ctx.clientId, input.idempotencyKey);

  const existing = await find(ctx.viewerId, externalId);
  if (existing) {
    return {
      candidate: toProposedCandidate(existing),
      oauthClientId: ctx.clientId,
      plan: await safePlan(plan, existing.id),
      deduplicated: true,
    };
  }

  const candidate: PersistedInboxCandidate = {
    id: crypto.randomUUID(),
    kind: input.kind,
    amount: input.amount,
    merchant: input.merchant,
    note: input.note ?? "",
    occurredOn: input.occurredOn,
    source: "agent",
    confidence: input.confidence,
    status: "pending",
    categoryId: input.categoryId,
    accountId: input.accountId,
    rawSnippet: input.evidence,
    sourceExternalId: externalId,
    sourceLifecycleState: "pending",
    createdAt: ctx.now,
  };

  const inserted = await insert(ctx.viewerId, candidate);
  return {
    candidate: toProposedCandidate(inserted),
    oauthClientId: ctx.clientId,
    plan: await safePlan(plan, inserted.id),
    deduplicated: false,
  };
}

export const definition: CapabilityDefinition<
  CandidatesProposeInput,
  CandidatesProposeOutput
> = {
  id: "candidates.propose",
  version: "1",
  title: "Đề xuất giao dịch / Propose a transaction",
  description:
    "Đề xuất một giao dịch vào Inbox để người dùng duyệt / Propose a transaction as an Inbox candidate; it reaches the ledger only after in-app approval.",
  authorization: "write:proposal",
  sideEffects: "candidate_create",
  idempotent: true,
  input: candidatesProposeInputSchema,
  output: candidatesProposeOutputSchema,
  run,
};
