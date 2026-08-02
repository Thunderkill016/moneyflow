<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before using unfamiliar App Router APIs, read the relevant guide in `node_modules/next/dist/docs/` and follow current deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow — agent entrypoint

`AGENTS.md` is a map, not the project encyclopedia. Open only the documents needed for the task, but do not code before understanding the affected system.

## Required read order

For every bounded or high-risk change:

1. `README.md` — product and commands.
2. `ARCHITECTURE.md` — system boundaries and change map.
3. `docs/product/PRINCIPLES.md` — product truth and financial constraints.
4. `docs/MVP_DEFINITION.md` — current ship/readiness contract.
5. `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` — change class, planning artifact and required gates.
6. `docs/engineering/AI_DELIVERY_WORKFLOW.md` — research, planning, implementation and review process.
7. `docs/engineering/AGENT_OPERATING_MODEL.md` — execution states, handoffs, permissions and runtime-tool adoption triggers.
8. The active work packet under `docs/plans/active/`, when the risk policy requires one.

Task-specific references:

| Task | Read |
|---|---|
| Brand/logo | `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md`, `docs/design/MONEYFLOW_LOGO.md` |
| UI/UX | `docs/design-system.md`, `docs/UX_PRINCIPLES.md`, `docs/AI_UIUX_WORKFLOW.md` |
| Auth/deployment | `docs/configuration.md`, `docs/supabase-setup.md` |
| Database/RLS | `docs/security-rls-check.md`, relevant migrations and pgTAP tests |
| Product behavior | `docs/MVP_DEFINITION.md`, relevant files in `docs/research/` and current GitHub issue/PR |
| External research, tools or architecture | `docs/research/REPOSITORY_REFERENCE_MAP.md`, `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` |

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

Classify the change first with `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.

- **Class 0 documentation/mechanical:** use an inline plan or clear PR description and proportionate documentation checks.
- **Class 1 bounded code:** use a concise PR plan when one subsystem changes, rollback is straightforward and no high-risk boundary is crossed.
- **Class 2 UI/flow:** use a concise PR plan for a bounded screen-level change; use a full packet for multi-flow redesign or unresolved product research.
- **Class 3 financial/data/security/operations:** copy `docs/templates/FEATURE_WORK_PACKET.md` into `docs/plans/active/<slug>.md` and complete the full lifecycle.

A full packet is also required for multi-day or multi-agent work, provider/production writes, cross-cutting architecture, non-obvious rollback or unresolved external research. Do not create process artifacts merely because a change touches several files.

When a packet is required, complete it in order:

1. Repository reconnaissance.
2. External/product research when facts or behavior are not already established.
3. Specification and acceptance criteria.
4. Implementation plan and risks.
5. Small, verifiable tasks.
6. Implementation on a focused branch.
7. Independent evaluation against the spec.
8. Risk-proportional CI, browser evidence and affected production verification.
9. Move the packet to `docs/plans/completed/` after merge and acceptance.

Record the current execution state, active responsibility, granted permission scope and every state/responsibility handoff for packeted work. Hidden chat context is not a handoff artifact.

When research is required, state one decision question and select two to four focused sources by default. Record what each source establishes, what does not apply, and whether adopting code or a tool creates license, security, privacy, operational or rollback obligations. A repository appearing in a reference map is not approval to add it.

## Coding rules

- Prefer the smallest coherent vertical slice; no drive-by refactors.
- Search for existing components, domain helpers and tests before creating new abstractions.
- Do not change requirements while implementing. Update the spec first when scope changes.
- Do not write directly to `main`; use a focused branch and pull request.
- Keep configuration in environment/provider settings, never guessed constants or committed secrets.
- One primary action per viewport; money must not be distinguished by color alone.

## Verification

Run the gates selected by `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`; do not apply every expensive gate to every PR.

```bash
# Always available repository contracts
npm run check:knowledge
npm run test:ci-policy

# Full static/domain verification for executable changes
npm run check:deployment-env
npm run check:css-ownership
npm run check:architecture
npm run lint
npm run typecheck
npm run test
npm run build

