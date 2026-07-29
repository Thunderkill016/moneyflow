# MF TRUST-7 — stabilization and real-use proof

**Status:** Phase 2 complete; R7 evidence pending  
**Owner:** MoneyFlow  
**Issue/PR:** #123 / #126  
**Last updated:** 2026-07-29

## Outcome

MoneyFlow stops parallel expansion, fixes known core correctness gaps, aligns repository tracking with delivered reality, and proves seven consecutive days of real owner use before reopening redesign or feature breadth.

## Repository reconnaissance

### Current behavior

- Phase 0 shipped through PR #124 and reconciled stale PR, issue and active-packet state.
- Phase 1 shipped through PR #125 and closed correctness issues #121 and #122.
- Vercel production deployment `dpl_14kdUsxkxruYnBVYThQWUu9msJzh` is `READY` for squash commit `470f4ac6a79dd925eef6a834d745b768c7650967`.
- GitHub Actions run #501 passed verification, database and browser jobs for the exact P1 change.
- The canonical production origin and unauthenticated Dashboard-to-login path return HTTP 200; Vercel reports no runtime error clusters in the preceding 24 hours.
- Issue #27 records owner-confirmed real email callback, normal spreadsheet application and physical-phone keyboard evidence from 2026-07-27.
- Issue #40 remains open because leaked-password protection is a Supabase Pro-or-higher managed Auth setting; the current project is on Free.
- Seven-day self-use remains unproven. Task activation on 2026-07-27 is not evidence that Day 1 or later days occurred.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/REAL_USE_READINESS_CONTRACT.md` | Authority for R0–R7 claims | Reconcile R0–R6; keep R7 incomplete |
| `docs/plans/active/mf-trust-7.md` | Sole active multi-session packet | Keep delivery state current |
| GitHub #123 | Durable master tracker | Record phase gates and limitations |
| GitHub #40 | Managed Auth hardening constraint | Keep open and plan-blocked |
| GitHub #72 | Remaining route/state UI tracker | Keep frozen until R7 exit review |
| PR #119 | Logo candidate with owner approval gate | Keep Draft and frozen |

### Existing tests and constraints

- Static and build gates: knowledge, deployment environment, CSS ownership, architecture, lint, typecheck and production build.
- Database gates: fresh Supabase reset and pgTAP.
- Browser gates: expense path plus cross-device Chromium/WebKit audit.
- Product constraints: integer VND, transfer net-zero, exactly-once mutation, tenant isolation and export safety.
- No UI, brand, workflow, dependency or feature expansion during TRUST-7.
- Evidence must exclude credentials, tokens, personal email addresses and real financial descriptions.

### Similar implementation and recent history

- PR #124 established this packet as the sole active TRUST-7 authority.
- PR #125 added deterministic Dashboard keep-open and balance regression coverage.
- Issue #27 closed after the owner confirmed all three manual R0–R6 gates.
- Earlier security PRs intentionally expose authenticated mutation RPCs while deriving tenant identity from `auth.uid()` and rejecting cross-tenant identifiers.

### Open questions

- [ ] Which calendar date has the first actual, evidenced R7 use entry?
- [ ] Will the Supabase project be upgraded so #40 can be enabled?

Neither question authorizes an inferred R7 start or a repository workaround for #40.

## Research

Phase 2 uses current official Supabase documentation plus live Vercel, Supabase and GitHub state.

### Questions researched

1. Is leaked-password protection available on the current Supabase plan?
2. Are new Security Advisor lint 0029 warnings evidence of exposed unauthenticated RPCs?
3. Do owner-confirmed manual gates permit R0–R6 to be marked complete?
4. Does any P0/P1 core auth, capture, balance or export blocker remain open?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Supabase password-security docs | 2026-07-29 | Leaked-password protection is Pro or above | Managed platform setting, not SQL |
| Supabase Database Advisor docs | 2026-07-29 | Lint 0029 flags authenticated `SECURITY DEFINER` execution | Generic warning; intent and function body still require review |
| Live Supabase catalog and Security Advisor | 2026-07-29 | #40 remains; 23 authenticated mutation RPC warnings exist | Snapshot of current production project |
| Vercel project/deployment/runtime APIs | 2026-07-29 | Exact P1 commit is READY and no recent runtime clusters exist | Does not replace an interactive authenticated browser run |
| Issues #27, #40 and #123 | 2026-07-29 | Owner manual evidence, plan constraint and controlling scope | Issue prose must be reconciled into repository authority |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Mark #40 fixed in documentation | Removes an open warning | False claim; feature remains disabled | Rejected |
| Emulate leaked-password protection in app code | Avoids plan upgrade | Not equivalent; duplicates managed breach corpus checks | Rejected |
| Convert all mutation RPCs to invoker or revoke authenticated execution | Clears generic warnings | Breaks intentional API and may corrupt authorization/atomicity | Rejected |
| Audit live grants and ownership checks, then document intentional warnings | Preserves function and security contracts | Advisor warnings remain visible | Selected |
| Infer R7 Day 1 from task activation | Accelerates exit | Creates false real-use evidence | Rejected |

### Research decision

Keep #40 open and plan-blocked. Retain the 23 authenticated mutation RPCs because live inspection found zero `anon`/`PUBLIC` execution, empty `search_path`, explicit authentication rejection and user-ownership predicates in every function. Reconcile the three owner-confirmed manual gates into R3/R5/R6. Keep R7 entirely unchecked until daily evidence exists.

## Specification

### Problem

Repository authority still contradicts delivered reality: the readiness contract leaves three accepted manual gates unchecked, this packet says Phase 1 remains open, and #40 lacks a current Phase 2 disposition. These contradictions prevent an auditable transition to real-use proof.

### User stories

- As the owner, I can see whether MoneyFlow is technically ready without reading old chat history.
- As a reviewer, I can distinguish a fixed defect from a managed-service limitation.
- As an implementing agent, I can see that Phase 1 is delivered and that only R7 evidence may advance next.
- As a security reviewer, I can audit why authenticated mutation RPC warnings were retained rather than blindly suppressed.

### Acceptance criteria

- [x] Exact P1 production deployment and public-origin health are recorded.
- [x] #40 is reverified live and explicitly plan-blocked.
- [x] All 23 lint 0029 RPCs are checked for grants, authentication, ownership and fixed `search_path`.
- [x] R3 real email callback is marked accepted from owner evidence.
- [x] R5 end-user spreadsheet is marked accepted from owner evidence.
- [x] R6 physical keyboard path is marked accepted from owner evidence.
- [x] The readiness gap register contains only #40 and R7.
- [x] No known P0/P1 core auth/capture/balance/export issue remains.
- [x] Phase 2 documentation PR passes required CI.
- [x] R7 remains unclaimed until daily evidence exists.

### Required states

- Loading/empty/populated/error/recovery and responsive runtime states remain covered by existing CI and accepted production evidence.
- Phase 2 changes documentation and tracking only; it does not alter runtime behavior.
- Production interactive P1 behavior is covered by exact-commit CI browser regressions. The current execution container cannot add a new local browser claim because outbound navigation is blocked by policy.
- The public origin, login redirect, deployment state and recent runtime-error state are verified independently through Vercel.

### Financial and security constraints

- No financial calculation, transaction or user row is changed.
- No Supabase DDL, migration, Auth setting or privilege is modified.
- No password, email address, token, session cookie, key or real transaction description enters evidence.
- #40 must not be “fixed” through weaker local validation.
- `SECURITY DEFINER` RPCs remain only because every live function passed the bounded grant/authentication/ownership audit.

### Out of scope

- Starting, backfilling or claiming R7 daily use.
- Upgrading a paid Supabase plan.
- Changing database functions solely to silence generic linter warnings.
- UI/brand/workflow/dependency changes.
- Merging PR #119 or resuming #72.
- Roadmap work under #53.

## Implementation plan

### Architecture fit

GitHub issues own backlog and external constraints; the readiness contract owns accepted readiness claims; this packet owns deliberately active execution. Phase 2 only reconciles those sources and records live platform evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/REAL_USE_READINESS_CONTRACT.md` | Mark owner-confirmed R3/R5/R6 gates, record #40 and live RPC audit, update gap register | Make R0–R6 truthful and auditable |
| `docs/plans/active/mf-trust-7.md` | Record Phase 0/1 delivery and Phase 2 state | Remove stale “pending/open” claims |
| GitHub #40 | Add current plan-blocked verification | Preserve managed-service constraint |
| GitHub #123 | Record P1 deployment/public health and Phase 2 findings | Keep master tracker current |

