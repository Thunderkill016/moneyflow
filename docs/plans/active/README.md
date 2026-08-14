# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-14 23:37 ICT
**Current main baseline:** `2ffe63dc470ca84f4e782343238f2353a61ca89d` (#381 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — a known post-merge focus defect remains, open GitHub work still needs evidence-based triage, Release Readiness Audit v1 has not run, and PBT-AC15 is still an owner decision.

This is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** GitHub issues/PRs are dynamic evidence; this board owns the current execution checklist and routes deeper detail to the active packet or current-project memory.

## NOW

- [ ] **Fix double focus contour on Manual Capture amount field** — observed by the owner after merged #381: the focused amount control visibly paints two blue contours. **Done when:** one intentional accessible focus contour remains in expense/income (and transfer if the same owner applies), light/dark + 390×844 + 390×568 are proven, focused tests/provider checks pass, and a bounded hotfix PR exists. **Next actor:** agent.

## NEXT

- [ ] **Open-work reconciliation: 18 open PRs + 8 open issues at this reconciliation** — classify every item against current `main` as keep / completed / superseded / obsolete / owner decision; close only mechanically unambiguous stale work and never merge an old PR just to tidy GitHub. **Done when:** GitHub backlog and repo lifecycle agree. **Next actor:** agent.
- [ ] **Release Readiness Audit v1** — audit the whole current product for real-user readiness using `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`; include financial correctness, recovery, auth/tenant isolation, security/privacy, usability/accessibility, deployment/operations, support and closed-beta readiness. **Done when:** one canonical audit, blocker backlog and closed-beta validation plan exist. **Next actor:** agent.
- [ ] **Fix only release blockers found by the audit** — no speculative feature work or UI polish. **Done when:** each authorized blocker has its own bounded task, evidence and PR. **Next actor:** agent after audit.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after readiness gates allow it. **Done when:** real-user evidence exists for core jobs, correction/recovery, confidence in balances/history and support burden. **Next actor:** owner + agent.

## BLOCKED

- [ ] **Public-beta release** — blocked until the readiness audit is complete, unresolved P0/P1 blockers are zero or explicitly owner-accepted where policy permits, required provider/security decisions are resolved, and PBT-AC15 is recorded. **Next actor:** owner after evidence.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — keep as a real owner/provider decision until current provider state is re-audited; no provider write without explicit scoped approval. **Next actor:** owner.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting. **Next actor:** owner.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent may prepare evidence but cannot close this gate. **Next actor:** owner.

## TRIAGE

Do not infer these dispositions from age alone. Current main + merged history + provider truth outrank stale issue/PR bodies.

### Open issues to reconcile

- [ ] `#374` — Slice 2 task; merged delivery exists as #381, so verify and close as completed if no separate unfinished contract remains.
- [ ] `#376` — disposable dispatcher smoke; verify completion and close if its transport-only purpose is exhausted.
- [ ] `#378` — exact-head review of already-merged #377; verify review delivery and close if exhausted.
- [ ] `#379` — dispatcher hardening; no longer current product work. Classify against current tooling and #380 without reviving it.
- [ ] `#310` — historical failure-pattern audit; compare against later harness/reset work before keep/close decision.
- [ ] `#172` — historical product evaluation; decide whether Release Readiness Audit v1 supersedes its open role after preserving useful evidence.
- [ ] `#174` and `#40` — routed to **OWNER DECISION** above; do not close merely for hygiene.

### Open PRs to reconcile

- [ ] **Dispatcher/tooling:** `#380`.
- [ ] **Dependencies:** `#247`, `#248`, `#320` — compare requested versions with current package/workflow state before keep/close.
- [ ] **CI / agent / harness candidates:** `#304`, `#314`, `#315`, `#317`, `#331`, `#338`, `#345` — compare with later merged harness/tooling; old green CI is not merge authority.
- [ ] **Provider preflight evidence:** `#333` — compare against accepted P1 Secure/provider truth before disposition.
- [ ] **Old design / CSS / Atoryn candidates:** `#119`, `#170`, `#171`, `#292`, `#293`, `#294` — do not revive rejected or superseded directions; prove current-main equivalence before closing.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected. HOLD is not authorization.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence. HOLD is not authorization.

## RECENTLY DONE

- [x] **UI evolutionary refresh Slice 1** — merged #370; shell, Overview and Transactions accepted as completed input.
- [x] **UI evolutionary refresh Slice 2** — merged #381 at `main@2ffe63dc`; Manual Capture + Accounts shipped to main. The post-merge double-focus defect is tracked separately in **NOW** and does not reopen the whole slice.
- [x] **Phases A–D** — current-reality audit, product-experience research, product-experience architecture and Brand Strategy are completed records.
- [x] **P1 Secure / P2 Recover / P3 Prove** — accepted checkpoints with their named limitations preserved in current memory and completed packets.

## Active packet registry

Only packets genuinely owning current program execution belong here. Historical child packets are moved out of `active/`; their old contents remain evidence, not current authority.

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness sequence, trust gates and owner public-beta decision |

## Board rules

1. `NOW` means genuinely authorized/current work, not an old open issue.
2. A new substantive task must appear here before it is treated as current execution authority.
3. Completing or abandoning a task must update this board in the same lifecycle PR; do not leave merged work in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. `TRIAGE` is evidence gathering, not permission to merge, revive or delete work.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
