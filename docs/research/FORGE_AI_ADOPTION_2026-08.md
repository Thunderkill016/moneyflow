# Forge AI knowledge adoption for MoneyFlow — 2026-08

## Purpose

Record the useful AI-delivery knowledge extracted from `Thunderkill016/atoryn-forge-web` and explicitly separate:

1. what MoneyFlow already implements;
2. what is newly adopted in PR #317;
3. what is intentionally rejected or deferred because Forge solves a different product problem.

This document is a cross-project research record, not product authority. MoneyFlow's `AGENTS.md`, product principles, architecture and engineering contracts remain authoritative.

## Forge sources reviewed

- `atoryn-forge-web/AGENTS.md`
- `atoryn-forge-web/README.md`
- `atoryn-forge-web/docs/PRODUCT.md`
- `atoryn-forge-web/docs/ROADMAP.md`

External cross-checks used only for the selected traceability pattern:

- current GitHub Spec Kit documentation: structured Spec → Plan → Tasks → Implement plus `analyze` for cross-artifact gaps and `converge` for codebase-to-spec completeness;
- Microsoft requirements-traceability guidance: requirements gain delivery value when related to tests, code changes and results, including detection of requirements with no associated tests.

No Forge code is copied into MoneyFlow.

## High-value Forge AI principles

### 1. Human intent owns product direction; AI is an execution tool

Forge separates the user, their AI and the harness around the AI. The user supplies intent and decisions; AI generates content/code; Forge keeps state and gates.

**MoneyFlow status:** already adopted.

MoneyFlow's human owner defines/approves the problem, resolves risky product decisions, owns merge/acceptance, and reviews evidence rather than model confidence. The implementing/evaluating agent roles already prevent an AI from redefining requirements or declaring itself complete.

**Action:** no new runtime or framework.

### 2. AI generates content; deterministic code owns schema and gates

Forge repeatedly states the boundary:

- AI generates spec, plan, tasks and code;
- deterministic code validates schema and blocks phase transitions.

**MoneyFlow status:** already adopted and strengthened by PR #315.

Existing examples:

- CI change classification is code-owned;
- exact-head checks are provider/system evidence;
- project-memory and work-packet contracts are scripts, not model judgments;
- branch, packet, path and permission boundaries are explicit.

**Action:** PR #317 extends this same owner instead of adding another AI reviewer.

### 3. `requirement → task → evidence` prevents spec drift

Forge's strongest missing idea for MoneyFlow is that specification is not useful if it stops being connected to implementation and evidence.

Forge's model:

```text
requirement → task → evidence → real state
```

The important properties are structural:

- every requirement has implementation work;
- work not serving a requirement explains why it exists;
- evidence is attached to the work/requirement rather than supplied as a generic green claim;
- a later verification step can detect drift.

**MoneyFlow status before PR #317:** partial.

The canonical packet already had:

- acceptance criteria;
- Tasks with an Evidence column;
- Evaluation with acceptance evidence.

But there was no deterministic link among the three. An agent could leave `AC2` unimplemented while all sections still looked plausible.

**Action in PR #317:** newly adopted.

- stable `AC#` identifiers from `planned` onward;
- Tasks gain `Covers`;
- `Covers` lists known AC IDs or `internal: <reason>`;
- every AC must be covered by at least one task;
- every task must name a proof target;
- `ready_for_review` and later require a resolved evidence row for every AC;
- discovery/specification remain lightweight while requirements are still changing.

This is deterministic structural traceability, not AI semantic grading.

### 4. Process cost should scale with consequence

Forge rejects full spec ceremony for every cosmetic change and uses stronger gates for auth, data, security and destructive work.

**MoneyFlow status:** already adopted more concretely through `RISK_PROPORTIONAL_DELIVERY.md` and CI classification.

MoneyFlow already distinguishes Class 0–3 and selects database/browser/UI/security gates from the actual changed boundary.

**Action:** no new Forge classifier or framework.

### 5. Observable evidence beats claims and scanner presence

Forge's security wedge is based on testing whether a control actually blocks access, not merely whether a policy exists. The broader principle is: do not trust declarations when the real path can be exercised.

**MoneyFlow status:** already adopted.

Examples include pgTAP/RLS contracts, browser smoke, responsive audit, exact-head CodeQL analysis, secret-history scanning, production smoke requirements, and PR #315's separation between deterministic mechanism success and semantic evidence.

**Action:** keep using real-path evidence; no additional generic scanner is added by this research.

### 6. Durable project state must live outside chat/model context

Forge keeps spec, plan, tasks, evidence and activity state in durable artifacts rather than hidden model memory.

**MoneyFlow status:** already adopted.

`AGENTS.md`, current project memory, active packets, branches/PRs, CI artifacts, completed packets and source-of-truth updates are the durable memory. `AGENT_OPERATING_MODEL.md` explicitly rejects hidden vector memory and private conversation dumps.

**Action:** no new memory database.

### 7. Security credentials must not enter model prompts or evidence

Forge states that keys/tokens must not enter code, git, model prompts, logs or evidence. Its Runner architecture goes further because Forge is itself an AI-development platform.

