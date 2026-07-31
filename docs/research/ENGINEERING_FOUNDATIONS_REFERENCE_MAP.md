# MoneyFlow engineering foundations reference map

**Status:** active research reference  
**Last reviewed:** 2026-08-01  
**Applies to:** AI-assisted development, research, product discovery, project organization, code quality, architecture, verification, security and operations

## Purpose

This document maps useful open-source repositories to the engineering capabilities required to build and maintain MoneyFlow well. It complements [`REPOSITORY_REFERENCE_MAP.md`](./REPOSITORY_REFERENCE_MAP.md), which focuses on finance-product behavior and implementation references.

This map is not:

- a dependency list;
- an instruction to install every tool;
- permission for an AI agent to bypass MoneyFlow's product, architecture or security rules;
- a replacement for reading the current repository before changing it;
- a generic “best practices” checklist applied without evidence.

MoneyFlow remains a single-deployment Next.js/Supabase modular monolith. External repositories provide patterns, counterexamples, evaluation techniques and learning material. They do not override `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/MVP_DEFINITION.md`, the current work packet or verified production behavior.

## How to use this map

For a non-trivial task:

1. Inspect the current MoneyFlow source of truth, code, tests and recent history.
2. State the unresolved question before researching.
3. Choose **two to four** repositories from the smallest relevant section.
4. Prefer primary or official repositories for technology behavior.
5. Record what each source establishes, what is inferred and what does not apply.
6. Convert research into a bounded specification and acceptance criteria.
7. Implement the smallest coherent vertical slice.
8. Verify at the correct layers: static, domain, database, browser, responsive and production as applicable.
9. Preserve evidence in the work packet and PR.
10. Add a source to this map only when it contributes evidence not already represented.

## Source labels

| Label | Meaning |
|---|---|
| **Primary study** | Read deeply when the named problem applies. |
| **Pattern reference** | Learn a bounded technique, not the whole architecture. |
| **Tool candidate** | Evaluate only after proving need, license fit and operational cost. |
| **Evaluation reference** | Use to design tests, benchmarks or review criteria. |
| **Deferred** | Relevant only after current product and reliability gates are complete. |
| **Counterexample** | Useful mainly to understand what MoneyFlow should not adopt. |

## The MoneyFlow development loop

```text
observed problem
    ↓
repository reconnaissance
    ↓
focused external research
    ↓
specification + acceptance criteria
    ↓
architecture fit + task plan
    ↓
small implementation
    ↓
layered verification
    ↓
review + production evidence
    ↓
recorded learning
```

AI can accelerate each step. It cannot remove a step whose purpose is correctness, security, user evidence or accountability.

---

# 1. AI-assisted software engineering

## 1.1 Coding agents and agent interfaces

