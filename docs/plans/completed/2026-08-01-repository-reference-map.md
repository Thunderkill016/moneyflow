# Repository reference map

**Status:** completed  
**Owner:** ChatGPT  
**Issue/PR:** #176  
**Completed:** 2026-08-01

## Outcome

MoneyFlow now maintains `docs/research/REPOSITORY_REFERENCE_MAP.md`, organized by product and implementation area. Future work selects a bounded evidence set instead of browsing or copying repositories without a decision question.

## Decisions preserved

- External repositories are advisory evidence and cannot override `ARCHITECTURE.md`, product principles or the MVP definition.
- A feature packet should select two to four directly relevant repositories by default.
- Each source must record what applies, what does not apply and any license or scope risk.
- A listed repository is not approval to add a dependency or copy code.

## Acceptance evidence

- Product and infrastructure sources are mapped by MoneyFlow system area.
- Applicability and anti-cargo-cult boundaries are explicit.
- Runtime, schema, dependencies and product scope were unchanged.

## Delivery record

- Branch: `agent/repository-reference-map`
- PR: #176
- Squash commit: `eaee207ea8683c0163445aea09772f5c475322b2`
- Production deployment: not applicable
- Primary artifact: `docs/research/REPOSITORY_REFERENCE_MAP.md`
