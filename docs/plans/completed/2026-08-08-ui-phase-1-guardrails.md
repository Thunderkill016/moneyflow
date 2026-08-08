# MoneyFlow UI migration — Phase 1 no-new-debt guardrails — completed

**Status:** accepted
**Archived:** 2026-08-08
**Implementation PR:** #298
**Merge:** `8688d95160579eacb908f0162994edba4901fc0c`

Phase 1 added diff-based guardrails preventing new global stylesheet debt, unreviewed `!important`, undefined tokens, stale `/insights` references and known legacy class registration while allowing existing debt to be migrated incrementally.

Storybook adoption remained deferred because existing tests and Playwright evidence were sufficient for the bounded migration.

Current program closure is `docs/plans/completed/2026-08-08-ui-system-migration.md`.