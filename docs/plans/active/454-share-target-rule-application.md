# #454 — Apply deterministic rules to PWA Share Target candidates

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** #454 / PR #455 (draft)
**Base at implementation start:** `main@ac86d273876414c76fc050b11d3904dddfbb93b6`
**Last updated:** 2026-08-25

## Outcome

When a user shares text or CSV into the installed PWA, an existing explicit deterministic rule may normalize a matching non-transfer candidate inside the same atomic Share transaction. The candidate still remains pending Inbox review, and its persisted rule id/version makes the normalization inspectable.

## Repository reconnaissance

### Current behavior

- `CapturePastePage` loads user-scoped rules, applies them to preview candidates, then persists rule evidence only after candidate creation.
- `CaptureSharePage` uses `ingest_share_target_capture` for all-or-nothing source persistence but does not load or apply deterministic rules, so matching shared candidates require repeat categorization.
- `applyRulesToTargets` already preserves existing categories by default and excludes transfers. The existing `apply_inbox_rule_to_candidate` database function rechecks the current rule/version/category/match before it writes rule provenance.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/capture-share-page.tsx` | Share source orchestration | load rule identifiers for the existing atomic action; do not client-write categories |
| `src/components/inbox/capture-paste-page.tsx` | Proven working rule-aware capture flow | reuse its ordering/error contract; do not duplicate domain logic |
| `src/lib/inbox/apply-rules.ts` | Pure deterministic matching/normalization | reuse unchanged |
| `src/hooks/client-rules.ts` | Explicit demo/auth rule load and demo evidence persistence | reuse its tenant/demo contracts; authenticated Share must not use post-write evidence persistence |
| `src/lib/inbox/share-payload.ts` | Shared-source parsing and candidate construction | do not change source parsing or raw evidence |
| `src/app/actions/share-target-import.ts` | Authenticated Share action schema/payload | carry only optional rule id/version to the existing RPC |
| `supabase/migrations/...share_target...sql` | Atomic Share source transaction | add a rule-aware wrapper RPC that invokes existing authoritative rule application in the same transaction |

### Existing tests and constraints

- Related unit tests: `src/lib/inbox/apply-rules.test.ts`, `src/lib/inbox/share-payload.test.ts`.
- Database/RLS tests: extend Share Target pgTAP with rule match, stale/mismatch rollback and no-ledger assertions; the change updates an RPC implementation but introduces no table/RLS policy.
- Browser tests: Share Target review path needs a candidate-rule regression and responsive evidence.
- Product/architecture rules: no automatic ledger transaction, candidate stays pending, transfers stay neutral, and source evidence is never rewritten.

### Similar implementation and recent history

- Existing pattern to reuse: `CapturePastePage` applies before persistence, then records evidence only on the created candidate.
- Relevant issue/PR/decision: #454 follows merged #453, which makes creation of the same explicit rules available directly from Inbox review.

### Open questions

- [x] Does the existing shared-candidate path expose enough preview data to reuse the Paste rule flow? Yes; parsed share candidates carry merchant, note, raw snippet, kind and optional category.

## Research

### Research scope and source selection

- Decision question: Can a shared candidate benefit from an existing explicit rule without creating an automatic financial path?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and current master #432.
- Source budget: repository/product evidence only; no dependency, provider or external behavior is introduced.
- Expected decision: reuse the established candidate-stage rule contract rather than inventing a Share-specific rule or inferred automation.

### Questions researched

1. Does the rule contract already reject transfers and retain existing classifications? Yes, in `apply-rules.ts`.
2. Can authenticated Share persist exact rule evidence without splitting its atomic source boundary? Yes, by passing an optional exact rule id/version to the Share RPC and invoking existing `apply_inbox_rule_to_candidate` inside that transaction.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/plans/active/432-vietnam-long-term-product-strategy.md` | current master program | 2026-08-24 | P2 permits user-confirmed rules and requires lower maintenance without worse errors | does not select capture implementation details |
| `src/components/inbox/capture-paste-page.tsx` | current working capture contract | 2026-08-24 | rules are applied from explicit user-owned rule data and candidates stay pending | its post-write evidence sequence cannot preserve Share atomicity |
| `src/components/inbox/capture-share-page.tsx` and `src/lib/inbox/share-payload.ts` | current Share implementation | 2026-08-24 | Share produces candidate-stage evidence but bypasses rules | does not prove authenticated provider execution |
| `src/lib/inbox/apply-rules.ts`, `apply_inbox_rule_to_candidate` and tests | executable domain/database contract | 2026-08-24 | transfer exclusion, category-preservation, exact revision and server match validation | does not create a ledger fact |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Carry explicit rule id/version through the existing atomic Share transaction | closes an observed parity gap while preserving exact provenance | stale/mismatched rule rejects the whole Share action | select; no partial source write is allowed |
| Infer a rule from shared data | less setup | untrusted automation and lower precision | reject |
| Auto-approve rule matches | fewer clicks | violates Inbox review and financial boundary | reject |

