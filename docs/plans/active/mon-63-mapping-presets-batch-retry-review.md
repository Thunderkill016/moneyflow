# MON-63 — mapping presets, batch history and retry/review UX

**Status:** active after owner-merged selector PR #553
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** ThunderK
**Issue/PR:** Linear MON-63 / implementation PR pending
**Selector:** GitHub PR #553
**Selector base:** `main@05323e2cb45609a85b3e7e3f2a4af94679149c31`
**Implementation base:** `main@a34ac54dfe33175dc96c05348522463aa8cbe1d0` after owner-merged PR #553
**Implementation branch:** `feat/mon-63-import-recovery-presets`
**Last updated:** 2026-09-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 acquisition/data-integrity work packet. PR #553 is merged and fresh-main plan authority resolves MON-63 as the sole current slice. The current connector sandbox cannot produce a truthful machine-level `agent:doctor` READY result because it cannot materialize the full Git checkout/toolchain; no doctor success is claimed. Exact-head repository CI/DB/browser gates remain mandatory before handoff.

## Outcome

Reduce repeated import maintenance without creating a second financial truth. Repeated mappings should require less work, uncertain preview→Inbox completion should recover truthfully, import history should explain outcomes, and review should stay exception-first.

All accepted acquisition paths still converge on the existing Inbox/provenance/matching/approval/ledger/reconciliation authority. MON-63 does not authorize provider sync, raw-statement retention, bank-specific guessing or automatic posting.

## Research

### Repository reconnaissance

Runtime implementation baseline: fresh `main@a34ac54dfe33175dc96c05348522463aa8cbe1d0`, the squash merge of selector PR #553. The older `05323e2...` SHA remains selector evidence only.

Current code already has seams MON-63 must extend rather than rebuild:

- `src/lib/inbox/import-batch-store.ts` owns metadata-only batches with `parsed | committed | cancelled`; raw file contents are intentionally not retained.
- Authenticated import history already exists. MON-63 enriches that surface instead of creating another history system.
- `src/components/inbox/import-preview-page.tsx` creates candidates first and marks the batch committed second. If the second operation fails, candidates may already exist, so blind retry is unsafe.
- `src/lib/inbox/direct-csv-mapping-preset.ts` already ships a version-1 normalized-header mapping preset stored in browser `localStorage`, with validated column indexes.
- `src/components/inbox/direct-csv-import-page.tsx` actively reads that preset, exposes an explicit user action to apply the remembered mapping, and tells the user to verify the dry-run before writing to the ledger. This is a current device-local structural convenience, not bank/source semantic authority.
- Generic CSV parsing remains heuristic: column position/header matching plus date and amount-direction interpretation can differ even when normalized headers are equal.
- PR #552 preserves parser/mapping/source provenance through the existing Inbox path.
- Existing Direct CSV and Share Target database work demonstrates transactional batch/candidate patterns. Current generic authenticated preview still inserts candidates and updates batch metadata in separate requests, which is the MON-63 retry-integrity gap.
- `import_batches` and `inbox_candidates` already have own-row RLS plus an owner-preserving composite `(import_batch_id,user_id)` FK, so an additive `SECURITY INVOKER` RPC can keep tenant authority in RLS rather than inventing a privileged bypass.
- Exception-first Ready/Needs-attention semantics already exist and remain the review authority.

### Historical branch evidence

Historical branches are evidence only, not executable authority:

- `feat/p2-direct-csv-mapping-presets` is stale, but its v1 mapping helper has already been incorporated into current main and is actively used. Do not cherry-pick it. MON-63 must harden/generalize the live current seam.
- `fix/direct-import-retry-idempotency` is stale but records a durable principle: unchanged financial intent should reuse the same idempotency identity; confirmed rows must not be reposted; fuzzy fingerprints remain advisory. Its mounted-attempt recovery is insufficient for page/cross-device recovery.

### External references

1. Actual Budget import/API documentation uses stable imported IDs first, fallback reconciliation otherwise, supports dry-run and reports added/updated/errors. Applicability: idempotent outcome/recovery patterns only.
2. YNAB file import documentation supports explicit field mapping, inflow/outflow swap and remembered settings in a known account context. Applicability: user-controlled remembered mappings, not bank-layout inference.
3. YNAB matching/approval documentation supports lower-friction matched review and bulk actions. MoneyFlow keeps its own readiness classifier and explicit approval authority.
4. Current Supabase/PostgreSQL guidance supports `SECURITY INVOKER` by default, explicit function EXECUTE grants, locked search paths, and row locking/transactional mutation for concurrency-safe state transitions. MON-63 follows those existing platform contracts rather than adding an application queue.

