# Engineering foundations reference map

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #176  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow has a maintained engineering-foundations research map covering AI-assisted development, evidence-based research, product direction, project organization, clean code, architecture, testing, security, documentation, CI/CD, observability, licensing and learning foundations. Future agents can select a small, justified evidence set instead of relying on chat memory, popularity rankings or unbounded GitHub browsing.

## Repository reconnaissance

### Current behavior

- PR #176 already adds a finance-product repository map organized around MoneyFlow's ledger, capture, planning, reporting, security and verification needs.
- The existing map includes several engineering tools, but does not provide a complete operating model for AI coding, research discipline, product discovery, code quality or architecture learning.
- `AGENTS.md`, `ARCHITECTURE.md`, `docs/MVP_DEFINITION.md` and `docs/templates/FEATURE_WORK_PACKET.md` already define strong internal workflow and boundary rules.
- `docs/research/README.md` previously indexed only the original five-part product research series.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/REPOSITORY_REFERENCE_MAP.md` | Finance-product and implementation-source map | Reuse; keep product/domain focus |
| `docs/research/README.md` | Research discovery entrypoint | Update to index both active maps |
| `docs/templates/FEATURE_WORK_PACKET.md` | Defines focused research and planning workflow | Reuse as operating authority |
| `AGENTS.md` | Defines agent constraints and repository traps | Reuse; external agent repos cannot override it |
| `ARCHITECTURE.md` | Defines current modular-monolith boundaries | Reuse as architecture authority |
| `docs/MVP_DEFINITION.md` | Defines current product scope and non-goals | Reuse as product authority |

### Existing tests and constraints

- Related unit tests: not applicable to document content.
- Database/RLS tests: not applicable; no runtime or schema change.
- Browser tests: not applicable; no rendered product change.
- Product/architecture constraints: reference maps are advisory evidence only; they cannot approve dependencies, features or architecture expansion.

### Similar implementation and recent history

- Existing pattern: research documents under `docs/research/` with status, scope and source tables.
- Existing delivery pattern: non-trivial documentation changes use an active work packet and draft PR.
- Existing risk: historical autopilot work expanded Inbox/product scope without respecting the current product synthesis; the new map explicitly prevents repo popularity or AI capability from becoming product direction.

### Open questions

- [x] Should engineering foundations be merged into the finance map or separated? Separate, to preserve discoverability and avoid one unbounded document.
- [x] How many repositories should a task study? Two to four focused sources by default.
- [x] How should AI coding tools be evaluated? By final diff correctness, scope, tests, evidence and maintainability—not autonomy or output volume.
- [x] How should tool adoption be constrained? Documented problem, simpler alternatives, license/security/operational fit, owner boundary, tests and rollback.

## Research

### Questions researched

1. Which open-source coding agents best expose context, permissions, patching, tool use and evaluation patterns?
2. Which repositories help build reliable research, product-discovery and specification skills?
3. Which references are useful for clean TypeScript, modular architecture, database correctness, testing, security, documentation and CI/CD?
4. How should MoneyFlow learn from large projects without copying their scope, monorepos, services or process overhead?

### Sources

| Source group | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Codex, Claude Code, Gemini CLI, Qwen Code, Aider, Cline, OpenHands and SWE-agent | 2026-08-01 | Coding-agent context, permissions, edit/test loops and evaluation approaches | Tool architecture and vendor-specific behavior are not product requirements |
| AGENTS.md, Spec Kit, MCP and BMAD repositories | 2026-08-01 | Repository instructions, specification artifacts, tool contracts and structured AI workflows | MoneyFlow keeps its existing workflow and only adopts proven improvements |
| STORM, GPT Researcher, Open Deep Research, MarkItDown and Zotero | 2026-08-01 | Research decomposition, source ingestion, synthesis and evidence organization | Generated reports require source verification and applicability analysis |
| Clean-code, TypeScript, architecture and DDD repositories listed in the map | 2026-08-01 | Naming, boundaries, decision records and structural alternatives | Heuristics and examples are not universal rules or folder templates |
| Testing, OWASP, supply-chain and observability repositories listed in the map | 2026-08-01 | Layered verification, adversarial thinking and operational evidence | Tools supplement, not replace, domain and production reasoning |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Expand the existing finance map indefinitely | One file | Becomes difficult to navigate and mixes product/domain research with engineering learning | Rejected |
| Keep recommendations in conversation only | No repository maintenance | Context loss, repeated research and no reviewable source policy | Rejected |
| Add a flat “awesome” list | Broad coverage | Encourages popularity-driven adoption and provides no boundaries | Rejected |
| Add a companion engineering map with workflows and guardrails | Discoverable, actionable and scoped | Requires periodic maintenance | Selected |

### Research decision

Create `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` as a companion to the finance-product map. Organize it around the complete development lifecycle, state what each source is useful for, record MoneyFlow-specific boundaries, provide default research bundles and require an adoption checklist before adding tools or architecture.

## Specification

### Problem

Without a foundation map, AI agents and the owner may discover tools reactively, overvalue popular repositories, copy architecture from larger products or rely on generated summaries without a durable research protocol. This makes MoneyFlow more complex while reducing the owner's ability to understand and review it.

### User stories

- As the owner, I can identify which repositories teach the exact engineering skill needed for a MoneyFlow task.
- As an AI coding agent, I can follow a bounded context, research and verification workflow.
- As a reviewer, I can distinguish a useful pattern from unjustified tool or architecture adoption.
- As a learner, I can follow foundations connected to real project work without trying to complete every roadmap first.

### Acceptance criteria

- [x] AI-assisted engineering repositories are grouped by purpose and bounded by MoneyFlow agent rules.
- [x] A repeatable research protocol separates facts, inference, limits and decisions.
- [x] Product-direction sources do not override MVP or self-use evidence.
- [x] Project organization, clean code and architecture references include explicit anti-cargo-cult boundaries.
- [x] Testing, security, documentation, CI/CD, observability and licensing foundations are covered.
- [x] The map includes default source bundles and a tool-adoption checklist.
- [x] `docs/research/README.md` exposes both active reference maps.
- [x] No dependency, runtime, schema, workflow or product behavior changes.

### Required states

- Loading: not applicable.
- Empty: the document explains how to add sources when a domain is not covered.
- Populated: all current engineering lifecycle areas have focused source groups.
- Validation/error: stale, archived or materially changed sources must be downgraded or removed when used.
- Recovery/undo: revert documentation commits or close the PR.
- Long data / large VND: the map preserves MoneyFlow financial invariants but contains no user data.
- Mobile/tablet/desktop: not applicable to product UI.
- Accessibility: Markdown headings and tables remain navigable; no visual-only information is required.

### Financial and security constraints

- External repositories cannot change integer-VND, balanced-transfer or no-guessed-planning invariants.
- AI agents cannot bypass server-derived identity, RLS or database verification.
- Tool recommendations require license, secret, data-privacy and operational-boundary review.
- Observability guidance explicitly prohibits copying financial content into telemetry.

### Out of scope

- Installing or configuring any listed tool.
- Changing MoneyFlow's AI delivery workflow.
- Adding an AI feature to the product.
- Migrating architecture, folders, CI or documentation platforms.
- Ranking repositories by stars or model benchmark scores.
- Creating a general-purpose AI agent framework.

## Implementation plan

### Architecture fit

The document lives under `docs/research/` as advisory evidence. It links to existing authority rather than replacing it. The research README indexes both reference maps. No runtime boundary changes.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` | Add lifecycle-organized source map, MoneyFlow rules, research bundles and adoption checklist | Preserve and operationalize engineering research |
| `docs/research/README.md` | Index finance and engineering reference maps | Make active research discoverable |
| `docs/plans/active/engineering-foundations-reference-map.md` | Record decision, scope and evidence | Follow project workflow |
| PR #176 | Expand title/body and review focus | Keep review target honest |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: Markdown only.
- Rollback: revert commits.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| The map becomes a tool-shopping catalog | Every source states use and boundary; adoption checklist requires a real problem |
| AI autonomy replaces review | Agent rules require work packets, bounded diffs and layered evidence |
| Large-project architecture is copied | Architecture section requires proven boundaries and simpler alternatives |
| Research becomes endless | Two-to-four-source default and decision-focused protocol |
| Learning resources are mistaken for authority | Learning section explicitly labels them non-authoritative |
| Links or maintenance status become stale | Last-reviewed date and removal/downgrade rule |
| Public code is copied without permission | Dedicated licensing section and compatibility checklist |

