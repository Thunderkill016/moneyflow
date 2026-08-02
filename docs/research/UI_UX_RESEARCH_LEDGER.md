# MoneyFlow — cumulative UI/UX research ledger

**Status:** active cumulative research index  
**Last updated:** 2026-08-02  
**Scope:** product UI/UX, public landing/authentication, authenticated product surfaces, accessibility, responsive behavior, design tooling and visual evaluation  
**Owner rule:** research evidence accumulates; design concepts remain provisional

## 1. Purpose

This ledger is the durable handoff for MoneyFlow UI/UX research across agents, branches and chat sessions. It exists so later work does not restart from the newest concept document or silently forget older sources.

This file records:

- which internal and external sources were consulted;
- what each source actually establishes;
- what applies specifically to MoneyFlow;
- what must not be copied;
- conflicts between sources and how they are resolved;
- rejected or superseded design concepts;
- missing evidence that must not be invented.

This file is **not** a visual style guide, a frozen design system, a competitor feature checklist or permission to copy source code, content, assets or branded layouts.

## 2. Binding interpretation rules

1. Start with current MoneyFlow behavior, product principles and real-use evidence.
2. Treat external products as examples, not universal rules.
3. Separate fact, observation, user opinion, inference and MoneyFlow decision.
4. Preserve useful evidence from rejected concepts, but discard their aesthetic conclusions as defaults.
5. When sources conflict, current product truth and an explicit owner decision win.
6. Do not convert missing evidence into a confident claim.
7. A new source supplements this ledger unless the owner explicitly removes or replaces an older source.
8. Every future UI/UX work packet must record which ledger entries it used and which did not apply.

## 3. Status labels

| Label | Meaning |
|---|---|
| **Binding** | Current owner or product constraint. Must be followed until explicitly changed. |
| **Active evidence** | Still useful research or verified product evidence. Does not prescribe a visual style by itself. |
| **Historical** | Records an earlier product/design direction. Useful only for lessons and provenance. |
| **Rejected** | Explicitly not an active baseline or acceptance source. |
| **Candidate** | Proposed or implemented direction awaiting owner acceptance. |
| **Unverified** | Mentioned in prior research but the original source, date or claim has not been preserved well enough. |
| **Missing** | The conversation referenced material that is not recoverable from the repository. Do not reconstruct it from memory. |

---

# 4. Source-of-truth hierarchy

## 4.1 Binding product and owner decisions

| Source | Status | What it establishes | Boundary |
|---|---|---|---|
| `docs/product/PRINCIPLES.md` | **Binding** | Vietnamese manual-first ledger; quick recording; trustworthy balances and period understanding; correction, recovery and export; no unsupported spending advice | Overrides older research when product direction conflicts |
| `docs/MVP_DEFINITION.md` | **Binding** | Current ship/readiness scope and completion contract | Not a visual style guide |
| `docs/design/DESIGN_DIRECTION_STATUS.md` | **Binding** | Signal Ledger is rejected; no named design concept becomes a permanent default merely because it was documented or implemented | Owner selects or reactivates a direction |
| `docs/AI_UIUX_WORKFLOW.md` | **Binding process** | Read cumulative research, audit current behavior, generate genuinely different directions, obtain owner selection, then lock tokens/components | Does not preselect a visual concept |
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | **Binding brand foundation** | Product character, voice, claim boundaries and approved brand/logo foundation | Any reference to an older visual contract must be interpreted through current design-direction status |
| `docs/design/MONEYFLOW_LOGO.md` | **Binding identity asset** | Canonical approved logo geometry and usage | Does not dictate the full UI aesthetic |
| `AGENTS.md` and active work packet | **Binding delivery process** | Required reading, scope, permissions, evidence and merge boundaries | Chat context is not a durable handoff |

## 4.2 Primary MoneyFlow evidence

