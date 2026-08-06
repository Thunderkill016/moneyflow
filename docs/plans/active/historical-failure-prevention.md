# Historical failure audit and prevention

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #310 / #311
**Last updated:** 2026-08-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow converts repeated historical failure patterns into durable, evidence-backed prevention. Known contract drift should fail earlier without reducing exact-head, browser, database or security coverage.

## Repository reconnaissance

### Current behavior

- `scripts/check-project-knowledge.mjs` owns knowledge-policy verification.
- Before this branch, it mixed stable headings and budgets with volatile prose in `CURRENT_PROJECT_MEMORY.md`.
- Recent UI-system PRs required follow-up commits for exact project-memory strings, stale selectors and source-contract mismatch.
- PR #304 already contains a measured but unmerged CI audit. This packet reuses its findings and does not copy its workflow changes.
- Existing architecture, CSS, unit, database, browser, CodeQL and secret-history gates remain the verification authorities.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `scripts/check-project-knowledge.mjs` | policy entry point | retain and delegate structured checks |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | human/AI current truth | do not make prose a schema |
| `docs/research/PR_MEMORY_LOG.md` | immutable PR evidence | reuse |
| `scripts/*ci*.mjs` | gate classification and retry | reuse; do not duplicate PR #304 |
| `e2e/`, Playwright configs | later selector/state prevention | out of first slice |
| merged PR and commit history | failure evidence | record with limits |

### Existing tests and constraints

- Policy: `check:knowledge`, `test:ci-policy`, diff hygiene and per-PR memory.
- Browser/database: unchanged in the first slice; selected only by actual diff.
- No blind retries, no weaker verification and no merge/deploy without owner approval.
- Exact-head evidence outranks a locally green focused test.

### Similar implementation and recent history

- PR #205 replaced ambiguous CSP substring checks with exact token assertions.
- PR #212 established risk-proportional verification.
- PR #215 established layered project memory.
- PR #267 preserved independent retryable shards.
- PR #304 measured CI topology and rejected unsupported optimization claims.
- PR #309 exposed exact-prose marker drift and source-regex coupling.

### Open questions

- [x] Is a complete historical Actions census available? No; no exact recurrence percentage is claimed.
- [x] Should PR #304 be copied? No; it remains separate unmerged evidence.
- [ ] Can source-contract ambiguity be detected without noisy false positives?
- [ ] Which fixture should own deterministic demo-state reset?

## Research

### Research scope and source selection

- Decision question: how should repeated failures become preventive actions without hiding flakes or blaming contributors?
- Reference map: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: four official sources covering postmortems, Actions evidence and Playwright retries.

### Questions researched

1. What makes prevention more reliable than asking contributors to remember a rule?
2. What evidence supports product-versus-harness classification?
3. What does a passing retry prove and not prove?

### Sources

| Source | Authority/type | Date accessed | Establishes | Limit |
|---|---|---|---|---|
| Google SRE, Postmortem Culture | primary guidance | 2026-08-06 | blameless root-cause and prevention | not MoneyFlow acceptance authority |
| Google SRE, Postmortem Practices | primary guidance | 2026-08-06 | owned, measurable, automated actions | large-service examples require scaling down |
| GitHub Docs, workflow logs/artifacts | official docs | 2026-08-06 | failed-step and artifact evidence | connector census is incomplete |
| Playwright Docs, retries | official docs | 2026-08-06 | expected/flaky/failed outcome model | passing retry alone does not prove cause |

### Alternatives considered

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Patch every historical red run | looks exhaustive | duplicates incidents and stale code | reject |
| Add broad retries | faster apparent green | hides deterministic failures | reject |
| Register patterns and prevent high-confidence families | durable and bounded | requires evidence maintenance | select |
| Add an external reliability platform | richer dashboards | cost, privacy and duplicate ownership | reject for this slice |

### Research decision

Group failures by stable signatures and implement only detectors that observe the real boundary and have a red-proof test. Keep product, harness/provider and inconclusive classifications separate.

### Adoption review

Not applicable. No dependency, provider, service, framework or runtime architecture is added.

## Specification

### Problem

Strong final CI still catches some known contract-drift patterns late. Exact prose markers and stale assumptions create avoidable repair cycles and encourage symptom-level fixes.

### User stories

- As a contributor, I can safely improve project-memory prose without breaking a machine contract.
- As a reviewer, I can trace prevention to real incidents and see residual uncertainty.
- As owner, I can distinguish prevented, partial and intentionally unautomated failure families.

### Acceptance criteria

- [x] Failure register records evidence, root cause, detection layer and prevention status.
- [x] Stable current-memory structure and budgets have a machine-readable contract.
- [x] Superseded-claim paraphrasing remains green in focused tests.
- [x] Missing headings, hard-budget violations and malformed contracts remain red in focused tests.
- [x] New tests are included in `test:ci-policy`.
- [ ] Exact-head policy/static/unit/build/security checks pass.
- [ ] No product truth or verification scope is weakened.

### Required states

