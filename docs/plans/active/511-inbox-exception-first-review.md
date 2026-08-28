# Inbox exception-first review without auto-posting

**Status:** specified — selection candidate until PR #521 merges
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** Issue #511; implementation PR intentionally not started
**Parent authority:** #432 P2 — Low-Maintenance Ingestion
**Baseline:** `main@6298e6c52cfff6f3a972cf72cf79022e341ce638`
**Last updated:** 2026-08-28

## Outcome

Reduce review work for already well-formed Inbox candidates by separating a deterministic **Sẵn sàng** set from **Cần xem lại**, then letting the user explicitly select the Ready set before the existing confirmation/posting path.

Success is fewer interventions on the same representative mixed batch without lowering correctness, duplicate/transfer safety, provenance, idempotency or explicit approval. Classification never posts by itself.

This packet becomes execution authority only after PR #521 is merged. Runtime implementation must then start from fresh `main`, with `npm run plan:resolve` and `npm run agent:doctor -- --json` passing first.

## Repository reconnaissance

### Current behavior

Current code confirms issue #511:

- `filterCandidates(..., "needs_review")` currently means low confidence only.
- `partitionBulkApprove` gates selected pending rows by confidence, not one deterministic Ready contract.
- `draftFromCandidate` can obtain account/category through helpers that fall back to the first current option. That is acceptable convenience for manual review but **cannot prove readiness**.
- `buildLedgerPost` is stricter: amount must be a positive safe-integer VND value, date must match `YYYY-MM-DD`, money rows need an existing account and same-kind category, and transfers need two distinct accounts.
- Inbox already owns explicit selection, confirmation and posting. #511 changes selection cost and exception visibility, not the ledger-write boundary.

### Relevant areas

| Area | Boundary |
|---|---|
| `src/lib/inbox/candidate-store.ts` | candidate facts/current filters; do not create a second truth path |
| `src/lib/inbox/review.ts` | review drafts, bulk partition and ledger-post validation; preferred classifier owner |
| `src/components/inbox/inbox-page.tsx` | list/filter/selection/confirmation orchestration |
| `src/components/inbox/inbox-bulk-bar.tsx` | bounded Ready-set affordance if this remains the owning control |
| related unit/browser tests | classifier exclusions, mixed-batch posting and interaction proof |

### Constraints confirmed

- VND remains integer đồng.
- Transfers remain manual/single-row and never grouped Ready approval.
- Possible duplicates and possible transfers stay attention-required; no matching semantics change.
- Candidate idempotency/recovery behavior remains unchanged.
- Demo and authenticated modes share readiness semantics.
- State cannot rely on color alone.
- No schema, RLS, Auth, provider, deployment, native-device or AI mutation change is authorized.

## Research

Research is evidence, not implementation authority; code/tests outrank it for current behavior.

1. **MoneyFlow Research — community corpus decision intelligence** — `https://github.com/Thunderkill016/moneyflow-research/blob/main/docs/product/2026-08-28-community-corpus-decision-intelligence.md`. It supports maintenance/capture burden as a strong repeated signal in the current adjudicated subset, but does not establish market prevalence or authorize automation.
2. **MoneyFlow Research PR #4 — low-maintenance acquisition sequence** — `https://github.com/Thunderkill016/moneyflow-research/pull/4`. Candidate evidence ranks #511 before broader file/OCR/provider work and rejects fuzzy/semantic or fallback guesses as a way to inflate Ready. It is unmerged and therefore supporting evidence only.
3. **YNAB — Approving and Matching Transactions** — `https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i`. Official current guidance demonstrates approve/reject/match/categorize and bulk review. YNAB's automatic approval for some matched imports does **not** apply because #511 forbids automatic approval.
4. **Actual Budget — Importing Transactions** — `https://actualbudget.org/docs/transactions/importing/`. Official current guidance prefers stable imported IDs when available and documents duplicate matching. Its fuzzy fallback behavior is not a MoneyFlow requirement and is outside #511.

