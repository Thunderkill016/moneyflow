# MoneyFlow Trust

**Status:** active parent program
**Execution state:** P1 Secure, P2 Recover, P3 Prove, Repository Resets 1–2, A0 and Phases A–D completed; UI Slice 1 (#370), Slice 2 (#381), amount-focus hotfix #383, open-work reconciliation and Release Readiness Audit v1 (#388) completed; blocker remediation current; PBT-AC15 open
**Active role:** parent-program planner
**Permission scope:** branch_write + provider_read; provider/production writes require explicit scoped owner approval
**Owner:** Thunderkill016
**Last updated:** 2026-08-15
**Current main baseline:** `6459fdf7ed59119bf220993ff5c1637789323429` (#388 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner-facing execution checklist is `docs/plans/active/README.md`; this packet owns the public-beta trust/release gate, not day-to-day task enumeration.

## Outcome

MoneyFlow is ready for a bounded public beta only when current repository behavior, current provider configuration and user-visible behavior agree; core financial truth is correct; user-owned data is recoverable/exportable; security/privacy boundaries are credible; real users can complete the daily ledger loop; controlled-beta support evidence exists; and the owner records PBT-AC15.

Release Readiness Audit v1 is now completed evidence. Its result is the authority for blocker remediation, not permission to broaden product scope.

## Repository reconnaissance

### Current truth

- MoneyFlow has a released functional MVP.
- Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted checkpoints with named limitations preserved.
- Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed.
- Phase E Creative Territories is paused; Phase F is not started.
- UI Slice 1 (#370), Slice 2 (#381) and amount-focus hotfix #383 are merged.
- Open-work reconciliation is complete.
- Release Readiness Audit v1 merged in #388 as `6459fdf7…`.
- Audit decision: public beta BLOCKED; controlled closed beta BLOCKED on P1 entry gates.
- P1 blocker set: RRB-01, RRB-04, RRB-05, RRB-06, RRB-09.
- P2 evidence/decision gaps: RRB-02, RRB-03, RRB-07, RRB-08.
- #40 and #174 remain intentional owner/provider decisions.
- PBT-AC15 remains open.

### Current authority

- Owner checklist: `docs/plans/active/README.md`.
- Canonical audit: `docs/release/RELEASE_READINESS_AUDIT_V1.md`.
- Current implementation/trust memory: `docs/research/CURRENT_PROJECT_MEMORY.md`.
- Product law: `docs/product/PRINCIPLES.md`.
- Architecture: `ARCHITECTURE.md`.
- Risk/gates: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Configuration/provider contract: `docs/configuration.md`.

Historical completed packets and PR-memory records provide provenance only when a named claim needs it.

## Research rule for blocker remediation

Read current code/tests/provider evidence first. Research only the unresolved question for the bounded blocker.

Do not turn WCAG, ASVS, SSDF or legal/privacy sources into a generic feature backlog. Apply only controls/questions that materially affect the release claim under review.

Provider, legal and production evidence remain separate from repository/browser evidence.

## Specification

### Current problem

The audit found that the functional core is materially stronger than its release evidence package, but external beta remains unsafe to start while P1 proof/provider/privacy/production gates are unresolved.

The program must prevent four failure modes:

1. a proof gap being mislabeled as a product bug before execution;
2. one evidence layer silently proving another;
3. owner/provider/legal decisions being auto-resolved by an agent;
4. blocker remediation expanding into speculative feature or visual work.

### Acceptance criteria

- [x] PBT-AC1–4 provider/repository baseline checkpoints accepted in their completed evidence.
- [x] PBT-AC5–9 Secure checkpoints accepted with named provider-test limitations.
- [x] PBT-AC10–11 Recover archive/export/validation/restore contract accepted; hosted restore limitation preserved.
- [x] PBT-AC12 owner-observed physical-phone core-ledger run accepted.
- [~] PBT-AC13 duration requirement withdrawn by owner; no replacement streak/count exists.
- [x] PBT-AC14 historical daily-loop checkpoint accepted.
- [x] Release Readiness Audit v1 completed through #388.
- [ ] P1 release blockers cleared or explicitly handled only where policy permits.
- [ ] Controlled closed-beta evidence collected after entry gates pass.
- [ ] PBT-AC15 owner public-beta go/no-go and accepted limitations recorded.

### Release status vocabulary

Every release-gate row ends in exactly one of:

- **PASS** — current evidence directly supports the claim at the required layer.
- **BLOCKED** — evidence is missing/failed or a current defect/decision prevents release at the claimed level.
- **OWNER-ACCEPTED LIMITATION** — a real limitation is explicitly accepted by the owner where policy allows it; absence of evidence is never silently converted into this status.

### Financial and security constraints

- VND remains integer đồng.
- Transfers remain equal/opposite account movements, never income/expense.
- Never invent financial facts.
- Demo and authenticated stores remain explicit and separate.
- Authenticated user-owned data remains tenant-isolated by current RLS/ownership contracts.
- Provider writes require explicit scoped owner approval; this packet grants none.
- Operator contact/domain choice, legal decisions, accepted limitations, beta launch and PBT-AC15 remain owner boundaries.

### Out of scope

- New UI slice or visual territory.
- Phase E restart or Phase F start.
- Bank sync, AI advice, OCR product identity, household finance or full envelope budgeting.
- Unreviewed provider/production writes.
- Fixing non-blocking findings merely because they were noticed during a blocker task.

## Implementation plan

| Order | Work | Purpose | Current state |
|---|---|---|---|
| 1 | amount-field focus hotfix | remove known bounded presentation defect | complete via #383 |
| 2 | open-work/repository reconciliation | make GitHub + lifecycle truth agree | complete through #384–#387 |
| 3 | Release Readiness Audit v1 | canonical readiness matrix + blocker backlog + beta plan | complete via #388 |
| 4 | RRB-01 | prove authenticated mixed-ledger rendered financial truth | **current** |
| 5 | remaining P1 blockers | provider/contact/legal/production evidence and decisions | blocked/queued by authority |
| 6 | P2 evidence/limitations | close bounded evidence gaps or explicit accepted limitations | queued |
| 7 | controlled closed beta | collect real-user core-loop/support evidence | blocked on P1 entry gates |
| 8 | PBT-AC15 | owner public-beta decision | blocked on readiness + beta evidence |

No later row authorizes itself merely because the prior row completes.

## Tasks

| ID | Task | Evidence / DoD | Status |
|---|---|---|---|
| TRUST-T1 | Provider Sync / P1 Secure | accepted completed records + named limitations | complete |
| TRUST-T2 | P2 Recover | versioned archive/export/validation/restore contract accepted | complete |
| TRUST-T3 | P3 Prove | owner-observed physical-phone core-ledger evidence | complete |
| TRUST-T4 | Repository Resets 1–2 + A0 + Phases A–D | merged/completed lifecycle records | complete |
| TRUST-T5 | UI Slice 1 + Slice 2 | #370 and #381 merged | complete |
| TRUST-T6 | amount-field focus hotfix | one accessible focus contour + exact-head UI evidence | complete via #383 |
| TRUST-T7 | open-work/repository hygiene | historical work reconciled; owner decisions preserved | complete through #387 |
| TRUST-T8 | Release Readiness Audit v1 | canonical readiness matrix + blocker backlog + beta plan | complete via #388 |
| TRUST-T9 | readiness blocker remediation | only audit-proven bounded blockers resolved | **active; RRB-01 first** |
| TRUST-T10 | controlled closed beta | real-user core-loop/support evidence | blocked on P1 entry gates |
| TRUST-T11 | PBT-AC15 owner decision | explicit go/no-go + accepted limitations | blocked on evidence |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | owner + evaluator | program | accepted checkpoints | P1/P2/P3 records and named limitations | public-beta decision open | bounded later work only |
| 2026-08-15 | agent/evidence gates | program | reconciliation complete | #383–#387 | release readiness not yet audited | run audit |
| 2026-08-15 | audit/evaluator | blocker remediation | audit complete | #388 + canonical release audit | P1/P2 blockers remain | execute RRB-01 |

### Current permission boundary

Allowed now: RRB-01 branch/PR implementation and browser verification; focused research; repository verification; read-only provider inspection only where current tooling/permission permits it.

Not implied: provider configuration writes, production financial-data mutation, database/Edge mutation, destructive account testing, deployment, operator domain/contact choice, legal decision, accepted limitation, beta launch or final public-beta decision.

## Evaluation

### Current decision

**BLOCKED FOR PUBLIC BETA. BLOCKED FOR CONTROLLED CLOSED BETA ON P1 ENTRY GATES.**

The audit did not find evidence that core ledger arithmetic, transfer neutrality, tenant isolation or local archive/restore contracts are broadly broken. Release risk is concentrated in bounded runtime proof plus provider/privacy/production/physical evidence and decisions.

### Next allowed action

Execute RRB-01 on current main. If the browser proof exposes a real product defect, classify and fix it as a bounded release blocker with appropriate evidence; do not silently adjust expected values to make the test pass.
