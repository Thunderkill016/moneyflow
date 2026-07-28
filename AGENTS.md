<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before using unfamiliar App Router APIs, read the relevant guide in `node_modules/next/dist/docs/` and follow current deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow — agent entrypoint

`AGENTS.md` is a map, not the project encyclopedia. Open only the documents needed for the task, but do not code before understanding the affected system.

## Required read order

For every non-trivial change:

1. `README.md` — product and commands.
2. `ARCHITECTURE.md` — system boundaries and change map.
3. `docs/product/PRINCIPLES.md` — product truth and financial constraints.
4. `docs/MVP_DEFINITION.md` — current ship/readiness contract.
5. `docs/engineering/AI_DELIVERY_WORKFLOW.md` — research, planning, implementation and review process.
6. The active work packet under `docs/plans/active/`, when one exists.

Task-specific references:

| Task | Read |
|---|---|
| Brand/logo | `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md`, `docs/design/MONEYFLOW_LOGO.md` |
| UI/UX | `docs/design-system.md`, `docs/UX_PRINCIPLES.md`, `docs/AI_UIUX_WORKFLOW.md` |
| Auth/deployment | `docs/configuration.md`, `docs/supabase-setup.md` |
| Database/RLS | `docs/security-rls-check.md`, relevant migrations and pgTAP tests |
| Product behavior | `docs/MVP_DEFINITION.md`, relevant files in `docs/research/` and current GitHub issue/PR |

## Product law

- MoneyFlow is a manual-first personal income and expense ledger for Vietnamese users.
- Core jobs: record a transaction quickly; know balances; understand where money went this month; retain and export trustworthy data.
- Do not present a daily spending recommendation until the product has an explicit, researched planning contract with reliable income-cycle, commitment and reserve data.
- Inbox, paste, import and rules are optional advanced capture tools, not the product identity.
- Do not add bank sync, AI financial advice, OCR, family finance or a full envelope-budgeting system without explicit human approval and a new product specification.

## Financial invariants

- Store VND as integer đồng; never use floating-point money.
- Transfers are balanced movements between accounts and never count as income or expense.
- User-owned data requires RLS and tenant-isolation tests.
- Destructive ledger actions use soft delete and a recoverable path.
- Financial calculations live in testable domain modules, not UI components.
- Never invent missing balances, dates, commitments, income or planning assumptions.

## Required delivery workflow

For non-trivial work, copy `docs/templates/FEATURE_WORK_PACKET.md` into `docs/plans/active/<slug>.md` and complete it in order:

1. Repository reconnaissance.
2. External/product research when facts or behavior are not already established.
3. Specification and acceptance criteria.
4. Implementation plan and risks.
5. Small, verifiable tasks.
6. Implementation on a focused branch.
7. Independent evaluation against the spec.
8. CI, browser evidence and production verification.
9. Move the packet to `docs/plans/completed/` after merge.

A tiny documentation or one-line mechanical fix may use an inline plan, but still requires reading the affected files and running proportionate checks.

## Coding rules

- Prefer the smallest coherent vertical slice; no drive-by refactors.
- Search for existing components, domain helpers and tests before creating new abstractions.
- Do not change requirements while implementing. Update the spec first when scope changes.
- Do not write directly to `main`; use a focused branch and pull request.
- Keep configuration in environment/provider settings, never guessed constants or committed secrets.
- One primary action per viewport; money must not be distinguished by color alone.

## Verification

Run the gates appropriate to the change; non-trivial product work requires all of them:

```bash
npm run check:knowledge
npm run check:deployment-env
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:db
npm run test:e2e
npm run test:ui-audit:pr
```

A change is not done because code was generated or tests were claimed. It is done only when the diff matches the specification, required gates pass, visual/browser evidence is reviewed where relevant, the PR is merged, and the exact production deployment is verified.
