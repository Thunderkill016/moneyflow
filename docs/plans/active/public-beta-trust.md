# MoneyFlow Trust

**Status:** active parent program
**Execution state:** P1 Secure, P2 Recover, P3 Prove, Repository Resets 1–2, A0 and Phases A–D completed; UI Slice 1 (#370) and Slice 2 (#381) merged; known amount-field focus hotfix pending; repository open-work reconciliation and Release Readiness Audit v1 not yet completed; PBT-AC15 open
**Active role:** parent-program planner
**Permission scope:** branch_write + provider_read; provider/production writes require explicit scoped owner approval
**Owner:** Thunderkill016
**Last updated:** 2026-08-14
**Current main baseline:** `2ffe63dc470ca84f4e782343238f2353a61ca89d` (#381 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner-facing execution checklist is `docs/plans/active/README.md`; this packet owns the public-beta trust/release gate, not day-to-day task enumeration.

## Outcome

MoneyFlow is ready for a bounded public beta only when current repository behavior, current provider configuration and user-visible behavior agree; core financial truth is correct; user-owned data is recoverable/exportable; security/privacy boundaries are credible; real users can complete the daily ledger loop; and the owner records PBT-AC15.

Historical checkpoint completion is evidence, not a substitute for a current release-readiness audit.

## Repository reconnaissance

### Current truth

- MoneyFlow has a released functional MVP.
- Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted checkpoints with named limitations preserved below.
- Repository Resets 1–2 and A0 Historical UI / Design Failure Review are completed.
- Phase A Current Reality / Authority Audit, Phase B product-experience research, Phase C Product Experience Architecture and Phase D Brand Strategy are completed.
- Phase E Creative Territories is paused: every proposed territory was owner-rejected, no territory is selected and rejected exploration is not visual authority.
- Phase F / broader Brand-Product Experience implementation is not started.
- UI Slice 1 merged as #370. UI Slice 2 merged as #381 and is no longer an active child packet.
- After #381, the owner identified one bounded presentation defect: the Manual Capture amount field can paint two blue focus contours. That defect is a hotfix, not a new redesign phase.
- GitHub still contains a substantial open issue/PR backlog; stale bodies cannot be treated as unfinished product truth until reconciled against current main.
- PBT-AC15 remains open. MoneyFlow is not public-beta ready by declaration alone.

### Current authority

- Owner checklist: `docs/plans/active/README.md`.
- Current implementation/trust memory: `docs/research/CURRENT_PROJECT_MEMORY.md`.
- Product law: `docs/product/PRINCIPLES.md`.
- Architecture: `ARCHITECTURE.md`.
- Risk/gates: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Configuration/provider contract: `docs/configuration.md`.

Historical completed packets and PR-memory records provide provenance only when a named claim needs it.

## Research

No new external research is required to reconcile this parent packet. Existing accepted research remains historical input. Release Readiness Audit v1 must research only unresolved current questions and must distinguish current evidence from historical evidence.

### Adoption review

No dependency, provider, architecture framework or new runtime service is adopted by this parent-program reconciliation.

## Specification

### Current problem

The functional MVP and trust checkpoints exist, but the repo is not yet in a state where the owner should make a public-beta decision. Three current gaps must be handled before that decision:

1. the known post-#381 focus defect must be fixed and proven;
2. stale/open GitHub work and lifecycle memory must be reconciled so old candidate work does not masquerade as current scope;
3. the current product must pass a release-readiness audit focused on real-user safety and operability, not feature count or visual polish.

### Acceptance criteria

- [x] PBT-AC1–4 provider/repository baseline checkpoints accepted in their completed evidence.
- [x] PBT-AC5–9 Secure checkpoints accepted, including named provider-test limitations rather than fabricated passes.
- [x] PBT-AC10–11 Recover archive/export/validation/restore contract accepted; hosted restore remains a named limitation because it was not executed against a live hosted account.
- [x] PBT-AC12 owner-observed physical-phone core-ledger run accepted.
- [~] PBT-AC13 duration requirement withdrawn by owner on 2026-08-12; no replacement streak/count exists.
- [x] PBT-AC14 historical daily-loop checkpoint accepted with its parked findings preserved.
- [ ] PBT-AC15 owner public-beta go/no-go and accepted limitations recorded from current readiness evidence.

PBT-AC14 does not mean every later UI defect is impossible. A newly observed current defect is handled as current evidence and must be resolved or explicitly classified before PBT-AC15.

### Financial and security constraints

- VND remains integer đồng.
- Transfers remain equal/opposite account movements, never income/expense.
- Never invent balances, dates, commitments, income, history or planning assumptions.
- Demo and authenticated stores remain explicit and separate.
- Authenticated user-owned data remains tenant-isolated by current RLS/ownership contracts.
- Archive/restore evidence must never be overstated beyond the environment actually proven.
- Provider writes require explicit scoped owner approval; this packet grants none.

### Out of scope

- New UI slice or visual territory.
- Phase E restart or Phase F start.
- Bank sync, AI advice, OCR product identity, household finance or full envelope budgeting.
- Unreviewed provider/production writes.
- Merging old open PRs merely to reduce backlog counts.

## Implementation plan

### Current sequence

| Order | Work | Purpose | Start condition |
|---|---|---|---|
| 1 | bounded amount-field focus hotfix | remove known current UI defect without reopening redesign | owner-observed defect exists |
| 2 | open-work / repository hygiene reconciliation | make GitHub, active packets, README and memory agree | hotfix may run independently, but readiness audit waits for clean authority |
| 3 | Release Readiness Audit v1 | classify current product as PASS / BLOCKED / OWNER-ACCEPTED LIMITATION | current main + lifecycle truth reconciled |
| 4 | blocker fixes | fix only audit-proven P0/P1/P2 gaps under bounded tasks | explicit owner authorization per blocker/task |
| 5 | controlled closed beta | collect real-user evidence | no unresolved stop-beta blocker |
| 6 | PBT-AC15 | owner public-beta decision | readiness + beta evidence available |

No later row authorizes itself merely because the prior row completes.

### Rollback / provenance

This packet is documentation authority only. Product fixes, provider writes and deployment each keep their own rollback/evidence boundary. Historical checkpoint details remain in completed packets and PR-memory records instead of being recopied here.

## Tasks

| ID | Task | Evidence / DoD | Status |
|---|---|---|---|
| TRUST-T1 | Provider Sync / P1 Secure | accepted completed records + named limitations | complete |
| TRUST-T2 | P2 Recover | versioned archive/export/validation/restore contract accepted; hosted restore limitation preserved | complete |
| TRUST-T3 | P3 Prove | owner-observed physical-phone core ledger evidence | complete |
| TRUST-T4 | Repository Resets 1–2 + A0 + Phases A–D | merged/completed lifecycle records | complete |
| TRUST-T5 | UI Slice 1 + Slice 2 | #370 and #381 merged | complete as slices; post-merge focus defect tracked separately |
| TRUST-T6 | amount-field focus hotfix | one accessible focus contour + exact-head UI evidence + bounded PR | pending |
| TRUST-T7 | open-work/repository hygiene | open issues/PRs classified against current main; stale lifecycle removed | pending |
| TRUST-T8 | Release Readiness Audit v1 | canonical readiness matrix + blocker backlog + closed-beta plan | pending |
| TRUST-T9 | readiness blocker remediation | only owner-authorized audit blockers resolved | blocked on TRUST-T8 |
| TRUST-T10 | controlled closed beta | real-user core-loop/support evidence | blocked on readiness |
| TRUST-T11 | PBT-AC15 owner decision | explicit go/no-go + accepted limitations | blocked on evidence |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | owner + evaluator | program | accepted checkpoints | P1/P2/P3 records and named limitations | public-beta decision still open | proceed through bounded later work only |
| 2026-08-13 | owner/evaluators | program | product/brand authority reconciled | Resets, A0, Phases A–D completed | Phase E candidates rejected; no new visual direction | owner-authorized bounded work only |
| 2026-08-14 | owner/evaluators | program | Slice 1/2 merged | #370 + #381 | post-merge double-focus defect observed; open-work backlog stale | fix bounded defect, reconcile repo, then audit readiness |

### Current permission boundary

Allowed now: branch/PR documentation reconciliation, the separately authorized bounded focus hotfix, focused research needed by a future readiness audit, and read-only provider inspection when current policy permits it.

Not standing-authorized: provider configuration writes, production financial-data mutation, database/Edge mutation, destructive account testing, merge, deployment or the final public-beta decision.

## Evaluation

### Current decision

**BLOCKED FOR PUBLIC BETA.** This is not a regression of the accepted historical checkpoints; it is the correct current state because the owner has not yet received a current release-readiness audit/closed-beta evidence package and PBT-AC15 remains open.

### Accepted limitations carried forward

- Hosted restore remains unexecuted against a live hosted account.
- Stale-AMR and real account-mismatch destructive/identity-risk provider probes remain intentionally unexecuted with deterministic fail-closed evidence accepted for the historical Secure checkpoint.
- Browser/emulation evidence is not physical-device evidence.
- PBT-AC13 duration/streak requirement remains withdrawn and must not be reintroduced.

### Remaining evidence before owner decision

- prove the focus hotfix;
- reconcile stale/open repo work;
- run Release Readiness Audit v1 on current main;
- resolve authorized readiness blockers;
- obtain controlled real-user evidence;
- record PBT-AC15 explicitly.
