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

| Gap | Who has it | Why it matters in VN | Free path available? |
|---|---|---|---|
| Bank/payment auto-acquisition | MoMo (own ecosystem), Money Lover (limited banks), SePay-powered bots | ~90M VietQR mobile accounts; retyping digital txns fights the market | **Yes** — statement import (done), bank notification email→import, SePay webhook free tier (50 tx/mo), Web Share Target, notification/SMS via companion later |
| Debt/loan tracking | Money Lover, MISA | "Cho vay/đi vay/trả góp" is a daily VN money reality | Schema + UI work only — no external dependency |
| Household sharing | Monarch, MISA, Money Lover | Family money management is common | RLS-scoped shared views — real work, defer until retention proves |
| Capture speed proof | all top apps optimize this | Daily habit is the retention engine | Capture V2 hypotheses (Frequent Patterns, dictation, share target) already specced — needs benchmark |
| Native app feel | all incumbents | VN is mobile-first | PWA is already manifest-equipped; install prompt + offline shell are free work |
| Rules/automation on import | Firefly (strong), MISA AI | Reduces maintenance | `inbox_rules` persistence exists; surfacing rule management UI is bounded work |
| Reports depth | Monarch, Firefly | "Tiền đi đâu" is the core question | Deterministic domain modules exist; depth is UI work |
| Multi-currency | Firefly, Money Lover | Secondary for VND-first users | Defer — complexity vs value is poor |

### What MoneyFlow should NOT chase

- Real-time bank sync via VN Open API (contracts, not free; revisit only with user evidence per #432).
- AI-generated financial advice/answers (product law: deterministic truth, provenance; AI enters via the reviewed candidate path only).
- Investment/net-worth breadth (Monarch territory; off-mission for the VN daily-ledger job).
- Feature-count parity with incumbents (retention beats breadth).

## 4. Strategic thesis

> **Win the "trusted ledger + agent-ready" niche that every incumbent has ignored, using free acquisition paths unique to Vietnam — instead of fighting feature-breadth wars against funded US products or free local giants.**

Three compounding lanes:

1. **Trust depth** — MoneyFlow's ledger rigor is already top-tier. Close the remaining trust loops (reconciliation UX polish, review workflows) rather than adding breadth.
2. **Free VN acquisition** — the megaplan's Track D. The free paths nobody has fully exploited: statement import (done), bank-notification email→candidate adapter (the proven Telegram-bot pattern — Gmail filter + Apps Script costs nothing), SePay webhook free tier, Web Share Target, and later notification/SMS capture. Each lands as a *candidate with provenance* — the architecture already supports them all through one pipeline.
3. **Agent surface as the moat** — the capability layer is genuinely ahead: consented, typed, audited, provenance-preserving. This is a lane where a solo product can be *best-in-world*, not just parity, because incumbents cannot retrofit consent+provenance semantics cheaply. Cheap expansions by product pull only (A3 pattern); possible wins: MCP Apps interactive panels, more capabilities as surfaces need them, `capability_invocations` table when a real client exists.

## 5. Free-stack leverage map

| Need | Free resource | Cost at scale |
|---|---|---|
| Hosting/CI/analytics | Vercel hobby + GitHub Actions (public repo) + Vercel Analytics/Speed Insights | $0 until real traffic |
| DB/Auth | Supabase free (500 MB, auth, RLS) | $0; Pro $25/mo only if needed |
| Anti-bot | Cloudflare Turnstile | free |
| Parsing | SheetJS CE (already vendored), generic matrix parser | $0 |
| Agent transport | MCP SDK (open), existing OAuth 2.1 consent | $0 |
| VN bank events | SePay webhook free tier (50 tx/mo), bank email→Gmail Apps Script→import | $0 |
| Capture | Web Share Target API, keyboard dictation, paste | $0 |
| Mobile | PWA manifest (exists) + install prompt | $0 |
| Design | existing design system; skills (`frontend-design`, `apple-design`) | $0 |

Nothing on the roadmap requires paid infrastructure at closed-beta scale.

## 6. Proposed sequencing (informs megaplan; each step still needs its own packet/authorization)

| Order | Item | Lane | Why now | Status |
|---|---|---|---|---|
| 1 | Closed-beta minimum (owner action pack) | trust | unblocks real-user evidence | owner ~40 min |
| 2 | Capture V2 benchmark harness (TTLT measurement for H1–H5) | acquisition | the merged spec needs evidence before implementation; harness design is docs+tooling, not product change | agent-doable spec |
| 3 | #576 pilot evaluation protocol | acquisition | define measurement (rows parsed, correct mapping, TTLT vs manual) so a real export file becomes turnkey | agent-doable; still needs owner's real file for the run |
| 4 | Debt tracking bounded spec | parity | the largest VN-baseline feature gap; pure schema+UI, no external dependency | needs owner authorization (new financial surface) |
| 5 | Email/webhook acquisition adapter spec | acquisition | free path to auto-acquisition without bank contracts; lands as candidates w/ provenance | needs Class 3 spec + owner auth |
| 6 | PWA install + offline polish | parity | free mobile-presence win | bounded Class 2 |
| 7 | Rules-management UI on `inbox_rules` | acquisition | persistence exists; UI is the missing half | bounded Class 2 |
| 8 | MCP Apps / capability expansion | moat | only by demonstrated product pull (A3 rule) | opportunistic |

Explicit non-goals unchanged: bank sync contracts, AI advice, household sharing, multi-currency, investment tracking — each parked until user evidence or owner authorization says otherwise.

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
