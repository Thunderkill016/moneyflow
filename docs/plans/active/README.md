# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15
**Current main baseline:** `91fdab2df7713aa5f31fd4eb9322cb67cbf5d205` (#384 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — open-work reconciliation has one final security-dependency delivery, Release Readiness Audit v1 has not run, and PBT-AC15 remains an owner decision.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **Finish open-work reconciliation with the `js-yaml` 4.3.1 security backport.** Dependabot #320 proved the three-line lockfile patch is current and rebased, but its bot head cannot satisfy MoneyFlow's mandatory per-PR memory contract. Recreate that exact delta on `main@91fdab2d`, add truthful PR memory, require exact-head CI/CodeQL/secret-history, merge only if clean, then close #320 as superseded. **Next actor:** agent.

## NEXT

- [ ] **Release Readiness Audit v1** — audit current product reality using `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`; cover financial correctness, recovery, auth/tenant isolation, security/privacy, usability/accessibility, deployment/operations, support and closed-beta readiness. Carry forward current evidence from reconciliation: checkout-v4/credential CI hardening, #345's mixed-ledger authenticated financial-truth scenario, current Supabase production checklist/security posture, WCAG 2.2, OWASP ASVS 5.0, NIST SSDF 1.1 and current Vietnam personal-data law as applicable review inputs. **Done when:** one canonical audit, blocker backlog and closed-beta validation plan exist. **Next actor:** agent.
- [ ] **Fix only release blockers found by the audit** — no speculative feature work or visual polish. **Done when:** each authorized blocker has a bounded task, evidence and PR. **Next actor:** agent after audit.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after readiness gates allow it. **Done when:** real-user evidence exists for core jobs, correction/recovery, balance/history trust and support burden. **Next actor:** owner + agent.

## BLOCKED

- [ ] **Public-beta release** — blocked until the readiness audit is complete, unresolved P0/P1 blockers are zero or explicitly owner-accepted where policy permits, required provider/security decisions are resolved, and PBT-AC15 is recorded. **Next actor:** owner after evidence.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## TRIAGE — final historical candidate

- [ ] Dependabot PR `#320` — real security patch, but stale as lifecycle authority after #384 moved main. Replace with the fresh current-main delivery in NOW; do not weaken repository policy for a bot PR.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **Dispatcher boundary reconciliation** — merged #384 at `main@91fdab2d`. The fresh delivery replaced stale #380; fixed command replay/Markdown/TOCTOU boundaries, constrained Git/GitHub delivery operations, wired dispatcher safety tests into provider CI and fixed a merge-blocking CodeQL command-injection finding. Final head `97f6cb17…`: CI #2456 PASS, policy 148/148, browser + authenticated ownership PASS, CodeQL #1534 PASS with **0 new alerts**, Secret history #1534 PASS; squash merge succeeded through the active ruleset.
- [x] **Amount focus hotfix** — merged #383 at `main@755956f`; exact-head CI, CodeQL and secret-history passed, including browser smoke and cross-device UI audit.
- [x] **Open issue reconciliation** — `#172` superseded by Release Readiness Audit v1; `#310/#374/#376/#378` closed completed after evidence review. `#40/#174` remain owner decisions. #379's live defects were resolved by #384 and are pending mechanical issue closeout.
- [x] **Historical PR reconciliation** — `#119/#170/#171/#247/#248/#292/#293/#294/#304/#314/#315/#317/#331/#333/#338/#345` closed as completed/superseded/stale candidates rather than merged from old heads. Stale #380 is superseded by #384 and pending mechanical closeout.
- [x] **UI evolutionary refresh Slice 1 + Slice 2** — merged #370 and #381.
- [x] **Phases A–D; P1 Secure / P2 Recover / P3 Prove** — accepted completed records with named limitations preserved.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness sequence, trust gates and owner public-beta decision |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. `TRIAGE` permits evidence gathering, not blind merge/revival.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
