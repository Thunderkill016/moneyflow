# #432 — Vietnam long-term product strategy research

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** researcher  
**Permission scope:** branch_write  
**Owner:** human owner / research agent  
**Issue/PR:** #432 / PR pending  
**Last updated:** 2026-08-18

## Outcome

Produce one evidence-backed, practical long-term direction for MoneyFlow as a Vietnamese personal-finance product. The recommendation must start from Vietnamese money behavior, infrastructure, regulation and MoneyFlow's actual ledger strengths rather than copying the feature set of another personal-finance product. It remains research until owner review; no product law or implementation scope changes automatically.

## Repository reconnaissance

### Current behavior

MoneyFlow is a released manual-first Vietnamese personal-finance ledger with multiple accounts, integer-VND income/expense/transfers, correction/recovery, reports, export/import and secondary planning surfaces. Current principles already prioritize correctness, core transaction completion, mobile usability, recovery and reconciliation above feature breadth. Current product re-orientation found the core financial implementation strong but the total surface larger than the four daily jobs require.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/product/PRINCIPLES.md` | current product law | preserve as authority until owner changes it |
| `docs/product/REORIENTATION_2026-08.md` | current measured scope/drift assessment | use findings; do not re-open corrected navigation miscount |
| `docs/MVP_DEFINITION.md` | released MVP capability reference | distinguish shipped scope from future strategy |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | implementation/trust authority | use for runtime/release facts; code/main outrank stale header metadata |
| `src/lib`, server/domain tests | financial invariants | no change in this research |

### Existing tests and constraints

- Related unit/browser/database tests: not changed by this research.
- Financial invariants: integer VND; transfers neutral; user ownership/RLS; recoverable destructive actions; no invented planning assumptions.
- Product constraints: Vietnamese-first, mobile-first, progressive disclosure, export/data ownership, no bank sync or AI advice without a new researched specification and owner approval.

### Similar implementation and recent history

- #425 / `REORIENTATION_2026-08.md` measured the current product and corrected a false navigation-overload claim.
- #415/#419 showed why measurement must distinguish infrastructure from user-visible improvement.
- Current release blockers and RRB-08 remain separate from product strategy research.

### Open questions

- [ ] Which initial Vietnamese user segment has enough repeated pain to retain and pay?
- [ ] Can a low-maintenance manual/import workflow produce a trusted month before any bank partnership?
- [ ] Which data sources can be integrated economically and legally after retention is proven?
- [ ] What pricing is acceptable? No current evidence establishes a price.

## Research

### Research scope and source selection

- Decision question: what product shape can remain useful before bank connectivity, become materially lower-maintenance as connectivity grows, and sustain a trustworthy Vietnamese PFM business over 24–36 months?
- Reference map consulted: project context router, current principles, current re-orientation and implementation memory.
- Source budget exception: broader than the default 2–4 because this is cross-cutting market/regulatory strategy. Primary/official sources dominate; behavioral evidence is used only to test interaction principles, not to import another product's feature model.
- Expected decision: a single product thesis, initial wedge, data-acquisition ladder, sequencing hypothesis, business-model hypothesis and falsifiable validation plan.

### Questions researched

1. How digital are Vietnamese payments and account use now?
2. Can an independent PFM realistically obtain bank/e-wallet transaction data?
3. Which population/economic constraints make a broad subscription strategy risky?
4. What product behavior is more defensible than adding education, charts or feature breadth?
5. What must be validated before native apps, provider contracts or expensive automation?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| State Bank of Vietnam, Digital Transformation Banking 2025 | regulator / official | 2026-08-18 | >87% of adults have bank accounts; many institutions execute >90% of transactions digitally | supply-side/regulator statistic, not MoneyFlow demand |
| NAPAS 2025 Member Organization Conference | national payment infrastructure / official | 2026-08-18 | nearly 90m mobile-banking accounts used VietQR by Oct 2025; VietQR volume +52% YoY in first 10 months | account count is not unique people and does not prove PFM need |
| Circular 64/2024/TT-NHNN | binding regulation | 2026-08-18 | Open API framework includes account/transaction information; third parties need bank contracts, consent, security/risk controls | enables a path, not guaranteed access or economics for MoneyFlow |
| Decree 94/2025/NĐ-CP + Circular 19/2026/TT-NHNN | binding regulatory sandbox framework | 2026-08-18 | controlled testing of banking fintech including Open API is operational | participation/approval still required |
| Law 91/2025/QH15 + Decree 356/2025/NĐ-CP | binding privacy law | 2026-08-18 | current personal-data law and implementing decree effective 2026-01-01 | legal counsel must determine MoneyFlow-specific obligations |
| General Statistics Office 2025 labor/income releases | national statistics | 2026-08-18 | 2025 average worker income ~8.4m VND/month; informal employment remained high (64.3% in Q1) | macro averages do not establish willingness to pay or segment demand |
| World Bank Global Findex 2025 / IFC Vietnam release | nationally representative demand-side research | 2026-08-18 | digital financial use is widespread; dataset covers payments, resilience and financial health | raw microdata case percentages must not be treated as weighted national estimates without proper analysis |
| World Bank financial capability + selected field experiments | research evidence | 2026-08-18 | information/education alone has uncertain sustained behavior effects; defaults, reduced cognitive cost and timely feedback can materially affect behavior in some contexts | experiments are not Vietnam PFM product validation and do not transfer effect sizes directly |

Key source URLs:

- https://www.sbv.gov.vn/w/sbv637421
- https://en.napas.com.vn/napas-2025-member-organization-conference-184260317124736875.htm
- https://vbpl.vn/nganhangnhanuoc/Pages/vbpq-toanvan.aspx?ItemID=174547
- https://vanban.chinhphu.vn/?classid=0&docid=213519&pageid=27160
- https://vanban.chinhphu.vn/?classid=1&docid=218234&orggroupid=4&pageid=27160
- https://vbpl.vn/TW/Pages/ivbpq-thuoctinh.aspx?ItemID=179252
- https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160
- https://www.gso.gov.vn/du-lieu-va-so-lieu-thong-ke/2026/01/bao-cao-tinh-hinh-kinh-te-xa-hoi-quy-iv-va-nam-2025/
- https://www.gso.gov.vn/tin-tuc-thong-ke/2025/04/thong-cao-bao-chi-ve-tinh-hinh-lao-dong-viec-lam-quy-i-nam-2025/
- https://www.worldbank.org/en/publication/globalfindex/report
- https://www.ifc.org/vi/pressroom/2025/digital-finance-to-drive-viet-nam-s-economic-growth-job-creation-and-access-to-fin
- https://responsiblefinance.worldbank.org/en/responsible-finance/financial-capability

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Manual expense tracker with more features | cheap to build; current base already exists | maintenance burden stays high as payments digitize; feature breadth does not establish retention | reject as long-term thesis |
| Bank-sync-first aggregator | potentially low data-entry burden | contract/regulatory/provider dependency before product value and retention are proven | reject as day-one foundation; keep as later capability |
| Financial-education/coach product | broad apparent need | sustained behavior impact uncertain; risks judgmental/advice boundary | reject as product identity |
| Broad all-in-one finance platform | large theoretical TAM | scope, trust, legal and UX complexity overwhelm current evidence | reject for current horizon |
| Trusted, low-maintenance personal ledger that becomes progressively connected | works before provider deals; preserves current strengths; connectivity compounds value later | requires excellent import/reconciliation and proof that users return | selected research recommendation |

### Research decision

Observed facts: Vietnamese banking/payment activity is heavily digital; Open API now provides a regulated path to account/transaction access but requires bank-level commercial/operational agreements; privacy obligations are materially stronger from 2026; incomes and labor formality vary widely, so a one-size-fits-all paid PFM proposition is risky.

Inference: MoneyFlow should not depend on daily manual entry forever, but it also should not spend its early life waiting for universal bank connectivity. The durable architecture/product direction is a provider-independent personal ledger whose maintenance effort falls over time through an ingestion ladder: fast manual fallback -> statement/file/share-assisted import -> deterministic matching/reconciliation -> selective contracted read-only bank connections. Planning and intelligence sit on top of trusted data rather than substitute for it.

Product judgment: the first market wedge should be digitally banked Vietnamese adults with enough account/payment activity that maintaining a whole-money picture is a repeated job. Urban salaried users are the best initial hypothesis because digital account use and stable income make the workflow testable, but this is not yet validated demand. Irregular-income workers are a strategically important later/parallel research segment, not something to infer away from national averages.

Remaining uncertainty: retention, willingness to pay, actual multi-account fragmentation, import tolerance and which recurring decisions users value most must be measured directly. No macro source answers those questions.

### Adoption review

Not applicable. This research adds no dependency, provider, service, runtime integration or architecture change.

## Specification

### Problem

MoneyFlow has a strong financial core but no validated long-term market thesis that explains why a Vietnamese user will continue maintaining it as payments become increasingly digital. Continuing to add PFM features or building expensive provider integrations before demand proof both create high failure risk.

### User stories

- As a Vietnamese user with money moving across accounts and payment methods, I can maintain one trustworthy picture of balances and cash flow without re-entering everything by hand.
- As a user, I can always correct, reconcile and export my own data regardless of which ingestion source is available.
- As a user with enough trusted history, I receive useful planning/attention at the moment it matters without unsupported advice.

### Acceptance criteria

- [x] Research separates observed market facts from product hypotheses.
- [x] Recommendation does not depend on copying another PFM product.
- [x] Data-acquisition path remains useful without Open API and can adopt it later.
- [x] Privacy/provider constraints are explicit.
- [x] Strategy contains falsifiable validation gates before expensive implementation.
- [ ] Owner accepts, rejects or revises the thesis.

### Required states

Not an application implementation. Future slices must separately specify mobile, empty/error, recovery and accessibility states.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- No provider credentials, transaction data or personal research participant data enter repository research docs.
- Bank connectivity requires a separate security/privacy/provider specification and owner approval.

### Out of scope

- Application implementation.
- Provider contracts or production integration.
- Native mobile commitment.
- Pricing commitment.
- Bank/e-wallet selection.
- AI/financial advice.
- Closing any release blocker or #403.

## Implementation plan

### Architecture fit

No implementation is authorized by this packet. If owner accepts the thesis, subsequent work should first validate usage with current ledger/import boundaries before introducing a new architecture primitive.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/VIETNAM_LONG_TERM_PRODUCT_STRATEGY_2026.md` | record evidence and recommendation | durable research handoff |
| `docs/plans/active/README.md` | register owner-promoted research while decision is pending | current execution routing |
| bounded PR memory after PR creation | truthful lifecycle record | repository policy |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Macro digital-payment growth does not mean people want a PFM | interview/concierge cohort and retention metrics before build-out |
| Users will not upload statements/import data | test import-assisted monthly close before provider work |
| Users only want bank-native views | test cross-account whole-money value proposition with real workflows |
| Subscription willingness is low | pricing interviews + real paid pilot; do not set price from income averages |
| Open API partnerships are uneconomic | treat connectivity as optional capability; require partner economics before commitment |
| Planning features distract from ledger maintenance | keep progressive disclosure and require usage evidence before expansion |

