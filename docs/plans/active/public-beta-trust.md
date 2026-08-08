# MoneyFlow Trust

**Status:** active
**Execution state:** implementing
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent program; #324 Secure implementation; #325 reconciliation/provider discovery
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust  
**Original planning label/path:** Public Beta Trust / `docs/plans/active/public-beta-trust.md`

The owner approved this program after the UI-system migration P0–P11 was archived. The stable path is retained to avoid backlink churn; the program name is **MoneyFlow Trust**.

MoneyFlow Trust does not reopen UI migration. It moves MoneyFlow from a released functional MVP toward a trustworthy public-beta boundary by closing security, provider alignment, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta when the repository, production providers and user-visible behavior agree; a user can trust the daily ledger, recover from mistakes, prove recent identity before destructive account deletion, export and restore a versioned complete archive, and complete a real seven-day self-use cycle without data loss or manual database repair.

Program memory phrase:

> **Secure → Recover → Prove → Improve → Release**

A **Provider Sync** checkpoint now sits inside Secure because live Supabase inspection proved that merged repository state and production Supabase state have diverged.

Operational order is therefore:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

## Repository reconnaissance

### Current behavior

- Functional MVP is released.
- UI-system migration P0–P11 is archived; physical Android/iOS were recorded as accepted limitations rather than fabricated pass evidence.
- #323 created MoneyFlow Trust.
- #324 merged recent-auth implementation as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for the exact #324 Next.js commit.
- Public and ordinary unauthenticated delete-account/login return-path routing is live on that Vercel deployment.
- **Live Supabase inspection disproved the initial assumption that Secure was fully deployed:** production `delete-account` is still version 5 and does not contain the merged recent-auth gate.
- Production Supabase migration history is also behind several merged MoneyFlow migrations; reconciliation/rules/audit tables expected by current main are absent in production.
- PR #316 is closed as superseded historical evidence; #324 is current repository implementation truth.
- Current transaction/Inbox CSV/JSON export remains a scoped user-readable export, **not** a complete restorable archive.
- P2 Recover implementation is blocked until Provider Sync and P1 Secure deployment/acceptance are complete. Read-only P2 research/spec preparation may continue only if it does not distract from the provider blocker.

### Active prerequisite

`docs/plans/active/moneyflow-trust-provider-sync.md`

Read-only provider discovery established:

- Supabase project `fwpldsdkpzhswpuctbke` is `ACTIVE_HEALTHY`;
- production `delete-account` is ACTIVE version 5, `verify_jwt=true`, but its source lacks `evaluateAccountDeletionRecentAuth`/`getClaims()` recent-auth enforcement;
- production v5 tenant inventory predates current provenance/rules/reconciliation/audit ownership;
- remote MoneyFlow migration history reaches `20260802022923_dashboard_read_bundle` before later unrelated Atoryn design/editor migrations;
- confirmed merged MoneyFlow migrations absent from remote history include FK-index, reconciliation, authenticated-rules and financial-audit migrations;
- production catalog confirms `account_reconciliations`, `account_reconciliation_events`, `inbox_rules` and `financial_mutation_audit_events` are absent;
- production contains `transaction_import_provenance`, but the deployed purge RPC does not explicitly delete/verify it, while its foreign keys to Inbox candidates and financial transactions are `ON DELETE RESTRICT`.

No provider write or destructive production request was executed.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/provider truth | authoritative status input |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence | keep active until provider deployment/acceptance |
| `docs/plans/active/moneyflow-trust-provider-sync.md` | production DB/function alignment blocker | highest-priority current packet |
| `docs/product/PRINCIPLES.md` | trust-before-breadth prioritization | preserve |
| `docs/product/MONEYFLOW_PRODUCT_VISION.md` | long-term wave sequence | reuse Ledger Trust first |
| `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md` | dependency/domain boundaries | preserve ledger/planning separation |
| `supabase/migrations/` | Git-owned schema history | compare against remote before any write |
| `supabase/functions/delete-account/` + shared helper | destructive authority | deploy only after schema prerequisites and owner approval |
| current export/domain owners | Recover input | do not relabel scoped export as backup |

### Existing tests and constraints

