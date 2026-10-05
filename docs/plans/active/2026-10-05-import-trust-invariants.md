# Import explanations, trust boundaries and financial invariants

**Status:** evaluating

**Execution state:** evaluating

**Active role:** evaluator

**Permission scope:** branch_write + approved commit/push/PR/squash merge/main production release

**Owner:** MoneyFlow human owner; Codex implements/evaluates locally

**Issue/PR:** #759 (draft; final-head checks and deployment pending)

**Last updated:** 2026-10-05

## Outcome

Implement the owner's requested valuable directions in order: (1) evidence-based
import review explanations, (2) conservative ledger-trust read boundaries, (3)
independent financial invariant regressions. This bounded first increment serves
`docs/product/CANON.md` Stage 0/1, not a new finance system or acquisition channel.

## Repository reconnaissance

### Current behavior and evidence

- Checkout: `feat/ghi-inline-paste-20261005`, base
  `aa67d59ca530430f813ccd4f9753d7d8dfd826fc`. Capture/UI files and their packet/test
  are already dirty. Preserve them; this task owns only the files listed below.
- Synthetic reproduction on Node 22: Explain calls account digits `0123456789`
  an amount regex match, despite CSV provenance; an ambiguous existing-ledger
  match is described as a shared fingerprint; `2026-02-30` is accepted by
  `buildLedgerPost`; `trusted` with no date displays a clean-ledger claim.
- Existing source identity, lifecycle, explicit heuristic override, reconciliation
  cutoff and balanced account-leg infrastructure already exist. Do not duplicate
  them. `ledger_trust_summary()` defines the read contract and emits a limited
  boundary exactly one day before the earliest known unresolved date.

| Area | Decision |
|---|---|
| `src/lib/inbox/review.ts`, tests | Edit explanation/date validation; preserve approval semantics |
| `src/lib/inbox/provenance.ts`, tests | Reuse dry-run wording and recorded rule evidence |
| `src/lib/ledger-trust.ts`, tests | Validate existing SQL contract without recomputing ledger truth |
| `src/server/ledger-trust.ts` | Withhold inconsistent mapped summaries from all existing consumers |
| `src/lib/account-register.test.ts`, `src/lib/reconciliation.test.ts` | Extend existing independent oracles only where gaps exist |
| Existing capture WIP, migrations, providers | Avoid |

Tests: existing review/provenance/trust/account-register/reconciliation suites.
Constraints: integer VND; relative `.ts` runtime imports in domain modules;
shared demo/live validation; no source completeness inference. Doctor ran:
Docker unavailable, default shell Node 24 outside package engines. Verification
uses official Node 22.23.3 downloaded to `/tmp` with SHA256 checked; no dependency
or runtime configuration changes. No live DB claim is possible here.

## Research

This packet selects four focused sources from the preceding open-source teardown
and MF reference maps; upstream patterns are evidence, not implementation orders.

