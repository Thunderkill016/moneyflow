# #452 — Create deterministic Inbox rules from confirmed review

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** #452 / PR pending
**Last updated:** 2026-08-24

## Outcome

When a person has explicitly corrected a non-transfer Inbox candidate's merchant and category, they can deliberately save that confirmation as a deterministic candidate-stage rule for future matching candidates. The rule is inspectable, editable and disableable in the existing Rules workspace. It never posts the reviewed candidate, rewrites its raw source, backfills old candidates or bypasses Inbox review.

## Repository reconnaissance

### Current behavior

- `InboxReviewPanel` permits a user to correct a pending candidate and then post it to the ledger, but has no path to preserve that confirmation as a future rule.
- The existing `/rules` surface persists versioned, tenant-scoped deterministic rules through `saveRuleForClient`; demo rules remain browser-local and authenticated rules use the established server action/RLS boundary.
- Rules apply only at candidate stage. `apply-rules.ts` excludes transfer candidates and records a concrete rule id/version only when a rule actually applied to a candidate.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/inbox/inbox-review-panel.tsx` | Review-time explicit user confirmation | add a separate save-rule action; do not combine it with approval |
| `src/components/inbox/inbox-page.tsx` | Supplies viewer mode and review callbacks | pass the explicit demo/auth mode only |
| `src/hooks/client-rules.ts` | Existing demo/auth persistence contract | reuse unchanged |
| `src/lib/inbox/rules-store.ts` | Versioned rule domain and validation | add a pure fail-closed seed helper if needed |
| `src/components/inbox/rules-page.tsx` | Existing edit/disable rule controls | reuse; no new management surface |

### Existing tests and constraints

- Related unit tests: `src/lib/inbox/rules-store.test.ts`, `src/lib/inbox/apply-rules.test.ts`.
- Database/RLS tests: existing authenticated rules migration and action tests remain the ownership authority; this slice adds no schema/RPC/RLS change.
- Browser tests: affected Inbox review flow requires browser smoke and responsive dialog evidence.
- Product/architecture rules: MoneyFlow is manual-first, source evidence is not a ledger fact, transfers remain neutral, and every rule-created candidate stays pending review.

### Similar implementation and recent history

- Existing pattern to reuse: RulesPage validates an active category then calls `saveRuleForClient`, which handles demo storage or the authenticated action.
- Relevant issue/PR/decision: #452 is the P2 child selected after exact merge of #451 (`main@4d80fbe915155061fc3152740bb65c9cfa5c09ba`).

### Open questions

- [ ] Confirm via tests/browser evidence that the action remains unavailable for transfers, unknown merchant text and missing active categories.

## Research

### Research scope and source selection

- Decision question: How can confirmed review reduce future classification work without creating an automatic ledger path?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and the #432 master packet.
- Source budget: repository/product evidence only; no new external technology, provider, dependency or standard is introduced.
- Expected decision or uncertainty to resolve: choose a deterministic, explicit, candidate-stage rule rather than inferred automation.

### Questions researched

1. Does the existing rule contract already preserve versioning, category kind and tenant ownership? Yes; reuse it.
2. Can a candidate-stage rule safely cover transfers? No; the current application contract excludes them and this slice preserves that exclusion.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/plans/active/432-vietnam-long-term-product-strategy.md` | current master product program | 2026-08-24 | P2 permits user-confirmed rules and requires lower maintenance without worse errors | does not select UI details |
| `src/lib/inbox/apply-rules.ts` and tests | current executable rule behavior | 2026-08-24 | candidate-stage, priority, transfer exclusion and evidence contracts | does not prove UI usability |
| `src/hooks/client-rules.ts` and `src/components/inbox/rules-page.tsx` | current persistence/UI contract | 2026-08-24 | demo/auth behavior and edit/disable controls exist | does not make posting atomic with rule creation |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Save rule in the same operation as approval | fewer clicks | couples a future classification preference to a financial mutation and obscures partial failure | reject |
| Infer a rule silently after approval | lowest friction | violates explicit confirmation and can reduce precision | reject |
| Explicitly save a candidate-stage rule before/without approval | reuses established ownership/versioning; failure leaves ledger unchanged | one focused UI action and validation needed | select |

### Research decision

Observed repository behavior supports an explicit, separate save operation. The product judgment is to require the user to see the reviewed merchant and category and choose to create the rule. No external reference pattern is adopted, and no provider/native/AI capability applies.

### Adoption review

Not applicable: no dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

People who recognize a merchant/category while reviewing Inbox must currently navigate to Rules and re-enter the same information. That friction discourages the controlled automation that could reduce later review work.

### User stories

- As an Inbox reviewer, I can explicitly save my confirmed merchant/category as a rule so future matching candidates start normalized but still await my review.
- As a cautious user, I can never create such a rule from a transfer, unclear merchant or missing/archived category.

### Acceptance criteria

- [ ] A pending income/expense review with a non-empty merchant and active matching category exposes a separate "Lưu thành quy tắc" choice.
- [ ] Confirmation shows the exact normalized merchant match text and category before saving; the rule uses `field: merchant`, is enabled and candidate-stage only.
- [ ] Transfers, blank/unknown merchants and unavailable categories fail closed and expose no save action.
- [ ] Demo saves only local rule state; authenticated mode calls the existing tenant-scoped versioned rule action.
- [ ] A save failure leaves the candidate pending and creates no ledger transaction; a successful save does not approve/post the current candidate.
- [ ] A later matching candidate receives normal rule id/version evidence and remains pending for Inbox review.

