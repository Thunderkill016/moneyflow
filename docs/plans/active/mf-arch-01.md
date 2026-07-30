# MF ARCH-01 — Evidence-Based Modular Monolith Review

**Status:** discovery  
**Owner:** MoneyFlow  
**Issue/PR:** #150  
**Last updated:** 2026-07-30

## Outcome

Produce a code-backed map of MoneyFlow's current modular monolith, identify no more than five material ownership/dependency findings, and record which existing boundaries should remain unchanged. This review does not authorize a folder rewrite or runtime refactor.

## Repository reconnaissance

### Current behavior

- App Router pages load authenticated/demo workspaces on the server and pass serializable view data into client surfaces.
- Authenticated mutations flow through client hooks → Server Actions → viewer validation → Supabase RPC/view → PostgreSQL/RLS.
- Demo mutations stay in browser-local stores.
- `scripts/check-architecture.mjs` currently prevents `src/lib` from importing app/components/server code and prevents components from importing Supabase/server modules.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app/**/page.tsx` | route composition and server reads | keep thin |
| `src/server/*.ts` | authenticated/demo read workspaces | inspect ownership |
| `src/app/actions/*.ts` | validated authenticated mutations | keep pattern; inspect duplication |
| `src/hooks/use-transactions.ts` | client orchestration and dual runtime adapters | hotspot to assess |
| `src/components/moneyflow-dashboard.tsx` | dashboard orchestration and derived state | hotspot to assess |
| `src/components/transactions-page.tsx` | ledger state, filtering, mutations and rendering | hotspot to assess |
| `src/lib/**` | deterministic domain helpers and browser stores | preserve server/UI independence |
| `scripts/check-architecture.mjs` | executable dependency rules | extend only for proven risk |

### Existing tests and constraints

- CI runs knowledge, deployment, CSS ownership, architecture, lint, typecheck, unit/static RLS, build, fresh database/pgTAP and browser audit.
- VND remains integer money; transfers never become income/expense.
- Authenticated user data remains protected by Auth, RLS, RPC ownership checks and tenant-isolation tests.
- Demo and authenticated runtime modes must remain explicit.

### Similar implementation and recent history

- PR #62 bounded the dashboard ledger query rather than introducing a new service.
- PRs #140/#141/#146 strengthened existing Supabase, shell and runtime boundaries without a platform rewrite.
- MF CONTROL-01 established GitHub issues/PRs as dynamic status authority; this packet is only the review handoff.

### Open questions

- [ ] Is dual demo/authenticated mutation logic in `use-transactions.ts` still coherent or already causing drift?
- [ ] Should persistence row mapping, demo fixtures and UI-facing labels remain combined in `src/server/finance.ts`?
- [ ] Which large client components have a real change/verification cost rather than merely a high line count?
- [ ] Is any missing architecture rule supported by an observed bad import or recurring defect?

## Research

### Questions researched

1. Why do mature personal-finance projects split packages/services?
2. Which Next.js/Supabase boundaries apply to MoneyFlow's current runtime?
3. Which patterns should not be copied without the same operating constraints?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Actual Budget project structure and architecture docs | 2026-07-30 | shared core, web/desktop, API and sync packages exist because Actual supports multiple runtimes and multi-device sync | not evidence that MoneyFlow needs a monorepo |
| Firefly III Data Importer docs | 2026-07-30 | importer is separately operated and version-coupled to Firefly III | MoneyFlow importer is not yet an independent deployment |
| Next.js App Router Server/Client Components, data security and Server Actions docs | 2026-07-30 | reads can live in Server Components and mutations in secured Server Actions | does not require ceremonial layering |
| Supabase Auth/RLS docs | 2026-07-30 | database authorization can be enforced with Auth claims, RLS and least privileges | app still needs validation and ownership-safe RPCs |
| Maybe Finance repository/releases | 2026-07-30 | historical monolith case and product complexity lessons; repo archived 2025-07-27 | not a current architecture template |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Rewrite into Clean Architecture folders | visually explicit layers | large churn, weak product benefit, path-only abstraction | reject |
| Split packages/services now | independent boundaries | no independent runtime/team/deploy need | reject |
| Keep current modular monolith unchanged | zero churn | leaves real hotspots undocumented | baseline, not final |
| Review and tighten only proven boundaries | low risk and evidence-driven | requires deliberate reconnaissance | selected |

### Research decision

Retain a single Next.js/Supabase modular monolith. Recommend extraction or new executable rules only when a concrete failure mode, duplicated authority, independent test boundary or repeated change cost is demonstrated.

## Specification

### Problem

MoneyFlow has accumulated several large orchestration files and mixed demo/authenticated flows. Line count alone does not prove architectural failure, but unclear ownership can make finance changes harder to verify and can allow demo, presentation and persistence contracts to drift.

### User stories

- As the owner, I can see where transaction/account/dashboard behavior is owned so future AI changes do not scatter logic.
- As an implementing agent, I can identify which existing boundary to reuse before creating a new abstraction.
- As a reviewer, I can reject architecture work that lacks a concrete failure mode.

### Acceptance criteria

- [ ] The review maps the main read/write flows to exact files/functions.
- [ ] Findings are classified as `keep`, `tighten`, `split-later` or `fix-now`.
- [ ] Every proposed change includes evidence, counterexample and smallest next step.
- [ ] Patterns deliberately not adopted are recorded with reasons.
- [ ] No runtime refactor is included in the review PR.

### Required states

Not applicable to product UI; this is a documentation/architecture review. Existing demo/authenticated, error and recovery behavior must be represented accurately.

### Financial and security constraints

- No change to integer VND, transfer, split, soft-delete or idempotency behavior.
- No weakening of Auth/RLS/RPC ownership boundaries.
- No production data or private financial evidence in documentation.

### Out of scope

- Issue #145.
- Database migrations or provider configuration.
- New services, packages, dependencies or product features.
- Mechanical file splitting without an ownership benefit.

## Implementation plan

### Architecture fit

The durable current architecture remains in `ARCHITECTURE.md`. This review will update it only where the existing document is incomplete or inaccurate and will keep detailed investigation evidence in this packet/issue.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/mf-arch-01.md` | maintain evidence and decisions | handoff and review record |
| `ARCHITECTURE.md` | add only verified dependency/ownership clarifications | durable project map |
| issue #150 | maintain dynamic findings and queue | single status authority |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| equating large files with bad architecture | require change-cost or authority evidence |
| copying Actual/Firefly package structure | require equivalent runtime/deployment need |
| introducing abstractions before use | record `keep` decisions and smallest next step |
| weakening current tests during review | documentation-only diff and full CI |

### Verification plan

- Static: knowledge and architecture contracts.
- Unit/domain: existing suite unchanged.
- Database: fresh reset/pgTAP unchanged.
- Browser flow: existing smoke/audit unchanged.
- Production/manual: no runtime behavior change.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| A1 | Map transaction read/write flow | none | exact files/functions | doing |
| A2 | Map account/dashboard reads and derived state | A1 | exact files/functions | todo |
| A3 | Assess hotspots and counterexamples | A1, A2 | keep/tighten/split/fix table | todo |
| A4 | Update durable architecture map only if needed | A3 | focused diff | todo |
| A5 | Independent review and CI | A4 | final CI | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Dependency map is code-backed | pending | pending |
| Findings include keep decisions | pending | pending |
| No runtime refactor | branch diff | pending |
| External patterns applied selectively | source comparison | pending |

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: no product change expected.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- GitHub code search indexing is not returning repository results, so reconnaissance is using exact known paths, current docs, issues and PR history.

## Delivery record

- Branch: `agent/mf-arch-01`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not required for documentation-only review
- Production flow verified: no runtime change
- Work packet moved to `docs/plans/completed/`: pending