| Source | Status | Evidence retained |
|---|---|---|
| Current production code and rendered UI | **Active evidence** | What users can actually do, current information architecture, component ownership and technical constraints |
| `docs/REAL_USE_READINESS_CONTRACT.md` | **Active evidence** | Authenticated core flow, production mobile path, export, tenant isolation, seven-day owner self-use and explicitly waived checks |
| Playwright cross-device UI audit and evidence artifacts | **Active evidence** | 320/360/390 px phone behavior, tablet/desktop, Chromium/WebKit where available, light/dark, keyboard, 200% text, overflow and hidden-action checks |
| Owner physical-phone findings and screenshots recorded in PR history | **Active evidence** | Problems that automation missed: sticky/header behavior, hit areas, keyboard obstruction, long money values, modal layout and real task friction |
| PR #208 (`design/money-clarity-final`) | **Candidate** | A simplified landing/auth implementation using real MoneyFlow screenshots and direct task labels; ready for human visual review, not an approved permanent direction |

**Priority rule:** verified MoneyFlow behavior and owner-observed failures outrank attractive competitor screenshots or generic design advice.

---

# 5. Internal cumulative research documents

## 5.1 Research series

| Document | Status | Retain | Do not treat as current truth |
|---|---|---|---|
| `docs/research/01_RESEARCH_PLAN.md` | **Historical research plan** | User groups, competitor set, research questions, source hierarchy, Adopt/Adapt/Reject discipline | Initial assumptions, prices and activity snapshots without re-verification |
| `docs/research/02_USER_AND_COMPETITORS.md` | **Active evidence with dated assumptions** | Vietnamese audience hypotheses, manual-entry friction, export/ownership, competitor matrix, evidence labels | Unverified market-gap claims, stale prices, unsupported retention generalizations |
| `docs/research/03_DOMAIN_RULES.md` | **Active domain evidence** | Financial behavior that UI must represent honestly | Visual conclusions outside its domain |
| `docs/research/04_OPEN_SOURCE_ANALYSIS.md` | **Active evidence with dated metadata** | Repository strengths, license boundaries, applicable patterns and non-applicable architecture | 2026-07-15 stars/activity as current facts; any code copying beyond license review |
| `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` | **Active synthesis where consistent with current principles** | Manual-first thu/chi positioning, fast capture, integer VND, transfer correctness, export and MVP boundaries | Safe-to-spend and other conclusions withdrawn by newer product truth |
| `docs/research/REPOSITORY_REFERENCE_MAP.md` | **Active index** | Finance-product and UI repositories mapped to specific questions and boundaries | A roadmap, dependency list or instruction to study every repository |
| `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` | **Active index** | Research discipline, GOV.UK/18F methods, AI workflow, testing and evidence practices | Permission to add tools or architecture automatically |
| `docs/research/README.md` | **Active index** | Entry point to research series and reference maps | Proof that every historical conclusion remains valid |

## 5.2 Earlier UX and design syntheses

| Document | Status | Useful evidence | Superseded or rejected parts |
|---|---|---|---|
| `docs/UX_RESEARCH_AND_REDESIGN.md` | **Historical** | Detailed audits of Money Lover, YNAB, Monarch, Copilot, Wallet, Spendee, Rocket Money, Actual, Firefly III, Expensify and Vietnamese money-management behavior; anti-copy discipline; state and accessibility checklists | Universal Financial Inbox identity, Inbox as default route, dashboard demotion, fixed IA and safe-to-spend conclusions |
| `docs/BEST_OF_MATRIX.md` | **Historical evidence** | “Take one strong pattern, not the whole product”; competitor-to-pattern mapping; Core/Power/Lab separation | Safe-to-spend, old navigation decisions and completed-task state |
| `docs/UX_PRINCIPLES.md` | **Mixed** | Clarity, recognition over recall, progressive disclosure, feedback, error prevention, Vietnamese-first, accessibility and mobile considerations | Statements declaring Calm Ledger controlling; fixed navigation/dashboard prescriptions; unattributed numeric claims |
| `docs/design-system.md` | **Mixed implementation reference** | Existing semantic roles, money typography, spacing, responsive and accessibility considerations | Any statement that Calm Ledger is the permanent redesign authority; fixed aesthetic values as limits on exploration |
| `docs/design/CALM_LEDGER_V2.md` | **Historical concept** | Token audit history, contrast calculations, motion and data-display lessons | Not a default direction for future work; not allowed to constrain independent exploration |
| `docs/design/SIGNAL_LEDGER_V3.md` | **Rejected** | Source list and a record of one experiment | Warm-neutral/cobalt/editorial aesthetic, named narrative, information structure and acceptance criteria |
| Prior Analytics Desk, Daily Coach, Inbox-first and other named directions | **Historical hypotheses** | Trade-offs, risks and reasons they were not chosen | No priority over new directions |

