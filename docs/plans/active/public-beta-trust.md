# MoneyFlow Trust

**Status:** active
**Execution state:** implementing
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent program; #324 Secure implementation; #325 provider reconciliation
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust  
**Original planning path:** `docs/plans/active/public-beta-trust.md`

The owner approved this program after UI migration P0–P11 was archived. The stable path is retained to avoid backlink churn; the program name is **MoneyFlow Trust**.

MoneyFlow Trust does not reopen UI migration. It moves MoneyFlow from a released functional MVP toward a trustworthy public-beta boundary by closing provider alignment, security, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta only when repository state, production providers and user-visible behavior agree; destructive operations are protected by current security policy; user-owned state is recoverable; and the daily ledger survives real use without data loss or manual database repair.

Program memory phrase:

> **Secure → Recover → Prove → Improve → Release**

Live provider inspection inserted a prerequisite inside Secure:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

## Repository reconnaissance

### Current behavior

- Functional MVP is released.
- UI migration P0–P11 is archived; physical Android/iOS remain accepted limitations, not fabricated pass evidence.
- #323 created MoneyFlow Trust.
- #324 merged the current recent-auth implementation as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for the exact #324 Next.js commit.
- Public and ordinary unauthenticated delete-account/login return-path routing is live on that Vercel deployment.
- Production Supabase `delete-account` remains active **version 5** and does not contain the merged recent-auth AMR gate.
- Production Supabase database history is behind current MoneyFlow `main`.
- The exact missing current-main MoneyFlow set is **10 migrations**, proven by exact-head CI reset sequence plus direct remote version checks.
- Exact-head CI #2070 replayed the full migration chain including all 10 missing files and then passed **25 pgTAP files / 478 tests**.
- Production catalog preflight confirms expected review/reconciliation/rules/audit objects are still absent and checked target index names do not collide.
- PR #316 is closed as superseded historical evidence; #324 is current repository implementation truth.
- Current transaction/Inbox CSV/JSON export remains scoped user-readable export, **not** a complete restorable archive.
- P2 Recover implementation is blocked until Provider Sync and P1 Secure provider acceptance complete.

### Active prerequisite

`docs/plans/active/moneyflow-trust-provider-sync.md`

Provider Sync is now **planned**. Completed read-only evidence:

- live Supabase migration/catalog/function baseline;
- exact 10-file missing MoneyFlow migration set;
- full fresh-reset replay + 478 pgTAP pass;
- per-migration dependency/lock/data/privilege risk review;
- current production row-count/preflight checks;
- shared-project Atoryn migration-history analysis.

The only remaining pre-write execution gate is an **actual linked Supabase CLI dry-run** from an ephemeral union-history working copy. It must show exactly the reviewed 10 MoneyFlow migrations and no unrelated write before owner database-write approval is requested.

No production DDL, migration repair, Edge deployment, provider configuration change, production-data mutation or destructive deletion has been performed.

### Relevant repository/provider areas

| Area | Role |
|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/provider truth |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence |
| `docs/plans/active/moneyflow-trust-provider-sync.md` | highest-priority provider alignment packet |
| `supabase/migrations/` | Git-owned MoneyFlow schema history |
| `supabase/functions/delete-account/index.ts` | current merged destructive authority |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | current recent-auth policy helper |
| production `supabase_migrations.schema_migrations` | applied provider migration authority |
| production `delete-account` version/source | actual destructive runtime authority |
| current export/domain owners | future Recover input |

### Existing constraints

- Financial/data changes require migration replay, pgTAP/invariants and ownership/RLS evidence.
- Provider behavior requires provider evidence; repository/browser tests cannot manufacture it.
- Integer money, split exactness, transfer neutrality and tenant ownership remain invariants.
- Provider/production-data writes require explicit owner approval and rollback scope.
- Vercel deployment does not deploy Supabase migrations or Edge Functions.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Merge #316 unchanged? No; superseded and closed.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Is P1 fully deployed because Vercel is READY? No.
- [x] Does production `delete-account` contain recent-auth? No; v5 is stale.
- [x] Is production DB aligned with current MoneyFlow `main`? No.
- [x] What is the exact missing MoneyFlow migration set? Ten files, recorded in Provider Sync.
- [x] Does the full current migration chain replay cleanly? Yes; 25 pgTAP files / 478 tests pass in CI #2070.
- [x] Have migration dependencies and production lock/data risks been reviewed? Yes.
- [ ] Does an actual linked `db push --include-all --dry-run` from union history list exactly those ten MoneyFlow migrations and nothing else?
- [ ] After that dry-run, does the owner approve the exact production DB write boundary?
- [ ] After DB alignment, does the owner approve deployment of current `delete-account`?
- [ ] Do live password + Google step-up flows pass after the current Edge Function is actually deployed?

