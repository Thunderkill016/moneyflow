---
name: frontend-qa
description: >
  UI QA for MoneyFlow: mobile nav, empty states, dialogs, money a11y signs.
  Use after layout/nav/dialog/CSS changes. Adapted from EdFullstack browser-qa.
---

# Skill: frontend-qa (MoneyFlow)

## When

Layouts, dialogs, nav, empty states, mobile FAB, money display.

## Check

1. Primary action **Ghi chi tiêu** reachable (desktop + FAB).  
2. Empty state: **one** primary CTA.  
3. Money shows `+` / `−` / `↔` not color alone.  
4. Demo banner does not cover FAB.  
5. Focus: dialog trap/restore; labels on amount.  
6. Lab routes (inbox/import) not on primary tabs.  

## Verify

Prefer Playwright e2e expense path when entry UI changes.  
`npm run test` for pure UI contracts if present.
