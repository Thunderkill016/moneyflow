# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `59da7ad28f88a4a227b83fa058c36dcf5e909fe4` (#394 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Release Readiness Audit v1 (#388) remains the canonical historical release audit. Post-audit current truth has since closed RRB-01 through #391 and RRB-07 through #394.

Current release decision:

- public beta: **BLOCKED**;
- controlled closed beta: **BLOCKED on remaining P1 entry gates RRB-04, RRB-05, RRB-06 and RRB-09**;
- core finance arithmetic, transfer neutrality, RLS/tenant isolation and local archive/restore contracts remain strongly covered at their correct layers;
- authenticated rendered mixed-ledger financial truth is proven on current main;
- MoneyFlow-owned Accessible Authentication mechanisms are now explicitly proven at the browser layer for login/re-auth/recovery/update-password, with registration as supporting evidence;
- remaining work requires provider/contact/legal/production/hosted or physical-device evidence and owner decisions, not speculative repository expansion.

Current sequence:

> no fully autonomous repository-only blocker remains → unlock the first legitimate owner/provider/hosted/physical evidence boundary → clear remaining P1 entry gates → complete remaining P2 proof/accepted limitations → controlled closed beta → owner PBT-AC15 decision.

The owner-facing checklist is `docs/plans/active/README.md`.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and never income/expense.
- Destructive ledger actions use recoverable/soft-delete behavior where the product contract requires it.
- Authenticated data remains server-owned; demo state remains browser-local.
- Complete versioned archive lives at `/settings/backup`, separate from scoped/report export.
- Hosted export was accepted; hosted restore remains unexecuted and is RRB-02.
- Evidence layers remain separate: repository/static, unit/domain, database, browser, provider read-back, production runtime, physical device and owner/legal decision cannot silently prove one another.

### RRB-01 accepted browser proof

PR #391 / issue #390 added one deterministic authenticated two-account mixed ledger with independent literal expectations and strict Supabase-double miss detection.

Current rendered proof establishes:

- aggregate balance: `2,700,000` VND;
- income: `2,000,000` VND;
- expense: `300,000` VND;
- net: `1,700,000` VND;
- internal transfer: `500,000` VND, visibly transfer-toned and neutral to income/expense/net;
- cash balance: `1,200,000` VND;
- bank balance: `1,500,000` VND;
- authenticated `get_dashboard_bundle`, accounts and account-balances paths are exercised with zero unserved double requests.

The proof is browser/runtime-composition evidence. It does not replace database/RLS/provider evidence.

### RRB-07 accepted browser proof

PR #394 / issue #393 added explicit WCAG 2.2 SC 3.3.8 Accessible Authentication (Minimum) coverage for MoneyFlow-owned browser mechanisms.

Current proof establishes:

- login email/password fields expose browser/password-manager purpose semantics and accept real clipboard paste;
- normal login exposes the Google OAuth alternative without requiring password recall;
- account-deletion re-auth retains current-password semantics, real paste and the OAuth re-auth alternative without executing deletion;
- forgot-password email accepts paste with correct email semantics;
- update-password exposes `new-password` and accepts real paste;
- registration keeps supporting new-credential semantics and paste evidence;
- the shared password field now gives the password input the exact label `Mật khẩu`, while the reveal control remains a separately named button.

The proof exposed the prior implicit-label defect `Mật khẩu Hiện mật khẩu`; #394 fixed it with an explicit `<label htmlFor>` while preserving reveal behavior, autocomplete, hit area and visual layout. This evidence does **not** certify real Google OAuth, every Cloudflare Turnstile challenge, or whole-site WCAG conformance.

## 3. Current execution and repository lifecycle truth

Release Readiness Audit v1 is complete and archived. RRB-01 is complete through #391. RRB-07 is complete through #394.

There is currently **no fully autonomous repository-only release blocker** left in the known audit backlog. The next valid work depends on which external evidence/decision boundary becomes available first:

- RRB-08 — current physical-phone observation requires owner + agent;
- RRB-02 — hosted restore requires an explicitly authorized disposable/hosted target or an owner limitation decision;
- RRB-03 — destructive recent-auth provider edge remains owner/provider-gated;
- RRB-04 — provider/Auth/firewall state requires provider read access and #40/#174 owner decisions;
- RRB-05 — operator-controlled support/privacy contact requires ownership proof or owner choice;
- RRB-06 — competent legal/privacy review boundary;
- RRB-09 — current Vercel/Supabase production identity requires provider read access not exposed by connected tooling in this session.

Provider configuration, production data, deployment writes, legal decisions and owner-accepted limitations retain explicit authority boundaries.

## 4. Presentation and product-direction truth

