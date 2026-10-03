# Audit remediation — 2026-10-02

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #751 merged; owner request 2026-10-03 authorizes the remaining audit repairs on a focused branch; follow-up #752

## Outcome

Repair OAuth mutation authorization, historical-reference editing, offline cache
session races, demo report authority and concurrent proposal replay.

## Repository reconnaissance

Baseline `3c642077`. Browser probes reproduced historical-account reassignment
and demo Reports/CSV using seeds rather than the persisted ledger. Deterministic
probes reproduced cache repopulation after logout and concurrent agent proposals.
OAuth scopes do not limit database access: current RPCs enforce user ownership
without distinguishing third-party clients.

## Research

Supabase OAuth token-security documentation establishes that database/RPC
authorization must enforce `client_id`; application capability allowlists alone
do not restrict direct PostgREST access. Existing first-party mutation and tenant
contracts remain the authorities. No dependency is introduced.

## Specification

- OAuth writes are rejected at every owned-table boundary, including writes
  inside SECURITY DEFINER RPCs.
- Only explicitly database-allowlisted OAuth clients may insert pending agent
  proposals belonging to the caller; they cannot approve or mutate ledger facts.
- Missing database allowlist denies proposals even if the application allowlist
  contains the client. Provider configuration is a separately approved operation.
- Historical editor references never silently fall back to another record.
- Session cleanup invalidates in-flight offline cache writes.
- Demo Reports page derives from the browser-owned ledger; the demo CSV route
  keeps its server href/download contract, so demo CSV content still reflects
  server seeds (documented remaining gap — the server cannot observe
  browser-local rows).
- Concurrent agent requests share one durable proposal identity.

## Implementation plan

Class 3. Add an additive database trigger boundary with catalog and caller tests;
repair each existing client owner in place with regressions. No provider setting,
production migration or data write is authorized by this task.

Verification: unit, lint, typecheck, build, focused browser proof and real pgTAP
in CI. Local environment has no Docker/PostgreSQL; local checks cannot substitute
for database evidence. Rollback is a reviewed follow-up migration removing guards
plus reverting the affected application changes; never edit deployed migrations.

## Tasks

- [x] OAuth table/RPC guard and client tests.
- [x] Historical editor references and regression.
- [x] Offline session generation and race regression.
- [x] Demo report/export ledger hydration.
- [x] Atomic agent proposal and replay handling.
- [ ] Exact-head verification and review handoff.

## Evaluation

Local verification on `3c642077` plus this diff:

- `npm test`: 1970 passed, including new session-rotation and concurrent-replay regressions.
- `npm run lint`, `typecheck`, production build: pass.
- `check:knowledge`, `check:architecture`, `check:capabilities`, `check:migrations`: pass (74 pinned).
- Browser probe (production build, demo): archived-account save is blocked with
  "Tài khoản cũ không còn hoạt động", stored account stays MB Bank.
- Browser probe (production build, demo): local 777.000₫ ledger row appears in
  Reports totals. Demo CSV keeps the server href/download contract, so its
  content still reflects server seeds; recorded below as the remaining gap.
- CI browser smoke initially failed on the removed demo export href; the export
  contract was restored and the page hydration kept, preserving both the fix
  and the existing `a[href]`/download assertions.
- `supabase/tests/database/oauth_mutation_boundary.test.sql` and the agent
  identity unique index require real pgTAP in CI; local env has no
  Docker/PostgreSQL so database evidence is still pending. Migration must not
  ship until that CI gate passes.

## Handoff record

Owner → implementer: fixes authorized on a focused branch. Next allowed action:
implementation and local/CI verification. Deployment/provider writes require a
separate owner decision. No destructive cleanup of historical candidates.

## Follow-up specification — 2026-10-03

