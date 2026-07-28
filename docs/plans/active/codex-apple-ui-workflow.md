# Codex + Apple UI workflow

**Status:** evaluating  
**Owner:** OpenAI agent  
**Issue/PR:** #105  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has one documented, repeatable UI workflow for using Codex from reconnaissance through design exploration, implementation, visual verification and independent review. The workflow translates current Apple design principles into MoneyFlow-specific rules without copying Apple platform styling or changing product scope.

## Repository reconnaissance

### Current behavior

- `AGENTS.md` already routes UI work to `docs/design-system.md`, `docs/UX_PRINCIPLES.md` and `docs/AI_UIUX_WORKFLOW.md`.
- `docs/AI_UIUX_WORKFLOW.md` already required a brief, current-screen audit, multiple directions, vertical slices and responsive evidence.
- `docs/design/CALM_LEDGER_V2.md` is the controlling 2026 visual contract.
- The existing workflow referenced Figma, Stitch, Relume and v0 but did not define an explicit Codex operating model or map Apple 2026 design principles to MoneyFlow.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Agent entrypoint and required read order | Reuse; no change needed because it already points to the UI sources of truth. |
| `docs/AI_UIUX_WORKFLOW.md` | Active UI execution workflow | Expand with Codex and Apple guidance. |
| `docs/design/CALM_LEDGER_V2.md` | Current visual/interaction authority | Reuse as a hard constraint; do not duplicate token values. |
| `docs/UX_PRINCIPLES.md` | Broader UX law and historical guidance | Reuse; avoid expanding this already-large document for an operational workflow. |
| `docs/research/` | Evidence and external research | Add a dated primary-source synthesis and index it. |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | General AI delivery lifecycle | Reuse; UI workflow remains a specialized companion. |

### Existing tests and constraints

- Related unit tests: not applicable; documentation-only change.
- Database/RLS tests: not applicable.
- Browser tests: not applicable to the documentation diff, but the workflow now makes browser and screenshot evidence mandatory for future UI work.
- Product/architecture rules: no direct commit to `main`; use a focused branch and PR; external research prefers primary sources; UI work requires mobile, accessibility, long-data and evidence.

### Similar implementation and recent history

- Existing pattern to reuse: work-packet lifecycle in `docs/engineering/AI_DELIVERY_WORKFLOW.md`.
- Existing design contract: `docs/design/CALM_LEDGER_V2.md`.
- Existing UI process: `docs/AI_UIUX_WORKFLOW.md`.

### Open questions

- [x] Should Apple guidance be copied visually? No. Apply decision principles, not platform styling.
- [x] Should Codex own design decisions? No. Codex explores and implements; the human owner selects trade-offs and merge readiness.
- [x] Should a new parallel UI workflow be created? No. Expand the existing active workflow and add a research evidence file.

## Research

### Questions researched

1. What operating practices does OpenAI recommend for Codex on non-trivial software changes?
2. How can Codex support frontend design, browser iteration and visual evidence?
3. What are Apple's current design principles and which parts transfer safely to a responsive finance web app?
4. Which Apple guidance should become explicit MoneyFlow constraints?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| OpenAI, *How OpenAI uses Codex* | 2026-07-28 | Ask mode, issue-like prompts, environment quality, `AGENTS.md`, Best-of-N. | General software workflow; MoneyFlow adds product and financial constraints. |
| OpenAI, *Introducing upgrades to Codex* | 2026-07-28 | Screenshot/wireframe context, browser inspection, frontend iteration and test evidence. | Product capabilities can evolve; workflow records the access date. |
| OpenAI, *Introducing Codex* | 2026-07-28 | Repository context, configured environments, tests and human validation. | Historical launch source but still supports the operating principles used here. |
| Apple HIG, *Design principles* and WWDC26 session | 2026-07-28 | Purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and delight. | Apple-platform guidance is translated, not copied visually. |
| Apple HIG accessibility, feedback, layout, typography and motion | 2026-07-28 | Touch targets, perceivability, adaptive layout, legibility, proportionate feedback and optional purposeful motion. | Web implementation uses CSS/browser equivalents and WCAG-compatible checks. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add a small Codex paragraph only | Minimal diff | Does not create an executable workflow or evidence model | Rejected |
| Create a separate Codex UI workflow beside the current one | Easy to write independently | Duplicates authority and causes drift | Rejected |
| Rewrite design system to look like Apple | Strong visual direction | Copies platform style, conflicts with Calm Ledger v2, encourages glass/decorative trends | Rejected |
| Expand the active workflow and add dated research evidence | One source of truth, traceable research, practical prompts/checks | Larger documentation diff | Selected |

### Research decision

Use Codex as a supervised design-and-engineering agent inside the existing MoneyFlow work-packet lifecycle. The standard path is Ask-mode reconnaissance, issue-like brief, Best-of-N structural exploration, human selection, production vertical slice, visual/browser loop and independent evaluation. Apply Apple principles as product-quality criteria, not as a visual theme.

## Specification

### Problem

The current UI workflow contains good AI design practices but does not tell Codex exactly how to operate, how the human owner selects among alternatives, or how current Apple principles translate into MoneyFlow constraints. This makes future redesign prompts vulnerable to vague output, visual trend copying and self-approved agent work.

### User stories

