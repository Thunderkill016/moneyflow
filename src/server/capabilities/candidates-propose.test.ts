import assert from "node:assert/strict";
import test from "node:test";

import type { PersistedInboxCandidate } from "../../lib/inbox/provenance.ts";
import { runCapability } from "./registry.ts";
import {
  candidatesProposeInputSchema,
  type CandidatesProposeOutput,
} from "./candidates-propose.ts";
import { FIXED_CONTEXT } from "./capability-test-helpers.test.ts";
import type { CapabilityDeps } from "./types.ts";

process.env.CAPABILITY_WRITE_CLIENT_IDS = "client-abc";

const VALID_INPUT = {
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands Coffee",
  note: "Cafe sáng",
  occurredOn: "2026-07-14",
  idempotencyKey: "3f6b6b6c-0c5f-4d3e-9a2a-2f0d2b7a1f01",
};

const AGENT_CONTEXT = { ...FIXED_CONTEXT, clientId: "client-abc" };

function persistedCandidate(overrides: Partial<PersistedInboxCandidate> = {}): PersistedInboxCandidate {
  return {
    id: "cand-1",
    kind: "expense",
    amount: 45_000,
    merchant: "Highlands Coffee",
    note: "Cafe sáng",
    occurredOn: "2026-07-14",
    source: "agent",
    confidence: "medium",
    status: "pending",
    createdAt: "2026-07-14T12:00:00.000Z",
    sourceExternalId: `agent|client-abc|${VALID_INPUT.idempotencyKey}`,
    ...overrides,
  };
}

function proposeDeps(candidate: PersistedInboxCandidate): CapabilityDeps {
  return {
    findAgentCandidate: async () => null,
    insertAgentCandidate: async (_viewerId, proposed) => ({
      ...proposed,
      id: candidate.id,
      createdAt: candidate.createdAt,
    }),
    planInboxCandidate: async () => ({
      status: "would_create",
      reason: "no_match",
      confidence: 0.9,
    }),
  };
}

test("candidates.propose input schema validates the proposal contract", () => {
  const parsed = candidatesProposeInputSchema.parse(VALID_INPUT);
  assert.equal(parsed.confidence, "medium");

  assert.throws(() =>
    candidatesProposeInputSchema.parse({ ...VALID_INPUT, idempotencyKey: undefined }),
  );
  assert.throws(() =>
    candidatesProposeInputSchema.parse({ ...VALID_INPUT, amount: -5 }),
  );
  assert.throws(() =>
    candidatesProposeInputSchema.parse({ ...VALID_INPUT, amount: 1.5 }),
  );
  assert.throws(() =>
    candidatesProposeInputSchema.parse({ ...VALID_INPUT, kind: "transfer" }),
  );
  assert.throws(() =>
    candidatesProposeInputSchema.parse({ ...VALID_INPUT, merchant: "" }),
  );
});

test("candidates.propose stores an agent-sourced candidate with client provenance", async () => {
  let inserted: PersistedInboxCandidate | null = null;
  const output = await runCapability("candidates.propose", VALID_INPUT, {
    context: AGENT_CONTEXT,
    deps: {
      findAgentCandidate: async () => null,
      insertAgentCandidate: async (_viewerId, proposed) => {
        inserted = proposed;
        return persistedCandidate();
      },
      planInboxCandidate: async () => ({
        status: "would_create",
        reason: "no_match",
        confidence: 0.9,
      }),
    },
  }) as CandidatesProposeOutput;

  assert.equal(output.deduplicated, false);
  assert.equal(output.candidate.id, "cand-1");
  assert.equal(output.candidate.source, "agent");
  assert.equal(output.oauthClientId, "client-abc");
  assert.equal(output.plan?.status, "would_create");

  assert.ok(inserted);
  const saved = inserted as unknown as PersistedInboxCandidate;
  assert.equal(saved.source, "agent");
  assert.equal(
    saved.sourceExternalId,
    `agent|client-abc|${VALID_INPUT.idempotencyKey}`,
  );
  assert.equal(saved.sourceLifecycleState, "pending");
  assert.equal(saved.status, "pending");
});

test("candidates.propose replays the same idempotency key without a second insert", async () => {
  let inserts = 0;
  const existing = persistedCandidate();
  const output = await runCapability("candidates.propose", VALID_INPUT, {
    context: AGENT_CONTEXT,
    deps: {
      findAgentCandidate: async (viewerId, externalId) => {
        assert.equal(viewerId, AGENT_CONTEXT.viewerId);
        assert.equal(externalId, `agent|client-abc|${VALID_INPUT.idempotencyKey}`);
        return existing;
      },
      insertAgentCandidate: async () => {
        inserts += 1;
        return existing;
      },
      planInboxCandidate: async () => ({
        status: "duplicate",
        reason: "source_external_id_match",
        confidence: 1,
        matchedCandidateId: "cand-1",
      }),
    },
  }) as CandidatesProposeOutput;

  assert.equal(inserts, 0);
  assert.equal(output.deduplicated, true);
  assert.equal(output.candidate.id, "cand-1");
  assert.equal(output.plan?.status, "duplicate");
});

test("candidates.propose degrades to plan:null when matching is unavailable", async () => {
  const output = await runCapability("candidates.propose", VALID_INPUT, {
    context: AGENT_CONTEXT,
    deps: {
      ...proposeDeps(persistedCandidate()),
      planInboxCandidate: async () => {
        throw new Error("rpc offline");
      },
    },
  }) as CandidatesProposeOutput;

  assert.equal(output.deduplicated, false);
  assert.equal(output.plan, null);
});

test("candidates.propose rejects callers without write authorization", async () => {
  await assert.rejects(
    () =>
      runCapability("candidates.propose", VALID_INPUT, {
        context: { ...FIXED_CONTEXT, clientId: "not-allowlisted" },
        deps: proposeDeps(persistedCandidate()),
      }),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "forbidden",
  );
});

test("candidates.propose allows first-party callers with no OAuth client claim", async () => {
  const output = await runCapability("candidates.propose", VALID_INPUT, {
    context: { ...FIXED_CONTEXT, viewerId: "first-party-viewer", clientId: null },
    deps: proposeDeps(persistedCandidate()),
  }) as CandidatesProposeOutput;
  assert.equal(output.deduplicated, false);
  assert.equal(output.oauthClientId, null);
});

test("write capabilities carry a tighter per-viewer+client rate limit", async () => {
  const { capabilityWriteLimiter, capabilityWriteRateKey } = await import(
    "../../lib/rate-limit.ts"
  );
  const context = {
    ...FIXED_CONTEXT,
    viewerId: "rate-limited-viewer",
    clientId: "client-abc",
  };
  capabilityWriteLimiter.reset(capabilityWriteRateKey(context.viewerId, context.clientId));

  const deps = proposeDeps(persistedCandidate());
  for (let i = 0; i < 20; i += 1) {
    await runCapability("candidates.propose", VALID_INPUT, { context, deps });
  }
  await assert.rejects(
    () => runCapability("candidates.propose", VALID_INPUT, { context, deps }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "rate_limited" &&
      "retryAfterMs" in error &&
      typeof (error as { retryAfterMs?: number }).retryAfterMs === "number",
  );
  capabilityWriteLimiter.reset(capabilityWriteRateKey(context.viewerId, context.clientId));
});
