# MON-63 — mapping presets, batch history and retry/review UX

**Status:** selector candidate; not executable until owner-merged selector resolves on fresh main
**Execution state:** planned
**Active role:** planner / selector handoff
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** Linear MON-63 / implementation PR pending
**Selector:** GitHub PR #553
**Implementation base:** `main@05323e2cb45609a85b3e7e3f2a4af94679149c31`
**Last updated:** 2026-09-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 acquisition/data-integrity work packet. The selector PR may only establish executable authority; runtime implementation begins only after owner merge plus fresh `npm run plan:resolve` and `npm run agent:doctor -- --json`.

## Outcome

Productize the acquisition foundation so a user can repeatedly import statements with less remapping and less uncertainty, while preserving the existing Inbox/provenance/approval path as the sole financial mutation authority.

The target outcome is not “more import screens.” It is a measurable reduction in maintenance: stable mappings are reusable only when their source/header contract is proven, recoverable failures resume truthfully, batch history explains what happened, and review is exception-first rather than approval-everything.

## Research

### Repository reconnaissance

Fresh baseline: `main@05323e2cb45609a85b3e7e3f2a4af94679149c31` after merged PR #552 and verified production deployment.

Current code already has important pieces that MON-63 must extend rather than rebuild:

- `src/lib/inbox/import-batch-store.ts` already models local/meta-only import batches and intentionally does not retain raw file contents. Current status is only `parsed | committed | cancelled`.
- Authenticated import history already exists and the current history UI already lists recent batches. MON-63 therefore enriches history/provenance; it does not create a second history subsystem.
- `src/components/inbox/import-preview-page.tsx` currently creates candidates first and marks the batch committed second. If the second step fails, the UI correctly warns that candidates may already exist and asks the user to inspect Inbox before retrying. This is truthful but not yet an idempotent recovery contract.
- Generic CSV parsing remains heuristic: header matching can fall back by column position, generic missing/unparseable dates can carry uncertainty with a current-date fallback, and amount direction can depend on signed/debit/credit interpretation. Therefore equal-looking headers are not proof of equal parsing semantics.
- PR #552 established source identity, lineage and parser/mapping evidence transport without adding a second parser, dedupe or ledger authority.
- Exception-first Inbox review already exists; MON-63 must reuse its deterministic readiness semantics instead of inventing a second taxonomy.

### Historical branch evidence

Two stale, unmerged branches contain useful lessons but are not current authority and must not be cherry-picked blindly:

- `feat/p2-direct-csv-mapping-presets` is 53 commits behind current main. It prototyped a versioned normalized-header shape plus validated column map in browser storage. Reuse the deterministic/versioned header-shape idea only after re-specifying it for current generic import and tenant/privacy requirements; do not revive its old Direct-CSV-only storage/authority assumptions.
- `fix/direct-import-retry-idempotency` is 265 commits behind current main. Its work packet identified the correct retry law: unchanged financial intent must reuse the same idempotency identity, confirmed rows must not be reposted, and fuzzy fingerprints remain advisory. It explicitly deferred page-reload/cross-device recovery to a durable server receipt. Reuse those principles, not the stale branch code or its historical scope.

### External references

1. Actual Budget import/API documentation: stable `imported_id` prevents duplicate imports; otherwise fallback reconciliation is used. Its import API supports dry-run and reports added/updated/errors. Applicability: outcome/reporting and idempotent-import concepts. Not adopted: Actual storage/sync architecture or provider choices.
2. YNAB file import documentation (August 2026): CSV import supports explicit field mapping, swap inflow/outflow and “remember setting for this account.” Applicability: user-controlled remembered mappings tied to a known context. Not adopted: YNAB account/storage semantics.
3. YNAB approval/matching documentation (August 2026): imported/manual matches can be auto-approved and bulk actions reduce repetitive review. Applicability: exception-first review principle. MoneyFlow keeps its own readiness classifier and explicit financial mutation authority.

### Research limits

