# Risk-proportional delivery

**Status:** active engineering policy
**Owner:** `docs/engineering/AI_DELIVERY_WORKFLOW.md`
**Last reviewed:** 2026-08-02

MoneyFlow protects financial correctness, tenant ownership and production data without applying every expensive application gate to every change. Each diff receives the smallest useful verification set, except where a provider-side repository rule requires a real analysis for every pull request.

## Principles

1. **Risk selects application gates.** File count does not determine risk.
2. **Required check identities stay stable.** Workflows start and finish even when their application/database/browser work is not applicable.
3. **Provider rules are real constraints.** A green workflow shell is insufficient when GitHub requires an uploaded code-scanning analysis.
4. **Main and manual runs fail safe.** They run the complete regression suite.
5. **High-risk boundaries remain strict.** Financial semantics, RLS, auth, destructive paths, secrets, deployment and CI/security policy receive deep checks and owner review.
6. **Evidence matches the layer.** Build does not prove RLS; database tests do not prove responsive UI.
7. **Small changes stay small.** Do not add unrelated runtime work merely to satisfy process.

## Change classes

### Class 0 — documentation and mechanical repository changes

Examples:

- Markdown, research, decisions and work packets;
- wording or links that do not ship in the application;
- issue and pull-request templates.

Required application gates:

- diff hygiene;
- project-knowledge contract;
- CI classification contract.

Not required by application risk:

- dependency installation;
- lint, typecheck, unit tests or production build;
- Supabase reset and pgTAP;
- browser smoke or responsive audit.

Repository-rule exception:

- the CodeQL workflow still performs and uploads a real JavaScript/TypeScript analysis for every pull request because the repository code-scanning rule requires analysis results for the exact head or merge candidate;
- this exception does not make unrelated application, database or browser gates applicable.

Planning artifact: inline plan or clear PR description unless the documentation changes architecture, product scope or high-risk operating policy.

### Class 1 — bounded code change

Examples:

- localized domain or component behavior;
- isolated refactor with straightforward rollback;
- test-only executable changes.

Required:

- applicable project/deployment/architecture contracts;
- lint and typecheck;
- affected unit tests;
- production build;
- browser smoke when runtime application code changes;
- real CodeQL analysis through the protected workflow.

Not required by default:

- database reset without a database-contract change;
- responsive audit without a visual/layout change;
- production verification when production behavior is unchanged.

Planning artifact: concise PR plan when one subsystem changes and rollback is straightforward.

### Class 2 — user-interface or user-flow change

Examples:

- route, component, layout or stylesheet changes;
- forms and navigation;
- responsive, accessibility or visual-system changes.

Required:

- applicable Class 1 checks;
- browser smoke for affected flows;
- responsive/cross-browser audit for layout, styling, shared components or audit-contract changes;
- human review of relevant browser evidence.

Planning artifact: concise plan for a bounded screen; full packet for multi-flow redesign or unresolved product research.

### Class 3 — financial, data, security or operational boundary

Examples:

- migrations, constraints, indexes, RLS, grants and RPCs;
- authentication, authorization and recovery;
- financial semantics, transfers, balances and import/export integrity;
- destructive data paths, provider writes and deployment configuration;
- CI policy, required-check behavior or security-scanning configuration.

Required:

- project-knowledge and CI-classification contracts;
- static/domain/build verification when application or shared executable code changes;
- Supabase reset and pgTAP when database truth changes;
- browser smoke when an application flow changes;
- responsive audit only when a visual surface changes;
- real CodeQL analysis and secret controls;
- rollback plan and owner review;
- exact affected production verification after merge when production behavior changes.

A pure migration/index/pgTAP change may omit unrelated application installation and build work when no application contract changes.

Planning artifact: full work packet with state, permissions, risks, verification and rollback.

## CI selection contract

`scripts/classify-ci-changes.mjs` selects application gates:

- `full_verify` — dependencies, contracts, lint, typecheck, tests and build;
- `database` — Supabase reset and pgTAP;
- `browser_smoke` — baseline Playwright flows;
- `ui_audit` — cross-device/cross-browser audit;
- `codeql` — advisory classification for executable or CI-security surface changes.

The `codeql` classifier output no longer suppresses the protected CodeQL analysis. GitHub's repository rule requires an uploaded analysis even for a documentation-only PR. Keeping the output is useful for policy tests, diagnostics and any future intentional repository-rule change.

Classifier safety rules:

- CI classifier or workflow changes exercise every applicable gate;
- empty or unavailable diffs fail safe;
- pushes to `main`, scheduled scans and manual runs force full application verification;
- unknown executable changes receive full static verification.

Classifier behavior is tested in `scripts/classify-ci-changes.test.mjs`. Path rules and tests change together.

## Stable required checks

MoneyFlow keeps these stable check identities:

- `verify`;
- `database`;
- `e2e`;
- `Analyze JavaScript and TypeScript`.

For `verify`, `database` and `e2e`, irrelevant heavy work may finish with an explicit not-applicable result while the job succeeds.

`Analyze JavaScript and TypeScript` is different: the repository code-scanning rule requires actual analysis data, not merely a successful job name. Therefore `.github/workflows/codeql.yml` always initializes and analyzes on pull requests. A no-op “CodeQL not required” step creates a false-green check and leaves the pull request permanently unmergeable.

Changing provider-side branch protection, rulesets, workflow permissions or `CODEOWNERS` remains an explicit owner operation. If the owner later removes the provider code-scanning requirement after reviewing equivalent protections, risk-proportional CodeQL skipping may be reconsidered in a dedicated governance PR.

## Work-packet decision test

Create a full work packet when any answer is yes:

- Does the change alter financial meaning, ownership, RLS, auth, schema or production data?
- Does it alter CI policy, required-check behavior or security scanning?
- Does it require provider or production write permission?
- Does it cross multiple architectural ownership areas?
- Does it depend on unresolved research?
- Is rollback non-obvious or compatibility staged?
- Will work span multiple agents, days or handoffs?

Otherwise use an inline/PR plan with scope, affected files, verification and rollback.

## Review and merge policy

- Keep branches focused and short-lived.
- Review actual failure modes and the actual diff.
- Do not block on unrelated perfection.
- Owner review is mandatory for Class 3 and product-direction changes.
- Never treat a skipped heavy step as if it ran.

## Measurement and rollback

Track:

- median time from push to mergeable CI;
- reruns caused by unrelated or flaky gates;
- escaped defects by class;
- time spent repairing CI rather than product behavior.

Rollback for this CodeQL alignment is one focused commit restoring conditional analysis, but only after the provider code-scanning rule is intentionally changed. Restoring conditional analysis while the rule remains active recreates the merge deadlock.