### Research limits

- No current evidence proves exact VCB/ACB/VietinBank consumer export layout or stable transaction identity.
- Equal headers do not prove equal date, amount, direction, currency, lifecycle or provider semantics.
- No evidence justifies storing raw statements server-side merely to resume.
- No measured requirement justifies a background queue for this slice.

## Specification

### 1. Mapping-preset contract

MON-63 extends/hardens the live Direct CSV remembered-mapping seam; it does not treat presets as a new invention.

A persisted preset needs a deterministic, versioned, privacy-safe eligibility contract. It must not use filename, row contents, raw account number, mutable MoneyFlow account mapping or guessed bank identity as authority.

**Structural equality is not semantic authority.** The current v1 normalized-header preset is acceptable as an explicit structural convenience because the user chooses to apply it and still receives a dry-run review. Structural evidence alone may prefill column roles, but it must not suppress parser uncertainty, elevate confidence, identify a bank/source, or silently change financial interpretation.

Requirements:

- preserve current explicit Direct CSV apply + dry-run behavior;
- presets are user-owned and tenant-scoped if moved to server persistence;
- each preset records mapping contract version and safe eligibility evidence;
- parser/adapter semantic version is part of eligibility whenever application can affect date, amount, direction, currency, lifecycle or another financial interpretation;
- identical headers with incompatible semantics fail closed or require explicit review;
- mismatch or ambiguity falls back to mapping review;
- delete/replace never mutates historical ledger facts;
- target-bank presets remain disabled until exact source evidence exists.

### 2. Retry/resume contract

Preview→Inbox commit must become state-aware and idempotent. Retry after an uncertain response must not create a second candidate set or claim false success.

Use the smallest truthful durable state/outcome set that distinguishes:

- ready to commit;
- committed with durable result;
- recoverable failure where retry is safe;
- ambiguous/unknown completion requiring reconciliation before retry;
- cancelled.

A successful commit records durable outcome metadata sufficient to explain added/skipped/changed/review-needed counts without storing the raw statement. Stable retry identity is reused for unchanged intent. Fuzzy fingerprints remain advisory, not permanent uniqueness authority.

Implementation decision for the first integrity slice: the existing batch UUID is the stable idempotency key; a SHA-256 hash of canonical validated candidate intent is stored on the batch to reject reuse of that key for changed financial intent. Generated candidate UUIDs/timestamps are excluded from the intent hash. An own-row `FOR UPDATE` lock serializes concurrent commits. Exact replay returns the durable committed result without reinserting candidates; changed intent fails closed.

Prefer an existing transactional/RPC pattern if candidate creation and batch completion must change together. Do not route around Inbox into ledger mutation.

### 3. Batch history/provenance contract

Enrich the existing history surface with:

- status/outcome;
- row/warning/skipped/review-needed counts;
- parser/mapping version where available;
- whether a preset was applied or mapping required review;
- safe source/provenance summary;
- recovery action only when actually safe.

Do not expose raw transaction rows, raw source IDs or sensitive payloads in generic history/analytics. Cross-device UI must not promise resume when the browser-local draft/file material is absent.

### 4. Exception-first review contract

Reuse existing Ready/Needs-attention classification and matching authority. Deterministically ready rows may be grouped for explicit bulk confirmation; ambiguous identity/date/amount/direction/match states remain needs-attention. No auto-posting and no second taxonomy.

### 5. Measurement

Measure only privacy-safe operational categories:

- preset applied vs mapping required;
- import commit attempt/result;
- retry/resume result category;
- ready vs needs-attention counts;
- batch completion outcome.

Never emit raw file contents, descriptions, amounts, source IDs, account identifiers or credentials. Primary product evidence is fewer repeated mapping/review interventions without duplicate/correction regression.

## Implementation plan

