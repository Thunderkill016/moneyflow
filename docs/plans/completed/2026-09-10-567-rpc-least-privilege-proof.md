# #567 — Privileged RPC least-privilege proof

**Status:** completion projection in implementation PR #571
**Execution state:** completed pending owner merge
**Active role:** evaluator / lifecycle closeout
**Permission scope:** no further database implementation is authorized by this packet after merge
**Owner:** ThunderK
**Issue/PR:** GitHub #567 / PR #571
**Selector:** GitHub PR #568 (owner-merged)
**Parent program:** GitHub #432 — MoneyFlow master development program
**Implementation base:** `main@2309fca6fb1d3ce03732679d4ae33c5e09668c8f`
**Accepted implementation head:** `9f82f8fcfc05ed0667dd28c34b65eb9d9c66611f`
**Last updated:** 2026-09-10

## Outcome

#567 reduces avoidable database privilege while preserving MoneyFlow reconciliation and tenant boundaries.

The slice makes two bounded changes:

1. future functions created by role `postgres` no longer inherit PostgreSQL's hard-wired global PUBLIC EXECUTE default; explicit per-schema grants remain additive and unchanged;
2. the read-only `public.reconciliation_snapshot_for_user(uuid, uuid, date)` helper now executes as `SECURITY INVOKER`, reducing the authenticated-callable `SECURITY DEFINER` inventory from 43 to 42 without changing its body, stable volatility, empty `search_path`, authenticated EXECUTE grant, tenant guard, source-table grants or RLS policies.

No other privileged RPC is converted or moved. No financial table becomes browser-writable. No provider/Auth/WAF/UI behavior or production user data is changed.

## Corrected PostgreSQL default-ACL finding

The planning audit initially treated the existing schema-scoped statement in `20260725064242_browser_role_least_privilege.sql` as sufficient to make future `public` functions deny-by-default.

Implementation review proved that assumption incomplete. PostgreSQL 17 defines function EXECUTE for PUBLIC in the hard-wired/global default. Per-schema default privileges are additive to the global default, so a schema-scoped REVOKE cannot remove a privilege granted globally.

Read-only production catalog evidence confirmed the live state before implementation:

- `acldefault('f', postgres) = {=X/postgres,postgres=X/postgres}`;
- there was no postgres global `pg_default_acl` override for functions;
- the `public` schema row contained only additive postgres/service-role entries;
- the `storage` schema row explicitly grants its intended roles, so those additive grants are not removed by the global PUBLIC revocation.

PR #571 therefore adds `20260910181500_function_default_acl_hardening.sql` with a global postgres default revocation for PUBLIC/anon/authenticated. This changes defaults for future postgres-owned functions; it does not revoke grants on existing functions.

`security_catalog.test.sql` now verifies both layers: the global override exists and grants no EXECUTE to PUBLIC/anon/authenticated, while the `public` per-schema additions also introduce none.

## Reconciliation privilege reduction

`20260910182000_reconciliation_snapshot_security_invoker.sql` uses only:

```sql
alter function public.reconciliation_snapshot_for_user(uuid, uuid, date)
  security invoker;
```

The helper remains read-only and `STABLE`. Its existing authenticated caller already has SELECT on `accounts`, `transaction_entries` and `financial_transactions`, with tenant RLS on those relations. Its explicit same-user guard remains unchanged.

`security_definer_contract.test.sql` now expects exactly 42 reviewed authenticated SECURITY DEFINER functions and separately asserts this helper is invoker rather than merely disappearing from the inventory.

## Regression discovered and corrected

The new global deny-by-default policy intentionally removed the implicit PUBLIC execution path from a `pg_temp.insert_source_candidate` helper in `source_lifecycle_reconciliation_policy.test.sql`.

The first fresh database run therefore exposed a real test dependency on unsafe default execution. The fix grants EXECUTE explicitly to `authenticated` for that temporary test helper only. Production roles/functions are not widened.

That correction is useful evidence that S1 is effective rather than cosmetic.

## Acceptance evidence

Accepted implementation head `9f82f8fcfc05ed0667dd28c34b65eb9d9c66611f` produced the following before a later documentation-only head superseded/cancelled its run:

- fresh local Supabase reset applied all 60 pinned migrations, including both #567 migrations;
- pgTAP: **41 files / 784 tests / all successful**;
- reconciliation account-leg, correction, current-main, locking and workspace-read-model suites: PASS;
- browser-role privilege, security catalog, security-definer and cross-tenant RPC suites: PASS;
- source lifecycle/reconciliation and all import/provenance suites: PASS;
- static quality, lint, typecheck, unit/static-RLS and production build shards: PASS;
- CodeQL: PASS;
- Secret History: PASS.

The database job was cancelled only after its 784-test PASS because a newer documentation commit changed the PR head. Final lifecycle-head CI is still mandatory before owner handoff.

## Evaluation

Evaluator questions from the active packet resolve as follows:

1. **Default ACL proof:** PASS. The test directly reads `pg_default_acl` and checks the global override plus `public` additions; it does not infer safety from current object counts.
2. **Cross-tenant snapshot:** PASS. Reconciliation tests continue to reject foreign-user direct snapshot access and hide foreign summary rows under RLS.
3. **Start/complete/reopen/history:** PASS. All reconciliation suites remain green under invoker execution.
4. **Financial table writes:** PASS. No table grant/RLS policy is changed; the only new GRANT is for a `pg_temp` test helper.
5. **Scope:** PASS. Only one reviewed read-only helper leaves SECURITY DEFINER; the other 42 authenticated privileged RPCs and 19 internal helpers are untouched.
6. **PUBLIC/anon exposure:** PASS. Existing privileged functions remain denied, and future postgres-owned functions now require explicit execution grants.
7. **Production/provider boundary:** PASS. Production was queried read-only for catalog evidence; no production migration/provider mutation was performed.

Evaluator result: **PASS, subject to final lifecycle-head CI**.

## Tasks

| ID | Task | Evidence | Status |
| --- | --- | --- | --- |
| 567.1 | production/repo privileged-RPC reconnaissance | live catalog + migrations/tests | done |
| 567.2 | official PostgreSQL/Supabase research refresh | engine/docs cross-check | done |
| 567.3 | identify bounded hardening scope | S1 + S2 | done |
| 567.4 | selector + authority projection | PR #568 merged | done |
| 567.5 | effective default ACL hardening + pgTAP | PR #571 | done |
| 567.6 | snapshot invoker proof/change | 784-test DB evidence | done |
| 567.7 | implementation-head DB/static/security validation | `9f82f8fc...` | done |
| 567.8 | evaluator + lifecycle closeout | this packet + final-head CI | in_progress |

## Handoff

PR #571 projects #567 to completed state and returns `PLAN_AUTHORITY.current` to `null`. That lifecycle projection becomes merged truth only if the owner merges PR #571 after final exact-head required checks are green.

After owner merge, production deployment/migration reconciliation remains a separate owner-controlled operational step; do not manually patch production from this packet. Issue #570 remains a separate production-migration consistency lane. Parent #174 remains separate provider-control work. UI remains explicitly deferred.

Merge remains an explicit owner action.
