# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-16
**Current main baseline:** `30ad41a8cb81c9161af2304a5cef596c80f16dcf` (#412 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — RRB-01 and RRB-07 are closed with current browser/runtime evidence. RRB-08 real-phone observation has exposed bounded mobile UX findings. #404 fixed keyboard-pressure geometry, #408 replaced the protruding mobile-center-action architecture, #410 shipped amount-first capture, and #412 shipped learned amount-only presets. Direct owner screenshots of the merged Capture 3 flow now authorize #413 as a presentation-only follow-up: make the real-phone sheet compact, keyboard-first and visually honest about the already-fast interaction path. RRB-08 still requires owner physical-device re-test/closeout after this bounded presentation change. Remaining P1 release gates still depend on owner/provider/legal/read-access.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **#413 — Capture 4 compact keyboard-first quick sheet** — owner-authorized from direct real-phone screenshots after #412. Preserve the #412 learned-preset model and all existing transaction/idempotency/transfer boundaries; redesign only the high-frequency presentation so `open → amount → Save` also *looks* like the primary path. Remove repeated instructional copy, compact the type selector, make selected category/account one lightweight row, surface at most two one-tap category alternatives plus an explicit more action, collapse optional date/note treatment, and remove redundant modal-footer Cancel while retaining accessible dismissal. Use design tokens/shared primitives; no CSS `!important` or magic-number test patches. Active packet: `capture-4-compact-sheet.md`. **Done when:** exact-head static/build/unit/browser/UI/e2e gates are green, 320/360/390 + constrained-height evidence shows no clipped category rail and Save remains reachable with keyboard pressure, and the merged build is handed back for real-phone acceptance. **Next actor:** implementer.
- [ ] **RRB-08 — current physical-device proof** — issue #398. #399 owns the merged runbook. Owner-observed phone testing has already exposed and driven bounded fixes through #404/#408/#410/#412; #413 is the current final visual/interaction correction from direct Capture 3 screenshots. **Done when:** after #413, a real phone repeats the release-critical smoke and records device/OS/browser/origin/mode, pass/fail and defects. Browser/emulation is not final physical-device evidence. **Next actor:** owner after #413 is merged/deployed.

## NEXT

- [ ] **#403 — canonical page-load / dashboard LCP optimization** — authorized but held behind the one-at-a-time queue. Promote only after #413 reaches reviewed PR/owner handoff, merges or is explicitly stopped. Measure `/` and `/dashboard` before/after; do not change private financial caching semantics.
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

- [x] **#411 / PR #412 — Capture 3.0 amount-only learned presets** — successful quick captures now remember coherent `kind + account + category` pairs, known category/account defaults are visible, category correction is one tap, and first-time capture no longer guesses an arbitrary taxonomy item. Exact-head CI #2584, CodeQL #1652, Secret history #1652, Browser smoke, Cross-device UI audit and `e2e` all passed before merge as `30ad41a8…`. Direct owner phone screenshots then showed the logic is fast but the sheet still looks too much like a form; #413 supersedes presentation only.
- [x] **#409 / PR #410 — Capture 2.0 amount-first quick capture** — preserved trusted transaction mutation semantics, moved amount first, compacted account/category confirmation, unified transfer handoff and added direct/PWA quick entry. Merged as `fd232194…`; superseded in presentation by #412/#413.
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
| `capture-4-compact-sheet.md` | active Class 2 implementation | Capture presentation/responsive behavior only; #412 learned presets and financial semantics are preserved |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. Historical issues/PRs are provenance, not authority, once reconciled.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