- No current evidence proves exact VCB/ACB/VietinBank consumer export headers/layout or stable transaction identity, so bank-specific presets remain disabled.
- Header equality by itself does not prove equal date, amount, direction, currency or source semantics; external competitor behavior does not justify treating structural similarity as source identity.
- No evidence justifies server-side retention of raw statements merely to enable resume.
- No measured requirement yet justifies a background queue/job platform.

## Specification

### 1. Mapping-preset contract

A mapping preset may be persisted only when the source contract has a deterministic eligibility key. At minimum the packet expects an explicit versioned signature over safe structural metadata such as transport + normalized header contract + mapping contract version; it must not use filename, row contents, raw account number, mutable MoneyFlow account mapping or a one-off guessed auto-map as identity.

**Structural equality is not semantic authority.** Two files with identical normalized headers can still encode dates, signs, debit/credit direction, currency or lifecycle differently. A preset that would bypass mapping review or alter parse semantics must therefore bind to the relevant parser/adapter semantic contract version and to evidence that makes those semantics safe. When only structural evidence is available, a preset may prefill the user's column choices, but it must not silently elevate confidence, suppress uncertainty or claim source/bank identity.

Requirements:

- presets are user-owned and tenant-scoped when server-persisted;
- each preset records the mapping contract version and enough safe source/header evidence to decide applicability;
- parser/adapter semantic version is part of eligibility whenever preset application can affect date, amount, direction, currency, lifecycle or other financial interpretation;
- applying a preset is deterministic and reviewable;
- identical headers with incompatible semantics must fail closed or require explicit mapping review rather than share silent auto-application;
- a structural-only generic preset may prefill column roles but cannot suppress parser uncertainty or become evidence of institution/account identity;
- mismatch or ambiguity falls back to mapping review, never silent coercion;
- a user can replace/delete a preset without affecting historical ledger facts;
- no target-bank preset is enabled until exact source layout evidence exists.

### 2. Retry/resume contract

The preview→Inbox operation must become state-aware and idempotent. A retry after an uncertain response must not create a second candidate set or report false success.

Required states/outcomes should be the smallest set that truthfully distinguish:

- ready to commit;
- committed with a durable result;
- recoverable failure where retry is safe;
- ambiguous/unknown completion where the system must reconcile existing candidates before offering retry;
- cancelled.

Do not add generic job states or background processing unless the implementation evidence proves they are required.

A successful commit records durable outcome metadata sufficient to explain added/skipped/changed/review-needed counts without storing the raw statement. Retry identity must be stable for unchanged intent; fuzzy import fingerprints remain advisory and cannot become permanent uniqueness keys merely for convenience.

### 3. Batch history/provenance contract

Preserve the current history surface and enrich it with user-meaningful operational truth:

- status/outcome;
- row/warning/skipped counts;
- parser/mapping version when available;
- whether a reusable preset was applied or mapping required review;
- safe source/provenance summary;
- recovery action only when it is actually safe;
- no raw transaction rows, source IDs or sensitive payloads in generic history/analytics.

Cross-device behavior must stay truthful: metadata can be server-backed while a browser-local draft may be unavailable. Do not imply “resume” if the raw/draft material required for preview is absent.

### 4. Exception-first review contract

Reuse the existing Inbox readiness classifier and matching authority. MON-63 may improve batch-level review/navigation, but it must not create auto-posting or a second ready/needs-attention taxonomy.

Rows that are deterministically ready may be grouped for explicit bulk confirmation; ambiguous identity/date/amount/direction/match states stay in needs-attention.

### 5. Measurement

Add privacy-safe measurement sufficient to compare maintenance before/after:

- mapping preset applied vs mapping required;
- import commit attempt/result;
- retry/resume success/failure reason category;
- ready vs needs-attention counts;
- batch completion outcome.

Never emit raw source IDs, file contents, descriptions, amounts, account identifiers or row payloads.

Primary product evidence for the slice: manual interventions per representative batch should fall without increasing correction/duplicate errors.

## Implementation plan

