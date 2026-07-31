# Enforce the research and AI delivery contract

**Status:** implementing  
**Owner:** ChatGPT  
**Issue/PR:** pending  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow's product and engineering reference maps become an enforced part of the existing delivery workflow. Non-trivial work must identify a bounded research question, select a small relevant source set, record applicability and adoption risks, and preserve this evidence in the work packet and pull request. The existing `check:knowledge` gate protects the contract from being silently removed.

## Repository reconnaissance

### Current behavior

- `docs/research/REPOSITORY_REFERENCE_MAP.md` and `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` exist on `main` after PR #176.
- `AGENTS.md` requires external research but does not directly point agents to both maps or define the two-to-four-source selection rule.
- The feature work packet has a general source table but no explicit source budget, authority classification or tool-adoption review.
- The pull-request template asks for external sources but does not require applicability, rejected scope or license/security impact.
- `scripts/check-project-knowledge.mjs` protects core operating documents but does not require the two reference maps or their workflow markers.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Entry contract read by coding agents | Extend concisely; keep under the existing line budget |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Authoritative AI delivery lifecycle | Add source selection and adoption rules |
| `docs/templates/FEATURE_WORK_PACKET.md` | Structure used before implementation | Add bounded research and adoption evidence fields |
| `.github/pull_request_template.md` | Review-time evidence contract | Require source applicability and adoption disclosure |
| `scripts/check-project-knowledge.mjs` | Existing CI-enforced knowledge gate | Extend instead of creating another framework |
| `docs/research/*.md` | Newly merged source maps | Require and index as operating documents |

### Existing tests and constraints

- `AGENTS.md` must remain at or below 160 lines.
- `npm run check:knowledge` is the correct enforcement layer.
- No runtime, financial calculation, schema, RLS, UI or deployment behavior should change.
- Existing active packets must not be broken merely because they predate this contract.

### Similar implementation and recent history

- PR #176 created the two maps and explicitly required future tasks to select two to four relevant sources.
- The current knowledge script already checks required files, source-of-truth links and work-packet headings.
- Existing repository policy prefers moving important prose rules into scripts when feasible.

### Open questions

- [x] Should enforcement be a new script? No; extend `check:knowledge` to avoid duplicate governance.
- [x] Should all existing active packets be rewritten immediately? No; enforce the template and operating documents without invalidating historical in-flight packets.
- [x] Should a listed repository authorize tool adoption? No; adoption requires a separate problem, alternatives, license/security/operations and rollback review.

## Research

### Research scope and source selection

- Decision question: how should MoneyFlow operationalize the new reference maps without adding process overhead or breaking existing work?
- Reference maps consulted: both MoneyFlow reference maps added by PR #176.
- Source budget: repository-internal sources only; no new external technical fact is needed.

### Questions researched

1. Which existing project contract should own research-source selection?
2. Which parts can be enforced mechanically without falsely validating research quality?
3. How can tool adoption be separated from merely studying a repository?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `AGENTS.md` | 2026-08-01 | Agent entrypoint, delivery boundaries and knowledge-gate policy | Must remain concise |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | 2026-08-01 | Existing research and verification lifecycle | Extend, do not replace |
| `docs/templates/FEATURE_WORK_PACKET.md` | 2026-08-01 | Required evidence structure | New fields affect future packets |
| `scripts/check-project-knowledge.mjs` | 2026-08-01 | Existing CI enforcement mechanism | Can verify markers/existence, not truthfulness |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Documentation only | Minimal change | Rules can be ignored or deleted silently | Rejected |
| New standalone research framework | Strong separation | Violates the no-new-management-layer rule | Rejected |
| Validate every source claim automatically | Appears strict | Produces false confidence; applicability needs review | Rejected |
| Extend existing documents and `check:knowledge` | Small, visible and CI-enforced | Requires careful stable markers | Selected |

### Research decision

Use the existing delivery system. Add explicit source-selection and adoption fields to the workflow, packet and PR templates. Extend `check:knowledge` to require both maps, their research index links and stable contract markers. Do not claim the script validates source quality; human review still evaluates applicability.

