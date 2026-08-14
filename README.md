# MoneyFlow

MoneyFlow is a Vietnamese, manual-first personal income-and-expense web ledger. It helps a person record income, expenses and internal transfers; understand balances across accounts; inspect where money went; correct mistakes; and keep/export trustworthy data.

MoneyFlow is deliberately **not** a bank aggregator, AI financial adviser, business-accounting suite or native mobile app. Import, inbox and rules are optional advanced capture tools; they are not the product identity.

## Current work and release status

MoneyFlow has a released functional MVP, but it is **not yet public-beta ready**. Current execution, blockers, owner decisions and the next authorized steps live in one place:

- **[Current Work Board](docs/plans/active/README.md)** — owner-facing `NOW / NEXT / BLOCKED / OWNER DECISION / TRIAGE / HOLD / RECENTLY DONE` checklist.
- **[Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md)** — compact implementation/trust truth and named limitations.

Do not infer current work from an old issue body, branch or historical packet. Open PRs are candidate evidence until merged; GitHub state is dynamic and the board is reconciled against it.

## What MoneyFlow does today

- Explicit `demo` mode with browser-local exploration data.
- Explicit `authenticated` mode using Supabase Auth + PostgreSQL with RLS.
- Multiple accounts such as cash, bank, e-wallet, credit and savings representations.
- Income, expense and balanced internal transfers.
- Edit, soft delete and recovery paths.
- Account balances, register/history and reconciliation paths.
- Category budgets, recurring commitments/income and savings goals.
- Weekly, monthly and yearly reporting.
- Controlled import and CSV export.
- Complete versioned account archive at `/settings/backup`, separate from scoped/report export.
- Responsive light/dark web UI.

The exact implementation always outranks this summary; use the authority route below for detail.

## Financial and trust invariants

- VND is stored as integer đồng; never floating-point money.
- Internal transfers are equal/opposite account movements and never count as income or expense.
- Missing planning data, balances, dates, commitments or income are never guessed.
- Destructive ledger actions use recoverable/soft-delete behavior where the product contract requires it.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS boundaries.
- Demo and authenticated data stores are explicit and must never be presented as the same source of truth.
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

Open `http://localhost:3000` unless your local command selects another port. Environment and provider requirements are owned by [`docs/configuration.md`](docs/configuration.md); production values belong in provider settings, never committed source files.

## Quality checks

Use `npm run agent:doctor -- --json` before implementation to select the risk-proportional gate plan. Common repository checks include:

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

Boundary-specific verification includes database/RLS, browser/e2e and responsive UI audits when the changed layer requires them. A build does not prove RLS, browser usability, provider configuration or production behavior.

## Authority route

Start with [`AGENTS.md`](AGENTS.md), then open only the current owner for the question at hand:

| Question | Authority |
|---|---|
| Current task/checklist | [Current Work Board](docs/plans/active/README.md) |
| Current implementation/trust state | [Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md) |
| Product identity and principles | [Product principles](docs/product/PRINCIPLES.md) |
| Released MVP capability reference | [MVP definition](docs/MVP_DEFINITION.md) |
| Architecture | [Architecture map](ARCHITECTURE.md) |
| Change classes, gates and permissions | [Risk-proportional delivery](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md) + [agent operating model](docs/engineering/AGENT_OPERATING_MODEL.md) |
| Context/research routing | [Task context router](docs/context/README.md) |
| App/deployment configuration | [Configuration contract](docs/configuration.md) |
| Pull-request provenance | [PR memory log](docs/research/PR_MEMORY_LOG.md) |
| Historical accepted/superseded work | `docs/plans/completed/`, `docs/plans/archived/` and named PR-memory records |

Historical research, completed packets and old issues are evidence, not permission to restart work. Code, migrations and tests outrank prose on implementation facts.

## Change workflow

1. Read `AGENTS.md` and the Current Work Board.
2. Create a focused non-main branch.
3. Run `npm run agent:doctor -- --json` and use the selected risk class/gates.
4. Read only the affected code/tests plus routed current authority.
5. Implement the smallest coherent change; do not expand scope from unrelated findings.
6. Update the PR-memory record and current memory/board only when their truth changes.
7. Open a PR and require exact-head checks/evidence appropriate to the affected boundary.
8. Human owner decides merge, provider writes, deployment and public-beta acceptance.

Do not push feature/fix commits directly to `main`, force-push shared history, weaken required checks, or treat a long-term roadmap item as authorization.

## Current product direction

The daily ledger remains the default product. Phase A–D product/brand work is completed; rejected Phase E territory exploration is not visual authority; Phase F is not started. The merged evolutionary UI work is current shipped presentation, while any newly discovered defect is handled as a bounded fix rather than a reason to reopen an unlimited redesign.

The next release decision is evidence-led: reconcile current work, run Release Readiness Audit v1, fix only real blockers, validate with controlled real users, then let the owner decide public beta. See the [Current Work Board](docs/plans/active/README.md) for the live sequence.
