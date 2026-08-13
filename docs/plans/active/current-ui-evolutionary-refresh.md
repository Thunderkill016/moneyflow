# Current UI evolutionary refresh — Slice 1

**Status:** active — owner-accepted for Slice 1, awaiting merge
**Execution state:** accepted; remains active until merge and post-merge lifecycle reconciliation
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #370
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet refines the **currently
shipped** MoneyFlow UI. It is **not** Brand v3, **not** Design System v3, and it does
**not** complete Phase E.

## Outcome

The shipped product feels materially more refined, current and technology-forward —
through precision, hierarchy, density and interaction quality — while keeping its product
identity, financial semantics, destinations and behaviour exactly as they are.

## Repository reconnaissance

### Current behavior

- `agent:doctor --json` on the clean base recorded Class 0 (docs-only worktree); the
  implementing diff is **Class 2 UI work** spanning shell + Overview + Transactions, which
  is why this full packet exists.
- `src/components/layout/app-shell.tsx` + its CSS module own signed-in navigation; the
  desktop grid is `248px minmax(0,1fr)`, the sidebar is a filled surface with a
  bordered active state, and the topbar is 72px with a border and blur.
- Dashboard order today is greeting → attention → statement → planning nav → content
  grid: the greeting `h1` outranks the financial position.
- Transactions renders `.summary` (a four-column bordered card) above `.manager`
  (another bordered card holding toolbar + table), which reads as separate cards rather
  than one workspace.
- Fresh Blue remains the shipped palette authority; `src/app/document-theme.css` owns the
  `--mf-*` tokens.

### Phase E boundary

