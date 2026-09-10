# MoneyFlow — current project memory

**Status:** M0, MON-61, MON-62, MON-63, #557 and the #559 design foundation are completed. PR #571 is the open completion PR for bounded database-security slice #567; its lifecycle projection returns executable authority to `null` only on owner merge.
**Last reconciled:** 2026-09-10
**Last verified production runtime baseline:** `2309fca6fb1d3ce03732679d4ae33c5e09668c8f` (owner-merged selector PR #568), Vercel READY; `/api/health` returned 200 for that exact commit. PR #571 is not production truth while open.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

Owner-merged PR #568 selected #567 from fresh main. PR #571 implements and closes that bounded slice: prove effective deny-by-default function execution and remove unnecessary owner privilege from one read-only reconciliation snapshot helper. No broad SECURITY DEFINER rewrite is justified.

The owner has explicitly deferred UI work. #559 remains reference/design foundation only; no visual territory or runtime Design System slice is selected.

Parent #174 remains separate public-beta provider-control work. Issue #570 remains a separate proven production-migration consistency problem and is not implicitly selected by #567.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are equal/opposite and neutral to income/expense/net.
- Authenticated user-owned data is database-enforced tenant-isolated; demo mode is explicit browser-local state.
- Source/provider observations are evidence, not permission to overwrite ledger facts.
- Corrections remain explicit, auditable and recoverable where required.
- Full archive/restore remains separate from scoped/report export.
- Sensitive financial tables remain browser-read-oriented; reviewed RPCs own invariant-preserving mutations.
- Missing source coverage, provider semantics, balances, dates or financial intent are never guessed by authoritative paths.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence and parser/mapping/lifecycle provenance.

MON-63 established versioned remembered mappings, dry-run/review, atomic authenticated preview→Inbox commit, exact-intent replay, changed-intent fail-closed behavior and privacy-safe import-maintenance evidence.

Exception-first Inbox review is already implemented by #511/PR #522. Ready classification never auto-posts; duplicate/transfer/low-confidence or unresolved evidence remains attention-required.

Reconciliation is statement-oriented and account-leg based. Completed snapshots are historical facts; later backdated activity does not silently rewrite them. Start, clear, complete and reopen transitions remain database-controlled and cross-tenant tested.

VCB/ACB/VietinBank bank-specific automatic mapping remains disabled until exact current layouts and stable transaction identity are proven.

## 4. Security and reliability evidence

#557/PR #561 is merged and completed. Turnstile script-load failure is finite and recoverable while email auth remains fail-closed without a real CAPTCHA token.

The privileged-RPC audit established that the earlier 43 authenticated-callable `SECURITY DEFINER` functions were a reviewed privileged surface, not 43 confirmed vulnerabilities: zero were executable by anon/PUBLIC; all pinned safe search paths and derived tenant identity from `auth.uid()`.

#567 found two bounded improvements and PR #571 implements both:

- future postgres-owned functions require explicit execution grants rather than inheriting PostgreSQL's global PUBLIC EXECUTE default;
- `reconciliation_snapshot_for_user(uuid, uuid, date)` becomes SECURITY INVOKER while keeping its body, tenant guard, grants and RLS dependencies unchanged.

Implementation-head evidence at `9f82f8fcfc05ed0667dd28c34b65eb9d9c66611f`: fresh local reset applied all migrations; 41 pgTAP files / 784 tests passed; reconciliation, security catalog, browser grants, cross-tenant and source/import suites passed; static quality, unit/static-RLS and production build passed; CodeQL and Secret History passed. A later documentation head superseded that run, so final lifecycle-head checks remain mandatory.

## 5. Current capability inventory

| Capability | Current truth |
| --- | --- |
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe adapters; explicit remembered mapping |
| Import integrity | atomic/replay-safe authenticated batch commit in repo; changed-intent fail-closed; raw statements not retained as generic telemetry |
| Review | deterministic Ready/Needs-attention semantics; explicit approval; no automatic posting |
| Rules | deterministic tenant-owned candidate-stage categorization rules with version evidence |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Auth CAPTCHA | real-token gated with finite stalled-script recovery |
| Privileged RPCs | PR #571 projects authenticated SECURITY DEFINER inventory 43 → 42 after one proven read-only invoker conversion |
| Executable authority | merged main keeps #567 selected until PR #571 owner merge; PR #571 projects post-merge `current = null` |

## 6. #567 implementation truth

The initial planning assumption about default privileges was corrected during implementation. PostgreSQL function EXECUTE has a hard-wired/global PUBLIC default. Per-schema default privileges are additive, so `IN SCHEMA public REVOKE ... FROM PUBLIC` cannot remove a global grant.

Read-only production catalog confirmed the pre-#571 state: `acldefault('f', postgres)` still included PUBLIC EXECUTE; the `public` schema row contained additive postgres/service-role entries; `storage` had its own explicit additive anon/authenticated/service-role grants.

PR #571 therefore adds a global postgres function-default revocation for PUBLIC/anon/authenticated. Existing function grants are unchanged, and explicit per-schema grants such as `storage` remain additive.

The new policy deliberately broke one pg_temp test helper that had relied on implicit PUBLIC EXECUTE. The test was corrected by explicitly granting only that temporary helper to `authenticated`; production access was not widened. This is evidence that the default hardening is effective rather than cosmetic.

## 7. Research/evidence boundary

Code, migrations, tests and live catalog/runtime observations outrank prose. External documentation is supporting evidence, not MoneyFlow authority.

For #567, PostgreSQL engine semantics outrank a conflicting simplified Supabase documentation snippet about schema-scoped default-function revocation. The repository now tests the effective catalog state directly so future documentation ambiguity cannot silently weaken the boundary.

Production Supabase was queried read-only for catalog evidence. PR #571 has not applied migrations to production and changes no provider/Auth/WAF setting or user data.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: completed and archived.
- #511 / PR #522: completed; exception-first review is current capability.
- #557 / PR #561: completed and merged.
- #559 / PRs #562–#566: design foundation completed; runtime UI remains deferred.
- #567: implementation/evaluation complete in open PR #571; lifecycle completion becomes merged truth only on owner merge after final exact-head checks.
- #570: open production-migration reconciliation lane; separate authority is required before any hosted database write.
- #174: open provider-control lane; operational/provider evidence remains separate.
- #426: stale original simplification direction is not executable authority.

## 9. Open pull-request memory

### PR #571 — RPC default ACL proof and snapshot privilege reduction

Base: owner-merged #567 selector `main@2309fca6fb1d3ce03732679d4ae33c5e09668c8f`.

Scope is limited to two database migrations, security/reconciliation pgTAP contracts, one explicit temporary-test-helper grant, migration identity, and lifecycle/memory artifacts.

No unrelated privileged RPC is converted. No financial table grant/RLS policy is loosened. No provider/Auth/WAF/UI work and no direct production write are included.

PR #571 now carries same-PR lifecycle convergence: completed packet at `docs/plans/completed/2026-09-10-567-rpc-least-privilege-proof.md`, active packet removed, and `PLAN_AUTHORITY.current` projected to `null`.

Final exact-head CI, CodeQL and Secret History must be green after these lifecycle changes before Ready handoff. Merge remains an explicit owner decision.

## 10. True gaps after this audit

1. Production Supabase is still missing repo migrations `20260909090000_import_batch_atomic_commit.sql` and `20260909120000_import_batch_measurement.sql`; #570 owns reconciliation and must not be patched without its own authority.
2. Maintenance minutes and true manual interventions are not honestly derivable from generic timestamps/edits; instrumentation or a tighter semantic event contract is still required.
3. Real-world maintenance reduction needs repeated cohort evidence, not feature-count claims.
4. Exact Vietnamese bank export layouts and stable identity remain incomplete evidence for bank-specific automation.
5. #174 provider-console controls still require provider-side verification and reversible operational changes.
6. Physical-device and post-deploy production evidence remain separate release gates.
7. Project memory/tracker truth must continue to be reconciled deterministically against merged code, lifecycle state and production evidence.

## 11. Next allowed action

Finish exact-head checks for PR #571 and hand it to the owner without merging automatically.

If the owner merges #571, refresh from merged main and confirm `PLAN_AUTHORITY.current = null`. Then promote only one next bounded slice through normal repository authority. #570 is a proven operational dependency for durable import-maintenance measurement, but it is not automatically selected by this closeout.

Do not perform direct production database writes from #567. Do not start UI/redesign work; it remains deferred.

## 12. Superseded-status register

- Supabase Advisor's 43 authenticated SECURITY DEFINER findings equal 43 confirmed vulnerabilities — **false**.
- The 19 internal SECURITY DEFINER helpers are browser-exposed — **false**.
- Schema-scoped default-function REVOKE removes PostgreSQL's global PUBLIC EXECUTE default — **false**; #567 corrects and tests the effective global policy.
- `reconciliation_snapshot_for_user` requires SECURITY DEFINER — **false** under #567 evidence; all reconciliation/RLS suites pass with invoker execution.
- #511 is still unimplemented — **false**; PR #522 completed it.
- PR #561 is awaiting merge — **false**; #557 is completed.
- #559 is current executable UI work — **false**; UI is explicitly deferred.
- A visual territory is selected — **false**.
- #570 is authorized merely because it is next in Plate — **false**; production writes require fresh bounded authority.
- Plate priority or chat instruction alone overrides repository authority — **false**.
