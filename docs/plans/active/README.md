# MoneyFlow — Current Work Board

**Last reconciled:** 2026-09-02 (candidate selection of #527 production load performance)
**Current main baseline:** `d6ff88bff08d9efc3bfca828ce861b15b4cc0620` (PR #522 squash-merged)
**Selection projection:** planning PR for #527; activates only after owner merge
**Release readiness:** **NOT PUBLIC-BETA READY**. Product development does not substitute for provider/legal/physical-device release evidence.

This board answers **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Code/tests/provider truth outrank prose. A planning-PR selection is candidate authority until the owner merges its exact verified head.

## NOW

**Candidate after this planning PR merges: exactly one current agent-executable slice — #527.**

- [ ] **#527 — recover production page-load performance** — owner reported a current Vercel load/performance score of **39** on 2026-09-02. Fresh production reconnaissance shows anonymous `/` is prerendered/CDN HIT and skips Supabase auth without an auth cookie, while historical #403 evidence already identified client JS/main-thread render delay as the remaining measured bottleneck. Phase A must establish a fresh current-main `/` + `/dashboard` baseline and analyzer attribution before any runtime change. Packet: `docs/plans/active/527-production-load-performance.md`.
- [x] **#511 / PR #522 — Inbox exception-first review without auto-posting** — merged as `d6ff88bff08d9efc3bfca828ce861b15b4cc0620`. Review/trust infrastructure only; no manual-entry reduction claim.
- [x] **RRB-08 — current physical-device proof** — owner closed #398 on 2026-08-27 after one POCO X8 Pro / Android / Chrome / authenticated PASS observation. No iOS/Safari observation exists.

## NEXT

- [ ] **#523 — prove consumer bank-export compatibility before expanding capture** — candidate only and temporarily behind #527 because a current production-quality regression has priority. #527 completion may not auto-select #523; fresh-main selection is required later.
- [ ] **#432 P2 — continue Low-Maintenance Ingestion** — choose the next bounded acquisition slice from evidence and measured correction burden after the performance defect is closed or explicitly stopped.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — requires provider read access; #40/#174 remain owner/provider decisions.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — release-readiness contract remains independent of product/performance work.

Closed by current evidence/owner decision: RRB-01, RRB-02 limitation path, RRB-05 operator-controlled contact, RRB-07 and RRB-08 one-device observation.

## OWNER DECISION

- [ ] **#40** — Supabase leaked-password protection / Security Advisor provider action.
- [ ] **#174** — provider/Auth/firewall configuration read-back and disposition.
- [ ] **#426** — decide whether the separate simplification Slice 2 (`DashboardPlanningColumn`) should continue; it must not overlap #527 while #527 is current.
- [ ] **Public-beta go/no-go and remaining limitation decisions** — owner-only.

## HOLD

- [x] **#403 performance work** — completed historical measurement/attribution lineage. Its negative loading-boundary result remains evidence; #527 is the new current problem on fresh production evidence, not a reopening of the old experiment.
- [ ] **#426 further implementation** — held pending owner disposition and cannot overlap current #527.
- [ ] **Provider integration / native mobile / Wealth / Together / AI mutation** — horizon only; each needs dependency evidence, a bounded researched specification and owner authority.
- [ ] **Phase E Creative Territories / Phase F broad redesign** — parked.

## RECENTLY DONE / CURRENT LINEAGE

- [x] **#511 / PR #522 — exception-first Inbox grouped review** — merged `d6ff88bff08d9efc3bfca828ce861b15b4cc0620`; grouped posting remains explicit-confirmation-only and fail-closed to deterministic Ready candidates.
- [x] **#403 / PR #415 / #419 / #483 — canonical load measurement and attribution** — historical evidence. Last canonical runs found server response small and post-paint/client-JS work dominant; the loading-boundary experiment did not show a material LCP lever.
- [x] **#463 / PR #464 — Direct CSV confirmed-rule dry-run** — merged as `3975007738a3cf383c11e73b9e6d9fdfccfb2f59`.
- [x] **#460 / PR #461 — remembered Direct CSV column mapping** — merged as `ba2890670ceabed049aa1ed3bee0a9c8593b194a`.
- [x] **#458 / PR #459 — Direct CSV recovery handoff** — merged as `3876666da38bdd446c49053da827af731d55cf54`.
- [x] **#454 / PR #455 — deterministic Share candidate rules** — merged as `7a758843296b08167ba33ddb1f76e2f81a044a6d`.
- [x] **#452 / PR #453 — confirmed Inbox rule capture** — merged as `ac86d273876414c76fc050b11d3904dddfbb93b6`.
- [x] **#450 / PR #451 — PWA Share Target atomic source** — merged as `4d80fbe915155061fc3152740bb65c9cfa5c09ba`.
- [x] **#448 / PR #449 — reviewed exact source lifecycle → clearing** — merged as `9e709a2116a560da673539a3ff3994928b22262b`.
- [x] **#442 / PR #445 — explicit source lineage/lifecycle evidence** — merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0`.
- [x] **#434 / PR #435 through #440 / PR #441** — Direct CSV provenance, later-source attachment, deleted exact-source restore and changed same-ID observation preservation are merged lineage.
- [x] **#432 P0 / PR #433** — acquisition-first long-term direction is merged master authority.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `432-vietnam-long-term-product-strategy.md` | master product program | sequencing, invariants, metrics and phase gates |
| `527-production-load-performance.md` | **candidate current slice after planning PR merge** | current-main attribution + bounded performance implementation only; no financial/provider semantics |
| `public-beta-trust.md` | release parent program | release-readiness blockers and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | historical/current physical-device evidence lane; no provider/deployment mutation |
| `403-fcp-attribution.md` | historical/held measurement packet | provenance only; loading-boundary negative result must not be re-litigated without new evidence |
| `510-plan-projection-main-continuity.md` | recovery-only Class 3 governance packet | authority-continuity provenance; does not compete with product work |

If this planning PR is owner-merged, `527-production-load-performance.md` is the only `current agent-executable` packet. #523 remains NEXT/candidate.

## Board rules

1. `npm run plan:resolve` must pass before implementation is selected from `NOW`/`NEXT`.
2. `NOW` means current authorized execution, not merely an open issue.
3. At most one current agent-executable product/governance slice may exist; zero is valid between slices.
4. A long-term phase or open issue becomes work only when a bounded issue/spec/packet is separately promoted.
5. A completing PR must converge board + current memory + completed packet in that same PR before owner handoff.
6. `OWNER DECISION` is never auto-resolved by an agent.
7. Historical issues/PRs are provenance, not authority.
8. This #527 selection activates only after the owner merges the exact planning PR head; while open it authorizes no runtime code.
9. After planning merge, fetch fresh `main`, run `npm run plan:resolve` and `npm run agent:doctor -- --json`, establish fresh measurements, then implement only the measured #527 mechanism.
10. Completing #527 may not select #523 or any other follow-on slice in the same PR.