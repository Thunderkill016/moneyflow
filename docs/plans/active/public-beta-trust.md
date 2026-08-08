# MoneyFlow Public Beta Trust

**Status:** active
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Authorized:** 2026-08-08
**Base main:** `cfff4c826155a955ee58383c96a256f71c6eee3d`
**Branch:** `agent/public-beta-trust-plan`
**Issue/PR:** pending

The owner explicitly approved this program after the UI-system migration P0–P11 was archived. This program does not reopen UI migration. It moves MoneyFlow from a released functional MVP toward a trustworthy public-beta boundary by closing security, portability and daily-use evidence gaps before adding speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta when a user can trust the daily ledger, recover from mistakes, prove recent identity before destructive account deletion, export and restore a versioned complete archive, and complete a real seven-day self-use cycle without data loss or manual repair.

## Repository reconnaissance

Current merged truth on 2026-08-08:

- Functional MVP is released.
- UI-system migration P0–P11 is archived; P11 is merged and production evidenced.
- Current production P11 deployment is `READY`.
- Physical Android/iOS UI acceptance was explicitly closed as a limitation of the UI program and is not represented as pass evidence.
- Current true public-beta gaps include provider-backed recent authentication for destructive account deletion and complete versioned archive/restore.
- PR #316 contains a verified-unmerged recent-auth candidate, but it diverges from current `main`: 26 commits ahead and 4 commits behind, with merge base `8b97566...`; it must be refreshed rather than merged unchanged.
- Current product principles prioritize data correctness, core-flow completion, mobile usability, recovery and trust depth before visual polish or speculative breadth.

## Research

Repository truth was inspected first. External sources are used only for focused design decisions.

| Source | Authority | Applied decision | Limitation |
|---|---|---|---|
| Supabase JWT Claims Reference | official | `amr` is a first-class optional Supabase JWT claim containing authentication method + timestamp; use verified server claims rather than client timers for recent-auth evidence | does not define MoneyFlow's freshness window |
| Supabase MFA/Auth docs | official | `aal` describes authentication assurance, while recent interactive authentication remains a separate recency policy; do not conflate token refresh with user reauthentication | MFA is not automatically required for every user |
| OWASP Authentication Cheat Sheet | authoritative security guidance | require reauthentication for sensitive operations and enforce it at the trusted server boundary | guidance is general; exact UX/provider flow is implementation-specific |
| Actual Budget backup/restore docs + API | maintained product reference | treat complete backup/restore as a different trust capability from CSV export; use a versioned archive that can be imported/restored and validated before replacement | MoneyFlow must not copy Actual's SQLite/archive format blindly |

## Program principles

1. **Trust before breadth.** No new dashboard/AI/bank-sync/redesign program is part of this plan.
2. **Server authority for sensitive actions.** Recent-auth state must come from verified auth evidence, not browser state.
3. **Export is not restore.** Human-readable CSV/JSON remains useful, but public-beta portability requires a versioned restorable archive contract.
4. **Facts remain authoritative.** Backup/restore cannot weaken integer-money, transfer neutrality, split exactness, ownership/RLS or soft-delete semantics.
5. **Physical-use evidence is product evidence.** Browser emulation remains useful but does not replace real-device daily-use acceptance when this program claims it.
6. **Observed friction outranks speculative features.** Ledger-depth work after beta gates is selected from real use and trust gaps.

## Scope and dependency order

### Phase 0 — public-beta truth baseline

- Reconcile current `main`, production, open security/portability PRs and public-beta gaps.
- Define exact acceptance vocabulary: repository verified, provider verified, physical-device verified, self-use verified.
- Keep UI migration archived.
- Confirm which existing PRs are reusable, stale or superseded.

**Exit:** one current-truth baseline and owner-approved sequence.

### Phase 1 — recent authentication for destructive account deletion

Use PR #316 as evidence/candidate, not as directly mergeable truth.

Tasks:

1. Refresh the design against current `main` and current Supabase Auth/JWT behavior.
2. Preserve the existing destructive authority in the server/Edge Function boundary.
3. Use verified `amr` timestamps for supported interactive authentication methods; do not treat token refresh/`iat` as fresh user authentication.
4. Preserve identity continuity through password/OAuth step-up so a different account cannot inherit deletion authority.
5. Preserve scoped return paths and clear destructive confirmation across reauthentication.
6. Re-run exact-head static/unit/database/browser/cross-device/security checks.
7. After owner merge, verify provider-backed password and supported OAuth step-up on the deployed build without destructive real-user deletion.

**Exit:** merged + deployed + provider-evidenced recent-auth gate for permanent account deletion.

### Phase 2 — versioned backup/restore v1

Design a complete MoneyFlow archive separate from ordinary CSV/JSON export.

Required contract:

- explicit archive schema version;
- manifest with export time, app/schema version and included domains;
- complete user-owned Core data required to reconstruct the supported ledger state;
- integer native amounts and explicit currency preserved exactly;
- transaction/entry relationships, splits and transfers restored without reinterpretation;
- categories/accounts/planning records included only where their ownership and dependency order are defined;
- validation before any destructive restore action;
- import into a safe isolated/review boundary before replacing existing user state;
- duplicate/idempotency and foreign-key ordering defined;
- no secrets, auth tokens, provider credentials, logs or private infrastructure metadata in the archive;
- forward/backward compatibility policy and explicit unsupported-version failure;
- rollback/recovery path.

