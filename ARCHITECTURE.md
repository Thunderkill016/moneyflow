# MoneyFlow architecture

This document is the shortest reliable map of the current system. It explains boundaries and invariants; implementation details remain in code, tests and focused design documents.

## System purpose

MoneyFlow is a Vietnamese personal-finance ledger for manually recording income, expenses and transfers across multiple accounts. It prioritizes trustworthy balances, fast capture, understandable monthly reporting and user-owned export.

## Runtime modes

| Mode | Source of truth | Purpose |
|---|---|---|
| `authenticated` | Supabase Auth + PostgreSQL | Real user data with RLS isolation |
| `demo` | Browser-local stores and seeded data | Product exploration without credentials |

Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`. Missing configuration must fail validation; it must not silently switch modes.

## High-level flow

```text
Next.js App Router pages
        ↓
Client components and server actions
        ↓
Domain modules in src/lib
        ↓
Repository/store adapters
        ↓
Supabase PostgreSQL or browser-local demo storage
```

UI components may format and present domain results, but must not invent financial assumptions or own core accounting rules.

## Repository map

| Area | Responsibility |
|---|---|
| `src/app/` | Routes, layouts, server entrypoints and route-specific composition |
| `src/components/` | Reusable UI, dialogs, shells and feature presentation |
| `src/hooks/` | Client orchestration around stores and mutations |
| `src/lib/` | Financial domain rules, formatting, validation and pure calculations |
| `src/lib/*-store*` | Browser/demo persistence and hydration helpers |
| `supabase/migrations/` | Versioned database schema, constraints, policies and indexes |
| `supabase/tests/` | pgTAP database invariants and tenant-isolation checks |
| `tests/` and Playwright configs | Browser smoke, responsive, accessibility and visual evidence |
| `scripts/` | Repeatable verification and repository automation |
| `docs/` | Product truth, research, decisions, plans and operating procedures |

## Domain boundaries

### Ledger

Transactions represent income, expense or transfer. The ledger is append-oriented and destructive actions remain recoverable. Transfer legs must balance and must not contribute to income or expense totals.

### Accounts

Accounts represent where money is held or owed. A total balance is an aggregate of active accounts, not automatically a spending budget.

### Planning

Budgets, recurring commitments, recurring income and savings goals are separate planning inputs. They may explain allocations and upcoming obligations, but the product must not convert total assets into a spending recommendation without a researched and explicit planning contract.

### Reporting

Reports derive from ledger data and exclude internal transfers from income/expense metrics. Exported data must preserve integer VND and protect spreadsheet users from formula injection.

### Identity and ownership

Authenticated user-owned records require RLS. Database constraints and tests are preferred over relying only on application checks.

## Financial invariants

1. VND is stored as integer đồng.
2. Transfers are balanced and excluded from income/expense totals.
3. User-owned rows are tenant-isolated by RLS and ownership constraints.
4. Financial totals are deterministic and tested in domain modules.
5. Missing planning data is represented as unknown, never guessed.
6. Export preserves Vietnamese text, integer values and formula safety.
7. Product copy must distinguish assets, allocated money, obligations and spendable plans.

## Change map

| Desired change | Start here | Verify with |
|---|---|---|
| Financial calculation | relevant `src/lib/*.ts` and tests | unit tests + counterexamples |
| Ledger mutation | store/server action + schema constraints | unit + pgTAP + browser smoke |
| New authenticated table | migration, RLS policy, ownership FK | local reset + pgTAP |
| UI hierarchy/style | design system + affected component | responsive audit + screenshots |
| Form behavior | dialog/component + validation schema | mobile browser flow + validation states |
| Auth callback/config | `docs/configuration.md` and provider settings | deployment contract + real callback check |
| Import/export | parser/serializer and security rules | fixture tests + spreadsheet/manual verification |

## Verification layers

```text
Static contract      check:knowledge, check:deployment-env, check:architecture, lint, typecheck
Domain behavior      node unit tests
Database truth       Supabase reset + pgTAP
User flows           Playwright browser smoke
Responsive quality   cross-device UI audit and screenshot evidence
Production reality   exact Vercel deployment and affected route verification
```

A lower layer cannot prove a higher layer. A successful build does not prove database isolation, browser usability or production correctness.

## Architecture decisions

New cross-cutting decisions should be recorded in a focused document under `docs/decisions/` or in the completed work packet that introduced them. Avoid duplicating the same rule across many documents; update this map only when a system boundary changes.