## Research

### Research scope and source selection

Research is dependency-driven and begins with repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- Provider Sync uses live Supabase migration/catalog/function reads, exact-head CI migration replay and official Supabase/PostgreSQL deployment/locking documentation.
- P2 Recover research must start from the aligned MoneyFlow schema and current export behavior; it must not design against the known drifting provider state.

### Key decisions

1. Recent-auth authority uses verified `amr` method/timestamp, not access-token issuance time.
2. AAL and recent authentication are separate concepts.
3. Vercel deployment, Supabase database migration and Supabase Edge deployment are separate lifecycles.
4. Current CSV/JSON export is not a complete restorable archive.
5. Legitimate Atoryn remote migration history must be preserved; do not use `migration repair` to make the MoneyFlow repository appear falsely linear.
6. For historical Provider Sync, use an ephemeral union-history working copy and require a real `--include-all --dry-run` before any production write.

### Sources

| Source | Authority/type | What it establishes |
|---|---|---|
| live MoneyFlow Supabase migration/catalog/function state | production truth | actual provider drift |
| current MoneyFlow `main` + merged PRs | repository truth | intended accepted provider contract |
| exact-head CI #2070 database job | executable repository evidence | all current migrations replay; 478 pgTAP pass |
| Supabase JWT/Auth docs | official | AMR method/timestamp and AAL distinction |
| Supabase Database Migrations docs | official | migration list/fetch/dry-run/include-all/repair semantics |
| Supabase Edge Function deploy docs | official | Edge deployment is explicit and separate from Vercel |
| PostgreSQL 17 ALTER TABLE / CREATE INDEX docs | official | lock and constant-default/index build behavior |
| OWASP Authentication Cheat Sheet | authoritative guidance | sensitive actions should reauthenticate |
| current MoneyFlow export code/UI | repository truth | scoped export is not full backup |
| Actual Budget backup/restore docs | maintained product reference | true restore is distinct from interchange export |

### Adoption review

No new dependency, provider, service, framework or runtime architecture is adopted. Provider Sync aligns the existing Supabase provider with already-merged contracts.

## Specification

### Problem

MoneyFlow Git/Vercel state and live Supabase state are split. Recent-auth code is merged and the Next.js side is live, while the destructive Supabase runtime remains stale. Ten merged MoneyFlow migrations are not applied in production. Public-beta trust cannot be claimed across that split boundary, and Recover must not be implemented against a provider schema known to be behind `main`.

### User stories

- As a user, production account deletion is protected by the same recent-auth policy current `main` claims.
- As a user, merged reconciliation/rules/audit capabilities are backed by their intended production schema rather than silently degraded fallbacks.
- As a user, future complete archive/restore operates against one known provider schema.
- As the owner, repository, Vercel, Supabase DB, Supabase Edge, physical-device and self-use evidence remain distinguishable.

### Acceptance criteria

Provider baseline/alignment:

- [x] PBT-AC1: repository/Vercel/Supabase baseline is reconciled and stale #316 status is removed.
- [x] PBT-AC2: exact current-main-vs-production MoneyFlow migration drift is enumerated as 10 files and replay-verified with 478 pgTAP assertions.
- [ ] PBT-AC3: real linked CLI dry-run proves the production write set is exactly the reviewed ten migrations.
- [ ] PBT-AC4: owner-approved production migrations are applied and remote schema/history matches the accepted contract.
- [ ] PBT-AC5: current `delete-account` Edge source is explicitly deployed/read back only after schema prerequisites exist.

Secure:

- [x] PBT-AC6: destructive account deletion requires verified recent interactive authentication in merged current-main source.
- [ ] PBT-AC7: the same recent-auth gate exists in the actual production Supabase Edge Function.
- [ ] PBT-AC8: provider-backed password and supported OAuth step-up are exercised on production-safe authenticated flows with identity continuity preserved.

Recover/Prove/Release:

- [ ] PBT-AC9: a versioned complete archive can be exported, validated and restored with financial invariants intact.
- [ ] PBT-AC10: restore fails safely on unsupported/corrupt/partial archives.
- [ ] PBT-AC11: core ledger behavior is exercised on a physical phone.
- [ ] PBT-AC12: MoneyFlow completes seven consecutive days of sanitized owner self-use without data loss or manual DB repair.
- [ ] PBT-AC13: no unresolved P0/P1 defect blocks the daily-ledger loop at final decision.
- [ ] PBT-AC14: current memory/evidence are reconciled and the owner records the final public-beta decision and accepted limitations.