### Verification plan

- Static: documentation/knowledge policy only.
- Unit/domain/database/browser/responsive: not applicable.
- Production/manual: no production change.
- Research verification: source dates/authority checked; inferences labeled; owner review required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | reconcile current product/repo truth | none | principles, reorientation, current main | done |
| T2 | research Vietnam payment/data/regulatory reality | T1 | official SBV/NAPAS/VBPL/GSO/WB sources | done |
| T3 | synthesize strategy + data ladder + business hypotheses | T2 | durable research document | done |
| T4 | owner review of product thesis | T3 | explicit owner decision | todo |
| T5 | if accepted, design direct user-validation program | T4 | separate accepted slice | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-18 | human_owner | researcher | discovery | issue #432 + explicit chat mandate | long-term thesis unknown | research market/product from first principles |
| 2026-08-18 | researcher | human_owner | evaluating | packet + strategy research | target wedge, WTP and retention remain hypotheses | accept/reject/revise thesis; do not implement automatically |

### Current permission boundary

- Granted scope: research and branch documentation.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: provider, production, schema, application/financial semantics, main branch.
- Human approval required before: merge; changing product law; implementation; provider/native/AI commitments.
- Rollback or stop condition: close/reject research PR with no runtime impact.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| current repo truth read before web research | principles/reorientation/current memory | pass |
| primary/official Vietnam evidence prioritized | SBV, NAPAS, VBPL, GSO, World Bank/IFC | pass |
| category-copy strategy avoided | research method + alternatives | pass |
| expensive dependencies gated behind validation | data ladder + roadmap | pass |
| owner product decision obtained | pending | pending |

### Research and adoption evidence

- Selected official sources support digital-payment growth, regulated Open API path and privacy constraints.
- Source limitations remain explicit; no raw Findex microdata case percentages are used as national estimates.
- No adoption/dependency change.

### Review findings

- Correctness: recommendation preserves current financial invariants.
- Security/ownership: data portability and consent/provider boundaries remain first-class.
- UI/UX/accessibility: no UI change; strategy favors reduced maintenance effort over interface breadth.
- Maintainability/duplication: recommendation argues against feature expansion without evidence.
- Scope compliance: research/docs only.

### Remaining limitations

Direct Vietnamese user interviews, usage telemetry, paid willingness-to-pay evidence, bank/provider commercial feasibility and e-wallet-specific access are not yet proven.

## Delivery record

- Branch: `research/432-vietnam-long-term-product-strategy`
- PR: pending
- Squash commit: N/A
- CI run: pending
- Production deployment: N/A
- Production flow verified: N/A
- Work packet moved to `docs/plans/completed/`: no