- UI/shared-component changes require policy, lint, typecheck, tests, build and browser evidence when selected.
- Financial/data changes require migration replay, pgTAP/invariants, ownership/RLS and browser evidence where applicable.
- Provider behavior must be verified separately from repository tests.
- Integer money, split exactness, transfer neutrality, ownership isolation and soft-delete/recovery remain invariants.
- Provider/production-data writes require explicit owner approval and rollback scope.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Similar implementation and recent history

- #183/#184 demonstrated the correct model: merge, separately apply production migrations, then verify/record provider acceptance.
- #321/#322 completed UI migration implementation and archive.
- #323 created this trust program.
- #324 refreshed #316 recent-auth design onto current main and fixed additional OAuth continuity/recovery findings.
- Provider Sync was added because Vercel deployment alone did not update Supabase Edge/database state.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Merge #316 unchanged? No; superseded and closed.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Build speculative breadth before trust gates? No.
- [x] P1 repository implementation merged? Yes, #324.
- [x] Is P1 fully deployed because Vercel is READY? **No.**
- [x] Does production Supabase `delete-account` contain recent-auth? **No, version 5 is stale.**
- [x] Is production DB aligned with all merged MoneyFlow schema work? **No.**
- [ ] Prove the complete local-vs-remote migration drift set mechanically.
- [ ] Replay/review the exact missing migration sequence and return to owner for provider-write approval.
- [ ] Align production database, then deploy/read back current `delete-account` under a separate owner-approved provider-write boundary.
- [ ] Exercise live password + Google step-up after backend deployment.
- [ ] Only then accept P1 and begin Recover implementation.

## Research

### Research scope and source selection

Research remains dependency-driven and starts from current repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- Provider Sync uses live Supabase migration/catalog/function reads plus official Supabase migration and Edge deployment documentation.
- P2 research must inspect current MoneyFlow schema/export behavior first, then use maintained official references for transaction-safe restore/versioned formats.

### Questions answered

1. What server-verifiable Supabase evidence distinguishes interactive authentication from token refresh? Verified AMR method/timestamp.
2. Is AAL the same as recent authentication? No.
3. Does Vercel deploy Supabase Edge Functions or database migrations? No.
4. Is MoneyFlow's current export a complete restorable archive? No.
5. Can merged provider-dependent capabilities be called production-current when their DDL/function deployment is absent? No.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| live MoneyFlow Supabase catalog/migration/function source | production provider truth | 2026-08-08 | actual provider drift and current destructive runtime | read-only snapshot |
| current MoneyFlow main + merged PRs | repository truth | 2026-08-08 | intended merged DB/function contract | merge is not deployment |
| Supabase JWT/Auth docs | official | 2026-08-08 | AMR method/timestamp and AAL distinction | MoneyFlow chooses accepted methods/window |
| Supabase Database Migrations docs | official | 2026-08-08 | local migration files and remote migration history must be compared/applied explicitly | provider write still needs owner approval |
| Supabase Edge Functions deployment docs | official | 2026-08-08 | Edge functions require explicit Supabase deployment | unrelated to Vercel deploy |
| OWASP Authentication Cheat Sheet | authoritative guidance | 2026-08-08 | sensitive operations should require reauthentication | exact interval is product-specific |
| MoneyFlow merged export UI/domain code | repository truth | 2026-08-08 | current export is scoped and explicitly not complete backup | Recover must inspect all domains |
| Actual Budget backup/restore docs | maintained finance reference | 2026-08-08 | restorable archive is distinct from CSV interchange | MoneyFlow needs its own contract |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| start another UI program | visible progress | trust/provider gaps remain | reject |
| treat Vercel READY as full Secure deployment | simple status | false security claim | reject |
| deploy current Edge immediately | closes recent-auth runtime gap | current tenant inventory references schema absent in production | reject until DB sync |
| push migrations blindly | quick | missing/exhaustiveness/rollback not proven | reject |
| ignore provider drift and build Recover | feature progress | builds on split repository/production truth | reject |
| complete Provider Sync planning/replay, then owner-approved DB → Edge rollout | explicit and auditable | slower but correct | selected |

### Research decision

Provider alignment is now a prerequisite checkpoint inside Secure. P1 remains `merged`, not `deployed`. Recover implementation remains blocked. Read-only provider/schema research can continue without widening permissions.

### Adoption review

No new dependency, provider, service, framework or runtime architecture is adopted. Provider Sync aligns the existing Supabase project with already-merged contracts.

## Specification

### Problem

