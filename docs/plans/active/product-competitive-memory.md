# Product competitive memory consolidation

**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write + external_read  
**Owner:** Thunderkill016  
**Branch:** `docs/product-competitive-memory`  
**Base:** `main@05e923a17e579470ddcdb16108f0834ce17dc456`  
**Started:** 2026-08-02

## Repository reconnaissance

MoneyFlow already has several overlapping product and competitor research artifacts:

- `docs/research/01_RESEARCH_PLAN.md` through `05_PRODUCT_AND_ARCHITECTURE.md`;
- `docs/COMPETITOR_AND_OSS_RESEARCH.md`;
- `docs/UX_RESEARCH_AND_REDESIGN.md`;
- `docs/BEST_OF_MATRIX.md`;
- `docs/research/UI_UX_RESEARCH_LEDGER.md`;
- `docs/research/REPOSITORY_REFERENCE_MAP.md`;
- `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`;
- product truth in `README.md`, `ARCHITECTURE.md`, `docs/product/PRINCIPLES.md` and `docs/MVP_DEFINITION.md`;
- current domain and readiness gaps in issues #53, #72, #172 and #174;
- accepted implementation evidence in completed work packets, especially import provenance and atomic Inbox approval.

The repository preserves useful evidence, but no single current document answers all of these questions together:

1. How does current MoneyFlow compare with representative Vietnamese, commercial and open-source products?
2. Which earlier research conclusions are still valid, superseded or contradicted by current code?
3. What should MoneyFlow learn, adapt, reject and build next?
4. Which decisions are durable product memory rather than chat-only context?

## Research

### Decision question

What is the smallest durable competitive synthesis that accurately describes current MoneyFlow, preserves cumulative research, resolves stale conclusions and gives future product work one authoritative comparison and roadmap memory?

### Research scope and source selection

Internal sources are treated cumulatively rather than replaced. External facts are rechecked from official product sites, help centers and project documentation as of 2026-08-02.

| Source group | Authority/type | What it establishes | Boundary |
|---|---|---|---|
| MoneyFlow product/architecture documents | Primary internal truth | Current identity, financial invariants, MVP, architecture and readiness requirements | New synthesis cannot override binding product truth |
| Existing MoneyFlow research and issue history | Cumulative internal evidence | Earlier hypotheses, competitor observations, implemented changes and unresolved gaps | Dated prices, feature states and rejected concepts are not current facts |
| Money Lover and MISA MoneyKeeper official surfaces | Primary product sources | Vietnamese mental models, local feature breadth, export, recurring, goals, debt and sharing | Marketing claims are not independent proof of quality or fit |
| YNAB, Monarch, Copilot, Wallet and Rocket Money official help/product pages | Primary product sources | Reconciliation, transaction review, budgeting, recurring, aggregation and action-card patterns | US/aggregator, household, credit and subscription services may not apply |
| Actual Budget and Firefly III official docs/repos | Primary technical/product sources | Ledger semantics, transfers, reconciliation, import, rules, data ownership and audit-oriented operation | No architecture rewrite or AGPL code copying |
| Excel and Google Sheets | Substitute workflow | Portability, ownership, flexible analysis and low switching cost | Not a UI template for MoneyFlow |

### Adoption review

No dependency, provider, service, runtime framework, external code or asset is adopted. The output is repository documentation and a knowledge contract only.

- License impact: none; sources are summarized and linked, not copied into runtime code.
- Security/privacy impact: none; no provider or production data is accessed or changed.
- Ownership impact: the new memory remains subordinate to binding product principles and explicit owner decisions.
- Rollback: remove the new synthesis, index links and knowledge-check markers.

## Specification

Create `docs/research/PRODUCT_COMPETITIVE_MEMORY.md` with:

1. source hierarchy and dated snapshot rules;
2. current MoneyFlow capability/readiness assessment;
3. representative product comparison by product role and capability;
4. product-by-product lessons and boundaries;
5. cumulative synthesis: common learnings, MoneyFlow-specific fit, patterns not to copy, contradictions and resolutions;
6. current capability gaps and prioritized roadmap;
7. durable decisions, deferred scope, success metrics and update protocol;
8. explicit supersession notes for stale research status claims.

Wire the memory into:

- `docs/research/README.md` as the mandatory product/roadmap synthesis;
- `README.md` as a source-of-truth link;
- `AGENTS.md` for product behavior and external product comparison tasks;
- `scripts/check-project-knowledge.mjs` so the memory and links cannot silently disappear.

## Implementation plan

1. Recheck current product claims from official sources.
2. Reconcile external findings with current MoneyFlow code, product law and completed work.
3. Write one concept-neutral synthesis rather than another feature wishlist.
4. Update entrypoints and the project-knowledge contract.
5. Review the final branch diff for duplicated authority or stale claims.
6. Open a pull request; do not merge or modify production.

## Tasks

- [x] Read current product, architecture, MVP, research ledger and issue evidence.
- [x] Recheck representative products from official current sources.
- [x] Add the consolidated competitive memory.
- [x] Update research and repository entrypoints.
- [x] Extend the knowledge contract.
- [ ] Evaluate the exact PR head through selected CI.
- [ ] Hand off the PR for owner review.

## Evaluation

The current branch is six commits ahead of and zero commits behind `main`. The diff contains exactly six files:

- `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`: new 858-line synthesis;
- `docs/plans/active/product-competitive-memory.md`: this lifecycle packet;
- `docs/research/README.md`: product-memory index and historical-source boundary;
- `README.md`: one source-of-truth link and interpretation note;
- `AGENTS.md`: one task-specific reference replacement, with no line-count growth;
- `scripts/check-project-knowledge.mjs`: requires the memory, entrypoint links and durable markers.

Evaluation findings:

- current MoneyFlow capabilities are separated from unproven daily-use and market claims;
- old claims such as CSV/rules being absent and safe-to-spend being an active USP are identified as superseded;
- external products remain examples, not a feature checklist;
- reconciliation is justified as the next major capability by trust and ledger evidence, not competitor imitation;
- daily-use and market evidence remain prerequisites for broad feature expansion;
- no production, provider, schema, dependency, UI or financial behavior changes are included;
- the script change means exact-head repository verification is required even though product runtime is unchanged.

Selected gates:

- required: diff hygiene, project knowledge contract, CI classifier contract and JavaScript syntax;
- expected from classifier because the knowledge script changed: static/domain verification and CodeQL as selected by the repository policy;
- not applicable by scope unless the repository classifier selects otherwise: database reset, browser smoke, responsive UI audit and production verification.

## Handoff record

### Current permission boundary

Allowed: repository and web research, documentation changes on the focused branch, pull-request creation and CI inspection.  
Not allowed: direct `main` write, merge, provider setting changes, production writes, dependency adoption or product behavior changes.

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | owner request | researcher / implementer | implementing | Requested competitive comparison, consolidated documentation and durable Git memory |
| 2026-08-02 | researcher / implementer | evaluator | evaluating | Six-file branch diff completed and compared against `main`; exact-head CI remains |
