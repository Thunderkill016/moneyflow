# Neon Blue design study

**Status:** specified  
**Execution state:** owner_selection_pending  
**Active responsibility:** designer/evaluator  
**Permission scope:** design-only branch write, design PR metadata, owner-selection recording  
**Owner:** MoneyFlow owner  
**Baseline:** `main@26a5c8e1d78ae48189668349eeac7a461a3f3efa`  
**Branch:** `design/neon-blue-system-study`  
**Last updated:** 2026-08-04

## Outcome

Complete the required design gates for applying Neon Blue as MoneyFlow's main identity before any production implementation becomes mergeable.

The study ends with an owner-selected application direction and an annotated system specification. Production code belongs in a separate implementation PR after selection.

## Repository reconnaissance

- `docs/AI_UIUX_WORKFLOW.md` requires product truth, cumulative research, audit, three independent directions, owner selection, system lock, vertical-slice implementation and verification.
- `docs/design/DESIGN_DIRECTION_STATUS.md` keeps Fresh Blue active until the owner replaces it through the required process.
- `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` requires project-wide brand architecture, representative landing/auth states, multiple candidates and owner review before implementation authority.
- `src/app/document-theme.css` is the current semantic theme authority.
- The B3.2 logo geometry is shared across public and authenticated surfaces.
- PR #283 was closed and parked because it implemented Neon Blue before the design gates were completed.

## Research

The study adopts these existing findings:

- color reinforces product trust but cannot create it;
- brand/action color must remain separate from income, expense, warning and transfer semantics;
- white-first neutral surfaces should carry most of the interface;
- candidate directions must be compared on the same representative screens;
- mobile, dark mode, contrast, color-vision deficiencies and chart distinctions are required evidence;
- owner visual approval is separate from automated CI success.

The study rejects:

- one-for-one replacement of every current blue token without application design;
- treating three shades of Neon Blue as three independent directions;
- using a production implementation as the prototype to justify itself;
- merging based on CI without owner visual approval.

## Specification

### Fixed owner input

- primary hue family under study: Neon Blue centered on `#3445FB`;
- canonical B3.2 geometry remains unchanged;
- the logo must participate in the selected Neon Blue system;
- financial semantic colors remain independent.

### Required representative surfaces

1. Landing hero and guided-story entry.
2. Login and recovery.
3. Workspace navigation and primary transaction action.
4. Account summary with income, expense and transfer.
5. Transaction selection/focus/error.
6. Chart with legend or direct labels.
7. Logo on light, dark and Neon surfaces.

### Candidate directions

- A — Precision Core: Neon Blue as controlled operational signal.
- B — Neon Frame: Neon Blue as visible structural framing material.
- C — Editorial Current: Neon Blue as typographic and compositional current.

### Owner gate

The owner selects A, B or C, rejects all three, or requests a new divergence round. Selection must be recorded before token, component or production implementation authority is created.

## Implementation plan

1. Lock the brief and audit.
2. Produce three independent responsive visual studies on the same content.
3. Present desktop and mobile review evidence.
4. Record owner selection and rejected directions.
5. Write an annotated selected-system specification including:
   - token migration map;
   - light/dark pairs;
   - logo variants;
   - component usage;
   - chart/semantic roles;
   - local hex removal list;
   - accessibility and rollback plan.
6. Open a separate bounded implementation PR.
7. Run static, build, browser, cross-device, contrast and color-vision checks.
8. Obtain physical Android and owner visual approval.
9. Merge only after explicit authorization.

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | close and park premature implementation PR | done | PR #283 closed, not merged |
| T2 | write design brief | done | `docs/design/NEON_BLUE_BRAND_BRIEF.md` |
| T3 | audit current product and risks | done | `docs/design/NEON_BLUE_CURRENT_STATE_AUDIT.md` |
| T4 | define three independent application directions | done | `docs/design/NEON_BLUE_APPLICATION_DIRECTIONS.md` |
| T5 | create responsive visual review board | in_progress | design-only artifact |
| T6 | owner selects direction | blocked | waits for visual review |
| T7 | write selected-system specification | blocked | waits for T6 |
| T8 | open separate implementation PR | blocked | waits for T7 |
| T9 | implementation verification and device review | blocked | waits for T8 |
| T10 | owner visual approval and merge | blocked | waits for T9 |

## Evaluation

The previous approach failed the design process even though its engineering gates passed. PR #283 started with a chosen hex and immediately migrated production tokens. It did not first compare application systems, obtain owner visual selection or distinguish design approval from CI success.

This packet corrects that failure by returning Fresh Blue to production authority, isolating design exploration from production code and establishing an explicit owner gate before implementation.

The provisional direction scores are not approval:

| Direction | Weighted score | Main interpretation |
|---|---:|---|
| A — Precision Core | 4.78 / 5 | safest daily-use baseline |
| B — Neon Frame | 4.31 / 5 | strongest immediate rebrand |
| C — Editorial Current | 4.38 / 5 | most distinctive hierarchy |

The next valid state transition is owner selection after reviewing the visual board.

## Verification plan

### Design-stage verification

- same content and representative screens across all directions;
- desktop and `320/390px` mobile evidence;
- Light public and Light/Dark workspace examples;
- logo on neutral, Neon and dark surfaces;
- action/focus/selection separation;
- financial semantic and chart examples;
- rationale and trade-offs visible beside each candidate.

### Implementation-stage verification

Not authorized yet. When authorized, require lint, typecheck, unit, build, Chromium/WebKit, viewport matrix, 200% text, keyboard focus, effective-background contrast, color-vision simulation, physical Android review and owner visual approval.

## Handoff record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-04 | owner | designer | correction | “Làm theo quy trình” | stop premature implementation and return to design gates |
| 2026-08-04 | designer | owner | design study in progress | brief, audit and three directions | review responsive visual board and select or reject directions |