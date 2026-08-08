# MoneyFlow UI system migration — completed

**Status:** accepted_with_limitations
**Execution state:** archived
**Owner:** Thunderkill016
**Archived:** 2026-08-08
**Source parent:** PR #296 / `docs/plans/active/ui-system-migration.md`
**Final implementation:** PR #321 / merge `bfdab8b922b71e163b38ac633602ce4c2c486c5a`

The owner explicitly instructed **“Đóng kế hoạch”** on 2026-08-08 after P11 was merged, deployed to production and production-smoked. This closes the P0–P11 UI-system migration program with the physical-device limitation recorded below rather than fabricated as passed evidence.

## Outcome

MoneyFlow now uses one maintainable UI ownership model: semantic theme tokens, shared primitives, App Shell-owned chrome/safe-area behavior and route-local presentation owners. The migration preserved financial semantics while retiring the multi-generation override architecture.

## Delivered phases

| Phase | Boundary | Delivery |
|---|---|---|
| P0 | authority/inventory/baseline | PR #297 merged |
| P1 | no-new-presentation-debt guardrails | PR #298 merged |
| P2 | token and primitive ownership | PR #299 merged |
| P3 | App Shell/chrome ownership | PR #300 merged |
| P4 | Dashboard pilot | PR #301/#303 delivered |
| P5 | Transactions + Capture | PR #306 merged |
| P6 | Accounts + Transfer | PR #307 merged |
| P7 | Planning | PR #308 merged |
| P8 | secondary/safety surfaces | PR #309 merged |
| P9 | Landing/Auth cleanup | PR #318 merged |
| P10 | legacy retirement | PR #319 merged |
| P11 | final acceptance fixes/evidence | PR #321 merged |

## Final protected evidence

P11 final exact head `b9cb97106ef78b21c8211cb0c8ff1107e94f3ddc` passed CI #2043, CodeQL #1149 and secret-history #1149. It recorded 785 unit/static tests with 0 failures, Browser smoke 94/94 with 0 flaky, cross-device audit 554 total / 427 passed / 127 intentional skips / 0 failed / 0 flaky, zero-diff selective visual baselines, one intentional foundation CSS import, 0 `!important` and 0 unauthorized document selectors.

P11 fixed two retry-exposed races instead of hiding them with retries: AppShell first-paint reserve ownership and demo transaction persistence ordering.

## Production evidence

- P11 squash merge: `bfdab8b922b71e163b38ac633602ce4c2c486c5a`.
- Vercel production deployment: `dpl_AvhNmvjmKR93VVA6PX5LGfsDKESX`, `READY`, exact merged commit.
- `/` and `/login` returned HTTP 200.
- unauthenticated `/dashboard` reached the expected login boundary.
- no runtime-error cluster was found in the inspected post-deploy window.

## Accepted limitation

Physical Android Chrome and physical iOS/Safari acceptance were **not executed**. Browser/device emulation is not represented as physical evidence. Issue #72 was closed as `not_planned` after the owner chose to close the program without those physical checks. This is an explicit accepted limitation, not a claim that the device gates passed.

## Architecture retained after closure

- `src/app/document-theme.css` remains semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- public routes remain light-only; signed-in workspace retains Light/Dark/System.
- App Shell owns application chrome, mobile reserve/safe-area/focus/feedback geometry.
- shared primitives own common action/form/overlay/feedback/money contracts.
- migrated routes own their presentation locally.
- no new root override layer is authorized by this closure.

## Historical evidence

- `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md`
- `docs/research/UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md`
- `docs/research/UI_PHASE_11_PHYSICAL_DEVICE_ACCEPTANCE_2026-08-08.md`
- bounded PR memories under `docs/research/pr-memory/YYYY/QN/`.

## Next boundary

There is no active UI-system migration program after this archive. Future UI/UX evolution, conversion work or a new design direction requires a new bounded packet/specification rather than reopening P0–P11.