# AI project operating system

**Status:** implementing  
**Owner:** AI agent with human product owner  
**Issue/PR:** pending  
**Last updated:** 2026-07-26

## Outcome

Make MoneyFlow easier and safer for coding agents to understand, plan, implement and review by turning repository knowledge, product truth and delivery steps into versioned artifacts and executable CI checks.

## Repository reconnaissance

### Current behavior

- The repository already had extensive product, research, runtime and autopilot documentation.
- `AGENTS.md` mixed product law, Grok runtime, queue state, engineering rules and outdated feature claims.
- `README.md` and `docs/PRODUCT.md` still described a retired daily-spending recommendation as current product behavior.
- No root `ARCHITECTURE.md`, standard feature work packet, active/completed execution-plan lifecycle or PR template existed.
- CI already enforced deployment configuration, lint, typecheck, unit tests, production build, Supabase pgTAP, browser smoke and cross-device UI audit.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Entry context for agents | Rewrite as concise map |
| `README.md` | Human and agent orientation | Align with current truth |
| `docs/PRODUCT.md` | Existing short product focus | Preserve role, remove stale claims |
| `docs/AI_UIUX_WORKFLOW.md` | Existing researched UI process | Reuse and link |
| `.github/workflows/ci.yml` | Existing enforcement layer | Add knowledge contract |
| `package.json` and `scripts/` | Repeatable commands | Add `check:knowledge` |

### Existing tests and constraints

- Existing CI is intentionally broad and must remain unchanged except for the new documentation contract step.
- No production behavior, schema, finance calculation or runtime dependency should change.
- Documentation should reduce duplication rather than introduce another competing roadmap.

### Similar implementation and recent history

- The UI/UX workflow already uses research, multiple design directions, browser evidence and production verification.
- Recent work removed an unsupported spending recommendation from product presentation, but current orientation docs were not fully updated.

### Open questions

- [x] Should Spec Kit be installed immediately? No. First establish a small repository-native contract; an external framework can be evaluated later without duplicating the workflow.
- [x] Should all historical research be rewritten? No. Mark current sources of truth and keep historical evidence available.

## Research

### Questions researched

1. Which practices from AI-native engineering teams are useful for a small brownfield project?
2. Which practices can be enforced cheaply inside the repository?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| OpenAI harness engineering | 2026-07-26 | Short agent map, repository knowledge, executable constraints, browser/observability feedback | Large internal environment; adapt rather than copy scale |
| Anthropic long-running agent workflows | 2026-07-26 | Planner/builder/evaluator separation and durable artifacts | Multi-agent scale is unnecessary for current project |
| GitHub coding-agent guidance | 2026-07-26 | Focused issues, acceptance criteria, branch/PR/CI workflow | Product decisions still require human ownership |
| Vercel AI/preview workflow | 2026-07-26 | Prototype/review/deploy feedback through real environments | UI tooling does not replace repository contracts |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Install BMAD or a large multi-agent framework | Many roles/workflows included | Heavy process, duplicated docs, context overhead | Reject now |
| Install Spec Kit immediately | Standard commands and templates | Could add another source of truth before repository cleanup | Defer evaluation |
| Repository-native lightweight operating system | Fits current CI and docs; easy to inspect | Requires discipline and maintenance | Selected |

### Research decision

Adopt the common principles rather than a large framework: concise agent entrypoint, explicit architecture/product truth, versioned work packets, separate implementation/evaluation, and executable CI checks. This is an adaptation to MoneyFlow's size and existing tooling.

## Specification

### Problem

Coding agents can read many documents but cannot reliably determine which are current, which are historical or what must happen before implementation. Stale product claims can survive after code changes, and plans can disappear inside chat history.

### User stories

- As the project owner, I can see the current product and architecture truth without reading every historical document.
- As a coding agent, I can audit, research, specify and plan using one reusable work packet.
- As a reviewer, I can evaluate a PR against explicit acceptance criteria and evidence.
- As CI, I can block selected knowledge regressions automatically.

### Acceptance criteria