### Data and migration impact

- Schema/migration: none.
- Auth configuration: none.
- Backfill: none.
- Runtime compatibility: unchanged.
- Rollback: revert the documentation commit and tracker comments if evidence is disproven.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Manual owner evidence is overstated | Record only pass state/date; no invented device/email details |
| #40 is mistaken as fixed | Keep issue open and call it plan-blocked |
| Generic lint warnings are dismissed without inspection | Live aggregate plus representative function definitions reviewed |
| R7 is inferred from activation | Explicitly state activation is not Day 1 |
| Phase 2 accidentally resumes product work | Documentation-only branch and frozen-scope wording |

### Verification plan

- Repository: run normal PR knowledge/static/build/database/browser CI.
- GitHub: verify #121/#122 remain closed, #40 open, #72 frozen and #119 Draft.
- Vercel: exact P1 commit remains READY; canonical public/login path returns 200; runtime errors remain clear at review time.
- Supabase: project remains ACTIVE_HEALTHY; #40 warning remains accurately recorded; no DDL is executed.
- Manual: no new manual claim; reuse owner-confirmed #27 evidence only.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0 | Freeze and repository reconciliation | none | PR #124 | done |
| P1-1 | Fix Dashboard keep-open ownership | P0 | #121 / PR #125 | done |
| P1-2 | Fix deterministic demo/live balance reconciliation | P0 | #122 / PR #125 | done |
| P1-3 | Pass exact-change CI and deploy production | P1-1..2 | CI #501 / Vercel deployment | done |
| P2-1 | Reverify and classify #40 | P1-3 | live Advisor + official docs | done |
| P2-2 | Audit lint 0029 mutation RPCs | P2-1 | live catalog aggregate/definitions | done |
| P2-3 | Reconcile R3/R5/R6 owner evidence | P2-1 | issue #27 + readiness diff | done |
| P2-4 | Update TRUST-7 delivery state | P2-1..3 | packet diff / #123 | done |
| P2-5 | Pass Phase 2 CI | P2-1..4 | PR #126 / CI #503 | done |
| P3 | Seven-day owner self-use | P2-5 | daily sanitized record + exit review | not started / unproven |

