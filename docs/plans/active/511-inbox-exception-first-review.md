# Inbox exception-first review without auto-posting

**Status:** specified — selection candidate until the planning PR merges
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** Issue #511; implementation PR intentionally not started
**Parent authority:** #432 P2 — Low-Maintenance Ingestion
**Baseline:** `main@6298e6c52cfff6f3a972cf72cf79022e341ce638`
**Last updated:** 2026-08-28

## Outcome

Reduce the review work for already well-formed Inbox candidates by separating a deterministic **Sẵn sàng** set from **Cần xem lại**, then letting the user explicitly select the Ready set as one intentional action before the existing confirmation/posting path.

Success is fewer user interventions for a representative mixed batch **without lowering correctness, duplicate/transfer safety, provenance, idempotency or explicit approval**. Classification never posts anything by itself.

This packet is execution authority only after the planning/authority PR that registers it as the single `current agent-executable` slice is merged to `main`. Runtime implementation must start from a fresh post-merge branch after `npm run plan:resolve` and `npm run agent:doctor -- --json` pass.

## Repository reconnaissance

### Current behavior

Current code confirms issue #511's problem statement:

- `filterCandidates(..., "needs_review")` is currently only a low-confidence filter; duplicate and possible-transfer states are separate concerns.
- `partitionBulkApprove` selects pending rows and gates only on confidence plus the `includeLowConfidence` opt-in; it does not express one deterministic Ready contract.
- `draftFromCandidate` delegates account/category resolution to helpers that can fall back to the first available account/category. That fallback remains useful for manual review UX but **cannot be evidence that a candidate is Ready**.
- `buildLedgerPost` is stricter: amount must be a positive safe integer VND value, date must match `YYYY-MM-DD`, a money transaction needs an existing account and a same-kind category, and transfers need two distinct accounts.
- Inbox already has explicit selection and explicit confirmation. #511 changes selection cost and exception visibility, not the ledger-write boundary.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/inbox/candidate-store.ts` | Candidate facts and current filters | Reuse facts; avoid a second financial truth path |
| `src/lib/inbox/review.ts` | Review drafts, bulk partitioning and ledger-post validation | Own the pure readiness contract or a focused adjacent helper; do not rely on fallback resolution |
| `src/components/inbox/inbox-page.tsx` | Inbox filters, row selection, confirmation and posting orchestration | Reuse existing confirmation and manual-review paths |
| `src/components/inbox/inbox-bulk-bar.tsx` | Bulk selection/action affordance | Add only the bounded Ready-set affordance needed by this slice |
| related unit/browser tests | Correctness, parity and interaction proof | Extend with mixed-batch readiness/approval coverage |

### Existing constraints

- VND remains integer đồng; no floating-point money.
- Transfers remain manual/single-row and outside grouped Ready approval.
- Possible duplicates stay attention-required; #511 does not change duplicate identity or heuristic semantics.
- Candidate-specific idempotency/recovery behavior stays unchanged.
- Demo and authenticated modes must share readiness semantics.
- Money/state distinctions cannot rely on color alone.
- No schema, RLS, Auth, provider, deployment, native-device or AI mutation change is authorized.

### Open questions resolved by reconnaissance

- [x] Can current fallback account/category resolution prove readiness? **No.** It can invent a usable manual-review default and therefore is too weak for Ready.
- [x] Is a new posting path needed? **No.** The existing explicit review/confirmation/posting path remains the sole path.
- [x] Does #511 require new source, schema or provider behavior? **No.** It classifies existing candidate facts plus current account/category options.

## Research

Research is evidence, not implementation authority. Current code/tests remain higher authority for runtime behavior.

### Sources reviewed

1. **MoneyFlow Research — community corpus decision intelligence**  
   `https://github.com/Thunderkill016/moneyflow-research/blob/main/docs/product/2026-08-28-community-corpus-decision-intelligence.md`  
   Establishes that capture/manual-entry and maintenance burden are the strongest repeated signals in the current adjudicated Vietnamese community subset. It does not prove market prevalence or authorize auto-posting.

2. **MoneyFlow Research PR #4 — low-maintenance acquisition sequence (candidate research)**  
   `https://github.com/Thunderkill016/moneyflow-research/pull/4`  
   Candidate evidence ranks exception-first Inbox review before broader file/OCR/provider work and explicitly rejects fuzzy/semantic matching or fallback guesses as a way to inflate Ready. Because the PR is unmerged, it is supporting evidence only.

