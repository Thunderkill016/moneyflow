# MoneyFlow

MoneyFlow is a Vietnamese personal-finance web product built around a trustworthy user-owned ledger. The released MVP is manual/import-assisted; the accepted long-term direction is to reduce maintenance by acquiring already-digital activity safely instead of requiring permanent retyping.

Bank/Open API sync, native mobile acquisition, wealth, household finance and AI mutation are **not shipped** unless merged implementation evidence proves them. Manual capture remains a first-class fallback for cash, corrections and missing/off-system events.

## Current work and release status

MoneyFlow has a functional MVP but is **not public-beta ready**.

Before selecting or resuming executable work, run:

```bash
npm run plan:resolve
npm run agent:doctor -- --json
```

Execution authority lives in one place:

- **[Plan authority graph](docs/plans/PLAN_AUTHORITY.json)** — machine-readable master + zero/one current executable packet, activated by merged Git first-parent history.
- **[Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md)** — compact implementation/trust truth and named limitations.
- **[Current master program](docs/plans/active/432-vietnam-long-term-product-strategy.md)** — acquisition-first long-term direction installed by PR #433.
- **[Retired active-board pointer](docs/plans/active/README.md)** — compatibility link only; it is not a queue or authority source.
- **[PR memory index](docs/research/PR_MEMORY_LOG.md)** — bounded per-PR provenance.

Human backlog, priority, blockers and follow-up work belong in GitHub Issues and pull requests. Do not infer current work from a filename, date, newest document, open PR or chat summary.

## What MoneyFlow does today

- Explicit `demo` mode with browser-local exploration data.
- Explicit `authenticated` mode using Supabase Auth + PostgreSQL with RLS.
- Multiple accounts such as cash, bank, e-wallet, credit and savings representations.
- Income, expense and balanced internal transfers.
- Edit, soft delete and recovery paths.
- Account balances, register/history and reconciliation paths.
- Category budgets, recurring commitments/income and savings goals.
- Weekly, monthly and yearly reporting.
- Controlled import/share capture and CSV export.
- Complete versioned account archive at `/settings/backup`, separate from scoped/report export.
- Responsive light/dark web UI.

The implementation and tests always outrank this summary.

## Long-term acquisition direction

```text
bank / provider / statement / share / device-assisted / manual source
  -> source evidence + provenance
  -> normalized candidate
  -> duplicate / transfer / rule decision
  -> review or bounded approved automation
  -> atomic ledger fact
  -> clearing / reconciliation / correction
```

Provider connectivity is read-only first and optional. MoneyFlow remains useful when a provider is unavailable, consent expires or a source cannot be connected.

## Financial and trust invariants

- VND is stored as integer đồng; never floating-point money.
- Internal transfers are equal/opposite movements and never count as income or expense.
- Missing source coverage, planning data, balances, dates, commitments or income are never guessed.
- Destructive ledger actions use recoverable/soft-delete behavior where required.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS.
- Demo and authenticated stores are explicit and never presented as the same source of truth.
- Source/provider evidence is validated through the normal financial path; adapters do not silently create a second ledger.
- Full backup/restore is separate from scoped export.

## Runtime modes

`NEXT_PUBLIC_APP_MODE` is explicit:

- `authenticated` — Supabase Auth + PostgreSQL/RLS.
- `demo` — browser-local exploration data.

Missing credentials never silently switch the application into demo mode.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill documented local values in .env.local
npm run dev
```

Configuration/provider requirements are owned by [docs/configuration.md](docs/configuration.md). Production values belong in provider settings, never committed source files.

## Quality checks

Common checks include:

```bash
npm run check:knowledge
npm run test:ci-policy
npm run check:deployment-env
npm run check:architecture
npm run check:css-ownership
npm run lint
npm run typecheck
npm run test
npm run build
```

Boundary-specific verification includes database/RLS, browser/e2e and responsive UI audits when selected by policy. A build does not prove RLS, browser usability, provider configuration, production behavior or physical-device behavior.

## Authority route

Start with [`AGENTS.md`](AGENTS.md) and [`docs/context/README.md`](docs/context/README.md).

| Question | Authority |
|---|---|
| Master/current executable plan | `docs/plans/PLAN_AUTHORITY.json` + `npm run plan:resolve` |
| Current implementation/trust state | `docs/research/CURRENT_PROJECT_MEMORY.md` |
| Product identity and principles | [docs/product/PRINCIPLES.md](docs/product/PRINCIPLES.md) |
| Released MVP capability reference | `docs/MVP_DEFINITION.md` |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Change classes and gates | [docs/engineering/RISK_PROPORTIONAL_DELIVERY.md](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md) |
| Permission/handoff rules | [docs/engineering/AGENT_OPERATING_MODEL.md](docs/engineering/AGENT_OPERATING_MODEL.md) |
| Context/research routing | `docs/context/README.md` |
| App/deployment configuration | `docs/configuration.md` |
| External reference repositories | `docs/research/MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md` |
| PR provenance | `docs/research/PR_MEMORY_LOG.md` |

Historical research, completed packets and old issues are evidence, not permission to restart work.

## Change workflow

1. Run `npm run plan:resolve`; stop if authority is candidate, invalid or ambiguous.
2. Read the selected packet and affected code/tests.
3. Create/use a focused non-main branch.
4. Run `npm run agent:doctor -- --json` and follow the risk-selected gates.
5. Implement the smallest coherent change; avoid drive-by refactors.
6. Update the spec before changing requirements.
7. Create the mandatory PR-memory record and update current memory only when truth changes.
8. Require exact-head checks appropriate to the affected boundary.
9. Human owner decides merge, provider writes, deployment and public-beta acceptance.

Do not push feature/fix commits directly to `main`, force-push shared history, weaken required checks, or treat a long-term roadmap item as runtime authorization.
