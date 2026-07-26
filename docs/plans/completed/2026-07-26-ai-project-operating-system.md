# AI project operating system

**Status:** completed  
**Owner:** AI agent with human product owner  
**Issue/PR:** #77  
**Last updated:** 2026-07-26

## Outcome

Make MoneyFlow easier and safer for coding agents to understand, plan, implement and review by turning repository knowledge, product truth and delivery steps into versioned artifacts and executable CI checks.

## Repository reconnaissance

### Current behavior before the change

- The repository already had extensive product, research, runtime and autopilot documentation.
- `AGENTS.md` mixed product law, Grok runtime, queue state, engineering rules and outdated feature claims.
- `README.md` and `docs/PRODUCT.md` still described a retired daily-spending recommendation as current product behavior.
- No root `ARCHITECTURE.md`, standard feature work packet, active/completed execution-plan lifecycle or PR template existed.
- CI already enforced deployment configuration, lint, typecheck, unit tests, production build, Supabase pgTAP, browser smoke and cross-device UI audit.

### Relevant repository areas

| Area | Why it matters | Result |
|---|---|---|
| `AGENTS.md` | Entry context for agents | Rewritten as concise map |
| `README.md` | Human and agent orientation | Aligned with current truth |
| `docs/PRODUCT.md` | Existing short product focus | Preserved role; stale claims removed |
| `docs/AI_UIUX_WORKFLOW.md` | Existing researched UI process | Reused and linked |
| `.github/workflows/ci.yml` | Existing enforcement layer | Knowledge contract added |
| `package.json` and `scripts/` | Repeatable commands | `check:knowledge` added |

### Existing tests and constraints

- Existing CI remained broad and was not weakened.
- No production behavior, schema, finance calculation or runtime dependency changed.
- Documentation was organized around sources of truth instead of creating another product roadmap.

### Similar implementation and recent history

- The UI/UX workflow already used research, multiple design directions, browser evidence and production verification.
- Recent work removed an unsupported spending recommendation from product presentation, but current orientation docs had not been fully updated.

### Resolved questions

- [x] Should Spec Kit be installed immediately? No. First establish a small repository-native contract; an external framework can later reuse it.
- [x] Should all historical research be rewritten? No. Current sources of truth were marked and historical evidence was preserved.

## Research

### Questions researched

1. Which practices from AI-native engineering teams are useful for a small brownfield project?
2. Which practices can be enforced cheaply inside the repository?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| OpenAI harness engineering | 2026-07-26 | Short agent map, repository knowledge, executable constraints, browser/observability feedback | Large internal environment; adapted rather than copied at full scale |
| Anthropic long-running agent workflows | 2026-07-26 | Planner/builder/evaluator separation and durable artifacts | Multi-agent scale is unnecessary for the current project |
| GitHub coding-agent guidance | 2026-07-26 | Focused issues, acceptance criteria, branch/PR/CI workflow | Product decisions still require human ownership |
| Vercel AI/preview workflow | 2026-07-26 | Prototype/review/deploy feedback through real environments | UI tooling does not replace repository contracts |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Install BMAD or a large multi-agent framework | Many roles/workflows included | Heavy process, duplicated docs, context overhead | Rejected for now |
| Install Spec Kit immediately | Standard commands and templates | Could add another source of truth before repository cleanup | Deferred |
| Repository-native lightweight operating system | Fits current CI and docs; easy to inspect | Requires discipline and maintenance | Selected |

### Research decision

Adopt the common principles rather than a large framework: concise agent entrypoint, explicit architecture/product truth, versioned work packets, separate implementation/evaluation and executable CI checks. This is an adaptation to MoneyFlow's size and existing tooling.

## Specification

### Problem

Coding agents could read many documents but could not reliably determine which were current, which were historical or what had to happen before implementation. Stale product claims could survive after code changes, and plans could disappear inside chat history.

### User stories

- As the project owner, I can see current product and architecture truth without reading every historical document.
- As a coding agent, I can audit, research, specify and plan using one reusable work packet.
- As a reviewer, I can evaluate a PR against explicit acceptance criteria and evidence.
- As CI, I can block selected knowledge regressions automatically.

### Acceptance criteria

- [x] `AGENTS.md` is a concise index with current product and delivery rules.
- [x] A root architecture map exists.
- [x] Current product principles reject guessing a spending plan from total assets.
- [x] A documented AI delivery lifecycle and reusable work packet exist.
- [x] Active and completed plan directories have clear semantics.
- [x] Pull requests request reconnaissance, scope and evidence.
- [x] `npm run check:knowledge` validates required files and selected stale claims.
- [x] CI runs the knowledge contract before normal code verification.
- [x] README and current product focus no longer claim the retired feature is active.
- [x] Existing MVP readiness references remain linked and tested.

