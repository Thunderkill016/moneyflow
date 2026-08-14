# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `91fdab2df7713aa5f31fd4eb9322cb67cbf5d205` (#384 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` records only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Accepted historical checkpoints remain Provider Sync, P1 Secure, P2 Recover and P3 Prove. Repository Resets 1–2, A0 and Phases A–D are completed. Phase E is paused with all candidates owner-rejected; Phase F is not started.

UI Slice 1 (#370), Slice 2 (#381) and the amount-focus hotfix (#383) are merged. The 2026-08-15 open-work reconciliation also delivered current-main dispatcher hardening in #384 after proving the four historical #379 findings were still live.

Current sequence:

> finish the js-yaml security backport → Release Readiness Audit v1 → only audit-proven blocker fixes → controlled closed beta → owner PBT-AC15 decision.

The owner-facing checklist is `docs/plans/active/README.md`.

## 2. Current runtime and trust boundaries

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and never income/expense.
- Destructive ledger actions use recoverable/soft-delete behavior where the product contract requires it.
- Authenticated data remains server-owned; demo state remains browser-local.
- The complete versioned archive is at `/settings/backup`, separate from scoped/report export.
- Hosted export was accepted; hosted restore remains a named unexecuted limitation.
- Provider configuration, production data and deployment writes require explicit scoped owner approval.

## 3. Current execution and repository lifecycle truth

The Current Work Board owns current execution. Old issue/PR bodies are candidate evidence, not authority.

The reconciliation closed stale historical issues/PRs after evidence review rather than merging old green heads. The only original PR still needing delivery disposition is Dependabot #320 (`js-yaml` 4.3.1). Its security patch is real and rebased, but MoneyFlow's mandatory PR-memory contract requires a fresh owner branch/PR rather than weakening policy for the bot.

PR #384 is merged and its active packet is being retired to completed history. Issue #379 and stale PR #380 can now be mechanically closed as superseded/completed by #384.

## 4. Presentation and product-direction truth

- Fresh Blue remains shipped presentation.
- Slice 1 (#370) and Slice 2 (#381) are completed input.
- #383 fixed the known double-focus contour without opening a new UI slice.
- No Slice 3 is authorized.
- Phase E remains paused; no territory is selected.
- Phase F / broader Brand-Product Experience implementation is not started.
- Browser/emulation evidence is not physical-device evidence.

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
| Public beta | not approved; readiness audit, blocker handling, controlled beta and PBT-AC15 remain ahead |

Code, migrations and tests outrank this table on implementation detail.

## 6. Trust, recovery and physical-device evidence

PBT-AC12 physical core-ledger acceptance remains owner-observed evidence. PBT-AC13's duration requirement was withdrawn and must not be recreated. PBT-AC14 remains accepted historical daily-loop evidence. PBT-AC15 remains open.

Named accepted limitations remain claim-specific:
- stale-AMR and real account-mismatch destructive/identity-risk provider probes were not executed;
- hosted restore was not executed against a live hosted account;
- browser/emulation evidence is not physical-device evidence.

## 7. Configuration and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions and execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection; `scripts/agent-policy.mjs` projects policy.
- Draft PR workflow success is not full verification evidence because heavy shards intentionally skip while draft.
- Current checkout v4 still emits GitHub's Node-20-deprecation warning and persists credentials by default; this is a fresh CI-hardening input for the readiness audit/future bounded task, not permission to revive stale #248/#304.

## 8. Reconciled issue status

Closed during reconciliation: #172, #310, #374, #376, #378.

Still intentionally open/decision-gated:
- #40 — Supabase leaked-password protection; provider/owner decision required.
- #174 — provider-side security controls; provider/owner decision required.

#379 was a real tooling-security defect, not stale paperwork. #384 resolved it on current main; issue closeout is now mechanical.

## 9. Open pull-request memory

Historical candidates closed instead of merged from stale heads: #119, #170, #171, #247, #248, #292, #293, #294, #304, #314, #315, #317, #331, #333, #338 and #345.

Stale #380 is superseded by merged #384 and can close mechanically.

#320 remains the one real security-dependency delivery: current lockfile uses `js-yaml 4.3.0`; 4.3.1 is the security backport. Dependabot's rebased head passed code/build/unit but failed MoneyFlow's per-PR knowledge-memory contract. Deliver the exact lockfile delta fresh on current main.

## 10. True gaps after this audit

1. Fresh-deliver `js-yaml` 4.3.1 and close #320.
2. Run Release Readiness Audit v1 across financial correctness, recovery/data safety, auth/isolation, security/privacy, usability/accessibility, deployment/operations and closed-beta support.
3. Carry forward checkout credential/runtime hardening and #345's mixed-ledger authenticated scenario as audit inputs; only implement them if current evidence classifies them as blockers/required proof.
4. Fix only audit-proven P0/P1/P2 readiness blockers.
5. Resolve provider/security owner decisions that remain real.
6. Run controlled real-user beta.
7. Record PBT-AC15 only through explicit owner go/no-go and accepted limitations.

## 11. Next allowed action

Deliver the fresh js-yaml security patch on current main. After its lifecycle closeout, open-work reconciliation is complete and Release Readiness Audit v1 becomes NOW.

No new UI slice, Phase E restart, Phase F implementation, provider write or production mutation is implied.

## 12. Superseded-status register

- “The amount-focus defect is open” is superseded by #383.
- “#379 is stale tooling paperwork” is superseded: its P1 defects were live and resolved by #384.
- “18 PRs + 8 issues are unreconciled” is superseded; only #320 delivery remains from that queue, while #40/#174 are owner decisions.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
