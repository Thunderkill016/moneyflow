# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `6459fdf7ed59119bf220993ff5c1637789323429` (#388 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Release Readiness Audit v1 merged in #388. Its canonical result is `docs/release/RELEASE_READINESS_AUDIT_V1.md`.

Current release decision:

- public beta: **BLOCKED**;
- controlled closed beta: **BLOCKED on P1 entry gates**;
- core finance arithmetic, transfer neutrality, RLS/tenant isolation and local archive/restore contracts have strong current repository/database evidence;
- remaining work is bounded proof/remediation plus provider/privacy/operations decisions and controlled-beta validation, not speculative feature expansion.

Current sequence:

> RRB-01 authenticated mixed-ledger proof → remaining P1 blocker decisions/read-backs → P2 proof/accepted-limitations at the proper boundary → controlled closed beta → owner PBT-AC15 decision.

The owner-facing checklist is `docs/plans/active/README.md`.

## 2. Current runtime and trust boundaries

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and never income/expense.
- Destructive ledger actions use recoverable/soft-delete behavior where the product contract requires it.
- Authenticated data remains server-owned; demo state remains browser-local.
- The complete versioned archive is at `/settings/backup`, separate from scoped/report export.
- Hosted export was accepted; hosted restore remains unexecuted and is RRB-02.
- Provider configuration, production data and deployment writes require explicit scoped owner approval.
- Evidence layers remain separate: repository/static, unit/domain, database, browser, provider read-back, production runtime, physical device and owner/legal decision cannot silently prove one another.

## 3. Current execution and repository lifecycle truth

The Current Work Board owns current execution. Old issue/PR bodies are provenance/candidate evidence, not authority.

Release Readiness Audit v1 is complete through #388. Its active packet is retired to `docs/plans/completed/release-readiness-audit-v1.md`.

The first authorized blocker task is **RRB-01**, an agent-owned Class 2 proof task. It must add current-main authenticated browser evidence for a deterministic mixed ledger containing income, expense and internal transfer. If that proof exposes an actual product defect, the defect becomes a bounded fix with its own evidence rather than being hidden inside the test.

Owner/provider/legal-gated blockers remain boundaries, not automatic execution authority.

## 4. Presentation and product-direction truth

- Fresh Blue remains shipped presentation.
- Slice 1 (#370), Slice 2 (#381) and focus hotfix #383 are completed input.
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
| Experience | responsive light/dark web UI; Slice 1 + Slice 2 + focus hotfix merged |
| Release proof | audit complete; RRB-01/04/05/06/09 P1 and RRB-02/03/07/08 P2 remain |
| Public beta | not approved; controlled beta and PBT-AC15 remain ahead |

Code, migrations and tests outrank this table on implementation detail.

## 6. Trust, recovery and physical-device evidence

PBT-AC12 physical core-ledger acceptance remains owner-observed historical evidence. PBT-AC13's duration requirement was withdrawn and must not be recreated. PBT-AC14 remains accepted historical daily-loop evidence. PBT-AC15 remains open.

Named current audit gaps/limitations:

- RRB-01: authenticated mixed-ledger rendered financial truth is not yet proven on current main;
- RRB-02: hosted restore remains unexecuted;
- RRB-03: stale-AMR and real account-mismatch destructive provider edges remain unexecuted;
- RRB-07: explicit WCAG 2.2 Accessible Authentication proof for current release-critical auth flows is missing;
- RRB-08: physical-device evidence predates the latest UI slices/hotfix.

## 7. Configuration, security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions and execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection; `scripts/agent-policy.mjs` projects policy.
- Draft PR workflow success is not full verification evidence because heavy shards intentionally skip while draft.
- #388 final head `04c3f60088dd495994ce1e42c97fc41d00adb54c` passed CI #2484, CodeQL #1559 and Secret history #1559 before expected-head squash merge as `6459fdf7…`.
- #388 also preserved a deterministic earlier CI #2481 failure caused by Markdown trailing whitespace; the failure was fixed rather than hidden by retry.
- RRB-04 remains the current provider/Auth/firewall read-back blocker and includes #40/#174 decisions; repository CI cannot prove provider dashboard/firewall state.
- RRB-05 requires an operator-controlled verified support/privacy contact; source currently publishes `support@moneyflow.app` while ownership/control is unproven.
- RRB-06 is an owner/legal review boundary under the current Vietnam personal-data regime; repository audit is not a legal certification.
- RRB-09 requires read-only production deployment/provider identity tied to the release candidate when access exists.

## 8. Reconciled issue status

Historical execution issues were reconciled against current main rather than treated as current authority.

Still intentionally open/decision-gated:

- #40 — Supabase leaked-password protection; provider plan/state + owner decision required.
- #174 — provider-side security controls; provider state + owner decision required.

Audit blocker IDs are owned by the Current Work Board and canonical release audit. They do not need duplicate GitHub issues merely to exist as authority.

## 9. Open pull-request memory

#388 is merged and no longer candidate evidence. Its final audit result is current release truth after lifecycle closeout.

Future blocker PRs remain candidate evidence until their own exact-head gates and lifecycle closeout complete. A green check on an older head never proves a newer head.

## 10. True gaps after this audit

The canonical audit froze nine bounded gaps:

P1:

1. RRB-01 — authenticated mixed-ledger rendered financial-truth proof;
2. RRB-04 — current provider/Auth/firewall read-back plus #40/#174 decisions;
3. RRB-05 — verified operator-controlled support/privacy contact;
4. RRB-06 — current Vietnam personal-data legal/privacy operational review;
5. RRB-09 — current production deployment/provider identity tied to the release candidate.

P2:

6. RRB-02 — hosted restore proof/accepted limitation;
7. RRB-03 — destructive recent-auth provider-edge proof/accepted limitation;
8. RRB-07 — WCAG 2.2 Accessible Authentication proof;
9. RRB-08 — current physical-device proof.

Controlled closed beta remains blocked until the P1 entry gates are satisfied and there is no unresolved P0. Public beta additionally requires controlled-beta evidence and explicit PBT-AC15.

## 11. Next allowed action

Execute **RRB-01** on current main as the first agent-owned P1 blocker.

Do not implement RRB-04/05/06/09 decisions by assumption. Provider/production writes, operator contact/domain choice, legal decisions, accepted limitations, beta launch and PBT-AC15 retain their explicit authority boundaries.

## 12. Superseded-status register

- “Release Readiness Audit v1 is still pending/current” is superseded by #388.
- “The amount-focus defect is open” is superseded by #383.
- “18 PRs + 8 issues are unreconciled” is superseded: reconciliation completed before the audit.
- “js-yaml 4.3.1 still needs delivery” is superseded by #386.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
