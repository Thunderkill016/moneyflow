# Phase D — Brand Strategy

**Status:** accepted/completed
**Execution state:** complete
**Completed role:** bounded brand-strategy record
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #368; exact final-head provider checks and owner merge required
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. Phase D turns Phase A's
executable-current map, Phase B's mechanism research, Phase C's locked product
experience architecture and A0's failure guardrails into one MoneyFlow brand strategy.
It makes **no** visual, palette, typography, iconography, motion, layout, component,
Design Harness or implementation choice, and it selects no creative territory.

## Outcome

A later phase can use `docs/research/PHASE_D_BRAND_STRATEGY.md` to create three
genuinely distinct creative territories without re-deriving who MoneyFlow is for, what
it promises, why that promise is credible, how it must speak, or what it must never
become — and without an old named direction, palette or screenshot silently returning
as authority.

## Repository reconnaissance

### Current behavior

- Phase C is accepted/completed and merged at `main@4ba1864`; its architecture is the
  locked product-experience input for Phase D.
- MoneyFlow remains a Vietnamese manual-first, integer-VND ledger with explicit demo
  and authenticated modes, transfer neutrality, recoverable destructive actions, and a
  complete-backup versus scoped-export boundary.
- Existing brand and design material is extensive and of mixed status:
  `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` (v1.1) holds a real brand foundation;
  `docs/design/CALM_LEDGER_V2.md` self-declares historical; `SIGNAL_LEDGER_V3.md` is a
  rejected direction per `DESIGN_DIRECTION_STATUS.md`; Fresh Blue is the **current
  shipped colour implementation**, which the owner released as a Phase E exploration
  constraint on 2026-08-13 while leaving it in force for shipped surfaces.
- The physical-phone run is **accepted** (PBT-AC12): PP-03, PP-12 and PP-16 pass on a
  real device, PP-12 after #358, with PP-07 a functional pass and PP-01 parked.
- What still bounds the brand: hosted restore has never run against a live account; no
  aggregate yet links to the records behind it (Phase C: ADAPT LATER); and direct CSV
  import writes approved rows without the Inbox review queue.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| Phase C architecture | locked jobs, surfaces, invariants, aggregate contract | brand's product-truth authority; not re-derived |
| Phase A audit | what the product actually is today | claim boundary |
| Phase B research | product mechanisms worth learning | mechanism input only |
| A0 review | failure guardrails | source of trust breakers |
| `docs/product/PRINCIPLES.md`, `docs/MVP_DEFINITION.md` | product law | outer bound of every promise |
| `docs/brand/`, `docs/design/` | historical brand/design material | INPUT only; explicit promotion list, nothing implicit |
| `docs/research/CURRENT_PROJECT_MEMORY.md`, P3 records | current capability and real-device evidence | proof architecture and its caveats |

### Existing tests and constraints

- Documentation-only Class 0 local gates and active-registry validation are required.
- No runtime/source/assets/UI/CSS/route/Design Harness/provider/production/database/Auth
  modification is in scope.
- Phase E Creative Territories is the immediate next phase; it is not started, has no
  packet, and no territory has been proposed or selected.

## Research

Deliberately narrow and mechanism-focused: two first-party Vietnamese App Store
listings plus one vendor site, read for what is promised, to whom, and what proof is
offered — not for UX patterns or aesthetics. Sources and their exact findings are in
§17 of the durable artifact.

| Source | Establishes | Does not cover |
|---|---|---|
| Sổ Thu Chi MISA listing (first-party, VN) | sampled category messaging: effortlessness, quantified savings, institutional scale as trust proof | market rank, share or install base; whether users believe it; internal quality |
| Money Lover listing and site (first-party) | sampled category messaging: bank-linking breadth, automatic categorisation, budgets, reminders | the same |

The strategic consequence, recorded as a decision rather than a source fact: MoneyFlow
can match neither automation nor institutional scale, so its trust must be
demonstrated per record rather than borrowed — which makes traceability and
reversibility the only defensible brand mechanism.

Licence, privacy and ownership implications: none. Public first-party marketing text
was read and cited; no user data, no scraping of private surfaces, nothing copied into
the product.

## Specification

### Problem

MoneyFlow has locked product architecture and rich but mixed-status brand material.
Without one current brand authority, a later creative phase would either re-derive
strategy under time pressure, or inherit a rejected direction, an old palette or an
unevidenced audience story by default — the exact failure A0 exists to prevent.

### Acceptance criteria

- [x] **D-AC1** One durable `PHASE_D_BRAND_STRATEGY.md` exists with all seventeen
      required sections.
- [x] **D-AC2** Audience is behavioural, and unsupported demographic or narrative
      claims are named as unevidenced rather than adopted.
- [x] **D-AC3** Brand role is chosen from product truth and is compatible with
      manual-first, trustworthy history, transparent scope, recoverability and
      optional planning.
- [x] **D-AC4** Positioning follows the required structure and anchors on a failure
      mode, not a competitor name.
- [x] **D-AC5** One primary promise plus supporting promises, each with proof, benefit
      and a prohibited overclaim.
- [x] **D-AC6** Differentiation separates table-stakes, differentiators and
      anti-differentiators; manual entry is a differentiator only through provenance.