MoneyFlow is functional-MVP complete and UI-migration complete, but current Git state and live Supabase production state are split. Recent-auth code is merged and the Next.js side is live, while the destructive Supabase runtime remains stale. Several merged database domains also lack production DDL. Public-beta trust cannot be claimed across that split boundary.

### User stories

- As a user, production account deletion is protected by the same recent-auth policy the repository claims.
- As a user, merged provider-backed finance capabilities do not silently degrade because required schema was never applied.
- As a user, I can later export/restore a complete archive against one known provider schema rather than a drifting one.
- As the owner, repository, Vercel, Supabase database, Supabase Edge, physical-device and self-use evidence remain distinguishable.

### Acceptance criteria

Baseline/provider alignment:

- [x] PBT-AC1: current repository/Vercel/provider baseline is reconciled and stale #316 status removed.
- [ ] PBT-AC2: complete current-main-vs-production Supabase migration drift is enumerated and replay-verified.
- [ ] PBT-AC3: owner-approved production migrations are applied and remote schema/history matches the accepted current-main contract.
- [ ] PBT-AC4: current `delete-account` Edge source is explicitly deployed/read back only after schema prerequisites exist.

Secure:

- [x] PBT-AC5: destructive account deletion requires verified recent interactive authentication in merged current-main source.
- [ ] PBT-AC6: the same recent-auth gate exists in the actual production Supabase Edge Function.
- [ ] PBT-AC7: provider-backed password and supported OAuth step-up are exercised on production-safe authenticated flows with identity continuity preserved.

Recover/Prove/Release:

- [ ] PBT-AC8: a versioned complete archive can be exported, validated and restored into a clean boundary with financial invariants intact.
- [ ] PBT-AC9: restore never silently accepts unsupported/corrupt archives or partial financial state.
- [ ] PBT-AC10: core transaction/edit/delete/restore/transfer/split behavior is exercised on a physical phone.
- [ ] PBT-AC11: MoneyFlow completes a seven-consecutive-day owner self-use run without data loss or manual DB repair.
- [ ] PBT-AC12: no unresolved P0/P1 defect blocks the daily ledger loop at final decision.
- [ ] PBT-AC13: current memory, work packets and production evidence are reconciled before archive.
- [ ] PBT-AC14: owner records final public-beta decision and accepted limitations.

### Required states

- Baseline: current main, Vercel, Supabase database and Supabase Edge truth are reconciled separately.
- Provider Sync: exact migration/function drift → replay/plan → owner write approval → DB alignment → Edge deployment → provider verification.
- Secure: fresh/stale/expired/failed/mismatched reauthentication paths are explicit and live at the destructive provider boundary.
- Recover: valid, corrupt, unsupported-version and partial archives fail or restore deterministically.
- Prove: physical/mobile and seven-day outcomes are recorded without sensitive financial details.
- Release: public-beta or not-yet with limitations named explicitly.

### Financial and security constraints

- Never infer or alter balances to make restore/provider rollout succeed.
- Preserve integer VND/minor-unit money, transfer neutrality and split exactness.
- Preserve tenant isolation/RLS and viewer-derived mutation authority.
- Recent-auth evidence must be server-verifiable; client state cannot authorize deletion.
- Do not deploy current Edge tenant inventory before required tables exist.
- Do not repair migration history instead of applying/verifying schema.
- Backup archives must exclude passwords, JWTs, provider credentials, secrets and private infrastructure metadata.
- Imported owner/user identifiers must never become authorization authority for the current viewer.
- No destructive real-user deletion is required for provider acceptance.

### Out of scope

- UI redesign or reopening P0–P11.
- Bank sync/Open Banking.
- Probabilistic/generative AI financial advice.
- Household/collaboration.
- Investments/wealth accounting.
- Native rewrite.
- Full envelope budgeting.
- Microservices/event-sourcing rewrite.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the current modular monolith. Provider Sync aligns the existing Supabase database and Edge runtime with Git-owned migration/function contracts. P1 stays inside Supabase Auth/login/callback/Edge deletion authority. P2 will introduce a versioned public archive contract only after provider state is aligned.

### Planned changes