| Source (accessed 2026-10-05) | Establishes | Limits |
|---|---|---|
| [Actual matching](https://github.com/actualbudget/actual/blob/9732a4463aac2909ac2aad1627085e0eb7a207b5/packages/loot-core/src/server/accounts/sync.ts#L826) | ID and fuzzy matches are different evidence strengths | Do not adopt automatic weak matching, date windows, SQLite/CRDT |
| [Sure anchors](https://github.com/we-promise/sure/blob/e480350d1a7440091ca26a9be35c4bf94cda4ad7/app/models/account/current_balance_manager.rb#L106) | Balance observations retain dates; history differs from current balance | Do not introduce Rails/jobs/caches or claim complete source history |
| [Firefly importer safety catch](https://github.com/firefly-iii/data-importer/blob/07fa5e972a7a933be9c263c9021f78f319a4fd49/app/Support/Internal/DuplicateSafetyCatch.php) | Same-account transfer fallback can change financial semantics | MF rejects mapping conflict; no income/expense fallback |
| [Beancount assertions](https://github.com/beancount/beancount/blob/9747213802acb733ce53acc6e963f5961f47d6cd/beancount/ops/balance.py#L48) | External balance assertions differ from internal balanced entries | Synthetic oracles do not prove bank completeness or DB correctness |

Alternatives: a new matching engine (duplicates existing contracts), provider sync
(not authorized), and generic UI redesign (conflicts with WIP) are rejected.
Selected approach: repair observed gaps in existing boundaries, then strengthen
their regression evidence. No upstream code copied, no dependency adopted;
licenses are recorded in the external research report, not treated as permission
to transplant GPL/AGPL code. No raw user finance data, secrets, telemetry, cost or
new infrastructure introduced. Domain boundary owners remain unchanged.

## Specification

As a reviewer, I can distinguish recorded parser/rule/matching evidence from a
suggestion, so I do not merge the wrong transaction or trust fabricated evidence.
As a ledger owner, I see trust withheld when the read contract contradicts itself.

### Acceptance criteria

- [x] Explain never scans raw text to fabricate parser amount evidence or expose
  unmasked account digits; candidate money and extraction confidence are distinct.
- [x] Recorded parser versions remain historical; fallback parser is explicitly a
  default, not a claim about the original parser. Only valid rule ID/version
  evidence is labeled an applied rule; missing category is not absence of rules.
- [x] Exact-source, lifecycle, deleted-source and ambiguous matches reuse existing
  dry-run wording. Unknown/legacy matches never invent a fingerprint match.
- [x] Mapped trust and presentation fail closed on invalid dates/counts, missing
  boundaries, contradictory status/reason or unresolved-date boundary. Valid SQL
  states preserve their wording/actions and external-coverage caveat.
- [x] Inbox money/transfer approval rejects impossible dates and unsafe/fractional
  VND; valid leap dates pass, same-account transfers remain rejected.
- [x] Synthetic regression oracles exercise balanced legs/transfer-neutral reports
  and same-day reconciliation cutoff without assuming they prove source coverage.
- [x] Paste amount extraction excludes complete calendar-token spans, including
  invalid dates, without shifting source offsets used by labelled matching.
  Decimal units, grouped VND and actual signed amounts remain supported. New
  evidence records `paste_text@1.2`; explicitly recorded older versions stay intact.

States: populated review uses truthful existing Explain surface; absent provenance
is unknown/default; invalid ledger trust is withheld or explicitly unconfirmed;
invalid review input returns existing validation error and does not post. Existing
loading/empty/recovery, keyboard and responsive structures are unchanged. No new
layout, score, action, destructive flow or guessed balance. Large safe integer VND
remains exact. RLS/auth/RPC mutation and recovery contracts are unchanged.

Out of scope: matching policy changes, SQL/schema/backfill, real statement fixtures,
historical balance reconstruction, native capture, wealth/shared finance, AI write,
provider access, production changes, release, new branch and unrelated WIP repair.

## Implementation plan

1. Fix Explain using candidate values and existing provenance wording; add
   counterexamples for raw date/account digits and misleading duplicate reasons.
2. Validate the existing trust contract in its domain module and use that validator
   at shared server mapping and presentation. Do not calculate new trust from UI.
3. Reuse `isValidDateOnly` at Inbox approval and extend existing financial tests
   with independent synthetic oracles. No new application architecture.

Data/migrations/backfill: none. Compatibility: optional legacy provenance remains
readable; unknown evidence no longer presented as proof. Rollback: revert only
this task's owned hunks, leaving capture WIP untouched; no shared writes to undo.

Risks: reject legitimate SQL states (table-driven valid/invalid state tests); replace
ambiguity with fake certainty (reason-specific regressions); changed copy tests
(focused browser review); conflating balance with coverage (retain caveats).

Verification: focused Node 22 tests first; knowledge/architecture/deployment/CSS/
capability/CI-policy contracts, lint, typecheck, full unit suite and production build.
Browser smoke for existing review/reconciliation flows where available. No layout
audit required. No pgTAP/reset: no SQL change and Docker unavailable. Exact-head
CI, authenticated DB/browser and production acceptance remain owner/release gates.

## Tasks

| ID | Task | Dependency | Status |
|---|---|---|---|
| T1 | Evidence-only Explain + regressions | Recon/reproduction | implemented, domain verified |
| T2 | Fail-closed trust contract + regressions | T1 | implemented, domain verified; server wiring statically checked |
| T3 | Date guard + independent financial oracles | T2 | implemented, domain verified |
| T4 | Evaluate diff, run gates, record limitations | T3 | locally evaluated; all local gates green after owner-authorized test follow-up; release gates remain |

## Handoff record

| Date | From → to | State | Evidence | Next allowed action |
|---|---|---|---|---|
| 2026-10-05 | researcher → planner | specified | Owner request, pinned sources, synthetic reproduction | Bounded plan |
| 2026-10-05 | planner → implementer | implementing | This packet, doctor, WIP boundaries | T1 → T2 → T3 locally |
| 2026-10-05 | implementer → evaluator | evaluating | Owned diff, 84 focused passes | Final gates, browser evidence, limitations |
| 2026-10-05 | evaluator → human_owner | evaluating | 84 domain passes, 14 demo browser passes, 2 authenticated-double browser passes, clean typecheck/lint/build | Review owned diff; keep unrelated capture WIP failures and release gates separate |
| 2026-10-05 | follow-up implementer/evaluator → human_owner | evaluating | Both stale contracts corrected; 20/20 focused, 1996/1996 full unit, 191/191 CI-policy; typecheck/lint clean | Review combined local diff; isolated PR/exact-head CI and release remain unperformed |

Current permission: owner explicitly approved the proposed commit → push/PR →
exact-head CI → squash merge → main production deployment on 2026-10-05
("có sửa luôn rồi đưa lên"). The release includes the existing paste-inside-Ghi
work and its repaired dismissal contracts. Other capture experiments, database,
secrets, Auth and branch-protection changes remain forbidden. Inspect and verify
the combined release before publication; do not bypass red checks or reviews.

Release rollback: retain the currently ready main deployment at base
`aa67d59ca530430f813ccd4f9753d7d8dfd826fc`; a regression must be reported and a
rollback/revert proposed before any separately unapproved provider action.
Production verification is read-only; synthetic local candidates are not real
user or production-ledger acceptance.

## Evaluation

### Owner-authorized pre-release parser correction

Combined browser verification exposed a real existing amount-parser defect in
all three Ghi hosts: `2026-10-05 cafe 45k` produced a pending candidate for 10 đồng.
The amount regex treated calendar hyphens as negative-money signs. The initial
run was stopped before code edits: 26 passed, 3 failed, 1 interrupted and 14 not
run. This is failed evidence, not a flaky retry or test-fixture issue.

Three new regression tests reproduced three failures before the correction.
Reuse the date extractor's token grammar and replace complete date spans with
equal-length non-money separators before amount scanning; retain partial dotted decimals
and trim reported token spans back to their original source offsets. Do not
change the browser fixture to hide the issue, auto-post, or reinterpret invalid
dates as valid. Bump only the paste parser provenance to `paste_text@1.2` and
update its current-version contracts; historical parser evidence is preserved.
The focused parser/provenance/map/review suites passed 80/80 after the first
correction. Independent evaluation then found that whitespace could carry a
sign across a removed date (`-2026-10-05 45000`); a hard separator and a fourth
regression close that counterexample without shifting original source offsets.
Full static/unit/browser and selected responsive gates must be rerun on the
corrected source before merge. No database or dependency changes are required.

### Owner-authorized follow-up: stale dismissal contracts

The owner's explicit follow-up `sửa luôn` authorizes fixing the two reported
working-tree failures. This is a Class 1, test-only extension, not permission to
rewrite the capture UI, change ledger behavior or release it. The earlier failed
run remains historical evidence; do not erase it or call it a green run.

Reproduction: the two focused files have 20 tests, 18 pass and 2 fail.
Both contracts still require the old `dismissible={!submitting}` expression.
The current capture specification explicitly locks dismissal during parsing or
pending-candidate save; AddTransactionDialog correctly uses
`!submitting && !pasteBusy`, with the same condition on `onOpenChange` and a busy
callback from CapturePasteForm. Shared Dialog prevents Escape/backdrop dismissal
when not dismissible. Reverting the application to make the old regex pass would
remove an intended safety guard.

Bounded plan and acceptance before edits:

1. Update `src/lib/a11y-baseline.test.ts` to require both busy guards, the guarded
   close callback and paste busy-state wiring; retain all existing focus checks.
2. Update `src/lib/ui-phase5-transactions-contract.test.ts` with an explicit
   AddTransactionDialog expectation. Edit/split/transfer keep their existing
   exact `!submitting` guard. No optional/wildcard busy guard, skipped test or
   broader assertion relaxation.
3. Run the focused and full unit suites, clean typecheck/lint, knowledge and
   CI-policy checks. No build/browser rerun is required for a test-only change;
   previous runtime/browser evidence remains separately dated evidence.

Permission: only those two test files and this existing packet. Production source,
capture WIP, dependencies, DB/provider, commit/push/merge/deploy remain unchanged.
Rollback changes only these new assertions. Implementation is finished;
the follow-up is locally verified. Focused tests now pass 20/20. In-memory negative
controls confirm that removing either busy guard, or the guarded close callback,
is rejected; no production file was mutated for that check.

Final follow-up evidence (Node 22.23.3, final working tree):

- Full unit suite: **1,996/1,996 pass, 0 failures, 0 skips**. This fresh result
  resolves the two failures recorded in the original evaluation below; it does
  not relabel or erase that earlier failed run.
- CI-policy suite: **191/191 pass**. These are local policy tests, not hosted CI.
- `npm run typecheck` and changed-file ESLint: clean. Knowledge, architecture,
  migration identity and diff-hygiene checks passed.
- Previous implementation source fingerprints read back unchanged. Only the
  two test contracts and this packet changed in the follow-up; production code,
  focus behavior and paste-busy dismissal locks remain intact.
- Build/browser/DB: not rerun for test-only changes. The original runtime/browser
  results below remain separate evidence; no real DB or deployment is claimed.
- Local logs: `/tmp/mf-close-contract-before.log` (18/20, two reproduced failures),
  `/tmp/mf-close-contract-focused.log` (20/20), `full-test.log`, `typecheck.log`,
  `lint.log`, `ci-policy.log`, `knowledge.log`, `architecture.log`, `migrations.log`
  with the same `/tmp/mf-close-contract-` prefix. Logs are ephemeral, not CI artifacts.

Same agent evaluates sequentially; this is not an independent human/security
audit. The evaluator reviewed the specification, owned diff and existing SQL
contract, including invalid status/count/date combinations, leap/year boundaries,
ambiguous/source-deleted matches, empty parser versions and maximum safe VND.

### Acceptance evidence and findings so far

- Focused suites: 84 passes, no failures; synthetic inputs only. BigInt test
  oracles are independent of the number-based production arithmetic.
- Static server wiring check confirms inconsistent summaries return null. This
  alone is not an executable RPC or Supabase acceptance test.
- Full unit suite: 1,994 passes / 2 failures / 0 skips (1,996 tests). Both failures
  are pre-existing capture WIP contract conflicts: `a11y-baseline.test.ts` and
  `ui-phase5-transactions-contract.test.ts` demand `dismissible={!submitting}`;
  the already-dirty AddTransactionDialog uses `!submitting && !pasteBusy`.
  HEAD has the former; this task did not edit the dialog or weaken those tests.
- Knowledge, architecture, deployment-env, CSS ownership, capabilities and
  migration identity checks passed. CI-policy tests: 191 passes. Full lint and
  production demo build passed; final changed-file lint and `npm run typecheck`
  both passed after the last counterexample changes.
- Initial new-test failures were investigated: the report oracle used the wrong
  API shape (`report.income` instead of `report.totals.income`); a BigInt literal
  violated the existing TS target; a fingerprint-copy assertion expected the old
  misleading text. Corrected tests/API use, not production semantics or TS target.
- First browser run could not launch any of its 14 tests because the installed
  browser cache was revision 1228 while Playwright 1.62.1 requires revision 1234.
  This is prerequisite failure, not flow acceptance. Install the matching local
  Chromium was installed and fresh tests ran: all 14 selected demo browser tests
  passed, covering review, explicit fields, transfer/retry identity, statement
  re-import and reconciliation. No application dependency was changed.
- CLI synthetic Explain check passed all five DOM assertions: masked account,
  no fabricated regex, actual candidate amount, ambiguous matching wording and
  recorded rule version. Phone 390×844 screenshot inspected:
  `output/playwright/mf-priority-explain-phone-detail.png`. Existing scrollable
  review dialog exposes the explanation; this is viewport evidence, not a real
  phone/full accessibility audit. After the test-owned dev server shut down, the
  retained CLI page emitted connection errors; those are not a clean-console or
  offline acceptance claim. The live-page check before shutdown had no errors.
- Authenticated trust desktop/phone tests passed: 2/2, light/dark and narrow-phone
  variants inside those tests. They rebuilt the final code in authenticated
  harness mode and exercised the real server mapping with a valid trust payload
  through the loopback Supabase double. This is not real DB/RLS/provider evidence.
- Final executable source fingerprints were read back unchanged after all gates.
  `git diff --check` passed. The test-owned servers and CLI browser closed normally;
  no user's pre-existing service was stopped. No later TypeScript edits occurred.

### Reproduction commands and artifacts

Use Node 22, not the default Node 24 shell. Focused tests:
`node --experimental-strip-types --test src/lib/inbox/review.test.ts src/lib/inbox/provenance.test.ts src/lib/inbox/provenance-existing-match.test.ts src/lib/ledger-trust.test.ts src/lib/account-register.test.ts src/lib/reconciliation.test.ts`.
Demo browser command:
`E2E_PORT=3195 npx playwright test e2e/inbox-exception-first-review.spec.ts e2e/account-reconciliation-workspace.spec.ts --project=chromium`.
Authenticated-double command:
`AUTH_E2E_PORT=3395 SUPABASE_DOUBLE_PORT=3396 npx playwright test --config=playwright.auth.config.ts e2e/auth/ledger-trust.desktop.auth.spec.ts e2e/auth/ledger-trust.mobile.auth.spec.ts`.

Temporary logs under `/tmp/mf-priority-`: `focused-final.log`, `typecheck-final.log`,
`lint-final.log`, `full-test.log`, `browser.log` (initial missing-browser failure),
`browser-install.log`, `browser-final.log`, `auth-browser.log`, `build.log` and
individual contract logs. These are local, ephemeral evidence, not exact-head CI
artifacts. Durable disposition and counts are recorded here; do not rely on those
logs surviving. Both initial failures and fresh outcomes are retained honestly.

### Adoption and limitations

No upstream code copied or provider/architecture dependency adopted. Existing
provenance messages, date validation, account legs and read boundaries are reused.
No changes to auth/RLS/migrations, no real bank/user input, no physical-device,
exact-head CI, human review or production evidence. Doctor reclassified this
owned scope as Class 3. With the temporary Node 22 PATH, Supabase CLI is not on
that PATH and Docker remains unavailable; no DB test/reset is claimed.

## Delivery record

- Branch: existing non-main capture branch; task not isolated in a new branch.
- PR: #759 on the existing non-main branch; implementation commit `7677b69f`.
  Final-head checks, merge and deployment remain pending.
- Local implementation finished in the bounded owned files; packet stays
  `evaluating`, not `ready_for_review`/`accepted`, because the whole working tree
  has no isolated PR/exact-head CI. The two stale contracts are now fixed and the
  final full local suite is green; earlier failed-run evidence is retained above.
- Next allowed action: verify the combined Ghi/import/trust release, record PR
  provenance, then require exact-head hosted checks before the approved merge.
