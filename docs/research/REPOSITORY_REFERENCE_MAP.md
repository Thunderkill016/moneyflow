# MoneyFlow repository reference map

**Status:** active research reference  
**Last reviewed:** 2026-08-01  
**Applies to:** feature discovery, architecture decisions, implementation planning and verification

## Purpose

This document maps useful open-source repositories to the specific parts of MoneyFlow they can inform. It is a research index, not a product roadmap, dependency manifest or permission to copy another product's scope.

MoneyFlow remains a Vietnamese personal income-and-expense web ledger. Its current source of truth is the repository's product, architecture and MVP documentation. External repositories may provide evidence, patterns, counterexamples or implementation techniques, but they do not override MoneyFlow's product boundaries, financial invariants, security model or delivery workflow.

## How to use this map

For each non-trivial feature or fix:

1. Start from the current MoneyFlow source of truth and inspect the existing implementation.
2. Select no more than **two to four** directly relevant repositories from this map.
3. Write the exact research question in the feature work packet.
4. Record what each source establishes and where it does not apply.
5. Prefer borrowing a principle, data invariant, interaction pattern or test strategy over copying code.
6. Re-evaluate the decision against MoneyFlow's modular-monolith architecture, integer-VND model, Supabase RLS boundary and current MVP scope.
7. Add a new repository here only when it provides evidence not already covered by an existing source.

Do not send an implementation agent to “study every repository”. Broad browsing without a decision question produces scope growth, cargo-cult architecture and unverifiable claims.

## Source labels

| Label | Meaning |
|---|---|
| **Primary reference** | Read deeply for the named domain before designing the feature. |
| **Secondary reference** | Useful comparison or counterexample; inspect selectively. |
| **Tool candidate** | May be evaluated as a dependency or CI tool after repository fit, license and bundle impact are checked. |
| **Deferred** | Relevant only after the current MVP and daily-ledger trust gates are complete. |
| **Avoid copying** | Scope, architecture or product assumptions do not fit MoneyFlow. |

## Evaluation rules

Before adopting code, a library or an architecture pattern, evaluate:

- **Product fit:** Does it improve recording, balances, monthly understanding, correction or export?
- **Architecture fit:** Does it belong in the existing Next.js/Supabase modular monolith?
- **Financial correctness:** Does it preserve integer VND, balanced transfers and deterministic totals?
- **Security:** Does it preserve server-derived identity, RLS and tenant isolation?
- **Operational cost:** Does it add another runtime, service, queue, database or provider?
- **Maintenance:** Is the source actively maintained and tested?
- **License:** Is code reuse legally compatible? Concepts may be studied; code must not be copied blindly from copyleft repositories.
- **Evidence:** Can the proposed benefit be verified with unit, database, browser or production evidence?

---

# 1. Product model and overall finance applications