1. After selector merge, resolve fresh `main` and record the exact post-merge SHA before any runtime change.
2. Inventory the live Direct CSV preset seam, import-batch persistence/history, preview→Inbox commit boundary, current atomic RPC patterns and readiness tests.
3. Specify pure mapping eligibility/versioning and commit/recovery state machines with equal-header/different-semantics and uncertain-response counterexamples before UI work.
4. Reuse current batch/server seams; add schema/RPC only if current structures cannot express accepted durable state atomically and tenant-safely.
5. Make preview→Inbox completion idempotent or reconcilable. Prefer one transactional boundary when DB truth must move together; do not paper over partial success with client retry.
6. Generalize/harden preset persistence only behind deterministic eligibility while preserving the current explicit Direct CSV remembered-mapping fallback.
7. Enrich current history/provenance and recovery UX; do not replace history.
8. Reuse exception-first readiness for batch review.
9. Add privacy-safe analytics and focused browser/DB tests for replay, retry, preset mismatch, semantic collision, cross-device missing-draft and bulk review.
10. Independently evaluate failure/replay/collision/privacy cases, run exact-head Class-3 gates, then complete same-PR lifecycle closeout to `current: null` before owner handoff.

Rollback: preserve existing generic import/history/Direct CSV paths. Any schema addition must remain additive/backward-compatible until rollback safety is proven.

## Tasks

- [x] Resolve exact post-selector-merge fresh-main implementation baseline: `a34ac54dfe33175dc96c05348522463aa8cbe1d0`.
- [x] Inventory authenticated import-batch DB/RPC ownership and live Direct CSV preset usage.
- [x] Treat stale preset branch as provenance only; re-evaluate retry branch principles against current code.
- [ ] Specify mapping eligibility key and semantic-version boundaries.
- [ ] Add equal-header/different-semantics counterexamples.
- [ ] Preserve explicit Direct CSV remembered-map + dry-run compatibility.
- [x] Specify minimal durable batch outcome/recovery states and the batch-id + intent-hash replay law.
- [ ] Prove replay/uncertain-response retry cannot duplicate candidates on exact-head DB/CI gates.
- [x] Preserve no-raw-statement server boundary by default.
- [ ] Implement tenant-safe preset save/apply/delete where persistence requires it.
- [ ] Enrich existing history with outcome/provenance/recovery.
- [ ] Reuse existing Ready/Needs-attention classifier.
- [ ] Add privacy-safe intervention/retry measurement.
- [ ] Cover cross-device missing-draft behavior truthfully.
- [x] Keep VCB/ACB/VietinBank presets disabled without stronger evidence.
- [ ] Run independent evaluation and exact-head selected CI/CodeQL/Secret/browser/DB gates.
- [ ] Complete same-PR lifecycle closeout and leave follow-on work unselected.

## Evaluation

Acceptance requires all of the following on the implementation PR exact head:

- implementation starts from fresh main after owner merge of #553, specifically `a34ac54dfe33175dc96c05348522463aa8cbe1d0`, not selector-base `05323e2...`;
- replay/retry cannot create a second candidate set for the same committed intent;
- uncertain completion never presents false success and recovery is state-aware;
- unchanged intent reuses stable retry identity; fuzzy fingerprints stay advisory;
- current Direct CSV explicit remembered-map + dry-run behavior remains compatible;
- preset application is deterministic/versioned and structural mismatch is rejected;
- equal headers with incompatible semantics cannot silently share authoritative auto-application;
- structural-only presets cannot suppress uncertainty or become bank/source identity;
- deleting/replacing preset does not mutate historical financial facts;
- history exposes truthful outcome/provenance without raw statement/source-ID leakage;
- another device with no local draft is shown as unavailable, not resumable;
- review reuses existing readiness semantics and explicit approval authority;
- generic CSV/XLSX/PDF/Direct CSV compatibility remains intact;
- target-bank auto-map remains disabled without evidence;
- tenant isolation is proven for new server-persisted state;
- representative evidence shows fewer interventions without duplicate/correction regression;
- exact-head required checks are green without retry-only acceptance;
- completing PR archives this packet, returns `PLAN_AUTHORITY.current` to `null`, reconciles memory and leaves follow-on work unselected.

Stop and return to specification if durable retry requires sensitive raw-statement retention, if atomicity cannot be expressed safely without a migration, or if preset eligibility cannot be proven stable, semantically safe and privacy-safe.
