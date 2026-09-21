import { z } from "zod";

import { minor } from "../../lib/minor.ts";
import { buildSnapshotBasis, explainedAmount } from "./basis.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityDefinition,
} from "./types.ts";
import type { InboxListResult } from "../inbox.ts";
import { CapabilityError, explainedAmountSchema } from "./types.ts";

export const activityCandidatesInputSchema = z.object({});

export const activityCandidatesOutputSchema = z.object({
  pendingCount: z.number().int().nonnegative(),
  candidates: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["income", "expense", "transfer"]),
      amount: explainedAmountSchema,
      merchant: z.string(),
      note: z.string(),
      occurredOn: z.string(),
      source: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      status: z.literal("pending"),
      possibleDuplicate: z.boolean(),
      createdAt: z.string(),
    }),
  ),
});

export type ActivityCandidatesInput = z.infer<
  typeof activityCandidatesInputSchema
>;
export type ActivityCandidatesOutput = z.infer<
  typeof activityCandidatesOutputSchema
>;

async function defaultList(): Promise<InboxListResult> {
  const { listInboxFromServer } = await import("../inbox.ts");
  return listInboxFromServer();
}

export async function run(
  ctx: CapabilityContext,
  _input: ActivityCandidatesInput,
  deps: CapabilityDeps = {},
): Promise<ActivityCandidatesOutput> {
  const inbox = await (deps.listInbox ?? defaultList)();
  if (!inbox.ok) {
    throw new CapabilityError("internal", inbox.message);
  }

  const basis = buildSnapshotBasis({
    formula:
      "inbox_candidates rows with status = pending; server ordering (occurred_on desc, created_at desc) preserved",
    computedAt: ctx.now,
    capabilityVersion: "activity.candidates@1",
  });

  const candidates = inbox.candidates
    .filter((candidate) => candidate.status === "pending")
    .map((candidate) => ({
      id: candidate.id,
      kind: candidate.kind,
      amount: explainedAmount(minor(candidate.amount), basis),
      merchant: candidate.merchant,
      note: candidate.note,
      occurredOn: candidate.occurredOn,
      source: candidate.source,
      confidence: candidate.confidence,
      status: "pending" as const,
      possibleDuplicate: candidate.possibleDuplicate === true,
      createdAt: candidate.createdAt,
    }));

  return { pendingCount: candidates.length, candidates };
}

export const definition: CapabilityDefinition<
  ActivityCandidatesInput,
  ActivityCandidatesOutput
> = {
  id: "activity.candidates",
  version: "1",
  title: "Ứng viên Inbox / Pending candidates",
  description:
    "Các bản ghi đang chờ duyệt trong Inbox / Pending Inbox candidates awaiting human review.",
  authorization: "read",
  sideEffects: "none",
  idempotent: true,
  input: activityCandidatesInputSchema,
  output: activityCandidatesOutputSchema,
  run,
};