The owner rejected every Phase E territory proposed so far. **Trang Sổ, Biên Nhận, Bản
Ghi & Bản Sửa, Quang Phổ, Mạch Số, Trường Sáng, Calm Ledger and Signal Ledger are not
selected, not revived and not reinterpreted here.** PR #369 is candidate/rejected
exploration and is **not visual authority** for this slice. Phase E is paused with no
selected territory; Phase F does not start.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.tsx` + module CSS | shell chrome, nav, topbar, mobile nav | refine presentation; destinations and behaviour unchanged |
| `src/components/moneyflow-dashboard.tsx`, `dashboard/*`, `dashboard.module.css` | Overview composition and its scoped globals | reorder hierarchy; reduce container count |
| `src/components/transactions/transactions-workspace.tsx` + module CSS | canonical evidence workspace | unify summary and ledger; quieten filters; keep every capability |
| `src/app/document-theme.css` | shipped semantic tokens | reuse; no new global layer |
| `docs/engineering/DESIGN_HARNESS.md` | visual evidence contract | use V2 as-is; do not modify or implement V2.1 |

### Existing tests and constraints

- Class 2 gates: lint, typecheck, unit tests, build, CSS ownership, architecture, browser
  smoke and the policy-selected responsive audit.
- A0 guardrails apply: replace-and-retire, one height/scroll owner for overlays,
  first-paint evidence, mode-bound acceptance.
- No new global CSS layer, no `legacy.css` additions, no new `!important`.

## Research

Four references, read for **mechanism** only. Full ledger in the PR body and below.

| Reference | Mechanism taken | Refused |
|---|---|---|
| Linear 2026 refresh | dim secondary chrome so content carries hierarchy; consistent header/control rhythm; density without clutter | Linear's palette, issue-tracker aesthetic, component geometry |
| Vercel 2026 dashboard nav | navigation ordered by frequent workflow; shell recedes; mobile bottom nav tuned for one-handed reach | developer-console identity, project/team model, terminal aesthetic |
| Raycast | the recurring interaction gets the strongest affordance; contextual actions discoverable without filling the screen; precise interaction states | command-palette software, keyboard-first desktop model |
| Mercury Transactions | summary + filters + records behave as one connected workspace at high density | bank identity, sync assumptions, business-accounting complexity |

Licence/privacy/ownership: none. Public product surfaces were read for interaction
mechanism; no asset, palette, typeface or markup was copied.

## Specification

### Problem

The shipped UI is functional but reads as stacked containers with heavy chrome: the
sidebar competes with content, the greeting outranks the money, and Transactions reads as
four cards plus a filter card plus a table card. None of that is a product defect, so the
fix must be presentation-only.

### Acceptance criteria

- [ ] **UI1-AC1** Every current destination, capability and behaviour is preserved —
      nothing is removed or hidden to make a screen look cleaner.
- [ ] **UI1-AC2** Content is visually dominant over shell chrome on desktop; the active
      destination is unmistakable but quieter.
- [ ] **UI1-AC3** Overview leads with financial position; the greeting no longer
      outranks it; planning is available but visibly secondary.
- [ ] **UI1-AC4** Transactions reads as one workspace; filters remain fully available
      while visually quieter than records.
- [ ] **UI1-AC5** Money keeps tabular numerals, no truncation, and stays distinguishable
      without colour alone.
- [ ] **UI1-AC6** Mobile nav is a precise control surface preserving the five
      destinations, safe area, More-sheet contract and short-height reachability at
      390×844, 390×568 and the 320 audit viewport.
- [ ] **UI1-AC7** Fresh Blue remains the palette; no new palette, global layer or
      `!important`.
- [ ] **UI1-AC8** Dark mode receives equivalent treatment, not inversion.
- [ ] **UI1-AC9** Motion is structural only; reduced motion remains valid.
- [x] **UI1-AC10** Evidence types are stated separately and never merged:
      **Design Harness V2 artifacts** cover `/dashboard` and `/transactions` at
      **1440×900** and **390×844** — the only viewports the harness encodes.
      **390×568 is targeted browser measurement only**: it is *not* a Design Harness
      V2 artifact and *not* physical-device evidence. No physical-device validation is
      claimed anywhere in this slice, and the harness itself is unmodified.

### Out of scope

Capture dialogs, Accounts, Reports, Plan, Advanced review and Settings redesign; any
database, migration, Supabase, Auth, provider, financial-calculation, transfer-semantics,
planning, reports, import, backup, route-architecture or nav-destination change; Brand v3;
Design System v3; Design Harness modification; territory selection.

## Implementation plan

1. reconcile base and open this packet;
2. refine AppShell chrome, active state and mobile nav;
3. reorder Overview to lead with financial position and reduce container count;
4. unify Transactions summary and ledger into one workspace and quieten filters;
5. run Class 2 gates plus Design Harness evidence;
6. independent evaluation, then PR for owner review.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| UI1-T1 | packet, doctor record, research ledger | base | this packet | complete |
| UI1-T2 | AppShell refinement | UI1-T1 | shell diff + harness | complete |
| UI1-T3 | Overview hierarchy | UI1-T1 | dashboard diff + harness | complete |
| UI1-T4 | Transactions workspace | UI1-T1 | transactions diff + harness | complete |
| UI1-T5 | Class 2 gates and visual evidence | UI1-T2–T4 | gate output, harness artifacts | complete |
| UI1-T6 | independent evaluation and fixes | UI1-T5 | evaluator findings | complete |
| UI1-T7 | owner answers the review question | UI1-T6 | owner review 2026-08-13 | **accepted** |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | implementer | human_owner | delivered for review | shell/Overview/Transactions refinement, Class 2 gates, harness evidence | judgement of "materially better" is the owner's; no user testing | owner answers the review question |
| 2026-08-13 | human_owner | implementer | **accepted for Slice 1** | owner visual review of the branch | none blocking; merge remains a separate owner decision | final cleanup, then owner merge |

### Current permission boundary

- Granted: one UI branch touching shell, Overview and Transactions presentation.
- Forbidden: database, migrations, Supabase, Auth, provider config, financial
  calculations, transfer semantics, planning/reports/import/backup domains, route
  architecture, nav destination semantics, Design Harness, CI, Brand v3, Design System v3
  and any territory selection.
- Stop condition: a change would alter behaviour, remove a capability, introduce a new
  palette or start Phase F.

## Evaluation

### Acceptance evidence

Recorded in the PR: doctor classification, Class 2 gate output, and the independent
evaluation with its fixes. Evidence types are kept distinct:

- **Design Harness V2 artifacts:** `/dashboard` and `/transactions` at **1440×900** and
  **390×844** — the only viewports the harness encodes.
- **390×568:** targeted browser measurement only. It is **not** a Design Harness V2
  artifact and **not** physical-device evidence.

### Measured outcomes, including where the trade is negative

| Viewport and state | `main@55ee401` | this branch | delta |
|---|---|---|---|
| mobile 390 — no secondary filter | 791px | **271px** | −520px |
| mobile 390 — secondary filter active/open | 851px | **641px** | −210px |
| desktop 1440 — no secondary filter | 273px | **155px** | −118px |
| desktop 1440 — secondary filter active/open | 333px | **369px** | **+36px (regression)** |

Toolbar height, `/transactions`, demo runtime, measured in Chromium on the exact
implementation head against a dev server on both branches with the same data. The
filtered state uses `?review=needs_review`. Three of the four states improve; the
desktop filtered state is 36px worse than main because the disclosure adds its own
44px summary row above the same grids. That regression is kept visible rather than
omitted.

Summary and manager now share one edge (measured seam 0px desktop, −2px mobile from
border overlap); previously an 18px canvas gap left the summary as a card with no
bottom edge.

The filter ground was changed from `--mf-surface-muted` to `--mf-canvas` because in
dark mode surface-muted is *brighter* than the manager surface, so the band advanced
instead of receding. Measured relative luminance now: light 0.954 vs 1.000, dark
0.0057 vs 0.0092 — below the card in both themes.

### Owner acceptance — Slice 1

Recorded from the owner's review on 2026-08-13:

| Question | Answer |
|---|---|
| Materially better to use and look at than `main`? | **YES** |
| MoneyFlow identity preserved? | **YES** |
| Further redesign required for Slice 1? | **No** — the evolutionary direction is accepted; do not redesign this slice further |
| Another creative territory? | **No** — Phase E stays paused, Phase F does not start |

This accepts the **visual direction and implementation of Slice 1**. It is not a merge
approval: **final merge remains a separate owner decision under repository policy**, and
this packet stays **active** until merge and post-merge lifecycle reconciliation. It is
not marked completed or archived.

### Remaining limitations

- "Materially better" is an owner judgement; this packet cannot prove it.
- Desktop-with-filter is a genuine regression against main on vertical space, traded
  for a large unfiltered win at every viewport and a filtered win on phones.
- "Reduce card soup" is honest but modest: the planning nav lost its container and
  the Transactions seam closed. Below the statement, Overview is still a stacked set
  of panels.
- Evidence types: Design Harness V2 artifacts at 1440×900 and 390×844; 390×568 is
  targeted browser measurement only — not a harness artifact and not a physical device.
  No physical-device validation is claimed.
- No physical-device run is claimed for this slice; harness evidence is emulated.
- The refresh is evolutionary: it does not resolve the Phase E territory question, and
  the owner's rejection of all candidates stands.
