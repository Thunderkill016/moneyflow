# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-25
**Current main baseline:** `ac86d273876414c76fc050b11d3904dddfbb93b6` (PR #453 merged)
**Post-merge projection:** PR #455
**Release readiness:** **NOT PUBLIC-BETA READY**. RRB-08 current physical-phone proof remains open; RRB-04/05/06/09 remain owner/provider/legal/read-access dependent. Product work never substitutes for those evidence lanes.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies. Open PRs and unmerged changes remain candidate evidence until merge.

## NOW

- [ ] **RRB-08 — current physical-device proof** — issue #398 / merged runbook #399. Completion still requires the owner to re-test the selected deployed release candidate on a real phone and record device/OS/browser/origin/mode plus pass/fail/defects. Browser/emulation cannot close it. **Next actor:** owner.

PR #455 is in same-PR completion projection for #454. Its packet has moved to `docs/plans/completed/2026-08-25-454-share-target-rule-application.md`; this branch may only resolve #454 acceptance defects/evaluation/verification. Do not promote another #432 child until the exact matching squash merge activates this projection and fresh-main authority resolution runs.

## NEXT

- [ ] **#432 P2 — Low-Maintenance Ingestion** — after #454, select the next bounded evidence-backed improvement across real Vietnamese file/share sources, normalization or exception-first review; reduce interventions/100 transactions without reducing match precision. Do not pre-promote another child while #454 is open.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — disposable/authorized hosted target or owner limitation decision required.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-05 — verified support/privacy contact** — `support@moneyflow.app` is published but operator control is unproven.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — blocked by the release-readiness contract; #432 product work does not weaken it.

## OWNER DECISION

- [ ] **PR #431 — conflicting pre-#432 product-direction candidate** — reconcile/close/replace against merged #432 authority before merge.
- [ ] **#426 — simplification program disposition** — preserve evidence-backed friction reductions, but do not restore the corrected false navigation premise or let it compete with #432 as master direction.
- [ ] **#403 — performance disposition** — remains open but no longer the default agent item; resume only if deliberately promoted after higher-value product work.
- [ ] **#174 / #40 provider security decisions** — verify provider state before change/closure.
- [ ] **RRB-05 contact, RRB-06 legal, RRB-02/RRB-03 limitation decisions, PBT-AC15 public-beta go/no-go** — owner boundaries remain explicit.

## HOLD

- [ ] **#403 implementation** — measured, open, not the current product slice.
- [ ] **#426 further implementation** — held pending reconciliation with #432.
- [ ] **Provider integration / native mobile / Wealth / Together / AI mutation** — horizon only; each requires dependency evidence and a bounded researched specification.
- [ ] **Phase E Creative Territories / Phase F broad redesign** — parked; not current authority.

## CURRENT PR PROJECTION / RECENTLY DONE

- [ ] **#454 / PR #455 — deterministic PWA Share candidate rules** — ready-for-review completion candidate. Explicit rules normalize only matching future Share candidates through an atomic server validation path; every candidate remains pending, with no automatic approval, ledger write, raw-source rewrite, provider/native/AI expansion. Exact code head `26c281e8` passed all selected provider gates; owner merge remains pending.
- [x] **#452 / PR #453 — confirmed Inbox rule capture** — merged as `ac86d273876414c76fc050b11d3904dddfbb93b6`. Explicit non-transfer review confirmation creates only a future candidate-stage rule; no automatic approval, ledger write, source rewrite, backfill, migration or provider/native/AI expansion.
- [x] **#450 / PR #451 — PWA Share Target atomic source** — merged as `4d80fbe915155061fc3152740bb65c9cfa5c09ba` after exact-head Class 3 checks. Authenticated `/api/share-target` → `/capture/share` text/CSV persistence creates only pending Inbox batches/candidates; demo stays browser-local with no ledger write or automatic approval.
- [x] **#448 / PR #449 — reviewed source lifecycle → clearing** — merged as `9e709a2116a560da673539a3ff3994928b22262b`. Reviewed exact `posted` evidence may advance one eligible account leg `pending → cleared`; source state never establishes `reconciled`, overwrites ledger facts, deletes facts or demotes user/statement truth.
- [x] **#446 / PR #447 — event-sourced capability harness + same-PR lifecycle convergence** — merged as `eb8861c71dbc5b8173e7e48fff1293470a639816`.
- [x] **#442 / PR #445 — explicit source lineage + lifecycle evidence** — merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0`; exact lineage only, no fuzzy replacement or source-driven ledger overwrite.
- [x] **#443 / PR #444 — fail-closed plan authority resolution** — merged as `99257178ff416e5b1c875f62aea05035824ca9a5`.
- [x] **#440 / PR #441** — changed same-ID source observations can be reviewed without overwriting ledger/reconciliation/canonical provenance.
- [x] **#438 / PR #439** — deleted exact-source reimport/restore precedence is explicit and replay-safe.
- [x] **#436 / PR #437** — later non-manual source evidence can attach to one reviewed existing unprovenanced transaction without mutating its ledger facts.
- [x] **#434 / PR #435** — Direct CSV persists provenance and commits selected rows atomically.
- [x] **#432 P0 / PR #433** — acquisition-first long-term direction became master authority.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `432-vietnam-long-term-product-strategy.md` | master product program | sequencing, invariants, metrics and phase gates |
| `public-beta-trust.md` | release parent program | release-readiness blockers and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | real-phone smoke only; no provider/deployment/production mutation |
| `403-fcp-attribution.md` | held measurement packet | resume only by owner promotion |

## Board rules

1. `npm run plan:resolve` must pass before an agent selects or continues implementation from `NOW`/`NEXT`.
2. `NOW` means current authorized execution, not merely an open issue.
3. One current agent-executable product/governance slice at a time; independent owner/provider/physical-device lanes may remain open.
4. A long-term phase becomes work only when its bounded issue/spec/packet is promoted.
5. A PR that completes the current agent slice must converge this board **before owner handoff in that same PR**; merged work must not remain in `NOW` and routine cleanup cannot be deferred.
6. `OWNER DECISION` is never auto-resolved by an agent.
7. Historical issues/PRs are provenance, not authority, once reconciled.
8. A completing PR may project post-merge `CURRENT_PROJECT_MEMORY.md` truth only when board + memory carry the same PR projection marker; the entire unmerged branch remains candidate evidence.
9. Baseline mismatch is a hard stop. A completing PR may carry an explicit same-PR post-merge projection only if projected Current Work has zero current agent-executable slices, its completed packet leaves `active/`, projected memory converges in the same PR, and `Lifecycle impact: completes current slice` is declared. While open, that projection is validation-only and cannot authorize task selection. After the exact matching squash merge it may activate. Dedicated reconciliation PRs are recovery-only for legacy/stale state or exceptional merge races, not the normal feature lifecycle.
