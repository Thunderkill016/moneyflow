# MoneyFlow Trust — Provider Sync

**Status:** planned
**Execution state:** planned
**Active role:** planner
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; provider write requires later explicit owner approval
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase database history/schema and the `delete-account` Edge Function with accepted current `main` before Phase 1 Secure can advance from `merged` to `deployed/accepted` and before Phase 2 Recover implementation begins.

This packet is planned at a read-only boundary. It does **not** authorize or execute production DDL, migration-history repair, Edge deployment, provider configuration changes, production-data mutation or destructive account deletion.

## Repository reconnaissance

### Production Edge drift

Read-only production inspection on 2026-08-08 shows `delete-account`:

- active version **5**;
- `verify_jwt=true`;
- authenticates bearer user with `getUser()` and then calls `purge_user_tenant_data`;
- has no `evaluateAccountDeletionRecentAuth` import;
- has no verified AMR recent-auth gate;
- has a tenant inventory older than current provenance/rules/reconciliation/audit ownership.

Current `main` differs materially:

- verifies JWT claims and evaluates AMR before tenant purge;
- allows only current `password`/`oauth` recency evidence;
- returns `recent_auth_required` before destructive authority when evidence is stale/unsupported;
- current tenant inventory includes `transaction_import_provenance`, `inbox_rules`, `account_reconciliations`, `account_reconciliation_events` and `financial_mutation_audit_events`.

Vercel `READY` for #324 therefore proves the Next.js deployment only.

### Exact database migration drift

Production MoneyFlow migration history reaches `20260802022923_dashboard_read_bundle`. The same Supabase project also contains seven newer legitimate Atoryn design/editor migration-history rows that must be preserved.

Exact-head CI #2070 fresh-reset logs plus direct production version checks prove the exact **10-file current-main MoneyFlow missing set**:

| Order | Migration | Provenance | Main effect |
|---:|---|---|---|
| 1 | `20260802060004_cover_foreign_key_indexes.sql` | #236 | FK-supporting indexes |
| 2 | `20260803090000_transaction_review_bulk_correction.sql` | #255 | transaction review enum/column/index/view/RPCs |
| 3 | `20260803142000_account_reconciliation_current_main.sql` | #261 | reconciliation domain/tables/entry state/RPCs/triggers |
| 4 | `20260803144500_account_reconciliation_ci_hardening.sql` | #261 | reconciliation FK indexes/function hardening |
| 5 | `20260803153000_account_reconciliation_workspace_read_model.sql` | #263 | reconciliation read model |
| 6 | `20260804110000_authenticated_deterministic_rules.sql` | #265 | `inbox_rules`, RLS/triggers/RPCs + rule evidence |
| 7 | `20260804160000_financial_mutation_audit.sql` | #270 | financial audit domain/triggers/current tenant purge |
| 8 | `20260804160100_financial_read_plan_indexes.sql` | #270 | financial read-plan index |
| 9 | `20260804160200_financial_audit_service_role_inspection.sql` | #270 | service-role audit inspection boundary |
| 10 | `20260804160300_financial_audit_request_id_token.sql` | #270 | bounded request-correlation contract |

All ten versions are absent from production migration history.

Exact-head CI #2070:

- fresh local reset applied the complete current migration chain including all ten in this order;
- `supabase test db` ran **25 pgTAP files / 478 tests / all successful**.

### Production catalog/preflight state

Read-only catalog checks confirm the expected pre-migration state:

- missing types: `transaction_review_status`, `entry_reconciliation_state`, `financial_audit_action`;
- missing columns: `financial_transactions.review_status`; reconciliation fields on `transaction_entries`; rule-evidence fields on `inbox_candidates`;
- missing tables: `account_reconciliations`, `account_reconciliation_events`, `inbox_rules`, `financial_mutation_audit_events`;
- checked target index names are absent, so no known same-name collision exists.

Affected row counts at inspection:

