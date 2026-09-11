# MoneyFlow Constitution

<!--
Sync impact report
- Version: 1.1.0
- Status: proposed; effective only after the adopting PR merges
- Amended: 2026-09-11
- Upstream pattern: github/spec-kit v0.14.2
- Authoritative sources remain AGENTS.md, current code/tests, ARCHITECTURE.md, product principles, MVP definition, explicit owner decisions and risk-proportional delivery policy.
-->

This constitution is the compact governance input consumed by Spec Kit. It summarizes load-bearing MoneyFlow rules; it does not replace their authoritative source documents.

## Core Principles

### I. Trustworthy ledger semantics

MoneyFlow is a Vietnamese personal income-and-expense ledger. VND MUST be stored and calculated as integer đồng. Internal transfers MUST remain balanced movements and MUST NOT count as income or expense. Financial calculations MUST live in testable domain modules. Missing balances, dates, commitments, income or planning assumptions MUST NOT be invented.

### II. User ownership, isolation and recovery

Authenticated user-owned data MUST be protected by RLS and tenant-isolation evidence. Destructive ledger actions MUST use the required recoverable path. Authentication, authorization, migrations, policies, provider configuration and production-data writes MUST be treated as high-risk boundaries with explicit permission and rollback.

### III. Product scope before feature ambition

Specifications MUST preserve MoneyFlow's current product identity and core jobs. Bank sync, AI financial advice, native acquisition, household finance, wealth and full multi-currency accounting MUST NOT be introduced without an explicit owner decision and an accepted specification.

### IV. Current evidence outranks generated prose

Current code, migrations and tests outrank prose. Explicit owner decisions for the current task and merged repository evidence outrank old issues, historical research and unmerged artifacts. Specifications and plans MUST cite affected repository boundaries and existing tests. Unknowns MUST remain explicit until clarified. Requirements MUST change in the specification before implementation scope changes.

### V. Small coherent slices with explicit permissions

Work MUST be divided into the smallest coherent vertical slice that produces independently reviewable evidence. Tasks MUST state affected paths, dependencies, expected evidence and permission scope. Agents MUST work on a focused branch and PR, MUST NOT push directly to `main`, and MUST NOT perform provider or production writes without explicit approval. A plan/work-packet file does not itself grant permission.

### VI. Risk-proportional verification

The change class and affected boundary MUST select application, database and browser verification. A build MUST NOT be presented as proof of RLS, browser behavior, provider state or production behavior. Completion claims MUST be exact-head and evidence-backed. The protected CodeQL workflow MUST upload real analysis when repository protection requires it.

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

Every feature specification MUST define the affected user/problem, independently testable scenarios, observable acceptance criteria, applicable states, financial/security implications, out-of-scope behavior and blocking unknowns.

Every implementation plan MUST define the owning architecture boundary, current files/tests to reuse, migration/compatibility/rollback impact, risk class, verification and concrete file/area changes without speculative abstraction.

Every task list MUST produce reviewable results and MUST include paths, dependencies, evidence and status. Task completion does not equal feature acceptance.

## Governance

Conflicts are resolved in this order:

1. explicit owner decision and applicable legal/security requirement;
2. `AGENTS.md` permission and delivery rules;
3. current code, migrations and tests;
4. accepted task specification/work packet and current GitHub issue/PR evidence;
5. architecture, product principles, MVP definition and risk policy;
6. this constitution;
7. feature plan and tasks;
8. historical or unmerged material.

Amendments require a dedicated diff that states the reason, affected templates and compatibility impact. A constitutional amendment MUST propagate to `.specify/README.md` and relevant MoneyFlow policy references. Versioning follows semantic versioning: MAJOR for incompatible governance changes, MINOR for new principles or materially expanded obligations, PATCH for clarifications that do not change required behavior.

**Version**: 1.1.0 | **Amended**: 2026-09-11 | **Effective**: upon adopting PR merge
