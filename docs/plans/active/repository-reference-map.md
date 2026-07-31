# Repository reference map

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #176  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow has one maintained research index that maps useful open-source repositories to the exact product, architecture, security, UI and verification areas they can inform. Future feature work can select a small evidence set instead of browsing GitHub without a decision question or copying another product's scope.

## Repository reconnaissance

### Current behavior

- External repository research exists across historical discussions and research notes, but there is no single active map for feature agents.
- The authoritative product and architecture documents require research before unresolved external/product decisions and prohibit external sources from overriding current MoneyFlow boundaries.
- The current README points contributors to product, architecture, research and work-packet sources but does not identify which external repositories are useful for each system area.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `README.md` | Defines source-of-truth entrypoints and delivery workflow | Reuse; no change required |
| `ARCHITECTURE.md` | Defines modular-monolith boundaries and financial invariants | Reuse as authority |
| `docs/MVP_DEFINITION.md` | Locks current product scope and non-goals | Reuse as authority |
| `docs/research/` | Existing home for external research evidence | Add the reference map here |
| `docs/templates/FEATURE_WORK_PACKET.md` | Defines how feature research is recorded | Reuse and link conceptually |

### Existing tests and constraints

- Related unit tests: not applicable; documentation-only.
- Database/RLS tests: not applicable; no schema or policy change.
- Browser tests: not applicable; no runtime or UI change.
- Product/architecture rules: external repositories do not override MoneyFlow sources of truth; avoid speculative layers and feature expansion.

### Similar implementation and recent history

- Existing pattern to reuse: focused research documents under `docs/research/` and source tables inside work packets.
- Relevant decision: MoneyFlow is a Next.js/Supabase modular monolith, not a generic fintech platform.

### Open questions

- [x] Which project areas require separate source groups?
- [x] How should agents choose sources without browsing everything?
- [x] How should license and scope risks be recorded?

## Research

### Questions researched

1. Which open-source finance applications best inform ledger behavior, capture, import, budgets, recurring obligations, goals and reports?
2. Which infrastructure repositories are useful for Supabase RLS, money correctness, accessibility, PWA behavior, testing, security and observability?
3. How can MoneyFlow use these sources without cargo-culting monorepos, microservices or non-MVP products?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `actualbudget/actual` | 2026-08-01 | Local-first finance, reconciliation, budgeting and import reference | Its sync, desktop and monorepo architecture are not current requirements |
| `firefly-iii/firefly-iii` | 2026-08-01 | Mature ledger, transfer, rules, recurring and reporting behavior | Broader and more accounting-heavy than MoneyFlow |
| `mayswind/ezbookkeeping` | 2026-08-01 | Mobile/PWA bookkeeping, import and reporting patterns | Many advanced features are outside MVP |
| `moneymanagerex/moneymanagerex` | 2026-08-01 | Reconciliation, schedules and data portability | Desktop architecture does not apply |
| Supabase, pgTAP, Playwright and OWASP repositories | 2026-08-01 | Current backend, database verification, browser evidence and security references | Must be applied through MoneyFlow's existing boundaries |
| Focused UI, import, money, PWA and supply-chain repositories listed in the map | 2026-08-01 | Implementation alternatives for bounded needs | A listing is not approval to add a dependency |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep research only in conversations | No repository maintenance | Lost context, repeated research and unverifiable agent choices | Rejected |
| Maintain one unstructured list of finance apps | Simple | Misses security, testing, import and architecture sources | Rejected |
| Add every discovered repository | Broad coverage | Noise, stale links and scope growth | Rejected |
| Maintain a domain map with usage boundaries | Actionable, reviewable and compatible with work packets | Requires occasional review | Selected |

### Research decision

Create one active reference map organized by MoneyFlow system area. Each feature packet should select two to four repositories, state the research question, record what applies and explicitly note what does not. Code reuse still requires license and dependency review.