- financial transactions: 47;
- transaction entries: 47;
- Inbox candidates: 6;
- accounts: 3;
- categories: 33;
- monthly budgets: 0;
- transaction-import provenance: 0.

Small tables lower expected lock duration but do not relax production safety requirements.

### Account-deletion stale-purge finding

Production contains `transaction_import_provenance`, while deployed Edge v5 and current production purge logic predate that ownership.

Relevant provenance FKs:

- Inbox candidate: `ON DELETE RESTRICT`;
- financial transaction: `ON DELETE RESTRICT`;
- Auth user: `ON DELETE CASCADE`.

At inspection time provenance has zero rows, so this specific failure shape is not active. The destructive runtime is still structurally stale. No destructive production request was executed.

### Per-migration rollout review

| Group | Risk | Decision |
|---|---|---|
| FK/read-plan indexes | ordinary `CREATE INDEX` can block writes during build | low at current size; apply in bounded window |
| transaction review | enum + constant-default `NOT NULL` column + index/view/RPCs; `ALTER TABLE` lock | low/moderate |
| reconciliation foundation | largest schema-lock/constraint surface on `transaction_entries` plus new domain tables | moderate; apply only after preflight |
| reconciliation hardening/read model | supporting indexes/functions/view | low after foundation |
| authenticated rules | new RLS table + nullable candidate evidence columns/triggers/RPCs | low/moderate |
| financial audit | new append-only audit table + mutation triggers + complete purge replacement | moderate/high operational importance |
| audit service-role inspection | privilege change | low, but least-privilege sensitive |
| audit request-id token | constraint/helper on new audit table | low if applied immediately after audit |

PostgreSQL 17 behavior used in this risk review:

- `ALTER TABLE` generally needs strong locking;
- non-volatile constant defaults do not require a full table rewrite for existing rows;
- ordinary `CREATE INDEX` permits reads but blocks writes while building.

### Dependency order

Do not reorder the files:

1. review precedes reconciliation/audit because later code references `review_status`;
2. reconciliation foundation precedes hardening/read model/audit;
3. rules precede current purge because current purge references `inbox_rules`;
4. financial audit precedes its index/grant/request-id follow-ups;
5. DB alignment precedes current Edge deployment because current Edge tenant verification references new provider-owned tables.

## Research

### Official migration/deployment mechanics

Current Supabase CLI documentation establishes:

- local migration files and remote `supabase_migrations.schema_migrations` are separate histories;
- `migration list` compares migration versions;
- `migration fetch` fetches remote migration files;
- `db push --dry-run` previews without applying;
- `db push --include-all` includes local migrations absent from remote history, including older local versions;
- `migration repair` changes tracking state and is not a substitute for applying SQL;
- Edge Functions require explicit Supabase deployment; Vercel deployment is unrelated.

### Shared remote history decision

Seven legitimate Atoryn migration-history rows exist in the same Supabase project and contain statement payloads. Do **not** use `migration repair --status reverted` to erase them.

Candidate read-only execution path:

1. use an ephemeral provider-sync working copy at exact MoneyFlow `main`;
2. materialize the legitimate remote-only Atoryn migration history in that ephemeral copy using read-only migration fetch/history data;
3. do not commit fetched Atoryn migrations into MoneyFlow by default;
4. run `supabase migration list --linked`;
5. run `supabase db push --linked --include-all --dry-run`;
6. require the dry-run to list **exactly the ten MoneyFlow migrations above and nothing else**.

If the current CLI still reports an irreconcilable remote/local mismatch, stop. Do not mutate remote history automatically.

### Alternatives considered

| Option | Decision |
|---|---|
| continue Recover while provider state differs from Git | reject |
| call #324 fully deployed based on Vercel only | reject |
| deploy current Edge before DB alignment | reject |
| apply ad-hoc DDL via SQL | reject; bypasses migration ownership/history |
| repair away legitimate Atoryn history | reject |
| create replacement migration versions for the historical 10 | reject; loses accepted version identity |
| ephemeral union history + exact dry-run + owner-approved standard push | selected candidate |