## 5.3 Important document conflicts already identified

- `docs/UX_PRINCIPLES.md`, `docs/design-system.md` and parts of brand documentation still reference Calm Ledger as visual authority. That reference is historical, not permission to lock future design work.
- `docs/BEST_OF_MATRIX.md`, `docs/UX_RESEARCH_AND_REDESIGN.md` and Phase 2/5 research contain safe-to-spend ideas. Current product principles explicitly prohibit deriving a spending recommendation from total assets or incomplete planning data.
- Old Inbox-first research is preserved for capture/import/review patterns, but MoneyFlow's current identity is a manual-first personal income/expense ledger.
- Old exact statistics attributed to NN/g or Baymard are not considered verified unless the original study/article is linked and reviewed.

---

# 6. Product and competitor sources

## 6.1 Vietnamese and local-context sources

| Source | What it contributed | MoneyFlow fit | Do not copy / uncertainty |
|---|---|---|---|
| Money Lover (`moneylover.me`, app-store surfaces) | Familiar Vietnamese mental model: wallets/accounts, categories, quick mobile add | Multi-account clarity, Vietnamese copy, fast capture | Ads/paywalls, icon/layout cloning, marketing superiority claims; reviews and prices age quickly |
| MISA MoneyKeeper (official/store surfaces) | Local language, local pricing expectations and automation positioning | Vietnamese-first onboarding and claim discipline | Do not repeat OCR/AI/bank-sync claims without verified capability; dated pricing must be rechecked |
| Vietnamese bank apps | Users already see transaction lists and statements, but cross-bank understanding remains fragmented | Use familiar language where it improves comprehension | Do not imitate each bank's visual identity or imply bank access |
| MoMo and ZaloPay behavior | Vietnamese users manage money across bank, e-wallet and cash contexts | Multiple user-declared accounts and VND-first formatting | They are data contexts, not product templates |
| Excel and Google Sheets | Ownership, flexibility, export and manual reconciliation are real alternatives | CSV export, transparent data model and easy correction | Do not turn the app into a spreadsheet UI |
| Vietnamese owner self-use of MoneyFlow | Direct evidence of real daily problems and mobile defects | Highest-value local evidence | One owner is not market validation; do not generalize demand statistics |

**Gap:** Earlier conversations referred to Vietnamese and international competitor websites more broadly. The repository preserves the products above, but not every exact page, screenshot, date or review used in chat. Missing items must be re-added with URLs or files rather than reconstructed from memory.

## 6.2 International consumer finance products

