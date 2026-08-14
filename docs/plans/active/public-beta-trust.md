# MoneyFlow Trust

**Status:** active parent program
**Execution state:** P1 Secure, P2 Recover, P3 Prove, Repository Resets 1–2, A0 and Phases A–D completed; UI Slice 1 (#370), Slice 2 (#381), amount-focus hotfix #383 and open-work reconciliation completed; Release Readiness Audit v1 is current; PBT-AC15 open
**Active role:** parent-program planner
**Permission scope:** branch_write + provider_read; provider/production writes require explicit scoped owner approval
**Owner:** Thunderkill016
**Last updated:** 2026-08-15
**Current main baseline:** `5a2ef2d9f42c22138c97ac97b822997a95c28569` (#386 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner-facing execution checklist is `docs/plans/active/README.md`; this packet owns the public-beta trust/release gate, not day-to-day task enumeration.

## Outcome

MoneyFlow is ready for a bounded public beta only when current repository behavior, current provider configuration and user-visible behavior agree; core financial truth is correct; user-owned data is recoverable/exportable; security/privacy boundaries are credible; real users can complete the daily ledger loop; controlled-beta support evidence exists; and the owner records PBT-AC15.

Historical checkpoint completion is evidence, not a substitute for a current release-readiness audit.

## Current truth

- MoneyFlow has a released functional MVP.
- Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted checkpoints with named limitations preserved.
- Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed.
- Phase E Creative Territories is paused: every proposed territory was owner-rejected and no territory is selected. Phase F is not started.
- UI Slice 1 (#370), Slice 2 (#381) and bounded amount-focus hotfix #383 are merged.
- Open-work reconciliation is complete. Current-main dispatcher hardening merged in #384 and lifecycle closed in #385; the `js-yaml` 4.3.1 security backport merged in #386; stale #380 and Dependabot #320 are closed superseded. No open PR remains.
- #40 and #174 remain intentionally open because their provider/security state requires owner/provider decisions rather than backlog hygiene.
- Release Readiness Audit v1 is the current authorized program task.
- PBT-AC15 remains open. MoneyFlow is not public-beta ready by declaration alone.

### Current authority

- Owner checklist: `docs/plans/active/README.md`.
- Current implementation/trust memory: `docs/research/CURRENT_PROJECT_MEMORY.md`.
- Product law: `docs/product/PRINCIPLES.md`.
- Architecture: `ARCHITECTURE.md`.
- Risk/gates: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Configuration/provider contract: `docs/configuration.md`.

Historical completed packets and PR-memory records provide provenance only when a named claim needs it.

## Research rule for Release Readiness Audit v1

Read repository/provider evidence first. Research only unresolved current questions and record applicability. Current external review baselines include WCAG 2.2 for relevant accessibility acceptance, OWASP ASVS 5.0 for application-security review, NIST SSDF 1.1 for secure-development practices, and current Vietnam personal-data law/decree as legal-review inputs. Legal sources identify review obligations/questions; the agent must not convert a repository audit into a definitive legal-compliance opinion.

No dependency, architecture framework or new runtime service is adopted by the audit itself.

## Specification

### Current problem

The functional MVP and historical trust checkpoints exist and repository lifecycle is reconciled, but the owner still lacks one current release-readiness decision package that maps every public/closed-beta claim to the evidence layer capable of proving it.

The audit must prevent four failure modes:

1. historical success being mistaken for current release proof;
2. CI/browser evidence being promoted into provider/production/physical-device claims;
3. unknown or owner-gated security/privacy state being called PASS;
4. feature or visual work entering scope without a demonstrated release blocker.

### Acceptance criteria

- [x] PBT-AC1–4 provider/repository baseline checkpoints accepted in their completed evidence.
- [x] PBT-AC5–9 Secure checkpoints accepted, including named provider-test limitations rather than fabricated passes.
- [x] PBT-AC10–11 Recover archive/export/validation/restore contract accepted; hosted restore remains a named limitation because it was not executed against a live hosted account.
- [x] PBT-AC12 owner-observed physical-phone core-ledger run accepted.
- [~] PBT-AC13 duration requirement withdrawn by owner on 2026-08-12; no replacement streak/count exists.
- [x] PBT-AC14 historical daily-loop checkpoint accepted with its parked findings preserved.
- [ ] PBT-AC15 owner public-beta go/no-go and accepted limitations recorded from current readiness + controlled-beta evidence.

### Release-audit status vocabulary

Every release-gate row ends in exactly one of:

- **PASS** — current evidence directly supports the claim at the required layer.
- **BLOCKED** — evidence is missing/failed or a current defect/decision prevents release at the claimed level.
- **OWNER-ACCEPTED LIMITATION** — a real limitation is explicitly accepted by the owner where policy allows it; absence of evidence is never silently converted into this status.

### Audit dimensions

1. Financial correctness.
2. Recovery and data safety.
3. Auth and tenant isolation.
4. Security and privacy.
5. Usability and accessibility.
6. Deployment and operations.
7. Controlled closed-beta support/readiness.

Each dimension must identify the exact evidence mode: repository/static, unit/domain, database, browser, responsive/a11y, provider read-back, production runtime, physical device or owner decision.

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
- Reopening stale issues/PRs merely because the audit references their historical evidence.
- Implementing a finding inside the audit packet before it is classified as a bounded blocker task.

## Implementation plan

| Order | Work | Purpose | Current state |
|---|---|---|---|
| 1 | amount-field focus hotfix | remove known bounded presentation defect | complete via #383 |
| 2 | open-work/repository reconciliation | make GitHub + lifecycle truth agree | complete through #384–#386 and stale closeouts |
| 3 | Release Readiness Audit v1 | canonical PASS/BLOCKED/OWNER-ACCEPTED LIMITATION matrix + blockers + beta plan | **current** |
| 4 | blocker fixes | fix only audit-proven release blockers under bounded tasks | blocked on audit |
| 5 | controlled closed beta | collect real-user core-loop/support evidence | blocked on readiness |
| 6 | PBT-AC15 | owner public-beta decision | blocked on readiness + beta evidence |

No later row authorizes itself merely because the prior row completes.

## Tasks

| ID | Task | Evidence / DoD | Status |
|---|---|---|---|
| TRUST-T1 | Provider Sync / P1 Secure | accepted completed records + named limitations | complete |
| TRUST-T2 | P2 Recover | versioned archive/export/validation/restore contract accepted; hosted restore limitation preserved | complete |
| TRUST-T3 | P3 Prove | owner-observed physical-phone core ledger evidence | complete |
| TRUST-T4 | Repository Resets 1–2 + A0 + Phases A–D | merged/completed lifecycle records | complete |
| TRUST-T5 | UI Slice 1 + Slice 2 | #370 and #381 merged | complete |
| TRUST-T6 | amount-field focus hotfix | one accessible focus contour + exact-head UI evidence | complete via #383 |
| TRUST-T7 | open-work/repository hygiene | historical issues/PRs reconciled; no open PR remains; owner decisions preserved | complete through #384–#386 + stale closeouts |
| TRUST-T8 | Release Readiness Audit v1 | canonical readiness matrix + blocker backlog + closed-beta validation plan | **active** |
| TRUST-T9 | readiness blocker remediation | only audit-proven bounded blockers resolved | blocked on TRUST-T8 |
| TRUST-T10 | controlled closed beta | real-user core-loop/support evidence | blocked on readiness |
| TRUST-T11 | PBT-AC15 owner decision | explicit go/no-go + accepted limitations | blocked on evidence |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | owner + evaluator | program | accepted checkpoints | P1/P2/P3 records and named limitations | public-beta decision still open | proceed through bounded later work only |
| 2026-08-14 | owner/evaluators | program | Slice 1/2 merged | #370 + #381 | bounded focus defect + stale GitHub authority remained | hotfix + reconcile |
| 2026-08-15 | agent/evidence gates | program | repository reconciliation complete | #383–#386; 0 open PR; #40/#174 retained as decisions | current release readiness not yet audited | run Release Readiness Audit v1 |

### Current permission boundary

Allowed now: branch/PR audit documentation, focused research, repository verification and read-only provider inspection when current policy/tooling permits it.

Not implied by this packet: provider configuration writes, production financial-data mutation, database/Edge mutation, destructive account testing, deployment or the final public-beta decision. Those require their own current authority/evidence boundary.

## Evaluation

### Current decision

**BLOCKED FOR PUBLIC BETA.** This is not a regression of accepted historical checkpoints. Repository hygiene is now closed, but a current readiness audit, any resulting blocker remediation, controlled-beta evidence and PBT-AC15 remain ahead.

### Accepted limitations carried forward into the audit

- Hosted restore remains unexecuted against a live hosted account.
- Stale-AMR and real account-mismatch destructive/identity-risk provider probes remain intentionally unexecuted with deterministic fail-closed evidence accepted for the historical Secure checkpoint.
- Browser/emulation evidence is not physical-device evidence.
- P3 physical evidence is owner-observed rather than a completed signed repository result file.
- PBT-AC13 duration/streak requirement remains withdrawn and must not be reintroduced.

### Next allowed action

Create and execute Release Readiness Audit v1 on current main. Findings become implementation work only when the audit classifies them as release blockers and the task receives the required authority.
