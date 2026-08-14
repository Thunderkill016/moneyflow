# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-14
**Current main baseline:** `2ffe63dc470ca84f4e782343238f2353a61ca89d` (#381 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` records only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP: a Vietnamese, manual-first personal income-and-expense ledger. The product is **not public-beta ready** yet.

Accepted historical checkpoints remain: Provider Sync, P1 Secure, P2 Recover and P3 Prove. Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed records. Phase E Creative Territories is paused with every candidate owner-rejected and no territory selected; rejected exploration is not current visual authority. Phase F is not started.

UI evolutionary refresh Slice 1 merged as #370. Slice 2 merged as #381 at the current main baseline and delivered Manual Capture + Accounts changes plus demo-ledger reconciliation. After merge, the owner identified one bounded presentation defect: the Manual Capture amount field can show two blue focus contours at once. That defect is a separate hotfix item; it does not authorize a new UI slice or reopen Phase E/F.

The owner-approved near-term sequence is now:

> known focus hotfix → open-work/repository hygiene reconciliation → Release Readiness Audit v1 → only real blocker fixes → controlled closed beta → owner PBT-AC15 decision.

The owner-facing checklist for that sequence is `docs/plans/active/README.md`.

## 2. Current runtime and trust boundaries

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and never income/expense.
- Destructive ledger actions use recoverable/soft-delete behavior where the current product contract requires it.
- Authenticated data remains server-owned; demo state remains browser-local.
- The complete versioned archive is at `/settings/backup`, separate from scoped/report export.
- Hosted export was accepted. Hosted restore was never executed and remains a named owner-accepted limitation; do not relabel deterministic/local restore proof as hosted restore proof.
- Provider configuration, production data and deployment writes require new explicit scoped owner approval.

## 3. Current execution and repository lifecycle truth

`docs/plans/active/README.md` is the owner-facing Current Work Board. GitHub issues/PRs are dynamic evidence; old open bodies do not automatically mean work is still authorized or unfinished.

At this reconciliation, GitHub still has 18 open PRs and 8 open issues. Several are obviously historical candidates, disposable smoke/review tasks, old design/CSS branches, dependency updates or tooling work, but they must be closed only after evidence-based classification against current main.

The active packet registry is being normalized to the parent `public-beta-trust.md` only. Slice 2's old child packet and dispatcher-v1 child packet are historical evidence and must not remain current execution authority.

## 4. Presentation and product-direction truth

- Fresh Blue remains the shipped color implementation.
- Slice 1 (#370) is completed input for shell, Overview and Transactions.
- Slice 2 (#381) is merged input for Manual Capture and Accounts.
- The amount-field double-focus-contour defect is the only explicitly known post-merge UI hotfix in the current sequence.
- No Slice 3 is authorized.
- Phase E remains paused; no territory is selected.
- Phase F and a broader Brand/Product Experience rebuild are not started.
- Browser evidence must not be mislabeled as physical-device evidence.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense and transfers; edit, soft delete/recovery |
| Accounts | balances, identity, register/history, create/edit/archive/restore and reconciliation paths |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Ownership | complete versioned archive/export/validation/restore contract; hosted restore limitation remains |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Slice 1 + Slice 2 merged; one known amount-focus visual defect pending |
| Public beta | not approved; Release Readiness Audit v1 and PBT-AC15 remain ahead |

Code, migrations and tests outrank this table on implementation detail.

## 6. Trust, recovery and physical-device evidence

PBT-AC12 physical core-ledger acceptance remains owner-observed evidence from the accepted P3 run. PBT-AC13's duration requirement was withdrawn by the owner and must not be reintroduced under a different streak/count. PBT-AC14 was accepted for the historical daily-loop checkpoint, with parked findings recorded in its completed evidence. PBT-AC15 remains open.

Named accepted limitations remain claim-specific:

- stale-AMR and real account-mismatch destructive/identity-risk provider probes were not executed;
- hosted restore was not executed against a live hosted account;
- browser/emulation evidence is not physical-device evidence.

These limitations are not permission to weaken current readiness evaluation.

## 7. Configuration and delivery truth

- `docs/configuration.md` owns environment-variable/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes and selected gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions, handoffs and execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection; `scripts/agent-policy.mjs` is the machine-readable policy projection.
- Human owner retains merge, provider-write, deployment and public-beta authority.

## 8. Reconciled issue status

Current GitHub state still needs a dedicated hygiene pass; this section records only high-confidence routing, not automatic closure authority.

- `#374` — Slice 2 implementation task; merged delivery exists as #381. Verify any remaining contract, then close as completed if exhausted.
- `#376` — disposable dispatcher smoke; verify its transport-only goal is exhausted before closure.
- `#378` — exact-head review of already-merged #377; verify delivery then close if exhausted.
- `#379` / PR `#380` — dispatcher hardening/tooling, no longer current product execution. Classify against current tooling without reviving the work by implication.
- `#310` — historical failure-pattern audit; compare against later harness/reset work before disposition.
- `#172` — historical product evaluation; preserve useful evidence, then decide whether Release Readiness Audit v1 supersedes its open role.
- `#174` and `#40` — possible real provider/security readiness work. Do not close for hygiene; current provider state and owner decisions are required.

## 9. Open pull-request memory

Open PRs are candidate evidence, never current truth. At this reconciliation 18 PRs remain open, including old dependency, CI/agent/harness, provider-preflight, dispatcher and design/CSS/Atoryn candidates.

Do not merge an old green PR just to clean the list. Each open PR must be compared with current main, later merged equivalents and current authority. The Current Work Board groups the triage queue; `docs/research/PR_MEMORY_LOG.md` locates named historical records when provenance is needed.

## 10. True gaps after this audit

1. Fix and prove the known double-focus-contour defect on the Manual Capture amount field.
2. Reconcile the 18 open PRs and 8 open issues against current main; close only mechanically unambiguous stale work.
3. Run Release Readiness Audit v1 across product truth, financial correctness, data safety/recovery, auth/isolation, security/privacy, usability/accessibility, deployment/operations and closed-beta support.
4. Fix only P0/P1/P2 readiness blockers authorized from that audit; do not create speculative feature work.
5. Resolve provider/security owner decisions that remain real after the audit.
6. Run a controlled real-user beta before the final public-beta decision.
7. Record PBT-AC15 only through explicit owner go/no-go and accepted limitations.

## 11. Next allowed action

The next bounded product change is the known amount-field focus hotfix. Repository hygiene and Release Readiness Audit v1 follow in that order. No new UI slice, Phase E restart, Phase F implementation, provider write or production mutation is implied.

## 12. Superseded-status register

- “P3 Prove is open” / “P4 Improve is next” are superseded; P3 is accepted and generic P4 is not an active workstream.
- “Phase E is the immediate next phase” is superseded; all candidates were rejected and Phase E is paused.
- “Slice 2 is active” is superseded by merged #381; only its separate post-merge focus defect remains open.
- “No UI slice is currently open” remains true for redesign scope: the focus hotfix is a bounded defect fix, not a new slice.
- “The seven-day self-use gate is required” is superseded; PBT-AC13 duration was withdrawn without replacement.
- Historical packets in `docs/plans/archived/` are provenance, not current execution authority or implied acceptance.
- `reports-no-comparison-or-trends` and `import-integrity-future-work` remain historical compatibility claim identifiers only.
