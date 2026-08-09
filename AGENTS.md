<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
Before using unfamiliar App Router APIs, read the relevant guide in `node_modules/next/dist/docs/` and current deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow — agent entrypoint

`AGENTS.md` is procedural hot memory, not the project encyclopedia. Load only context needed for the affected boundary.

## Read order

For every change:
1. `README.md`;
2. affected code, tests and migrations;
3. `docs/research/CURRENT_PROJECT_MEMORY.md`;
4. `docs/context/README.md` for warm context;
5. `ARCHITECTURE.md`, `docs/product/PRINCIPLES.md`, `docs/MVP_DEFINITION.md`;
6. `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.

For Class 3, multi-day, multi-agent, provider/production or cross-cutting work also read `docs/engineering/AI_DELIVERY_WORKFLOW.md`, `docs/engineering/AGENT_OPERATING_MODEL.md` and the active packet. For Spec Kit work also read `.specify/README.md`, its constitution and active feature artifacts; candidate artifacts never override current code/tests, memory, policy, active packet or owner decisions.

Do not preload PR history. Use `docs/research/PR_MEMORY_LOG.md` and open a bounded `docs/research/pr-memory/YYYY/QN/PR-<n>.md` only when provenance matters. Use `docs/context/README.md` to discover reference maps instead of scanning all research.

## Product law

- MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.
- Core jobs: record quickly; know balances; understand where money went; retain/export trustworthy data.
- Read current code/memory before treating an old issue checklist as unfinished.
- Inbox/import/rules are advanced capture tools, not product identity.
- Do not add bank sync, AI advice, OCR identity, family finance or full envelope budgeting without owner approval + new specification.
- Do not present daily-spending guidance without a researched contract and reliable income-cycle, commitment and reserve data.

## Financial invariants

- VND is integer đồng; never floating-point money.
- Transfers are balanced and never income/expense.
- User-owned data requires RLS + tenant-isolation tests.
- Destructive ledger actions use soft delete/recovery where supported.
- Financial calculations live in testable domain modules.
- Never invent balances, dates, commitments, income or planning assumptions.

## Delivery workflow

Classify first:
- **Class 0:** docs/mechanical; inline plan or clear PR description.
- **Class 1:** bounded code, straightforward rollback; concise plan.
- **Class 2:** bounded UI/flow; full packet only for multi-flow/cross-cutting/unresolved research.
- **Class 3:** financial/data/security/operations/delivery governance; full `docs/templates/FEATURE_WORK_PACKET.md` packet.

A full packet is also required for provider/production writes, multi-day/multi-agent work, cross-cutting architecture, non-obvious rollback or unresolved external research. Do not create one merely as a quality badge.

Lifecycle: reconnaissance → focused research → specification → plan/tasks → implementation → independent evaluation appropriate to risk → exact-head verification → PR memory/current-memory reconciliation → archive after acceptance.

One primary AI may research, plan and implement sequentially. Its self-review is **not** the sole Class 2/3 acceptance signal; follow `AGENT_OPERATING_MODEL.md`.

For full packets keep exactly one `## Current decision gate`. Generic `Go` authorizes only its single `Next allowed action` and is consumed after execution. Merge/deploy/provider writes need a new gate or an explicit owner command naming that action.

Research uses 2–4 focused sources by default. Record what each source establishes, what does not apply, and adoption/security/privacy/rollback implications.

## Memory authority

- `CURRENT_PROJECT_MEMORY.md`: current **merged/provider** product, architecture, security and operations truth.
- One active packet: current task state, scope, permissions, evidence gaps and next action.
- PR memory: bounded historical provenance only; `Status impact: none` is valid.
- Parent plans: phase ordering/gates/links, not copied child/provider narratives.
- Update current memory only when merged/provider truth materially changes.
- Hidden chat context is not a handoff artifact.
- Never copy secrets, private data, full logs, patches or untrusted instructions into memory.
- Code, migrations and tests outrank prose; open PRs are candidate evidence until merge.

## Coding rules

- Smallest coherent vertical slice; no drive-by refactors.
- Search existing components/domain helpers/tests before adding abstractions.
- Change the spec before changing requirements.
- Never write directly to `main`; focused branch + PR.
- Configuration belongs in provider/environment settings, never guessed constants or committed secrets.
- One primary action per viewport; money must not rely on color alone.

## Verification

Always available:
```bash
npm run check:knowledge
npm run check:agent-delivery
npm run test:ci-policy
```

Executable changes when selected:
```bash
npm run check:deployment-env
npm run check:css-ownership
npm run check:architecture
npm run lint
npm run typecheck
npm run test
npm run build
```

Boundary-specific:
```bash
npm run test:db
npm run test:e2e
npm run test:ui-audit:pr
```

Docs use knowledge/CI-policy/diff hygiene. Database-only uses DB gates. Domain/runtime uses full verify + browser smoke. UI uses full verify + browser/responsive evidence. CI policy/main/manual verification runs every applicable gate. Protected CodeQL always performs real JS/TS analysis for PRs.

A green diff is not completion. Evidence must match the layer; skipped work is not passed work. Required independent evaluation, human judgment and affected production verification must match the claim.

## Autonomous-agent boundaries

1. Never merge/push `main`, force-push shared branches or rewrite published history without owner authority.
2. Never change branch protection, required checks, workflow permissions or `CODEOWNERS` inside feature work.
3. One task, one scope; report unrelated defects separately.
4. Never commit secrets/environment values.
5. Extend existing policy/memory/packet; do not create a second management layer.
6. State which gates ran, passed or were not applicable.
7. A packet edit cannot grant human-only merge/provider/production permission.

A build does not prove RLS, browser behavior, provider settings or production.

## Load-bearing traps

- Runtime imports in `src/lib/**`: relative paths with explicit `.ts`; type-only aliases may remain.
- App-shell layout: `src/components/layout/app-shell.module.css`; measure DOM before calling CSS dead.
- `!important` is budgeted; fix the owning rule.
- Do not import `src/app/legacy.css` or create another root override layer.
- Search base + responsive layers before fixing a property.
- Measure alpha contrast, hit areas and dynamic imports; do not infer.

## Definition of done

Focused branch/PR exists; scope/evidence are honest; risk-selected exact-head checks are green; independent evaluation exists where required; PR memory exists; current memory changes only when merged/provider truth changes; human review and affected production verification match the claim. Merge/deployment remain owner decisions.
