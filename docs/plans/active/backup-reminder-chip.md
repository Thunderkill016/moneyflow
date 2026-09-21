# S1 — Backup reminder chip on Home attention strip

**Status:** specified
**Execution state:** specified
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent pending owner review (Class 3)
**Issue/PR:** pending
**Last updated:** 2026-09-21

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A signed-in reader who has never downloaded a backup — or whose newest backup is
older than the reminder window — sees a calm chip in the Home "Cần chú ý" strip
linking to `/settings/backup`. Demo sessions never see it (demo backup does not
exist), and a fresh backup or fresh account silences it.

## Repository reconnaissance

### Current behavior

- `/settings/backup` produces a complete JSON archive via `createArchiveBackupAction`
  → `export_user_archive` RPC → browser download. No record of *when* is kept
  anywhere — server, database or client. Verified by reading
  `src/app/actions/archive.ts`, `src/components/backup-settings-page.tsx` and
  grepping `last_backup|lastBackup|export_log` across `src/` and `supabase/`.
- The Home attention strip composes `buildAttentionItems` client-side from
  budget/bill/inbox/needs-review inputs (`src/lib/attention.ts`,
  `src/components/moneyflow-dashboard.tsx:235`).
- Authenticated Home reads one `get_dashboard_bundle` RPC; the application treats
  additive bundle keys as optional for deploy-skew (`ledger_trust` is `.nullish()`
  — `src/server/dashboard.ts:108-111` documents the pattern this change reuses).

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `public.profiles` | Owner-scoped row already exists (select+update granted); natural home for `last_backup_at` | change — add nullable column |
| `get_dashboard_bundle` RPC | Single authenticated dashboard request; `backup_state` rides it | change — `create or replace` adds one key |
| `export_user_archive` RPC | **Deliberately read-only, pgTAP-proven** — do not add DML here | avoid |
| `src/app/actions/archive.ts` | Only caller of the archive RPC; the write point after a validated archive | change — one profiles update |
| `src/lib/attention.ts` | Chip builder | change — one input + one rule |
| `src/server/dashboard.ts` | Workspace assembly (bundle + fallback + demo) | change — `backupState` field |

### Existing tests and constraints

- Unit: `src/lib/attention.test.ts` (chip composition).
- Database/RLS: `supabase/tests/database/dashboard_read_bundle.test.sql` (function
  contract, security-invoker, search_path, grants); cross-tenant rules covered by
  `cross_tenant_rpc.test.sql` conventions.
- Browser: Browser smoke + Cross-device UI audit lanes cover `/dashboard`.
- Product rules: calm copy, no guilt; money never color-only (not applicable —
  no amounts); never invent state (null state ⇒ no chip, not a guess).

### Similar implementation and recent history