**Exit:** create archive → validate → restore into a clean test user → financial invariants and representative UI/browser journey match source state.

### Phase 3 — daily ledger trust acceptance

This is evidence work, not a feature-count phase.

Required acceptance:

- production authentication and recovery complete on the real domain;
- create/edit/delete/restore transaction works on a physical phone;
- transfer and split paths preserve exact totals;
- account balances, income/expense and transfer exclusion reconcile;
- export opens correctly in common spreadsheet tooling;
- versioned archive restores successfully on a clean boundary;
- no open P0/P1 defect blocks the daily ledger loop;
- owner uses MoneyFlow for seven consecutive days without data loss or manual database repair.

Each day records only bounded evidence: core tasks attempted, defect severity, data repair required/not required and follow-up issue references. Do not store personal financial details in repository evidence.

**Exit:** seven-day self-use acceptance plus resolved P0/P1 defects.

### Phase 4 — selected ledger trust depth

Only begin after Phases 1–3 or a specific blocker demonstrates a prerequisite need.

Candidate slices, in order:

1. split-line correction with safe preview/recovery;
2. non-sensitive financial mutation audit;
3. merchant/payee normalization if repeated friction is observed;
4. saved review views if repeated review friction is observed.

Do not automatically build all candidates.

**Exit:** selected trust slice solves an observed problem without weakening Core simplicity.

### Phase 5 — public-beta decision

Reconcile:

- security and recent-auth evidence;
- backup/restore portability evidence;
- daily-use/physical-device evidence;
- unresolved P0/P1 defects;
- production runtime/provider observations;
- privacy/delete/export recovery boundaries;
- operating/support limitations.

The owner then makes an explicit **public-beta / not-yet** decision. No repository test alone can make this product decision.

## Acceptance criteria

- [ ] PBT-AC1: current public-beta baseline is reconciled and stale candidate claims are removed.
- [ ] PBT-AC2: destructive account deletion requires verified recent interactive authentication on merged current `main` and deployed production.
- [ ] PBT-AC3: provider-backed password and supported OAuth step-up are exercised on production-safe flows with identity continuity preserved.
- [ ] PBT-AC4: a versioned complete archive can be exported, validated and restored into a clean boundary with financial invariants intact.
- [ ] PBT-AC5: restore never silently accepts unsupported/corrupt archives or partial financial state.
- [ ] PBT-AC6: core transaction/edit/delete/restore/transfer/split behavior is exercised on a physical phone.
- [ ] PBT-AC7: MoneyFlow completes a seven-consecutive-day owner self-use run without data loss or manual DB repair.
- [ ] PBT-AC8: no unresolved P0/P1 defect blocks the daily ledger loop at final decision.
- [ ] PBT-AC9: current memory, work packets and production evidence are reconciled before archive.
- [ ] PBT-AC10: owner records the final public-beta decision and accepted limitations.

## Explicit non-goals

Not authorized by this program unless separately specified:

- another UI redesign or UI migration continuation;
- bank sync/Open Banking;
- probabilistic/generative AI behavior;
- household finance/collaboration;
- investments/wealth accounting;
- native mobile rewrite;
- full envelope budgeting;
- microservices/event-sourcing rewrite;
- automatic unreviewed financial posting.

## Risks and controls

| Risk | Control |
|---|---|
| stale PR #316 merged over newer Auth/UI code | refresh/rebuild on current `main`; exact-head review |
| client claims recent auth without server proof | verify signed Supabase JWT claims at destructive authority |
| OAuth reauth signs into a different user | explicit expected-user identity continuity check |
| backup is only readable export, not restorable state | separate versioned archive contract + clean restore test |
| restore corrupts an existing ledger | validate first, isolate/review, atomic or recoverable commit strategy |
| archive leaks secrets/provider tokens | strict allowlist of user-owned financial/product data only |
| emulation treated as physical evidence | record device/browser/version for claimed physical acceptance |
| seven-day run stores sensitive data in Git | record outcomes/defects only, never financial values or private data |
| program expands into feature roadmap | each phase exit blocks speculative breadth; Phase 4 is evidence-selected |

## Verification policy

- Documentation/planning: project knowledge + CI policy.
- Auth/security code: lint/typecheck/unit/build + browser + cross-device + CodeQL + secret scan; database/Edge checks where selected.
- Database/restore work: migration replay, pgTAP/invariant tests, cross-tenant isolation and restore counterexamples.
- Provider behavior: read-only/bounded before-after evidence and production smoke; no destructive real-user deletion test.
- Daily-use acceptance: physical-device evidence and sanitized defect log.

## Permission boundary

Current authorization from the owner allows creation of this parent program and bounded work toward the sequence above on branches/PRs.

Still owner-controlled:

- merge to `main`;
- production/provider configuration writes;
- destructive production-data operations;
- relaxing acceptance criteria;
- public-beta launch decision.

## Immediate next action

Phase 1 begins by refreshing PR #316 against current `main@cfff4c826155a955ee58383c96a256f71c6eee3d`. The existing candidate is retained as research/test evidence, not merged unchanged.