### Research decision

Observed code establishes a safe established contract: the client may select only an explicit saved rule, while the existing database function validates that rule/version/current candidate match after the candidate exists. The Share RPC can invoke it inside the same transaction, keeping every candidate pending and rolling back on stale/mismatched evidence. No external integration, dependency or provider behavior applies.

### Adoption review

Not applicable: no dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

People who explicitly saved a merchant/category rule still need to re-categorize matching candidates received through PWA Share Target, despite Paste already honoring that same rule contract.

### User stories

- As an Inbox reviewer, I see a shared candidate already normalized by a rule I explicitly created, so I can focus on exceptions.
- As a cautious user, a matching rule never posts, approves or rewrites the shared source evidence.

### Acceptance criteria

- [ ] An eligible shared text/CSV candidate that matches an enabled candidate-stage rule carries its exact id/version into the Share action; the server normalizes it inside the atomic transaction.
- [ ] Only a successful created candidate receives the exact matching rule id/version evidence; it remains pending Inbox review and the Inbox explanation can show the result.
- [ ] Transfers and candidates already categorized by parsing stay unchanged; rules are not inferred or forced.
- [ ] Rule-load failure leaves Share ingestion unchanged; stale, mismatched or invalid submitted rule evidence rolls back the whole Share source action with no ledger write or partial source data.
- [ ] Demo remains browser-local; authenticated mode reuses existing tenant-scoped rule read and database application contracts.

### Required states

- Loading: Share parsing/loading remains visible while existing rules are read.
- Empty: no rules means unchanged candidate creation.
- Populated: Share success remains concise; the resulting Inbox candidate exposes exact rule explanation where matched.
- Validation/error: source parse/persist errors remain unchanged; rule-load failure falls back to unchanged candidate creation, while stale submitted evidence reports an atomic Share failure.
- Recovery/undo: user can edit/disable/delete the rule through `/rules`; candidates remain reviewable.
- Long data / large VND: retain existing bounded Share parsing and VND formatting.
- Mobile/tablet/desktop: preserve Share preview/dialog layout at existing breakpoints.
- Accessibility: rule outcome is textual, not color-only, and status messages are announced.

### Financial and security constraints

- No guessed financial data, recommendation, approval or ledger mutation.
- Integer VND and transfer invariants remain intact.
- Authenticated rule reads use the existing tenant-scoped boundary; the existing Share RPC is amended to invoke the already tenant-scoped authoritative rule-application function. No table, RLS policy or provider change.

### Out of scope

- New rules, inferred normalization, historical backfill, auto-approval, raw source rewrite, Direct CSV behavior, provider/native/AI work and deployment.

## Implementation plan

### Architecture fit