1. Inventory current import-batch metadata, authenticated server persistence, history UI, draft lifecycle, preview→Inbox commit seam, readiness classifier/tests and the two stale historical branches above for reusable principles only.
2. Define pure mapping-preset eligibility/versioning and commit/recovery state machines with counterexamples before UI work, including equal-header/different-semantics cases.
3. Reuse existing batch storage/server seams; add schema/RPC only if current structures cannot express the accepted durable state atomically and tenant-safely.
4. Make preview→Inbox commit idempotent or reconcilable after an uncertain response. Prefer one transaction/RPC boundary if DB truth must change together; do not paper over partial success with client retries.
5. Persist and apply mapping presets only behind deterministic eligibility; preserve manual mapping fallback and keep structural-only presets advisory/prefill-only where semantic evidence is incomplete.
6. Enrich current history/provenance UI and recovery actions; do not replace the history page.
7. Integrate existing exception-first readiness grouping into the batch workflow.
8. Add privacy-safe analytics and focused browser tests for retry, cross-device draft absence, preset mismatch, semantic-collision and bulk review.
9. Independently evaluate failure/replay/collision/privacy cases, run exact-head risk-selected gates, then same-PR lifecycle closeout to `current: null` before owner handoff.

Rollback: remove the new preset/recovery behavior and keep existing generic import/history paths readable. Any schema addition must be additive/backward-compatible until rollback safety is proven.

## Tasks

- [ ] Inventory authenticated import batch persistence and existing DB/RPC ownership.
- [ ] Re-evaluate stale preset/retry branches against current code; salvage principles only, never stale authority/code by default.
- [ ] Specify mapping-preset eligibility key and version semantics.
- [ ] Add counterexamples for identical normalized headers with different date/amount/direction semantics; prove they cannot silently share authoritative preset behavior.
- [ ] Specify minimal durable batch outcome/recovery states.
- [ ] Prove exact replay and uncertain-response retry cannot duplicate candidate creation.
- [ ] Preserve no-raw-statement server boundary by default.
- [ ] Implement deterministic preset save/apply/delete with tenant ownership where applicable.
- [ ] Enrich existing history UI with provenance/outcome/recovery, not a replacement history subsystem.
- [ ] Reuse existing Ready/Needs-attention classifier for batch review.
- [ ] Add privacy-safe product events and intervention-count evidence.
- [ ] Cover cross-device missing-draft behavior truthfully.
- [ ] Keep VCB/ACB/VietinBank bank-specific presets disabled without stronger layout evidence.
- [ ] Run independent evaluation and exact-head selected CI/CodeQL/Secret/browser/DB gates as applicable.
- [ ] Complete same-PR lifecycle closeout and leave follow-on work unselected.

## Evaluation

Acceptance requires all of the following on the implementation PR's exact head:

- replay/retry cannot create a second candidate set for the same committed batch;
- an uncertain commit result never presents false success and recovery is state-aware;
- stable retry identity is reused for unchanged intent and fuzzy fingerprints remain advisory;
- preset application is deterministic, versioned and rejected on structural mismatch;
- identical normalized headers with incompatible date/amount/direction semantics cannot silently share an authoritative auto-applied preset;
- structural-only presets cannot suppress uncertainty, elevate generic parsing to source identity or bypass required review without stronger semantic evidence;
- deleting/replacing a preset does not mutate prior financial facts;
- batch history exposes truthful outcome/provenance without raw statement/source-ID leakage;
- browser-local draft absence on another device is presented as unavailable, not resumable;
- exception-first review reuses existing readiness semantics and preserves explicit approval authority;
- generic CSV/XLSX/PDF/Direct CSV compatibility remains intact;
- target-bank auto-map/presets remain disabled without new evidence;
- tenant isolation is proven for any new server-persisted preset/batch state;
- focused product evidence shows fewer repeated mapping/review interventions on representative batches without introducing duplicate/correction regressions;
- exact-head required checks are green without retry-only acceptance;
- completing PR archives this packet, returns `PLAN_AUTHORITY.current` to `null`, reconciles current memory and leaves follow-on work unselected.

Stop and return to specification if durable retry requires retaining sensitive raw statement data, if existing database authority cannot express atomicity without a migration, or if a preset eligibility key cannot be proven stable, semantically safe and privacy-safe.