3. **YNAB — Approving and Matching Transactions**  
   `https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i`  
   Current official guidance demonstrates a review model with approve/reject/match/categorize and bulk actions. YNAB now auto-approves some matched imports; that behavior **does not apply** because #511 explicitly requires no automatic approval.

4. **Actual Budget — Importing Transactions**  
   `https://actualbudget.org/docs/transactions/importing/`  
   Current official guidance prefers source IDs when available and documents duplicate avoidance/matching. Its fuzzy fallback behavior is not a MoneyFlow requirement and is specifically outside #511.

### Applied conclusion

Adapt only the common trust pattern: make the clearly-actionable set cheaper to review while preserving visible exceptions and correction paths. Do not import another product's matching threshold, provider stack or auto-approval behavior.

## Specification

### Problem

A user with many ordinary pending Inbox candidates must currently decide row-by-row which ones are safe to group. The system has enough deterministic information to identify some candidates that need no fallback guessing, but it does not expose that as one shared domain/UI contract.

### User stories

- As a user reviewing imports, I can immediately see how many pending candidates are deterministically Ready.
- As a user, I can select the Ready set without clicking each Ready row individually.
- As a user, I still confirm the count/consequence before any ledger write.
- As a user, every low-confidence, duplicate, transfer-like, invalid or unresolved candidate stays visibly attention-required until I explicitly review it.

### Readiness contract

Implementation must add **one pure, testable classifier** shared by Inbox presentation and grouped-selection logic. It returns a machine-readable result for a candidate using only candidate facts plus current account/category options.

A candidate is `ready` only when **all** conditions hold:

1. `status === "pending"`;
2. `kind` is `income` or `expense`;
3. `confidence !== "low"`;
4. `possibleDuplicate !== true`;
5. `possibleTransfer !== true`;
6. `amount` satisfies the existing positive safe-integer VND constraint;
7. `occurredOn` satisfies the existing ledger date constraint;
8. the candidate contains explicit account evidence (`accountId` or account name) that resolves to a current account **without fallback-to-first**;
9. the candidate contains explicit category evidence (`categoryId` or category name) that resolves to a current category of the same income/expense kind **without fallback-to-first**;
10. constructing the resulting money post through the existing validation boundary succeeds without invented account/category choices.

Every other pending candidate is `needs_attention` with one or more machine-readable reason codes. The initial reason vocabulary must cover at least:

- `low_confidence`;
- `possible_duplicate`;
- `possible_transfer`;
- `transfer_kind`;
- `invalid_amount`;
- `invalid_date`;
- `account_missing_or_unresolved`;
- `category_missing_or_unresolved`;
- `category_kind_mismatch`;
- `invalid_posting_draft` when an existing post invariant rejects an otherwise-classified money draft.

Non-pending rows are not Ready and do not enter the pending Ready/Attention partition.

### UX contract

- Inbox exposes textual **Sẵn sàng** and **Cần xem lại** states/counts (or semantically equivalent Vietnamese copy); state is not color-only.
- The user has a direct action to select the Ready set.
- Selecting Ready does **not** approve or post anything.
- Existing explicit confirmation remains before grouped posting and states the selected count/consequence.
- Only Ready candidates can be admitted through the grouped Ready action.
- Manual single-review, reject, duplicate review and transfer review paths remain available.
- Transfers never join grouped Ready approval in this slice.
- Keyboard/focus behavior for the changed controls must remain usable on desktop; touch targets and responsive layout must remain within existing audit contracts.

### Acceptance criteria

- [ ] One pure readiness classifier is used by both UI grouping/filtering and Ready-set selection logic.
- [ ] Pending candidates partition into `ready` and `needs_attention`; attention results include machine-readable reasons.
- [ ] Every exclusion in the Readiness contract has a unit test.
- [ ] Classifier proves explicit account/category resolution and never treats first-option fallback as Ready evidence.
- [ ] Inbox shows Ready count and a one-action way to select the Ready set.
- [ ] Existing explicit confirmation remains mandatory before any ledger write.
- [ ] No auto-approval/posting is introduced.
- [ ] Candidate-specific idempotency/recovery semantics are unchanged.
- [ ] Manual single-review, reject, duplicate and transfer paths still work.
- [ ] Demo/authenticated modes use the same classifier semantics.
- [ ] Mixed-batch browser/E2E: select Ready → explicit confirm → only Ready rows post; all exceptions remain pending and visible.
- [ ] Accessibility/responsive checks show the new state/action is textually understandable and keyboard/touch usable.
- [ ] Before/after interaction count is measured on the same representative mixed fixture and reported in the implementing PR.

