# Phase E — Creative Territories

**Status:** active — **awaiting owner territory selection**
**Execution state:** delivered for owner review; not accepted
**Active role:** human_owner (selection); creative strategist (delivery)
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #369
**Last updated:** 2026-08-13

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. Phase E turns Phase D's locked brand
strategy into **three genuinely distinct candidate creative territories** for the owner
to choose between. It selects no territory, chooses no production palette or typeface,
and makes no runtime, CSS, token, component, Design System or Design Harness change.

**This packet stays active until the owner selects a territory.** It must not be marked
accepted/completed before then.

## Outcome

The owner can compare three materially different visual/creative interpretations of the
same locked strategy — differing in interpretive stance rather than decoration — and
select one, with each territory's risks, accessibility exposure and migration cost
stated plainly enough to make the choice a real one.

## Repository reconnaissance

### Current behavior

- Phase D Brand Strategy is accepted/completed in merged #368 at `main@55ee401`. Its
  §14 locks and §16 creative brief are the binding input.
- Phase C Product Experience Architecture (merged #367) fixes jobs, surfaces and the
  aggregate contract; Phase E changes no information architecture.
- A0 records why prior UI directions failed and names what may not become v3 authority.
- `docs/design/DESIGN_DIRECTION_STATUS.md` carries the owner's 2026-08-13 decision:
  Phase E **may** explore outside Fresh Blue, while Fresh Blue remains the current
  shipped colour implementation until a later owner-selected territory and an approved
  migration supersede it.
- Prior directions and their theses, read specifically so they cannot return under a new
  name: Calm Ledger v2 (neutral card system carrying one accent) is historical; Signal
  Ledger v3 (warm paper canvas, editorial register, attention-triage decision system) was
  rejected on 2026-08-02.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/PHASE_D_BRAND_STRATEGY.md` | locked strategy | binding; not revisited |
| `docs/research/PHASE_C_PRODUCT_EXPERIENCE_ARCHITECTURE.md` | jobs, surfaces, aggregate contract | constrains product implications |
| `docs/research/A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md` | failure guardrails, non-authority list | constrains every territory |
| `docs/design/DESIGN_DIRECTION_STATUS.md` | owner colour decision | read; not modified by Phase E |
| `docs/design/CALM_LEDGER_V2.md`, `SIGNAL_LEDGER_V3.md` | prior theses | read to avoid recreating; never authority |
| `docs/design/CURRENT_DESIGN_SYSTEM.md`, `BRAND_COLOR_SYSTEM.md` | shipped implementation truth | reference only; unchanged |

### Existing tests and constraints

- Documentation-only Class 0 local gates and active-registry validation.
- No runtime/source/assets/UI/CSS/token/component/route/Design Harness/CI/provider/
  production/database/Auth modification is in scope.
- Phase F does not start and has no packet; it is conditional on owner selection.

## Research

Mechanism-first and deliberately narrow: four mechanisms from first-party financial
software documentation and one typographic constraint. Full ledger with what each
establishes and what must not be copied is §3 of the durable artifact.

| Source | Mechanism established | Not to copy |
|---|---|---|
| Oracle General Ledger; Microsoft Dynamics 365 | a balance is a collapsed view of the journals beneath it; drill-down is the trust structure | enterprise density, accounting terminology, accounting-software identity |
| Microsoft Business Central | provenance as an attribute carried on the record; audit codes trace to origin | **immutability** — MoneyFlow deliberately allows edit, soft delete and undo |
| Plain-text accounting (Ledger, Beancount) | history as a sequence of states; correction as a visible event, "unlimited undo" | the file/CLI interface and developer aesthetics |
| Google Fonts knowledge; Unicode combining marks | Vietnamese stacks tone marks over vowel diacritics and needs vertical headroom | nothing aesthetic — this is a constraint |

Evidence limitation recorded in the artifact: the Google Fonts pages are
JavaScript-rendered and could not be fetched for direct quotation, so the diacritic
finding rests on a search summary and must be confirmed by rendering real Vietnamese
before any typeface is adopted.

Licence, privacy and ownership implications: none. Public first-party documentation was
read and cited; no competitor screenshot, palette, typeface or layout was copied.

## Specification

### Problem

Phase D locks what MoneyFlow means but deliberately leaves every visual question open.
Without three genuinely different candidates, the owner's choice would be between
variations of what already ships — and the two prior failed directions show how easily a
single inherited aesthetic becomes the default by omission.

### Acceptance criteria

Delivery criteria are met; **acceptance of the phase itself requires the owner's
selection** and is deliberately unticked.

- [x] **E-AC1** Exactly three territories exist, each with all seventeen required
      elements.
- [x] **E-AC2** They differ in interpretive stance — collection/spatial,
      object/attestational, timeline/temporal — not in accent colour.
- [x] **E-AC3** Every territory preserves the Phase D locks in §2 of the artifact.
- [x] **E-AC4** Neither Calm Ledger's nor Signal Ledger's thesis returns under a new
      name; each territory records what it refuses to copy.
- [x] **E-AC5** Fresh Blue is treated correctly: not mandatory, not retired, still the
      shipped implementation. One territory stays close to it and two do not.
- [x] **E-AC6** Every reference separates the observed fact, the transferable mechanism
      and what must not be copied.
- [x] **E-AC7** Each territory shows money remaining distinguishable without colour
      alone, on at least two non-chromatic channels.
- [x] **E-AC8** Vietnamese diacritic and string-length risk is assessed per territory,
      with verification required before any typeface is adopted.
- [x] **E-AC9** A comparison matrix covers all twelve required criteria and ranks
      nothing.
- [x] **E-AC10** An owner decision pack gives, per territory, the strongest reason for,
      the strongest reason against, and what selection commits to.
- [x] **E-AC11** No palette value, typeface, component, screen or token is specified.
- [ ] **E-AC12** **Owner selects one territory.** Open — this is what closes Phase E.

### Out of scope

Territory selection, Phase F, Brand v3, Design System changes, Design Harness changes,
palette or token values, typeface selection, iconography or illustration production,
wireframes, screens, components, CSS or route implementation, CI changes, and any
provider/production/database/Auth write.

## Implementation plan

1. reconcile the merged Phase D baseline and deliberately activate Phase E;
2. read the locked strategy, architecture, failure guardrails, colour decision and both
   prior theses;
3. research trust mechanisms in first-party financial software documentation;
4. derive three territories from three different mechanisms;
5. compare them without ranking and write the owner decision pack;
6. fresh evaluation, Class 0 gates, PR delivery for owner review.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| E-T1 | reconcile merged Phase D baseline and activate Phase E | `main@55ee401` | this packet, registry, memory, Trust parent | complete |
| E-T2 | read locks, architecture, guardrails and prior theses | E-T1 | §2 and §17 refusals in the artifact | complete |
| E-T3 | mechanism research with first-party sources | E-T1 | §3 reference ledger | complete |
| E-T4 | define three territories | E-T2, E-T3 | §§4–6 | complete |
| E-T5 | comparison, accessibility and migration analysis | E-T4 | §§7–9 | complete |
| E-T6 | owner decision pack | E-T5 | §10 | complete |
| E-T7 | fresh evaluation, Class 0 gates, PR delivery | E-T6 | evaluator; `check:migrations`, `check:knowledge`, `test:ci-policy`, registry guard, diff hygiene | complete locally — exact final-head provider checks and owner review remain delivery requirements |
| E-T8 | **owner selects a territory** | E-T7 | owner decision | **awaiting owner** |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-13 | creative strategist | human_owner | delivered, not accepted | merged Phase D at `main@55ee401`; three territories, comparison matrix, decision pack | no territory validated with users or rendered in Vietnamese; C depends on product capability that does not exist; the diacritic source could not be quoted directly | owner selects one territory, or asks for a recommendation |

### Current permission boundary

- Granted scope: one documentation branch and read-only repository plus public
  first-party source evidence.
- Forbidden writes: runtime/source/assets/UI/CSS/tokens/components/routes, Design System,
  Design Harness, CI, providers, production, database, Auth, and any Phase F packet.
- Stop condition: a decision would select a territory, fix a palette or typeface, or
  begin implementation. Leave it for the owner or for Phase F.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| three distinct stances | collection/spatial, object/attestational, timeline/temporal, with different composition, motion and money treatment | PASS |
| prior directions contained | Calm Ledger's card-plus-accent thesis and Signal Ledger's warm-paper/editorial/triage thesis each explicitly refused | PASS |
| Fresh Blue handled correctly | not mandatory, not retired, still shipped; one territory near it, two away | PASS |
| money without colour | two or more non-chromatic channels per territory, tabulated in §8 | PASS |
| no selection, no implementation | OWNER SELECTION: PENDING; no palette value, typeface, component or token | PASS |
| Class 0 local gates | `check:migrations`; `check:knowledge`; `test:ci-policy`; `node scripts/active-packet-registry.mjs`; `git diff --check` | PASS |
| phase acceptance | requires owner selection | **NOT MET — intentionally open** |

### Remaining limitations

- No territory has been validated with users, rendered in Vietnamese, or tested at a
  real row height. Every legibility judgement here is reasoned, not measured.
- Territory C's full expression depends on user-facing amendment history, which is not a
  current product capability.
- The Vietnamese diacritic source could not be fetched for direct quotation; it must be
  confirmed by rendering before any typeface is adopted.
- Build-cost estimates are relative and unvalidated by implementation spike.
- Phase E cannot prove that any territory will be perceived as intended; only owner
  judgement and later evidence can.
