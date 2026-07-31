# Enforce the research and AI delivery contract

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #177  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow's product and engineering reference maps are enforced through the existing delivery workflow. Non-trivial work must identify a bounded decision question, select a small relevant source set, record applicability and rejected scope, and review license, security, privacy, operational ownership and rollback before adopting a tool, dependency, provider or architecture pattern. `npm run check:knowledge` now protects the contract from silent removal.

## Repository reconnaissance

### Current behavior

Before this change, PR #176 had added both reference maps, but `AGENTS.md`, the work-packet template, the PR template and the project-knowledge gate did not consistently require their use.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | Entry contract read by coding agents | Extended concisely; remains below the line budget |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Authoritative AI delivery lifecycle | Owns source selection and adoption rules |
| `docs/templates/FEATURE_WORK_PACKET.md` | Evidence captured before implementation | Now captures research scope and adoption review |
| `.github/pull_request_template.md` | Evidence visible to reviewers | Now requires source limits and adoption disclosure |
| `scripts/check-project-knowledge.mjs` | Existing CI knowledge gate | Extended instead of creating a new governance layer |

### Existing tests and constraints

- `AGENTS.md` must remain at or below 160 lines.
- Existing active packets must remain valid.
- No runtime, schema, RLS, dependency, CI workflow or deployment behavior may change.
- Mechanical checks can enforce presence and stable markers, but not prove source quality.

### Similar implementation and recent history

- PR #176 created the two maintained reference maps.
- `check:knowledge` already enforced required files, source-of-truth links and active-packet headings.
- Repository policy prefers moving important prose rules into scripts when feasible.

### Open questions

- [x] Extend the existing gate or add a new framework? Extend the existing gate.
- [x] Rewrite all existing active packets? No; enforce future templates without retroactive breakage.
- [x] Does listing a repository approve adoption? No; adoption requires a separate review.

## Research

### Research scope and source selection

- Decision question: how should MoneyFlow operationalize the new maps without adding process overhead or invalidating current work?
- Reference maps consulted: both maps added by PR #176.
- Source budget: repository-internal operating documents only; no new external fact was required.

### Questions researched

1. Which existing contract should own source selection?
2. Which parts can be enforced mechanically without creating false confidence?
3. How should studying a repository be separated from adopting its code or architecture?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `AGENTS.md` | Repository authority | 2026-08-01 | Agent entrypoint and delivery boundaries | Must remain concise |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Repository authority | 2026-08-01 | Existing research and verification lifecycle | Extend, do not replace |
| `docs/templates/FEATURE_WORK_PACKET.md` | Repository template | 2026-08-01 | Required evidence structure | New fields apply to future packets |
| `scripts/check-project-knowledge.mjs` | CI contract | 2026-08-01 | Existing enforcement mechanism | Verifies markers, not truthfulness |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Documentation only | Minimal change | Rules can be ignored or removed silently | Rejected |
| New research framework | Strong separation | Duplicates the current management layer | Rejected |
| Automatically judge every source claim | Appears strict | Produces false assurance | Rejected |
| Extend current workflow and knowledge gate | Small, reviewable and CI-enforced | Requires stable markers | Selected |

### Research decision

Use the existing delivery system. Require explicit source selection and applicability in the workflow, packet and PR templates. Extend `check:knowledge` to require both maps, index links and stable contract markers. Human review remains responsible for deciding whether sources are credible and applicable.

### Adoption review

Not applicable. The change adds no dependency, provider, service, framework or architecture pattern.

## Specification

### Problem

Advisory maps alone do not stop agents from browsing without a question, copying large-project architecture, installing tools merely because they are listed or omitting research limitations from review.

### User stories

- As the owner, I can see which sources informed a change and which ideas were rejected.
- As an implementing agent, I have a bounded research process before coding.
- As a reviewer, I can identify unjustified dependencies or architecture borrowing.
- As CI, the knowledge gate detects missing maps or weakened contract markers.

### Acceptance criteria

