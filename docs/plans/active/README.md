# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-21
**Current main baseline:** `38ae8f8694554d8d69508f86bcc66b2bdfe68b95` (PR #435 merged)
**Release readiness:** **NOT PUBLIC-BETA READY**. RRB-08 current physical-phone proof remains open; P1 RRB-04/05/06/09 remain owner/provider/legal/read-access dependent. Product work never substitutes for those evidence lanes.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies. Open PRs and unmerged changes remain candidate evidence until merge.

## NOW

- [ ] **#436 — P1 manual → later-source reconciliation** — second bounded Acquisition Foundation slice. Current server planning catches prior imported provenance/candidates but not an existing unprovenanced manual ledger fact, so later source evidence can still create a duplicate. Add a conservative unique account/date/amount/kind match plus an explicit reviewed source-link operation that writes provenance/approval linkage without mutating the existing fact, entries or reconciliation state. Ambiguous/deleted/provenanced/transfer targets remain unresolved/ineligible. **Done when:** unique reviewed matches can attach evidence without a second fact; ambiguity never auto-selects; user corrections remain untouched; exact-head Class 3 CI/database/security/browser evidence is green. **Next actor:** agent on `feat/436-manual-import-reconciliation`; owner merge decision after handoff.
- [ ] **RRB-08 — current physical-device proof** — issue #398 / merged runbook #399. Completion still requires the owner to re-test the selected deployed release candidate on a real phone and record device/OS/browser/origin/mode plus pass/fail/defects. Browser/emulation cannot close it. **Next actor:** owner.

## NEXT

- [ ] **#432 P1 — remaining Acquisition Foundation** — after #436, define source-update/deleted-reimport precedence and migrate the next real source path. Promote one bounded slice at a time.
- [ ] **#432 P2 — Low-Maintenance Ingestion** — migrate real Vietnamese file/share sources through the neutral acquisition contract and reduce interventions/100 transactions without reducing match precision.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — disposable/authorized hosted target or owner limitation decision required.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-05 — verified support/privacy contact** — `support@moneyflow.app` is published but operator control is unproven.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — blocked by the corresponding release-readiness contract; #432 strategy work does not weaken it.

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

- [x] **#434 / PR #435** — authenticated Direct CSV now persists acquisition evidence and commits selected rows through one batch-atomic approval boundary; exact-head CI #2738, CodeQL #1800 and Secret history #1800 were green before squash merge as `38ae8f86…`.
- [x] **#432 P0 / PR #433** — acquisition-first long-term direction, target architecture, reference-repo atlas and program tracking merged as `a35d6f96…`; exact-head CI #2728, CodeQL #1791 and Secret history #1791 were green.
- [x] **#430/#429/#428** — repository truth/hygiene reconciliation before the strategy merge.
- [x] **#425** — corrected the earlier navigation-overload miscount and archived historical/non-authority docs.
- [x] **#420/#424** — dashboard figures link to underlying rows and capture confirmation communicates what was added.
- [x] **#415/#419** — canonical performance measurement + attribution instrumentation; no demonstrated cold-load performance gain, #403 remains open.
- [x] **#404/#408/#410/#412/#414** — bounded mobile capture/navigation evolution driven by owner phone evidence; RRB-08 final current-phone acceptance still open.
- [x] **RRB-01/#391 and RRB-07/#394** — authenticated mixed-ledger truth and accessible authentication browser evidence closed.
- [x] **Release Readiness Audit v1/#388** — canonical blocker matrix established.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `436-manual-import-reconciliation.md` | **current agent-executable Class 3 slice** | reviewed manual→source provenance linking only; no provider/native/AI scope |
| `432-vietnam-long-term-product-strategy.md` | master product program | sequencing, invariants, metrics and phase gates; child slice owns current implementation detail |
| `public-beta-trust.md` | release parent program | release-readiness blockers and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | real-phone smoke only; no provider/deployment/production mutation |
| `403-fcp-attribution.md` | held measurement packet | resume only by owner promotion |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. One current agent-executable product slice at a time; independent owner/provider/physical-device lanes may remain open.
3. A long-term phase becomes work only when its bounded issue/spec/packet is promoted.
4. Completion/abandonment updates this board; merged work must not remain in `NOW`.
5. `OWNER DECISION` is never auto-resolved by an agent.
6. Historical issues/PRs are provenance, not authority, once reconciled.
7. `CURRENT_PROJECT_MEMORY.md` changes only when merged implementation/trust truth changes; open changes must not be restated as shipped runtime capability.
