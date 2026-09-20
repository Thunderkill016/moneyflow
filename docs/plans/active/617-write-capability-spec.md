# A4 — write capabilities: agent writes enter as candidates (spec research)

**Status:** owner_review
**Execution state:** spec complete — implementation NOT authorized (gate G5)
**Active role:** human_owner
**Permission scope:** branch_write (docs only — no runtime change in this PR)
**Owner:** repository owner
**Issue:** [#617](https://github.com/Thunderkill016/moneyflow/issues/617); megaplan `docs/plans/active/megaplan-q4-2026.md` Track A item A4, gate G2 authorized research only
**Last updated:** 2026-09-20

Follow `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`. Class 3 — financial mutation surface. This packet is the researched specification; implementation ships in later bounded packets only after owner authorization at gate G5.

## Outcome

A third-party client (AI agent, script, integration) can propose ledger entries through the capability layer over the authenticated transports that already exist. Proposals enter as **Inbox candidates** — the same candidate/provenance/matching/approve path every other source uses — and reach the ledger only through explicit human approval in the app. No agent ever writes a posted transaction directly in v1.

## Repository reconnaissance

### Current behavior

- Mutations live in `src/app/actions/transactions.ts` as server actions calling RPCs `create_money_transaction`, `create_account_transfer`, `create_split_expense`. Every RPC already accepts `p_idempotency_key` (uuid) — database-level idempotency exists today.
- All mutation actions gate on `requireViewer()` and reject `viewer.isDemo`.
- Acquisition already converges on candidates: `CandidateSource` (`paste|csv|xlsx|pdf|manual|notification|email`) in `src/lib/inbox/candidate-store.ts`; `CandidateProvenance` in `src/lib/inbox/provenance.ts` carries `sourceExternalId`, `fingerprint`, `matchStatus` (`would_create|duplicate|suspected_transfer|invalid`), `matchConfidence`, `approvedTransactionId/approvedAt`, `appliedRuleId`.
- Import commits create candidates via RPC `commit_import_batch_candidates` (`src/app/actions/import-commit.ts`); candidates are planned via `plan_inbox_candidate` and approved through `src/app/actions/inbox-approval.ts` — approval is the only path to the ledger.
- Read capabilities `ledger.summary`, `transactions.search`, `reports.financial` are live on both transports (#610 Bearer API, #613 MCP). MCP tools are generated from `capabilityDefinitions` with hardcoded `readOnlyHint: true` annotations (`src/server/capabilities/mcp.ts`).
- Supabase OAuth server discovery advertises fixed scopes `openid profile email phone offline_access` — no custom scope mechanism; access tokens issued via OAuth carry a `client_id` claim (verify exact claim name at implementation; `getClaims` in `src/server/auth.ts` already returns the full claim set).
- Rate limiter `src/lib/rate-limit.ts`: 60 req / 60 s per viewer post-auth, per-client pre-auth.

### Relevant repository areas

- `src/server/capabilities/` — registry, types, runner, MCP tool generation.
- `src/lib/inbox/` — candidate store, provenance, source adapters.
- `src/app/actions/` — mutation actions and RPC call sites (the write seams to reuse).
- `supabase/migrations/` — `create_money_transaction` and candidate-commit RPC definitions.
- `src/server/auth.ts` — `getClaims` viewer seam (Bearer + cookie).

### Existing tests and constraints

- Product law: "Every source converges on one candidate/provenance/matching/ledger/reconciliation path. A provider/parser never creates a second source of financial truth." A direct agent→ledger write path would violate this unless explicitly authorized as a separate tier.
- `check:capabilities` regenerates/validates the capability manifest — new capabilities must be registered, not bolted on.
- RLS: all writes execute under the viewer's JWT; candidates are user-scoped rows — tenant isolation is inherited, but new RPC/RPC-args must keep `auth.uid()` scoping.

### Similar implementation and recent history

- P2 read transports (#610/#613/#612) — the seam this extends.
- Inbox candidate path — the exact convergence point this spec targets; `sourceExternalId` is already the dedup/idempotency hook used by imports.

### Open questions

- Exact JWT claim carrying the OAuth client id (expected `client_id`; confirm against a real issued token during implementation spike).
- Whether `CandidateSource` gains a single `"agent"` value or distinguishes `"api"` vs `"mcp"` — decision: single `"agent"` value, transport recorded in provenance metadata, not the enum.
- Supabase candidate-commit RPC signature for non-import sources — `commit_import_batch_candidates` is batch/import-shaped; a single-candidate create path may need a thin new RPC or a generalized one. Implementation packet decides; spec only requires "no second ledger-write path".

## Research

### Research scope and source selection

Bounded to: (a) the repository's own mutation/candidate machinery (primary evidence); (b) MCP specification tool annotations; (c) Supabase OAuth claim/scope surface; (d) OAuth 2.1 scope-narrowing norms. No product/provider selection needed — the design composes existing owned machinery.

### Questions researched

1. Can agent writes reuse idempotency? → Yes: `p_idempotency_key` on mutation RPCs and `sourceExternalId` + fingerprint matching on candidates.
2. Does Supabase OAuth support custom scopes like `write:transactions`? → No: fixed scope set; per-client narrowing must be app-side.
3. How do MCP clients learn a tool mutates? → Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) per MCP spec.
4. Where does "confirm before post" live? → Already exists: the Inbox approval step.

### Sources

- Repository code listed in reconnaissance (primary — all mutation/candidate/provenance facts verified against current `main`).
- MCP specification, tool annotations (`modelcontextprotocol.io` spec): `readOnlyHint=false` on mutating tools lets clients gate/auto-confirm appropriately; annotations are advisory UX hints, not security boundaries.
- Supabase Auth OAuth server docs/dashboard observation: scopes fixed to `openid profile email phone offline_access`; registered clients have `client_id` carried in issued token claims.
- RFC 9728 + OAuth 2.1 (already adopted in P2): audience/scope narrowing is the resource server's job when the AS can't express fine scopes.

### Alternatives considered

- **A. Direct `transactions.create` capability posting to ledger** — rejected for v1: creates a second ledger-write path bypassing candidate provenance/matching; violates product law; unbounded blast radius for a buggy or prompt-injected agent.
- **B. Agent writes as candidates (chosen)** — converges on the existing path; human approval is free (Inbox already exists); dedup/matching applies to agent input automatically; blast radius is candidate rows, which are reversible and never post without approval.
- **C. Two modes at once (candidate default + auto-post flag)** — deferred: useful later, but auto-post needs per-client trust policy, audit trail and tighter throttles that haven't earned their complexity yet. Recorded as future tier T2.

### Research decision

v1 write capabilities are **propose-only**: capabilities create candidates with provenance `source: "agent"` and `sourceExternalId` = client-supplied idempotency key. The ledger is reachable only via existing human approval. A future auto-post tier is specced as an option, gated on per-client policy + audit + owner flag.

### Adoption review

- License/security: no new dependency. Extends owned machinery.
- Rollback: removing a capability registration + a `CandidateSource` enum value is small and reversible; candidates already written remain valid rows.
- Privacy: candidate rows carry `oauth_client_id` provenance — user-visible "proposed by <client>" labeling becomes possible and is required by spec (S5).

## Specification

### Problem

Agents can read the ledger but cannot contribute to it. The product's own law says every source converges on candidates — so the missing piece is not "let agents post transactions" but "let agents propose transactions into the candidate path", which delivers the agent-write use case with human verification built in.

### User stories

- As a user with an MCP-connected agent, I want the agent to stage a transaction it inferred (e.g. from a notification it read) so that I can approve it in Inbox like any import.
- As a user, I want every agent-proposed candidate labeled with which client proposed it, so provenance is visible.
- As the owner, I want per-client write permission to be an explicit allowlist so a read-only consent grant can never write.

### Acceptance criteria (for the future implementation, not this PR)

- S1. New capability `candidates.propose` (v1 contract): input mirrors the transaction create schema minus auto-post; server assigns candidate with `source: "agent"`, `sourceExternalId` = caller idempotency key, provenance records `oauth_client_id` (null for cookie-session UI callers, n/a for demo).
- S2. Duplicate `sourceExternalId` from the same viewer+client returns the existing candidate, never a second row (idempotent retry safety).
- S3. Candidates from agents run through existing `plan_inbox_candidate`/matching — `duplicate`/`suspected_transfer` statuses surface to the proposer in the capability output.
- S4. Write capabilities carry MCP annotations `readOnlyHint: false`, `idempotentHint: true`, `destructiveHint: false`, `openWorldHint: false`; annotations become a per-capability registry field, not hardcoded.
- S5. Inbox UI labels agent-sourced candidates distinctly ("đề xuất bởi <client>"); Vietnamese copy, consistent with existing `SOURCE_LABELS`.
- S6. Write capability registration requires capability-level `write: true` metadata; transports reject unauthenticated/demo callers as today; a separate write rate limit (proposed 20 req / 60 s per viewer+client) applies.
- S7. Bearer/OAuth callers: write capabilities require the token's `client_id` to be on an app-side allowlist (table or env policy — implementation decision); cookie-session (first-party UI) callers are always allowed.
- S8. No direct-ledger write capability ships without a new owner-authorized packet (auto-post tier).

### Required states

- Candidate proposed → visible in Inbox → approved (posts) or rejected (removed) — reuse existing lifecycle `pending|posted|removed`.
- Error states: invalid input 400, unknown capability 404, unauthenticated 401, demo 403-equivalent result, write-not-allowed-for-client 403, rate-limited 429 with `Retry-After`.

### Risks and counterexamples

- Prompt-injected agent proposes garbage: blast radius = pending candidates user must approve; mitigated further by write allowlist + tight rate limit.
- Allowlist-as-env vs table: env is simpler, table enables per-client UX toggles later; spec leaves to implementation packet, both satisfy S7.
- `client_id` claim absent on cookie-session tokens: spec handles by treating missing claim as first-party (UI) caller — verify at spike.

### Verification plan (future implementation)

- Unit: schema validation, idempotent replay, provenance fields, annotation generation.
- Integration: Bearer token with non-allowlisted `client_id` → 403; allowlisted → candidate created; duplicate key → same candidate.
- RLS/tenant: cross-tenant candidate invisible.
- MCP: `tools/list` shows correct annotations; tool call creates candidate end-to-end via Inspector.

## Implementation plan (future — NOT authorized by this PR)

- P-A: extend `CandidateSource` + provenance write path for `"agent"` source; single-candidate create seam.
- P-B: `candidates.propose` capability + contract + registry `write`/`annotations` metadata.
- P-C: transport wiring (MCP annotation emit, API route write handling, write rate limiter, client allowlist).
- P-D: Inbox labeling (S5) + memory/docs.
- P-E (optional, separately gated): auto-post tier with per-client policy and audit trail.

## Tasks

Spec packet (this PR):

- [x] Recon mutation/candidate/provenance machinery.
- [x] Decide candidate-convergence over direct-ledger write.
- [x] Specify contract, provenance, idempotency, annotations, allowlist, rate limit.
- [x] Record deferred auto-post tier and open questions.

Implementation (separate PRs after G5): P-A → P-D above, each its own bounded slice.

## Handoff record

### Current permission boundary

This PR is docs-only: adds this packet + issue #617 + megaplan bookkeeping. No runtime code, no migration, no capability registration. Implementation begins only on explicit owner authorization (gate G5), then in the smallest coherent slices above.

## Evaluation

### Acceptance evidence

Packet satisfies megaplan A4 scope: idempotency (reused `p_idempotency_key`/`sourceExternalId`), provenance (`source: "agent"` + `oauth_client_id`), confirm-in-app vs auto-post (candidate model = confirm; auto-post deferred + gated), scope granularity (app-side `client_id` allowlist since Supabase scopes are fixed), audit trail (candidate provenance + existing lifecycle), throttle (dedicated write limiter), MCP annotations (per-capability metadata), owner flag (S8).

### Research and adoption evidence

All facts verified against current `main` code; MCP annotation semantics per MCP spec; Supabase scope surface per live discovery response recorded during P2 verification.

### Remaining limitations

- `client_id` claim name is asserted from Supabase OAuth conventions; must be confirmed against a real issued token in the implementation spike (recorded as open question).
- Auto-post tier intentionally underspecified — needs its own packet covering audit model, per-client policy UI and revocation semantics.

## Delivery record

- Branch `devin/write-cap-spec-a4`; docs-only PR.
- CI: knowledge contract + docs-policy checks expected; runtime gates not applicable (no code change).
- Awaits owner review; merge does NOT authorize implementation — gate G5 remains explicit.

## Owner decision points

- D1. Confirm "candidates-only" v1 scope (spec assumes yes — it is the product-law path).
- D2. `transactions.create` direct-post: keep parked (recommended) or schedule its own packet.
- D3. Allowlist mechanism preference: env/config (simpler) vs DB table (per-client toggles in A2 connected-apps UI later) — spec-compatible either way; DB table pairs naturally with A2.