- [x] **D-AC7** Trust strategy states explicit builders and breakers, grounded in real
      observed failures.
- [x] **D-AC8** Emotional transformation is stated as mechanism, not atmosphere.
- [x] **D-AC9** Personality traits are behaviourally testable and each carries a NOT.
- [x] **D-AC10** Verbal strategy is Vietnamese-first with SAY/AVOID guidance and no
      full copy library.
- [x] **D-AC11** Controlled vocabulary distinguishes every concept the mission names,
      without closing Phase C's open labels.
- [x] **D-AC12** Anti-positioning is explicit; additions are product-truth justified.
- [x] **D-AC13** Every load-bearing claim has proof, limitation and change risk. An
      independent evaluation checked each against shipped code; two overstatements —
      aggregate drill-down and "every row was typed" — were corrected rather than kept.
- [x] **D-AC14** Phase E brief locks strategy and leaves every visual question open.
- [x] **D-AC15** No creative territory is named, proposed, implied or selected.
- [x] **D-AC16** Lifecycle reconciled in this same delivery: baseline `4ba1864`, stale
      `#367` pre-merge wording retired, Phase C remains accepted/completed, Phase E is
      next and unopened, PBT-AC15 open.

### Out of scope

Creative territory selection or naming, palette, typography, iconography,
illustration, visual metaphor, logo, screens, wireframes, components, Design System
v3, CSS/UI/route implementation, Design Harness, CI, provider/production/database/Auth
writes, and starting Phase E.

## Implementation plan

1. reconcile the merged Phase C baseline and deliberately activate Phase D;
2. read product law, Phase A/B/C, A0 and all brand/design material, separating current
   authority from historical input;
3. perform bounded first-party category research on brand mechanism only;
4. decide audience, role, positioning, promise, differentiation, trust, emotion,
   personality, verbal strategy, vocabulary, anti-positioning and proof architecture;
5. write the durable artifact and the Phase E brief;
6. fresh evaluation, Class 0 gates, PR delivery.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| D-T1 | reconcile merged Phase C baseline and activate Phase D | `main@4ba1864` | this packet, registry, current memory, Trust parent | complete |
| D-T2 | separate current brand authority from historical input | D-T1 | promotion list in artifact §17 | complete |
| D-T3 | bounded first-party category mechanism research | D-T1 | artifact §17 source ledger | complete |
| D-T4 | decide and record the full brand strategy | D-T2, D-T3 | `docs/research/PHASE_D_BRAND_STRATEGY.md` | complete |
| D-T5 | fresh evaluation, Class 0 gates and PR delivery | D-T4 | fresh evaluator; `check:migrations`, `check:knowledge`, `test:ci-policy`, registry guard, `git diff --check`; PR memory | complete locally — exact final-head provider checks and owner merge remain delivery requirements |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | brand strategist | human_owner | accepted/completed | merged Phase C at `main@4ba1864`; durable Phase D strategy; bounded first-party source ledger; staged lifecycle | strategy cannot prove market response or creative feasibility; hosted restore and the physical retest remain open and bound what the brand may claim | after merge, separately open Phase E Creative Territories only when authorised |

### Current permission boundary

- Granted scope: one documentation branch and read-only repository plus public
  first-party source evidence.
- Forbidden writes: runtime/source/assets/UI/CSS/routes/Design Harness, CI, providers,
  production, database, Auth, and any Phase E packet or territory.
- Stop condition: a decision needs a visual choice, a creative territory, a runtime
  change, new product data or a product-scope exception; leave it as a Phase E+
  question.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| strategy grounded in product truth | every claim in §13 mapped to executable proof and a limitation; an independent evaluation checked each against shipped code and two claims were corrected rather than kept | PASS |
| no visual decision | artifact contains no palette, type, metaphor, icon or layout choice; §15 leaves all of them open | PASS |
| historical material contained | explicit promotion list; Signal Ledger rejected, Calm Ledger historical, Fresh Blue correctly treated as current shipped truth rather than history, with the owner's 2026-08-13 exploration release recorded | PASS |
| audience honesty | behavioural only; abandonment story and demographics named unevidenced | PASS |
| lifecycle reconciliation | staged completed packet, parent-only registry, current memory, Trust parent, `#367` wording retired | PASS pending exact final-head provider delivery evidence |
| Class 0 local gates | `npm run check:migrations`; `npm run check:knowledge`; `npm run test:ci-policy`; `node scripts/active-packet-registry.mjs`; `git diff --check` | PASS |

### Remaining limitations

- Brand strategy cannot prove market response, user comprehension or creative
  feasibility; those need later evidence.
- The audience definition rests on product law and architecture, not user research.
  It is a coherent target, not a measured population.
- Three product facts bound the brand today: hosted restore is unproven; no aggregate
  yet links to its records, so the traceability half of the primary mechanism is a
  target rather than a shipped behaviour; and direct CSV import writes approved rows
  without the Inbox review queue. The physical-phone run itself is accepted.
- Exact final-head provider checks and owner merge are required delivery boundaries;
  this record becomes current-main authority only when this exact PR head merges.