| Product/source | Pattern worth studying | MoneyFlow-specific use | Pattern not to copy |
|---|---|---|---|
| YNAB (`ynab.com`, help/support and store reviews) | Imported-transaction approval, reconciliation, strong method onboarding | Review/import interaction and clear transaction status | Full zero-based/envelope method, high learning requirement, US-bank assumptions |
| Monarch Money (`monarchmoney.com`) | Searchable transaction history, multi-account overview, customizable dashboard | Information hierarchy and account overview | Net-worth-first density, couples/family scope, aggregator dependency |
| Copilot Money (`copilot.money`, help center) | Calm visual hierarchy and “To Review” pattern | Exception/review patterns for optional imports | iOS-only aesthetics, opaque AI categorization, platform lock-in |
| Wallet by BudgetBakers | Clear expense/income/transfer types and multi-currency concepts | Transfer distinction and account model language | Generic template look, premium-gated core behavior, unnecessary FX complexity |
| Spendee | Visual budget communication and shared-wallet concepts | Comparison source for budget comprehension | Chart-first home and shared-finance scope |
| Rocket Money | Actionable subscription/bill cards | Attention-item structure when backed by real data | Bill-negotiation marketing, upsell and automatic-detection claims |
| Goodbudget | Simpler envelope interaction | Reference for explaining remaining budget | Making envelopes the mandatory MoneyFlow mental model |
| Lunch Money | Power-user filtering, API and reporting | Transaction-table/search ideas | US-centric synchronization and power-user density by default |
| Toshl Finance | Flexible tags and multi-currency | Later comparison source | Adding tags/FX before core daily use is proven |
| Expensify | Capture → review → approve and bulk workflow | Import review, confidence and correction patterns | Corporate expense-report language, policy-heavy IA and OCR assumptions |
| Actual Budget | Register-first workflow, privacy, import/export and user-owned data | Strong primary reference for trustworthy ledger and portability | Whole local-first/sync architecture and envelope-only identity |
| Firefly III | Transfer semantics, rules, bills, goals and rich documentation | Domain vocabulary and correctness counterexample | Accounting-heavy UI, feature density and AGPL code copying |
| Google Sheets / Microsoft Excel / Notion templates | Real substitutes with low switching cost | Ownership and export expectations | Treating flexibility alone as good product UX |

## 6.3 Open-source product and UI repositories

The exhaustive finance repository catalogue lives in `docs/research/REPOSITORY_REFERENCE_MAP.md`. UI/UX-relevant sources already recorded include:

### Personal-finance products

- `actualbudget/actual`
- `firefly-iii/firefly-iii`
- `firefly-iii/data-importer`
- `mayswind/ezbookkeeping`
- `moneymanagerex/moneymanagerex`
- `we-promise/sure` and historical `maybe-finance/maybe`
- `Tanq16/ExpenseOwl`
- `RIP-Comm/sossoldi`
- `dreautall/waterfly-iii`
- `ananthakumaran/paisa`
- `beancount/fava`, `beancount/beancount`, `simonmichael/hledger`
- `teelur/budget-board`
- `DumbWareio/DumbBudget`
- `ellite/Wallos`

### UI, forms, tables and charts

- `shadcn-ui/ui`
- `mui/base-ui`
- `tremorlabs/tremor`
- `recharts/recharts`
- `TanStack/table`
- `airbnb/visx`
- `apache/echarts`
- `react-hook-form/react-hook-form`
- `edmundhung/conform`

### Mature product-UI organization references

- `calcom/cal.com`
- `dubinc/dub`
- `outline/outline`
- `immich-app/immich`

For every repository, retain the map's `Use for` and `Boundary` together. A repository name without its boundary is incomplete research.

## 6.4 Open-source license and maintenance lessons

- MIT/Apache/BSD may permit reuse with conditions; copying still requires license review and attribution.
- AGPL/GPL sources such as Firefly III, historical Maybe/Sure variants, Ivy, Ghostfolio, Paisa, Beancount and hledger are primarily architecture/domain/UX references unless a compliance plan explicitly permits code reuse.
- Archived status and stars are dated observations, not permanent facts.
- Popularity is not evidence of MoneyFlow product fit.

---

# 7. UX, accessibility and public-service standards

## 7.1 Primary standards with preserved exact sources

| Source | Preserved use |
|---|---|
| WCAG 2.1 Contrast Minimum — `https://www.w3.org/TR/WCAG21/#contrast-minimum` | Text/background contrast and standard relative-luminance calculation |
| WCAG 2.2 Target Size Minimum — `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html` | Standards floor for target size; MoneyFlow deliberately targets 44px for primary touch controls |
| WCAG 2.2 Focus Appearance — `https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html` | Visible keyboard-focus treatment |
| WCAG accessible name criteria used in prior audits: 4.1.2 Name/Role/Value, 2.4.4 Link Purpose, 2.5.3 Label in Name | Named controls, meaningful links and alignment between visible and accessible labels |
| `alphagov/govuk-design-system` | Evidence-led service patterns, accessible components and clear content | Learn clarity and validation; do not copy GOV.UK visual identity |
| `18F/methods` | User-research and service-design methods | Use for observation/interview planning, not as visual styling |