- `ledger_trust` on the same bundle (#590): additive `nullish` key, deployed
  app-before-migration — the exact skew pattern this change copies.
- G3 needs_review chip (#638): the most recent attention-strip addition.

### Open questions

- [x] Where does `last_backup_at` live? → `profiles` column (owner-scoped, no new table).
- [x] Write inside the archive RPC? → No — its read-only invariant is proven; write in the action after validation.
- [x] Never-backed-up semantics? → baseline = `profiles.created_at`; a young account does not nag.
- [x] Reminder window? → 30 days (`BACKUP_REMINDER_DAYS`), calm not naggy.

## Research

Not required — the decision is internal schema placement plus an existing UI
pattern. No external provider, format or dependency is involved.

## Specification

### Problem

A reader can go indefinitely without an archive; data-loss prevention is the
product's stated trust moat, and nothing today nudges toward it.

### User stories

- As a signed-in user with no backup ever, after the grace window I see a chip
  suggesting one, so I learn backups exist before I need one.
- As a user whose last backup is old, I see a dated reminder, so the archive I
  restore from stays recent.
- As a demo visitor, I never see the chip, because demo has no backup feature.

### Acceptance criteria

- [ ] Chip absent for demo viewers in all states.
- [ ] Chip absent when `last_backup_at` is within 30 days, or when no backup exists
      but the account is ≤ 30 days old.
- [ ] Chip shows "Chưa có bản sao lưu nào" when `last_backup_at` is null and the
      account is older than the window — the number shown is never account age
      dressed as backup age.
- [ ] Chip shows "Bản sao lưu gần nhất đã N ngày trước" when `last_backup_at`
      is older than the window; N is derived, never a guess.
- [ ] A successful `createArchiveBackupAction` updates `profiles.last_backup_at`.
- [ ] Bundle responses carry `backup_state`; an older database (field absent)
      degrades to no chip rather than an error.

### Required states

- Loading: chip follows the strip's existing render — no new loading state.
- Empty (fresh account / fresh backup): no chip.
- Populated: one chip, `tone: "info"`, href `/settings/backup`.
- Validation/error: missing `backup_state` (skew) or null `last_backup_at` are
  states, not errors; a failed profile update after a successful archive logs
  and still returns the archive.
- Recovery/undo: none — reminder only.
- Long data / large VND: no money rendered.
- Mobile/tablet/desktop: chip inherits strip behavior.
- Accessibility: chip is a link with a text label — no icon-only signal.

### Financial and security constraints

- No guessed financial data or recommendation. The chip states dates only.
- Integer VND and transfer invariants untouched — no ledger math.
- Ownership/RLS: `profiles` RLS already restricts to owner; the bundle function
  stays `security invoker` with pinned `search_path` and unchanged grants.
  `last_backup_at` reveals only account metadata to its owner — no new exposure.

### Out of scope

- Push/email/notification reminders (deferred category per #635).
- Backup scheduling, automatic backups, or backup-content changes.
- `/settings/export` (date-range CSV) does not set `last_backup_at` — it is not
  a restorable backup.
- Changing the read-only archive RPC.

## Implementation plan

### Architecture fit

Owner metadata belongs on `profiles`; dashboard surfacing belongs in the existing
bundle (single-request invariant) with the documented `nullish` skew contract;
the write belongs in the server action that already owns backup creation, keeping
the proven read-only archive RPC untouched. The chip is one rule in the existing
attention composer — no new strip, surface or data path.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `supabase/migrations/20260921120000_backup_reminder_state.sql` | `profiles.last_backup_at timestamptz`; bundle `create or replace` gains `backup_state { last_backup_at::date, created_at::date }`; **also widens `p_transaction_start` bound 45→62** | date cast avoids the session-DateStyle json hazard; the bound fix repairs a #643 follow-up: `dashboardTransactionStart` reaches 2d−1 days (max 61 on day 31), so since the 24th of every month the bundle threw `invalid_dashboard_transaction_range` and degraded every render to the fallback — which also withholds `backup_state`, making this chip silently disappear exactly then |
| `supabase/tests/database/backup_reminder_state.test.sql` | column exists, bundle exposes `backup_state`, owner update allowed, cross-tenant blocked | Class 3 pgTAP evidence |
| `src/app/actions/archive.ts` | after validated archive → `update profiles set last_backup_at`; failure logs, archive still returned | advisory write must not break the real backup |
| `src/server/dashboard.ts` | `backupState` on `DashboardPageWorkspace`: bundle `nullish` read, fallback profiles select, demo/error → null | skew-tolerant, no invented state |
| `src/lib/attention.ts` + test | `backup` input + `BACKUP_REMINDER_DAYS = 30` + chip rule | deterministic, testable |
| `src/components/moneyflow-dashboard.tsx` | pass `workspace.backupState` into `buildAttentionItems` | one prop |

### Data and migration impact

- Schema/migration: additive nullable column; additive bundle key.
- Backfill: none — null means "no backup recorded", which is true.
- Compatibility: old app + new DB: unknown bundle key ignored. New app + old DB:
  `nullish` → null → no chip. Both skews safe.
- Rollback: revert PR; column harmlessly remains. `drop column` + function
  restore is the hard cleanup if ever needed — not required for rollback.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Chip nags a brand-new account | baseline is `created_at`, not null→"old" |
| Profile update failure fails the backup | write is post-validation, error swallowed with a log |
| DateStyle-dependent timestamp in JSON | emit `::date`, never raw timestamptz |
| Bundle function drift on replace | `create or replace` copies the current reviewed body verbatim + one key |
| Cross-tenant read/write | RLS owner policies already exist; pgTAP asserts both directions |
| Demo nag | `backupState: null` ⇒ no chip, pinned by test |
| Bound widen admits forged wide scans | still bounded at 62 days (the app's true maximum); pgTAP pins both edges (`-62` accepted, `-63` rejected) |

### Verification plan

- Static: lint, typecheck, architecture, css-ownership (no CSS expected).
- Unit/domain: attention chip rules + workspace mapping; `npm test`.
- Database: `npm run test:db` — new pgTAP file + existing bundle suite.
- Browser flow: Browser smoke lane; local demo render shows no chip.
- Responsive/visual: Cross-device UI audit lane.
- Production/manual: post-merge — an auth backup sets `last_backup_at` and the
  chip clears on next Home render (owner verification).

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Migration + pgTAP test | none | migration written; pgTAP file written — `test:db` not runnable locally (no Docker/Podman); CI database lane pending | implemented, unverified locally |
| T2 | attention rule + unit tests (TDD) | none | RED→GREEN; `attention.test.ts` 10/10 | done |
| T3 | archive action write | T1 | post-validation `profiles` update in `createArchiveBackupAction`; failure logs and still returns archive | done |
| T4 | workspace `backupState` (bundle + fallback + demo) | T1 | `nullish` bundle read; fallback/demo → null; typecheck clean | done |
| T5 | dashboard prop wiring | T2, T4 | `page.tsx` → `MoneyFlowDashboard` → `buildAttentionItems`; typecheck clean | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Chip absent for demo viewers | `backupState: null` on demo path; attention tests pin no-chip on null | pass (unit) |
| Chip absent when backup/account fresh | `BACKUP_REMINDER_DAYS = 30` boundary tests (29/30/31-day cases) | pass (unit) |
| "Chưa có bản sao lưu nào" vs dated copy | two distinct chip labels; N derived from `lastBackupAt`, never guessed | pass (unit) |
| Successful backup updates `last_backup_at` | write placed after `validateMoneyFlowArchiveWithSourceLineage` in action | implemented; pgTAP pending in CI |
| Bundle carries `backup_state`; skew degrades to no chip | `nullish` schema → null → no chip; pgTAP asserts field presence | implemented; pgTAP pending in CI |

### Research and adoption evidence

- Selected sources still support the final implementation: internal only — `ledger_trust` additive-key precedent (#590), G3 attention-chip precedent (#638).
- Important source limitations remain respected: archive RPC kept read-only per its proven invariant.
- New tool/dependency/pattern passed the adoption review, or not applicable: none added.

### Review findings

- Correctness: chip logic deterministic in `buildAttentionItems`; write is post-validation so a profile-update failure cannot corrupt or block an archive.
- Security/ownership: `profiles` RLS owner-only policies unchanged; bundle stays `security invoker` with pinned `search_path`; `create or replace` body diffed against the reviewed original — only the `backup_state` key added; pgTAP covers cross-tenant update denial.
- UI/UX/accessibility: chip reuses the existing attention item contract (text label, link, `tone: "info"`); no new CSS.
- Maintainability/duplication: one new column, one additive bundle key, one input on an existing composer — no second data path.
- Scope compliance: no notification category, no scheduling, no RPC write, no advice copy.

### Remaining limitations

- `npm run test:db` cannot run locally (no Docker/Podman available); the new pgTAP file is unexecuted locally — the CI `database` lane is the first executor and must pass on the exact head before merge.
- Demo render shows no chip by construction (`backupState: null`); authenticated visual proof is post-merge owner verification per the verification plan.
- Browser smoke + Cross-device UI audit lanes pending on the PR.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-21 | researcher | implementer | specified | this packet; plan entry S1 in ALL_SURFACES_UPGRADE_PLAN_2026.md | none | implement T1–T5 on a branch; owner reviews PR |
