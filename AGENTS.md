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

When research is required, state one decision question and select two to four focused sources by default. Record what each source establishes, what does not apply, and whether adopting code or a tool creates license, security, privacy, operational or rollback obligations. A repository appearing in a reference map is not approval to add it.

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

## Autonomous cloud agents

Applies to any agent that runs in its own container and pushes to this repository — Codex cloud, Copilot coding agent, Jules, Devin. All of them read this file.

### Boundaries

1. **Never merge, never push to `main`, never force-push a shared branch.** Push a focused branch and open a pull request. A human owner merges.
2. **Never change branch protection, CI workflow permissions, required checks, or `CODEOWNERS`** as part of a feature or fix task. If a task appears to require it, stop and say so in the PR.
3. **One task, one scope.** Do only what the task specifies. If you find an unrelated defect, report it in the PR body; do not fix it in the same branch.
4. **Never commit secrets or environment values.** Configuration lives in provider settings. `.env*` stays untracked.
5. **Do not create a new management layer** — no new handbook, spec system, agent framework, or root-level override stylesheet. Extend the existing work packet under `docs/plans/active/`.
6. **Do not rewrite published history.** Commits already on `main` — including squash-merge commits authored by the owner — are not yours to amend or reset.

### Reporting

State exactly which gates you ran and which you could not. Never describe a gate as passing unless you ran it and saw it pass.

Note in the PR body when a gate could not run and why. "Not run" is an acceptable outcome; a claimed pass that did not happen is not.

Agent-phase internet is off by default in Codex cloud. Anything needing network — `npm ci`, `npx playwright install`, Supabase CLI — must happen in the setup-script phase, which does have network. If the browser gates (`test:e2e`, `test:ui-audit:pr`) or `test:db` cannot run in your environment, say so; CI runs them on the pull request.

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

The branch is pushed, the PR describes the change and its evidence honestly, CI is green, and the owner has reviewed it. Merging and deployment are the owner's decisions.