Current execution: implementing, branch_write, branch `fix/audit-consistency-20261003`, baseline `ca8a6516`. Owner: fix all issues identified by the current audit. The earlier implementation is merged as #751; its exact-main CI 37029015644 passed (989 SQL assertions, 2 real Auth/database browser cases). Earlier pending statements above describe that historical snapshot.

Class 3: financial presentation/export plus operational documentation. Serves CANON Reality, trustworthy recorded money and the GOV.UK whole-service/iteration gate. Scope: remaining report/CSV mismatch, malformed history (#741), overflow recovery, OAuth configuration documentation and accurate study handoff. No new feature, schema, dependency, provider write, main push, merge or production deployment.

Research: local Next.js server/client and route-handler guides confirm browser storage belongs to client code; existing export-data helper already downloads a text Blob. Supabase OAuth token-security docs, read 2026-10-03, confirm client_id enforcement belongs in database policies, irrespective of OAuth scopes; changelog index checked. Sources: https://supabase.com/docs/guides/auth/oauth-server/token-security and installed Next.js docs. These sources do not prove current production configuration. No code copied or new provider/library adopted.

Specification before implementation:

- Demo report export uses the existing shell mobile visibility option so the action is reachable on phone as well as desktop. Demo report download reads exactly the hydrated browser ledger for the resolved report window, using the existing formula-safe CSV encoder and browser downloader. Authenticated export remains server-owned. Demo export is disabled until hydration; directly requesting the server export in demo returns an explicit conflict instead of seed financial rows.
- Regression tests assert file contents, not only href/download existence: same ledger records and amounts after add/edit/delete/reload (the existing CSV schema has no ID column), current period boundaries, repeats and empty ledger.
- Reuse the #741 validator and regression cases without altering its published branch/history. Invalid history cannot contribute to a capture monthly total; valid leap days remain included.
- A shared guarded transaction-balance projection handles only known validation/overflow errors, including demo anchor reconciliation. Unexpected programming errors remain visible. Overflow renders an explicit unavailable balance section, retains valid report/CSV and never supplies zero as a computed total.
- docs/configuration.md owns the application plus database proposal allowlist contract, activation/read-back and rollback. Other operator docs link to it. No allowlist is set by this task.
- Existing human study remains pending actual consented observation. Correct technical prerequisites and execution instructions; synthetic browser results cannot become participant evidence.

Verification: regression units, existing desktop/mobile custom-report browser specs with content assertions, overflow browser case, authenticated export ownership regression where available; lint/typecheck/build, knowledge/architecture/capabilities/migration/CSS and CI policy checks. Exact-head CI selected by policy. Database behavior is unchanged; no local Docker, and no production/provider validation claim. Rollback: revert this focused application/docs diff; persisted financial data is not changed.

Acceptance: report/CSV parity; invalid history excluded; unsafe balances unavailable with usable report/export and retained data; OAuth docs name both controls and deny-by-default; study evidence truthfully pending. A real participant or physical-device result cannot be produced by an agent acting as the user.

Tasks: implement shared financial guard and demo download; reuse date repair; update browser/domain regressions; reconcile operation/study docs; run selected local and exact-head CI; create PR provenance and handoff. Next allowed action after verification: owner review of concrete PR. Production and human study remain distinct evidence needs.

### Owner observation and bounded capture repair — 2026-10-03

The owner reports actual expense-recording use: entry feels short, category choices feel incomplete, and each transaction repeats the same process. This is qualitative first-party feedback, not a timed participant study or a physical-device acceptance result. No retention or speed percentage is claimed.

Reconnaissance: the fast form shows only two category alternatives, while the full active set is behind a visually ambiguous “Khác” disclosure. The existing persistent keep-open preference is buried in optional details, although it already retains selected kind/account/category and re-focuses amount after successful saves. First repair: label the disclosure “Tất cả danh mục” and expose the existing “Lưu xong thêm tiếp” preference beside required choices, using the same handler and layout owner. Do not silently reuse amount/date/note, add a universal category list or fabricate user financial choices. Browser regression must prove a non-quick category is reachable, the next entry retains choices, and preference survives reopening. The owner clarified that current categories feel overly broad and asked how they are constructed. Current model: flat, 8 default expense + 3 income categories, user-owned custom categories, no subcategory hierarchy. This repair improves access to the full current set; it does not claim to solve taxonomy granularity or change category/report/budget semantics.

Evaluation discovered a real hydration defect in continuous-entry preferences: the one-shot ref was marked complete before its animation frame ran. React development Strict Mode cancels the first effect/frame and re-runs the effect, which then skipped hydration entirely. Move completion into the executed frame; the new browser regression must show a checked keep-open preference and the chosen category surviving reload. This is a dev-effect reproduction, not evidence of the same symptom on deployed production. Initial new report test also used the wrong accessible label (“Chi” rather than the existing “Chi trừ”); corrected the test. Formatter-induced source-contract failures are repaired to tolerate whitespace while preserving the same compact-money/draft assertions, not waived or weakened.

### Follow-up local evaluation snapshot

Final domain suite: 1975/1975 pass on Node 22, no skipped tests. Typecheck and lint pass; 191 CI-policy checks pass; knowledge, architecture, capability manifest, 74 pinned migration identities and CSS ownership pass. Initial formatter-sensitive source contracts failed; assertions were made whitespace-tolerant and the entire suite reran clean. A browser run proved report/CSV parity and overflow recovery but exposed the development hydration defect above; the corrected tree is under a fresh zero-retry desktop/mobile run. Production build, authenticated export browser proof, responsive audit and required exact-head CI remain pending at this snapshot.

Evaluator scope: no schema/migration change and no provider configuration changed; CI path classifier selects application verify/browser/UI/CodeQL and marks database reset not applicable. Required merge/production review is an owner decision after the concrete PR. No claim that human-study or production acceptance is complete.

### Locked-dependency evaluation and handoff

The local install was refreshed to locked Next 16.3.8 without changing the lockfile. Node 22 domain tests reran: 1975 pass, zero skipped/failed. Fresh desktop/mobile report and capture regressions: 22 pass, zero retries. Authenticated financial/CSV browser cases: 2 pass, zero retries against the synthetic ownership double and a production build. These do not establish real database/provider behavior or physical-device usability.

CI on `8b3e0949` passed static quality, 1975 domain tests, policy, build, cross-device audit, CodeQL and secret scan, but failed browser smoke: two demo MVP checks still required the former CSV link. Update those checks to exercise the browser download rather than weaken the export contract. The new local authenticated CSV check also exposed future-dated fixtures (days 5–7 on day 3); reports correctly excluded them. Clamp fixture dates to Vietnam's current day/month, then require a fresh zero-retry run. No report-range behavior was changed to accommodate fixtures. Final exact-head checks after these repairs remain a release gate; see #752's check results for the final commit, not historical run success.

Dependency residual: installation audit reported eight high-severity development dependency entries driven by the same `braces <=3.0.3` advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), checked 2026-10-03. Registry latest 3.0.3 has no patched version. `npm explain` places the installed package in the development toolchain; no application/source script import of braces/micromatch/fast-glob was found. `npm audit --omit=dev` reports zero vulnerabilities for production dependencies; that is audit coverage, not a universal security assertion. Forced suggested major downgrades of Next tooling/shadcn are not an approved or demonstrated root fix. Keep the unpatched tooling risk visible and revisit when upstream provides a compatible repair; this PR does not claim to eliminate it.

Owner → planner steering: prioritize practical multi-source acquisition without paid AI or bank partnerships, retaining simple usage. The existing Capture V2 packet now records the source sequence, connected-journey acceptance and OS boundaries under CANON Stage 0/1. This research does not add a native/OCR provider, paid dependency, auto-posting policy or production operation. Next allowed action: exact-head verification and owner review of #752, then evaluate the connected acquisition journey before choosing its next implementation issue.
