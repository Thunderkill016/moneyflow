# MoneyFlow — solo-product competitive strategy

- **Status:** research + strategy memo; informs owner decisions, authorizes nothing
- **Date:** 2026-09-21
- **Baseline:** `main@214aa8d4` (post capability layer, post #631/#633)
- **Method:** repo-verified inventory + refreshed competitor evidence (official surfaces + 2026 reviews) + free-stack mapping. Labels follow `PRODUCT_COMPETITIVE_MEMORY.md` §2.2.
- **Question:** where does MoneyFlow stand against top products, and how can a solo free product reach parity — or win — without venture funding?

## 1. Verified MoneyFlow state (repo truth, not aspiration)

Product surface on `main` today:

- Manual ledger: multi-account (cash/bank/e-wallet/credit/savings), income/expense/structural transfers, integer VND, edit + soft-delete + recovery, search/filter.
- Planning: category budgets, recurring commitments + income templates, savings goals with reserve.
- Understanding: weekly/monthly/yearly reports, Activity workstream with deep-links to exact transaction/candidate.
- Acquisition: controlled CSV/XLSX/PDF import → Import Preview → Inbox candidates → provenance → atomic approval; direct-CSV mapping presets; local parse rules persisted as `inbox_rules`.
- Trust: RLS tenant isolation, reconciliation paths, versioned full archive/restore, scoped CSV export, account deletion.
- **Agent layer (the differentiator):** 8 typed viewer-scoped capabilities (`accounts.list`, `budgets.status`, `goals.status`, `activity.candidates`, `ledger.summary`, `reports.financial`, `transactions.search`, `candidates.propose`) exposed over REST + MCP with OAuth 2.1 consent, connected-apps management UI, per-execution invocation audit log, write path that lands in reviewable Inbox — never directly in the ledger.
- Ops: explicit demo/authenticated modes, PWA manifest, light/dark, responsive.

## 2. Competitive landscape — refreshed 2026-09

| Product | Price | Platform | Defining strength | MoneyFlow-relevant weakness |
|---|---|---|---|---|
| YNAB | $109/yr, no free tier | iOS/Android/Web | Zero-based method, reconciliation, 6-person sharing | US-centric; Plaid has no VN coverage; English |
| Monarch | $99.99/yr Core | iOS/Android/Web | Household sharing, aggregation (13k+ US institutions) | US institutions only; paid; English |
| Copilot | $95/yr | Apple-only | AI categorization, review UX | Apple-only; US; no sharing; no API |
| Quicken Simplifi | ~$5.99/mo | Cross | Cheap full tracker | US bank sync; English |
| Rocket Money | free + $7–14/mo | Cross | Subscription detection, action cards | US-only value (bill negotiation); free tier thin |
| Money Lover | free / Premium ~199k₫/yr | iOS/Android (+companion SMS app) | VN baseline: wallets, budgets, debt, bank linking (MB/TPBank…), SMS-banking detector | Free tier limited (1 wallet); sync delay 1–2 days; ads/paywall pressure; no API |
| MISA MoneyKeeper | mostly free | iOS/Android | Simple fast entry, AI entry, debt, sharing, Excel/PDF export | Weaker multi-account depth; no API; vendor roadmap risk |
| MoMo (Quản lý chi tiêu) | free | inside MoMo | Auto-categorization of MoMo payments, AI chat, bill pay | Only sees MoMo-ecosystem money; not a ledger you own; no export path |
| Actual Budget | OSS/free | Web (local-first) | Envelope budgeting, offline sync, self-host | EU/US bank sync only; English; self-host burden |
| Firefly III | OSS/free | Self-host | Double-entry, powerful rules engine, REST API | Accounting complexity; dated UI; self-host burden |
| Sheets/Excel | free | any | Total ownership + flexibility | All manual; no guardrails; no mobile capture UX |

**Market facts that matter:** top global apps are US-bank-sync-dependent and English-first — structurally closed to Vietnam. VN incumbents win on distribution and free-ness, but their data models are weaker (wallets without ledger rigor) and **none expose a user-consented API or agent surface**. Open-banking API access in VN (Circular 64/2024) requires bank contracts — not a free path for a solo product.

## 3. Gap analysis — honest version

### Where MoneyFlow already matches or exceeds the field

- **Ledger correctness/trust:** integer minor units, structural transfers, provenance, soft-delete, archive/restore, RLS — at or above YNAB/Actual rigor; clearly above VN incumbents' wallet model.
- **Agent-readiness:** **MoneyFlow is ahead of every consumer product on this list.** No consumer PFM — YNAB/Monarch/Copilot included — ships a typed, OAuth-consented MCP+REST capability layer where agent writes enter a human-reviewed Inbox with provenance. The hobbyist finance-MCP ecosystem (myfinance-mcp, Plaid read-only servers, Notion-backed agents) proves demand but none carry consumer-grade consent/audit/user-ownership semantics.
- **Price:** free vs $95–109/yr (global) and vs feature-limited free tiers (local).
- **Data ownership:** full versioned archive/restore + scoped export — stronger than every commercial product; matches self-host OSS spirit without self-host burden.

### Where MoneyFlow trails (real gaps)

Gaps split two ways under the owner's "upgrade existing, no new feature areas" direction: **upgrade-in-place** (the machinery exists, deepen it) vs **deferred new areas** (real gaps, but new feature surfaces — parked until evidence demands).

| Gap | Who has it | Type | Free path available? |
|---|---|---|---|
| Capture speed proof | all top apps optimize this | **upgrade Ghi** | Capture V2 hypotheses already specced (Frequent Patterns, dictation, share target as modes of one Ghi) — needs benchmark |
| Real bank-export tolerance | import exists; #576 found preamble-row limits | **upgrade import** | bounded parser work on existing pipeline |
| Rules/automation visibility | Firefly (strong), MISA AI | **upgrade Inbox** | `inbox_rules` persistence exists; management UI is the missing half |
| Reconciliation depth | YNAB, Actual | **upgrade** | domain + paths exist; workflow UX is the work |
| Reports depth | Monarch, Firefly | **upgrade** | deterministic modules exist; drill-down/ranges/trends are presentation work |
| Native app feel | all incumbents | **upgrade PWA** | manifest exists; install prompt + offline shell are free work |
| Bank/payment auto-acquisition | MoMo, Money Lover, SePay bots | **deferred new area** | statement import covers part today; email/webhook/SMS adapters are new sources — revisit after closed-beta evidence |
| Debt/loan tracking | Money Lover, MISA | **deferred new area** | daily VN reality but a new surface — parked |
| Household sharing | Monarch, MISA | **deferred new area** | real work; defer until retention proves |
| Multi-currency | Firefly, Money Lover | **deferred new area** | poor complexity/value for VND-first |

### What MoneyFlow should NOT chase

- Real-time bank sync via VN Open API (contracts, not free; revisit only with user evidence per #432).
- AI-generated financial advice/answers (product law: deterministic truth, provenance; AI enters via the reviewed candidate path only).
- Investment/net-worth breadth (Monarch territory; off-mission for the VN daily-ledger job).
- Feature-count parity with incumbents (retention beats breadth).

## 4. Strategic thesis

> **Win on depth, not breadth: take each surface MoneyFlow already ships to top-product quality, and keep the agent-ready moat sharpening — instead of adding new feature categories to chase funded incumbents.**

Owner direction 2026-09-21: **upgrade what exists; no new feature areas now.** This matches issue #172's finding (technical foundation stronger than daily-use evidence) and the competitive memory's "competitive depth" frame — MoneyFlow's gap vs top products is not missing categories, it is unproven/unpolished depth inside the ones it has.

Three compounding lanes, all inside existing surfaces:

1. **Trust depth** — MoneyFlow's ledger rigor is already top-tier. Close the remaining trust loops *inside existing features*: reconciliation UX polish, Inbox review speed, rule management on the existing `inbox_rules` persistence.
2. **Acquisition depth** — make the *existing* capture/import path excellent before any new source: Ghi flow per Capture V2 hypotheses (Frequent Patterns, dictation, paste — modes of the same Ghi, not new features), real bank-export tolerance on the existing import pipeline (#576 preamble finding), share-target/keyboard polish.
3. **Agent surface as the moat** — the capability layer is genuinely ahead: consented, typed, audited, provenance-preserving. Incumbents cannot retrofit consent+provenance cheaply. Expand by product pull only (A3 rule); possible upgrades: MCP Apps panels, `capability_invocations` table when a real client exists.

## 5. Free-stack leverage map

| Need | Free resource | Cost at scale |
|---|---|---|
| Hosting/CI/analytics | Vercel hobby + GitHub Actions (public repo) + Vercel Analytics/Speed Insights | $0 until real traffic |
| DB/Auth | Supabase free (500 MB, auth, RLS) | $0; Pro $25/mo only if needed |
| Anti-bot | Cloudflare Turnstile | free |
| Parsing | SheetJS CE (already vendored), generic matrix parser | $0 |
| Agent transport | MCP SDK (open), existing OAuth 2.1 consent | $0 |
| VN bank events (deferred area) | SePay webhook free tier (50 tx/mo), bank email→Gmail Apps Script→import | $0 — noted for the deferred-acquisition revisit |
| Capture | Web Share Target API, keyboard dictation, paste | $0 |
| Mobile | PWA manifest (exists) + install prompt | $0 |
| Design | existing design system; skills (`frontend-design`, `apple-design`) | $0 |

Nothing on the roadmap requires paid infrastructure at closed-beta scale.

## 6. Proposed sequencing — upgrade existing surfaces only

Every item below deepens a surface that already ships. Nothing adds a new feature category. Each still needs its own packet/authorization per `AGENTS.md`.

| Order | Item | Upgrades what exists | Why now | Status |
|---|---|---|---|---|
| 1 | Closed-beta minimum (owner action pack) | release readiness | unblocks real-user evidence for everything below | owner ~40 min |
| 2 | Capture V2 benchmark harness — TTLT measurement for H1–H5 | **Ghi / capture flow** | the merged spec is a hypothesis set; the harness turns "is Ghi good enough" into measurement before any UI change | agent-doable spec/tooling |
| 3 | #576 pilot evaluation protocol | **existing import pipeline** | defines measurement (rows parsed, mapping accuracy, TTLT vs manual) so a real export file becomes turnkey; preamble-row finding already identified | agent-doable; needs owner's real file to run |
| 4 | Rules-management UI on existing `inbox_rules` | **Inbox + import rules** | persistence already merged; the missing half is surfacing manage/edit — pure upgrade of existing machinery | bounded Class 2 |
| 5 | Reconciliation workflow polish | **existing reconciliation paths** | the largest trust-depth gap named by the competitive audit; domain layer exists, UX depth is the work | bounded Class 2 |
| 6 | Reports depth — drill-down, custom ranges, category trends | **existing weekly/monthly/yearly reports** | "tiền đi đâu" is the core user question; deterministic domain modules already compute the numbers — the work is presentation depth | bounded Class 2 |
| 7 | PWA install + offline polish | **existing manifest + responsive UI** | free mobile-presence win on what already ships | bounded Class 2 |
| 8 | Capture V2 implementation slice (whichever hypothesis the benchmark supports) | **Ghi flow** | only after item 2 produces evidence | gated by benchmark |
| 9 | Capability expansion / MCP Apps | **existing capability layer** | only by demonstrated product pull (A3 rule) | opportunistic |

**Deliberately deferred — new feature areas, not upgrades** (revisit only if closed-beta evidence demands): debt/loan tracking, household sharing, multi-currency, email/webhook acquisition adapters, investment/net-worth breadth, bank sync contracts, AI advice.

## 7. Metrics that would prove the thesis

- **TTLT** (time to trusted ledger transaction) — the Capture V2 metric; measures acquisition progress honestly.
- **7-day return rate** of closed-beta users; capture→post median time.
- **% of transactions arriving via non-manual sources** — the acquisition flywheel measure.
- **Correction rate** on suggested defaults — guards the trust boundary while automating.
- Agent-layer adoption only if a real external client exists; vanity otherwise.

## 8. Sources

- Repo truth: `main@214aa8d4` (capabilities, routes, package.json, P1_GATE_PREPARATION data inventory).
- Pricing/features: walletgrower.com, northvilleletech.com, finflowguide.com, wallethub.com comparisons (2026); thaptaisan.com + techzika.com VN app reviews (2026); Play Store listing Money Lover; momo.vn product pages.
- OSS: selfhostindex.com, selfhosting.sh Actual/Firefly comparisons (2026).
- VN acquisition precedent: `my-money-went-bot` (SePay webhook + bank-email→Apps Script→user-owned Sheet pattern — proves the free path works).
- Agent surface: MCP finance-server ecosystem survey (hobby-grade; none with consent/provenance/audit semantics).
- Prior internal research: `PRODUCT_COMPETITIVE_MEMORY.md`, `VIETNAM_LONG_TERM_PRODUCT_STRATEGY_2026.md`, Capture V2 spec.

**Limits:** competitor pricing/features are dated web evidence — recheck before decisions. No claim about VN bank API availability beyond Circular 64's contract requirement. This memo authorizes no implementation; items 4–7 in §6 each need their own packet per `AGENTS.md`.