**Applied conclusion:** adapt only the shared trust pattern — make the clearly actionable set cheaper to review while preserving visible exceptions and correction paths. Do not import another product's threshold, provider stack or auto-approval behavior.

## Specification

### Readiness contract

Add **one pure, testable classifier** shared by Inbox presentation and Ready-set selection. It accepts candidate facts plus current account/category options and returns `ready | needs_attention` with machine-readable reasons.

A candidate is `ready` only when all hold:

1. `status === "pending"`;
2. `kind` is `income` or `expense`;
3. `confidence !== "low"`;
4. `possibleDuplicate !== true`;
5. `possibleTransfer !== true`;
6. amount satisfies the existing positive safe-integer VND constraint;
7. date satisfies the existing ledger date constraint;
8. explicit candidate account evidence resolves to a current account **without fallback-to-first**;
9. explicit candidate category evidence resolves to a current same-kind category **without fallback-to-first**;
10. the existing money-post validation succeeds without invented account/category choices.

Every other pending candidate is `needs_attention`. Reason codes must cover at least:

- `low_confidence`;
- `possible_duplicate`;
- `possible_transfer`;
- `transfer_kind`;
- `invalid_amount`;
- `invalid_date`;
- `account_missing_or_unresolved`;
- `category_missing_or_unresolved`;
- `category_kind_mismatch`;
- `invalid_posting_draft` for another existing post invariant.

Non-pending rows never enter the pending Ready/Attention partition.

### UX contract

- Show textual **Sẵn sàng** and **Cần xem lại** state/counts or semantic equivalents.
- Provide one direct action to select the Ready set.
- Selecting Ready never approves/posts.
- Preserve the existing explicit confirmation with selected count/consequence before grouped posting.
- Only Ready rows enter the grouped Ready action.
- Preserve manual single-review, reject, duplicate and transfer paths.
- Transfers never join grouped Ready approval.
- Changed controls remain keyboard/touch usable and responsive.

### Acceptance criteria

- [ ] One classifier owns readiness for both UI and grouped selection.
- [ ] Pending rows partition into `ready` and `needs_attention` with reason codes.
- [ ] Every exclusion above has unit coverage.
- [ ] Explicit account/category resolution is proven; first-option fallback is never Ready evidence.
- [ ] Inbox exposes Ready count and one-action Ready-set selection.
- [ ] Explicit confirmation remains mandatory before every grouped ledger write.
- [ ] No auto-approval/posting exists.
- [ ] Candidate idempotency/recovery remains unchanged.
- [ ] Manual single-review/reject/duplicate/transfer flows still work.
- [ ] Demo/authenticated modes use identical classifier semantics.
- [ ] Mixed-batch E2E: select Ready → explicit confirm → only Ready posts; all exceptions stay pending/visible.
- [ ] Accessibility/responsive evidence covers the changed state/action.
- [ ] Implementing PR reports measured before/after interaction count on the same fixture.

### Representative intervention fixture

Use six pending candidates: three Ready plus three attention-required rows covering at least low confidence, duplicate and transfer/transfer-like or unresolved evidence.

Count one intervention as one user activation that changes selection or advances grouped approval. Record the actual pre-change baseline first. Planning hypothesis only: three individual row selections + enter review + confirm = 5 activations versus Ready-set selection + review + confirm = 3, a possible 40% reduction. **This is not acceptance evidence until measured in the browser flow.**

### Financial/security boundaries

- Readiness is derived workflow state, not stored financial truth.
- A candidate becomes a ledger fact only through the existing explicit posting path.
- Source evidence never establishes `reconciled`.
- Duplicate/transfer guards, tenant ownership, RLS and idempotency are not weakened.
- Imported/shared material remains untrusted input.

### Out of scope

Auto-posting; behavior learning; AI mutation; fuzzy/semantic duplicate or transfer expansion; provider/bank/native integration; OCR/document parsing; schema/RLS/Auth/deployment changes; transfer bulk approval; broad Inbox redesign; first-option defaults as readiness proof.

## Implementation plan