| Phase/checkpoint | Short name | Change | Current state |
|---|---|---|---|
| P0 | Baseline | reconcile repo/Vercel/Supabase/candidates/evidence vocabulary | reopened by provider drift; read-only discovery active |
| P0/P1 prerequisite | **Provider Sync** | exhaustive migration diff/replay, owner-approved DB alignment, then current Edge deployment/read-back | specified |
| P1 | **Secure** | recent-auth repo implementation + actual provider deployment + provider acceptance | merged; Supabase backend pending |
| P2 | **Recover** | versioned complete archive, validation, isolated/atomic restore and rollback | research/spec prep allowed; implementation blocked |
| P3 | **Prove** | physical-phone + seven-day daily-use acceptance | blocked by P2 |
| P4 | **Improve** | one observed Ledger Trust depth slice if justified | blocked by P3 evidence |
| P5 | **Release** | reconcile evidence and record owner beta decision | blocked by prior phases |

### Provider Sync rollout design

1. Complete the local/current-main migration inventory vs remote `supabase_migrations.schema_migrations`.
2. Review every missing migration and dependency; prove the missing set is exhaustive.
3. Fresh local reset/replay all current migrations and full pgTAP/security suite.
4. Capture exact remote pre-state.
5. Return to owner with exact migration files/order, risks and rollback/forward-fix strategy.
6. Only under `provider_write_approved`, apply missing migrations in repository order.
7. Verify remote history/catalog/RLS/grants/advisors.
8. Return to owner for explicit Edge deployment approval if not already covered by a precise approval.
9. Deploy current `delete-account` with its shared helper and preserve `verify_jwt=true`.
10. Read back function version/source/hash.
11. Exercise production-safe provider step-up without confirmed destructive deletion.
12. Reconcile P1 and parent lifecycle.

### Data and migration impact

- #324 introduced no new migration.
- Provider Sync concerns already-merged migration files that production has not applied.
- Each missing migration requires replay and rollout/rollback review before production write.
- P2 may add a new archive contract later, but no Recover schema work is authorized yet.

### Risks and counterexamples

| Risk | Control |
|---|---|
| Vercel READY hides Supabase drift | provider-specific lifecycle/evidence |
| current Edge deployed before missing tables | DB alignment precedes Edge deployment |
| migration list is incomplete | exhaustive local/remote comparison before write |
| migration history is edited to look green | prohibit history-only shortcut |
| live data violates a new constraint | inspect migrations + read-only preflight before write |
| current purge fails around provenance | current tests/provider alignment; no destructive live test |
| schema-skew fallbacks hide missing capability | verify catalog directly |
| archive designed against wrong provider schema | Recover implementation blocked until sync |
| emulation reported as physical evidence | device/browser/version required for P3 |
| seven-day evidence leaks finances | record outcomes/defects only, no values/notes |

### Verification plan

- Repository: project knowledge, CI policy, exact migration/function inventory.
- Local database: fresh reset + complete pgTAP/security suite before provider write.
- Production preflight: migration history/catalog/function source/constraints read-only.
- Production post-write: remote migration history/catalog/RLS/grants/advisors.
- Edge: deployed source/version/hash + `verify_jwt=true`.
- Product: provider-safe password/OAuth step-up without destructive deletion.
- Recover later: archive schema/validation, transaction-safe restore, financial invariants.
- P3 later: physical phone and seven-day sanitized self-use evidence.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | reconcile repository/Vercel/open candidates | parent | #324/#316 + Vercel evidence | complete |
| P0-T2 | inspect live Supabase database + Edge source/version | P0-T1 | provider-read evidence | complete; drift found |
| PS-T1 | record Provider Sync packet | P0-T2 | active packet | complete |
| PS-T2 | prove exhaustive repo-vs-remote migration diff | P0-T2 | migration inventory | in_progress |
| PS-T3 | inspect missing migrations + fresh replay/full pgTAP | PS-T2 | replay/preflight evidence | todo |
| PS-T4 | owner approve exact DB provider write | PS-T3 | explicit approval | blocked |
| PS-T5 | apply/verify approved DB alignment | PS-T4 | remote history/catalog evidence | blocked |
| PS-T6 | owner approve + deploy/read-back current Edge | PS-T5 | explicit approval + source/version evidence | blocked |
| P1-T1 | recent-auth current-main implementation | P0 | #324 | complete |
| P1-T2 | exact-head security/database/browser verification | P1-T1 | CI #2070 / CodeQL/Secret #1173 + clean rerun | complete |
| P1-T3 | owner merge + Vercel Next.js deployment | P1-T2 | `fd984a...`, `dpl_8Eak...` | complete |
| P1-T4 | provider-backed authenticated password + Google step-up | PS-T6 | provider evidence | blocked |
| P1-T5 | archive P1 and mark accepted | P1-T4 | lifecycle record | blocked |
| P2-T0 | repository/schema/export reconnaissance | may read while blocked | Recover research | paused behind Provider Sync priority |
| P2-T1 | accept archive contract | P1 accepted | accepted P2 packet | blocked |
| P2-T2 | implement export/validate/restore | P2-T1 | DB/browser evidence | blocked |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | device evidence | blocked |
| P3-T2 | seven-day sanitized self-use | P3-T1 | daily outcome log | blocked |
| P4-T1 | select one observed trust-depth slice | P3-T2 | observed problem | blocked |
| P5-T1 | owner public-beta decision | prior selected phases | final decision | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | #323 + owner approval | #316 stale | execute trust sequence |
| 2026-08-08 | evaluator | human_owner | ready_for_review | #324 exact-head evidence | owner merge | owner decides |
| 2026-08-08 | human_owner | CI/production | merged | #324 → `fd984a...` | provider deployment truth | inspect each provider separately |
| 2026-08-08 | CI/production | planner | implementing | Vercel READY + live Supabase v5/migration/catalog inspection | Supabase provider drift is P0 blocker | complete migration diff/replay plan; no provider writes |