### Representative intervention fixture

Use one deterministic browser fixture containing **6 pending candidates: 3 Ready + 3 Needs attention** (covering at least low confidence, duplicate and transfer/transfer-like or unresolved evidence).

Count an intervention as one user activation that changes selection or advances the grouped approval flow. Record actual baseline from the pre-change UI before implementation. Planning hypothesis only: if baseline requires selecting three Ready rows individually + entering review + confirming (5 activations), a Ready-set selector + review + confirm would be 3 activations, a 40% reduction. **This number is not acceptance evidence until the browser test measures the real flow.**

### Required states

- Loading: existing Inbox loading behavior remains truthful.
- Empty: no pending candidates and zero Ready remain understandable.
- Populated: mixed Ready/Attention batch is the primary acceptance fixture.
- Validation/error: posting failure uses the existing error/recovery path; classification does not mask it.
- Recovery/undo: candidate idempotency/recovery semantics stay unchanged.
- Long data / large VND: existing safe-integer and overflow audits remain authoritative.
- Mobile/tablet/desktop: bounded Inbox controls must remain reachable and readable.
- Accessibility: textual state, keyboard operation and focus return are required where affected.

### Financial and security constraints

- Readiness is advisory workflow state, not a new stored financial fact.
- No candidate becomes a ledger fact until the existing explicit posting path succeeds.
- Source evidence never establishes `reconciled`.
- No weakening of duplicate/transfer guards, RLS, tenant ownership, idempotency or recent-auth boundaries.
- Shared/imported source material remains untrusted input.

### Out of scope

- automatic approval/posting;
- behavior learning or inferred rules;
- AI/LLM mutation;
- fuzzy/semantic duplicate or transfer expansion;
- provider/bank/native integration;
- new OCR/document parsing;
- schema, RLS, Auth or deployment changes;
- transfer bulk approval or transfer lifecycle changes;
- broad Inbox redesign;
- using first account/category defaults as readiness proof.

## Implementation plan

### Architecture fit

Keep readiness in the existing Inbox review domain boundary (or one focused adjacent pure module if dependency direction requires it). The classifier must accept candidate + current account/category options and return `ready | needs_attention` plus reasons. UI computes display counts from that classifier; Ready-set selection uses the same result, preventing policy drift.

Manual review may continue using the current fallback helpers for convenience, but readiness must use strict explicit resolvers or strict options that cannot fall back.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/review.ts` or focused adjacent helper | Add strict pure readiness classification and Ready partition; reuse existing post validation | One correctness owner |
| `src/lib/inbox/review.test.ts` | Pin positive case and every exclusion/reason | Financial workflow safety |
| `src/lib/inbox/candidate-store.ts` | Retire/redirect only the review-filter semantics that conflict with shared readiness; avoid duplicate policy | UI/domain consistency |
| `src/components/inbox/inbox-page.tsx` | Derive Ready/Attention counts and Ready-set selection from classifier | Exception-first flow |
| `src/components/inbox/inbox-bulk-bar.tsx` | Add bounded Ready selection affordance if this is the owning surface | Reduce interventions without auto-posting |
| related browser/E2E spec | Mixed-batch explicit-confirmation proof + intervention count | End-to-end acceptance |

Final file set may shrink after implementation reconnaissance; no drive-by refactor is authorized.

### Data and migration impact

- Schema/migration: none expected and not authorized by this packet.
- RLS: unchanged.
- Backfill: none.
- Stored candidate state: unchanged; Ready/Attention is derived from current facts/options.
- Compatibility: existing pending/approved/rejected records remain valid.
- Rollback: one focused revert restores prior review selection behavior; no migration rollback needed.

### Risks and counterexamples

| Risk/counterexample | Prevention/evidence |
|---|---|
| Fallback account/category silently expands Ready | Strict explicit resolvers + negative tests |
| Duplicate/transfer row enters grouped approval | Reason-coded exclusions + mixed-batch browser proof |
| UI and selection classify differently | One shared pure classifier |
| Ready label is mistaken for automatic posting | Selection-only action + unchanged explicit confirm + copy test/browser assertion |
| Current account/category disappears after classification | Reclassify from current options before grouped action; existing post validator remains final guard |
| Click reduction is manufactured by weakening checks | Same fixture; exceptions must remain pending; correctness is co-primary metric |
| Demo and auth drift | Pure domain helper shared by both modes + representative browser coverage |

### Verification plan

Implementation is Class 3 because it affects which financial candidates can enter grouped posting UX, despite no expected schema change.

Before implementation starts after planning merge:

- `npm run plan:resolve`
- `npm run agent:doctor -- --json`

During implementation:

- Red-green unit tests for readiness and all exclusions.
- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:architecture`
- `npm run check:css-ownership` / `npm run check:code-css-ownership` when presentation changes select them.
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- risk-selected `npm run test:db`, `npm run test:e2e`, `npm run test:ui-audit:pr` as selected by policy/doctor.
- Exact-head GitHub required checks and independent review.

