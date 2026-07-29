# Active packet reconciliation before MF TRUST-7

**Status:** completed  
**Date:** 2026-07-29  
**Controlling tracker:** #123

## Purpose

The active-plan folder had accumulated packets whose implementation had already merged, whose production/CI evidence had already passed, or whose remaining scope had been delegated to another issue. This record preserves the delivery mapping while removing false work-in-progress signals.

No product, financial, database, auth or visual behavior is changed by this reconciliation.

## Reconciled packets

### `apply-uiux-brand-system.md`

- Delivered through PR #110.
- Shared brand identity, landing/auth/signed-in identity surfaces and regression contracts are already on `main`.
- Removed from active tracking; future brand changes are frozen under #123.

### `calm-ledger-daily-shell.md`

- Delivered through the #92–#94 dashboard/AppShell sequence, followed by test reconciliation in #98 and packet reconciliation in #99.
- `/dashboard` is the canonical authenticated home; `/insights` is a compatibility redirect.
- Removed from active tracking.

### `calm-ledger-system-redesign.md`

- The foundation and primary surfaces were delivered through #82, #91 and #92–#94.
- Issue #81 is closed as the completed umbrella.
- Any remaining route/state remediation belongs only to #72 and is frozen until the TRUST-7 day-7 exit review.
- Archived as superseded rather than treated as a redesign still running on an old branch.

### `css-token-single-source-of-truth.md`

- Delivered through PR #114.
- `document-theme.css` and the `--mf-*` system are the active authority; legacy names remain compatibility aliases.
- CI and the later PR #120 baseline passed the CSS ownership gate.
- Removed from active tracking.

### `html-body-single-owner.md`

- Delivered through PR #115.
- Duplicate/dead `html` and `body` ownership was removed; document ownership remains in `document-theme.css`.
- Removed from active tracking.

### `landing-dark-mode-contrast.md`

- Delivered through merged PR #80; the earlier PR #79 was superseded.
- Landing dark-mode contrast remains covered by current theme and browser contracts.
- Removed from active tracking.

### `moneyflow-logo-redesign.md`

- Canonical logo v1 and brand governance were delivered through PR #106.
- A separate candidate exists in draft PR #119 and requires explicit owner visual approval; it is not a continuation of this delivered packet.
- Removed from active tracking.

### `phase-b-rich-vnd-audit.md`

- Delivered through PR #104.
- Large integer VND and long Vietnamese content gained responsive regression evidence; phone Transactions overflow and Reports clipping were fixed.
- Broader remaining route/state work stays in #72 and is frozen under #123.
- Removed from active tracking.

## Resulting active state

After this cleanup, `docs/plans/active/` should contain only:

- its lifecycle README; and
- `mf-trust-7.md`, the controlling multi-session packet.

Draft PR #119 remains visible in GitHub as a deferred owner-decision candidate, not an active repository execution packet.

## Verification

- GitHub issue/PR state was reconciled before this record was created.
- The documentation-only branch must pass `check:knowledge` and the normal CI gates before merge.
- Completion of this record does not mark TRUST-7 Phase 1–3 complete.