### Current permission boundary

- Granted repository scope: bounded branch/PR work for MoneyFlow Trust and read-only provider/schema research.
- Exact repository: `Thunderkill016/moneyflow`.
- Current provider scope: `provider_read` only.
- Forbidden without later explicit owner approval: production DDL, migration application/repair, Edge Function deployment, production provider config writes, production financial-data mutation, destructive account deletion, branch/ruleset changes.
- Human approval required before feature merges, provider writes, production-data writes, acceptance-criteria relaxation and final public-beta launch decision.
- P2 implementation is explicitly blocked until Provider Sync + P1 acceptance.
- Stop condition: any phase discovers a requirement changing financial semantics, ownership, provider policy or program scope; update specification and return to owner checkpoint.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| canonical MoneyFlow Trust name/sequence retained | parent/current memory | pass on #325 branch |
| stale #316 removed from current direction | #316 closed superseded | pass |
| #324 repository/security exact-head gates | CI #2070 / CodeQL/Secret #1173 + raw browser/cross-device | pass |
| exact Next.js merge deployment READY | Vercel `dpl_8Eak...` → `fd984a...` | pass |
| ordinary unauthenticated deletion/login routing | Vercel route smoke | pass |
| production Supabase recent-auth Edge current | live function source/version | **fail: v5 is stale** |
| production database aligned with merged MoneyFlow schema | migration history/catalog | **fail: confirmed drift** |
| provider writes avoided during discovery | Supabase/GitHub action record | pass |
| current export distinguished from full archive | merged export UI/current memory | pass |

### Research and adoption evidence

- Supabase documentation supports verified AMR method/timestamp and separates Edge/database deployment from Vercel.
- Live provider inspection is authoritative for what is actually deployed.
- Current MoneyFlow export is not a complete account backup.
- No external architecture/file format has been adopted wholesale.

### Review findings

- **P0 blocker:** Git and production Supabase are materially out of sync.
- Security: current production destructive Edge runtime lacks the merged recent-auth gate.
- Provider lifecycle: Vercel deployment evidence was initially overinterpreted and is corrected in #325 before merge.
- Portability: Recover must wait for one aligned provider schema.
- Scope: no production write was performed; Provider Sync remains a planned explicit approval boundary.

### Remaining limitations

- Complete migration diff not yet mechanically proven exhaustive.
- Production migrations are not aligned.
- Production `delete-account` is still v5 without recent-auth.
- Authenticated password/Google step-up cannot count as P1 acceptance before current Edge is deployed.
- Complete backup/restore is not implemented.
- Physical/seven-day daily-use evidence is not collected.

## Delivery record

- Parent planning PR: #323 — merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure implementation PR: #324 — merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Vercel Next.js production: `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY.
- Supabase production: provider drift confirmed; not current with merged DB/Edge contracts.
- Reconciliation PR: #325 — active docs/provider-read correction.
- Current program: active.
- Current next action: finish Provider Sync migration inventory/replay plan, then return to explicit owner provider-write checkpoint.
