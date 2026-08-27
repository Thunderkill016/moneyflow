# MoneyFlow — research hub

**Role:** navigation and evidence discipline for MoneyFlow research. This file is not a roadmap, execution queue, capability authority or replacement for current code/tests.

MoneyFlow already keeps research beside the product so a new session can recover the relevant evidence without depending on chat history. Start from current repository truth, then load only the smallest research set needed for the question.

## Start here

| Need | Read first | Then use |
|---|---|---|
| What is true in the product now? | [CURRENT_PROJECT_MEMORY.md](./CURRENT_PROJECT_MEMORY.md) | affected code, tests and migrations |
| What work is authorized next? | [`docs/plans/active/README.md`](../plans/active/README.md) after plan authority resolves | registered active packet only |
| Which research applies to this task? | [`docs/context/README.md`](../context/README.md) | 2–4 focused sources from the routes below |
| Why did a merged change happen? | [PR_MEMORY_LOG.md](./PR_MEMORY_LOG.md) | the one named `pr-memory/YYYY/QN/PR-<number>.md` record |
| Which external repositories are useful? | [MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md](./MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md) | [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) and [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) |
| How should a new bounded research record be written? | [RESEARCH_RECORD_TEMPLATE.md](./RESEARCH_RECORD_TEMPLATE.md) | the current work packet or issue that names the research question |

## Foundational research series

These are point-in-time research foundations. They are evidence, not execution authority.

| Area | File | Role |
|---|---|---|
| Research framing | [01_RESEARCH_PLAN.md](./01_RESEARCH_PLAN.md) | Original user, competitor, domain and OSS question map |
| Users + competitors | [02_USER_AND_COMPETITORS.md](./02_USER_AND_COMPETITORS.md) | Historical user and competitor evidence |
| Financial domain | [03_DOMAIN_RULES.md](./03_DOMAIN_RULES.md) | Domain rules and accounting/ledger research |
| Open source | [04_OPEN_SOURCE_ANALYSIS.md](./04_OPEN_SOURCE_ANALYSIS.md) | Historical repository analysis |
| Product + architecture | [05_PRODUCT_AND_ARCHITECTURE.md](./05_PRODUCT_AND_ARCHITECTURE.md) | Historical synthesis; current code/architecture outrank it |

## Current research routes

### Product and market

- [PRODUCT_CAPABILITY_GAP_MATRIX.md](./PRODUCT_CAPABILITY_GAP_MATRIX.md) — historical capability audit; never a feature queue.
- [PRODUCT_COMPETITIVE_MEMORY.md](./PRODUCT_COMPETITIVE_MEMORY.md) — competitor patterns, sources and anti-copy limits.
- [MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md](./MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md) — current subsystem-oriented repository atlas for long-term development.

### Financial domain and architecture

- [REPOSITORY_REFERENCE_MAP.md](./REPOSITORY_REFERENCE_MAP.md) — finance/application references by capability.
- [ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md](./ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md) — security, testing, architecture and delivery references.
- [HISTORICAL_FAILURE_REGISTER_2026-08-06.md](./HISTORICAL_FAILURE_REGISTER_2026-08-06.md) — recurring failure patterns and prevention status.

### UI, UX and brand

- [UI_UX_RESEARCH_LEDGER.md](./UI_UX_RESEARCH_LEDGER.md) — accumulated UI/UX evidence and superseded concepts.
- [A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md](./A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md) — UI/design failure postmortem and guardrails.
- [PUBLIC_EXPERIENCE_FOUNDATION.md](./PUBLIC_EXPERIENCE_FOUNDATION.md) — public/brand experience foundation when that boundary is active.
- [WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md](./WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md), [WEB_DESIGN_PROCESS_CONVERGENCE.md](./WEB_DESIGN_PROCESS_CONVERGENCE.md), [UXPILOT_DESIGN_CORPUS_INVENTORY.md](./UXPILOT_DESIGN_CORPUS_INVENTORY.md), [FRAMER_DESIGN_CORPUS_INVENTORY.md](./FRAMER_DESIGN_CORPUS_INVENTORY.md) — design-process evidence and source inventories; load only when needed.

