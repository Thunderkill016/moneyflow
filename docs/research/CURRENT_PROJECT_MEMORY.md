# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `59da7ad28f88a4a227b83fa058c36dcf5e909fe4` (#394 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Release Readiness Audit v1 (#388) is the canonical release audit. RRB-01 and RRB-07 have since been closed by current-main browser/runtime evidence in #391 and #394.

Current release decision:

- public beta: **BLOCKED**;
- controlled closed beta: **BLOCKED on remaining P1 entry gates RRB-04, RRB-05, RRB-06 and RRB-09**;
- core finance arithmetic, transfer neutrality, RLS/tenant isolation and local archive/restore contracts remain strongly covered at their correct layers;
- authenticated rendered mixed-ledger financial truth is proven on current main;
- MoneyFlow-owned login/re-auth/recovery password mechanisms now have explicit WCAG 2.2 Accessible Authentication browser evidence, without claiming provider-managed OAuth/Turnstile conformance;
- no fully agent-owned repository blocker remains after RRB-07; remaining progress depends on owner/provider/legal/read-access or physical-device/authorized-hosted evidence.

Current sequence:

> owner/provider/legal/read-access P1 gates RRB-04/05/06/09 → owner-assisted P2 proof or explicit limitation for RRB-02/03/08 → controlled closed beta after P1 clearance → owner PBT-AC15 decision.

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

### RRB-07 accepted browser/accessibility proof

PR #394 / issue #393 added an explicit WCAG 2.2 SC 3.3.8 Accessible Authentication audit for MoneyFlow-owned browser mechanisms.

Final current-main evidence establishes:

- login email/password purpose semantics, password paste and visible Google OAuth alternative;
- account-deletion re-auth exposes the same password-manager/paste mechanism and OAuth alternative without executing deletion;
- forgot-password email purpose/paste behavior;
- replacement password uses `new-password` and accepts paste;
- registration retains supporting new-credential semantics without being overclaimed as the core authentication target.

The proof exposed one real shared-component defect: `AuthPasswordField` placed the reveal button inside the same implicit label as the password input, producing the accessible name `Mật khẩu Hiện mật khẩu`. #394 replaced that relationship with an explicit input label and adjacent independently named reveal button while preserving autocomplete, reveal behavior, geometry, focus and hit-area contracts.

Provider-managed Google OAuth and Cloudflare Turnstile behavior remain separate evidence boundaries; #394 does not certify whole-site WCAG conformance.

## 3. Current execution and repository lifecycle truth

Release Readiness Audit v1 is complete and archived. RRB-01 is complete through #391. RRB-07 is complete through #394.

There is **no fully agent-owned repository blocker currently authorized**. Do not invent a replacement implementation task merely to keep execution moving.

Remaining P1 gates are not automatic agent work:

- RRB-04 — provider/Auth/firewall state requires provider read access and #40/#174 owner decisions;
- RRB-05 — operator-controlled support/privacy contact requires ownership proof or owner choice;
- RRB-06 — competent legal/privacy review boundary;
- RRB-09 — current Vercel/Supabase production identity requires provider read access not exposed by the connected tools in this session.

Remaining P2 work is also authority/evidence dependent:

- RRB-02 — hosted restore requires a disposable/authorized hosted target or explicit owner limitation decision;
- RRB-03 — destructive recent-auth provider edges require owner authorization/decision;
- RRB-08 — current physical-device proof requires real-phone observation.

Provider configuration, production data, deployment writes, legal decisions and owner-accepted limitations retain explicit authority boundaries.

## 4. Presentation and product-direction truth

- Fresh Blue remains shipped presentation.
- Slice 1 (#370), Slice 2 (#381), focus hotfix #383 and the bounded auth semantic fix in #394 are completed input.
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
| Experience | responsive light/dark web UI; Slice 1 + Slice 2 + focus hotfix merged; RRB-07 auth semantic repair merged |
| Release proof | audit complete; RRB-01 and RRB-07 closed; P1 RRB-04/05/06/09 and P2 RRB-02/03/08 remain |
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
- RRB-08: physical-device evidence predates the latest UI slices/hotfix and #394 auth repair;
- RRB-09: current production deployment/provider identity is not tied to the release candidate.

RRB-01 and RRB-07 are no longer gaps.

## 7. Configuration, security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions/execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection.
- Draft PR workflow success is not full verification evidence because heavy shards intentionally skip while draft.
- #391 final head `873f4d4d16f06e41f3b81bef5495c331434b09c7` passed CI #2492, CodeQL #1566 and Secret history #1566 before expected-head squash merge as `9911eafa…`.
- #394 final head `35a31ba52e4e44ec48d89b69b172b1764cfd8854` passed CI #2511, CodeQL #1584 and Secret history #1584 before merge as `59da7ad2…`.
- #394 final Cross-device UI audit executed 697 cases: `556 passed`, `141 skipped`, `0 failed`; RRB-07 cases #691–#695 all passed first-run. Final UI-audit artifact digest is `sha256:d69fa4d1e2f018ff7e0e99a77f0fd896fe65eddc5bce982b2a2f12db494f9384`.
- Database checks were explicitly not required for #394 and are not claimed as database proof.
- Current CI still emits a Node-20-deprecation warning for the pinned checkout action generation. That is tooling debt outside the release-blocker proofs and must not be silently bundled into unrelated work.
- Independent PR review was unavailable for #391 and #394; no review submission is claimed. #394 also had no inline or conversation comments at merge verification.

## 8. Reconciled issue status

Completed:

- #390 / RRB-01 — completed by #391.
- #393 / RRB-07 — completed by #394.

Still intentionally open/decision-gated:

- #40 — Supabase leaked-password protection; provider plan/state + owner decision required.
- #174 — provider-side security controls; provider state + owner decision required.

Audit blocker IDs are owned by the Current Work Board and canonical release audit; duplicate GitHub issues are created only when they add execution value.

## 9. Open pull-request memory

RRB-07 lifecycle closeout is a documentation-only candidate until its own exact-head policy checks pass and it merges. It changes no runtime/provider/database behavior.

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

No autonomous repository implementation task is currently authorized.

Resume only when the required evidence/authority boundary becomes available:

- owner/provider read access → RRB-04 and/or RRB-09 read-back;
- owner proves or selects an operator-controlled contact → RRB-05 follow-up if source changes are needed;
- competent legal/privacy review → RRB-06 remediation only if required;
- real physical phone available → RRB-08 with owner observation;
- disposable/authorized hosted target → RRB-02 proof;
- owner authorization/decision → RRB-03 provider-edge proof or explicit limitation.

Do not auto-resolve RRB-04/05/06/09 or owner-accepted limitations. Provider/production writes remain separately scoped even if read access becomes available.

## 12. Superseded-status register

- “RRB-07 is a current proof gap / next agent-owned task” is superseded by #394.
- “RRB-01 is a current proof gap” is superseded by #391.
- “Release Readiness Audit v1 is still pending/current” is superseded by #388.
- “The amount-focus defect is open” is superseded by #383.
- “18 PRs + 8 issues are unreconciled” is superseded by reconciliation through #387.
- “js-yaml 4.3.1 still needs delivery” is superseded by #386.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
