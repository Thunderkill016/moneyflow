# #567 — Privileged RPC least-privilege proof

**Status:** selector candidate; executable only after owner merge
**Execution state:** planning
**Active role:** planner / evaluator
**Permission scope:** selector PR is documentation/authority only; implementation may change only the bounded database/test surface below after selector merge and fresh authority resolution
**Owner:** ThunderK
**Issue/PR:** GitHub #567 / implementation PR pending
**Selector:** draft PR pending
**Parent program:** GitHub #432 — MoneyFlow master development program
**Selector base:** `main@1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0`
**Last updated:** 2026-09-10

## Outcome

Reduce avoidable privileged database surface without weakening MoneyFlow's invariant-preserving RPC architecture.

The production/repository audit does **not** establish 43 vulnerabilities. It establishes 43 intentionally authenticated-callable `SECURITY DEFINER` endpoints protected by explicit grants, tenant identity checks and pgTAP contracts. This slice is therefore not a bulk remediation of Supabase Advisor findings.

It selects exactly two bounded hardening opportunities:

1. add a database regression assertion that the postgres-owned default function ACL in `public` remains deny-by-default for PUBLIC, `anon` and `authenticated`;
2. prove whether the read-only `public.reconciliation_snapshot_for_user(uuid, uuid, date)` helper can execute as `SECURITY INVOKER`; if the proof passes, reduce this one function's privilege and update the explicit inventory contract from 43 to 42.

No provider configuration, UI, product workflow, production user data or unrelated security surface is in scope.

## Repository and production reconnaissance

Fresh selector baseline is `main@1ea23a1e9600807e0b3edf10e02f7414bcdf1cf0`, where `docs/plans/PLAN_AUTHORITY.json.current` is `null`.

Read-only production catalog evidence on the MoneyFlow Supabase project shows:

- 62 `public` `SECURITY DEFINER` functions owned by `postgres`;
- 43 callable by `authenticated`;
- 19 internal-only, not callable by `authenticated`, `anon` or PUBLIC;
- zero `SECURITY DEFINER` functions callable by `anon` or PUBLIC;
- all 43 authenticated-callable functions pin a safe empty `search_path`, derive identity from `auth.uid()` and explicitly reject missing authentication.

The repository already treats that inventory as intentional. `supabase/tests/database/security_definer_contract.test.sql` asserts exactly 43 authenticated privileged endpoints, zero anon/PUBLIC access, empty `search_path`, `auth.uid()` identity and `authentication_required` rejection.

`supabase/tests/database/security_catalog.test.sql` and `browser_role_privileges.test.sql` independently prove the exposed catalog and browser grants remain least-privilege. `cross_tenant_rpc.test.sql` plus domain-specific pgTAP suites exercise negative cross-tenant cases across accounts, transactions, transfers, budgets, recurring flows, goals, archive restore/removal, rules and bulk review/correction.

### Default function ACL

Production `pg_default_acl` currently records the postgres/public function default as EXECUTE for `postgres` and `service_role` only. PUBLIC, `anon` and `authenticated` are absent.

This state is repository-owned by `supabase/migrations/20260725064242_browser_role_least_privilege.sql`, which revokes function EXECUTE from PUBLIC/anon/authenticated for existing objects and changes postgres-owned default privileges so future public functions are deny-by-default.

Current pgTAP tests prove object-level grants and the current privileged inventory, but the audit found no direct assertion of `pg_default_acl`. That is a regression-coverage gap: a future migration could weaken the default before a later function materializes the bad grant.

### Reconciliation snapshot helper

`public.reconciliation_snapshot_for_user(p_user_id, p_account_id, p_statement_date)` is `STABLE`, read-only and currently `SECURITY DEFINER`.

Its current implementation:

- requires `auth.uid()`;
- rejects `p_user_id` different from the authenticated user;
- reads only `public.accounts`, `public.transaction_entries` and `public.financial_transactions`;
- scopes the account to the authenticated user;
- performs no mutation.