- Empty/missing contract: actionable parse/read failure.
- Valid contract: pass, with optional soft-budget warning.
- Invalid structure or budget: distinct failure messages.
- Recovery: revert helper/JSON and restore the previous marker block.
- UI, responsive and financial states: not applicable to this first slice.

### Financial and security constraints

- Financial calculations, integer VND, transfer rules, RLS and ownership are untouched.
- No provider, secret, migration, deployment or production-data write.

### Out of scope

- Merging PR #304.
- Reducing CodeQL, Gitleaks, browser, UI-audit or database coverage.
- Inventing repository-wide failure rates.
- Calling one passing retry a confirmed flake.
- Fixing all UI/product debt in PR #311.

## Implementation plan

### Architecture fit

`check-project-knowledge.mjs` remains the public policy entry point. `project-knowledge-contract.mjs` owns JSON validation and current-memory shape/budget checks. Markdown remains readable current truth; JSON contains only stable machine fields.

### Planned changes

| File | Change | Reason |
|---|---|---|
| `PROJECT_KNOWLEDGE_CONTRACT.json` | headings, references, assertions and budgets | remove prose API |
| `project-knowledge-contract.mjs` | parse and validate contract/memory | testable owner |
| focused Node test | valid and counterexample fixtures | recurrence prevention |
| `check-project-knowledge.mjs` | delegate structured checks | preserve one entry point |
| `package.json` | add test to CI policy suite | early feedback |
| failure register and packet | evidence and handoff | avoid rediscovery |

### Data and migration impact

- Schema, migration and backfill: none.
- Compatibility: existing heading/reference/budget intent remains.
- Rollback: remove helper/JSON/test and restore prior exact marker block.

### Risks and counterexamples

| Risk | Prevention |
|---|---|
| JSON duplicates a roadmap | store only stable structure, IDs and budgets |
| Contract limits contradict each other | monotonic-budget tests |
| Removing prose checks weakens trust | retain required headings/references and structured assertions |
| Conflict with Phase 8 memory edits | do not edit `CURRENT_PROJECT_MEMORY.md` |
| Green draft run is mistaken for full evidence | use `ready_for_review` exact-head run only |

### Verification plan

- Focused: `node --test scripts/project-knowledge-contract.test.mjs`.
- Policy: diff hygiene, `check:knowledge`, `test:ci-policy`.
- Static/unit/build/security: risk-selected exact-head gates.
- Database/UI audit: not required unless classifier selects them.
- Production: not applicable before an owner-authorized merge.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| HF-T1 | Create issue/branch and inspect history | #310 and branch | done |
| HF-T2 | Build failure register | ranked repository evidence | done |
| HF-T3 | Add structured contract/helper | JSON and module | done |
| HF-T4 | Add red/green tests | focused 5/5 local pass | done |
| HF-T5 | Integrate policy entry point | checker and package script | done |
| HF-T6 | Add PR memory and PR | #311 record | done |
| HF-T7 | Run exact-head checks | CI/security | evaluating |
| HF-T8 | Select later failure family | evidence/risk decision | pending |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next action |
|---|---|---|---|---|---|---|
| 2026-08-06 | owner | researcher | discovery | explicit authorization, #310 | incomplete census | inspect history |
| 2026-08-06 | researcher | planner | specified | register evidence, PR #304 audit, official sources | qualitative ranking | define first slice |
| 2026-08-06 | planner | implementer | implementing | structured contract design | integration unverified | implement/tests |
| 2026-08-06 | implementer | evaluator | evaluating | focused 5/5 pass, PR #311 | exact-head pending | repair findings and rerun |

### Current permission boundary

- Granted: branch writes on `Thunderkill016/moneyflow`.
- Forbidden: `main`, database/provider settings, production data and deployment.
- Human approval required before merge, deployment, broad workflow change or new dependency.
- Stop if prevention needs volatile prose, weak heuristics or reduced coverage.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Failure register | research artifact | pass |
| Structured contract | JSON/helper | pass |
| Paraphrase green | focused test | pass |
| Structural/budget red proof | focused tests | pass |
| Diff hygiene | first exact-head run found Markdown trailing spaces | fixed; rerun pending |
| Full exact-head | PR #311 | pending |

### Research and adoption evidence

- Sources support system-level prevention and evidence preservation.
- No complete census or unsupported flake claim is introduced.
- Adoption review remains not applicable.

### Review findings

- Correctness: helper tests pass; repository integration pending rerun.
- Security/ownership: no runtime/provider/data boundary touched.
- Maintainability: machine fields are intentionally narrow.
- Scope: PR #304 remains separate.

### Remaining limitations

- Register covers selected evidence, not every historical Actions run.
- Selector hygiene, browser-state isolation and breakpoint mapping are later slices.
- Merge and deployment remain owner decisions.

## Delivery record

- Branch: `chore/historical-failure-prevention`
- PR: #311
- Squash commit: pending
- CI: pending exact-head rerun
- Production deployment: not authorized
- Production verification: not applicable
- Packet moved to completed: no
