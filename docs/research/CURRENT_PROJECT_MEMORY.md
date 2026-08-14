# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-15
**Current main baseline:** `755956f4302df6482b439720c1645efe13673166` (#383 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` records only for named provenance needs.

## 1. Current decision

MoneyFlow is a released functional MVP: a Vietnamese, manual-first personal income-and-expense ledger. It is **not public-beta ready**.

Accepted historical checkpoints remain Provider Sync, P1 Secure, P2 Recover and P3 Prove. Repository Resets 1–2, A0 Historical UI / Design Failure Review and Phases A–D are completed records. Phase E Creative Territories is paused with every candidate owner-rejected and no territory selected; rejected exploration is not visual authority. Phase F is not started.

UI evolutionary refresh Slice 1 merged as #370 and Slice 2 as #381. The owner-observed post-#381 double-focus defect was fixed in #383: the shared transaction amount TextField now has one intentional outer focus owner, with Expense/Income/Transfer browser evidence and exact-head CI/CodeQL/secret-history success.

The current execution sequence is:

> finish open-work reconciliation → Release Readiness Audit v1 → only audit-proven blocker fixes → controlled closed beta → owner PBT-AC15 decision.

The owner-facing checklist is `docs/plans/active/README.md`.

## 2. Current runtime and trust boundaries

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and never income/expense.
- Destructive ledger actions use recoverable/soft-delete behavior where the current product contract requires it.
- Authenticated data remains server-owned; demo state remains browser-local.
- The complete versioned archive is at `/settings/backup`, separate from scoped/report export.
- Hosted export was accepted. Hosted restore was never executed and remains a named owner-accepted limitation; deterministic/local restore proof is not hosted-restore proof.
- Provider configuration, production data and deployment writes require explicit scoped owner approval.

## 3. Current execution and repository lifecycle truth

`docs/plans/active/README.md` is the Current Work Board. Old open issues/PRs are candidate evidence, not current authority.

The 2026-08-15 reconciliation closed these issues after evidence review:

- `#374` — Slice 2 contract exhausted by merged #381 plus separate #383 hotfix;
- `#376` — disposable dispatcher transport smoke completed during #377;
- `#378` — exact-head #377 review completed and its four P1 findings moved into #379;
- `#310` — historical failure register outcome exists on current main with prevention/guardrail evidence;
- `#172` — historical whole-product evaluation superseded as current authority by Release Readiness Audit v1.

Issues still open intentionally:

- `#40` — Supabase leaked-password protection, OWNER DECISION/provider truth required;
- `#174` — provider-side security controls, OWNER DECISION/provider truth required;
- `#379` — dispatcher hardening remains real because the four reviewed P1 defects were still present on current main when reconciliation began.

A fresh current-main remediation for #379 is PR #384 with active packet `docs/plans/active/dispatcher-boundary-reconciliation.md`. Stale PR #380 is not merge authority.

## 4. Reconciled pull-request status

Historical candidates closed during this pass instead of being merged from stale heads:

- design/CSS/Atoryn: `#119`, `#170`, `#171`, `#292`, `#293`, `#294`;
- agent/CI process candidates: `#314`, `#315`, `#317`, `#331`, `#338`;
- provider preflight: `#333`, superseded by later accepted P1 Secure evidence.

Original open candidates still requiring disposition at this checkpoint:

- `#247` — `@types/node` 20 → 25; current package/runtime support must be compared before any major type upgrade;
- `#248` — stale grouped GitHub Actions update; current workflow already absorbed some later action versions, but checkout/runtime hardening remains a fresh current-main concern;
- `#304` — stale CI audit/hardening branch; several ideas may still be relevant but require fresh implementation against current workflow;
- `#320` — real current security dependency work: current lockfile still contains `js-yaml 4.3.0`; upstream 4.3.1 is a security backport and needs a fresh/current-head delivery rather than stale merge;
- `#345` — authenticated financial-truth harness is absent from current main; preserve it as a readiness-evidence candidate and decide through Release Readiness Audit v1 rather than merging its stale head;
- `#380` — stale dispatcher hardening prototype; if #384 is accepted, close #380 as superseded by the fresh current-main delivery.

PR #384 is the only newly started implementation created by this reconciliation.

## 5. Presentation and product-direction truth

- Fresh Blue remains the shipped color implementation.
- Slice 1 (#370) owns accepted shell/Overview/Transactions refinement.
- Slice 2 (#381) owns accepted Manual Capture/Accounts refinement.
- #383 fixes the known double-focus contour without opening a new UI slice.
- No Slice 3 is authorized.
- Phase E remains paused; no territory is selected.
- Phase F and a broader Brand/Product Experience rebuild are not started.
- Browser/emulation evidence is not physical-device evidence.

## 6. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense and transfers; edit, soft delete/recovery |
| Accounts | balances, identity, register/history, create/edit/archive/restore and reconciliation paths |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Ownership | complete versioned archive/export/validation/restore contract; hosted restore limitation remains |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Slice 1 + Slice 2 + #383 focus hotfix merged |
| Public beta | not approved; readiness audit, blocker handling, controlled beta and PBT-AC15 remain ahead |

Code, migrations and tests outrank this table on implementation detail.

## 7. Trust, recovery and physical-device evidence

PBT-AC12 physical core-ledger acceptance remains owner-observed evidence from the accepted P3 run. PBT-AC13's duration requirement was withdrawn by the owner and must not be reintroduced under a different streak/count. PBT-AC14 was accepted for its historical daily-loop checkpoint. PBT-AC15 remains open.

Named accepted limitations remain claim-specific:

- stale-AMR and real account-mismatch destructive/identity-risk provider probes were not executed;
- hosted restore was not executed against a live hosted account;
- browser/emulation evidence is not physical-device evidence.

These limitations are not permission to weaken the current readiness evaluation.

## 8. Configuration and delivery truth

- `docs/configuration.md` owns environment-variable/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes and selected gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions and execution-state semantics.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection; `scripts/agent-policy.mjs` is the machine-readable policy projection.
- Current PR CI deliberately skips heavy verification while a PR is draft; a draft workflow marked success is not full verification evidence.
- During #384, current `actions/checkout` v4 emitted GitHub's Node-20-deprecation warning while runners forced it onto Node 24, and checkout persisted credentials by default. This is a fresh CI-hardening observation to reconcile with stale #248/#304; it does not authorize merging either old branch.

## 9. Dispatcher boundary finding

Current-main inspection proved #379 was not stale paperwork: the merged #377 dispatcher still had all four reviewed P1 defects.

PR #384 freshens the remediation against current main:

- stable body-marker identity;
- Markdown-aware unambiguous command discovery;
- exact-main revalidation before each worktree;
- guard-first child environment with GitHub token variables removed;
- conservative Git/GitHub operation allowlists;
- alias/repo-sync/GraphQL escape regressions;
- dispatcher safety suites included in `test:ci-policy`.

The local command guard is defense in depth, not an OS sandbox. A deliberately executed absolute binary path can bypass the `PATH` wrapper and remains a named residual limitation. Codex sandboxing, repository protection and owner credential controls remain independent boundaries.

## 10. True gaps after this reconciliation

1. Complete and safely deliver #384, then close #379/#380 if superseded.
2. Disposition the remaining dependency/CI/readiness candidates (#247/#248/#304/#320/#345) using current-main evidence; fresh-deliver real gaps rather than merging stale branches.
3. Run Release Readiness Audit v1 across product truth, financial correctness, recovery/data safety, auth/isolation, security/privacy, usability/accessibility, deployment/operations and closed-beta support.
4. Fix only audit-proven P0/P1/P2 readiness blockers under bounded tasks.
5. Resolve provider/security owner decisions that remain real after the audit.
6. Run a controlled real-user beta.
7. Record PBT-AC15 only through explicit owner go/no-go and accepted limitations.

## 11. Next allowed action

Finish exact-head evaluation of PR #384. Open-work reconciliation remains the current program task until every remaining candidate has a current disposition. Release Readiness Audit v1 starts only after repository/lifecycle authority is clean.

No new UI slice, Phase E restart, Phase F implementation, provider write or production mutation is implied.

## 12. Superseded-status register

- “The amount-focus defect is still open” is superseded by merged #383.
- “18 PRs and 8 issues are still unreconciled” is superseded by the evidence-based closures above; only the explicitly listed candidates remain.
- “#379 is just stale tooling paperwork” is superseded: current-main inspection proved its four P1 defects were still live; #384 is the fresh remediation candidate.
- “P3 Prove is open” / “P4 Improve is next” remain superseded; P3 is accepted and generic P4 is not active.
- “Phase E is immediate next” remains superseded; all candidates were rejected and Phase E is paused.
- “Slice 2 is active” is superseded by #381; #383 is a separate completed hotfix.
- The seven-day self-use gate remains withdrawn without replacement.
- Historical archived packets are provenance, not current execution authority.