**MoneyFlow status:** principle applies; Runner architecture does not.

MoneyFlow agents must continue to treat provider secrets, Supabase tokens and financial user content as excluded from agent memory/evidence artifacts.

**Action:** retain current secrets/privacy boundaries. Do not build Forge Runner for MoneyFlow.

### 8. Degrade visibly instead of failing silently

Forge makes provider capability loss explicit when a selected git/deploy environment cannot support PRs, hosted CI or other features.

**MoneyFlow status:** concept already appears in fail-closed task/base/provider handling, but MoneyFlow is not a provider-neutral developer platform.

**Action:** use the principle only when a MoneyFlow engineering tool cannot prove a check or provider state. Do not build a generic capability matrix.

### 9. Build only differentiating infrastructure; integrate mature tools elsewhere

Forge's product rule is to build its differentiating gates/workflow and use mature external tools for the rest.

**MoneyFlow status:** already encoded in the tool/dependency adoption gate.

MoneyFlow explicitly defers Sentry, Trigger.dev and agent frameworks until a measured trigger exists.

**Action:** no new dependency from this study.

## Intentionally not adopted

### Forge Runner / local AI credential relay

Forge Runner solves a Forge-specific product constraint: letting a developer use their existing Claude/ChatGPT subscription while Forge orchestrates work from web/mobile without receiving subscription credentials.

MoneyFlow is a personal-finance application, not an AI coding platform. Its end users do not need a local coding-agent daemon.

**Decision:** reject for MoneyFlow runtime.

### Runtime agent orchestration, swarms or autonomous crews

Forge coordinates external coding agents as its product. MoneyFlow uses AI only in the engineering process.

**Decision:** reject runtime adoption; continue the current controlled delivery workflow.

### Provider capability architecture and MCP marketplace

Forge must remain neutral across git/deploy/database/model providers. MoneyFlow currently owns a concrete Next.js/Supabase/Vercel product architecture and should not add provider abstraction without a second real implementation need.

**Decision:** reject speculative abstraction.

### Node canvas, Kanban and activity-feed product surfaces

Those are Forge product UX views over its development state machine. MoneyFlow does not need a software-project-management UI.

**Decision:** reject for product runtime.

### Spec Kit dependency

The useful idea is cross-artifact consistency, not the CLI/framework itself. MoneyFlow already has its own packet lifecycle, context router, tests and CI policy.

**Decision:** reimplement the narrow deterministic invariant in the existing checker; no dependency.

### AI-as-judge acceptance

Neither Forge nor MoneyFlow should trust the same model that implemented a change to decide whether it is correct.

**Decision:** explicitly reject. Structural checks are deterministic; semantic review remains evaluator/human plus real-path evidence.

### Forge override model

Forge allows users to override many product gates because the user is the author of the software Forge helps build, except risks imposed on third parties.

MoneyFlow engineering policy has different ownership and regulated/high-consequence boundaries. Merge, provider writes, production data operations and financial/security invariants remain governed by MoneyFlow's explicit permission model.

**Decision:** do not copy Forge's override UX/policy wholesale.

## Selected adoption: why traceability is the right next step

MoneyFlow's AI workflow is already sophisticated. More agents, more memory, more prompts or another orchestration framework would increase complexity without closing a demonstrated gap.

The demonstrated gap is simpler:

```text
Acceptance criteria     Tasks                     Evaluation
AC1                     T1                        generic green evidence
AC2                     T2
AC3                     -- silently uncovered --
```

All three sections can exist while the packet is incomplete.

PR #317 turns that gap into a repository failure:

```text
AC1 ──► T1 ──► evidence target ──► AC1 review evidence
AC2 ──► T2 ──► evidence target ──► AC2 review evidence
AC3 ──► no task  => FAIL
```

Internal delivery work remains legal:

```text
T3 Covers: internal: research provenance
```

This avoids fake requirement mappings while preserving an audit trail for why the task exists.

## External cross-check

GitHub Spec Kit's current flow separately checks cross-artifact consistency (`analyze`) and later checks the implemented codebase against the spec (`converge`). That supports the general direction: generated artifacts should not merely exist; gaps between them must be detected before completion.

Microsoft's current requirements-traceability guidance describes traceability as relating development phases and specifically associating requirements with tests, bugs and code changes. It also surfaces requirements with no associated tests as a quality/readiness gap.

MoneyFlow adopts the underlying engineering property, not either platform's storage model or tooling.

## Success measure

This adoption is useful only if it catches real gaps with low authoring overhead.

Track qualitatively during upcoming packets:

- uncovered ACs caught before review;
- tasks whose purpose becomes clearer because `Covers` forces a relationship or an internal reason;
- review evidence that can be inspected per criterion instead of inferred from a generic CI statement;
- friction added during early discovery (should remain near zero because enforcement starts at `planned`).

Remove or simplify the mapping if it becomes ceremonial and stops finding useful gaps.

## Current implementation boundary

- Branch: `agent/forge-ai-traceability`
- PR: #317, stacked on PR #315
- Runtime/product behavior: unchanged
- Dependencies/services/providers: none added
- Database/production: untouched
- Merge/deploy: owner decision only
