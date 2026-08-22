# MoneyFlow

MoneyFlow is a Vietnamese personal-finance web product built around a trustworthy user-owned ledger. Today it supports a released manual/import-assisted MVP; its accepted long-term direction is to reduce the work required to keep that ledger correct by moving digital activity toward automatic or near-automatic acquisition through provider-independent source adapters.

Current capability and future direction must not be confused: bank/Open API sync, native mobile acquisition, wealth, household finance and AI mutation are **not shipped** unless merged implementation evidence proves them. Manual capture remains a first-class fallback for cash, corrections and missing/off-system events even as digital acquisition improves.

## Current work and release status

MoneyFlow has a released functional MVP, but it is **not yet public-beta ready**. Before reading `NOW` or `NEXT`, run `npm run plan:resolve`; stale or conflicting planning state is not execution authority.

Current execution, blockers, owner decisions and plan precedence live in:

- **[Plan authority graph](docs/plans/PLAN_AUTHORITY.json)** — machine-readable master-plan route and explicit supersession chain, checked against the active registry and Git history.
- **[Current Work Board](docs/plans/active/README.md)** — owner-facing `NOW / NEXT / BLOCKED / OWNER DECISION / HOLD / RECENTLY DONE` checklist; its baseline is mechanically checked against the actual main/base commit.
- **[Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md)** — compact implementation/trust truth and named limitations.
- **[Current master program](docs/plans/active/432-vietnam-long-term-product-strategy.md)** — currently resolved by the authority graph; installed as merged authority by PR #433.

Do not infer current capability or plan authority from a strategy document's date, old issue, newest file, open PR, branch or historical packet. Open PRs and unmerged strategy artifacts are candidate evidence until merged and promoted through the checked authority route.

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

The exact implementation always outranks this summary.

## Long-term acquisition direction

The future product does **not** require already-digital transactions to be retyped when MoneyFlow can acquire them safely.

Target shape:

```text
bank / provider / statement / share / device-assisted / manual source
  -> source evidence + provenance
  -> normalized candidate
  -> duplicate / transfer / rule decision
  -> review or bounded approved automation
  -> atomic ledger fact
  -> clearing / reconciliation / correction
```

Provider connectivity is read-only first and optional. MoneyFlow remains useful when a provider is unavailable, a consent expires or a source cannot be connected.

## Financial and trust invariants

- VND is stored as integer đồng; never floating-point money.
- Internal transfers are equal/opposite account movements and never count as income or expense.
- Missing source coverage, planning data, balances, dates, commitments or income are never guessed.
- Destructive ledger actions use recoverable/soft-delete behavior where the product contract requires it.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS boundaries.
- Demo and authenticated data stores are explicit and must never be presented as the same source of truth.
- Source/provider evidence is validated through the normal financial path; adapters do not silently create a second ledger.
- Full backup/restore is a separate ownership capability from scoped export. Hosted restore remains a named limitation unless current evidence proves otherwise.

## Runtime modes

`NEXT_PUBLIC_APP_MODE` is explicit:

- `authenticated` — Supabase Auth + PostgreSQL/RLS.
- `demo` — browser-local exploration data.

Missing credentials never silently switch the application into demo mode.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill the documented local values in .env.local
npm run dev
```

Open `http://localhost:3000` unless your local command selects another port. Environment/provider requirements are owned by [`docs/configuration.md`](docs/configuration.md); production values belong in provider settings, never committed source files.

## Quality checks

Resolve authority before implementation, then use the standard doctor to select the risk-proportional gate plan:

```bash
npm run plan:resolve
npm run agent:doctor -- --json
```

Common repository checks include:

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

Boundary-specific verification includes database/RLS, browser/e2e and responsive UI audits when the changed layer requires them. A build does not prove RLS, browser usability, provider configuration, production behavior or physical-device behavior.

## Authority route

Start with [`AGENTS.md`](AGENTS.md). `npm run plan:resolve` tells you which master/current packet to open; then load only the current owner for the question at hand:

| Question | Authority |
|---|---|
| Master-plan precedence | [Plan authority graph](docs/plans/PLAN_AUTHORITY.json) + `npm run plan:resolve` |
| Current task/checklist | [Current Work Board](docs/plans/active/README.md) after resolver freshness passes |
| Current implementation/trust state | [Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md) |
| Product identity and principles | [Product principles](docs/product/PRINCIPLES.md) |
| Released MVP capability reference | [MVP definition](docs/MVP_DEFINITION.md) |
| Architecture | [Architecture map](ARCHITECTURE.md) |
| Change classes, gates and permissions | [Risk-proportional delivery](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md) + [agent operating model](docs/engineering/AGENT_OPERATING_MODEL.md) |
| Context/research routing | [Task context router](docs/context/README.md) |
| App/deployment configuration | [Configuration contract](docs/configuration.md) |
| External reference repositories | [Reference repo atlas 2026](docs/research/MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md) |
| Pull-request provenance | [PR memory log](docs/research/PR_MEMORY_LOG.md) |

Historical research, completed packets and old issues are evidence, not permission to restart work. Code, migrations and tests outrank prose on implementation facts.

## Change workflow

1. Read `AGENTS.md` and run `npm run plan:resolve`; stop and reconcile if authority is stale or ambiguous.
2. Read the resolved Current Work Board/current packet and affected current code/tests.
3. Create/use a focused non-main branch.
4. Run `npm run agent:doctor -- --json` and use the selected risk class/gates.
5. Implement the smallest coherent change; do not expand scope from unrelated findings.
6. Update the PR-memory record and current memory/board only when their truth changes.
7. Open a PR and require exact-head checks/evidence appropriate to the affected boundary.
8. Human owner decides merge, provider writes, deployment and public-beta acceptance.

Do not push feature/fix commits directly to `main`, force-push shared history, weaken required checks, or treat a long-term roadmap item as runtime authorization.

## Current product direction

The released daily ledger remains the current product while release/trust work continues. The currently resolved master program (#432, installed by merged PR #433) changes the long-term growth logic: **Acquire + Reconcile moves ahead of broad feature expansion**, so digital activity should require less user maintenance over time. Existing planning/advanced surfaces remain available but do not automatically earn expansion priority.

Detailed next-work selection belongs only to the resolved Current Work Board/current child packet; this README deliberately does not duplicate a `NEXT` item that can go stale after a merge.