### Adoption review

No new dependency/service/provider is adopted. This aligns the existing Supabase provider with already-merged repository contracts.

## Specification

### Problem

Git and production Supabase are materially split. Security-sensitive deletion code is newer in Git than the production Edge Function, while ten merged DB migrations are absent from production. Schema-skew fallbacks may hide some missing capabilities but cannot establish public-beta trust.

### User stories

- As a user, production deletion is protected by the current merged recent-auth policy.
- As a user, merged reconciliation/rules/audit capabilities are backed by their intended schema.
- As the owner, production migration/function state is traceable to exact repository contracts before public beta.

### Acceptance criteria

- [x] PS-AC1: remote migration history and Edge source/version captured read-only.
- [x] PS-AC2: current-main/provider drift recorded without writes.
- [x] PS-AC3: exact missing MoneyFlow set proven as ten files.
- [x] PS-AC4: current migration chain including all ten replays and 478 pgTAP assertions pass.
- [x] PS-AC5: per-migration dependency/lock/data/privilege risks and production preflight recorded.
- [ ] PS-AC6: actual linked union-history CLI dry-run lists exactly the ten reviewed MoneyFlow migrations and no unrelated write.
- [ ] PS-AC7: owner explicitly approves exact production DB write boundary.
- [ ] PS-AC8: approved migrations are applied in order and remote history/catalog matches current main.
- [ ] PS-AC9: post-migration RLS/grants/functions/indexes/advisors and core DB invariants are verified.
- [ ] PS-AC10: owner explicitly approves current `delete-account` Edge deployment.
- [ ] PS-AC11: production Edge read-back proves recent-auth/current tenant inventory/`verify_jwt=true`.
- [ ] PS-AC12: safe stale-auth/password/Google step-up evidence is recorded without destructive real-user deletion.
- [ ] PS-AC13: no affected provider/runtime error cluster appears during verification.
- [ ] PS-AC14: P1/current memory advances only after provider evidence exists.

### Financial and security constraints

- No fabricated rows, data repair or destructive real-user test.
- Preserve integer money, transfer neutrality, split exactness, RLS and tenant ownership.
- Do not deploy current Edge before required DB objects exist.
- Do not edit migration history as a shortcut for unapplied SQL.
- Preserve legitimate Atoryn remote migration history.
- Never copy service-role credentials/secrets into repository evidence.

### Out of scope

- Recover implementation.
- New product features/UI redesign.
- Atoryn schema cleanup unrelated to this MoneyFlow rollout.
- Destructive production account deletion.

## Implementation plan

### Database write candidate

After PS-AC6 and explicit owner approval:

1. recapture remote pre-state immediately before write;
2. check for unexpected long-running/locking transactions on affected tables;
3. use standard Supabase migration push from the exact reviewed ephemeral union-history working copy with `--include-all` and no seed/role flags;
4. stop on the first error and never manually mark unapplied SQL as applied;
5. verify all ten original MoneyFlow versions in remote history;
6. verify expected types/columns/tables/indexes/functions/RLS/grants;
7. run read-only integrity checks/advisors and safe app/RPC reads;
8. only then consider Edge deployment.

### Edge deployment candidate

After DB verification and explicit owner approval:

1. capture current production Edge v5 metadata/hash;
2. deploy current `delete-account` bundle including `_shared/account-deletion-recent-auth.ts`;
3. preserve `verify_jwt=true`;
4. read back deployed version/source/hash;
5. prove recent-auth gate and current tenant inventory exist;
6. exercise ordinary/stale/fresh provider flows without confirmed destructive deletion;
7. inspect provider/runtime errors;
8. reconcile Secure lifecycle.

### Rollback / forward-fix

The ten migrations are additive/behavioral history already expected by current application code; blind rollback is not the default.

