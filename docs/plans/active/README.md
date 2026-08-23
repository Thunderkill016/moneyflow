# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-23
**Current main baseline:** `eb8861c71dbc5b8173e7e48fff1293470a639816` (PR #447 merged)
**Release readiness:** **NOT PUBLIC-BETA READY**. RRB-08 current physical-phone proof remains open; P1 RRB-04/05/06/09 remain owner/provider/legal/read-access dependent. Product work never substitutes for those evidence lanes.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies. Open PRs and unmerged changes remain candidate evidence until merge.

## NOW

- [ ] **#448 — source lifecycle → ledger/reconciliation policy** — next bounded #432 P1 slice. Preserve lifecycle-only source observations and define the one safe reconciliation effect: reviewed `posted` evidence may move an exactly matching one-leg income/expense account leg from `pending` to `cleared`; source evidence never establishes `reconciled`, overwrites ledger fields, deletes facts or demotes user/statement truth. **Next actor:** agent implementer on `feat/448-source-lifecycle-reconciliation`.
- [ ] **RRB-08 — current physical-device proof** — issue #398 / merged runbook #399. Completion still requires the owner to re-test the selected deployed release candidate on a real phone and record device/OS/browser/origin/mode plus pass/fail/defects. Browser/emulation cannot close it. **Next actor:** owner.

## NEXT

- [ ] **#432 P1 — migrate the next real source path** — after identity/update lifecycle and source-to-ledger policy are explicit, migrate one real file/share path through the same candidate/provenance/reconciliation contract rather than opening a parallel ledger write path.
- [ ] **#432 P2 — Low-Maintenance Ingestion** — expand real Vietnamese file/share sources, merchant/payee normalization and exception-first review; reduce interventions/100 transactions without reducing match precision.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — disposable/authorized hosted target or owner limitation decision required.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-05 — verified support/privacy contact** — `support@moneyflow.app` is published but operator control is unproven.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — blocked by the corresponding release-readiness contract; #432 product work does not weaken it.

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
- [ ] **Phase E Creative Territories / Phase F broad redesign** — not current authority.

## RECENTLY DONE / DURABLE INPUT

- [x] **#446 / PR #447 — event-sourced capability harness + same-PR lifecycle convergence** — merged as `eb8861c71dbc5b8173e7e48fff1293470a639816`. The local monolithic dispatcher was replaced with the provider-neutral `scripts/agent-harness/` runtime; append-only run journals, capability negotiation, legacy-state migration, owned process cleanup and full Git/GitHub guards are machine-tested. Completing PRs now converge board + packet + memory in the same PR, so routine second lifecycle-closeout PRs are no longer the default. Final head `edfe3686…` passed CI #2913, database/pgTAP/archive, Browser smoke, Cross-device UI audit, aggregate e2e, CodeQL #1970 and Secret history #1970.
- [x] **#442 / PR #445 — explicit source lineage + lifecycle evidence** — merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0`. MoneyFlow now preserves explicit source-supplied predecessor/replacement identity across different source IDs without fuzzy lineage or source-driven ledger overwrite; final head `631386482cea3261d53567e709ae7b765fa53976` passed CI #2839, CodeQL #1897 and Secret history #1897, including fresh database/pgTAP, archive producer+restore, Browser smoke, Cross-device UI audit and aggregate e2e.
- [x] **#443 / PR #444 — fail-closed plan authority resolution** — merged as `99257178ff416e5b1c875f62aea05035824ca9a5` after final head `d7686873da3fde8544dabd24b7d57a05a7735dfe` passed CI #2823, CodeQL #1881 and Secret history #1881. Repository task selection now resolves a machine-readable master/supersession graph against the active registry, board freshness and Git first-parent history; unmerged master candidates and pre-merge projections can validate for review but cannot authorize task selection.
- [x] **#440 / PR #441** — live same-source-ID changed observations can be reviewed and preserved without overwriting ledger/reconciliation/canonical provenance; approved observation evidence is hardened against direct browser INSERT/UPDATE. Final head `237aac8d…` passed CI #2792, CodeQL #1851 and Secret history #1851 before squash merge as `6123d263…`.
- [x] **#438 / PR #439** — deleted exact-source reimport is explicit: live same-ID remains hard duplicate; deleted unchanged evidence can be reviewed to restore the same transaction; deleted changed evidence stays blocked; restore preserves ledger/reconciliation/canonical provenance. Final head `00384172…` passed CI #2766, CodeQL #1826 and Secret history #1826 before squash merge as `d5324c47…`.
- [x] **#436 / PR #437** — authenticated Inbox can reconcile later non-manual source evidence to one reviewed existing unprovenanced money transaction without creating a second fact or overwriting user corrections. Final head `83957701…` passed CI #2758, CodeQL #1819 and Secret history #1819 before squash merge as `1ae4c765…`.
- [x] **#434 / PR #435** — authenticated Direct CSV persists acquisition evidence and commits selected rows through one batch-atomic approval boundary; exact-head CI #2738, CodeQL #1800 and Secret history #1800 were green before squash merge as `38ae8f86…`.
- [x] **#432 P0 / PR #433** — acquisition-first long-term direction, target architecture, reference-repo atlas and program tracking merged as `a35d6f96…`; exact-head CI #2728, CodeQL #1791 and Secret history #1791 were green.
- [x] **#430/#429/#428** — repository truth/hygiene reconciliation before the strategy merge.
- [x] **#425** — corrected the earlier navigation-overload miscount and archived historical/non-authority docs.
- [x] **#420/#424** — dashboard figures link to underlying rows and capture confirmation communicates what was added. `PRODUCT_DEVELOPMENT_PLAN.md` from #420 is now predecessor history, not the master program after #433.
- [x] **#415/#419** — canonical performance measurement + attribution instrumentation; no demonstrated cold-load performance gain, #403 remains open.
- [x] **#404/#408/#410/#412/#414** — bounded mobile capture/navigation evolution driven by owner phone evidence; RRB-08 final current-phone acceptance still open.
- [x] **RRB-01/#391 and RRB-07/#394** — authenticated mixed-ledger truth and accessible authentication browser evidence closed.
- [x] **Release Readiness Audit v1/#388** — canonical blocker matrix established.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `448-source-lifecycle-reconciliation.md` | current agent-executable P1 slice | reviewed source lifecycle may influence clearing only under the bounded exact-match policy; no provider/production write |
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