Production grants/policies show `authenticated` already has SELECT on those three relations and each SELECT policy is tenant-scoped by `auth.uid() = user_id`.

`account_reconciliation_current_main.test.sql` already proves a foreign tenant cannot call the helper for another user's account and expects `reconciliation_snapshot_forbidden`.

The helper is also used by the `security_invoker` `account_reconciliation_summaries` view and by privileged start/complete reconciliation functions. Any privilege reduction must preserve all three call paths.

## External research refreshed

Official references reviewed on 2026-09-10:

1. PostgreSQL `CREATE FUNCTION` documentation — `SECURITY INVOKER` runs with the privileges of the caller; `SECURITY DEFINER` runs with the owner privileges; privileged functions require careful `search_path` and selective EXECUTE grants.
2. PostgreSQL Function Security — function security depends on trusted object ownership and controlled search paths.
3. Supabase Database Functions — prefer invoker/default execution where elevated privilege is unnecessary; if definer is used, pin `search_path`; revoke function access by default and grant explicit endpoints.
4. Supabase Advisors — Advisor findings are deterministic checks that must be interpreted against application intent; a finding is not itself a fix.

Research consequence:

- do not silence Advisor by mass-converting invariant-preserving mutation RPCs;
- remove elevated privilege only where the caller already has the necessary SELECT access and RLS provides the intended tenant boundary;
- directly test the default grant policy because function EXECUTE is independent from row-level policies.

## Specification

### S1 — default ACL regression proof

Add pgTAP coverage that directly inspects PostgreSQL default ACL state for postgres-owned functions in schema `public` and fails if PUBLIC, `anon` or `authenticated` would receive EXECUTE automatically.

The test must prove the intended deny-by-default contract, not merely assert the current count of functions.

It must avoid hard-coding provider-generated identifiers or relying on production-only state; the local migration reset must produce the same contract.

### S2 — single read-only privilege reduction

Evaluate `reconciliation_snapshot_for_user` under `SECURITY INVOKER` using the existing local Supabase/pgTAP test environment.

If and only if all acceptance evidence remains green:

- alter/recreate only this helper as `SECURITY INVOKER` while retaining its explicit auth/tenant guards and safe search path;
- keep the current authenticated EXECUTE grant because the summaries view/direct authenticated tests require the endpoint to remain callable;
- update `security_definer_contract.test.sql` from 43 to 42 with a comment identifying #567 as the reviewed removal;
- add an explicit assertion that this helper is invoker rather than simply disappearing from the counted inventory.

If invoker changes the semantics of start/complete reconciliation, open summaries, RLS behavior or call privileges, do **not** force the conversion. Keep the function definer and complete only S1, recording the blocking evidence.

### Non-goals