Rules:

- R7 cannot be backfilled from task activation or ordinary app telemetry.
- Only bounded P0/P1 defects may interrupt the seven-day run.
- #40 stays open until the managed setting is actually enabled and reverified.
- No feature or visual expansion is bundled into Phase 2 or R7.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| P1 deployed | exact commit and READY deployment | pass |
| Public production health | canonical `/` and Dashboard-to-login HTTP 200 | pass |
| Recent runtime health | no Vercel runtime clusters in 24h | pass |
| #40 classified | live Advisor + Pro-plan documentation | pass, plan-blocked |
| Mutation RPC exposure bounded | 23 authenticated; 0 anon; 0 PUBLIC; 23 auth/ownership checks | pass |
| Manual gates synchronized | issue #27 owner confirmation | pass |
| R7 not falsely completed | all daily/exit checkboxes remain open | pass |
| Repository contracts | PR #126 / CI #503 | pass |

### Review findings

- Correctness: #121/#122 are closed and exact interaction regressions passed CI.
- Security: no cross-tenant or unauthenticated execution finding was discovered; #40 remains visible.
- UI/UX/accessibility: no runtime change.
- Maintainability: stale readiness and delivery claims are reconciled to one authority.
- Scope compliance: documentation/tracking only.

### Remaining limitations

- Local `agent-browser` compatibility CLI is installed and healthy, but container outbound browser navigation to production is administratively blocked.
- #40 cannot be enabled on the current Supabase Free plan.
- R7 has no accepted daily evidence yet.
- UI/brand/roadmap work remains frozen.

## Delivery record

- Phase 0 branch/PR: `agent/mf-trust-7-phase-0` / #124
- Phase 0 squash commit: `93a8ac52aa94b7a8451e27be86af8567806b450c`
- Phase 1 branch/PR: `agent/mf-trust-7-phase-1` / #125
- Phase 1 squash commit: `470f4ac6a79dd925eef6a834d745b768c7650967`
- Phase 1 CI: #501 — verify, database and e2e passed
- Phase 1 production deployment: `dpl_14kdUsxkxruYnBVYThQWUu9msJzh` — READY
- Phase 2 branch/PR: `agent/mf-trust-7-phase-2` / #126
- Phase 2 CI: #503 — verify, database and e2e passed
- Production behavior changed in Phase 2: no
- Next gate after Phase 2: evidenced R7 daily use, not redesign