## 7.2 Supporting design-system and usability sources

| Source | Retained principle | Evidence caveat |
|---|---|---|
| Nielsen Norman Group / Nielsen heuristics | Recognition over recall, visibility, user control, consistency and error prevention | Exact numeric claims in old docs need original citations before reuse |
| Baymard Institute | Form clarity, error prevention, labels and checkout/form usability patterns | The repository does not preserve exact articles for several quoted percentages; treat those numbers as unverified |
| Apple Human Interface Guidelines and Apple design principles | Response, clear hierarchy, target sizing, craft at real sizes and reduced-motion care | Do not copy Apple aesthetics or turn an internal skill summary into a primary standard |
| Material Design 3 | Form/component states and accessible interaction comparison | Do not treat one component style as universally superior without task evidence |
| Shopify Polaris | Progressive disclosure, clear merchant-facing forms and content patterns | Product context differs from personal finance |
| IBM Carbon | Data-table and enterprise-state patterns | Avoid importing enterprise density wholesale |
| Atlassian Design System | Component/state and content comparison | Supporting reference only |
| GOV.UK content design | Plain language, task-first content and explicit validation | Exact articles/pattern pages should be added when used in a decision |

## 7.3 MoneyFlow accessibility conclusions supported across sources and audits

- Mobile usability and accessibility are release gates.
- Primary touch controls target at least 44px even though WCAG 2.2's minimum criterion may be smaller in some circumstances.
- Focus must be visible and must not rely on hover.
- Color alone cannot distinguish income, expense, transfer, warning or selection state.
- Money values must remain readable with long VND amounts and at 200% text.
- Modals/sheets must preserve access to primary actions with real mobile keyboards.
- Interactive controls need accurate accessible names matching visible labels.
- Reduced-motion preferences must remove non-essential animation without hiding content.
- Browser automation is necessary but does not replace physical-phone review.

---

# 8. AI design and UI-building tools

## 8.1 Figma Make / Figma AI

Preserved sources:

- `https://help.figma.com/hc/en-us/articles/31304485164695-Create-and-edit-a-functional-prototype-or-web-app`
- `https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI`
- `https://help.figma.com/hc/en-us/articles/40219873508247-Release-notes-roundup-May-2026`

Retained lesson: provide real product context, current code/design assets and constraints; iterate through conversation and direct editing. Do not assume the current visual style must remain permanent.

## 8.2 Google Stitch

Preserved sources:

- `https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/`
- `https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/`

Retained lesson: diverge before converging; generate materially different directions rather than color variants of one layout.

## 8.3 Relume

Preserved sources:

- `https://resources.relume.io/resources/docs/building-a-sitemap-with-ai`
- `https://resources.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder`
- `https://www.relume.io/resources/docs/concept-creation-using-the-relume-style-guide-builder`

Retained lesson: brief → sitemap → wireframe → style exploration → refinement. Structure and content precede polish.

## 8.4 v0

Preserved sources:

- `https://v0.dev/docs/introduction`
- `https://v0.dev/docs/design-systems`
- `https://v0.dev/docs/faqs`

Retained lesson: use screenshots, mockups, Figma, tokens and real components to test implementability. Existing tokens are implementation context, not a permanent creative ceiling.

## 8.5 Supporting UI implementation and audit tools

| Tool/source | Use | Boundary |
|---|---|---|
| shadcn/ui | Product-owned component composition and registry context | Do not inherit a generic default theme as MoneyFlow identity |
| Base UI | Accessible unstyled interaction primitives, especially complex controls | Migration is not required without a proven need |
| Tremor | Dashboard/chart hierarchy comparison | Charts remain secondary to user decisions; do not import chart-first screens |
| Playwright | Reproducible browser paths, screenshots, viewport/a11y evidence | Passing checks do not prove visual quality or physical-device usability |
| Internal `.claude/skills/apple-design/SKILL.md` | Interaction craft and response/materialization vocabulary | Secondary synthesized guidance, not an external primary source or fixed aesthetic |

