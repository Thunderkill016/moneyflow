# Quickstart: verify MFVN-003

## Before editing

1. Read `.cyclewarden/assessment.json`, `.cyclewarden/status.json` and the `MFVN-003` roadmap entry.
2. Read `docs/product/PRINCIPLES.md`, `ARCHITECTURE.md`, issue #81 and `.specify/memory/constitution.md`.
3. Review `src/app/globals.css`, `src/components/landing-page.tsx`, `src/components/landing-page.module.css`, `src/components/auth-form.tsx` and `src/components/auth-form.module.css`.
4. Confirm no later Calm Ledger route is included.

## Focused implementation sequence

```text
T001 token/override inventory
→ T002 smallest token consolidation
→ T003 landing first viewport
→ T004 auth presentation
→ T005 focused static/build checks
→ T006 responsive/browser evidence
→ owner acceptance
```

Only one task is active at a time. Do not begin the next task when the current task fails checks or reveals scope conflict.

## Required checks

Run checks proportional to the actual diff:

```bash
npm run check:knowledge
npm run check:deployment-env
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:ui-audit:pr
```

The full UI audit is required before MFVN-003 acceptance because the specification explicitly covers phone, tablet, desktop, dark mode, WebKit, keyboard and 200% text entry states.

`npm run test:db` is not required for a presentation-only patch. If the diff touches migrations, RLS, ownership or database behavior, stop: the feature has escaped its approved scope.

## Manual review checklist

- First viewport states the manual-first ledger purpose without scrolling.
- One CTA is visually dominant.
- Secondary action remains usable but subordinate.
- Login/register/recovery copy is calm, factual and Vietnamese.
- No safe-to-spend or unsupported recommendation appears.
- Authenticated runtime does not advertise unavailable demo behavior.
- Brand green and semantic income/success are understandable without color alone.
- No horizontal overflow at required widths.
- Focus remains visible and logical.
- 200% text does not hide the primary action.
- No new global override layer or second token source exists.
- Diff contains no finance, storage, schema, RLS or export behavior change.

## Completion report

Record:

- task ID completed;
- exact files changed;
- commands actually run and their results;
- screenshot/audit artifact locations;
- unresolved compatibility aliases or risks;
- anything intentionally left for MFVN-004 or later;
- owner acceptance or rejection.