- [x] `AGENTS.md` links both maps and states the two-to-four-source default.
- [x] The AI delivery workflow defines authority, applicability and adoption gates.
- [x] The feature packet captures research scope, source limits and adoption impact.
- [x] The PR template surfaces source limitations and tool/dependency disclosure.
- [x] `check:knowledge` requires maps, index links and stable markers.
- [x] Existing active packets remain valid.
- [x] Only operating documents and the knowledge-check script changed.

### Required states

- Loading: not applicable.
- Empty: mechanical work may state `Not required` with a reason.
- Populated: two to four focused sources by default.
- Validation/error: a missing map or marker fails with a precise message.
- Recovery/undo: revert PR #177.
- Long data / large VND: no financial data is processed.
- Mobile/tablet/desktop: not applicable.
- Accessibility: Markdown uses structured headings, lists and tables.

### Financial and security constraints

- No financial behavior changes.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none.
- Future tool adoption must disclose secrets, data exposure, license, owner and rollback.

### Out of scope

- Installing any listed tool.
- Changing product direction or MVP scope.
- Automatically judging whether a source is correct.
- Rewriting historical completed packets.
- Modifying workflow YAML, branch protection or deployment configuration.

## Implementation plan

### Architecture fit

The change remains in the existing project-knowledge layer: `AGENTS.md` is the map, the AI workflow owns process, templates own evidence capture and `check:knowledge` owns mechanical enforcement.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | Link maps and add bounded source rule | Ensure every agent sees the contract |
| AI delivery workflow | Define research and adoption gates | Make behavior authoritative |
| Work-packet template | Add scope, authority and adoption fields | Capture evidence before coding |
| PR template | Add applicability and adoption disclosures | Surface evidence during review |
| Knowledge-check script | Require files, links and markers | Prevent silent regression |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing active packets are grandfathered.
- Rollback: revert PR #177.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Tiny fixes become bureaucratic | Existing tiny-mechanical exception remains |
| Sources are listed but not understood | Review requires applicability and rejected scope |
| Gate becomes brittle | It checks stable conceptual markers only |
| Existing packets fail | No new retroactive active-packet heading requirement |
| AGENTS exceeds budget | `check:knowledge` passed in CI |

### Verification plan

- Static: branch diff limited to six intended files.
- Unit/domain: full repository unit/static suite run by CI.
- Database: fresh Supabase reset and pgTAP run by CI.
- Browser flow: expense-path smoke run by CI.
- Responsive/visual: production cross-device audit run by CI.
- Production/manual: not applicable; no deployed product behavior changes.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Update agent and workflow contracts | none | document diff | done |
| T2 | Update packet and PR templates | T1 | template diff | done |
| T3 | Extend project-knowledge gate | T1–T2 | `check:knowledge` success | done |
| T4 | Review branch diff and open PR | T1–T3 | PR #177 | done |
| T5 | Run full CI and record evidence | T4 | CI #696 | done |

Rules:

- No CI workflow or runtime file entered scope.
- New discoveries update the specification before implementation scope changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Operating documents updated | PR #177 diff | pass |
| Templates capture bounded research and adoption evidence | packet and PR templates | pass |
| Knowledge gate protects the contract | CI #696 project-knowledge step | pass |
| Existing repository gates remain healthy | verify, database and e2e jobs | pass |
| Runtime untouched | six-file branch comparison | pass |

### Research and adoption evidence

- Selected internal sources still support the final implementation.
- The script intentionally does not claim to validate research truthfulness.
- No new tool, dependency or architecture was adopted.

### Review findings

- Correctness: stable markers protect the intended contract without validating claims falsely.
- Security/ownership: future adoption fields include privacy, secrets, maintenance and rollback.
- UI/UX/accessibility: no product UI changes; Markdown structure remains navigable.
- Maintainability/duplication: existing workflow and gate were extended rather than duplicated.
- Scope compliance: no runtime, product, architecture or provider expansion.

### Remaining limitations

- Mechanical checks cannot prove a source was read or applied correctly.
- Repository maintenance and licenses must still be rechecked when sources inform implementation.

## Delivery record

- Branch: `agent/enforce-research-contract`
- PR: #177
- Squash commit: pending owner merge
- CI run: #696, run `30671522057`, success
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: after owner merge
