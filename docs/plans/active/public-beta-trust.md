# MoneyFlow Trust

**Status:** active parent program
**Execution state:** foundational trust checkpoints, Release Readiness Audit v1, RRB-01 and RRB-07 completed; RRB-08 owner-authorized via #398, repository preparation complete via #399, and real-phone observation pending; remaining P1 blockers require owner/provider/legal/read-access; PBT-AC15 open
**Active role:** parent-program planner
**Permission scope:** branch_write + read-only external evidence when available + owner-observed physical-device validation; provider/production writes require explicit scoped owner approval
**Owner:** Thunderkill016
**Last updated:** 2026-08-15
**Current main baseline:** `e8a4a10e47cdd90b993eadd034fe97593b271adb` (#399 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner-facing execution checklist is `docs/plans/active/README.md`; this packet owns the public-beta trust/release gate, not day-to-day task enumeration.

## Outcome

MoneyFlow is ready for a bounded public beta only when current repository behavior, current provider configuration and user-visible behavior agree; core financial truth is correct; user-owned data is recoverable/exportable; security/privacy boundaries are credible; real users can complete the daily ledger loop; controlled-beta support evidence exists; and the owner records PBT-AC15.

Release Readiness Audit v1 remains the release map. Post-audit blocker dispositions update current truth without reopening speculative scope.

## Repository reconnaissance

### Current truth

- Functional MVP is released.
- Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted checkpoints with named limitations preserved.
- Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed.
- Phase E is paused; Phase F is not started.
- UI Slice 1 (#370), Slice 2 (#381), amount-focus hotfix #383 and bounded auth semantic repair #394 are merged.
- Open-work reconciliation is complete.
- Release Readiness Audit v1 merged in #388.
- **RRB-01 closed in #391** with current authenticated rendered mixed-ledger proof.
- **RRB-07 closed in #394** with explicit MoneyFlow-owned WCAG 2.2 Accessible Authentication browser evidence and one bounded shared password-field semantic repair.
- **RRB-08 is active via issue #398.** PR #399 merged the bounded real-phone runbook/evidence contract; completion still requires direct real-phone observation and cannot be inferred from browser/emulation evidence.
- Remaining P1: RRB-04, RRB-05, RRB-06, RRB-09.
- Remaining queued P2 after RRB-08: RRB-02, RRB-03.
- #40 and #174 remain intentional owner/provider decisions.
- PBT-AC15 remains open.

Current release decision remains:

- **Public beta: BLOCKED**.
- **Controlled closed beta: BLOCKED on remaining P1 entry gates**.

### Current authority

- Owner checklist: `docs/plans/active/README.md`.
- Active RRB-08 packet: `docs/plans/active/rrb-08-physical-device-proof.md`.
- Canonical audit: `docs/release/RELEASE_READINESS_AUDIT_V1.md`.
- Current implementation/trust memory: `docs/research/CURRENT_PROJECT_MEMORY.md`.
- Product law: `docs/product/PRINCIPLES.md`.
- Architecture: `ARCHITECTURE.md`.
- Risk/gates: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Configuration/provider contract: `docs/configuration.md`.

Historical packets/PR memory are provenance when a named claim needs them.

### Research rule for blocker remediation

Read current code/tests/provider evidence first. Research only the unresolved question for the bounded blocker. Use official/current sources when external standards matter.

Do not turn WCAG, ASVS, SSDF or legal/privacy material into a generic feature backlog. Provider, legal, production, browser and physical-device evidence remain separate layers.

For RRB-08, Apple Safari Web Inspector and Chrome DevTools remote debugging may be used as optional diagnostics on connected physical devices. Simulator/emulation output remains a different evidence layer and cannot close RRB-08.

## Specification

### Current problem

The audit found a strong functional core but external beta remains unsafe while provider/privacy/production entry gates and owner-assisted evidence gaps are unresolved. RRB-01 and RRB-07 are closed. RRB-08 is explicitly authorized and prepared, but still lacks current real-phone evidence.

The program prevents four failure modes:

1. a proof gap being mislabeled as a product defect before execution;
2. one evidence layer silently proving another;
3. owner/provider/legal decisions being auto-resolved by an agent;
4. blocker remediation expanding into speculative feature or visual work.

### Acceptance criteria

- [x] PBT-AC1–4 provider/repository baseline checkpoints accepted in completed evidence.
- [x] PBT-AC5–9 Secure checkpoints accepted with named provider-test limitations.
- [x] PBT-AC10–11 Recover archive/export/validation/restore contract accepted; hosted restore limitation preserved.
- [x] PBT-AC12 owner-observed physical-phone core-ledger run accepted historically.
- [~] PBT-AC13 duration requirement withdrawn by owner; no replacement streak/count exists.
- [x] PBT-AC14 historical daily-loop checkpoint accepted.
- [x] Release Readiness Audit v1 completed through #388.
- [x] RRB-01 authenticated rendered mixed-ledger financial-truth proof completed through #391.
- [x] RRB-07 MoneyFlow-owned Accessible Authentication browser proof completed through #394; provider-managed OAuth/Turnstile claims remain separate.
- [ ] RRB-08 current physical-device proof completed through #398 against the current release candidate; #399 prepared the runbook but historical PBT-AC12 alone is insufficient because it predates recent UI/auth changes.
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
- Physical-device screenshots/notes must not expose passwords, OTPs, tokens, raw bank statements, full archives or private financial data.

### Out of scope

- New UI slice or visual territory.
- Phase E restart or Phase F start.
- Bank sync, AI advice, OCR product identity, household finance or full envelope budgeting.
- Unreviewed provider/production writes.
- Fixing unrelated/non-blocking findings merely because they are noticed during a blocker task.
- Replacing physical-device observation with browser emulation/simulator output.

## Implementation plan

| Order | Work | Purpose | Current state |
|---|---|---|---|
| 1 | amount focus + reconciliation + audit | establish current release truth | complete through #388/#389 |
| 2 | RRB-01 | authenticated mixed-ledger rendered financial truth | complete via #391 |
| 3 | RRB-07 | Accessible Authentication browser proof | complete via #394 |
| 4 | RRB-08 | current physical-phone release smoke | **active via #398; runbook merged via #399, real-phone observation pending** |
| 5 | remaining P1 gates | provider/contact/legal/production evidence and decisions | **blocked by authority/read access** |
| 6 | RRB-02/03 | hosted/provider proof or explicit limitation | **queued by authority/evidence availability** |
| 7 | controlled closed beta | real-user core-loop/support evidence | blocked on P1 entry gates |
| 8 | PBT-AC15 | owner public-beta decision | blocked on readiness + beta evidence |

No later row authorizes itself merely because a prior row completes.

## Tasks

| ID | Task | Evidence / DoD | Status |
|---|---|---|---|
| TRUST-T1 | Provider Sync / P1 Secure | accepted completed records + named limitations | complete |
| TRUST-T2 | P2 Recover | versioned archive/export/validation/restore contract accepted | complete |
| TRUST-T3 | P3 Prove | owner-observed physical-phone core-ledger evidence | complete historical checkpoint |
| TRUST-T4 | Repository resets + A0 + Phases A–D | merged/completed lifecycle records | complete |
| TRUST-T5 | UI Slice 1 + Slice 2 + focus hotfix | #370/#381/#383 | complete |
| TRUST-T6 | open-work reconciliation | GitHub/lifecycle truth reconciled | complete through #387 |
| TRUST-T7 | Release Readiness Audit v1 | canonical matrix + blocker backlog + beta plan | complete via #388 |
| TRUST-T8 | RRB-01 financial runtime proof | two-account authenticated rendered mixed-ledger contract | complete via #391 |
| TRUST-T9 | RRB-07 accessible-auth proof | five scoped current-auth browser cases + bounded shared-field repair | complete via #394 |
| TRUST-T10 | RRB-08 current physical-device proof | bounded real-phone smoke records device/browser/mode/pass-fail/defects | active via #398; prep complete #399, physical observation pending |
| TRUST-T11 | remaining readiness blockers | RRB-04/05/06/09 + RRB-02/03 only at their proper boundaries | blocked on owner/provider/legal/read-access/authorized hosted evidence |
| TRUST-T12 | controlled closed beta | real-user core-loop/support evidence | blocked on P1 entry gates |
| TRUST-T13 | PBT-AC15 owner decision | explicit go/no-go + accepted limitations | blocked on evidence |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-15 | audit/evaluator | blocker remediation | audit complete | #388 | nine RRB findings | execute RRB-01 |
| 2026-08-15 | RRB-01 delivery | accessibility proof | financial runtime proof complete | #391 final head `873f4d4d…`, CI #2492, CodeQL/Secret #1566 | remaining P1 gates need owner/provider/legal read access | execute RRB-07 after lifecycle closeout |
| 2026-08-15 | RRB-07 delivery | owner/provider handoff | accessible-auth proof complete | #394 final head `35a31ba5…`, CI #2511, CodeQL/Secret #1584, UI audit `556 passed / 141 skipped / 0 failed` | no autonomous repository blocker remained at that point | wait for named owner/provider/legal/physical/hosted boundary |
| 2026-08-15 | owner | RRB-08 validation | RRB-08 explicitly promoted | issue #398 | no real phone available to the agent in-session | prepare evidence contract |
| 2026-08-15 | RRB-08 preparation | owner + physical device | repository prep complete | #399 final head `dfc47a29…`, CI #2526, CodeQL/Secret #1599, merged `e8a4a10e…` | direct real-phone evidence still missing | execute bounded smoke when device is available |

### Current permission boundary

Allowed now: RRB-08 lifecycle/evidence maintenance, repository verification and read-only external/provider evidence when connected tooling exposes it.

Conditionally allowed with the required owner/evidence input: RRB-08 physical-device validation with owner observation; RRB-02 hosted restore against a disposable/authorized target; RRB-04/RRB-09 read-back if provider/deployment read access appears; bounded source remediation after an owner/legal/provider decision identifies it.

Not implied: provider configuration writes, production financial-data mutation, database/Edge mutation, destructive account testing, deployment, operator domain/contact choice, legal decision, accepted limitation, beta launch or final public-beta decision.

## Evaluation

### Current decision

**BLOCKED FOR PUBLIC BETA. BLOCKED FOR CONTROLLED CLOSED BETA ON REMAINING P1 ENTRY GATES.**

RRB-01 is PASS at the authenticated browser/runtime-composition layer. RRB-07 is PASS for the scoped MoneyFlow-owned browser authentication mechanisms. RRB-08 is active and prepared but **not PASS** until current real-phone evidence exists. None substitutes for RLS/provider/production/legal evidence outside its layer.

### Next allowed action

Execute the RRB-08 physical-device packet when a real phone and selected release-candidate origin are available. The repository-side checklist/evidence contract is already merged via #399, but physical-device readiness must not be claimed from CI, emulation or simulators.

Other blockers resume only when their required boundary becomes available: owner/provider read access for RRB-04/RRB-09, verified operator contact decision for RRB-05, competent legal review for RRB-06, an authorized hosted target for RRB-02, or owner authorization/limitation decision for RRB-03. Do not manufacture a new feature or redesign as substitute work.