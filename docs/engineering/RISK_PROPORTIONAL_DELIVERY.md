# Risk-proportional delivery

**Status:** active engineering policy
**Owner:** `docs/engineering/AI_DELIVERY_WORKFLOW.md`
**Last reviewed:** 2026-08-02

MoneyFlow protects money correctness, tenant ownership and production data without applying the most expensive verification path to every change. The goal is fast, trustworthy feedback: each change receives the smallest set of controls that can detect its realistic failure modes.

This policy narrows the task-classification and verification requirements in `AGENTS.md`, `README.md`, `docs/engineering/AI_DELIVERY_WORKFLOW.md` and `docs/engineering/AGENT_OPERATING_MODEL.md`. When older wording appears to require every gate or a full work packet for all non-trivial work, use this risk classification.

## Principles

1. **Risk, not file count, selects controls.** A one-line RLS change can be high risk; a large research document can be low runtime risk.
2. **Required check identities stay stable.** Required GitHub checks must start and finish even when their heavy work is not applicable. Do not skip the entire workflow with top-level path filters.
3. **Main and manual runs fail safe.** Pushes to `main` and manually dispatched verification run the complete regression suite.
4. **High-risk boundaries remain strict.** Database migrations, RLS, authentication, financial semantics, destructive data paths, secrets and deployment configuration receive the relevant deep gates and human review.
5. **Evidence must match the affected layer.** A build cannot prove RLS; a database reset cannot prove responsive UI; a visual audit adds no evidence to a documentation-only PR.
6. **Small changes should remain small.** Do not expand a bounded change merely to satisfy a process artifact.

## Change classes

### Class 0 — documentation and mechanical repository changes

Examples:

- Markdown, research, decisions and work packets;
- wording or links that do not ship in the application;
- issue and pull-request templates.

Required:

- diff hygiene;
- project-knowledge contract;
- CI classification contract.

Not required by default:

- dependency installation;
- lint, typecheck, unit tests or production build;
- Supabase reset and pgTAP;
- browser smoke or responsive audit;
- CodeQL when no executable or dependency surface changed.

Planning artifact: an inline plan or clear PR description. A full work packet is optional unless the documentation changes product scope, architecture or a high-risk operating policy.

### Class 1 — bounded code change

Examples:

- pure domain helper implementation that does not change financial meaning;
- localized component behavior;
- isolated refactor with no schema, auth, provider or deployment impact;
- test-only executable changes.

Required:

- project/deployment/architecture contracts as applicable;
- lint and typecheck;
- affected unit tests;
- production build;
- browser smoke when runtime application code changes;
- CodeQL when JavaScript, TypeScript, dependencies or CI security surfaces change.

Not required by default:

- database reset when no database contract changed;
- full responsive audit when no visual/layout surface changed;
- production verification for changes that do not alter production behavior.

Planning artifact: a concise PR plan is sufficient when the scope is one subsystem, rollback is straightforward and no high-risk boundary is crossed.

### Class 2 — user-interface or user-flow change

Examples:

- route, component, layout or stylesheet changes;
- form behavior and navigation;
- responsive, accessibility or visual-system changes.

Required:

- all applicable Class 1 checks;
- browser smoke for affected flows;
- responsive/cross-browser audit when layout, styling, shared components or audit contracts change;
- human review of relevant browser evidence.

A visual audit is not required for a server-only or domain-only change merely because the product has a UI.

Planning artifact: concise PR plan for a bounded screen-level change; full work packet for multi-flow redesigns, product-direction decisions or changes with unresolved research.

### Class 3 — financial, data, security or operational boundary

Examples:

- migrations, constraints, indexes, RLS, grants and RPCs;
- authentication, authorization and account recovery;
- financial calculation semantics, transfers, balances, import/export integrity;
- destructive data paths, provider writes and deployment configuration;
- CI policy, required-check behavior or security scanning configuration.

Required:

- project-knowledge and CI-classification contracts;
- static, domain and build verification when application or shared executable code changes;
- Supabase reset and pgTAP when database truth changes;
- a pure migration/index/pgTAP change may omit application install, lint, unit and build work when no application contract changed;
- browser smoke when an application flow changes;
- responsive audit only when a visual surface also changes;
- CodeQL and secret controls for relevant executable/security surfaces;
- rollback plan and human owner review;
- exact production verification only for the affected production behavior after merge.

Planning artifact: full work packet with state, permissions, risks, verification and rollback.

## CI selection contract

`scripts/classify-ci-changes.mjs` is the repository-owned classifier. It emits:

- `full_verify` — install dependencies, run application contracts, lint, typecheck, unit tests and build;
- `database` — start/reset Supabase and run pgTAP;
- `browser_smoke` — install Chromium and run the baseline Playwright suite;
- `ui_audit` — install Chromium/WebKit and run the cross-device audit;
- `codeql` — run JavaScript/TypeScript CodeQL analysis.

The classifier is deliberately conservative:

- changes to the CI classifier or CI workflow exercise every gate;
- an empty or unavailable diff becomes a full run;
- pushes to `main`, scheduled scans and manual runs force full verification;
- unknown executable changes receive full static verification rather than being treated as documentation.

The classifier has repository tests in `scripts/classify-ci-changes.test.mjs`. Path rules must be updated together with their tests.

## Stable required checks

GitHub documents that a workflow skipped by path filtering can leave a required check pending and block merge. MoneyFlow therefore keeps `verify`, `database`, `e2e` and `Analyze JavaScript and TypeScript` present. A check with no relevant heavy work completes successfully with an explicit “not required” explanation.

This PR does not change branch protection, required-check settings, workflow permissions or `CODEOWNERS`. Those remain human-owner repository settings.

## Work-packet decision test

Create a full work packet when any answer is yes:

- Does the change alter financial meaning, ownership, RLS, auth, schema or production data?
- Does it require provider or production write permission?
- Does it cross multiple architectural ownership areas?
- Does it depend on unresolved external/product research?
- Is rollback non-obvious or compatibility staged?
- Will implementation/evaluation span multiple agents, days or handoffs?

Otherwise use an inline or PR-level plan containing scope, affected files, tests and rollback.

## Review and merge policy

- Keep branches focused and short-lived.
- Review against realistic failure modes and the actual diff, not a universal checklist.
- Approve an improvement when it is safe and clearly better; do not block on unrelated perfection.
- Owner review remains mandatory for Class 3 and product-direction changes.
- Auto-merge may be enabled later for Class 0/1 only after branch-protection rules are intentionally reviewed by the owner; this policy does not enable it.

## Measurement and rollback

Review this policy after enough PRs exist to compare:

- median time from push to mergeable CI;
- number of CI reruns caused by unrelated/flaky gates;
- escaped defects by class;
- time spent repairing CI rather than product behavior.

Rollback is one commit: restore unconditional steps in `.github/workflows/ci.yml` and `.github/workflows/codeql.yml`. Keep the classifier tests even after rollback until the failure mode is understood.