### Current truth and provenance

- [CURRENT_PROJECT_MEMORY.md](./CURRENT_PROJECT_MEMORY.md) — compact current implementation/trust truth.
- [PROJECT_KNOWLEDGE_CONTRACT.json](./PROJECT_KNOWLEDGE_CONTRACT.json) — machine-enforced knowledge contract.
- [PR_MEMORY_LOG.md](./PR_MEMORY_LOG.md) and `pr-memory/YYYY/QN/` — bounded merged-change provenance.

## Research contract

A useful MoneyFlow research record answers a decision question rather than collecting links.

1. **Start from MoneyFlow reality.** Read the affected code/tests/migrations and current memory before external research.
2. **Name one bounded question.** Research must be tied to a product, domain, architecture, security, UX or delivery decision.
3. **Use 2–4 focused sources by default.** Prefer official specifications/platform documentation, then maintained implementation references, then practitioner evidence. Popularity alone is weak evidence.
4. **Separate fact, inference and recommendation.** A source may establish a fact without proving that MoneyFlow should adopt the same choice.
5. **Record applicability limits.** For every important source say what it establishes, what does not transfer to MoneyFlow, and any license/security/privacy/ownership/operational constraints.
6. **Prefer negative evidence over repetition.** Failed experiments, rejected approaches and conditions that invalidate a recommendation should remain findable so future sessions do not repeat them.
7. **End in an actionable posture.** Use `Adopt`, `Adapt`, `Reject`, `Defer` or `Needs owner decision`; link the finding to the issue/spec/packet that may act on it.
8. **Do not convert research into authority.** A research document does not authorize implementation, provider writes, production changes, bank/Open API integration, native capture, wealth, household or AI mutation.

## Source quality ladder

Use the highest applicable source, and cross-check when a claim materially affects financial correctness, privacy, security, legal exposure or provider behavior.

| Priority | Source type | Good for | Main limitation |
|---|---|---|---|
| 1 | Current MoneyFlow code/tests/migrations + provider read-back | What actually exists and behaves now | Does not prove user/market desirability |
| 2 | Official specification, regulator, platform/provider docs | APIs, policy, constraints, legal/technical contracts | Marketing or docs can still lag runtime |
| 3 | Maintained reference implementation + tests/issues | Concrete architecture, lifecycle and failure patterns | Different product/scale/license assumptions |
| 4 | Practitioner studies, support forums, store reviews | Friction, churn language, real failure modes | Selection bias; anecdotes are not prevalence |
| 5 | Aggregators, affiliate comparisons, generic AI summaries | Discovery only | Never final authority for material claims |

## Research record lifecycle

Use [RESEARCH_RECORD_TEMPLATE.md](./RESEARCH_RECORD_TEMPLATE.md) for a new bounded study when the result is reusable beyond one PR comment.

- **Draft:** question or evidence is still incomplete.
- **Active:** evidence is reviewed and still materially applicable.
- **Historical:** useful as point-in-time context but not current truth.
- **Superseded:** a named newer record or current artifact replaces its conclusion.

Prefer Git history and explicit links over duplicating the same conclusion in several files. If a current product fact changes, update its actual authority; do not keep a second current truth here.

## Interpretation order

1. Read affected code/tests/migrations.
2. Read `CURRENT_PROJECT_MEMORY.md`.
3. Use `docs/context/README.md` to select warm context.
4. Use `docs/plans/active/README.md` only for current execution state.
5. Select 2–4 relevant research sources; do not preload the whole research directory.
6. Open historical PR memory only when provenance is necessary.
7. Re-check date-sensitive external evidence before using it for a new decision.

Every PR targeting `main` still requires its bounded PR-memory record. Research is evidence; code, tests, migrations, checked plan authority and explicit owner decisions remain the controlling layers for implementation.