### Financial and security constraints

- Never infer or alter balances to make migration/restore succeed.
- Preserve integer money, transfer neutrality, split exactness and tenant ownership.
- Do not deploy current Edge tenant inventory before required provider tables exist.
- Do not edit migration history as a shortcut for unapplied SQL.
- Preserve legitimate Atoryn remote migration history.
- Backup archives must exclude credentials, JWTs, secrets and private infrastructure metadata.
- No destructive real-user deletion is required for provider acceptance.

### Out of scope

- UI redesign/reopening P0–P11.
- Bank sync/Open Banking.
- Generative financial advice.
- Household/collaboration, investments/wealth, native rewrite, full envelope budgeting.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the modular monolith. Provider Sync aligns the existing Supabase DB/Edge runtime with Git-owned migration/function contracts. P1 stays inside existing Auth/login/callback/Edge authority. P2 introduces a versioned public archive contract only after provider state is aligned and Secure is accepted.

### Current phase map

| Phase/checkpoint | Short name | Current state |
|---|---|---|
| P0 | Baseline | provider drift discovered and reconciled |
| P0/P1 prerequisite | **Provider Sync** | **planned; actual linked union-history dry-run pending** |
| P1 | **Secure** | merged; Vercel side live; Supabase backend not current |
| P2 | **Recover** | implementation blocked by Provider Sync + P1 acceptance |
| P3 | **Prove** | blocked by P2 |
| P4 | **Improve** | blocked by P3 evidence |
| P5 | **Release** | blocked by prior phases |

### Provider Sync rollout design

Completed read-only preparation:

1. captured remote migration/function baseline;
2. proved exact 10-file MoneyFlow drift;
3. replayed the full current migration chain and 478 pgTAP assertions;
4. reviewed all ten migration dependencies, lock/data/privilege behavior and current production preflight state;
5. confirmed seven legitimate newer Atoryn migration-history rows must be preserved.

Next allowed sequence:

1. create an ephemeral union-history working copy and capture real linked `migration list` + `db push --include-all --dry-run` output;
2. require that dry-run to name exactly the ten reviewed MoneyFlow migrations and no unrelated write;
3. return to owner for explicit DB provider-write approval;
4. immediately recheck production pre-state/locks before any write;
5. apply only the approved migrations in repository order through standard Supabase migration tooling;
6. stop on first error; never mark an unapplied migration as applied;
7. verify remote history/catalog/RLS/grants/functions/indexes/advisors and safe app reads/RPCs;
8. return to owner for explicit current Edge deployment approval;
9. deploy/read back current `delete-account` with `verify_jwt=true` and shared recent-auth helper;
10. run production-safe password/Google step-up acceptance without confirmed destructive deletion;
11. reconcile P1 and parent memory; only then unlock Recover implementation.

### Rollback / forward-fix principle

These are additive/behavioral historical migrations already expected by current application code. Blind database rollback is not the default. If a migration fails, inspect actual transactional/history state and forward-fix from observed truth. Edge rollback to v5 would reintroduce a known security gap, so any rollback requires explicit owner approval and should be used only when the new deployment itself is unsafe.

### Verification plan

