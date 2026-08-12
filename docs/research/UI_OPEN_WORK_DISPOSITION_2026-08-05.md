# MoneyFlow open UI work disposition — 2026-08-05

**Status:** Phase 0 accepted recommendation — no unrelated PR or issue mutation authorized
**Baseline:** `main@9f31aa02a64bcff30705c187fceb09cf5fa61ded`
**Parent program provenance:** `docs/plans/completed/2026-08-08-ui-system-migration.md`

This table separates current project truth from candidate branches. It records the recommended next decision but does not close, retarget, merge or modify unrelated PRs or issues.

## Open work

| Item | Current state | Relevant evidence | Phase 0 recommendation | Owner action required |
|---|---|---|---|---|
| PR #296 — UI system migration parent plan | Merged on 2026-08-05 | Defines eleven gated phases and explicit owner checkpoints | Established as the program governance packet | None for Phase 0 |
| PR #294 — remove stale Dashboard mobile clearance | Open, mergeable, bounded one-line ownership fix plus tests | Root cause matches current baseline: global `.dashboard` clearance stacks with App Shell reserve | Do not merge automatically. Reconcile into App Shell/Dashboard migration; it may be used as an early bounded fix if owner wants immediate whitespace repair | Choose: merge bounded fix after final evidence, or supersede in Phase 3/4 |
| PR #293 — Open Design UI recovery foundation | Open, mergeable, docs only | Provides a local design-agent adapter, but overlaps parent governance and is not required for runtime migration | Keep isolated until owner decides whether Open Design is an approved optional design-room tool; avoid two competing recovery packets | Approve adapter, consolidate it, or close as superseded |
| PR #292 — Atoryn Penpot Agent Bridge v0.8 | Draft, mergeable, isolated prototype | Not current MoneyFlow runtime authority; creates separate design-tool/provider/security questions | Keep isolated from MoneyFlow UI migration. Do not use its output as approved UI direction | Separate Atoryn/Penpot product decision |
| PR #295 — publishable-key fingerprint allowlist | Merged on 2026-08-05 | Restored the all-ref secret-history gate independently of interface architecture | Completed independently under its Class 3 security packet | None for Phase 0 |
| PR #171 — dead CSS endgame | Open, stacked on #170, old baseline | Strong scanner and deletion research; proposes large stale diff and zero-dead-selector gate | Do not merge wholesale. Reuse scanner fixtures/techniques in Phase 1 and deletion evidence in Phase 10 | Close/supersede after useful ideas are ported to current main |
| PR #170 — retire mobile chrome CSS | Open, old baseline | Valuable DOM measurements and proof that tests guarded dead selectors; reports double clearance | Do not merge wholesale. Reuse measured failure modes and before/after method | Close/supersede after current slices replace it |
| PR #119 — old Lucide coin-rice logo candidate | Draft, non-mergeable, obsolete identity direction | Predates current B3.2 decision | Historical only; should not remain an active candidate | Close as superseded by current logo decision |
| Issue #72 — Phase B route/state UI audit and P2 remediation | Open | Remaining validation/error, destructive confirmation, Inbox/import review, wider planning/settings and physical-device scope | Keep open through Phase 8. Close only with exact successor evidence or completion | Approve future reconciliation, no closure now |

## Recommended decision sequence

1. Use merged PR #296 as the parent governance packet.
2. Complete and merge the Phase 0 baseline PR independently and documentation-only.
3. Treat merged PR #295 as the independent resolution of the all-ref secret-history blocker.
4. Decide whether PR #294 is an immediate bounded production fix or will be superseded by Phase 3/4.
5. Decide whether Open Design (#293) is an optional tool adapter; do not let it become a second design authority.
6. Keep Penpot bridge (#292) outside MoneyFlow runtime work.
7. Port only proven scanner/tests/evidence techniques from #170/#171, then close them as superseded rather than rebasing thousands of stale lines.
8. Close obsolete identity PR #119 through a separate explicit owner action.
9. Retain issue #72 until the migration records exact successor coverage.

## Rules for disposition changes

- Closing an item is an explicit owner action.
- A PR being mergeable does not make its baseline or direction current.
- Security work is not bundled with presentation cleanup.
- Design-tool availability does not select a product direction.
- Historical measurements may be reused only after current-main verification.
- No item is marked superseded until the replacement artifact exists and is linked.