### Verification plan

- Static: inspect headings, links, source grouping and internal-document references.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable.
- Repository review: compare branch with `main` and ensure only Markdown files changed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Inspect current product, architecture, workflow and existing reference map | none | authoritative documents and PR #176 reviewed | done |
| T2 | Research coding-agent and AI workflow repositories | T1 | AI engineering sections | done |
| T3 | Research evidence, product-direction and learning repositories | T1 | research/product/foundation sections | done |
| T4 | Research clean code, architecture, testing, security and operations repositories | T1 | engineering lifecycle sections | done |
| T5 | Add MoneyFlow-specific boundaries, bundles and adoption checklist | T2–T4 | rules and decision sections | done |
| T6 | Index both maps in the research README | T5 | updated README | done |
| T7 | Update PR scope and inspect final diff | T5–T6 | PR metadata and comparison | in progress |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Full engineering lifecycle covered | 17 sections in `ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` | pass |
| AI workflow is governed, not merely listed | MoneyFlow agent rules and evaluation criteria | pass |
| Research protocol is actionable | ten-step protocol and anti-patterns | pass |
| Tool adoption is bounded | adoption checklist and removal rule | pass |
| Product scope remains locked | direction rules and out-of-scope statements | pass |
| Research maps are discoverable | updated `docs/research/README.md` | pass |
| Runtime unchanged | Markdown-only branch diff | pass |

### Review findings

- Correctness: source groups align with actual MoneyFlow development concerns.
- Security/ownership: least privilege, RLS and telemetry privacy are explicit.
- UI/UX/accessibility: product-direction and frontend sections require observed behavior and accessible evidence.
- Maintainability/duplication: finance and engineering concerns are separated into companion maps.
- Scope compliance: no feature, dependency or architecture change is authorized.

### Remaining limitations

- Repository ownership, maintenance and licenses can change; sources require rechecking when used.
- The map cannot replace hands-on reading of the specific files relevant to a decision.
- A listed tool may still be inappropriate because of bundle, provider, privacy or maintenance cost.

## Delivery record

- Branch: `agent/repository-reference-map`
- PR: #176
- Squash commit: pending
- CI run: pending/documentation gates only
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after merge according to repository process