- no mass conversion of the other 42 authenticated privileged RPCs;
- no schema move for the 19 internal-only helpers;
- no direct financial-table mutation grants;
- no RLS redesign;
- no archive/reconciliation domain rewrite;
- no Supabase Auth/provider/WAF change (#174 remains separate);
- no UI/design work;
- no production data mutation.

## Financial and security invariants

- VND remains integer đồng and all money bounds remain unchanged.
- Transfers remain equal/opposite and neutral to income/expense.
- Reconciliation locking, zero-difference completion, stored historical snapshots and reopen semantics remain unchanged.
- `financial_transactions` and `transaction_entries` remain browser SELECT-only; financial mutations continue through reviewed invariant-preserving RPCs.
- Direct cross-tenant reads/writes remain database-rejected.
- PUBLIC and `anon` gain no function EXECUTE path.
- Default function privileges remain explicit opt-in for browser roles.

## Implementation plan

This is a Class 3 database/security slice.

After owner merges the selector PR:

1. refresh from post-selector `main` and run `npm run plan:resolve` plus `npm run agent:doctor -- --json`;
2. re-read #567, this packet, the current reconciliation migration/function, security privilege migrations and affected pgTAP suites;
3. add the smallest `pg_default_acl` contract test and run it against a clean local Supabase reset;
4. change only `reconciliation_snapshot_for_user` to invoker and add/update focused contract assertions;
5. run affected reconciliation/security pgTAP suites first;
6. run the complete database test suite and migration reset from scratch;
7. run exact-head lint/typecheck/unit/static-RLS/build, policy/knowledge gates, CodeQL and Secret History required by repository CI;
8. evaluator reads #567, this packet and exact diff and challenges whether privilege was actually reduced without weakening tenant or finance behavior;
9. rerun Supabase Security Advisor only after the implementation is deployed through the normal owner-controlled merge/deploy path; never patch production manually;
10. on completion, archive this packet, return `PLAN_AUTHORITY.current` to `null`, reconcile project memory and close #567 only after evidence is complete.

## Acceptance matrix

The implementation is acceptable only when all applicable evidence is green:

- clean local Supabase reset applies every migration;
- default ACL pgTAP fails if EXECUTE is reintroduced for PUBLIC/anon/authenticated and passes on the intended state;
- authenticated owner can read open reconciliation summaries;
- cross-tenant direct snapshot call remains rejected;
- start reconciliation works;
- account-leg clearing works;
- zero-difference completion works;
- later/backdated reconciliation does not rewrite completed historical snapshots;
- reopen semantics remain unchanged;
- transaction financial mutation remains blocked after reconciliation where currently required;
- security catalog/browser-role tests remain green;
- authenticated SECURITY DEFINER inventory is exactly 42 if S2 succeeds, otherwise remains 43 with documented blocking evidence;
- no new anon/PUBLIC function exposure;
- no direct browser write privilege is added to financial tables.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 567.1 | production/repo privileged-RPC reconnaissance | live catalog + migrations/tests | done |
| 567.2 | official PostgreSQL/Supabase research refresh | references above | done |
| 567.3 | identify bounded hardening scope | default ACL proof + snapshot invoker candidate | done |
| 567.4 | selector + authority projection | selector PR | in_progress |
| 567.5 | default ACL pgTAP regression proof | implementation branch | blocked |
| 567.6 | snapshot invoker proof/change | implementation branch | blocked |
| 567.7 | full DB/CI/security validation | exact implementation head | blocked |
| 567.8 | evaluator + lifecycle closeout | implementation PR evidence | blocked |

## Evaluation

Evaluator must answer directly from #567, this packet and the exact diff:

1. Does the new test actually prove `pg_default_acl`, rather than only current object grants?
2. Does the invoker helper still reject cross-tenant calls through both direct RPC and the summaries view?
3. Can start/complete reconciliation still obtain the same snapshot while preserving locking and historical semantics?
4. Did any financial table become directly browser-writable?
5. Were any unrelated SECURITY DEFINER functions converted or moved merely to reduce Advisor count?
6. Did PUBLIC or `anon` gain function access?
7. Is any production/provider change being smuggled into the code migration?

Success means MoneyFlow has stronger regression proof and, where demonstrably safe, one less elevated browser-callable function without changing financial behavior.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-10 | audit | planner | evidence complete | production catalog, grants/RLS, security/reconciliation tests | select bounded slice | docs-only selector |
| 2026-09-10 | planner | selector evaluation | candidate | GitHub #567 + this packet | selector PR number, exact-head governance/evaluation, owner merge | selector-only changes |

## Current permission boundary

Before selector merge, this branch may change only the planning/authority/project-memory artifacts required to select #567. It may not edit migrations, database tests, runtime code, Supabase production configuration/data, provider settings or UI.

After selector merge and fresh authority resolution, implementation permission is bounded to S1/S2 and directly affected tests/lifecycle artifacts. Merge remains an explicit owner action.