### Architecture fit

Keep readiness in `src/lib/inbox/review.ts` or one focused adjacent pure module if dependency direction requires it. UI counts and Ready-set selection must consume the same classifier result. Manual review may retain convenience fallbacks; readiness must use strict explicit resolution.

### Planned changes

| Area | Planned change |
|---|---|
| review domain | strict classifier + partition; reuse existing post validation |
| unit tests | positive Ready case plus every exclusion/reason |
| candidate filter boundary | redirect only conflicting review semantics; avoid duplicated policy |
| Inbox page/bulk bar | textual counts + Ready-set selection, no auto-post |
| browser/E2E | mixed-batch confirmation proof + measured intervention delta |

Final file set may shrink after implementation reconnaissance; no drive-by refactor is authorized.

### Data/rollback

No migration, RLS or backfill is expected or authorized. Ready/Attention is derived from current data. A focused revert restores prior selection behavior without data rollback.

### Risks and prevention

| Risk | Prevention |
|---|---|
| fallback expands Ready | strict resolvers + negative unit tests |
| duplicate/transfer enters grouped post | reason exclusions + mixed-batch E2E |
| UI/selection drift | one classifier |
| Ready is mistaken for posting | selection-only action + unchanged confirmation |
| options change after classification | classify from current options before action; post validator remains final guard |
| click reduction weakens correctness | same fixture and exceptions must remain pending |
| demo/auth drift | shared pure helper + browser coverage |

### Verification plan

Implementation is Class 3 because it changes which candidates can enter grouped financial-posting UX.

After PR #521 merges, fresh implementation branch must run `plan:resolve` and `agent:doctor`. Expected implementation evidence: red-green unit tests, knowledge/CI-policy, deployment-env, architecture, lint, typecheck, full unit suite, build, and policy-selected database/E2E/UI audit gates. Exact-head required checks and independent review remain mandatory.

No production/provider write is expected for this slice.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1 | Verify #511 against current code/tests | confidence-only review/bulk + fallback resolvers + strict post validator | done |
| P2 | Focused research and applicability limits | four sources above | done |
| P3 | Specify readiness/UX/metric/rollback contract | this packet | done |
| P4 | Select #511 as sole current slice | PR #521 board + exact-head CI | in_progress |
| I1 | Implement strict classifier from fresh post-merge main | red-green unit evidence | blocked on owner merge |
| I2 | Wire exception-first UI/Ready selection | component/browser evidence | blocked |
| I3 | Verify mixed batch, intervention delta and exact head | acceptance matrix/gates | blocked |
| I4 | Same-PR completion convergence and owner handoff | archived packet + board/memory projection | blocked |

## Evaluation

Planning evidence currently confirms the problem, bounded reuse path and safety contract. Runtime acceptance and intervention reduction remain unimplemented and unclaimed.

Independent evaluation must inspect strict versus fallback resolution, every exclusion reason, confirmation preservation, no auto-post side effect, demo/auth parity, interaction-count methodology and scope compliance.

### Remaining limitations

- Corpus evidence is tech-community-skewed and not Vietnam-wide prevalence.
- Research PR #4 is candidate evidence.
- Real Ready proportion is unknown; #511 must measure rather than assume impact.
- Browser evidence will not imply physical-device proof.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-28 | researcher/planner | owner review | planning | #511, current code/tests, packet, PR #521 | exact-head CI + owner merge pending | merge planning PR only if gates/review are green |

### Permission boundary

Planning/authority branch writes and PR creation are allowed. Runtime code before planning merge, direct `main` writes, production/provider/user-data writes, schema/RLS/Auth changes and branch-protection/required-check changes are forbidden. Owner approval is required for merge and any widened requirement.

## Delivery record

- Planning branch: `plan/511-inbox-exception-first-review`
- Planning PR: #521
- Implementation branch/PR: not started; forbidden until #521 merges
- CI: exact-head rerun pending after diff-hygiene fix
- Production/provider evidence: none
- Packet archive: deferred to the implementation PR that completes #511
