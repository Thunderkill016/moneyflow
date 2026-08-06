# Historical failure audit and prevention

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** #310 / pending  
**Last updated:** 2026-08-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow converts repeated historical failure patterns into durable, evidence-backed prevention. Contributors and agents receive earlier feedback for known contract drift without reducing exact-head, browser, database or security coverage.

## Repository reconnaissance

### Current behavior

- `scripts/check-project-knowledge.mjs` checks required documents, per-PR memory, current-memory budgets and many exact string markers.
- The checker currently mixes stable structure with volatile prose in `CURRENT_PROJECT_MEMORY.md`; semantically correct edits can therefore fail CI when wording changes.
- Recent Phase 5–8 PRs required many follow-up commits to retarget selectors, preserve marker strings and repair source contracts after implementation.
- PR #304 already audits CI topology, runtime and critical-path cost. It is verified but unmerged and remains reference evidence rather than current-main behavior.
- The repository already has strong architecture, CSS, database, browser, CodeQL, secret-history and exact-head gates. This work must improve signal, not add a parallel management framework.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/check-project-knowledge.mjs` | current knowledge-policy owner | change bounded prose-dependent logic |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | human/AI current truth | avoid making prose a schema |
| `docs/research/PR_MEMORY_LOG.md` | immutable per-PR evidence model | reuse |
| `scripts/*ci*.mjs` | CI selection/retry contracts | reuse; avoid duplicating PR #304 |
| `e2e/`, `playwright*.config.ts` | browser/state and responsive evidence | later focused slices only |
| `docs/research/CI_SYSTEM_AUDIT_2026-08-06.md` on PR #304 | measured CI/topology evidence | reference, do not silently port |
| merged PR/commit history | root-cause and false-green evidence | source of failure register |

### Existing tests and constraints

- Related tests: CI policy tests, project knowledge checker in protected policy job, source-contract tests under `src/lib`, Playwright smoke and cross-device audits.
- Database/RLS tests: unaffected by the first structured-knowledge slice.
- Browser tests: unaffected by the first slice; later state/selector work requires selected browser evidence.
- Product/architecture rules: no hidden chat memory, no blind retries, exact-head evidence only, no reduced financial/security coverage, no merge without owner decision.

### Similar implementation and recent history

- PR #205 replaced ambiguous CSP substring checks with exact token-list assertions.
- PR #212 established risk-proportional gates with stable protected summaries.
- PR #215 layered project memory and per-PR evidence.
- PR #267 separated retryable shards without weakening stable checks.
- PR #304 measured the CI system and rejected unsupported optimization claims.
- PR #309 exposed exact-prose marker drift, multiline JSX regex coupling and component contract drift in one run.

### Open questions

- [x] Is a complete historical workflow census available? No; connector coverage is incomplete, so no fabricated recurrence percentage will be claimed.
- [x] Should PR #304 changes be copied? No; reuse its findings, leave its unmerged implementation isolated.
- [ ] Can source-contract ambiguity be detected with low enough false-positive risk to become a gate?
- [ ] Which Playwright fixture should own deterministic demo-state reset?

## Research

### Research scope and source selection

- Decision question: How should repeated failures be recorded and converted into preventive action without blaming contributors or hiding flakes?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`
- Source budget: four focused official sources covering postmortems, workflow logs/artifacts and browser retries.
- Expected decision or uncertainty to resolve: choose a bounded register/action model and preserve evidence needed to distinguish product regressions from harness or provider failures.

### Questions researched

1. What makes a post-incident action durable rather than a reminder to be more careful?
2. Which GitHub evidence can support exact failure classification?
3. How should retries be interpreted without hiding real failures?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Google SRE, Postmortem Culture | primary operational guidance | 2026-08-06 | blameless root-cause analysis and preventive action | not a MoneyFlow acceptance authority |
| Google SRE, Postmortem Practices | primary operational guidance | 2026-08-06 | tracked, owned, measurable action items; automation over human vigilance | large-service examples require scaling down |
| GitHub Docs, workflow logs and artifacts | official platform documentation | 2026-08-06 | failed-step logs and persisted artifacts support diagnosis | connector does not expose a complete census |
| Playwright Docs, test retries | official test framework documentation | 2026-08-06 | retries distinguish expected, flaky and failed outcomes | a passing retry alone does not establish root cause |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Read every red run and patch each message | appears exhaustive | duplicates incidents, overfits stale code, high noise | rejected |
| Add broad retries | faster green result | hides deterministic failures and wastes runtime | rejected |
| Failure register plus prioritized prevention | preserves evidence and targets recurrence | requires judgment and maintenance | selected |
| Add another external reliability platform | dashboards and automation | new cost, privacy/ownership and duplicate CI concerns | rejected for this slice |

### Research decision

Use repository evidence to group failure families. Implement only prevention whose detector observes the real failure boundary and can be regression-proven. Keep product, harness, provider and inconclusive statuses separate. Do not use competitor or generic SRE practice as proof that a MoneyFlow test is correct.

### Adoption review

Not applicable. No dependency, provider, service, framework or runtime architecture is added.

## Specification

### Problem

MoneyFlow has strong final verification but contributors still spend repeated CI cycles on known contract-drift patterns. Exact prose markers, stale selectors and false-green audit assumptions move detection later than necessary. This increases turnaround time and risks normalizing blind fixes.

### User stories

- As a contributor or agent, I receive a local/policy failure for a stable structural violation without being blocked by harmless prose edits.
- As a reviewer, I can trace each preventive rule to a real incident and understand what remains unverified.
- As the owner, I can see which repeated failures are prevented, partial or intentionally not automated.

### Acceptance criteria

- [x] A durable failure register records evidence, root cause, earliest detection layer and prevention status.
- [ ] Current project-memory structure and budgets are machine-readable.
- [ ] Paraphrasing superseded claims does not fail `check:knowledge`.
- [ ] Removing required headings/references or exceeding hard budgets fails.
- [ ] CI-policy tests exercise the structured contract.
- [ ] No current project truth is weakened or rewritten to satisfy the checker.
- [ ] Exact-head selected checks pass on the branch.

### Required states

- Loading: not applicable.
- Empty: malformed/missing contract reports an actionable error.
- Populated: valid contract and memory pass with optional soft-budget warning.
- Validation/error: schema, required structures and monotonic budgets have distinct messages.
- Recovery/undo: revert the helper/JSON and restore the previous marker block.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable to the first slice.
- Accessibility: not applicable to the first slice.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain untouched.
- Ownership/RLS implications: none.
- No provider, secret, production data, migration or deployment write.

### Out of scope

- Merging PR #304 or changing its workflow topology.
- Reducing CodeQL, Gitleaks, browser, UI-audit or database coverage.
- Claiming a repository-wide failure rate from incomplete data.
- Automatically classifying one passing retry as a flake.
- Fixing all open product/UI debt in the same PR.

## Implementation plan

### Architecture fit

`check-project-knowledge.mjs` remains the policy entry point. A small internal helper owns JSON validation and current-memory shape/budget checks. The Markdown snapshot remains human-readable current truth; the JSON file owns only stable machine assertions, not a duplicate roadmap.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/PROJECT_KNOWLEDGE_CONTRACT.json` | add structured headings/references/budgets/assertions | remove volatile prose API |
| `scripts/project-knowledge-contract.mjs` | parse and validate contract/memory | testable owner |
| `scripts/project-knowledge-contract.test.mjs` | red/green contract fixtures | prevent recurrence |
| `scripts/check-project-knowledge.mjs` | delegate current-memory checks | preserve one policy entry point |
| `package.json` | include new test in CI policy suite | local/exact-head feedback |
| `docs/research/HISTORICAL_FAILURE_REGISTER_2026-08-06.md` | durable evidence register | avoid rediscovery |
| this packet / PR memory | lifecycle and evidence | repository-backed handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: current headings, references and budget values are preserved.
- Rollback: remove JSON/helper/test and restore the exact current-memory marker block.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| JSON duplicates changing product truth | store only structural assertions, IDs and budgets |
| Contract becomes another stale file | checker validates it on every policy run; current truth remains Markdown/code |
| Human changes budget prose but not JSON | JSON is explicit machine authority; prose no longer silently controls CI |
| Helper accepts contradictory limits | schema tests require monotonic line/byte budgets |
| Removing exact strings weakens trust | keep headings, references, status booleans and stale-claim IDs structured |
| PR conflicts with Phase 8 memory edits | avoid editing `CURRENT_PROJECT_MEMORY.md` in this slice |

### Verification plan

- Static: syntax/check:knowledge and lint if selected.
- Unit/domain: `node --test scripts/project-knowledge-contract.test.mjs`; full `test:ci-policy`.
- Database: not required; no DB boundary.
- Browser flow: not required for the first slice.
- Responsive/visual: not required for the first slice.
- Production/manual: none until owner-approved merge; no production behavior changes.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| HF-T1 | Create issue, branch and reconnaissance | owner authorization | #310 + branch | done |
| HF-T2 | Build historical failure register | T1 | register with repository evidence | done |
| HF-T3 | Add structured knowledge contract/helper | T2 | JSON + helper | done |
| HF-T4 | Add red/green contract tests | T3 | Node test suite | done; execution pending |
| HF-T5 | Integrate helper into policy entry point | T3 | `check:knowledge` | active |
| HF-T6 | Add PR memory and draft PR | T5 | PR exact number/record | todo |
| HF-T7 | Run exact-head selected checks | T6 | CI/security results | todo |
| HF-T8 | Evaluate next failure family | T7 | scope/risk decision | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every historical run has been read.
- A task may advance only when the current execution state's evidence exists.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | human_owner | researcher | discovery | explicit “Làm đi”; issue #310 | complete workflow census unavailable | inspect repo/history |
| 2026-08-06 | researcher | planner | specified | PR/commit evidence; PR #304 audit; official sources | recurrence counts are qualitative | define first prevention slice |
| 2026-08-06 | planner | implementer | implementing | failure register + structured contract design | policy integration/tests not yet executed | integrate and verify |

### Current permission boundary

- Granted scope: branch writes for bounded historical failure prevention.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; GitHub repository evidence.
- Forbidden writes: `main`, database, Supabase/Auth/provider settings, Vercel, production data, deployment.
- Human approval required before: merge, deployment, broad workflow topology change, new dependency/tool.
- Rollback or stop condition: stop if the detector requires volatile prose, weak heuristics, reduced coverage or conflicts with current truth.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Failure register exists | `HISTORICAL_FAILURE_REGISTER_2026-08-06.md` | pass |
| Structured current-memory contract | JSON/helper | implementation present; execution pending |
| Prose paraphrase remains green | focused test | execution pending |
| Structural/budget violation remains red | focused tests | execution pending |
| Exact-head verification | pending PR | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: yes; system-level prevention and preserved evidence fit the selected slice.
- Important source limitations remain respected: no complete frequency claim and no blind flake label.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending integration and test execution.
- Security/ownership: no runtime/provider/data boundary touched.
- UI/UX/accessibility: no product UI change in first slice.
- Maintainability/duplication: JSON is intentionally limited to machine-stable contract fields.
- Scope compliance: PR #304 workflow changes remain isolated.

### Remaining limitations

- The failure register is evidence-complete for selected incidents, not a full Actions census.
- Selector hygiene, browser state isolation and breakpoint mapping require separate evaluated slices.
- Exact-head verification and owner merge decision remain pending.

## Delivery record

- Branch: `chore/historical-failure-prevention`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not authorized
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: no
