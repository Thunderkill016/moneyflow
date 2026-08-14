# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `5a2ef2d9f42c22138c97ac97b822997a95c28569` (#386 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Accepted historical checkpoints remain Provider Sync, P1 Secure, P2 Recover and P3 Prove. Repository Resets 1–2, A0 and Phases A–D are completed. Phase E is paused with all candidates owner-rejected; Phase F is not started.

UI Slice 1 (#370), Slice 2 (#381) and the amount-focus hotfix (#383) are merged. Open-work reconciliation is complete: current-main dispatcher hardening merged in #384 and closed out in #385; the `js-yaml` 4.3.1 security backport merged in #386; stale #380 and Dependabot #320 were closed superseded. There are no open PRs after this reconciliation.

Current sequence:

> Release Readiness Audit v1 → only audit-proven blocker fixes → controlled closed beta → owner PBT-AC15 decision.

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

The Current Work Board owns current execution. Old issue/PR bodies are provenance/candidate evidence, not authority.

The historical GitHub queue has been reconciled against current main. No open PR remains. Only two open issues remain intentionally decision-gated:

- #40 — Supabase leaked-password protection; provider plan/state + owner decision required.
- #174 — provider-side security controls; provider state + owner decision required.

The next authorized agent task is Release Readiness Audit v1. The audit must create current evidence, not reopen old feature requests merely because they existed historically.

## 4. Presentation and product-direction truth

- Fresh Blue remains shipped presentation.
- Slice 1 (#370), Slice 2 (#381) and focus hotfix #383 are completed input.
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
- browser/emulation evidence is not physical-device evidence;
- P3 physical-phone acceptance was owner-observed rather than a completed signed repository result file.

## 7. Configuration, security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions and execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection; `scripts/agent-policy.mjs` projects policy.
- Draft PR workflow success is not full verification evidence because heavy shards intentionally skip while draft.
- The readiness audit must distinguish repository evidence, provider read-back, production evidence, physical-device evidence and owner decision; one layer cannot silently prove another.
- Current provider checklist still requires explicit verification of public-beta Auth/security settings such as password policy, confirmation, CAPTCHA/rate limits/trusted callbacks and leaked-password protection where supported.
- #386 upgraded the resolved `js-yaml` dependency from 4.3.0 to 4.3.1 through a current-main security-maintenance delivery. Its final non-draft head passed full CI, CodeQL and secret-history gates.
- Historical checkout/runtime credential-hardening findings remain audit inputs; they are not permission to revive stale dependency/CI PRs.

## 8. Release Readiness Audit v1 inputs

The audit should reuse current/reconciled evidence and research only unresolved questions. At minimum inspect:

1. financial correctness and mixed-ledger authenticated truth, including transfer neutrality and deterministic VND totals;
2. recovery/data safety, including edit/delete recovery, archive/export/validation/restore and the hosted-restore limitation;
3. Auth and tenant isolation, including RLS/ownership and accepted recent-auth/provider limitations;
4. security/privacy, including provider settings, abuse controls, secret/code scanning, secure-development baseline and applicable Vietnam personal-data review flags;
5. usability/accessibility, including physical-phone evidence limits and WCAG 2.2-relevant interaction/focus/target/authentication checks;
6. deployment/operations, including exact-main deployment identity, environment contract, incident/recovery/support visibility and current production/provider read-back where permissions allow;
7. closed-beta support readiness: onboarding, correction/recovery, user-data ownership, support path, severity/stop-beta criteria and evidence capture.

Use only `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION` for release-gate conclusions. Unknown or unverified evidence must not be promoted to PASS.

## 9. True gaps now

1. Run Release Readiness Audit v1 and produce one canonical readiness matrix, blocker backlog and controlled closed-beta validation plan.
2. Fix only audit-proven release blockers as bounded tasks.
3. Resolve provider/security owner decisions that remain real (#40/#174 and any audit-created owner gate).
4. Run controlled real-user beta after readiness permits it.
5. Record PBT-AC15 only through explicit owner go/no-go and accepted limitations.

## 10. Next allowed action

Start Release Readiness Audit v1 on current main.

No new UI slice, Phase E restart, Phase F implementation, speculative feature work, provider write or production-data mutation is implied.

## 11. Superseded-status register

- “The amount-focus defect is open” is superseded by #383.
- “#379 is stale tooling paperwork” is superseded: its live defects were resolved by #384; lifecycle was closed by #385.
- “18 PRs + 8 issues are unreconciled” is superseded: reconciliation is complete and no open PR remains; #40/#174 are owner decisions.
- “js-yaml 4.3.1 still needs delivery” is superseded by #386 at `main@5a2ef2d9…`; #320 is closed superseded.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