### Required states

- Loading: the save action is disabled while the existing persistence request is in flight.
- Empty: no action if there is no active category or trusted merchant.
- Populated: show a concise confirmation with merchant and category.
- Validation/error: show save failure in the review dialog without closing or approving it.
- Recovery/undo: existing Rules workspace can edit, disable or delete the saved rule; no automatic backfill occurs.
- Long data / large VND: merchant remains bounded by existing 200-character input; money is not changed by this operation.
- Mobile/tablet/desktop: action fits the existing responsive review dialog.
- Accessibility: visible label, dialog semantics, keyboard focus and live error/notice feedback.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact because this action neither changes amount nor posts a ledger transaction.
- Authenticated persistence reuses the existing RLS-protected rule action; demo remains local. The UI must not expose an action that creates a transfer rule.

### Out of scope

- Automatic approval, posting, current-candidate rule evidence, backfill, raw-source mutation, migrations/RPCs/RLS changes, provider/native/AI work, and new rule types or matching algorithms.

## Implementation plan

### Architecture fit

The Inbox review component owns the explicit user gesture; the existing rules client contract owns persistence; the existing rule domain owns validation. Approval remains in the parent Inbox/ledger boundary and is intentionally independent.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/review.ts` + test | pure reviewed-candidate-to-rule seed validation | test transfer/unknown/category fail-closed behavior outside UI |
| `src/components/inbox/inbox-review-panel.tsx` | explicit confirmation/save state using existing client rule contract | reduce re-entry without posting |
| `src/components/inbox/inbox-page.tsx` | provide demo/auth mode | preserve persistence boundary |
| `e2e/authenticated-deterministic-rules.spec.ts` | review-time save regression | prove a demo rule is saved while the current candidate stays pending |
| current board/memory/PR record | lifecycle evidence | keep authority truthful |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing rule shape/action unchanged.
- Rollback: revert the focused UI/helper commit; existing saved rules remain manageable through `/rules` and no ledger data is touched.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Rule accidentally becomes ledger approval | separate callbacks/state; unit and browser tests show save leaves candidate pending |
| Transfer gets a category rule | pure helper rejects transfer and UI hides action |
| Authenticated save escapes tenant boundary | reuse existing authenticated action; no new query/RPC |
| User saves vague data | reject blank/"Không rõ" merchant and missing active category |
| Mobile dialog becomes unreachable | responsive dialog audit at phone viewport |

### Verification plan

- Static: knowledge, CI policy, diff hygiene, lint and typecheck.
- Unit/domain: focused rules-store and rule-application tests.
- Database: no schema/RLS diff; run relevant existing database gate when environment is available and report otherwise.
- Browser flow: review → explicitly save rule → candidate still pending; transfer/invalid exclusions.
- Responsive/visual: existing review dialog on phone/tablet/desktop.
- Production/manual: no deployment or production write; owner review required before merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Register #452 and freeze scope | fresh-main resolver | packet + board/memory gates | done |
| T2 | Add failing domain tests for eligible and fail-closed seeds | T1 | focused test failed for missing helper | done |
| T3 | Implement helper and explicit review save action | T2 | focused unit and desktop browser regression passed; full gates pending | done |
| T4 | Evaluate browser/responsive flow | T3 | desktop browser passed; mobile/full UI audit pending | in_progress |
| T5 | Prepare truthful draft PR, exact-head checks and lifecycle convergence | T4 | PR record + CI | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-24 | planner | implementer | planned | #452, fresh `main@4d80fbe9`, packet | no code/test/browser evidence yet | write focused failing domain tests |
| 2026-08-24 | implementer | evaluator | implementing | focused domain test red→green; desktop review-save browser regression passed | mobile/full verification and authenticated-provider boundary remain unverified | run risk-selected local gates |

### Current permission boundary

- Granted scope: focused branch documentation/code/tests and draft PR preparation for #452.
- Exact repositories/providers/resources: MoneyFlow Git branch and GitHub issue #452 only.
- Forbidden writes: `main`, merge, force-push, provider settings, production/deployment/data, migrations/RLS and unrelated files.
- Human approval required before: merge, provider/production changes or scope expansion.
- Rollback or stop condition: stop if the requirement needs a new rule persistence contract, automatic approval or a financial data mutation.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Explicit non-transfer save is separate from approval | pending | pending |
| Transfers/invalid merchant/category fail closed | pending | pending |
| Demo/auth persistence and later candidate evidence | pending | pending |
| Responsive accessible dialog | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending implementation review.
- Important source limitations remain respected: no external pattern or provider claim.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- This reduces re-entry only after an explicit human review; it does not measure interventions/100 or automatically classify historical candidates.

## Delivery record

- Branch: `feat/452-confirmed-inbox-rule`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not authorized
- Production flow verified: not applicable before owner deployment decision
- Work packet moved to `docs/plans/completed/`: pending
