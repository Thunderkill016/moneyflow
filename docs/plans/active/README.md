# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-16
**Current main baseline:** `fd23219400d41a533f6cad0f517585f9ae0b7260` (#410 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — RRB-01 and RRB-07 are closed with current browser/runtime evidence. RRB-08 real-phone observation exposed bounded mobile findings; #404 fixed keyboard-pressure geometry, #408 replaced the rejected protruding mobile-center-action architecture, and #410 shipped the first amount-first capture pass. Direct owner feedback after #410 says capture still feels like form work because category/note handling is not fast enough, so #411 Capture 3.0 is the authorized current redesign toward an amount-only familiar path with deterministic learned presets and one-tap category correction. RRB-08 still requires owner physical-device re-test/closeout after the current capture change. Remaining P1 release gates still depend on owner/provider/legal/read-access.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **#411 — Capture 3.0 amount-only fast path with learned quick presets** — preserve `AddTransactionDialog` mutation/idempotency/financial boundaries while learning successful `kind + account + category` pairs as one deterministic browser-local preset, showing the selected pair without disclosure, surfacing recent category choices as one-tap first-viewport controls, and keeping full account/category plus note/date/keep-open secondary. Note stays optional. No AI, schema/provider change, auto-save or financial guessing. Active packet: `capture-3-instant.md`. **Done when:** exact-head static/build/unit/browser/UI gates are green, constrained-phone browser evidence proves the familiar path reaches Save with defaults confirmed and secondary detail closed, and the merged build is handed back for owner real-phone acceptance. **Next actor:** implementer.
- [ ] **RRB-08 — current physical-device proof** — issue #398. #399 owns the merged runbook. Owner-observed phone testing exposed keyboard, bottom-nav and capture findings; #404/#408/#410 are merged and #411 owns the current bounded capture-speed correction. **Done when:** after #411, a real phone repeats the release-critical smoke and records device/OS/browser/origin/mode, pass/fail and defects. Browser/emulation is not final physical-device evidence. **Next actor:** owner after #411 is merged/deployed.

## NEXT

- [ ] **#403 — canonical page-load / dashboard LCP optimization** — authorized but held behind the one-at-a-time queue. Promote only after #411 reaches reviewed PR/owner handoff, merges or is explicitly stopped. Measure `/` and `/dashboard` before/after; do not change private financial caching semantics.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — disposable/authorized hosted target or explicit owner limitation decision required.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after P1 entry gates clear and no unresolved P0 exists.

## BLOCKED

- [ ] **RRB-05 — verified support/privacy contact** — `support@moneyflow.app` is published but operator control is unproven.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 owner decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — current Vercel/Supabase production identity is not exposed by repository tooling.
- [ ] **Controlled closed beta** — blocked on RRB-04/05/06/09 and any future P0.
- [ ] **Public-beta release** — blocked until blocker dispositions, controlled-beta evidence, provider/security decisions and PBT-AC15 complete.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — verify provider state before any owner-authorized change.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing.
- [ ] **RRB-05 operator contact/domain choice** — prove control or select an owner-controlled replacement.
- [ ] **RRB-06 legal/privacy decision** — competent review determines obligations/remediation.
- [ ] **RRB-02 / RRB-03 limitation decisions** — explicit owner acceptance required if proof will not be executed.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## HOLD

- [ ] **Engineering literature → executable MoneyFlow guardrails** — remain held until release blockers clear or owner promotes it.
- [ ] **Phase E Creative Territories** — paused; no territory selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started.

## RECENTLY DONE

- [x] **#409 / PR #410 — Capture 2.0 amount-first quick capture** — preserved trusted transaction mutation semantics, moved amount first, compacted account/category confirmation, unified transfer handoff and added direct/PWA quick entry. Exact-head CI #2573, CodeQL #1635, Secret history #1635, browser smoke, cross-device UI audit and e2e aggregation passed before merge as `fd232194…`. Direct owner phone review then showed the common path still felt too form-like; #411 supersedes further local Capture 2 presentation work.
- [x] **#407 / PR #408 — unified mobile bottom navigation redesign** — replaced the rejected floating-FAB/tab hybrid with one five-slot dock; merged as `813cb172…` after green CI/browser/UI/e2e evidence.
- [x] **#405 / PR #406 — first mobile `Ghi` spacing correction** — provenance only; superseded by #408 after owner phone review rejected the protruding architecture.
- [x] **#401 / PR #404 — compact mobile transaction capture implementation** — reduced keyboard viewport pressure; physical-phone retest remains part of RRB-08.
- [x] **RRB-08 repository-side preparation** — #398/#399 runbook merged; physical-device verdict still pending.
- [x] **RRB-07 WCAG 2.2 Accessible Authentication proof** — #393/#394 merged with browser evidence and shared password-field semantic repair.
- [x] **RRB-01 authenticated mixed-ledger rendered financial truth** — #390/#391 merged with coherent two-account browser/runtime evidence and transfer neutrality.
- [x] **Release Readiness Audit v1** — #388 merged; canonical blocker matrix recorded.
- [x] **Open-work reconciliation** — complete through #387; #40/#174 remain intentional owner/provider decisions.
- [x] **`js-yaml` 4.3.1 security backport** — #386 merged.
- [x] **Dispatcher boundary reconciliation** — #384/#385 completed.
- [x] **Amount focus hotfix** — #383 merged.
- [x] **UI evolutionary refresh Slice 1 + Slice 2** — #370 and #381 merged.
- [x] **Phases A–D; P1 Secure / P2 Recover / P3 Prove** — accepted completed records with named limitations preserved.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness blocker sequence, controlled-beta gates and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active bounded validation | real-phone smoke only; no provider/deployment/production mutation |
| `capture-3-instant.md` | active Class 2 implementation | quick-capture presentation + browser-local preference learning only; no financial/provider/schema rewrite |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. Historical issues/PRs are provenance, not authority, once reconciled.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