- If a migration fails transactionally, stop and inspect actual schema/history before repair.
- Never mark a failed migration applied.
- Index failures should be forward-fixed after inspecting partial/invalid indexes.
- If audit triggers break valid financial mutation after migration, prefer a forward fix under an explicit emergency owner boundary.
- Edge rollback to v5 would reintroduce a known security gap, so prefer a forward fix unless the new deployment itself is unsafe.

### Verification plan

- Pre-write: actual linked CLI dry-run, existing replay evidence, refreshed provider pre-state/lock checks.
- Post-DB: migration history, catalog, RLS/grants, functions/indexes, advisors and safe app/RPC reads.
- Post-Edge: version/source/hash + `verify_jwt=true` read-back.
- Product: safe password/OAuth step-up; no destructive delete.
- Observability: affected Supabase DB/Auth/Edge and Vercel error windows.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | capture production migration/function baseline | live provider reads | complete |
| PS-T2 | prove exact ten-file MoneyFlow missing set | CI sequence + remote version checks | complete |
| PS-T3 | review SQL/dependencies/lock/data risks | source + production preflight | complete |
| PS-T4 | prove full migration replay | CI #2070: 25 pgTAP files / 478 pass | complete |
| PS-T5 | run actual union-history linked `--include-all --dry-run` | CLI read-only output | todo |
| PS-T6 | owner DB provider-write checkpoint | explicit approval | blocked by PS-T5 |
| PS-T7 | apply/verify approved ten migrations | remote history/catalog/integrity evidence | blocked |
| PS-T8 | owner Edge provider-write checkpoint | explicit approval | blocked by PS-T7 |
| PS-T9 | deploy/read back current `delete-account` | version/source/hash | blocked |
| PS-T10 | production-safe recent-auth provider acceptance | password/Google evidence | blocked |
| PS-T11 | reconcile P1/parent/current memory | accepted provider evidence | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | specified | provider migration/catalog/Edge reads | exact set/replay/risk review incomplete | continue read-only |
| 2026-08-08 | planner | evaluator | planned | exact 10-file diff; CI #2070 replay/478 pgTAP; per-file risk review | actual linked CLI dry-run not available through current connector | capture real dry-run in a linked CLI environment; no provider writes |

### Current permission boundary

- Allowed: GitHub branch/docs work; GitHub/Vercel/Supabase read-only inspection; official research; local/ephemeral CLI dry-run that does not mutate provider state.
- Current provider scope: `provider_read`.
- Forbidden: production DDL, actual `db push`, migration repair, Edge deployment, provider configuration change, production-data mutation and real-account deletion.
- DB write approval can be requested only after the exact dry-run exists.
- Edge write approval can be requested only after DB alignment evidence exists.

## Evaluation

### Acceptance evidence

- production Edge v5 lacks current recent-auth: **drift confirmed**;
- production DB lacks exact 10 merged MoneyFlow migrations: **drift confirmed**;
- exact current migration chain replays all ten and passes 478 pgTAP assertions: **pass**;
- per-file dependency/lock/data/privilege review: **pass**;
- production catalog/row-count preflight: **pass for planning**, not a write guarantee;
- legitimate Atoryn remote history preserved by plan: **pass**;
- no provider write performed: **pass**;
- actual linked CLI union-history dry-run: **pending**.

### Review finding

**Provider Sync is the highest-priority MoneyFlow Trust blocker.** Recover implementation must not start until production Supabase DB and destructive Edge runtime align with current `main` and Secure provider acceptance completes.

### Remaining limitations

- actual linked CLI `db push --include-all --dry-run` evidence is not captured;
- production migrations remain unapplied;
- production Edge remains v5;
- live provider step-up is unverified.

## Delivery record

- Discovery/reconciliation branch: `agent/moneyflow-trust-reconcile-p1`.
- PR: #325.
- Provider writes: none.
- Production data writes: none.
- Current state: `planned` at the read-only CLI dry-run boundary.
