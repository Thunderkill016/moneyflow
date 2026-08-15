# MoneyFlow Trust

**Status:** active parent program
**Execution state:** foundational trust checkpoints, Release Readiness Audit v1, RRB-01 and RRB-07 completed; remaining readiness work is boundary-gated; PBT-AC15 open
**Active role:** parent-program planner / release-boundary handoff
**Permission scope:** branch_write + read-only external evidence when available; provider/production writes require explicit scoped owner approval
**Owner:** Thunderkill016
**Last updated:** 2026-08-15
**Current main baseline:** `59da7ad28f88a4a227b83fa058c36dcf5e909fe4` (#394 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner-facing execution checklist is `docs/plans/active/README.md`; this packet owns the public-beta trust/release gate, not day-to-day task enumeration.

## Outcome

MoneyFlow is ready for a bounded public beta only when current repository behavior, current provider configuration and user-visible behavior agree; core financial truth is correct; user-owned data is recoverable/exportable; security/privacy boundaries are credible; real users can complete the daily ledger loop; controlled-beta support evidence exists; and the owner records PBT-AC15.

Release Readiness Audit v1 remains the immutable audit snapshot/release map. Post-audit blocker dispositions update current truth here, on the Current Work Board and in `CURRENT_PROJECT_MEMORY.md` without rewriting what the audit observed on its original base.

## Repository reconnaissance

### Current truth

- Functional MVP is released.
- Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted checkpoints with named limitations preserved.
- Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed.
- Phase E is paused; Phase F is not started.
- UI Slice 1 (#370), Slice 2 (#381) and amount-focus hotfix #383 are merged.
- Open-work reconciliation is complete.
- Release Readiness Audit v1 merged in #388.
- **RRB-01 closed in #391** with current authenticated rendered mixed-ledger proof.
- **RRB-07 closed in #394** with explicit browser evidence for MoneyFlow-owned Accessible Authentication mechanisms and a bounded shared-password-label repair.
- Remaining P1: RRB-04, RRB-05, RRB-06, RRB-09.
- Remaining P2: RRB-02, RRB-03, RRB-08.
- #40 and #174 remain intentional owner/provider decisions.
- PBT-AC15 remains open.
- No fully autonomous repository-only blocker remains in the known audit backlog; next execution depends on legitimate owner/provider/hosted/physical evidence becoming available.

Current release decision remains:

- **Public beta: BLOCKED**.
- **Controlled closed beta: BLOCKED on remaining P1 entry gates**.

### Current authority

- Owner checklist: `docs/plans/active/README.md`.
- Canonical audit snapshot: `docs/release/RELEASE_READINESS_AUDIT_V1.md`.
- Current implementation/trust memory: `docs/research/CURRENT_PROJECT_MEMORY.md`.
- Product law: `docs/product/PRINCIPLES.md`.
- Architecture: `ARCHITECTURE.md`.
- Risk/gates: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Configuration/provider contract: `docs/configuration.md`.

Historical packets/PR memory are provenance when a named claim needs them.

### Research rule for blocker remediation

Read current code/tests/provider evidence first. Research only the unresolved question for the bounded blocker. Use official/current sources when external standards matter.

Do not turn WCAG, ASVS, SSDF or legal/privacy material into a generic feature backlog. Provider, legal, production, browser and physical-device evidence remain separate layers.

## Specification

### Current problem

The audit found a strong functional core but external beta remains unsafe while provider/privacy/production entry gates and bounded external-evidence gaps are unresolved. RRB-01 and RRB-07 are closed and must not remain current blockers.

The program prevents five failure modes:

1. a proof gap being mislabeled as a product defect before execution;
2. one evidence layer silently proving another;
3. owner/provider/legal decisions being auto-resolved by an agent;
4. blocker remediation expanding into speculative feature or visual work;
5. autonomous execution inventing repository work after the legitimate repository-only queue is exhausted.

### Acceptance criteria

- [x] PBT-AC1–4 provider/repository baseline checkpoints accepted in completed evidence.
- [x] PBT-AC5–9 Secure checkpoints accepted with named provider-test limitations.
- [x] PBT-AC10–11 Recover archive/export/validation/restore contract accepted; hosted restore limitation preserved.
- [x] PBT-AC12 owner-observed physical-phone core-ledger run accepted.
- [~] PBT-AC13 duration requirement withdrawn by owner; no replacement streak/count exists.
- [x] PBT-AC14 historical daily-loop checkpoint accepted.
- [x] Release Readiness Audit v1 completed through #388.
- [x] RRB-01 authenticated rendered mixed-ledger financial-truth proof completed through #391.
- [x] RRB-07 MoneyFlow-owned Accessible Authentication browser proof completed through #394; provider-managed OAuth/Turnstile accessibility remains outside the claim.
- [ ] Remaining P1 release blockers cleared or explicitly handled only where policy permits.
- [ ] Remaining P2 proof/limitation decisions completed at their proper evidence layers.
- [ ] Controlled closed-beta evidence collected after P1 entry gates pass.
- [ ] PBT-AC15 owner public-beta go/no-go and accepted limitations recorded.

### Release status vocabulary

- **PASS** — current evidence directly supports the claim at the required layer.
- **BLOCKED** — evidence is missing/failed or a current defect/decision prevents release at the claimed level.
- **OWNER-ACCEPTED LIMITATION** — a real limitation is explicitly accepted by the owner where policy allows it; absence of evidence is never silently converted into acceptance.

### Financial and security constraints

- VND remains integer đồng.
- Transfers remain equal/opposite account movements, never income/expense.
- Never invent financial facts.
- Demo and authenticated stores remain explicit and separate.
- Authenticated user-owned data remains tenant-isolated by current RLS/ownership contracts.
- Provider writes require explicit scoped owner approval; this packet grants none.
- Operator contact/domain choice, legal decisions, accepted limitations, beta launch and PBT-AC15 remain owner boundaries.
- Browser accessibility evidence does not certify third-party provider challenge behavior or physical-device behavior.

### Out of scope

- New UI slice or visual territory.
- Phase E restart or Phase F start.
- Bank sync, AI advice, OCR product identity, household finance or full envelope budgeting.
- Unreviewed provider/production writes.
- Fixing unrelated/non-blocking findings merely because they are noticed during a blocker task.
- Inventing a repository task solely to preserve autonomous execution cadence.

## Implementation plan

| Order | Work | Purpose | Current state |
|---|---|---|---|
| 1 | amount focus + reconciliation + audit | establish current release truth | complete through #388/#389 |
| 2 | RRB-01 | authenticated mixed-ledger rendered financial truth | complete via #391 |
| 3 | RRB-07 | Accessible Authentication browser proof | complete via #394 |
| 4 | remaining P1 gates | provider/contact/legal/production evidence and decisions | **blocked by authority/read access** |
| 5 | RRB-02/03/08 | hosted/provider/physical proof or explicit limitation | **boundary-gated** |
| 6 | controlled closed beta | real-user core-loop/support evidence | blocked on P1 entry gates |
| 7 | PBT-AC15 | owner public-beta decision | blocked on readiness + beta evidence |

No later row authorizes itself merely because the prior row completes.

## Tasks

| ID | Task | Evidence / DoD | Status |
|---|---|---|---|
| TRUST-T1 | Provider Sync / P1 Secure | accepted completed records + named limitations | complete |
| TRUST-T2 | P2 Recover | versioned archive/export/validation/restore contract accepted | complete |
| TRUST-T3 | P3 Prove | owner-observed physical-phone core-ledger evidence | complete |
| TRUST-T4 | Repository resets + A0 + Phases A–D | merged/completed lifecycle records | complete |
| TRUST-T5 | UI Slice 1 + Slice 2 + focus hotfix | #370/#381/#383 | complete |
| TRUST-T6 | open-work reconciliation | GitHub/lifecycle truth reconciled | complete through #387 |
| TRUST-T7 | Release Readiness Audit v1 | canonical matrix + blocker backlog + beta plan | complete via #388 |
| TRUST-T8 | RRB-01 financial runtime proof | two-account authenticated rendered mixed-ledger contract | complete via #391 |
| TRUST-T9 | bounded post-audit readiness blockers | RRB-07 complete; remaining items require owner/provider/legal/hosted/physical evidence | active at boundary handoff |
| TRUST-T10 | controlled closed beta | real-user core-loop/support evidence | blocked on P1 entry gates |
| TRUST-T11 | PBT-AC15 owner decision | explicit go/no-go + accepted limitations | blocked on evidence |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-15 | audit/evaluator | blocker remediation | audit complete | #388 | nine RRB findings | execute RRB-01 |
| 2026-08-15 | RRB-01 delivery | accessibility proof | financial runtime proof complete | #391 final head `873f4d4d…`, CI #2492, CodeQL/Secret #1566 | remaining P1 gates need owner/provider/legal/read access | execute RRB-07 after lifecycle closeout |
| 2026-08-15 | RRB-07 delivery | release-boundary handoff | app-owned Accessible Authentication proof complete | #394 final head `35a31ba5…`, CI #2511, CodeQL/Secret #1584, 5/5 target cases first-run PASS | no fully autonomous repo-only blocker remains | resume at first authorized owner/provider/hosted/physical evidence boundary |

### Current permission boundary

Allowed now: focused repository reconnaissance; lifecycle/current-state maintenance; read-only external evidence where connected tooling exposes it; preparation for RRB-08/RRB-02/RRB-04/RRB-09 once their required evidence target/access exists.

Not implied: provider configuration writes, production financial-data mutation, database/Edge mutation, destructive account testing, deployment, operator domain/contact choice, legal decision, accepted limitation, physical-device observation not actually supplied, beta launch or final public-beta decision.

## Evaluation

### Current decision

**BLOCKED FOR PUBLIC BETA. BLOCKED FOR CONTROLLED CLOSED BETA ON REMAINING P1 ENTRY GATES.**

RRB-01 is PASS at the authenticated browser/runtime-composition layer. RRB-07 is PASS for MoneyFlow-owned browser authentication mechanisms. Neither substitutes for database/RLS/provider/production/physical evidence outside its scoped layer.

### Next allowed action

Do not start another repository-only implementation task merely to maintain momentum. Resume with the first legitimate boundary that becomes available: current physical-phone observation for RRB-08, an explicitly authorized hosted target for RRB-02, current provider/production read access for RRB-04/RRB-09, or the required owner/legal decision for RRB-03/RRB-05/RRB-06. Then implement only the bounded remediation supported by that evidence.