- Pre-write: real CLI dry-run, fresh replay evidence, provider pre-state/lock checks.
- Post-DB: remote migration history, expected schema objects, RLS/grants, functions/indexes, advisors, safe app/RPC reads.
- Post-Edge: version/source/hash read-back and `verify_jwt=true`.
- Secure acceptance: ordinary/stale/fresh password/OAuth paths, no destructive real-user deletion.
- Recover later: archive validation/restore/invariant tests.
- Prove later: physical phone + seven-day sanitized owner run.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | reconcile repository/Vercel/open candidates | parent | #324/#316 + Vercel evidence | complete |
| P0-T2 | inspect live Supabase DB + Edge | P0-T1 | provider-read evidence | complete; drift found |
| PS-T1 | record Provider Sync packet | P0-T2 | active packet | complete |
| PS-T2 | prove exact 10-file migration diff | P0-T2 | CI reset sequence + remote version checks | complete |
| PS-T3 | review migrations/dependencies/production risks | PS-T2 | source + production preflight | complete |
| PS-T4 | prove full fresh replay | PS-T2 | CI #2070: 25 pgTAP files / 478 pass | complete |
| PS-T5 | capture actual union-history linked `--include-all --dry-run` | PS-T2–T4 | CLI read-only output | todo |
| PS-T6 | owner approve exact DB provider write | PS-T5 | explicit approval | blocked |
| PS-T7 | apply/verify approved DB alignment | PS-T6 | remote history/catalog evidence | blocked |
| PS-T8 | owner approve current Edge deployment | PS-T7 | explicit approval | blocked |
| PS-T9 | deploy/read back current `delete-account` | PS-T8 | version/source/hash | blocked |
| P1-T1 | recent-auth implementation | P0 | #324 | complete |
| P1-T2 | exact-head security/database/browser verification | P1-T1 | CI #2070 / CodeQL/Secret #1173 + clean rerun | complete |
| P1-T3 | owner merge + Vercel deployment | P1-T2 | `fd984a...`, `dpl_8Eak...` | complete |
| P1-T4 | live password + Google provider acceptance | PS-T9 | provider evidence | blocked |
| P1-T5 | mark/archive Secure accepted | P1-T4 | lifecycle record | blocked |
| P2-T1 | accept archive contract | P1 accepted | accepted Recover packet | blocked |
| P2-T2 | implement export/validate/restore | P2-T1 | DB/browser/invariant evidence | blocked |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | device evidence | blocked |
| P3-T2 | seven-day sanitized self-use | P3-T1 | daily outcome log | blocked |
| P4-T1 | select one observed trust-depth slice | P3-T2 | observed problem | blocked |
| P5-T1 | owner public-beta decision | prior phases | final decision | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | #323 + owner approval | #316 stale | execute trust sequence |
| 2026-08-08 | evaluator | human_owner | ready_for_review | #324 exact-head evidence | owner merge | owner decides |
| 2026-08-08 | human_owner | CI/production | merged | #324 → `fd984a...` | provider deployment truth | inspect each provider separately |
| 2026-08-08 | researcher | planner | provider drift found | Vercel READY + live Supabase v5/migration/catalog reads | provider split | specify sync; no writes |
| 2026-08-08 | planner | evaluator | planned | exact 10-file diff; CI #2070 replay/478 pgTAP; per-file risk review | actual linked CLI dry-run unavailable in current connector | capture dry-run in an environment with linked Supabase CLI; no writes |

### Current permission boundary

- Allowed: bounded branch/PR work; GitHub/Vercel/Supabase read-only inspection; official research; local/ephemeral CLI dry-run that does not mutate provider state.
- Exact repository: `Thunderkill016/moneyflow`.
- Current provider scope: `provider_read` only.
- Forbidden without explicit owner approval: actual production `db push`, migration repair, DDL, Edge deployment, provider config writes, production financial-data mutation and destructive deletion.
- DB write approval may be requested only after PS-T5 dry-run exists.
- Edge write approval may be requested only after DB alignment evidence exists.
- P2 implementation remains blocked until Provider Sync + P1 acceptance.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| canonical MoneyFlow Trust direction retained | parent/current memory | pass on #325 branch |
| stale #316 removed | #316 closed superseded | pass |
| #324 repository/security gates | CI #2070 / CodeQL/Secret #1173 + raw browser/cross-device | pass |
| exact Next.js deployment READY | `dpl_8Eak...` → `fd984a...` | pass |
| production Supabase recent-auth Edge current | live source/version | **fail: v5 stale** |
| exact production DB drift known | ten remote version checks + CI migration sequence | pass |
| full current migration replay | CI #2070 database job, 478 pgTAP | pass |
| per-migration rollout risk reviewed | source + production preflight | pass |
| real linked union-history CLI dry-run | CLI output | **pending** |
| provider writes avoided during discovery | provider action record | pass |
| current export distinguished from full archive | merged export UI/current memory | pass |

### Review findings

- **Highest-priority blocker:** production Supabase schema and destructive Edge runtime do not match current `main`.
- The initial Vercel-only `deployed` interpretation was corrected before #325 could become project memory.
- Exact migration drift/replay/risk analysis is complete; the remaining pre-write gate is a real linked CLI dry-run.
- Recover implementation must remain blocked until provider sync and Secure acceptance complete.

### Remaining limitations

- Actual linked union-history `db push --include-all --dry-run` evidence is not yet captured.
- Production migrations remain unapplied.
- Production `delete-account` remains v5 without recent-auth.
- Live password/Google step-up is not yet acceptance evidence.
- Complete backup/restore and physical/seven-day evidence remain future phases.

## Delivery record

- Parent PR #323 merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure PR #324 merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Vercel Next.js production `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is READY.
- Supabase production provider drift is confirmed.
- Reconciliation PR #325 is active and performs no provider writes.
- Current next action: **capture the real read-only union-history CLI dry-run; then, and only then, return to the owner DB provider-write checkpoint**.