A build does not prove browser behavior, RLS, provider state or physical-device behavior. No production/provider write is expected for this slice.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P1 | Verify issue against current code/tests | main@6298e6c | code references above | done |
| P2 | Research current exception/review patterns and applicability | P1 | 4 bounded sources + limits | done |
| P3 | Specify readiness/UX/metric/rollback contract | P1–P2 | this packet | done |
| P4 | Select #511 as sole current agent-executable slice | P3 | planning PR board + CI | in_progress |
| I1 | Implement pure strict classifier from fresh post-merge main | P4 owner merge | red-green unit evidence | blocked |
| I2 | Wire exception-first UI and Ready-set selection | I1 | component/browser evidence | blocked |
| I3 | Verify mixed batch, intervention delta, regressions and exact head | I2 | acceptance matrix + selected gates | blocked |
| I4 | Same-PR completion convergence and owner handoff | I3 | archived packet + board/memory projection + PR memory | blocked |

## Evaluation

### Acceptance evidence

Planning only; runtime acceptance remains pending until selection authority merges and implementation executes.

| Criterion | Evidence now | Result |
|---|---|---|
| Problem exists in current code | `needs_review`, confidence-only bulk partition, fallback resolvers | confirmed |
| Bounded implementation path exists | existing Inbox review/confirmation/post validator | confirmed |
| Research supports exception-first without weaker trust | corpus + official YNAB/Actual + candidate research | supported with limits |
| Runtime acceptance criteria | not yet implemented | pending |
| Intervention reduction | planning hypothesis only | pending measurement |

### Review focus

Independent evaluation must specifically inspect:

- strict account/category evidence versus fallback helpers;
- every exclusion reason and transfer/duplicate handling;
- confirmation remains mandatory;
- no auto-post side effect in classifier/selection;
- demo/auth parity;
- interaction-count measurement methodology;
- no unrelated Inbox/source/provider expansion.

### Remaining limitations

- The corpus is tech-community-skewed and does not establish Vietnam-wide prevalence.
- Research PR #4 is currently candidate evidence, not merged research authority.
- The proportion of real future candidates that satisfy strict Ready is unknown; #511 must measure behavior rather than assume impact.
- No physical-device claim follows from browser acceptance alone.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks/unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-28 | researcher/planner | owner review | planning | issue #511, current code/tests, this packet, board selection candidate | CI + owner merge pending; runtime untouched | Review/merge planning PR if exact-head gates are green |

### Current permission boundary

- Granted scope: planning/authority branch writes and PR creation only.
- Repository: `Thunderkill016/moneyflow`.
- Runtime code writes before selection merge: forbidden by issue #511 handoff.
- Forbidden writes: `main`, provider configuration, production/user data, schema/RLS/Auth, branch protection/required checks.
- Human approval required before: merge of planning PR; any widened requirement; production/provider operation.
- Rollback/stop condition: issue scope widens, strict readiness cannot reuse current post invariants, or board/plan authority fails closed.

## Delivery record

- Planning branch: `plan/511-inbox-exception-first-review`
- Planning PR: pending creation
- Implementation branch/PR: not started; forbidden until planning PR merges
- CI: pending
- Production deployment: not applicable to planning
- Production/provider evidence: none
- Packet completion/archive: pending implementing PR lifecycle completion
