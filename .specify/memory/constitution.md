# MoneyFlow Constitution

<!--
Sync impact report
- Version: 1.0.0
- Status: proposed; effective only after the adopting PR merges
- Proposed: 2026-08-03
- Upstream pattern: github/spec-kit v0.14.2
- Authoritative sources remain AGENTS.md, current code/tests, current project memory, ARCHITECTURE.md, product principles, MVP definition and risk-proportional delivery policy.
-->

This constitution is the compact governance input consumed by Spec Kit. It summarizes load-bearing MoneyFlow rules; it does not replace their authoritative source documents.

## Core Principles

### I. Trustworthy ledger semantics

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger. VND MUST be stored and calculated as integer đồng. Internal transfers MUST remain balanced movements and MUST NOT count as income or expense. Financial calculations MUST live in testable domain modules. Missing balances, dates, commitments, income or planning assumptions MUST NOT be invented.

**Rationale:** A polished feature that changes ledger meaning or fabricates financial context is a product failure.

### II. User ownership, isolation and recovery

Authenticated user-owned data MUST be protected by RLS and tenant-isolation evidence. Destructive ledger actions MUST use soft deletion and a recoverable path. Authentication, authorization, migrations, policies, provider configuration and production-data writes MUST be treated as high-risk boundaries with explicit permission and rollback.

**Rationale:** Correct calculations are insufficient when one user can access another user's data or when mistakes cannot be recovered.

### III. Product scope before feature ambition

Every specification MUST preserve MoneyFlow's current product identity and core jobs: record quickly, know balances, understand income/expense and where money went, then correct and export trustworthy data. Bank sync, AI financial advice, OCR product identity, family finance, business accounting and full envelope budgeting MUST NOT be introduced without an explicit owner decision and a new accepted specification.

**Rationale:** Spec-driven delivery should reduce ambiguity, not legitimize scope expansion.

### IV. Current evidence outranks generated prose

Current code, migrations and tests outrank prose. Current project memory and accepted owner decisions outrank old issues, historical research and unmerged artifacts. Specifications and plans MUST cite the affected repository boundaries and existing tests. Unknowns MUST remain explicit until clarified. Requirements MUST be changed in the specification before implementation scope changes.

**Rationale:** Generated artifacts are useful only when they stay anchored to the repository's present truth.

### V. Small coherent slices with explicit permissions

Work MUST be divided into the smallest coherent vertical slice that produces independently reviewable evidence. Tasks MUST state affected paths, dependencies, expected evidence and permission scope. Parallel tasks MUST NOT modify overlapping ownership areas. Agents MUST work on a focused branch and PR, MUST NOT push directly to `main`, and MUST NOT perform provider or production writes without explicit approval.

**Rationale:** Clear task boundaries reduce scope drift, conflicting edits and unsafe autonomous action.

### VI. Risk-proportional verification

The change class and affected boundary MUST select application, database and browser verification. Documentation uses knowledge/CI-policy/diff checks; executable changes use applicable static, domain and build checks; database/RLS changes use database evidence; runtime flows use browser evidence; visual changes use responsive/accessibility review. A build MUST NOT be presented as proof of RLS, browser behavior, provider state or production behavior. Completion claims MUST be exact-head and evidence-backed.

The protected CodeQL workflow is a provider-required exception: every pull request MUST initialize, run and upload a real JavaScript/TypeScript analysis, even when product-layer gates are not applicable.

**Rationale:** Heavy universal product gates slow low-risk work, while a false-green security job without uploaded analysis does not satisfy repository protection.

## Spec Kit Operating Constraints

1. Spec Kit is a feature-artifact interface, not a replacement for MoneyFlow governance.
2. `.specify/memory/constitution.md` MUST stay compact and link to authority instead of copying the project encyclopedia.
3. Feature artifacts live under `specs/<feature>/` and contain feature-specific requirements, plans, tasks and evidence.
4. A full MoneyFlow work packet remains mandatory when `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` or `AGENTS.md` requires one.
5. When both a work packet and Spec Kit artifacts exist, the packet owns execution state, active role, permission boundary, handoffs and delivery record; Spec Kit artifacts own feature requirements, technical plan and task decomposition.
6. Generated artifacts MUST NOT weaken financial invariants, permission boundaries, required checks or owner review.
7. New dependencies, providers, services, frameworks, extensions or presets require the MoneyFlow adoption review, including license, security, privacy, maintenance, rollback and removal conditions.
8. An unmerged feature specification is candidate evidence, not current product truth.

## Required Feature Quality

Every feature specification MUST define:

- the affected user and observed problem;
- independently testable user stories or scenarios;
- observable acceptance criteria and measurable success criteria;
- required loading, empty, populated, validation/error and recovery states when applicable;
- mobile/tablet/desktop and accessibility behavior for UI work;
- financial, ownership, RLS, authentication and data implications;
- explicit out-of-scope behavior;
- unresolved questions that block planning.

Every implementation plan MUST define:

- the existing architecture boundary that owns the behavior;
- current files, tests and patterns to reuse, change or avoid;
- data, migration, compatibility and rollback impact;
- risk class and required verification;
- concrete file/area changes without speculative abstraction.

Every task list MUST produce reviewable results and MUST include paths, dependencies, evidence and status. Task completion does not equal feature acceptance.

## Governance

Conflicts are resolved in this order:

1. explicit owner decision and applicable legal/security requirement;
2. `AGENTS.md` permission and delivery rules;
3. accepted active specification/acceptance criteria;
4. current code, migrations and tests;
5. current project memory, architecture, product principles, MVP definition and risk policy;
6. this constitution;
7. feature plan and tasks;
8. historical or unmerged material.

Amendments require a dedicated diff that states the reason, affected templates and compatibility impact. A constitutional amendment MUST propagate to `.specify/templates/`, `.specify/README.md` and relevant MoneyFlow policy references. Versioning follows semantic versioning: MAJOR for incompatible governance changes, MINOR for new principles or materially expanded obligations, PATCH for clarifications that do not change required behavior.

**Version**: 1.0.0 | **Proposed**: 2026-08-03 | **Effective**: upon adopting PR merge