- Fresh Blue remains shipped presentation.
- Slice 1 (#370), Slice 2 (#381) and focus hotfix #383 are completed input.
- #394 changed only shared auth semantics needed by the accessibility proof; it did not authorize or perform visual redesign.
- No Slice 3 is authorized.
- Phase E remains paused; no territory is selected.
- Phase F / broader Brand-Product Experience implementation is not started.
- Browser/emulation evidence is not physical-device evidence.
- Audit blocker work does not authorize redesign or speculative polish.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit, soft delete/recovery |
| Accounts | balances, identity, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Ownership | versioned archive/export/validation/restore contract; hosted restore limitation remains |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Slice 1 + Slice 2 + focus hotfix merged; app-owned auth accessible-name/paste/autocomplete proof merged |
| Release proof | audit complete; RRB-01 + RRB-07 closed; P1 RRB-04/05/06/09 and P2 RRB-02/03/08 remain |
| Public beta | not approved; controlled beta and PBT-AC15 remain ahead |

Code, migrations and tests outrank this table on implementation detail.

## 6. Trust, recovery and physical-device evidence

PBT-AC12 physical core-ledger acceptance remains owner-observed historical evidence. PBT-AC13's duration requirement was withdrawn and must not be recreated. PBT-AC14 remains accepted historical daily-loop evidence. PBT-AC15 remains open.

Current named gaps/limitations:

- RRB-02: hosted restore remains unexecuted;
- RRB-03: stale-AMR and real account-mismatch destructive provider edges remain unexecuted;
- RRB-04: current provider/Auth/firewall state is not read back;
- RRB-05: operator control of the published support/privacy contact is unproven;
- RRB-06: current Vietnam personal-data legal/privacy operational review is not recorded;
- RRB-08: physical-device evidence predates the latest UI/auth fixes;
- RRB-09: current production deployment/provider identity is not tied to the release candidate.

RRB-01 and RRB-07 are no longer gaps at their scoped browser evidence layers.

## 7. Configuration, security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions/execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection.
- Draft PR workflow success is not full verification evidence because heavy shards intentionally skip while draft.
- #391 final head `873f4d4d16f06e41f3b81bef5495c331434b09c7` passed CI #2492, CodeQL #1566 and Secret history #1566 before expected-head squash merge as `9911eafa…`.
- #394 final head `35a31ba52e4e44ec48d89b69b172b1764cfd8854` passed CI #2511, CodeQL #1584 and Secret history #1584 before expected-head squash merge as `59da7ad2…`.
- #394 final Cross-device UI audit ran 697 executions: 556 passed, 141 skipped; all five RRB-07 target cases passed first-run. Final artifact `ui-audit-evidence-31866956075-1`, artifact id `9242421437`, digest `sha256:d69fa4d1e2f018ff7e0e99a77f0fd896fe65eddc5bce982b2a2f12db494f9384`.
- #394 browser smoke and authenticated ownership smoke passed on the same final head; database checks were explicitly not selected and no database proof is claimed by that PR.
- The #394 proof history intentionally preserves two deterministic findings: an initial ambiguous test locator and the real password-input accessible-name defect. Neither was accepted via blind retry or weakened assertions.
- Real provider-managed OAuth/Turnstile accessibility remains outside #394's evidence boundary.
- Current CI still emits a Node-20-deprecation warning for the pinned checkout action generation. That is tooling debt and is not a release-readiness blocker unless it becomes an actual execution failure.

## 8. Reconciled issue status

Completed:

- #390 / RRB-01 — completed by #391.
- #393 / RRB-07 — completed by #394.

Still intentionally open/decision-gated:

- #40 — Supabase leaked-password protection; provider plan/state + owner decision required.
- #174 — provider-side security controls; provider state + owner decision required.

Audit blocker IDs are owned by the Current Work Board and canonical release audit; duplicate GitHub issues are created only when they add execution value.

## 9. Open pull-request memory

No runtime blocker PR remains active after #394. Lifecycle closeout may update current-state documents, but it changes no product/provider behavior and must pass its own exact-head policy checks before merge.

Future blocker PRs remain candidate evidence until exact-head gates and lifecycle closeout complete. A green check on an older head never proves a newer head.

## 10. True gaps after this audit

Remaining P1:

1. RRB-04 — current provider/Auth/firewall read-back plus #40/#174 decisions;
2. RRB-05 — verified operator-controlled support/privacy contact;
3. RRB-06 — current Vietnam personal-data legal/privacy operational review;
4. RRB-09 — current production deployment/provider identity tied to the release candidate.

Remaining P2:

5. RRB-02 — hosted restore proof/accepted limitation;
6. RRB-03 — destructive recent-auth provider-edge proof/accepted limitation;
7. RRB-08 — current physical-device proof.

Controlled closed beta remains blocked until the P1 entry gates are satisfied and there is no unresolved P0. Public beta additionally requires controlled-beta evidence and explicit PBT-AC15.

## 11. Next allowed action

There is no fully autonomous repository-only blocker to execute after #394.

Resume at the first legitimately available evidence boundary: RRB-08 with current physical-device observation, RRB-02 with an explicitly authorized disposable hosted target, RRB-04/RRB-09 with current read-only provider access, or RRB-03/RRB-05/RRB-06 with the required owner/legal decision. Repository work may then implement only the bounded remediation actually supported by that evidence.

Do not manufacture a code task merely to keep execution moving. Do not auto-resolve RRB-04/05/06/09, provider writes, production writes, legal decisions, accepted limitations or PBT-AC15.

## 12. Superseded-status register

- “RRB-07 Accessible Authentication proof is missing/current agent work” is superseded by #394.
- “RRB-01 is a current proof gap” is superseded by #391.
- “#392 is the current lifecycle closeout candidate” is superseded by its merge as `7d47ca2f…`.
- “Release Readiness Audit v1 is still pending/current” is superseded by #388.
- “The amount-focus defect is open” is superseded by #383.
- “18 PRs + 8 issues are unreconciled” is superseded by reconciliation through #387.
- “js-yaml 4.3.1 still needs delivery” is superseded by #386.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