- As the MoneyFlow owner, I can give Codex a structured UI task so that it audits the repo and produces reviewable alternatives instead of random polished output.
- As a reviewer, I can evaluate UI work against explicit Apple-informed principles, MoneyFlow product truth and concrete evidence.
- As a future agent, I can find the current workflow and primary-source research without creating another competing process.

### Acceptance criteria

- [x] The active UI workflow contains an explicit Codex operating model from reconnaissance to delivery.
- [x] The workflow maps Apple 2026 principles to MoneyFlow-specific rules.
- [x] The workflow defines human ownership, independent evaluation and anti-patterns.
- [x] The workflow includes an issue-like Codex prompt template.
- [x] The research file records primary sources, access date, applicability and rejected alternatives.
- [x] The research index links the new evidence file and clarifies authority.
- [ ] Documentation links and knowledge checks pass in CI or a local environment.

### Required states

- Loading: not applicable to documentation.
- Empty: not applicable.
- Populated: documented UI tasks must require populated-state evidence.
- Validation/error: documented UI tasks must require validation, error and recovery evidence.
- Recovery/undo: explicitly required under agency and independent review.
- Long data / large VND: explicitly required in brief, implementation and verification.
- Mobile/tablet/desktop: explicit viewport coverage required.
- Accessibility: keyboard, focus, text scaling, touch target, reduced motion and non-color cues required.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: no runtime or data-layer change in this documentation-only work.

### Out of scope

- Redesigning or implementing a route.
- Changing Calm Ledger v2 tokens.
- Adding Apple-specific materials, Liquid Glass or platform chrome.
- Changing product, finance, API, database or deployment behavior.

## Implementation plan

### Architecture fit

`docs/AI_UIUX_WORKFLOW.md` remains the active operational source for UI work. A dated file under `docs/research/` preserves evidence and reasoning. The general AI delivery workflow and visual contract remain unchanged and are referenced rather than duplicated.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md` | Add primary-source synthesis, selected model, prompt contract and anti-patterns | Preserve research evidence and decisions. |
| `docs/AI_UIUX_WORKFLOW.md` | Add Codex-first lifecycle, Apple mapping, evidence loop and prompt template | Make the active workflow directly executable. |
| `docs/research/README.md` | Add the new research file and authority note | Improve discoverability and reduce stale-doc ambiguity. |
| `docs/plans/active/codex-apple-ui-workflow.md` | Record reconnaissance, research, scope, evidence and delivery | Follow the repository's non-trivial change contract. |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation only.
- Rollback: revert the documentation commits or close the PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Apple guidance becomes a mandate to copy Apple styling | Explicitly state principles-not-theme and reject Liquid Glass copying. |
| Workflow duplicates the general AI delivery lifecycle | Keep the UI document specialized and link to existing sources of truth. |
| Process becomes too heavy for tiny fixes | Retain task classification in `AI_DELIVERY_WORKFLOW.md`; this workflow targets non-trivial UI work. |
| Future agents cite research but ignore current product truth | Put product principles and Calm Ledger v2 at the top of the prompt template and workflow. |
| Documentation links drift | Run `npm run check:knowledge` and review links in CI/local environment. |

### Verification plan

- Static: fetch every changed file from the branch and inspect links/content; run `npm run check:knowledge` when a runnable checkout is available.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable to this diff.
- Responsive/visual: not applicable to this diff; requirements are documented for future UI PRs.
- Production/manual: no production behavior change.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Inspect current UI, design and AI workflow sources of truth | None | Repository files reviewed | done |
| T2 | Research current Codex operating practices and Apple design guidance | T1 | Primary-source research with access dates | done |
| T3 | Add research synthesis | T2 | `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md` | done |
| T4 | Expand active UI workflow | T2 | Updated `docs/AI_UIUX_WORKFLOW.md` | done |
| T5 | Update research index | T3 | Updated `docs/research/README.md` | done |
| T6 | Verify branch diff and open draft PR | T3–T5 | Branch compare and PR #105 | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Codex lifecycle is explicit | Phases 0–12 in `docs/AI_UIUX_WORKFLOW.md` | pass |
| Apple principles are translated | Apple mapping table and constraints in workflow/research | pass |
| Human ownership and independent review are explicit | Roles, selection and evaluator sections | pass |
| Prompt template exists | `Prompt template cho Codex UI task` | pass |
| Primary sources and applicability are recorded | Research source table and URLs | pass |
| Research index is updated | New row and authority note | pass |
| Knowledge checks pass | Pending CI/local runnable environment | pending |

### Review findings

- Correctness: Sources support the selected process; no runtime claims were changed.
- Security/ownership: No data or permission behavior changed; responsibility and transparency were strengthened.
- UI/UX/accessibility: Workflow now requires touch targets, focus, text scaling, reduced motion, long data and state evidence.
- Maintainability/duplication: Active workflow remains singular; research is separated from authority.
- Scope compliance: Documentation/process only; no route or token changes.

### Remaining limitations

- This change does not prove an actual route implementation; the workflow must be exercised by the next UI slice.
- `npm run check:knowledge` could not be run through the GitHub connector alone and must be confirmed by CI or a runnable checkout.

## Delivery record

- Branch: `agent/codex-apple-ui-workflow`
- PR: #105
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable before merge
- Production flow verified: not applicable; documentation only
- Work packet moved to `docs/plans/completed/`: pending merge