## Specification

### Problem

The newly merged maps are useful but advisory. Without integration into the workflow, future agents can ignore them, browse without a decision question, install tools merely because they are listed or omit evidence from review.

### User stories

- As the owner, I can see which sources informed a change and which parts were rejected.
- As an implementing agent, I have a bounded source-selection process before coding.
- As a reviewer, I can identify unjustified dependencies, architecture borrowing or AI-generated claims.
- As CI, `check:knowledge` can detect removal or weakening of the operating contract.

### Acceptance criteria

- [ ] `AGENTS.md` links both reference maps and states the bounded source rule.
- [ ] The AI delivery workflow defines source selection, applicability and tool-adoption gates.
- [ ] The feature work packet captures research scope, source authority, limits and adoption impact.
- [ ] The PR template requires source applicability and tool/dependency disclosure.
- [ ] `check:knowledge` requires both maps and stable markers in the operating documents.
- [ ] Existing active packets remain valid.
- [ ] Only documentation and the knowledge-check script change.

### Required states

- Loading: not applicable.
- Empty: a purely internal mechanical task may state `Not required` with a reason.
- Populated: two to four focused sources by default.
- Validation/error: missing map or contract marker fails `check:knowledge` with a precise message.
- Recovery/undo: revert the focused documentation/script commit.
- Long data / large VND: no financial data is processed.
- Mobile/tablet/desktop: not applicable.
- Accessibility: Markdown uses headings, lists and tables with text labels.

### Financial and security constraints

- No financial behavior changes.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none.
- Tool adoption must disclose secrets, data exposure, license, operational owner and rollback.

### Out of scope

- Installing any AI, research, architecture or quality tool.
- Changing product direction or MVP scope.
- Automatically judging whether a source is correct.
- Rewriting historical completed packets.
- Modifying CI workflow files or branch protection.

## Implementation plan

### Architecture fit

The change stays inside the existing project-knowledge layer. `AGENTS.md` remains the entry map, `AI_DELIVERY_WORKFLOW.md` owns process, the packet and PR templates own evidence capture, and `check:knowledge` owns mechanical enforcement.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | Link maps and add bounded research/adoption rule | Ensure every agent sees the contract |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Define source selection and adoption criteria | Make the process authoritative |
| `docs/templates/FEATURE_WORK_PACKET.md` | Add research-scope and adoption fields | Capture evidence before implementation |
| `.github/pull_request_template.md` | Add review disclosures and checkbox | Surface decisions at review time |
| `scripts/check-project-knowledge.mjs` | Require files, links and markers | Prevent silent regression |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing active packets are grandfathered.
- Rollback: revert the PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Process becomes bureaucratic for tiny fixes | Tiny mechanical exception remains explicit |
| Agent lists sources without reading them | PR requires applicability and rejected scope; reviewer evaluates evidence |
| Knowledge check becomes brittle | Check stable conceptual markers, not full prose |
| Existing packets fail | Do not add new mandatory headings to all active files |
| AGENTS exceeds its line budget | Keep additions compact and run `check:knowledge` |

### Verification plan

- Static: inspect diff for only intended files.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable.
- Repository gate: run or validate `npm run check:knowledge` behavior.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Update agent and workflow contracts | none | document diff | implementing |
| T2 | Update packet and PR templates | T1 | template diff | todo |
| T3 | Extend project-knowledge gate | T1–T2 | script diff and passing gate | todo |
| T4 | Review branch diff and open PR | T1–T3 | GitHub comparison and PR | todo |

Rules:

- One task should produce a reviewable result.
- New discoveries update this specification before scope changes.
- No CI workflow or runtime file may be added to scope.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Operating documents updated | pending | pending |
| Templates capture evidence | pending | pending |
| Knowledge gate protects contract | pending | pending |
| Runtime untouched | branch comparison | pending |

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: not applicable beyond Markdown structure.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- Mechanical checks cannot prove a source was read or applied correctly.
- Repository and license status must still be rechecked when a source informs implementation.

## Delivery record

- Branch: `agent/enforce-research-contract`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after owner merge