---

# 9. Landing-page and motion references

These sources were used in a prior landing-motion slice and remain **secondary**, not binding:

- `https://designrevision.com/blog/fintech-saas-landing-pages`
- `https://www.ballistic.media/blog/fintech-website-designs`
- `https://dev.to/jackharner/how-does-apple-create-such-stunning-landing-pages-4ak4`
- `https://ankittrehan2000.medium.com/creating-scroll-animations-similar-to-apples-airpods-pro-page-bc5c1c0814df`

Useful lesson: landing pages need a clear value hierarchy and motion can explain entry or structure. Limitation: blogs and imitations do not establish MoneyFlow's product truth; marketing motion must not obscure required information, harm reduced-motion users or animate financial figures merely for spectacle.

---

# 10. Cross-source synthesis

## 10.1 Points of agreement worth retaining

1. **Trust comes before novelty.** Ownership, correction, export and honest data provenance recur across Actual, Firefly, spreadsheet behavior, accessibility standards and MoneyFlow real-use evidence.
2. **The normal entry path must be fast.** Money Lover, Ivy/ExpenseOwl, mobile OSS references and MoneyFlow's own daily-use goal all support reducing transaction-entry friction.
3. **Financial types must be explicit.** Income, expense and transfer cannot be visually or mathematically conflated.
4. **Hierarchy beats equal-weight dashboards.** Users need the main answer and action first, with details progressively available.
5. **Mobile and long data expose real design quality.** Physical keyboards, long VND values, 320–390px widths and 200% text reveal failures hidden by desktop mockups.
6. **Recovery is part of UX.** Edit, soft delete, undo, explicit error states and safe import preview matter more than decorative completeness.
7. **Accessibility is structural.** Contrast, focus, names, target size, reduced motion and non-color cues must be built into component behavior.
8. **Research must preserve limits.** A product or repository is useful only together with what does not apply to MoneyFlow.

## 10.2 MoneyFlow-specific conclusions currently supported

- MoneyFlow is a Vietnamese manual-first personal income/expense ledger.
- The most important loop is: record → know balances → understand the period → correct/reconcile → export.
- Integer VND and balanced transfers are product-visible truths, not implementation trivia.
- The UI must describe observed data, not invent recommendations from missing planning inputs.
- Optional import/paste/rules can reduce manual work but are not the product identity.
- Real MoneyFlow screenshots and behavior are stronger public proof than fabricated balances, testimonials or user counts.
- A visual direction should be selected after multiple independent explorations, not inherited from the last named concept.

## 10.3 Patterns that must not be copied by default

- Full YNAB/Actual envelope methodology.
- Bank aggregation as an assumed core capability.
- Net-worth-first or investment-first home screens.
- Accounting/admin density from Firefly III or enterprise dashboards.
- Competitor brand colors, icon packs, copy, assets or exact layouts.
- Fake social proof, savings claims, user counts or financial outcomes.
- AI advice, automated categorization certainty or OCR claims without a real approved feature.
- Chart-first pages that do not answer a user decision.
- Glassmorphism, gradients, editorial composition, green-first, cobalt-first or any other aesthetic merely because an earlier concept used it.
- A named design concept as permanent product law.

---

# 11. Conflicts and resolutions

