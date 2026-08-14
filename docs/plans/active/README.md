# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15
**Current main baseline:** `755956f4302df6482b439720c1645efe13673166` (#383 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — the amount-focus defect is fixed, open-work reconciliation is at its final two delivery items, Release Readiness Audit v1 has not run, and PBT-AC15 remains an owner decision.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **Finish open-work reconciliation.** Historical issue/PR candidates have been classified against current `main`; no stale head is being merged for hygiene. Two real implementation gaps remain before the reconciliation closes:
  1. **Dispatcher boundary #379** — fresh PR #384 replaces stale #380 and must pass final exact-head CI/CodeQL/secret-history + review before merge/closeout.
  2. **`js-yaml` security backport #320** — Dependabot rebased the 4.3.1 patch onto current main and code/build/unit pass, but MoneyFlow's knowledge policy correctly rejects bot PRs without their own PR-memory record. Deliver the same three-line lockfile patch through a fresh current-main PR after #384 lands; then close #320 as superseded.

**Done when:** #384 and the fresh js-yaml patch are safely merged/closed out, #379/#380/#320 have final dispositions, and GitHub + repo lifecycle agree. **Next actor:** agent.

## NEXT

- [ ] **Release Readiness Audit v1** — audit current product reality using `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`; cover financial correctness, recovery, auth/tenant isolation, security/privacy, usability/accessibility, deployment/operations, support and closed-beta readiness. Carry forward two fresh inputs from reconciliation: the checkout-v4/credential CI hardening finding and #345's mixed-ledger authenticated financial-truth scenario. **Done when:** one canonical audit, blocker backlog and closed-beta validation plan exist. **Next actor:** agent.
- [ ] **Fix only release blockers found by the audit** — no speculative feature work or visual polish. **Done when:** each authorized blocker has a bounded task, evidence and PR. **Next actor:** agent after audit.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after readiness gates allow it. **Done when:** real-user evidence exists for core jobs, correction/recovery, balance/history trust and support burden. **Next actor:** owner + agent.

## BLOCKED

- [ ] **Public-beta release** — blocked until the readiness audit is complete, unresolved P0/P1 blockers are zero or explicitly owner-accepted where policy permits, required provider/security decisions are resolved, and PBT-AC15 is recorded. **Next actor:** owner after evidence.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## TRIAGE — final open candidates

- [ ] `#379` / stale PR `#380` — current-main defect is being replaced by fresh PR #384; close only after #384 is accepted.
- [ ] Dependabot PR `#320` — patch is real and rebased, but the bot head cannot satisfy MoneyFlow's own per-PR memory contract. Recreate the exact lockfile delta on current main after #384 rather than weakening policy.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **Amount focus hotfix** — merged #383 at `main@755956f`; exact-head CI, CodeQL and secret-history passed, including browser smoke and cross-device UI audit. Expense/income/transfer share one intentional focus owner.
- [x] **Open issue reconciliation** — `#172` superseded by Release Readiness Audit v1; `#310/#374/#376/#378` closed completed after evidence review. `#40/#174` remain owner decisions; `#379` remains only because its defect was proven live.
- [x] **Historical PR reconciliation** — `#119/#170/#171/#247/#248/#292/#293/#294/#304/#314/#315/#317/#331/#333/#338/#345` closed as completed/superseded/stale candidates rather than merged from old heads. Useful current findings were preserved as fresh audit inputs.
- [x] **UI evolutionary refresh Slice 1 + Slice 2** — merged #370 and #381.
- [x] **Phases A–D; P1 Secure / P2 Recover / P3 Prove** — accepted completed records with named limitations preserved.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness sequence, trust gates and owner public-beta decision |
| `dispatcher-boundary-reconciliation.md` | active bounded remediation | local agent/Git/GitHub dispatcher safety only; no product/provider authority |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. `TRIAGE` permits evidence gathering, not blind merge/revival.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
