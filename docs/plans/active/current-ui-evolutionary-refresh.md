# Current UI evolutionary refresh — Slice 1

**Status:** active
**Execution state:** implementing
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
- [ ] **UI1-AC10** Design Harness V2 evidence exists for `/dashboard` and
      `/transactions` at 1440, 390×844 and 390×568.

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
| UI1-T7 | **owner answers the review question** | UI1-T6 | owner decision | **awaiting owner** |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | implementer | human_owner | delivered, not accepted | shell/Overview/Transactions refinement, Class 2 gates, harness evidence | judgement of "materially better" is the owner's; no user testing | owner answers the review question; iterate this slice if the answer is no |

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

Recorded in the PR: doctor classification, Class 2 gate output, Design Harness V2
artifacts for `/dashboard` and `/transactions` at 1440 / 390×844 / 390×568, and the
independent evaluation with its fixes.

### Remaining limitations

- "Materially better" is an owner judgement; this packet cannot prove it.
- No physical-device run is claimed for this slice; harness evidence is emulated.
- The refresh is evolutionary: it does not resolve the Phase E territory question, and
  the owner's rejection of all candidates stands.