### Required states

- Loading: not applicable.
- Empty: active plan directory is valid with only its README.
- Populated: each active packet must contain required lifecycle headings.
- Validation/error: the script prints actionable failures and exits non-zero.
- Recovery/undo: documentation/scripts are reversible through Git.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: no product UI changes.
- Accessibility: not applicable.

### Financial and security constraints

- Production finance behavior remained unchanged.
- Stale current-truth claims were removed without deleting historical evidence.
- No credentials, provider values or runtime dependencies were added.

### Out of scope

- Installing Spec Kit, BMAD or OpenSpec.
- Reorganizing all historical documents.
- Changing product code, database schema or deployment configuration.
- Building autonomous multi-agent execution.

## Implementation plan

### Architecture fit

Repository guidance belongs in root maps and `docs/`; repeatable validation belongs in `scripts/` and CI. Existing product, UI and security documents remain focused references.

### Implemented changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | Converted to concise map | Reduce context drift |
| `ARCHITECTURE.md` | Added system boundary map | Make brownfield reconnaissance reliable |
| `docs/product/PRINCIPLES.md` | Added current product truth | Separate truth from historical research |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Added lifecycle | Standardize AI-assisted work |
| `docs/templates/FEATURE_WORK_PACKET.md` | Added durable artifact | Support planning and handoff |
| `docs/plans/` | Added active/completed lifecycle | Preserve execution history |
| `.github/pull_request_template.md` | Added review contract | Make evidence visible |
| `scripts/check-project-knowledge.mjs` | Added executable checks | Prevent selected documentation regressions |
| `package.json`, CI | Wired command into gates | Enforce workflow automatically |
| `README.md`, `docs/PRODUCT.md` | Removed stale product claims | Restore current truth |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: no runtime impact.
- Rollback: revert squash commit `d9f18cae91cdf5a70335d8e7213f8d3b5d235448`.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Process becomes too heavy for tiny fixes | Explicit tiny-change exception |
| New docs duplicate existing docs | Root files act as maps and link focused references |
| Agent ignores prose | CI script and PR checklist enforce selected rules |
| CI becomes brittle | Check only required sources and actionable stale claims |
| Historical documents trigger false failures | Validate current-truth files only |
| New orientation drops an existing contract | Existing MVP definition test caught the missing link; link restored rather than weakening the test |

### Verification plan and result

- Static: knowledge contract, deployment contract, lint and typecheck passed.
- Unit/domain: complete unit/static RLS suite passed after restoring the MVP readiness link.
- Database: fresh Supabase reset and pgTAP passed.
- Browser flow: expense-path browser smoke passed.
- Responsive/visual: cross-device UI audit passed.
- Production/manual: Vercel deployment for the squash commit succeeded; no user-facing route behavior changed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Rewrite agent and product orientation | none | knowledge check | done |
| T2 | Add architecture and AI workflow sources | T1 | file review | done |
| T3 | Add work packet and plan lifecycle | T2 | this packet | done |
| T4 | Add PR template and executable knowledge contract | T3 | CI step | done |
| T5 | Run full CI and fix regressions | T4 | CI run `30200762653` | done |
| T6 | Move packet to completed and verify production | T5 | deployment status + archive PR | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Sources of truth exist and are linked | PR #77 diff | pass |
| Stale current-product claims removed | `check:knowledge` in CI | pass |
| Existing readiness contract preserved | `mvp-definition.test.ts` failed first run, links restored, rerun passed | pass |
| Existing quality gates remain green | CI run `30200762653` | pass |
| Production deployment succeeds | Vercel status on squash commit | pass |

### Review findings

- Correctness: current truth is separated from historical research and existing MVP references remain intact.
- Security/ownership: no runtime, credential, database or ownership changes.
- UI/UX/accessibility: no UI change; browser and responsive gates still passed.
- Maintainability/duplication: root documents are maps; focused existing documents remain authoritative for their domains.
- Scope compliance: no product implementation or dependency framework was introduced.

### Remaining limitations

- The workflow improves agent behavior but cannot guarantee judgment quality.
- Spec Kit or another tool may later provide command ergonomics, but it must reuse these sources of truth instead of creating a parallel process.
- Only selected stale claims are executable checks; future recurring documentation failures should be promoted into the script or tests.

## Delivery record

- Branch: `agent/ai-project-operating-system`
- PR: #77
- Squash commit: `d9f18cae91cdf5a70335d8e7213f8d3b5d235448`
- CI run: `30200762653`
- Production deployment: Vercel status succeeded for the squash commit
- Production flow verified: deployment succeeded; change was documentation/CI only with no user-facing route mutation
- Work packet moved to `docs/plans/completed/`: this archive change
