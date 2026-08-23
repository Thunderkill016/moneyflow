# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-23
**Runtime/financial baseline:** `eb8861c71dbc5b8173e7e48fff1293470a639816` (PR #447 merged).
**Post-merge projection:** PR #449
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md` after `npm run plan:resolve` passes.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 is the master product-direction authority: safely acquirable digital transactions should not require permanent retyping, while one user-owned ledger remains financial truth. Manual entry stays first-class for cash, missing/off-system evidence and corrections.

Dependency order is source/evidence → candidates/provenance → normalization/dedup/matching → trustworthy ledger facts → reconciliation/correction → understanding/review → connected planning → automation → selective read-only providers → wealth/together/optional intelligence when validated.

Source adapters create evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity; different-ID lineage is accepted only when the source explicitly supplies predecessor identity.

Release readiness remains separate from product development. Product work cannot substitute for provider read-back, production evidence, legal review, physical-device proof or owner decisions.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- VND is integer đồng; transfers are balanced account movements and neutral to income/expense/net.
- Authenticated ledger data is server-owned; demo state is browser-local.
- Ledger facts support edit plus recoverable soft delete where required.
- Account-leg reconciliation states are `pending | cleared | reconciled`.
- `reconciled` is statement-close truth: statement completion creates it, reopening returns it to `cleared`, and reconciled financial facts are mutation-guarded.
- Planning includes category budgets, recurring commitments/income and savings goals.
- Understanding includes weekly/monthly/yearly reports and controlled import/export.
- Complete versioned archive lives at `/settings/backup`; hosted restore remains unexecuted under RRB-02.
- Repository/static, unit/domain, database, browser, provider, production, physical-device and owner/legal evidence are separate proof layers.

## 3. Acquisition and reconciliation truth

### #434 / PR #435 — atomic Direct CSV

Authenticated Direct CSV persists import batches/candidates/provenance and commits selected rows through one batch-atomic approval boundary. A failed selected financial approval rolls back the batch rather than leaving a partial ledger commit.

### #436 / PR #437 — later source evidence for an existing fact

Authenticated Inbox can conservatively attach later non-manual source evidence to one reviewed existing unprovenanced money fact. Attachment writes provenance + candidate linkage without changing transaction values or reconciliation; user corrections remain authoritative.

### #438 / PR #439 — deleted exact-source reimport

Live same-ID remains hard duplicate. A soft-deleted same-ID with unchanged fingerprint/version can be explicitly restored as the same transaction; changed/missing evidence stays blocked. Restore preserves entries, reconciliation and canonical provenance.

### #440 / PR #441 — changed live same-ID observations

Changed/unknown evidence under a stable source ID becomes hard source evidence; a reviewed observation can link to the same transaction without changing transaction/entry/reconciliation/canonical-provenance values. Approved observation evidence cannot be fabricated by ordinary authenticated INSERT/UPDATE.

### #442 / PR #445 — explicit different-ID lineage + lifecycle evidence

Merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0`.

- source observations can carry nullable `pending | posted | removed` lifecycle evidence and an explicit predecessor source ID;
- different-ID lineage is never inferred from amount/date/merchant/fingerprint similarity;
- exact source identity resolves through approved observation history before canonical provenance fallback;
- same-ID revisions compare against the latest safe reviewed observation baseline;
- explicit live predecessor identity produces hard `source_predecessor_match`; deleted predecessors stay hard-blocked;
- reviewed replacement observations preserve ledger, reconciliation, deletion state and canonical provenance;
- one `(user, source, source_external_id)` cannot bind to two financial transactions.

### #448 / PR #449 — reviewed lifecycle → clearing projection

PR #449 is candidate evidence until merge. If its exact squash merge activates this projection:

- source identity also carries the latest reviewed lifecycle baseline, so a same-ID lifecycle-only transition is no longer lost as an unchanged duplicate;
- `pending` and `removed` remain observation-only and cannot delete/demote ledger truth;
- reviewed `posted` evidence may advance exactly one live income/expense account leg from MoneyFlow `pending` to `cleared` only when current kind, account, occurred date and signed amount still match exactly;
- a source never creates `reconciled`; statement reconciliation remains stronger truth;
- if the user has corrected ledger economics, changed posted evidence is preserved but cannot overwrite or clear the mismatched fact;
- already-cleared/reconciled review is replay-safe and non-demoting;
- explicit predecessor posted evidence uses the same policy; transfers/splits remain outside this slice;
- the reviewed financial effect uses the canonical reconciliation state RPC and existing privacy-safe audit;
- reviewed posted paths preserve reconciliation account→transaction lock order before source helpers can lock target rows.

## 4. Agent/runtime and delivery truth

PR #447 merged as `eb8861c71dbc5b8173e7e48fff1293470a639816` and replaced the old monolithic dispatcher with `scripts/agent-harness/`:

- thin provider-neutral coordinator;
- named source/workspace/permission/agent capability seams;
- Codex is one agent provider rather than the loop itself;
- append-only JSONL run journals; accepted interrupted work never silently replays;
- fail-loud provider capability/readiness checks;
- legacy dispatcher-state migration without deleting rollback evidence;
- holder-owned child cleanup with bounded termination escalation;
- exact-main worktree isolation, token stripping and full Git/GitHub command guards.

The same PR also made same-PR lifecycle convergence the default. A current slice must archive its packet, clear projected current work and update current memory in its own PR before owner handoff. Dedicated lifecycle-cleanup PRs are recovery-only.

PR #449 follows that contract: `docs/plans/active/448-source-lifecycle-reconciliation.md` has moved to `docs/plans/completed/2026-08-23-448-source-lifecycle-reconciliation.md`, the board projects zero agent-executable current slices, and no NEXT child is pre-promoted. While open, only #448 acceptance defects/evaluation/verification may continue.

## 5. Current execution state

Master #432 remains active. Merged P1 sequence is #435 atomic source ingestion → #437 later-source attachment → #439 deleted-source restore precedence → #441 changed same-ID observation preservation → #445 explicit different-ID lineage/lifecycle evidence.

PR #449 is the bounded candidate completion for the next P1 policy slice. Its draft CI #2915 is not acceptance evidence because substantive jobs were skipped. Final acceptance requires a non-draft exact-head Class 3 run with policy/static/unit/build/database/browser/UI/e2e plus CodeQL and Secret History actually executed.

After an exact PR #449 merge, fresh-main authority resolution may select the next bounded #432 P1 slice: migrate one real file/share source through the common acquisition/provenance/reconciliation path. That NEXT work is not authorized by this projection.

## 6. Release and external evidence boundaries

Still open and independent of PR #449:

- **RRB-08:** current selected deployed release candidate must be proved on a real owner-observed phone.
- **RRB-04:** provider/Auth/firewall read-back needs authorized current provider evidence.
- **RRB-05:** published support/privacy contact exists but operator control is unproven.
- **RRB-06:** Vietnam personal-data legal/privacy operational review needs competent owner/legal review.
- **RRB-09:** production deployment/provider identity needs current read-back.
- **RRB-02:** hosted restore proof or explicit owner limitation decision.
- **RRB-03:** destructive recent-auth provider-edge proof or explicit limitation.
- Public-beta go/no-go remains an owner decision after its evidence contract clears.

## 7. Authority and supersession register

- #432 / PR #433 is the active master program; `docs/plans/PRODUCT_DEVELOPMENT_PLAN.md` is predecessor history.
- PR #431 is an open conflicting pre-#432 candidate, not authority.
- #403 performance and #426 simplification remain held unless deliberately promoted.
- #447 supersedes the executable monolithic dispatcher and the routine feature→second-lifecycle-PR delivery pattern.
- #449, if merged, narrows the #445 statement “source lifecycle is evidence only” to: lifecycle is always source evidence; only reviewed exact `posted` evidence may establish MoneyFlow `cleared`, never `reconciled` or ledger economics.

## 8. Immediate handoff rule

While PR #449 is open under this projection, do not start the next source migration. Fix only #448 acceptance defects, evaluator findings and exact-head verification failures. Merge remains owner-authorized. After merge, resolve authority from fresh `main` before promoting anything from NEXT.