- [x] `AGENTS.md` is a concise index with current product and delivery rules.
- [x] A root architecture map exists.
- [x] Current product principles explicitly reject guessing a spending plan from total assets.
- [x] A documented AI delivery lifecycle and reusable work packet exist.
- [x] Active and completed plan directories have clear semantics.
- [x] Pull requests request reconnaissance, scope and evidence.
- [x] `npm run check:knowledge` validates required files and selected stale claims.
- [x] CI runs the knowledge contract before normal code verification.
- [x] README and current product focus no longer claim the retired feature is active.

### Required states

- Loading: not applicable.
- Empty: active plan directory is valid with only its README.
- Populated: each active packet must contain required lifecycle headings.
- Validation/error: the script prints actionable failures and exits non-zero.
- Recovery/undo: changes are documentation/scripts only and can be reverted through Git.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: no product UI changes.
- Accessibility: not applicable.

### Financial and security constraints

- Do not change production finance behavior.
- Remove stale current-truth claims without deleting historical evidence.
- Do not add credentials, provider values or new runtime dependencies.

### Out of scope

- Installing Spec Kit, BMAD or OpenSpec.
- Reorganizing all historical documents.
- Changing product code, database schema or deployment configuration.
- Building autonomous multi-agent execution.

## Implementation plan

### Architecture fit

Repository guidance belongs in root maps and `docs/`; repeatable validation belongs in `scripts/` and CI. Existing product, UI and security documents remain focused references.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | Convert to concise map | Reduce context drift |
| `ARCHITECTURE.md` | Add system boundary map | Make brownfield reconnaissance reliable |
| `docs/product/PRINCIPLES.md` | Add current product truth | Separate truth from historical research |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Add lifecycle | Standardize AI-assisted work |
| `docs/templates/FEATURE_WORK_PACKET.md` | Add durable artifact | Support planning and handoff |
| `docs/plans/` | Add active/completed lifecycle | Preserve execution history |
| `.github/pull_request_template.md` | Add review contract | Make evidence visible |
| `scripts/check-project-knowledge.mjs` | Add executable checks | Prevent selected documentation regressions |
| `package.json`, CI | Wire command into gates | Enforce workflow automatically |
| `README.md`, `docs/PRODUCT.md` | Remove stale product claims | Restore current truth |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: no runtime impact.
- Rollback: revert the squash commit.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Process becomes too heavy for tiny fixes | Explicit tiny-change exception |
| New docs duplicate existing docs | Root files act as maps and link focused references |
| Agent ignores prose | CI script and PR checklist enforce selected rules |
| CI becomes brittle | Check only required sources and actionable stale claims |
| Historical documents trigger false failures | Validate current-truth files only |

### Verification plan

- Static: `npm run check:knowledge`, lint and typecheck.
- Unit/domain: existing tests unchanged and green.
- Database: existing reset + pgTAP green.
- Browser flow: existing smoke green; no UI behavior changes expected.
- Responsive/visual: existing audit green; no visual diff expected.
- Production/manual: confirm deployment succeeds; no route behavior changed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Rewrite agent and product orientation | none | knowledge check | done |
| T2 | Add architecture and AI workflow sources | T1 | file review | done |
| T3 | Add work packet and plan lifecycle | T2 | this packet | done |
| T4 | Add PR template and executable knowledge contract | T3 | CI step | done |
| T5 | Run full CI and fix regressions | T4 | GitHub Actions | in progress |
| T6 | Move packet to completed and verify production | T5 | merge/deployment record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Sources of truth exist and are linked | repository diff | pending final review |
| Stale current-product claims removed | `check:knowledge` | pending CI |
| Existing quality gates remain green | GitHub Actions | pending CI |

### Review findings

- Correctness: pending.
- Security/ownership: no runtime or data changes.
- UI/UX/accessibility: no UI change.
- Maintainability/duplication: pending final diff review.
- Scope compliance: no product implementation intended.

### Remaining limitations

- The workflow improves agent behavior but cannot guarantee judgment quality.
- Spec Kit or another tool may later provide command ergonomics, but must reuse these sources of truth.

## Delivery record

- Branch: `agent/ai-project-operating-system`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
