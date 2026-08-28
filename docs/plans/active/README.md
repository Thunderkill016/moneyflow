# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-28 (same-PR completion projection for #511 / PR #522)
**Current main baseline:** `133fa462d3cd5f90b1f70cccb179547815c2ba2d` (PR #521 squash-merged)
**Post-merge projection:** PR #522
**Release readiness:** **NOT PUBLIC-BETA READY**. Product development does not substitute for provider/legal/physical-device release evidence.

This board answers **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Code/tests/provider truth outrank prose. The PR #522 projection below is candidate state until the owner merges the exact verified head.

## NOW

**Projected after PR #522 merge: no current agent-executable product/governance slice is selected.**

- [x] **#511 — Inbox exception-first review without auto-posting** — completion is projected by PR #522. The implementation adds deterministic Ready/Needs-attention classification, preserves explicit confirmation, and keeps low-confidence/duplicate/transfer/invalid/unresolved candidates pending. It is review/trust infrastructure, not a manual-entry reduction claim. Completed packet projection: `docs/plans/completed/2026-08-28-511-inbox-exception-first-review.md`.
- [x] **RRB-08 — current physical-device proof** — owner closed #398 on 2026-08-27 after one POCO X8 Pro / Android / Chrome / authenticated PASS observation. No iOS/Safari observation exists.

## NEXT

- [ ] **#523 — prove consumer bank-export compatibility before expanding capture** — **candidate only, not selected by PR #522**. After #522 is merged and fresh-main `plan:resolve` confirms zero current slices, #523 may be separately promoted under #432. Phase A must benchmark privacy-safe structural consumer export fixtures against the current parser before any bank-specific adapter is authorized.
- [ ] **#432 P2 — continue Low-Maintenance Ingestion** — choose the next bounded slice from evidence and measured correction burden. The product-level target is trusted rows acquired per user action plus correction burden, not parser count or review-click claims.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — requires provider read access; #40/#174 remain owner/provider decisions.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — release-readiness contract remains independent of #432 product work.

Closed by current evidence/owner decision: RRB-01, RRB-02 limitation path, RRB-05 operator-controlled contact, RRB-07 and RRB-08 one-device observation.

## OWNER DECISION

- [ ] **#40** — Supabase leaked-password protection / Security Advisor provider action.
- [ ] **#174** — provider/Auth/firewall configuration read-back and disposition.
- [ ] **#426** — decide whether the separate simplification Slice 2 (`DashboardPlanningColumn`) should continue after merged Slice 1; it does not compete with #432 as master direction.
- [ ] **Public-beta go/no-go and remaining limitation decisions** — owner-only.

## HOLD

- [ ] **#403 performance work** — measured/held; resume only by deliberate promotion.
- [ ] **#426 further implementation** — held pending owner disposition.
- [ ] **Provider integration / native mobile / Wealth / Together / AI mutation** — horizon only; each needs dependency evidence, a bounded researched specification and owner authority.
- [ ] **Phase E Creative Territories / Phase F broad redesign** — parked.

## RECENTLY DONE / CURRENT LINEAGE

- [ ] **#511 / PR #522 — exception-first Inbox grouped review** — post-merge projection only until owner merge. Code/evaluation head `20896ba3c7a9bee71893994fbf199bfd9ffc77eb` passed CI #3142, browser/E2E, cross-device audit, CodeQL and secret scan before lifecycle-only convergence; the final projection head must pass exact-head checks again.
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
| `public-beta-trust.md` | release parent program | release-readiness blockers and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | historical/current physical-device evidence lane; no provider/deployment mutation |
| `403-fcp-attribution.md` | held measurement packet | resume only by owner promotion |
| `510-plan-projection-main-continuity.md` | recovery-only Class 3 governance packet | authority-continuity provenance; does not compete with product work |

There is intentionally **no `current agent-executable` row** in this PR #522 post-merge projection.

## Board rules

1. `npm run plan:resolve` must pass before implementation is selected from `NOW`/`NEXT`.
2. `NOW` means current authorized execution, not merely an open issue.
3. At most one current agent-executable product/governance slice may exist; zero is valid between slices.
4. A long-term phase or open issue becomes work only when a bounded issue/spec/packet is separately promoted.
5. A completing PR must converge board + current memory + completed packet in that same PR before owner handoff.
6. `OWNER DECISION` is never auto-resolved by an agent.
7. Historical issues/PRs are provenance, not authority.
8. This projection activates only after the exact matching owner merge; while open it cannot authorize #523 or any other follow-on work.
9. After merge, fetch fresh `main`, run `npm run plan:resolve` and `npm run agent:doctor -- --json`, then select any next slice through a separate authority change.