## Specification

### Problem

Without a maintained source map, feature agents either repeat broad GitHub searches, rely on stale conversation context or imitate a large finance application without proving fit. This increases scope, architecture and correctness risk.

### User stories

- As the MoneyFlow owner, I can see which repositories are worth studying for each part of the product.
- As an implementation agent, I can select a bounded research set and explain why it applies.
- As a reviewer, I can reject cargo-cult architecture or dependencies that are not supported by the product scope.

### Acceptance criteria

- [x] One document maps product and infrastructure repositories by MoneyFlow area.
- [x] Each area states what to learn and important non-applicable boundaries.
- [x] The document defines how many references a feature packet should select.
- [x] Current and deferred research priorities are explicit.
- [x] The map does not change runtime, schema, dependencies or product scope.

### Required states

- Loading: not applicable.
- Empty: not applicable.
- Populated: the document covers all current MVP system areas.
- Validation/error: links and claims must be reviewed when used by a feature packet.
- Recovery/undo: revert the documentation commit.
- Long data / large VND: financial invariant references explicitly preserve integer VND.
- Mobile/tablet/desktop: not applicable to this documentation change.
- Accessibility: not applicable to rendered product UI.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none; the map reinforces RLS and server-derived identity requirements.

### Out of scope

- Adding dependencies.
- Copying source code from referenced repositories.
- Implementing any listed feature.
- Changing MVP scope or architecture.
- Measuring repository popularity.

## Implementation plan

### Architecture fit

External research belongs under `docs/research/`. The map is advisory evidence beneath the authoritative product and architecture documents. It does not introduce a runtime layer or dependency.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/REPOSITORY_REFERENCE_MAP.md` | Add the domain-organized reference map and usage rules | Preserve research context and bound future source selection |
| `docs/plans/active/repository-reference-map.md` | Record discovery, decision, scope and delivery evidence | Follow the repository's non-trivial change workflow |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation only.
- Rollback: revert the commits or close the PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| The map becomes an unofficial roadmap | State that MVP and product documents remain authoritative |
| Agents copy large-project architecture | Record non-applicable boundaries for each major source |
| The list grows without value | Require new sources to add evidence not already covered |
| Stale or archived repositories remain trusted | Require review when a source is used or materially changes |
| Copyleft code is copied into MoneyFlow | Require license review before code reuse |

### Verification plan

- Static: inspect Markdown structure, links and consistency with `ARCHITECTURE.md` and `docs/MVP_DEFINITION.md`.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable; documentation does not change deployment behavior.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit current product, architecture and MVP boundaries | none | authoritative documents reviewed | done |
| T2 | Group useful repositories by MoneyFlow system area | T1 | reference-map sections | done |
| T3 | Add source-selection, license and scope guardrails | T2 | usage and evaluation rules | done |
| T4 | Create branch, commit documents and open draft PR | T1–T3 | branch `agent/repository-reference-map`, PR #176 | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Domain-organized source map exists | `docs/research/REPOSITORY_REFERENCE_MAP.md` | pass |
| Usage boundaries are explicit | Purpose, source labels, evaluation and deferred sections | pass |
| Current scope remains authoritative | Purpose and deferred-scope statements | pass |
| No runtime change | Documentation-only diff | pass |

### Review findings

- Correctness: source groups match the current MoneyFlow domain and stack.
- Security/ownership: RLS, tenant isolation and auth references are explicit.
- UI/UX/accessibility: focused source groups exist without introducing UI changes.
- Maintainability/duplication: one index replaces repeated unstructured browsing.
- Scope compliance: no product feature, dependency or architecture expansion.

### Remaining limitations

- Repository maintenance and licenses can change; each source must be rechecked when used for an implementation decision.
- The map intentionally does not rank repositories by stars or popularity.

## Delivery record

- Branch: `agent/repository-reference-map`
- PR: #176
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after merge according to repository process
