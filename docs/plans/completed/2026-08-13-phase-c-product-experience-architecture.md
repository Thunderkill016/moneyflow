# Phase C — Product Experience Architecture

**Status:** accepted/completed
**Execution state:** complete
**Completed role:** bounded product-experience architecture record
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #367; exact final-head provider checks and owner merge required
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. Phase C turns Phase A’s
executable-current map, Phase B’s bounded product mechanisms and A0’s failure
guardrails into one MoneyFlow-specific product experience architecture. It makes no
brand, palette, typography, visual-component, Design Harness or implementation choice.

## Outcome

A later phase can use `docs/research/PHASE_C_PRODUCT_EXPERIENCE_ARCHITECTURE.md` to
reason about primary jobs, target concepts, navigation semantics, surface ownership,
flows, disclosure and migration constraints without treating a competitor IA or the
current route tree as automatically optimal.

## Repository reconnaissance

### Current behavior

- The executable current map is the completed Phase A audit. AppShell and
  `src/lib/nav-ia.ts` own current signed-in navigation; route pages compose features;
  shared Dialog/Sheet owns constrained overlay semantics.
- Phase B is accepted/completed in merged #366 (`main@60f91b7`); its research is
  mechanism evidence, not an adopted layout or product identity.
- MoneyFlow remains a Vietnamese manual-first, integer-VND ledger with explicit demo
  and authenticated modes, transfer neutrality, recoverable destructive actions and a
  complete-backup versus scoped-export boundary.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/nav-ia.ts`, AppShell and route/test owners | actual current surface and navigation ownership | preserve named owners; do not treat placement as final target architecture |
| Phase A audit | code/test-first runtime, ownership and evidence constraints | architecture’s current-fact authority |
| Phase B research | bounded mechanisms/tradeoffs/counterexamples | reuse mechanisms only after MoneyFlow filter |
| A0 review | replace-and-retire, viewport, overlay, accessibility guardrails | turn into later evidence/migration constraints, not design style |
| product principles/current memory/Trust | product law, lifecycle and non-goals | preserve constraints and one program state |

### Existing tests and constraints

- Documentation-only Class 0 local gates and active-registry validation are required.
- No runtime/source/assets/UI/CSS/route/Design Harness/provider/production/database/Auth
  modification is in scope.
- Phase D Brand Strategy is the immediate next phase after this record merges; it is
  not started and has no packet.

## Specification

### Problem

MoneyFlow has a functional, code-owned route tree and fresh mechanism research but no
single, MoneyFlow-specific target architecture that explains which jobs and information
belong together, what must remain optional, and how mobile/desktop navigation stay one
product. A layout-first redesign would risk copied competitor IA, mandatory planning,
advanced-capture identity and financial-trust regressions.

### Acceptance criteria

- [x] One durable architecture artifact contains every required Phase C section and
  answers the canonical jobs, information, navigation, surface and core-flow questions.
- [x] Every target surface has a primary question/action, evidence/correction path,
  runtime-mode boundary and financial-invariant treatment where applicable.
- [x] The target architecture keeps manual capture/core ledger primary; planning
  optional; Inbox/import/rules advanced; recovery/backup discoverable; report export
  distinct from complete backup.
- [x] Desktop, normal mobile and short-height mobile navigation have structural
  semantics without a visual proposal or a reachable-content trap.
- [x] The gap map names current owner, target responsibility, reason and migration risk
  for each meaningful movement, without prescribing implementation or deletion.
- [x] A fresh evaluator found no competitor-IA copying, demo/auth confusion,
  unsupported route restructuring, invariant breach, accidental brand/UI/Phase D work
  or generic-dashboard thinking after final lifecycle evidence was recorded.
- [x] This PR stages post-merge lifecycle: Phase C accepted/completed, parent-only
  registry, Phase D Brand Strategy immediate next/not started/no packet and PBT-AC15
  open.

### Out of scope

- Brand strategy, personality, naming, visual/creative territory, palette, typography,
  icons, Design System v3, component styling, CSS/UI/route implementation, Design
  Harness changes, CI changes, provider/production/database/Auth writes and Phase D.

## Implementation plan

### Architecture fit

The artifact is product-experience architecture, not a second runtime/navigation owner.
It records target responsibilities and migration constraints; existing code/tests keep
owning actual runtime behaviour until later approved work changes them.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Phase C architecture artifact | target job, IA, navigation, flows, disclosure, runtime/trust and migration decisions | give later work a single constrained architecture |
| active registry/current memory/Trust parent | active then staged-completed lifecycle | preserve authoritative execution routing |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation-only architecture decision.
- Rollback: revert documentation; no runtime state changes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| “dashboard of everything” replaces job flow | assign one primary question/action and evidence path per surface |
| competitor model becomes product identity | test every borrowed mechanism against manual-first/transfer/recovery/mode constraints |
| target prose overrides code before migration | distinguish current executable owner from target responsibility and migration candidate |
| navigation hides primary/recovery actions on short mobile | state reachability, More responsibility and A0/PP-12 constraints structurally |
| planning/automation dominates daily use | classify CORE/SUPPORTING/ADVANCED/ADMIN-OWNERSHIP explicitly |

### Verification plan

- Static: diff hygiene and active-registry guard.
- Product architecture: source-owner citations, complete decision/flow matrices and
  fresh evaluator counterexample review.
- Unit/domain, database, browser, responsive/visual: not applicable by Class 0 policy.
- Production/manual: exact-head provider checks and owner merge only.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| C-T1 | reconcile merged Phase B baseline and deliberately activate Phase C | `main@60f91b7` | active packet/registry/current memory/Trust | complete |
| C-T2 | trace current routes/nav/flow/runtime/trust owners | C-T1 | source references in architecture artifact | complete |
| C-T3 | synthesize target architecture and migration constraints | C-T2 | durable Phase C artifact | complete |
| C-T4 | fresh evaluation, Class 0 gates and PR delivery | C-T3 | fresh evaluator clean; Class 0 gates; PR memory and exact-head checks | complete locally — `check:migrations`, `check:knowledge`, `test:ci-policy` (8/8), registry guard and diff hygiene pass; exact final-head provider checks and owner merge remain delivery requirements |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | product-experience architect | human_owner | accepted/completed | merged #366 at `main@60f91b7`; durable Phase C architecture, source-owner trace and staged lifecycle | exact final-head provider checks and owner merge remain required; Phase D remains unopened | after merge, separately open Phase D only when authorised |

### Current permission boundary

- Granted scope: one documentation/architecture branch and read-only repository/current
  public-source evidence already retained by Phase B.
- Forbidden writes: runtime/source/assets/UI/CSS/routes/Design Harness, providers,
  production, database, Auth and Phase D packet.
- Stop condition: a decision needs visual/brand selection, a runtime change, new product
  data, provider action or product-scope exception; leave it as a later-phase question.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| current-owner reconciliation | Phase A plus source/code/test trace | PASS |
| MoneyFlow-specific target architecture | required durable artifact and decision matrices | PASS |
| lifecycle reconciliation | staged completed packet, parent-only registry, current memory and Trust parent | PASS pending exact final-head provider delivery evidence |
| Class 0 local gates | `npm run check:migrations`; `npm run check:knowledge`; `npm run test:ci-policy` (8/8); `node scripts/active-packet-registry.mjs`; `git diff --check` | PASS |

### Remaining limitations

- Architecture cannot prove demand, visual quality or implementation feasibility without
  later product/design/runtime evidence.
- Exact final-head provider checks and owner merge are required delivery boundaries;
  this record becomes current-main authority only when this exact PR head merges.
