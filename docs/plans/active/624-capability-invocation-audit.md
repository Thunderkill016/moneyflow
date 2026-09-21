# A5 — capability invocation/audit logging (spec research)

> Status: spec authored — awaiting owner review. This packet is docs-only; it authorizes no code.
>
> Issue: #624 · Track: megaplan A5 · Class: 3 (touches audit/security boundary decisions; spec itself is docs)

## Outcome

A bounded decision record answering megaplan A5: (1) whether capability invocations belong in the `/activity` feed, (2) whether a durable `capability_invocations` table is warranted now, and (3) what completes the already-decided D5 minimal structured log.

## Repository reconnaissance

### Current behavior

- `src/app/api/capabilities/[id]/route.ts:86` — on capability failure only: `console.error("[capability-api]", id, code)`. No viewer id, no duration, no success path.
- `src/app/api/mcp/route.ts` — no invocation logging at all.
- `runCapability` (`src/server/capabilities/registry.ts`) — the single execution seam both transports share; throws typed `CapabilityError`s; carries `ctx.viewerId`, `ctx.clientId`, capability `authorization`/`idempotent` metadata.
- Rate limiting happens per-transport before `runCapability` (`capabilityApiLimiter`, `capabilityWriteLimiter`) — pre-auth rejections never reach the registry.

### Relevant repository areas

