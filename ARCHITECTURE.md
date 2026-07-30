# MoneyFlow architecture

This document is the shortest reliable map of the current system. It explains boundaries and invariants; implementation details remain in code, tests and focused work packets.

## System purpose

MoneyFlow is a Vietnamese personal-finance ledger for manually recording income, expenses and transfers across multiple accounts. It prioritizes trustworthy balances, fast capture, understandable monthly reporting and user-owned export.

## Architecture style

MoneyFlow is a **single-deployment modular monolith** built with Next.js App Router and Supabase/PostgreSQL.

This is a deliberate current fit, not a temporary failure to adopt microservices. A package or service split requires an independent runtime, deployment lifecycle, security boundary, scaling need or team ownership boundary. File size or similarity to a larger finance project is not enough.

## Runtime modes

| Mode | Source of truth | Purpose |
|---|---|---|
| `authenticated` | Supabase Auth + PostgreSQL | Real user data with RLS isolation |
| `demo` | Browser-local stores and seeded data | Product exploration without credentials |

Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`. Missing configuration must fail validation; it must not silently switch modes.

Demo and authenticated implementations may use different adapters, but one use case should have one client-side orchestration owner. Route components must not independently rebuild the same mutation in multiple places.

## Request flows

### Read flow

```text
App Router page / server entrypoint
        ↓
requireViewer + server workspace loader
        ↓
Supabase table/view query          or          explicit demo seed
        ↓
validated serializable workspace
        ↓
client feature surface
```

Route pages stay thin: authorize, load the required workspaces, compose the route and pass serializable data. `src/server/` owns server-only workspace loading and persistence-row validation.

### Authenticated mutation flow

```text
client surface
        ↓
shared hook or bounded UI handler
        ↓
Server Action input validation
        ↓
requireViewer + Supabase client
        ↓
ownership-safe PostgreSQL RPC
        ↓
validated view/result mapping
        ↓
client state reconciliation + path revalidation
```

Server Actions are public mutation entrypoints even when invoked from the app. They must validate input, derive the current user, avoid trusting client ownership claims and rely on RLS/RPC constraints for tenant safety.

### Demo mutation flow

```text
client surface
        ↓
shared client mutation owner
        ↓
pure domain helper
        ↓
browser-local store
```

Demo storage is not a fallback for authenticated failures. Production contracts and domain types must not be owned by a module whose primary responsibility is sample/demo data.

## Repository map

| Area | Responsibility |
|---|---|
| `src/app/` | Routes, layouts, Server Actions and route-specific composition |
| `src/components/` | Reusable UI, dialogs, shells and feature presentation |
| `src/hooks/` | Shared client orchestration around runtime adapters and mutations |
| `src/server/` | Server-only viewer-aware workspace loaders and persistence mapping |
| `src/lib/` | Financial domain rules, contracts, formatting, validation and pure calculations |
| `src/lib/*-store*` | Browser/demo persistence and hydration helpers |
| `supabase/migrations/` | Versioned database schema, constraints, policies, RPCs and indexes |
| `supabase/tests/` | pgTAP database invariants and tenant-isolation checks |
| `tests/` and Playwright configs | Browser smoke, responsive, accessibility and visual evidence |
| `scripts/` | Repeatable verification and repository automation |
| `docs/` | Product truth, research, decisions, plans and operating procedures |

## Dependency and ownership rules

1. `src/lib` does not depend on routes, components or server workspace code.
2. Components do not import Supabase clients or server-only modules.
3. Route pages compose; they do not own accounting rules or duplicate persistence adapters.
4. Server workspace loaders may return UI-facing view data, but persistence schemas, demo fixtures and presentation metadata must remain distinguishable authorities.
5. A financial use case has one mutation owner per runtime. Multiple screens may react differently to success, but they should not reconstruct the same transaction independently.
6. Historical or withdrawn product behavior does not remain exported from an active core module solely for documentation. Preserve rationale in completed packets/research instead.
7. A large file is not automatically an architecture defect. Split only when responsibilities change independently, pure logic needs isolated tests, another surface needs reuse or repeated fixes cross ownership boundaries.

`scripts/check-architecture.mjs` enforces only proven import boundaries. Add a new rule after an actual risky dependency has been identified and the intended replacement boundary exists; do not grow the checker as a speculative style guide.

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
7. Product copy and active calculations must distinguish assets, allocated money, obligations and an approved spending plan.

## Extraction decision test

Before introducing a new layer, package, adapter or service, answer all applicable questions:

- Does the behavior have an independent source of truth or runtime?
- Is the same use case currently implemented by more than one owner?
- Does pure logic need testing without React, Next.js, Supabase or browser APIs?
- Do the responsibilities change for different reasons or on different schedules?
- Has the current coupling caused a defect, security risk or repeated verification cost?
- Can the problem be solved by moving one function or contract instead of adding a framework?

If the evidence is only “the file is long” or “another project has this layer”, keep the current structure.

## Change map

| Desired change | Start here | Verify with |
|---|---|---|
| Financial calculation | relevant `src/lib/*.ts` and tests | unit tests + counterexamples |
| Ledger mutation | shared client owner + Server Action + RPC constraints | unit + pgTAP + browser smoke |
| Server read model | route page + relevant `src/server/*.ts` workspace | schema parsing + route/browser evidence |
| Demo persistence | shared client owner + `src/lib/*-store*` | unit + reload/recovery browser test |
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