| Repository | Use for | Boundary |
|---|---|---|
| [actualbudget/actual](https://github.com/actualbudget/actual) | Local-first concepts, budgeting, reconciliation, import UX, domain/UI separation | Do not copy its monorepo, desktop, mobile or sync architecture into the current MVP. |
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Ledger semantics, transfers, rules, recurring transactions, budgets and reports | Avoid its accounting-heavy density and full feature breadth. |
| [mayswind/ezbookkeeping](https://github.com/mayswind/ezbookkeeping) | Mobile-first bookkeeping UX, PWA, filtering, reports and import formats | AI receipt and broad import coverage are deferred. |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Reconciliation, scheduled transactions, migration and data portability | Desktop application architecture does not apply. |
| [we-promise/sure](https://github.com/we-promise/sure) | Modern financial dashboard, onboarding and visual hierarchy | Wealth management and account aggregation are outside MoneyFlow's identity. |
| [Tanq16/ExpenseOwl](https://github.com/Tanq16/ExpenseOwl) | Fast manual capture and minimal transaction entry | Its trust/auth assumptions do not fit hosted multi-user production. |
| [RIP-Comm/sossoldi](https://github.com/RIP-Comm/sossoldi) | Mobile expense-capture interaction patterns | Native/mobile architecture is reference only. |
| [ananthakumaran/paisa](https://github.com/ananthakumaran/paisa) | Financial reporting and chart semantics | Investment and plaintext-ledger assumptions are not product requirements. |
| [beancount/fava](https://github.com/beancount/fava) | Reports over double-entry data | Do not expose accounting terminology merely because the source does. |

**Default selection:** Actual and Firefly III for domain behavior; ExpenseOwl or ezBookkeeping for user interaction.

---

# 2. Authentication, session and tenant ownership

| Repository | Use for | Label |
|---|---|---|
| [supabase/supabase](https://github.com/supabase/supabase) | Auth, PostgreSQL, RLS, local development and provider behavior | Primary reference |
| [supabase/ssr](https://github.com/supabase/ssr) | Cookie-backed auth in Next.js server environments | Tool/current dependency reference |
| [supabase/supabase-js](https://github.com/supabase/supabase-js) | Client contracts and error handling | Current dependency reference |
| [theory/pgtap](https://github.com/theory/pgtap) | Database assertions for policies, constraints and RPCs | Tool/current testing model |
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries) | Authentication, session, password, recovery and account-deletion requirements | Primary security reference |
| [OWASP/ASVS](https://github.com/OWASP/ASVS) | Verification checklist for authentication and access control | Secondary verification reference |
| [mswjs/msw](https://github.com/mswjs/msw) | Controlled network failures and integration tests | Tool candidate |

MoneyFlow-specific rules:

- Server Actions derive the current user; client-supplied ownership claims are not trusted.
- Every user-owned authenticated table requires RLS and database verification.
- Demo mode is an explicit runtime adapter, never a fallback after an authenticated failure.
- Auth errors must avoid account enumeration.

---

# 3. Money representation and financial invariants

| Repository | Use for | Boundary |
|---|---|---|
| [dinerojs/dinero.js](https://github.com/dinerojs/dinero.js) | Money value objects, explicit currency and immutable operations | Study the API discipline; do not add it unless current integer helpers become insufficient. |
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | Property-based testing for balances, transfers, import round trips and undo | Strong tool candidate. |
| [beancount/beancount](https://github.com/beancount/beancount) | Posting and balance invariants | Accounting syntax is not a UI requirement. |
| [simonmichael/hledger](https://github.com/simonmichael/hledger) | Deterministic journal reports and balance behavior | Reference only. |
| [formancehq/ledger](https://github.com/formancehq/ledger) | Atomic postings and ledger invariants | Do not introduce a ledger service or microservice for the current scale. |
| [flash-oss/medici](https://github.com/flash-oss/medici) | Balanced journal enforcement | Reference the invariant, not its MongoDB architecture. |
| [MikeMcl/decimal.js](https://github.com/MikeMcl/decimal.js) | Exact decimal arithmetic for future rates or non-integer currencies | Deferred while MoneyFlow is VND-only. |

Required properties to test:

- VND remains integer đồng.
- A transfer changes account balances but not total assets, income or expense.
- A soft delete followed by restore returns the financial state to its prior value.
- Export/import round trips preserve amount, type and transfer relationships.
- Changing transaction order does not change commutative period totals.

---

# 4. Accounts, balances, transfers and reconciliation

| Repository | Use for |
|---|---|
| [actualbudget/actual](https://github.com/actualbudget/actual) | Cleared/pending states and reconciliation interaction |
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Account types, transfer pairs and reporting exclusions |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Statement reconciliation and balance correction |
| [beancount/beancount](https://github.com/beancount/beancount) | Balance assertions and immutable financial history concepts |
| [formancehq/ledger](https://github.com/formancehq/ledger) | Atomic source/destination postings |

Use these sources when researching:

- pending versus confirmed transactions;
- statement balance reconciliation;
- transfer creation, editing, deletion and restore;
- source/provenance metadata;
- audit history.

Do not introduce full event sourcing solely to provide undo or history. PostgreSQL constraints, recoverable deletion and focused history tables remain the preferred current fit.

---

# 5. Fast transaction capture, forms and validation

| Repository | Use for | Label |
|---|---|---|
| [Tanq16/ExpenseOwl](https://github.com/Tanq16/ExpenseOwl) | Minimal required fields and rapid entry | Primary UX reference |
| [RIP-Comm/sossoldi](https://github.com/RIP-Comm/sossoldi) | Mobile amount/category entry | Secondary UX reference |
| [dreautall/waterfly-iii](https://github.com/dreautall/waterfly-iii) | Mobile client interaction over a finance backend | Secondary UX reference |
| [colinhacks/zod](https://github.com/colinhacks/zod) | Shared validation contracts | Current dependency |
| [react-hook-form/react-hook-form](https://github.com/react-hook-form/react-hook-form) | Complex form state and performance | Tool candidate only when current forms justify it |
| [edmundhung/conform](https://github.com/edmundhung/conform) | Progressive-enhancement and server-validated form patterns | Secondary implementation reference |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Field composition, dialogs and drawers | Current design reference |
| [mui/base-ui](https://github.com/mui/base-ui) | Accessible unstyled interaction primitives | Current primitive reference |

Capture defaults should continue to optimize for amount, account, category and date. Notes, tags, attachments and advanced metadata must not slow the normal path without observed user evidence.

---

# 6. Import, paste, upload and duplicate detection

| Repository | Use for | Label |
|---|---|---|
| [firefly-iii/data-importer](https://github.com/firefly-iii/data-importer) | Mapping, validation, configuration and import separation | Primary reference |
| [actualbudget/actual](https://github.com/actualbudget/actual) | Import review and migration UX | Primary product reference |
| [teelur/budget-board](https://github.com/teelur/budget-board) | Import → categorize → review workflow | Secondary reference |
| [mholt/PapaParse](https://github.com/mholt/PapaParse) | CSV parsing, delimiter detection and large-file handling | Tool candidate |
| [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs) | Spreadsheet parsing | Current dependency/source reference |
| [adaltas/node-csv](https://github.com/adaltas/node-csv) | Server-side CSV parse/transform/stringify | Secondary tool candidate |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Migration formats and reconciliation after import | Secondary reference |
| [mayswind/ezbookkeeping](https://github.com/mayswind/ezbookkeeping) | Financial file format coverage | Deferred breadth reference |

Required pipeline:

```text
input → parse → detect/map → normalize → validate → duplicate detection
      → preview → atomic commit → receipt/provenance → rollback path
```

A parser must not write directly into the ledger. Import rows require staging, per-row warnings and an explicit commit decision.

---

# 7. Export and user-owned data

| Repository | Use for |
|---|---|
| [actualbudget/actual](https://github.com/actualbudget/actual) | Export and migration expectations |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Backup and portable financial records |
| [mholt/PapaParse](https://github.com/mholt/PapaParse) | CSV serialization |
| [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs) | Spreadsheet interoperability |
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries) | Output encoding and untrusted content handling |

MoneyFlow exports must preserve Vietnamese text, integer VND, explicit transaction type, transfer relationships and provenance. Spreadsheet formula injection must remain blocked for values beginning with formula-control characters.

---

# 8. Category budgets

| Repository | Use for | Boundary |
|---|---|---|
| [actualbudget/actual](https://github.com/actualbudget/actual) | Envelope and rollover concepts | Full envelope budgeting is outside the current MVP. |
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Limits, spent and period reporting | Avoid accounting-heavy presentation. |
| [teelur/budget-board](https://github.com/teelur/budget-board) | Monthly category budget UX | Secondary reference. |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Period budgeting | Secondary reference. |
| [DumbWareio/DumbBudget](https://github.com/DumbWareio/DumbBudget) | Minimal budget interaction | Visual/product comparison only. |

Current model should stay explicit: category, period, limit, spent and remaining. Missing planning data is unknown; MoneyFlow must not infer a safe-to-spend amount from total assets.

---

# 9. Recurring commitments and income

| Repository | Use for | Label |
|---|---|---|
| [ellite/Wallos](https://github.com/ellite/Wallos) | Due dates, overdue state and payment lifecycle | Primary UX/domain reference |
| [actualbudget/actual](https://github.com/actualbudget/actual) | Scheduled transactions and matching | Primary reference |
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Recurring transaction generation | Secondary reference |
| [moneymanagerex/moneymanagerex](https://github.com/moneymanagerex/moneymanagerex) | Scheduled transaction behavior | Secondary reference |
| [jkbrzt/rrule](https://github.com/jkbrzt/rrule) | Recurrence rule calculation | Tool candidate when simple schedules no longer suffice |
| [date-fns/date-fns](https://github.com/date-fns/date-fns) | Date and period arithmetic | Tool candidate/reference |

Preferred model separates template, occurrence and actual transaction. Generation must be idempotent, bounded by a time window and recoverable.

---

# 10. Savings goals and planning allocations

| Repository | Use for |
|---|---|
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | Piggy-bank and contribution concepts |
| [teelur/budget-board](https://github.com/teelur/budget-board) | Goal presentation alongside monthly planning |
| [actualbudget/actual](https://github.com/actualbudget/actual) | Allocation semantics |
| [we-promise/sure](https://github.com/we-promise/sure) | Modern goal and net-worth presentation |

Goal allocation is planning metadata unless an actual transfer occurs. The UI and calculations must distinguish account balance, target, allocated amount and real transaction history.

---

# 11. Dashboard, reports, charts and transaction tables

| Repository | Use for | Label |
|---|---|---|
| [mayswind/ezbookkeeping](https://github.com/mayswind/ezbookkeeping) | Filters, dimensions and responsive reports | Primary UX reference |
| [beancount/fava](https://github.com/beancount/fava) | Finance report semantics | Primary domain reference |
| [ananthakumaran/paisa](https://github.com/ananthakumaran/paisa) | Trends and reporting views | Secondary reference |
| [recharts/recharts](https://github.com/recharts/recharts) | Declarative React charts | Tool candidate |
| [TanStack/table](https://github.com/TanStack/table) | Sorting, filtering and large transaction tables | Tool candidate when current table behavior justifies it |
| [airbnb/visx](https://github.com/airbnb/visx) | Highly custom visualizations | Deferred |
| [apache/echarts](https://github.com/apache/echarts) | Broad chart capability | Avoid for MVP unless a proven requirement exceeds smaller tools |

The dashboard should answer balances, income, expense, net, top spending, recent activity and upcoming obligations. More charts are not automatically more insight.

---

# 12. UI system and accessibility

| Repository | Use for | Label |
|---|---|---|
| [mui/base-ui](https://github.com/mui/base-ui) | Accessible primitives and interaction behavior | Current primitive reference |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Code-owned components and composition patterns | Current design reference |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | Accessible primitives where already used | Selective current reference |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) | Icon system | Current dependency reference |
| [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | Utility and token implementation | Current dependency reference |
| [w3c/aria-practices](https://github.com/w3c/aria-practices) | Keyboard and ARIA behavior | Primary accessibility reference |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | Automated accessibility checks | Tool candidate |
| [storybookjs/storybook](https://github.com/storybookjs/storybook) | Component states and visual documentation | Deferred until component reuse warrants the operating cost |
| [calcom/cal.com](https://github.com/calcom/cal.com) | Complex responsive forms and dashboard patterns | Secondary implementation reference |
| [dubinc/dub](https://github.com/dubinc/dub) | Polished Next.js dashboard patterns | Secondary implementation reference |

Base UI remains the default primitive owner. Do not perform a broad primitive migration without a proven accessibility, maintenance or interaction defect.

---

# 13. PWA, offline and local data

| Repository | Use for | Label |
|---|---|---|
| [serwist/serwist](https://github.com/serwist/serwist) | Service worker and Next.js PWA patterns | Tool candidate after core trust gates |
| [jakearchibald/idb](https://github.com/jakearchibald/idb) | Small IndexedDB wrapper | Tool candidate for bounded local drafts |
| [dexie/Dexie.js](https://github.com/dexie/Dexie.js) | Rich browser-local data | Deferred |
| [electric-sql/pglite](https://github.com/electric-sql/pglite) | Local PostgreSQL in browser | Deferred research only |
| [powersync-ja/powersync-js](https://github.com/powersync-ja/powersync-js) | Offline synchronization | Deferred research only |
| [actualbudget/actual](https://github.com/actualbudget/actual) | Local-first architecture and conflict implications | Primary conceptual reference |

Near-term PWA work may cover installability, static-shell caching and recoverable local drafts. Background replay of financial mutations is prohibited until idempotency and conflict behavior are specified and tested.

---

# 14. Testing and verification

| Repository | Use for | Label |
|---|---|---|
| [microsoft/playwright](https://github.com/microsoft/playwright) | Browser flows, responsive testing, traces and evidence | Current primary browser tool |
| [testing-library/react-testing-library](https://github.com/testing-library/react-testing-library) | User-centered component tests | Tool candidate where component isolation adds value |
| [mswjs/msw](https://github.com/mswjs/msw) | Network failure and integration testing | Tool candidate |
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | Financial property tests | Strong tool candidate |
| [theory/pgtap](https://github.com/theory/pgtap) | Database and RLS invariants | Current database test model |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | Accessibility checks | Tool candidate |
| [stryker-mutator/stryker-js](https://github.com/stryker-mutator/stryker-js) | Mutation testing for pure financial rules | Deferred targeted tool |
| [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | Performance regression evidence | Tool candidate for documented budgets |

Verification layers remain distinct:

```text
static contracts → unit/domain → database/RLS → browser flow
                 → responsive/accessibility → exact production deployment
```

A green lower layer cannot be used as proof for a higher layer.

---

# 15. Security and software supply chain

| Repository | Use for | Label |
|---|---|---|
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries) | Application security requirements | Primary reference |
| [OWASP/ASVS](https://github.com/OWASP/ASVS) | Verification structure | Primary checklist reference |
| [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Secret scanning | Tool candidate |
| [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) | Verified secret discovery | Secondary tool candidate |
| [semgrep/semgrep](https://github.com/semgrep/semgrep) | Static security analysis | Tool candidate |
| [github/codeql-action](https://github.com/github/codeql-action) | GitHub code scanning | Tool candidate |
| [actions/dependency-review-action](https://github.com/actions/dependency-review-action) | Dependency changes in pull requests | Tool candidate |
| [step-security/harden-runner](https://github.com/step-security/harden-runner) | GitHub Actions hardening | Tool candidate |
| [ossf/scorecard](https://github.com/ossf/scorecard) | Supply-chain posture | Secondary reference |
| [zaproxy/zaproxy](https://github.com/zaproxy/zaproxy) | Dynamic application security testing | Deferred targeted verification |
| [upstash/ratelimit-js](https://github.com/upstash/ratelimit-js) | Rate-limit implementation patterns | Use only if provider-level controls are insufficient |
| [arcjet/arcjet-js](https://github.com/arcjet/arcjet-js) | Bot and request protection patterns | Secondary/deferred |

RLS, ownership-safe RPCs and cross-tenant attack tests are more important than adding a long list of scanners. Security tools must close a documented gap rather than create a badge-only pipeline.

---

# 16. Observability and performance

| Repository | Use for | Label |
|---|---|---|
| [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript) | Client/server error tracking | Tool candidate |
| [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js) | Vendor-neutral tracing | Deferred |
| [PostHog/posthog-js](https://github.com/PostHog/posthog-js) | Product analytics | Use only with strict event minimization and no financial payloads |
| [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | Repeatable performance budgets | Tool candidate |
| [vercel/next.js](https://github.com/vercel/next.js) | Framework instrumentation and performance behavior | Primary framework reference |

Do not send transaction amount, note, imported file content, access token or full user identity into analytics or logs. Prefer operation name, anonymous identifiers, error code, duration and deployment version.

---

# 17. Next.js architecture, repository workflow and agent guidance

| Repository | Use for | Boundary |
|---|---|---|
| [vercel/next.js](https://github.com/vercel/next.js) | App Router, Server Actions and framework behavior | Official framework source. |
| [dubinc/dub](https://github.com/dubinc/dub) | Production Next.js organization and workflows | Do not copy monorepo complexity without independent boundaries. |
| [calcom/cal.com](https://github.com/calcom/cal.com) | Large workflow and domain organization | Secondary reference only. |
| [github/spec-kit](https://github.com/github/spec-kit) | Spec-driven implementation | Compare with MoneyFlow's existing work-packet process. |
| [joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | ADR formats | Use only for cross-cutting decisions. |
| [openai/codex](https://github.com/openai/codex) | Agentic engineering patterns | Research only; does not override repository instructions. |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | Repository instructions for agents | Secondary reference. |

MoneyFlow remains a single-deployment modular monolith. Another repository having packages, services, queues or microservices is not evidence that MoneyFlow needs them.

---

# Current research priority

Until the seven-day self-use and MVP readiness gates are complete, use this order:

1. **Actual Budget:** reconciliation, pending/cleared behavior and import review.
2. **Firefly III:** transfer and ledger invariants.
3. **Firefly III Data Importer:** staging, mapping and import provenance.
4. **ezBookkeeping:** mobile filtering and report interaction.
5. **Money Manager Ex:** reconciliation and portability.
6. **fast-check:** generated counterexamples for financial logic.
7. **pgTAP:** RLS, constraints and RPC evidence.
8. **Playwright:** real user paths and responsive proof.
9. **OWASP:** auth, import/export and session requirements.
10. **Base UI/shadcn:** interaction implementation after behavior is specified.

## Deferred until the product earns expansion

The following areas must not be pulled into a feature merely because a repository demonstrates them:

- bank aggregation or open-banking sync;
- OCR receipt extraction;
- voice capture;
- AI categorization or financial advice;
- investment and crypto tracking;
- shared family or household ledgers;
- full offline synchronization;
- event-sourced or external ledger services;
- full envelope/zero-based budgeting.

A change to these boundaries requires a product decision and an update to the authoritative MVP/product documents before implementation begins.

## Work-packet research template

Use this concise structure inside a feature packet:

```markdown
### Research question

What exact behavior or decision is unresolved?

### Selected references

| Repository | Evidence used | What does not apply |
|---|---|---|
| | | |

### Decision

State the MoneyFlow-specific choice, rejected alternatives and verification plan.
```

## Maintenance

Review this map when:

- a new product area is approved;
- a selected repository becomes archived or materially changes direction;
- a dependency is being proposed;
- a feature packet finds a stronger primary source;
- MoneyFlow changes an authoritative product or architecture boundary.

Do not refresh repository popularity metrics for their own sake. This map is useful only while it improves concrete MoneyFlow decisions.