| Repository | Use for | Boundary for MoneyFlow |
|---|---|---|
| [openai/codex](https://github.com/openai/codex) | Repository-aware coding-agent loop, tool use, patching, command execution and reviewable changes | Primary study for agent workflow; never treat model output as verification. |
| [anthropics/claude-code](https://github.com/anthropics/claude-code) | Terminal agent behavior, repository instructions, hooks, permissions and long-running coding work | Study context and workflow patterns; do not duplicate vendor-specific configuration without need. |
| [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | Open CLI-agent architecture, tool confirmation, extensions and command workflows | Compare permission and extension models. |
| [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | Alternative coding CLI, model/provider abstraction and extensibility | Pattern reference; provider breadth is not itself a MoneyFlow requirement. |
| [Aider-AI/aider](https://github.com/Aider-AI/aider) | Git-aware editing, repository maps, small commits and edit/test loops | Strong reference for bounded diffs and explicit file context. |
| [cline/cline](https://github.com/cline/cline) | Human-approved tool actions, browser/terminal use and IDE workflow | Study approval boundaries; avoid approval fatigue from excessive micro-confirmations. |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | Sandboxed autonomous software-agent runtime and task execution | Evaluation/counterexample for autonomy; MoneyFlow does not need its own agent platform. |
| [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent) | Issue-to-patch agent design and software-engineering evaluation | Learn constrained issue solving and reproducible environments. |
| [continuedev/continue](https://github.com/continuedev/continue) | IDE context providers, model configuration and reusable AI development workflows | Pattern reference for context selection and provider independence. |
| [aaif-goose/goose](https://github.com/aaif-goose/goose) | Extensible local agent, tool ecosystem and MCP-style integrations | Study extension boundaries; do not add broad tool access by default. |

### MoneyFlow agent rules

- An agent starts with repository reconnaissance, not implementation.
- A non-trivial change requires a work packet.
- Agents do not push feature/fix commits directly to `main`.
- Agents must not invent financial data, product requirements or production state.
- Agents may propose architecture changes; they do not create a new layer merely because another repo has it.
- Every mutation involving money or ownership needs the applicable domain, database and browser evidence.
- A green build is not proof of RLS, usability or production correctness.
- The agent that wrote the change may evaluate it, but evidence must be independently inspectable.

## 1.2 Agent context, instructions and tool protocols

| Repository | Use for | Boundary |
|---|---|---|
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | Portable repository instructions for coding agents | Primary reference for concise, local, testable agent guidance. |
| [github/spec-kit](https://github.com/github/spec-kit) | Specification-driven development with AI | Strong comparison for MoneyFlow's work-packet workflow. |
| [modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol) | Standardized context/tool protocol concepts | Use to understand tool contracts and least privilege; not a reason to expose all services. |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Example server/tool integrations | Pattern reference; each connector expands the security boundary. |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Role-based AI planning and structured development workflows | Study decomposition and artifacts; avoid ceremony, fictional roles and document generation without evidence. |
| [microsoft/autogen](https://github.com/microsoft/autogen) | Multi-agent orchestration and tool-mediated collaboration | Deferred; multiple agents do not automatically improve correctness. |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | Stateful, inspectable agent workflows | Deferred for product/runtime agents; useful conceptually for explicit state transitions. |
| [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | Agent handoffs, tools, traces and guardrail concepts | Pattern reference only; MoneyFlow currently has no need for a runtime AI agent. |
| [vercel/ai](https://github.com/vercel/ai) | TypeScript AI application primitives, tool calls and streaming | Deferred unless an approved product feature requires AI. |

### Context design principles

- Keep authoritative rules close to the code they govern.
- Separate permanent repository constraints from task-specific instructions.
- Provide agents with file paths and observable acceptance criteria, not vague personas.
- Restrict tools to the task's needs.
- Treat retrieved content as untrusted input.
- Keep the current branch, base branch, production state and runtime mode explicit.
- Summarize decisions in repository artifacts rather than relying on chat history.

## 1.3 Evaluating AI engineering work

| Repository | Use for |
|---|---|
| [SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench) | Real-repository issue resolution benchmarks and limitations of pass-rate claims |
| [openai/evals](https://github.com/openai/evals) | Evaluation design, datasets and reproducible scoring concepts |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | Prompt/model regression tests, assertions and comparison runs |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | Tracing and evaluation concepts for AI systems |
| [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix) | AI tracing, retrieval and evaluation patterns |

MoneyFlow measures an AI coding workflow by:

- correctness of the final diff;
- scope compliance;
- financial and tenant-safety invariants;
- quality and relevance of tests;
- reproducible evidence;
- absence of invented claims;
- maintainability after the agent leaves.

Token count, number of generated files and apparent autonomy are not success metrics.

---

# 2. Research skills and evidence discipline

| Repository | Use for | Boundary |
|---|---|---|
| [stanford-oval/storm](https://github.com/stanford-oval/storm) | Multi-perspective topic exploration, outline construction and cited synthesis | Learn decomposition and synthesis; verify every material claim independently. |
| [assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher) | Automated search, source gathering and report construction | Pattern reference; breadth does not guarantee source quality. |
| [langchain-ai/open_deep_research](https://github.com/langchain-ai/open_deep_research) | Open deep-research agent workflow and configurable research stages | Study state and source handling, not framework adoption. |
| [microsoft/markitdown](https://github.com/microsoft/markitdown) | Converting source documents into model-readable Markdown | Tool candidate for research ingestion, not a truth validator. |
| [zotero/zotero](https://github.com/zotero/zotero) | Source collection, metadata and citation management | Primary reference for durable source organization. |
| [papers-we-love/papers-we-love](https://github.com/papers-we-love/papers-we-love) | Building a habit of reading primary technical literature | Learning reference. |
| [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) | Prompting and evaluation concepts | Use critically; prompts do not replace requirements or tests. |
| [openai/evals](https://github.com/openai/evals) | Turning qualitative expectations into repeatable evaluations | Evaluation reference. |

## Research protocol for MoneyFlow

1. **Define the decision.** Write the exact unresolved question.
2. **Inspect internal truth first.** Current code and verified behavior outrank assumptions.
3. **Set source hierarchy.** Prefer official documentation, standards, primary repositories and original research.
4. **Check currency.** Confirm maintenance status and dates for fast-changing technology.
5. **Collect competing evidence.** Do not search only for confirmation.
6. **Extract claims separately.** Record what the source actually establishes.
7. **Record limits.** Different scale, stack, license, user or threat model may make a source non-applicable.
8. **Triangulate important conclusions.** One project is an example, not a universal rule.
9. **Separate fact, inference and decision.** MoneyFlow may choose differently from a source.
10. **Translate into acceptance criteria.** Research is incomplete until it constrains a decision.

## Research anti-patterns

- Searching for “best architecture” without a concrete problem.
- Ranking technology by stars alone.
- Treating generated summaries as primary evidence.
- Copying a feature because competitors have it.
- Using one benchmark as proof of general model quality.
- Citing a repository without reading the relevant implementation or documentation.
- Hiding uncertainty behind confident prose.
- Researching indefinitely after the decision is sufficiently bounded.

---

# 3. Product direction and app development

| Repository | Use for | Boundary |
|---|---|---|
| [github/spec-kit](https://github.com/github/spec-kit) | Turning intent into specification, plan and tasks | Compare with MoneyFlow work packets; preserve the existing source-of-truth hierarchy. |
| [basecamp/handbook](https://github.com/basecamp/handbook) | Written operating principles, ownership and communication | Cultural reference, not a process to copy wholesale. |
| [18F/methods](https://github.com/18F/methods) | User-research and service-design methods | Strong reference for interviews, observation and usability studies. |
| [alphagov/govuk-design-system](https://github.com/alphagov/govuk-design-system) | Evidence-led service patterns, accessibility and content design | Learn clarity and validation; visual identity does not apply. |
| [PostHog/posthog](https://github.com/PostHog/posthog) | Product analytics, experimentation and feature-flag concepts | MoneyFlow must avoid collecting sensitive financial content. |
| [gothinkster/realworld](https://github.com/gothinkster/realworld) | One product specification implemented across many stacks | Useful counterexample for comparing architecture without changing product behavior. |
| [calcom/cal.com](https://github.com/calcom/cal.com) | Mature open product organization, workflows and Next.js application patterns | Scale and monorepo choices exceed current MoneyFlow needs. |
| [dubinc/dub](https://github.com/dubinc/dub) | Production Next.js product, dashboard and engineering organization | Pattern reference; do not cargo-cult packages or services. |
| [outline/outline](https://github.com/outline/outline) | Focused product scope, collaboration flows and mature web-app maintenance | Product/organization reference only. |
| [immich-app/immich](https://github.com/immich-app/immich) | Open product roadmap, release discipline and user-facing reliability | Native/mobile/media architecture does not apply. |

## Direction rules for MoneyFlow

A feature is justified by at least one of:

- a core MVP requirement;
- an observed failure in real use;
- a financial-correctness or security risk;
- repeated manual cost;
- reliable user evidence;
- a regulatory or platform requirement.

A feature is not justified merely because:

- another app has it;
- an AI can build it;
- a library makes it easy;
- it looks impressive in a demo;
- it increases the number of pages;
- it might be useful someday.

The current product loop remains:

```text
capture → know balances → understand the period → correct/reconcile → export
```

New work should improve that loop before expanding into bank aggregation, OCR, investment tracking, family collaboration or AI financial advice.

---

# 4. Project organization and engineering workflow

| Repository | Use for | Label |
|---|---|---|
| [github/spec-kit](https://github.com/github/spec-kit) | Spec → plan → tasks workflow | Primary comparison |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | Repository-local agent instructions | Primary reference |
| [joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | ADR concepts and decision templates | Pattern reference |
| [adr/madr](https://github.com/adr/madr) | Compact Markdown ADR format | Pattern reference |
| [conventional-commits/conventionalcommits.org](https://github.com/conventional-commits/conventionalcommits.org) | Structured commit-message convention | Current-style reference; do not encode project management in commit syntax. |
| [changesets/changesets](https://github.com/changesets/changesets) | Versioning and changelogs in package repositories | Deferred while MoneyFlow is one private application. |
| [commitizen-tools/commitizen](https://github.com/commitizen-tools/commitizen) | Commit workflow automation | Optional; current human-readable commits may be sufficient. |
| [semantic-release/semantic-release](https://github.com/semantic-release/semantic-release) | Automated release versioning and publication | Deferred until release semantics require it. |
| [renovatebot/renovate](https://github.com/renovatebot/renovate) | Dependency-update automation and grouping | Tool candidate; compare with existing Dependabot. |
| [dependabot/dependabot-core](https://github.com/dependabot/dependabot-core) | Dependency-update behavior and ecosystem support | Current operational reference. |
| [actions/starter-workflows](https://github.com/actions/starter-workflows) | GitHub Actions patterns | Primary workflow reference, adapted to MoneyFlow gates. |
| [probot/probot](https://github.com/probot/probot) | Repository automation using GitHub Apps | Deferred until repeated repository work justifies a bot. |

## Organization principles

- One source of truth per kind of decision.
- A task has one observable outcome.
- Parallel work must not silently edit overlapping ownership areas.
- Work packets change before implementation scope changes.
- Active plans are not permanent documentation.
- Completed plans preserve reasoning and evidence, not stale active instructions.
- Issues track backlog; Markdown documents explain decisions and execution.
- A pull request should be small enough to review honestly.
- Branch stacks must declare their base and merge order.
- Production verification is distinct from CI success.

---

# 5. Clean code, refactoring and TypeScript quality

| Repository | Use for | Boundary |
|---|---|---|
| [ryanmcdermott/clean-code-javascript](https://github.com/ryanmcdermott/clean-code-javascript) | Naming, functions, error handling and common JavaScript code smells | Heuristics, not laws; do not refactor stable code only to match examples. |
| [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) | Node.js reliability, security and maintainability practices | Select practices relevant to Next.js/server code. |
| [airbnb/javascript](https://github.com/airbnb/javascript) | JavaScript style and consistency patterns | Style reference; MoneyFlow's configured lint rules are authoritative. |
| [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | Language behavior, compiler issues and design | Primary source for TypeScript semantics. |
| [eslint/eslint](https://github.com/eslint/eslint) | Static-analysis rules and custom lint concepts | Current tool family. |
| [prettier/prettier](https://github.com/prettier/prettier) | Automated formatting philosophy | Reference only; do not add competing formatting ownership without need. |
| [oxc-project/oxc](https://github.com/oxc-project/oxc) | Modern JS/TS parsing, linting and transformation tooling | Study as ecosystem direction; migration requires measured benefit. |
| [webpro-nl/knip](https://github.com/webpro-nl/knip) | Unused files, exports and dependency detection | Strong tool candidate for repository hygiene. |
| [SonarSource/SonarJS](https://github.com/SonarSource/SonarJS) | Static-analysis patterns and maintainability rules | Secondary reference; avoid treating aggregate scores as truth. |
| [kettanaito/naming-cheatsheet](https://github.com/kettanaito/naming-cheatsheet) | Intent-revealing naming guidance | Pattern reference. |

## MoneyFlow clean-code rules

- Financial calculations live in pure domain modules when possible.
- UI components do not own accounting rules.
- Route pages authorize, load and compose; they do not duplicate persistence logic.
- Server Actions validate input and derive identity.
- Use names that express financial meaning: balance, allocated, obligation and spending plan are not interchangeable.
- Comments explain **why**, constraints or traps—not what syntax already says.
- Duplication is removed when it represents one changing rule, not merely similar text.
- Split files when responsibilities change independently or tests need a pure boundary, not because a line-count threshold was crossed.
- Avoid speculative interfaces, factories, repositories and service layers.
- Delete dead code only with evidence that the product cannot render or call it.
- Refactoring must preserve observable behavior unless behavior change is explicitly specified.

---

# 6. Software architecture and system design

| Repository | Use for | Boundary |
|---|---|---|
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | System-design vocabulary, tradeoffs and distributed-systems fundamentals | Learning reference; large-scale patterns are not default requirements. |
| [arc42/arc42-template](https://github.com/arc42/arc42-template) | Structured architecture documentation | Borrow sections selectively; avoid duplicating existing architecture docs. |
| [structurizr/dsl](https://github.com/structurizr/dsl) | C4 architecture models as code | Tool candidate only if diagrams become hard to maintain manually. |
| [C4-PlantUML/C4-PlantUML](https://github.com/C4-PlantUML/C4-PlantUML) | C4 diagrams using PlantUML | Pattern/tool reference. |
| [joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | Decision rationale and consequences | Primary documentation reference. |
| [adr/madr](https://github.com/adr/madr) | Lightweight ADR structure | Pattern reference. |
| [ddd-crew/context-mapping](https://github.com/ddd-crew/context-mapping) | Domain boundaries and relationships | Useful when ownership boundaries are genuinely unclear. |
| [ddd-crew/aggregate-design-canvas](https://github.com/ddd-crew/aggregate-design-canvas) | Aggregate invariants and transaction boundaries | Strong reference for ledger/transfer mutation design. |
| [kgrzybek/modular-monolith-with-ddd](https://github.com/kgrzybek/modular-monolith-with-ddd) | Modular-monolith boundaries, integration and tests | Primary pattern reference; its .NET structure is not a template for Next.js. |
| [Sairyss/domain-driven-hexagon](https://github.com/Sairyss/domain-driven-hexagon) | DDD, ports/adapters and domain isolation concepts | Use selectively; avoid layer proliferation. |
| [ardalis/CleanArchitecture](https://github.com/ardalis/CleanArchitecture) | Clean Architecture boundaries and dependency direction | Conceptual comparison, not a folder blueprint. |
| [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react) | Feature-oriented React application organization | Pattern reference; preserve MoneyFlow's proven ownership map. |
| [feature-sliced/documentation](https://github.com/feature-sliced/documentation) | Frontend dependency layers and feature slices | Counterexample/comparison; no migration without demonstrated coupling problems. |
| [vercel/turborepo](https://github.com/vercel/turborepo) | Monorepo task graph and caching | Deferred until independent packages or runtimes exist. |
| [nrwl/nx](https://github.com/nrwl/nx) | Large workspace boundaries and task orchestration | Deferred; current repository does not need an application platform. |

## Architecture decision test

Before adding a layer, service, adapter or package, ask:

- Does it have an independent source of truth or runtime?
- Does it protect a real security or ownership boundary?
- Does the same use case currently have multiple owners?
- Does pure logic need isolation from React, Next.js, Supabase or browser APIs?
- Have defects or repeated verification costs demonstrated the coupling?
- Can moving one function or contract solve the problem instead?

“Another project has this architecture” is not evidence.

---

# 7. Frontend architecture, Next.js and interaction systems

| Repository | Use for | Boundary |
|---|---|---|
| [vercel/next.js](https://github.com/vercel/next.js) | Next.js source, examples and current framework behavior | Primary source for framework questions. |
| [facebook/react](https://github.com/facebook/react) | React runtime behavior and design | Primary implementation source. |
| [reactjs/react.dev](https://github.com/reactjs/react.dev) | Official React guidance and examples | Primary learning/documentation source. |
| [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react) | Feature organization, data flow and testing | Pattern reference. |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Code-owned component composition | Current design reference. |
| [mui/base-ui](https://github.com/mui/base-ui) | Accessible unstyled primitives | Current primitive reference. |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | Accessible interaction primitives | Selective current reference. |
| [TanStack/query](https://github.com/TanStack/query) | Client cache/server-state behavior | Tool candidate only if current data ownership becomes insufficient. |
| [TanStack/table](https://github.com/TanStack/table) | Headless complex tables | Tool candidate for proven transaction-table requirements. |
| [vercel/commerce](https://github.com/vercel/commerce) | Production App Router and commerce UI patterns | Pattern reference; commerce domain and integrations do not apply. |
| [calcom/cal.com](https://github.com/calcom/cal.com) | Complex Next.js forms, workflows and product organization | Study selectively; avoid monorepo/scale cargo cult. |
| [dubinc/dub](https://github.com/dubinc/dub) | Modern Next.js dashboard and server patterns | Pattern reference. |

Frontend work must preserve:

- one mutation owner per use case and runtime;
- accessible names independent of visual CSS;
- real mobile/tablet/desktop evidence;
- explicit loading, empty, populated, error and recovery states;
- readable large VND values;
- no chart-only communication of critical facts;
- component ownership clear enough that deleting one stylesheet cannot silently remove a live contract.

---

# 8. Database design, PostgreSQL and migrations

| Repository | Use for | Boundary |
|---|---|---|
| [supabase/supabase](https://github.com/supabase/supabase) | Current platform, Postgres integration, Auth and local development | Primary platform source. |
| [postgres/postgres](https://github.com/postgres/postgres) | PostgreSQL behavior and source-level truth | Primary database source when documentation is insufficient. |
| [theory/pgtap](https://github.com/theory/pgtap) | Database unit tests for functions, constraints and policies | Current verification model. |
| [ankane/pghero](https://github.com/ankane/pghero) | Query and database-performance visibility | Tool candidate when production evidence justifies it. |
| [bytebase/bytebase](https://github.com/bytebase/bytebase) | Schema-change governance and review workflows | Pattern reference; another control plane is not currently required. |
| [sqitchers/sqitch](https://github.com/sqitchers/sqitch) | Database change management and dependency concepts | Comparison only; keep Supabase migrations unless a proven limitation exists. |
| [amacneil/dbmate](https://github.com/amacneil/dbmate) | Simple migration workflow | Comparison only. |
| [pgaudit/pgaudit](https://github.com/pgaudit/pgaudit) | PostgreSQL audit logging | Deferred; evaluate privacy and operational cost first. |
| [sqlfluff/sqlfluff](https://github.com/sqlfluff/sqlfluff) | SQL linting and formatting | Tool candidate if migration consistency becomes a real problem. |

Database rules:

- Constraints and policies protect invariants even when application code is wrong.
- Every user-owned table has an explicit ownership path.
- RLS behavior is proved with positive and adversarial pgTAP cases.
- Migrations are versioned, reproducible and tested from a fresh reset.
- Backfill, compatibility and rollback are specified before destructive changes.
- Financial RPCs derive identity from the authenticated context.
- Query optimization begins with measured plans and production-like data, not speculative indexes.

---

# 9. Testing, reliability and failure engineering

| Repository | Use for | Label |
|---|---|---|
| [microsoft/playwright](https://github.com/microsoft/playwright) | Browser flows, multiple engines, traces and screenshots | Primary current tool |
| [testing-library/react-testing-library](https://github.com/testing-library/react-testing-library) | User-observable component behavior | Tool candidate/reference |
| [mswjs/msw](https://github.com/mswjs/msw) | Network-level integration behavior and failures | Tool candidate |
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | Property-based tests and generated counterexamples | Strong tool candidate |
| [theory/pgtap](https://github.com/theory/pgtap) | Database invariants and RLS | Current tool |
| [stryker-mutator/stryker-js](https://github.com/stryker-mutator/stryker-js) | Mutation testing for test effectiveness | Selective tool candidate for financial core |
| [testcontainers/testcontainers-node](https://github.com/testcontainers/testcontainers-node) | Real dependency integration tests | Tool candidate if local Supabase coverage becomes insufficient |
| [Grafana/k6](https://github.com/grafana/k6) | Load and performance tests | Deferred until traffic or latency evidence requires it |
| [schemathesis/schemathesis](https://github.com/schemathesis/schemathesis) | Property-based API contract testing | Deferred while public API surface is small |
| [pact-foundation/pact-js](https://github.com/pact-foundation/pact-js) | Consumer-driven contracts | Deferred until independently deployed consumers exist |
| [Shopify/toxiproxy](https://github.com/Shopify/toxiproxy) | Network fault simulation | Deferred; browser/network controls may be sufficient |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | Automated accessibility testing | Strong tool candidate |
| [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | Performance regression evidence | Tool candidate/current research reference |

## Verification selection

| Change | Minimum relevant evidence |
|---|---|
| Pure financial rule | Unit examples + counterexamples; property tests when state space is broad |
| Ledger mutation | Unit + pgTAP constraints/RLS + browser flow |
| New user-owned table | Fresh reset + ownership FK + positive/negative RLS tests |
| Import/export | Fixture tests + malformed/hostile inputs + round trip + manual spreadsheet check |
| Auth/security boundary | Static checks + provider/config validation + browser flow + adversarial test |
| UI hierarchy | Responsive browser evidence + screenshots + keyboard/accessibility checks |
| Performance change | Before/after measurement under comparable conditions |
| Production config | Exact deployment and affected-route verification |

Tests must fail for the intended defect before they are trusted when practical. A test that asserts dead code, silently skips its target or checks a token instead of the rendered behavior is false assurance.

---

# 10. Application security and software supply chain

| Repository | Use for | Label |
|---|---|---|
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries) | Practical application-security requirements | Primary reference |
| [OWASP/ASVS](https://github.com/OWASP/ASVS) | Verification requirements and coverage gaps | Primary evaluation reference |
| [OWASP/threat-dragon](https://github.com/OWASP/threat-dragon) | Threat-modeling workflow and diagrams | Tool/pattern candidate |
| [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Secret scanning | Strong tool candidate |
| [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) | Secret discovery and verification | Secondary tool candidate |
| [semgrep/semgrep](https://github.com/semgrep/semgrep) | Pattern-based static analysis | Tool candidate |
| [github/codeql-action](https://github.com/github/codeql-action) | GitHub code scanning | Tool candidate |
| [actions/dependency-review-action](https://github.com/actions/dependency-review-action) | Dependency risk in pull requests | Strong tool candidate |
| [step-security/harden-runner](https://github.com/step-security/harden-runner) | GitHub Actions runner monitoring/hardening | Strong tool candidate |
| [ossf/scorecard](https://github.com/ossf/scorecard) | Open-source supply-chain posture | Evaluation reference |
| [aquasecurity/trivy](https://github.com/aquasecurity/trivy) | Dependency, image, config and secret scanning | Tool candidate; select scopes carefully |
| [slsa-framework/slsa](https://github.com/slsa-framework/slsa) | Build provenance and supply-chain maturity | Deferred framework reference |
| [sigstore/cosign](https://github.com/sigstore/cosign) | Artifact signing and verification | Deferred until artifact distribution requires it |

Security work prioritizes:

1. financial correctness and tenant isolation;
2. authentication and recovery boundaries;
3. public upload/share inputs;
4. secrets and deployment configuration;
5. dependency and CI supply chain;
6. logging/privacy boundaries;
7. production verification after provider changes.

Security scanners supplement, not replace, attack-oriented reasoning and database tests.

---

# 11. Documentation, knowledge and decision records

| Repository | Use for | Boundary |
|---|---|---|
| [facebook/docusaurus](https://github.com/facebook/docusaurus) | Versioned documentation sites | Deferred while repository Markdown is sufficient. |
| [fumadocs/fumadocs](https://github.com/fuma-nama/fumadocs) | Next.js documentation experiences | Deferred unless public/internal docs require a site. |
| [squidfunk/mkdocs-material](https://github.com/squidfunk/mkdocs-material) | Structured technical documentation | Tool comparison; Python docs stack is not required. |
| [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) | Diagrams in Markdown | Strong lightweight tool reference. |
| [structurizr/dsl](https://github.com/structurizr/dsl) | Architecture models as code | Tool candidate for complex architecture views. |
| [thomvaill/log4brains](https://github.com/thomvaill/log4brains) | ADR browsing and knowledge history | Pattern reference. |
| [joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | ADR purpose and templates | Primary reference. |
| [errata-ai/vale](https://github.com/errata-ai/vale) | Prose style linting | Tool candidate only if documentation inconsistency becomes costly. |
| [lycheeverse/lychee](https://github.com/lycheeverse/lychee) | Link checking | Strong tool candidate for growing research docs. |

Documentation principles:

- Store current authority separately from historical evidence.
- Link instead of copying the same rule into many files.
- Record why a decision was made and which alternatives were rejected.
- State status, date and applicability for research.
- Do not claim production verification in a completed-looking folder when it has not occurred.
- Keep work packets useful for delivery history without turning them into active architecture law.

---

# 12. CI/CD, repository automation and developer experience

| Repository | Use for | Boundary |
|---|---|---|
| [actions/starter-workflows](https://github.com/actions/starter-workflows) | GitHub Actions baseline patterns | Primary reference. |
| [nektos/act](https://github.com/nektos/act) | Local GitHub Actions execution | Tool candidate; not every hosted behavior can be reproduced locally. |
| [changesets/changesets](https://github.com/changesets/changesets) | Versioned package release workflow | Deferred. |
| [semantic-release/semantic-release](https://github.com/semantic-release/semantic-release) | Automated release publication | Deferred. |
| [renovatebot/renovate](https://github.com/renovatebot/renovate) | Dependency update policy and grouping | Compare with Dependabot before adoption. |
| [dependabot/dependabot-core](https://github.com/dependabot/dependabot-core) | Existing dependency automation behavior | Current reference. |
| [typicode/husky](https://github.com/typicode/husky) | Git hooks | Tool candidate; hooks must not be the only enforcement. |
| [lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) | Focused pre-commit checks | Optional optimization, not a CI substitute. |
| [evilmartians/lefthook](https://github.com/evilmartians/lefthook) | Fast multi-language Git hooks | Alternative tool candidate. |
| [jdx/mise](https://github.com/jdx/mise) | Reproducible tool/runtime versions | Tool candidate if environment drift becomes costly. |
| [go-task/task](https://github.com/go-task/task) | Cross-platform task definitions | Comparison only; npm scripts and shell currently own tasks. |
| [webpro-nl/knip](https://github.com/webpro-nl/knip) | Repository dead-code/dependency hygiene | Strong tool candidate. |

MoneyFlow CI should remain layered and purposeful. Adding more jobs is not automatically better. A gate is justified when it prevents a demonstrated class of defect and has a clear remediation path.

---

# 13. Observability, performance and production learning

| Repository | Use for | Boundary |
|---|---|---|
| [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript) | Frontend/server error reporting and tracing | Tool candidate with strict financial-data scrubbing. |
| [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js) | Vendor-neutral traces and metrics concepts | Deferred until observability needs justify the complexity. |
| [Grafana/k6](https://github.com/grafana/k6) | Load, latency and reliability tests | Deferred until measured need. |
| [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | Repeatable lab performance checks | Tool candidate. |
| [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) | Core Web Vitals collection | Tool/reference candidate with privacy limits. |
| [webpack-contrib/webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) | Bundle composition analysis | Tool candidate for measured JS-size work. |
| [clinicjs/node-clinic](https://github.com/clinicjs/node-clinic) | Node.js CPU/event-loop diagnostics | Deferred; Vercel/Next runtime constraints may limit applicability. |
| [vercel/next.js](https://github.com/vercel/next.js) | Framework instrumentation and performance behavior | Primary framework reference. |

Never send transaction notes, amounts, account names, uploaded files, tokens or full email addresses to analytics/error tools by default. Observability records system behavior, not a shadow copy of the ledger.

---

# 14. Licensing and responsible open-source reuse

| Repository | Use for |
|---|---|
| [github/choosealicense.com](https://github.com/github/choosealicense.com) | Understanding common open-source license obligations |
| [licensee/licensee](https://github.com/licensee/licensee) | License detection concepts and tooling |
| [oss-review-toolkit/ort](https://github.com/oss-review-toolkit/ort) | Dependency license/compliance analysis |
| [fossology/fossology](https://github.com/fossology/fossology) | Source and license scanning at larger scale |
| [google/go-license-detector](https://github.com/google/go-license-detector) | License identification techniques |
| [spdx/license-list-XML](https://github.com/spdx/license-list-XML) | Canonical SPDX license identifiers and data |

Before copying code or assets:

- identify the exact license and copyright holder;
- distinguish studying an idea from incorporating code;
- record attribution and notice requirements;
- check copyleft obligations;
- prefer implementing the learned principle independently when compatibility is unclear;
- never assume a public GitHub repository is public-domain.

---

# 15. Learning foundations for the owner and agents

These repositories are learning resources, not automatic architecture authorities.

| Repository | Use for |
|---|---|
| [kamranahmedse/developer-roadmap](https://github.com/kamranahmedse/developer-roadmap) | Mapping web-development topics and identifying knowledge gaps |
| [ossu/computer-science](https://github.com/ossu/computer-science) | Structured computer-science foundations |
| [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books) | Broad free learning-resource index |
| [getify/You-Dont-Know-JS](https://github.com/getify/You-Dont-Know-JS) | Deep JavaScript language foundations |
| [javascript-tutorial/en.javascript.info](https://github.com/javascript-tutorial/en.javascript.info) | Practical JavaScript reference and exercises |
| [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms) | Data structures and algorithm implementations for study |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | System-design fundamentals |
| [papers-we-love/papers-we-love](https://github.com/papers-we-love/papers-we-love) | Primary technical literature and discussion practice |
| [public-apis/public-apis](https://github.com/public-apis/public-apis) | API exploration and integration-learning examples | 

Suggested learning order for working effectively on MoneyFlow:

1. JavaScript values, functions, arrays, objects and asynchronous behavior.
2. TypeScript types, narrowing, generics and compiler errors.
3. React state, rendering, forms and accessibility.
4. Next.js server/client boundaries and request lifecycle.
5. SQL, constraints, transactions and indexes.
6. Authentication, authorization and RLS.
7. Testing at unit, database and browser layers.
8. Git, pull requests and reading diffs.
9. Domain modeling and architecture tradeoffs.
10. Observability, security and production operations.

Learning should follow real project questions. Do not postpone all building until every roadmap box is complete, and do not let AI hide the concepts needed to review its work.

---

# 16. Default research bundles

Use these as starting points, then narrow further.

## AI coding workflow

- `openai/codex` or `anthropics/claude-code`;
- `Aider-AI/aider`;
- `agentsmd/agents.md`;
- `github/spec-kit`.

Question: how should context, permissions, planning, edits and evidence be structured for this repository?

## Research-heavy feature

- one official technology/domain source;
- `stanford-oval/storm` or `langchain-ai/open_deep_research` for process comparison;
- `zotero/zotero` or repository-local source tables for evidence management;
- one credible counterexample.

Question: what facts constrain the decision, and where does evidence disagree?

## Product direction

- `18F/methods`;
- `github/spec-kit`;
- one directly comparable product repo;
- MoneyFlow self-use evidence.

Question: which observed user problem is being solved, and how will success be visible?

## Refactor or clean-code task

- current MoneyFlow architecture/tests;
- `ryanmcdermott/clean-code-javascript` or `goldbergyoni/nodebestpractices`;
- `webpro-nl/knip` or relevant static-analysis source;
- recent repository history showing the actual defect/cost.

Question: which responsibility or defect changes independently, and how will behavior preservation be proved?

## Architecture decision

- `ARCHITECTURE.md` and current code;
- one ADR reference;
- `kgrzybek/modular-monolith-with-ddd` or a directly relevant pattern source;
- one simpler alternative.

Question: what proven boundary or repeated cost requires structural change?

## Security boundary

- OWASP Cheat Sheet or ASVS section;
- official platform documentation/source;
- current RLS/config implementation;
- an adversarial test source or threat model.

Question: what can an attacker control, which boundary must stop it, and how is that demonstrated?

---

# 17. Adoption checklist

Before installing a tool, framework or service:

- [ ] A current MoneyFlow problem is documented.
- [ ] The existing implementation and simpler alternatives were inspected.
- [ ] The repository is maintained and its relevant behavior was read directly.
- [ ] License and security implications are acceptable.
- [ ] Bundle, runtime, provider and operational costs are known.
- [ ] Ownership within the current architecture is explicit.
- [ ] Migration and rollback are defined.
- [ ] Tests demonstrate the intended benefit.
- [ ] The dependency does not create a second owner for an existing use case.
- [ ] The work packet records why adoption is preferable to a small local implementation.

## Removal rule

A reference should be removed or downgraded when it is archived, materially changes direction, becomes insecure/unmaintained, or no longer contributes evidence beyond better sources. A tool adopted from this map should be removable without corrupting MoneyFlow's financial source of truth.

## Final principle

The goal is not to build the most sophisticated repository. The goal is to make MoneyFlow a trustworthy daily ledger whose behavior, decisions and evidence remain understandable to its owner—even when AI performs much of the implementation work.
