# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-21  
**Current main baseline:** `6d81d334fd7e6d491196bd993b283514cad2c160` (#430 merged)  
**Release readiness:** **NOT PUBLIC-BETA READY**. RRB-08 current physical-phone proof remains open; P1 RRB-04/05/06/09 remain owner/provider/legal/read-access dependent. Strategy work never substitutes for those evidence lanes.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies. Open PRs and unmerged changes remain candidate evidence until merge.

## NOW

- [ ] **#432 / PR #433 — MoneyFlow master development program / P0 Authority Alignment** — owner-promoted on 2026-08-21. Long-term direction: MoneyFlow remains a Vietnamese personal-finance product, but already-digital transactions should move toward automatic or near-automatic acquisition through one provider-independent source/candidate/provenance/matching/reconciliation pipeline; manual capture remains a first-class fallback for cash, corrections and unseen/off-system events. **Current P0 scope:** documentation/research only on `research/432-vietnam-long-term-product-strategy`: reconcile `AGENTS.md`, README, product principles/vision, target architecture, repo references and this board; preserve current shipped truth and all release/provider/legal boundaries. **Done when:** exact-head docs/knowledge gates and independent evaluation are green and one non-contradictory docs-only change is ready for owner merge decision. **Next actor:** agent for P0 verification/review; owner for merge.
- [ ] **RRB-08 — current physical-device proof** — issue #398 / merged runbook #399. Repository/browser preparation exists, but completion still requires the owner to re-test the selected deployed release candidate on a real phone and record device/OS/browser/origin/mode plus pass/fail/defects. Browser/emulation cannot close it. **Next actor:** owner.

## NEXT

- [ ] **#432 P1 — Acquisition Foundation specification** — starts only after P0 owner merge. Define source/batch/candidate/provenance, stable external IDs/fingerprints, dry-run, duplicate/transfer decisions, idempotent atomic commit, update/reimport/correction precedence and reconciliation relationships. Start from current import/share code and tests; do **not** start with a bank integration.
- [ ] **#432 P2 — Low-Maintenance Ingestion** — migrate real user-provided source paths through the neutral acquisition contract, then reduce manual interventions/100 transactions and maintenance minutes/month while protecting match precision.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — disposable/authorized hosted target or owner limitation decision required.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after P1 release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-05 — verified support/privacy contact** — `support@moneyflow.app` is published but operator control is unproven.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — blocked by the corresponding release-readiness contract; #432 strategy work does not weaken it.

## OWNER DECISION

- [ ] **#432 P0 / PR #433 merge decision** — accept/reject/revise the acquisition-first long-term product law after exact-head review.
- [ ] **PR #431 — conflicting product-direction candidate** — reconcile against #432 before merge. It is not current authority merely because it is open.
- [ ] **#426 — simplification program disposition** — preserve evidence-backed friction reductions, but do not restore the corrected false navigation premise or let it compete with #432 as master direction.
- [ ] **#403 — performance disposition** — remains open but no longer the default agent `NOW` item. #415 proved there is no obvious high-value LCP win; resume only if owner deliberately promotes its remaining attribution/architecture work after #432 P0.
- [ ] **#174 / #40 provider security decisions** — verify provider state before change/closure.
- [ ] **RRB-05 contact, RRB-06 legal, RRB-02/RRB-03 limitation decisions, PBT-AC15 public-beta go/no-go** — owner boundaries remain explicit.

## HOLD

- [ ] **#403 implementation** — open, measured, but held behind #432 P0 unless owner overrides.
- [ ] **#426 further implementation** — held pending reconciliation with #432 and corrected #425 product evidence.
- [ ] **Wealth / Together / native mobile / AI mutation / provider integration** — horizon only; each requires the dependency gate and a bounded researched specification.
- [ ] **Engineering literature → executable guardrails** — not promoted by this product program unless a concrete slice needs it.
- [ ] **Phase E Creative Territories / Phase F broad redesign** — not current authority.

## RECENTLY DONE / DURABLE INPUT

- [x] **#430** — removed a vendor-tooling doc and absent-evidence citations; current main `6d81d334…`.
- [x] **#429** — reconciled board with shipped product state.
- [x] **#428** — removed one unused dependency and dead module; no false performance win claimed.
- [x] **#425** — product reorientation corrected the earlier navigation-overload miscount and archived historical/non-authority docs.
- [x] **#420/#424** — dashboard figures link to underlying rows and capture confirmation communicates what was added.
- [x] **#415/#419** — canonical performance measurement + attribution instrumentation; no demonstrated cold-load performance gain, #403 remains open.
- [x] **#404/#408/#410/#412/#414** — bounded mobile capture/navigation evolution driven by owner phone evidence; RRB-08 final current-phone acceptance still open.
- [x] **RRB-01/#391 and RRB-07/#394** — authenticated mixed-ledger truth and accessible authentication browser evidence closed.
- [x] **Release Readiness Audit v1/#388** — canonical blocker matrix established.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `432-vietnam-long-term-product-strategy.md` | **current agent-executable master-program packet** | P0 docs/research alignment; later phases need bounded specs/permission |
| `public-beta-trust.md` | release parent program | release-readiness blocker sequence, controlled-beta gates and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | real-phone smoke only; no provider/deployment/production mutation |
| `403-fcp-attribution.md` | held measurement packet | existing attribution instrument; resume only by owner promotion |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. One current agent-executable product slice at a time; independent owner/provider/physical-device lanes may remain open.
3. A long-term phase becomes work only when its bounded issue/spec/packet is promoted.
4. Completion/abandonment updates this board; merged work must not remain in `NOW`.
5. `OWNER DECISION` is never auto-resolved by an agent.
6. Historical issues/PRs are provenance, not authority, once reconciled.
7. `CURRENT_PROJECT_MEMORY.md` changes only when merged implementation/trust truth changes; open strategy changes must not be restated as shipped runtime capability.
