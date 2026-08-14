# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `5a2ef2d9f42c22138c97ac97b822997a95c28569` (#386 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP and is **not public-beta ready**.

Accepted historical checkpoints remain Provider Sync, P1 Secure, P2 Recover and P3 Prove. Repository Resets 1–2, A0 and Phases A–D are completed. Phase E is paused with all candidates owner-rejected; Phase F is not started.

UI Slice 1 (#370), Slice 2 (#381) and amount-focus hotfix #383 are merged. Open-work reconciliation is complete: current-main dispatcher hardening merged in #384 and closed out in #385; the `js-yaml` 4.3.1 security backport merged in #386; stale #380 and Dependabot #320 were closed superseded. There are no open PRs after this reconciliation.

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

The historical GitHub queue has been reconciled against current main. Release Readiness Audit v1 is the next authorized agent task. The audit must create current evidence and must not reopen old feature requests merely because they existed historically.

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
- Release Readiness Audit v1 should reuse current/reconciled evidence and research only unresolved questions. Its dimensions are financial correctness; recovery/data safety; Auth/tenant isolation; security/privacy; usability/accessibility; deployment/operations; and closed-beta support/readiness. Each conclusion must identify the actual evidence mode and use only `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`.

## 8. Reconciled issue status

Historical execution issues were reconciled against current main rather than treated as current authority.

Still intentionally open/decision-gated:

- #40 — Supabase leaked-password protection; provider plan/state + owner decision required.
- #174 — provider-side security controls; provider state + owner decision required.

These are not backlog-hygiene failures and must not be auto-closed merely to reach zero issues.

## 9. Open pull-request memory

There are **no open pull requests** after reconciliation.

- #384 delivered the live dispatcher hardening; #385 closed its lifecycle; stale #380 is closed superseded.
- #386 fresh-delivered the `js-yaml` 4.3.1 security patch from current main; Dependabot #320 is closed superseded.
- Historical stale candidates were closed after evidence review rather than merged from old heads.

A future open PR is candidate evidence until it passes its own current lifecycle and exact-head gates.

## 10. True gaps after this audit

Entering Release Readiness Audit v1, the remaining program gaps are:

1. produce one current readiness matrix across financial correctness, recovery/data safety, Auth/isolation, security/privacy, usability/accessibility, deployment/operations and closed-beta support;
2. preserve the mixed-ledger authenticated financial-truth scenario, hosted-restore limitation, provider-security decisions, physical-evidence limitations and CI/runtime hardening findings as audit inputs without pre-classifying them as blockers;
3. fix only audit-proven release blockers as bounded tasks;
4. resolve real provider/security owner decisions (#40/#174 and any audit-created owner gate);
5. run controlled real-user beta only after readiness permits it;
6. record PBT-AC15 only through explicit owner go/no-go and accepted limitations.

## 11. Next allowed action

Start Release Readiness Audit v1 on current main after this reconciliation closeout merges.

No new UI slice, Phase E restart, Phase F implementation, speculative feature work, provider write or production-data mutation is implied.

## 12. Superseded-status register

- “The amount-focus defect is open” is superseded by #383.
- “#379 is stale tooling paperwork” is superseded: its live defects were resolved by #384; lifecycle was closed by #385.
- “18 PRs + 8 issues are unreconciled” is superseded: reconciliation is complete and no open PR remains; #40/#174 are owner decisions.
- “js-yaml 4.3.1 still needs delivery” is superseded by #386 at `main@5a2ef2d9…`; #320 is closed superseded.
- “P3 Prove is open” / “P4 Improve is next” remain superseded.
- “Phase E is immediate next” remains superseded; all candidates were rejected.
- “Slice 2 is active” is superseded by #381.
- The seven-day self-use gate remains withdrawn without replacement.
