---
name: ship-feature
description: >
  Implement the next MoneyFlow MVP item from IDEA.md (smallest vertical slice).
  Use when building product features, screens, quality-bar items, or /ship-feature.
  Adapted from Shipkit ship-feature for this monorepo (Next app in src/).
---

# Skill: ship-feature (MoneyFlow)

## When to use

New product feature, screen polish with user value, or next unchecked item in `IDEA.md`.

## Steps

1. Read `IDEA.md` — pick the **next unchecked** Quality bar item (or user-named item).  
2. Read `AGENTS.md` + G5 non-goals — refuse bank sync / AI / family / inbox brand.  
3. Smallest vertical slice only:
   - UI: `src/components/*` + `src/app/**/page.tsx`
   - Domain: `src/lib/*` with integer VND
   - Server: `src/app/actions/*` or `src/server/*` with auth
   - SQL: `supabase/migrations/*` only if schema needed + RLS  
4. Prefer existing patterns: AppShell, EmptyState, dynamic dialogs, `formatMoney`.  
5. Wire nav only if users cannot reach the feature.  
6. Check the box in `IDEA.md` when done.  
7. Run: `npm run lint && npm run typecheck && npm run test`  
   (+ `npm run test:e2e` if expense path / `npm run build` if routes/layout).

## Done

- Feature reachable in UI (or pure gate script green)  
- Money rules intact (transfer ≠ expense)  
- Tests prove the change  
- No new frameworks, no AGPL paste  

## Anti-patterns

- “Confirm already works” tasks with only docs  
- Feature dump / competitor clone entire screens  
- Scope outside IDEA.md unchecked list without human approval  
