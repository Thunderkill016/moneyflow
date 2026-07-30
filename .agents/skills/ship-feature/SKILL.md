---
name: ship-feature
description: >
  Implement a human-authorized MoneyFlow feature as the smallest vertical slice.
  Use when the owner names a product feature or an approved work packet is ready.
  Do not use this skill to select work from historical roadmaps.
---

# Skill: ship-feature (MoneyFlow)

## When to use

An explicitly approved product feature or a reviewed active work packet. For
unnamed "continue the project" requests, first apply
`docs/product/PRODUCT_DEVELOPMENT_PLAN.md` and
`docs/engineering/DEVELOPMENT_SEQUENCE.md`.

## Steps

1. Read `CLAUDE.md`, `AGENTS.md`,
   `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`,
   `docs/engineering/DEVELOPMENT_SEQUENCE.md` and the controlling packet under
   `docs/plans/active/`.
2. Revalidate the relevant GitHub issue/PR and confirm that no higher-priority
   P0/P1 or in-flight work conflicts with the slice.
3. Read product principles and non-goals; reject bank sync, AI advice, family
   finance, OCR or Inbox-as-brand without a new owner-approved specification.
4. Implement the smallest vertical slice only:
   - UI: `src/components/*` + `src/app/**/page.tsx`
   - Domain: `src/lib/*` with integer VND
   - Server: `src/app/actions/*` or `src/server/*` with auth
   - SQL: `supabase/migrations/*` only if schema needed + RLS  
5. Prefer existing patterns: AppShell, EmptyState, dynamic dialogs and
   `MoneyValue`.
6. Wire nav only if users cannot reach the feature.
7. Update the packet task and acceptance-evidence tables.
8. Run: `npm run lint && npm run typecheck && npm run test`
   (+ `npm run test:e2e` if expense path / `npm run build` if routes/layout).

## Done

- Feature reachable in UI (or pure gate script green)  
- Money rules intact (transfer ≠ expense)  
- Tests prove the change  
- No new frameworks, no AGPL paste  

## Anti-patterns

- “Confirm already works” tasks with only docs  
- Feature dump / competitor clone entire screens  
- Scope outside the reviewed packet or explicit human decision