The Share component owns client orchestration, while `apply-rules.ts` selects only a deterministic candidate-stage rule and the database function owns authoritative normalization/evidence validation. The existing Share RPC remains the single authenticated persistence owner.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/inbox/capture-share-page.tsx` | load existing rules and send only optional exact rule id/version with the Share action | make Share select the existing explicit rule contract without client mutation |
| `src/lib/inbox/share-payload.ts` | derive rule-id/version hints from the existing pure preview contract | keep client selection deterministic and testable |
| `src/app/actions/share-target-import.ts` | validate/serialize optional rule evidence | maintain explicit input bounds |
| focused Share migration + pgTAP | invoke existing authoritative rule application within Share transaction | preserve atomicity and tenant/match validation |
| focused Share browser/unit tests | prove match, transfer/category guard and pending candidate outcome | protect candidate-stage/financial boundaries |
| board/current memory/PR record | register and later converge the active slice | maintain current execution truth |

### Data and migration impact

- Schema/migration: one forward-only migration adds a rule-aware Share RPC wrapper and its authenticated execution grant; no table, index or RLS policy change.
- Backfill: none.
- Compatibility: missing/unavailable rule reads leave Share behavior unchanged; stale submitted evidence fails atomically rather than retaining a partial write.
- Rollback: revert the focused migration/PR; existing Share capture and `/rules` remain available.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Rule changes after client preview | server validates current id/version/match and rolls back the complete Share action |
| Transfer or pre-categorized candidate is changed | existing pure-rule guard tests plus Share regression |
| Rule belongs to another user | reuse existing authenticated rule/evidence action and pgTAP contract; do not add a client bypass |
| Share source is mistaken for a ledger write | browser assertion checks Inbox pending status and no transaction route/action |

### Verification plan

- Static: `check:knowledge`, `test:ci-policy`, lint, typecheck and production build.
- Unit/domain: focused rule/share tests and full `npm run test`.
- Database: Supabase reset + Share/rule pgTAP for atomic match, transfer guard, stale evidence rollback and no ledger write.
- Browser flow: shared candidate with a deterministic rule remains pending and carries its rule explanation.
- Responsive/visual: Share preview at phone and desktop dimensions.
- Production/manual: no deployment or provider write; after merge, no production claim without a separately authorized authenticated run.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add a failing Share rule-flow regression | packet | helper test failed before implementation, then passed | done |
| T2 | Reuse rule selection and apply it atomically in Share capture | T1 | focused unit/database/browser coverage added | done |
| T3 | Run selected local/browser checks and independent UI review | T2 | local gates/browser output; pgTAP and WebKit environment blockers recorded | in_progress |
| T4 | Publish focused PR and exact-head verification record | T3 | PR #455 draft + CI evidence pending | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-24 | owner | implementer | planned | #454; this packet; `main@ac86d273` resolver READY | no authenticated/browser production proof | write failing regression |
| 2026-08-25 | implementer | evaluator | evaluating | unit red→green; `verify:prepush` demo build; 12/12 Share browser; Class 3 static/RLS/migration gates | local pgTAP has no PostgreSQL/Docker; full audit WebKit navigation fails internally before assertions | prepare truthful draft PR; provider exact-head must run pgTAP/WebKit |
| 2026-08-25 | evaluator | ci_or_production | evaluating | draft PR #455 at `5f4e939c` | CI is queued; provider database and WebKit evidence remain required | observe exact-head provider checks; do not merge without owner direction |

### Current permission boundary

- Granted scope: one focused branch for #454, repository code/tests/docs and a pull request.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch only; no provider access is needed.
- Forbidden writes: `main`, merge, history rewrite, provider settings, production data, secrets, workflow/permission changes and unrelated branches.
- Human approval required before: merge, deployment, provider or production-data writes.
- Rollback or stop condition: revert the focused branch/PR if Share rule application can alter a ledger fact, transfer, raw source or tenant boundary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Deterministic Share match stays pending and records exact demo revision | focused share-payload unit plus Playwright Chromium + mobile Chromium regression | pass locally |
| Transfers and already categorized candidates remain unchanged | focused `planShareRuleEvidence` unit test | pass locally |
| Authenticated Share applies/rolls back server-side rule evidence atomically | new pgTAP match and stale-version rollback cases | blocked: local Supabase cannot connect to PostgreSQL; provider database job required |
| Static/domain/migration/RLS checks | `check:knowledge`, `test:ci-policy`, `check:migrations`, `check:rls`, `verify:prepush` with `NEXT_PUBLIC_APP_MODE=demo` | pass locally (lint has five pre-existing warnings outside this diff) |
| Responsive audit | 503 Chromium-family checks passed; 141 matrix skips | blocked: 54 WebKit checks fail at `page.goto` with WebKit internal error before app assertions |

### Research and adoption evidence

- Selected sources still support the final implementation: yes; the client selects only a stored rule revision while the database function remains the authoritative ownership/match validator.
- Important source limitations remain respected: no source proves production/provider behavior.
- New tool/dependency/pattern: not applicable.

### Review findings

- Correctness: demo path preserves pending state, normalizes a matching rule and writes its evidence; authenticated execution remains unproven until pgTAP/provider CI.
- Security/ownership: new wrapper is `SECURITY INVOKER`, requires `auth.uid()`, exposes execute only to `authenticated`, and delegates tenant/rule/version/match checks to the existing rule function. Static RLS check passes.
- UI/UX/accessibility: affected Share regression passes on Chromium desktop and mobile; broad Chromium audit passes. WebKit local navigation is unavailable before assertion.
- Maintainability/duplication: Share uses the existing rule matcher and the existing authoritative database application function, rather than a Share-only normalization contract.
- Scope compliance: no ledger approval, transaction write, raw-source rewrite, backfill, new table/RLS policy, provider or deployment change.

### Remaining limitations

- This does not measure interventions/100 transactions or create an automatic approval path.
- This environment has no local PostgreSQL/Docker, so the new pgTAP migration assertions are not executed locally.
- WebKit local audit cannot navigate to the local app (`WebKit encountered an internal error`); this affects unrelated routes and must be rechecked in exact-head CI or a repaired browser host.

## Delivery record

- Branch: `feat/454-share-rule-application`
- PR: #455 draft at `5f4e939c4955d1b5b5438c38dd7a2150158a2a24`
- Squash commit: pending
- CI run: queued on the exact draft head; draft does not supply substantive Class 3 evidence
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
