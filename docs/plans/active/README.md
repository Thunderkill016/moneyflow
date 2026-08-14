# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15 02:46 ICT
**Current main baseline:** `755956f4302df6482b439720c1645efe13673166` (#383 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — the amount-focus defect is fixed, open-work reconciliation is still finishing, Release Readiness Audit v1 has not run, and PBT-AC15 remains an owner decision.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **Finish open-work reconciliation on current main.** The historical issue queue has been reduced to `#40`, `#174` and `#379`; old UI/design/provider/agent candidates were closed only after evidence-based classification. Six PRs remain at this checkpoint: dependencies `#247/#248/#320`, CI audit candidate `#304`, financial-truth harness `#345`, and dispatcher hardening `#380`. **Current bounded remediation:** `dispatcher-boundary-reconciliation.md` resolves the four still-live P1 dispatcher defects on a fresh branch rather than merging stale #380 wholesale. **Done when:** remaining PRs are classified, #379/#380 are resolved safely, and GitHub + repo lifecycle agree. **Next actor:** agent.

## NEXT

- [ ] **Release Readiness Audit v1** — audit current product reality using `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`; cover financial correctness, recovery, auth/tenant isolation, security/privacy, usability/accessibility, deployment/operations, support and closed-beta readiness. **Done when:** one canonical audit, blocker backlog and closed-beta validation plan exist. **Next actor:** agent.
- [ ] **Fix only release blockers found by the audit** — no speculative feature work or visual polish. **Done when:** each authorized blocker has a bounded task, evidence and PR. **Next actor:** agent after audit.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after readiness gates allow it. **Done when:** real-user evidence exists for core jobs, correction/recovery, balance/history trust and support burden. **Next actor:** owner + agent.

## BLOCKED

- [ ] **Public-beta release** — blocked until the readiness audit is complete, unresolved P0/P1 blockers are zero or explicitly owner-accepted where policy permits, required provider/security decisions are resolved, and PBT-AC15 is recorded. **Next actor:** owner after evidence.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## TRIAGE — remaining open work

- [ ] `#379` / PR `#380` — four P1 defects still reproduce in the merged local dispatcher. Do not merge stale #380; fresh current-main remediation is active in `dispatcher-boundary-reconciliation.md`.
- [ ] `#247` — `@types/node` 20 → 25; compare with current Node/runtime support before disposition.
- [ ] `#248` — mixed GitHub Actions update; current main already absorbed some v7 updates but checkout/CodeQL need current-version review, so do not merge the stale grouped branch.
- [ ] `#320` — `js-yaml` security patch; verify the current lockfile/advisory before disposition.
- [ ] `#304` — CI hardening/audit contains still-relevant ideas but is stale against current workflow; classify as fresh-replan vs obsolete, never direct merge.
- [ ] `#345` — authenticated financial-truth harness is not on current main; decide whether to preserve as fresh readiness evidence or recreate from the audit.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **Amount focus hotfix** — merged #383 at `main@755956f`; exact-head CI, CodeQL and secret-history passed, including browser smoke and cross-device UI audit. Expense/income/transfer share one intentional focus owner.
- [x] **Open issue reconciliation:** `#172` superseded by Release Readiness Audit v1; `#310/#374/#376/#378` closed completed after evidence review. `#40/#174` remain owner decisions.
- [x] **Historical PR reconciliation:** `#119/#170/#171/#292/#293/#294/#314/#315/#317/#331/#333/#338` closed as completed/superseded/obsolete candidates rather than merged from stale heads.
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