- `src/server/capabilities/{registry,types,write-policy}.ts` — execution seam + write gate.
- `src/app/api/capabilities/[id]/route.ts`, `src/app/api/mcp/route.ts` — the two transports.
- `src/app/api/client-error/route.ts:51` — precedent: `console.error("[client-error]", JSON.stringify(report))` — server `console` is the platform log ingestion path.
- `src/lib/activity.ts`, `src/components/activity/` — the `/activity` workstream model (#592).
- `src/lib/inbox/provenance.ts`, `src/lib/inbox/agent-proposal.ts` — agent write provenance (`source: "agent"`, `agent|<client>|<key>` external ids).
- `supabase/migrations/` — hash-pinned archive/restore functions + account-deletion cascade contracts that enumerate user tables.

### Existing tests and constraints

- `check:migrations` pins every migration hash; new per-user tables ripple into archive export/restore functions and the account-deletion cascade — each is contract-tested.
- `p2-capability-transports.md` D5 (line 286): **minimal structured log (viewer, capability, status, ms — no payloads) already decided**; "needed for abuse forensics; no financial data logged".
- Inbox candidates carry their own durable provenance — write invocations leave a persistent artifact *already*; reads leave none.

### Similar implementation and recent history

- A4 spec (#618) and G5 implementation (#619) established: provenance rides existing fields, avoid schema surface that churns hash-pinned contracts.

### Open questions

1. Do read invocations need durable storage, or is platform log retention enough for current forensics needs?
2. Should `/activity` show security events at all?
3. If a table is deferred, what log schema keeps it migration-compatible later?

## Research

### Research scope and source selection

Three focused sources: the merged P2 transport packet (D5 decision context), the #592 activity-workstream packet (what `/activity` is for), and current transport code (what logging exists).

### Questions researched

- What did D5 decide, and what remains unimplemented?
- What trust domain does `/activity` serve — financial workstream or general audit?
- What does a durable invocation table actually cost in this repo?

### Sources

- `docs/plans/completed/p2-capability-transports.md` — D5 minimal structured log; D2 notes per-capability throttle/audit as a reason for the per-id route shape.
- `docs/plans/completed/592-activity-workstream.md` — `/activity` = "posted ledger facts, pending Inbox evidence and transaction review work as one chronological maintenance workstream".
- `src/app/api/capabilities/[id]/route.ts`, `src/app/api/mcp/route.ts` — current logging reality.

### Alternatives considered

- **A. Structured log only (complete D5)** — one JSON line per invocation on both transports. Forensics live in platform logs (Vercel). Zero schema surface.
- **B. `capability_invocations` table now** — durable audit, powers future "agent activity" UI and per-client usage. Costs RLS + tenant tests + archive/restore + deletion-cascade contract churn + retention policy, for a consumer that does not exist yet.
- **C. Surface invocations in `/activity`** — mixes security telemetry into a financial-truth surface.

### Research decision

**Adopt A now; defer B behind explicit triggers; reject C.**

- C rejected: `/activity` is a financial maintenance workstream, not an audit log. The product-visible trace of agent *action* already exists — proposed candidates appear in Inbox labeled "đề xuất bởi `<client>`". Read calls produce no product-meaningful event; showing "client X read budgets.status" adds noise without trust value.
- B deferred: no consumer exists. No third-party write client is allowlisted (`CAPABILITY_WRITE_CLIENT_IDS` unset by default). Platform logs cover today's forensics need (rate-limit abuse, error triage). When a consumer appears — connected-apps "last used", abuse forensics beyond log retention, or an audit export — the table becomes its own bounded packet because it touches the hash-pinned archive/restore and deletion contracts.
- A adopted: D5 was decided but only partially shipped — REST logs failures only, MCP logs nothing. Completing it is small and keeps the log schema compatible with the future table.

### Adoption review

No new dependency, no provider, no schema change. The structured line is `console` JSON — the repo's existing log-ingestion convention (`[client-error]` precedent).

## Specification

### Problem

Agent/API traffic now exists (`candidates.propose` writes; OAuth clients can hold tokens), but there is no uniform invocation record: success calls are invisible, MCP calls are invisible, and failures lack viewer/client/duration. Abuse forensics and "which client did what" are not answerable today. Meanwhile the durable-store and Activity-surface questions need a recorded decision before scope creeps.

### User stories

- As the owner, I can grep platform logs for `capability_invocation` and see who called what, from which transport, with what outcome, and how long it took — for reads and writes, success and failure.
- As a future implementer, I can promote the log line into a `capability_invocations` row without changing field semantics.
- As a user, `/activity` stays a financial workstream; my Inbox already shows what agents proposed.

### Acceptance criteria (for the future implementation, not this PR)

- S1 — every `runCapability` execution emits exactly one JSON log line with: `event: "capability_invocation"`, `capabilityId`, `version`, `viewerId`, `clientId` (nullable), `transport`, `authorization`, `status` (`ok`|`error`), `errorCode` when failed, `durationMs`.
- S2 — MCP and REST emit identical shapes; `transport` distinguishes them.
- S3 — no input arguments, output values, amounts, merchant names, tokens or headers are ever logged (input args can carry financial data — e.g. `candidates.propose` payload).
- S4 — pre-auth rejections (401/429) may log at route level with `viewerId: null` and the capability id from the URL/tool call; never log token material.
- S5 — the log helper is one shared module; transports do not re-implement field assembly.
- S6 — `/activity`, `activity.candidates` and the Inbox model are unchanged.
- S7 — no migration; deferral of `capability_invocations` is recorded with trigger conditions.

### Required states

- Log emission must not break the capability contract: logging failure is swallowed (never fails a user's call) — log-and-continue, matching `console` semantics anyway.
- Duration measured around `runCapability` only.

### Risks and counterexamples

- **Payload leakage** — the strongest risk; `candidates.propose` input contains amounts/notes. S3 forbids logging args; tests should assert the emitted line contains no input substrings.
- **Log volume** — reads are cheap lines; Vercel ingestion is per-plan. Volume risk is accepted; sampling is a later optimization if needed.
- **PII** — `viewerId`/`clientId` are opaque ids, already used in rate-limit keys; no email/name.

### Verification plan (future implementation)

- Unit tests on the helper: shape, field set, no-payload assertion, error-path emission.
- Registry-level test that a stubbed logger sees exactly one line per run for both success and `CapabilityError` paths.
- Transports unchanged beyond passing `transport` through the existing options seam.

## Implementation plan (future — NOT authorized by this PR)

- P-A (bounded, Class 1): `src/server/capabilities/invocation-log.ts` emitting the S1 JSON line via `console.info`; `runCapability` accepts `transport` in its options and wraps execution timing; both routes pass `"api"`/`"mcp"`; route-level 401/429 lines where the rejection precedes `runCapability`.
- P-B (separate packet when a consumer exists): `capability_invocations` table — requires RLS + tenant tests + archive/restore + account-deletion contract updates + retention policy. Triggers: first allowlisted third-party write client, connected-apps "last used" request, or forensics need beyond platform log retention.

## Tasks

- [x] Recon transports, registry, activity model, provenance, migration contracts.
- [x] Decide Activity surface (no), table (deferred), D5 completion (yes).
- [ ] Owner review: merge this PR = approve the decision record; P-A implementation remains separately authorized.

## Handoff record

### Current permission boundary

Docs-only spec. No code changed. Implementation of P-A requires owner authorization; P-B requires its own packet.

## Evaluation

### Acceptance evidence

Packet answers all three megaplan A5 questions with repository evidence: D5 gap is real (two transports, partial logging), Activity surface rejected on trust-domain grounds, table deferred with named cost drivers (hash-pinned archive/restore, deletion cascade) and named triggers.

### Research and adoption evidence

Decisions trace to merged packets (P2 D5, #592) and current code lines cited above — no external claims.

### Remaining limitations

- Platform log retention is finite; long-window forensics is knowingly deferred to P-B.
- Pre-auth rejection logging is best-effort (capability id may be absent for unknown-tool MCP calls).

## Delivery record

- Packet: `docs/plans/active/624-capability-invocation-audit.md` (this file).
- Tracking issue: #624.

## Owner decision points

- **D1 — `/activity` surface:** confirm invocations do NOT surface there; agent activity stays visible via Inbox provenance only.
- **D2 — durable table:** confirm deferral until a named trigger occurs.
- **D3 — P-A minimal log:** authorize or park the small implementation PR (shared helper + registry timing + transport labels).
