# MoneyFlow — research handoff, 2026-08-28

**Status:** active evidence handoff; not implementation authority  
**Product repository baseline:** `main@6298e6c52cfff6f3a972cf72cf79022e341ce638` (PR #510)  
**Research repository baseline:** `Thunderkill016/moneyflow-research@583df3e19fb9caec39e850654274c039f0b1ccea`  
**Authority boundary:** current MoneyFlow code, tests, migrations, `CURRENT_PROJECT_MEMORY`, plan authority and owner decisions remain higher authority than this document.

## 1. Why this exists

The separate `moneyflow-research` repository now contains the larger project-intelligence corpus and its methodology. The product repository should not duplicate that corpus or treat research counts as runtime/product truth. It does need one durable pointer recording what changed, what is decision-relevant, and what must be verified before implementation.

This handoff also records the UI/design historical-failure prerequisite agreed for any future broad redesign so later agents do not restart from visual exploration and repeat known architectural failures.

## 2. External research repository — current snapshot

The current research snapshot reports:

- 785 canonical posts;
- 13,671 canonical comments;
- 14,456 searchable analysis records;
- 182 strong financial/user-evidence comments;
- 572 posts with `commentCoverage=not_collected`.

The research repository explicitly treats the corpus as a **project-intelligence evidence base**, not only a feature-demand dataset. Product/user evidence and reusable project knowledge are separate interpretation lanes. Machine routing tags support retrieval and coverage analysis; they are not prevalence or confidence scores.

Current strongest adjudicated product signals inside that corpus are:

- manual-entry / quick-capture burden;
- habit and maintenance burden;
- bank/import interest;
- acquisition automation;
- UX simplicity;
- AI/natural-language capture as a means to reduce capture friction rather than the primary product thesis;
- trust, reconciliation and data integrity as product concerns rather than backend-only concerns.

### Applicability limit

These signals reinforce the merged #432 direction toward reducing trusted acquisition maintenance. They do **not** authorize bank/provider integration, AI mutation, auto-approval, broader matching semantics or a new roadmap item by themselves. The sample remains concentrated in tech-skewed Vietnamese communities, so market-generalization confidence is limited.

Before using a research recommendation in MoneyFlow implementation, verify it against current product behavior, code/tests, active plan authority, privacy/security constraints and owner decisions.

## 3. Corpus integrity rules worth preserving across project decisions

The research repository now records a stable-identity-first ingestion and deduplication contract. The project-level lessons that matter outside the research repo are:

1. source identity outranks text similarity;
2. repeated acquisition of the same source is another observation, not another independent evidence unit;
3. independent users saying similar things remain independent evidence;
4. fuzzy/semantic similarity is candidate-only unless identity is explicitly proven;
5. missing comments are unknown, not zero;
6. expensive adjudication should focus on genuinely new corpus deltas;
7. raw copyrighted/PII-bearing source dumps do not belong in the Git repository;
8. research findings never outrank runtime evidence for what MoneyFlow actually does.

These are research/evidence rules only. They do not change ledger matching, provenance or runtime dedup semantics.

## 4. Mandatory A0 before any future broad UI/brand redesign

Broad redesign remains parked. When it is deliberately resumed, the first phase is **A0 — UI/Design Historical Failure Review**. Do not start with Figma, colors, visual territories or a new design-system implementation.

A0 must reconstruct at least:

- the P0–P11 UI migration history;
- PRs #319, #321, #322, #336, #337, #339 and #340;
- Calm Ledger / Fresh Blue / earlier brand-direction conflicts;
- CSS ownership and deleted/legacy presentation layers;
- design-token compilation/runtime behavior;
- demo versus authenticated browser-test architecture;
- first-paint, retry-pass and interaction findings;
- primitive blast-radius failures and recovery cost.

For each finding record:

`Symptom → root cause → why existing process missed it → cost → repair → permanent prevention`.

### Known failure classes that A0 must preserve

- **Presentation ownership gap:** code emitted presentation classes with no stylesheet owner; visual behavior failed while incomplete CSS checks remained green.
- **Token/runtime gap:** semantic utilities existed in source but were not generated in the production CSS bundle; source inspection was insufficient proof.
- **Cascade blast radius:** shared theme/token repair exposed higher-priority legacy rules and contrast regressions elsewhere.
- **Wrong runtime-state testing:** authenticated-labelled browser coverage could still execute demo mode, producing false-green evidence.
- **Screenshot ≠ interaction proof:** first-paint races and persistence timing defects survived attractive steady-state screenshots.
- **Legacy accumulation:** compatibility/presentation layers survived too long and made later migration materially more expensive.
- **Brand/design authority drift:** product UI migration moved faster than stable brand/product direction, forcing avoidable rework.
- **Multiple source-of-truth drift:** brand docs, design docs, runtime CSS and aliases could disagree while each looked locally plausible.

## 5. Guardrails future redesign must derive from A0

Where machine-checkable, lessons must become executable gates rather than a prose-only postmortem. Candidate guardrails include:

- one canonical brand authority for global brand primitives;
- one semantic-token owner per concept;
- code → CSS and CSS → code presentation ownership checks;
- source token → production bundle → computed style → rendered component proof for shared token changes;
- representative-consumer blast-radius tests for primitive changes;
- risk-selected runtime matrix across demo/authenticated, light/dark, phone/desktop and empty/content states;
- retry-pass classified as a finding until the first failure is explained;
- replace-and-retire migration slices rather than adding another permanent compatibility layer;
- no broad redesign approval while brand/product authority is still contradictory.

The exact gates must be specified from the forensic review and current architecture; this document does not pre-authorize new CI machinery.

## 6. Redesign sequence when deliberately resumed

The parked sequence is:

1. historical failure postmortem;
2. current product-reality audit;
3. fresh problem-based product research;
4. product-experience architecture;
5. brand strategy;
6. genuinely different visual territories;
7. owner identity selection;
8. brand authority lock;
9. design-system definition;
10. primitive/runtime proof;
11. vertical-slice UI migration with same-slice legacy retirement;
12. physical-device and real-use validation;
13. final legacy/consistency sweep.

Optimization target: **avoid another redesign caused by architecture/process failure**, not maximum redesign speed.

## 7. Retrieval pointers

Primary external evidence:

- `Thunderkill016/moneyflow-research/README.md`
- `Thunderkill016/moneyflow-research/decisions/2026-08-28-project-intelligence-corpus-policy.md`
- `Thunderkill016/moneyflow-research/docs/product/2026-08-28-community-corpus-decision-intelligence.md`
- `Thunderkill016/moneyflow-research/docs/engineering/2026-08-28-research-corpus-ingestion-and-dedup.md`

MoneyFlow-side history/evidence:

- `docs/research/UI_UX_RESEARCH_LEDGER.md`
- `docs/context/README.md`
- current code/tests and named PR provenance only when the question requires it.

## 8. Execution impact

**Status impact:** none.  
**Lifecycle impact:** none.  
**Next-work impact:** none. No agent-executable slice is selected or promoted by this handoff.