| Conflict | Sources | Resolution |
|---|---|---|
| Inbox-first identity vs daily ledger identity | Historical Inbox research vs current product principles | Ledger identity wins. Retain import/review interaction research only for optional tools. |
| Safe-to-spend recommendation vs incomplete planning data | Older matrix/Phase 5/UX docs vs current product principles | Recommendation is withdrawn until a researched planning contract and reliable inputs exist. |
| Calm Ledger or Signal Ledger as controlling style | Older design docs vs owner decision and current AI workflow | No named concept is the default. Signal Ledger is explicitly rejected; Calm Ledger is historical implementation context only. |
| Reuse current tokens vs create new visual possibilities | v0/Figma implementation-context advice vs divergence requirement | Use current components to understand constraints; after owner selects a new direction, update the system deliberately rather than forcing old tokens onto it. |
| WCAG minimum target vs MoneyFlow 44px target | WCAG 2.2 and internal audits | WCAG is the compliance floor; 44px remains MoneyFlow's deliberate mobile policy for primary controls. |
| Dashboard richness vs low cognitive load | Monarch/Firefly/Tremor vs MoneyFlow core jobs | Show only information needed for the current decision; analytics remain available but do not dominate by default. |
| Pie-chart bans and other old absolute rules vs task-specific visualization | Older UX/design docs vs concept-neutral design process | Choose visualization by comparison task, accessibility and evidence. Old blanket visual rules are not binding unless reaffirmed in a current specification. |
| AI speed vs human judgment | Figma/Stitch/Relume/v0 vs owner governance | AI may generate and test options; owner visual review selects the direction and merge remains human-controlled. |

---

# 12. Current decisions and open questions

## 12.1 Binding now

- Research is cumulative and must be stored in GitHub.
- Signal Ledger is rejected and cannot be used as baseline or acceptance source.
- No named visual concept is active by default.
- Product truth, financial honesty, accessibility, mobile usability and verified behavior constrain every direction.
- Future design exploration must present multiple genuinely different options.
- Only the owner selects a current visual direction.

## 12.2 Candidate, not yet binding

- PR #208's simplified landing/authentication composition.
- Any palette, typography, card style, editorial rhythm or animation currently implemented on an unmerged design branch.

## 12.3 Still open

- The next full-product visual direction.
- Whether the current canonical brand palette should remain unchanged in a future redesign.
- Which authenticated surface should be redesigned first after research synthesis and owner review.
- Which competitor screenshots or locally saved visual references should be added as durable files.

---

# 13. Missing or weakly preserved evidence

The following must be treated honestly as gaps:

1. Exact links and capture dates for every Vietnamese/international competitor page viewed in earlier chats are not all preserved.
2. Visual reference images discussed or uploaded in earlier chats are not reliably stored in this repository.
3. Exact GOV.UK pattern/article pages beyond the design-system repository reference are not recorded.
4. Several Baymard and NN/g percentages/quotes in older docs lack original article links and must not be repeated as verified statistics.
5. App-store review samples, dates, regions and selection method are incompletely preserved.
6. Some 2026 prices, stars, activity and product capabilities are dated snapshots and require fresh verification before a new decision.
7. Earlier chat-only judgments that were never committed are not reconstructed here.

When any missing item becomes relevant, add the original URL/file, access date, exact observation, limitation and resulting MoneyFlow decision.

---

# 14. Update protocol

For every new UI/UX source:

1. Add the source and access date.
2. State what question it was used to answer.
3. Record what it establishes.
4. Record what does not apply to MoneyFlow.
5. Compare it with existing evidence.
6. Add any contradiction.
7. Update the current conclusion only when evidence or an owner decision warrants it.
8. Mark replaced decisions as superseded/rejected instead of deleting their history.
9. Link the work packet or PR where the source affected implementation.

For every design concept:

1. Mark it `candidate`, `selected`, `rejected` or `superseded`.
2. Keep its rationale and trade-offs.
3. Never promote it to permanent law merely because code exists.
4. When rejected, extract neutral research before archiving it.

---

# 15. Required reading for future UI/UX work

Read in this order:

1. `docs/product/PRINCIPLES.md`
2. `docs/design/DESIGN_DIRECTION_STATUS.md`
3. this ledger
4. `docs/AI_UIUX_WORKFLOW.md`
5. current product UI, browser evidence and relevant real-use defects
6. only the task-relevant sections of the repository reference maps
7. the active work packet

Do not begin from `SIGNAL_LEDGER_V3.md`, `CALM_LEDGER_V2.md`, `UX_RESEARCH_AND_REDESIGN.md` or any other named concept document.
