# MON-63 — mapping presets, batch history and retry/review UX

**Status:** completed
**Execution state:** completed
**Owner:** ThunderK
**Issue/PR:** Linear MON-63 / selector PR #553 / implementation PRs #554 and #555 / closeout PR #556
**Selector base:** `main@05323e2cb45609a85b3e7e3f2a4af94679149c31`
**Implementation base:** `main@a34ac54dfe33175dc96c05348522463aa8cbe1d0`
**Last implementation production baseline:** `63c239aefca9b5629561808c17948e3aea39bf3e`
**Closed:** 2026-09-09

## Outcome

MON-63 reduced repeated import maintenance without creating a second financial truth.

Repeated Direct CSV mappings can be explicitly reapplied through a deterministic/versioned eligibility contract; authenticated preview→Inbox commit is atomic and replay-safe; history explains safe operational outcomes; cross-device state does not promise a local draft that is absent; and privacy-minimized maintenance evidence is available for later cohort analysis.

All accepted acquisition paths still converge on existing Inbox/provenance/matching/approval/ledger/reconciliation authority. MON-63 did not authorize provider sync, raw-statement retention, bank-specific guessing or automatic posting.

## Delivered

### Mapping preset contract

- Hardened the existing device-local Direct CSV remembered-mapping seam rather than creating a second preset system.
- Preset eligibility is versioned and bound to parser/mapping semantics; normalized header equality alone is not semantic authority.
- Applying a remembered mapping remains an explicit user action followed by dry-run/review.
- A manual mapping edit invalidates `preset_applied` evidence and returns the review surface to `mapping_reviewed`.
- Target-bank auto-map remains disabled without exact source evidence.

### Retry and atomicity

- Existing batch UUID is the stable idempotency identity for one import intent.
- Canonical validated candidate intent is SHA-256 guarded; generated candidate UUID/timestamp values are excluded.
- Own-row `FOR UPDATE` serialization prevents concurrent same-batch double commit.
- Exact replay returns durable result without inserting another candidate set.
- Reusing the same batch identity for changed canonical intent fails closed.
- Candidate creation remains pending Inbox evidence; the RPC does not write ledger transactions.

### Batch history and recovery

- Existing history was enriched rather than replaced.
- History exposes safe parser/mapping, retry and mapping-review evidence without raw statement contents or raw source IDs.
- Another device with server metadata but no browser-local draft is shown as unavailable rather than falsely resumable.
- Generic CSV/XLSX/PDF, Direct CSV and Share Target compatibility remains preserved.

### Measurement

- `import_batches` carries privacy-minimized operational counters/evidence for maintenance and replay analysis.
- No descriptions, amounts, source IDs, account identifiers, credentials or raw file contents are stored for measurement.
- These counters are tenant-owned operational metadata, not tamper-proof audit telemetry and not financial truth.
- Measurement failure remains separate from financial mutation success.

## Acceptance evidence

### PR #554

PR #554 implemented atomic/replay-safe preview→Inbox commit, versioned preset semantics, history/recovery hardening and tenant-isolated database contracts.

Its exact-head acceptance passed policy/knowledge, lint/typecheck, unit/static-RLS, production build, fresh Supabase reset + pgTAP, archive round trips, browser/e2e, CodeQL and Secret History before owner squash merge as `73fa6d6ac306f0b56367da2be80a7c5f42fb59b9`.

### PR #555

PR #555 added first-party maintenance counters, durable mapping evidence, history output and app-first compatibility fallback.

Its exact head passed policy/knowledge, lint/typecheck, unit/static-RLS, build, fresh Supabase + pgTAP, browser smoke, cross-device audit, CodeQL and Secret History before owner squash merge as `63c239aefca9b5629561808c17948e3aea39bf3e`.

Production for `63c239a...` was verified Vercel READY and `/api/health` returned 200 for that exact commit.

### PR #556

PR #556 added the missing representative browser evidence:

1. upload a Direct CSV;
2. remember the mapping;
3. reset and re-upload the same structural CSV;
4. explicitly apply the remembered mapping and observe `Dùng mapping đã nhớ`;
5. manually change a mapping field;
6. verify review evidence returns to `Đã review mapping`.

Exact head `cdbdef637f8c4dcc7ff46eb4d03348fe99402eab` passed CI #3450, CodeQL #2472 and Secret History #2472 before the lifecycle closeout projection.

## Evaluator pass

The evaluator read this specification and the merged/current diff evidence rather than relying on implementer summaries.

Counterexamples checked:

- equal headers with different parser/mapping semantics cannot silently become authoritative auto-application;
- changed financial intent cannot reuse a committed batch identity;
- exact replay cannot insert another candidate set;
- cross-tenant mutation remains denied by RLS;
- browser-local missing draft is not reported as resumable;
- remembered mapping does not suppress explicit review;
- manual override removes remembered-preset operational evidence;
- counters/mapping evidence are not described as tamper-proof;
- raw statement retention, provider sync, bank guessing and auto-posting remain out of scope.

No blocking acceptance contradiction remained after the PR #556 affected-flow evidence passed.

## Research boundary retained

Actual Budget and YNAB remain workflow references only. They do not prove Vietnamese bank layouts, provider identity, storage choices or mutation authority.

Exact current VCB/ACB/VietinBank layouts and stable source identity remain evidence gaps. No evidence justified raw-statement server retention or a background queue for MON-63.

## Completion

All MON-63 acceptance criteria required for this bounded slice are satisfied by the combined evidence of PRs #554, #555 and #556.

PR #556 archives this packet, removes the active copy, returns `PLAN_AUTHORITY.current` to `null`, reconciles `CURRENT_PROJECT_MEMORY.md`, and selects no follow-on work.

Further improvements require a fresh selector from merged main. Backlog, Plate, open PRs and chat do not select executable authority by themselves.
