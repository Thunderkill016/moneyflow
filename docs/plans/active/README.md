# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-18
**Current main baseline:** `fec11958a573653ebb706d4c3307ace6c7d2d4ac` (PR #419 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — RRB-01 and RRB-07 are closed with current browser/runtime evidence. RRB-08 real-phone observation remains open after the Capture 4 fixes. Remaining P1 release gates still depend on owner/provider/legal/read-access. On 2026-08-18 the owner promoted a bounded simplification program: remove proven friction and duplicated surface before further feature/polish work. #426 Slice 1 is the one-at-a-time agent item; #403 is paused, not closed, with its merged attribution instrument preserved.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **#426 — daily-path simplification, Slice 1** — owner-promoted cleanup based on current product/code evidence, not a broad redesign. Remove the duplicate desktop capture primary while keeping the topbar CTA and mobile centered `Ghi`; remove the detailed secondary planning column from the default dashboard while keeping existing compact planning links and all dedicated planning routes; delete client code made genuinely dead by those removals; preserve financial semantics, the one-bounded-RPC private dashboard path, Auth/schema/RLS/provider boundaries and release evidence. Re-measure `/dashboard` script transfer with the canonical harness and make no LCP/TBT claim inside observed noise. **Done when:** one-primary-per-viewport and progressive-disclosure product laws are restored on the daily path, exact-head browser/cross-device/risk-selected gates and independent evaluation are green, and any performance claim matches measured evidence. **Next actor:** implementer.
- [ ] **RRB-08 — current physical-device proof** — issue #398. #399 owns the merged runbook. Owner-observed phone testing exposed and drove bounded fixes through #404/#408/#410/#412/#414. **Done when:** the merged/deployed Capture 4 build is re-tested on a real phone and the release-critical smoke records device/OS/browser/origin/mode, pass/fail and defects. Browser/emulation is not final physical-device evidence. **Next actor:** owner; agent work must not claim or close this gate.

## NEXT

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

- [ ] **#403 — canonical page-load / dashboard LCP optimization** — paused by the owner's 2026-08-18 simplification priority; **not closed**. PR #415 established the truthful measurement baseline and found no demonstrated cold-load improvement. PR #419 merged the dispatch-only two-arm FCP attribution instrument as `fec11958…`; its CI-hardware experiment remains valid future evidence. If #403 resumes, first run/record that attribution experiment; if the signal does not survive, continue against the already measured dashboard hydration/client-JS/main-thread bottleneck (~311.6 KB transferred script, 766–814 ms JS bootup, server response ~14–15 ms). Do not conflate #426 UX simplification with #403 acceptance.
- [ ] **#417 — draft-to-ready CI false-green race** — separate CI-integrity issue; not folded into product cleanup.
- [ ] **#418 — Dependabot alerts held by the PostCSS override** — separate dependency/security issue; do not change the deliberate pin without recovering its provenance and verifying the CSS pipeline.
- [ ] **Engineering literature → executable MoneyFlow guardrails** — remain held until release blockers clear or owner promotes it.
- [ ] **Phase E Creative Territories** — paused; no territory selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started.

## RECENTLY DONE

- [x] **PR #419 — #403 FCP attribution instrument** — merged as `fec11958…` from exact head `5dbe6fb8…`. Adds the dispatch-only same-runner two-arm Lighthouse + Playwright mechanism experiment, keeps routine CI sample cost unchanged, fails incomplete evidence and preserves financial/private/provider boundaries. It does **not** complete #403. Exact-head CodeQL required attempt 2 during a GitHub provider outage; the successful retry executed both Initialize CodeQL and Analyze.
- [x] **PR #416 — lifecycle closeout for #415** — merged as `5db583d6…`; kept #403 open and recorded the draft-to-ready CI race now tracked separately as #417.
- [x] **PR #415 — canonical load measurement harness (supporting slice of #403, NOT its completion)** — merged as `c9a21781…`. Delivers the median-of-3 production-build mobile Lighthouse harness for canonical `/` and `/dashboard`, a truthful `/dashboard` loading boundary and private-path guards. **#415 produced no demonstrated cold-load performance improvement**; its review established the several-hundred-millisecond LCP noise floor and named dashboard hydration/client JS as the remaining measured bottleneck.
- [x] **#413 / PR #414 — Capture 4 compact keyboard-first quick sheet** — kept #412 learned-preset and trusted financial mutation semantics while removing repeated instructional copy, compacting correction UI and keeping Save reachable under constrained height. Physical-phone acceptance remains RRB-08, not browser evidence.
- [x] **#411 / PR #412 — Capture 3.0 amount-only learned presets** — successful quick captures remember coherent `kind + account + category` pairs; merged as `30ad41a8…`.
- [x] **#409 / PR #410 — Capture 2.0 amount-first quick capture** — preserved trusted transaction mutation semantics and moved amount first; merged as `fd232194…`.
- [x] **#407 / PR #408 — unified mobile bottom navigation redesign** — replaced the rejected floating-FAB/tab hybrid with one five-slot dock; merged as `813cb172…`.
- [x] **#405 / PR #406 — first mobile `Ghi` spacing correction** — provenance only; superseded by #408.
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
| `426-daily-path-simplification.md` | active bounded simplification | remove duplicated daily-path presentation/client surface; no financial, RPC/cache, Auth, schema/RLS, provider or production change |
| `403-fcp-attribution.md` | paused measurement instrument | available for #403 when resumed; no application, financial, schema/RLS, Auth or provider change |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. Historical issues/PRs are provenance, not authority, once reconciled.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