# Only when the affected boundary requires them
npm run test:db
npm run test:e2e
npm run test:ui-audit:pr
```

Examples:

- documentation-only: knowledge + CI policy + diff hygiene;
- pure database-only: knowledge + CI policy + database, no unrelated app verify or browser work;
- domain/runtime: full verify + browser smoke, no responsive audit unless UI changes;
- UI/layout: full verify + browser smoke + responsive audit;
- CI policy, main push or manual verification: every gate.

A change is not done because code was generated or tests were claimed. It is done when the diff matches the scope, the risk-selected exact-head checks pass, required human review occurs, and affected production behavior is verified where applicable.

## Autonomous cloud agents

Applies to any agent that runs in its own container and pushes to this repository — Codex cloud, Copilot coding agent, Jules, Devin. All of them read this file.

### Boundaries

1. **Never merge, never push to `main`, never force-push a shared branch.** Push a focused branch and open a pull request. A human owner merges.
2. **Never change branch protection, required-check settings, workflow permissions, or `CODEOWNERS`** as part of a feature or fix task. A dedicated governance task may propose workflow logic on a branch, but provider-side settings remain human-owned.
3. **One task, one scope.** Do only what the task specifies. If you find an unrelated defect, report it in the PR body; do not fix it in the same branch.
4. **Never commit secrets or environment values.** Configuration lives in provider settings. `.env*` stays untracked.
5. **Do not create a new management layer** — no new handbook, spec system, agent framework, or root-level override stylesheet. Extend existing engineering policy or the required work packet.
6. **Do not rewrite published history.** Commits already on `main` — including squash-merge commits authored by the owner — are not yours to amend or reset.

### Reporting

State exactly which gates were selected, which ran and which were not applicable. Never describe a gate as passing unless it ran and succeeded.

Note in the PR body when a selected gate could not run and why. “Not applicable” is acceptable only when the repository classifier or risk policy supports it; a claimed pass that did not happen is not.

Agent-phase internet is off by default in Codex cloud. Anything needing network — `npm ci`, `npx playwright install`, Supabase CLI — must happen in the setup-script phase, which does have network. If selected browser or database gates cannot run locally, say so; CI runs them on the pull request.

### What one gate does not prove

`npm run build` passing proves nothing about database isolation, browser behaviour, or production. Neither does `lint` or `typecheck`. These are separate layers — see the table in `ARCHITECTURE.md`.

### Load-bearing traps

These are not style preferences. Each one has already caused a real failure here, and none is discoverable by reading the file you are editing.

- **Inside `src/lib/**`, a _runtime_ import must use a relative path with an explicit `.ts` extension.** `npm run test` is the plain Node runner (`node --experimental-strip-types --test src/lib/*.test.ts src/lib/*/*.test.ts`) and does not read tsconfig paths, so a value import written as `@/lib/...` passes `lint`, `typecheck` and `build` and then fails with `ERR_MODULE_NOT_FOUND`. `import type { … } from "@/lib/…"` is fine and is used deliberately in several modules — types are erased, so Node never resolves them. Do not "fix" those.
- **The shell's layout lives in `src/components/layout/app-shell.module.css`, not in the global layers.** `app-shell.tsx` renders `styles.shell`, `styles.topbar` and the rest, so a global rule for the same concept applies to nothing — editing it changes nothing, which is why a `44px` rule sitting there let a `42px` control ship while looking fixed. The `.sidebar` and `.topbar` families have now been removed rather than left as bait. **`.app-shell` and `.page-column` are the exception and are still live:** `src/app/goals/loading.tsx` renders them, alone among fifteen route skeletons. An earlier version of this line called all three dead; it was wrong about `.app-shell`. Measure the DOM before trusting any entry on this list, including this one.
- **`!important` is budgeted.** `npm run check:css-ownership` fails above 1200 declarations. Prefer fixing the owning rule.
- **Do not add an `@import` to `src/app/legacy.css`,** and do not create another root-level refresh or guardrail stylesheet. The file says so itself.
- **A property can be set in several layers.** Before declaring a CSS fix done, grep every layer for the same selector, including inside media queries. Base plus a mobile override is the normal shape here.
- **Measure; do not infer.** Contrast on a translucent background requires alpha compositing against what is behind it. A control's effective hit area includes a wrapping `label`. A module reached only through `await import(...)` is not dead code. Each of these has produced a confident, wrong finding.

### Definition of done for an agent-authored PR

The branch is pushed, the PR describes scope and evidence honestly, the risk-selected exact-head checks are green, and the owner has reviewed changes that require human judgment. Merging and deployment are the owner's decisions.
