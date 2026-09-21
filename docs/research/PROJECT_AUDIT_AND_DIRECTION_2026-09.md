# MoneyFlow — project audit and direction options, September 2026

- **Status:** research + audit memo; informs owner decision, authorizes nothing
- **Date:** 2026-09-21
- **Baseline:** `main@0086db53` (after #635–#648: upgrade-only strategy, benchmark harness, all-surfaces plan, D1–D4, T1/T2, P1, R1, S1, X1/X2)
- **Method:** machine-derived repo inventory (routes, capabilities, migrations, tests, dependencies — `find`/`grep`/`wc`, no prose) + re-read of existing strategy docs + refreshed competitor evidence (official release notes and product pages dated 2026) + open GitHub issues/packets.
- **Question:** the September upgrade roadmap is exhausted. What does the project actually look like now, what changed in the market since the last memo, and where should the next block of work go?

Companion docs (not repeated here): `SOLO_COMPETITIVE_STRATEGY_2026.md` (thesis + free-stack map), `ALL_SURFACES_UPGRADE_PLAN_2026.md` (shipped roadmap), `PRODUCT_COMPETITIVE_MEMORY.md` (product-by-product lessons — §4.4 is now stale, see §1.3 below).

---

## 1. Audit — what the repo is today

### 1.1 Size and shape (verified)

| Dimension | Count |
|---|---|
| Page routes | 44 (all server components) + 5 API routes |
| Capabilities (REST + MCP, OAuth 2.1 consent) | 8 — 7 read, 1 write (`candidates.propose` → Inbox only) |
| Server actions | 55 exported across 18 files |
| Migrations / tables / SQL functions | 64 / 21 / 75 |
| pgTAP files | 44 (828 assertions on last CI run) |
| Unit test files / e2e specs | 216 `.test.ts(x)` + 18 `.test.mjs` / 53 |
| Source | `src/` ~102k lines (59.6k ts, 28.9k tsx, 13.4k css); `supabase/` 27k; `docs/` 62k; `scripts/` 11k |
| Debt markers | `TODO/FIXME/HACK` in `src/`: **0**; `!important` budget 0 with 0 occurrences |
| Runtime | Node 22, Next 16.3, React 19.2, Supabase SSR, MCP SDK 1.30, Zod 4 |

Acquisition actually implemented: paste (incl. bank-SMS-shaped text), Web Share Target, CSV (+ direct mapping presets), XLSX/XLS, text-layer PDF, archive restore. Bank-specific auto-map for VCB/ACB/VietinBank is an evidence matrix with `bankSpecificAutoMapSupported: false` for all three — generic mapping only.

### 1.2 Where the engineering is genuinely strong

- **Ledger correctness and tenancy** — integer VND, structural transfers, provenance, soft-delete/restore, versioned archive, RLS with pgTAP tenant tests. Nothing in the comparison set is stricter.
- **Reconciliation is shipped and deep** — `src/lib/reconciliation.ts` (528 lines), `/accounts/[id]/reconcile` (743-line page), 4 migrations, import-evidence linkage. `PRODUCT_COMPETITIVE_MEMORY.md §4.4` still calls this "the largest missing capability" — **that section is stale and should be superseded.**
- **Delivery discipline** — risk-proportional CI (10 jobs), migration identity baseline, UI no-new-debt contract, knowledge contract, CSS ownership gate. September's 14 PRs each shipped with exact-head green across every selected lane; CI caught 3 real defects (bundle range bound, legacy class registration, pgTAP CTE nesting) before merge.
- **Agent layer governance** — consent screen, connected-apps management, per-invocation audit, write path that can only land in a human-reviewed Inbox. Still unique in the set (see §2.1 for why "unique" no longer means "first").

### 1.3 Where the project is honestly weak

The pattern is the same one every memo since 2026-08 has named — **the foundation is far ahead of the evidence.**

| Weakness | Evidence | Since |
|---|---|---|
| **Zero real-user evidence** | No closed-beta cohort; no 7-day return, TTLT, or capture→post measurements on humans; Vercel Analytics mounted but no product event analysis exists | project start |
| **Owner gates parked** | `docs/operations/beta-owner-action-pack.md` (~70 min of owner console + phone time) still open; `rrb-08` blocked on real-phone observation; `#576` T5 needs one real sanitized bank export; Supabase Site URL still `localhost:3000` per megaplan | Aug 2026 |
| **Acquisition is manual-assisted while both VN incumbents auto-acquire** | §2.2 — Money Lover (MB/TPBank linking, multi-receipt scan) and MISA (bank linking + voice + chat + scan) | widening |
| **Agent-layer "first mover" claim expired** | §2.1 — Copilot MCP beta (May 2026), Monarch AI Assistant, YNAB Siri/Shortcuts, 3+ community Actual MCP servers with 50–74 tools | May 2026 |
| **Packet backlog is a fog** | 15 active packets; 5 in `owner_review`/`ready_for_review` for weeks; `PRODUCT_COMPETITIVE_MEMORY §4.4` contradicts shipped code | ongoing |
| **Only 2 open issues** | #559 (full redesign — very large, Phase 0 postmortem not started) and #174 (provider console controls) — the backlog surface no longer reflects what the team believes is next | — |

Reading: September's upgrade sequence was well executed and coherent, but it optimised surfaces whose value is unproven with any user. The next block of work should convert the foundation into evidence, or into the one capability gap that the VN market punishes hardest — not into a third round of polish.

---

## 2. Market — what changed since the 2026-09-21 strategy memo

Refreshed against official surfaces only (release notes, product pages, developer docs). Third-party reviews used only for platform availability.

### 2.1 The agent surface is now a category, not a moat

| Product | 2026 agent surface | Governance shape |
|---|---|---|
| **Copilot Money** | MCP **beta** (May 2026), read-only to start, tested with Claude/ChatGPT/Codex; **Money Assistant** beta (Apr 2026) can create/update/delete categories, budgets, transactions, rules — "checks for your approval before any edits" | Approval-gated writes inside the app; vision is "earns autonomy incrementally" |
| **Monarch** | AI Assistant (Winter 2026 release) grounded in user data, trained with a CFP panel; **transaction activity log** (every edit, pending→posted flip) | Q&A; no external protocol surface found |
| **YNAB** | Siri + Apple Shortcuts category balances (iOS 26); Income vs Spending 6-month bars (Feb 2026) | Platform-native read surface |
| **Actual Budget** | ≥3 community MCP servers, 52–74 tools each, HTTP/stdio, bearer rotation, mutation backups, `destructiveHint` annotations | Self-host; no consent UI; writes gated by env flag |

What MoneyFlow still has that none of these do, together: **OAuth 2.1 consent per client, per-invocation audit visible to the user, writes that can only become proposals in a reviewed Inbox with provenance, Vietnamese, free.** Copilot's "approval before edits" is the closest philosophy — but theirs is in-app; MoneyFlow's is protocol-level and user-owned. That is a real, defensible difference — but it is now a *governance* differentiator, not a *presence* one.

Also notable: Monarch's transaction activity log is provenance parity with MoneyFlow's Activity/provenance — so provenance is table stakes at the premium tier now.

### 2.2 Vietnamese incumbents doubled down on acquisition

- **Money Lover** (v8.73, Jul 2026): multi-receipt scan, location on transactions; Linked Wallet with suspicious-transaction alerts; bank linking MB/TPBank "+ others"; Premium ~199k₫/yr.
- **MISA Sổ Thu Chi** (App Store, 2026): "ghi bằng giọng nói, tin nhắn chat, chụp hóa đơn — AI tự phân loại — hoặc không cần ghi gì cả: liên kết ngân hàng"; gold/foreign-currency/savings/investment accounts; unlimited family sharing; desktop app "sắp ra mắt". Voice entry is Premium-only.

Both now market **"you don't have to type"** as the headline. MoneyFlow's `PRINCIPLES.md` Acquisition law says the same thing is the long-term default — the gap is that MoneyFlow has not shipped any adapter yet, only the neutral pipeline.

### 2.3 Free acquisition paths that exist today (VN, no bank contract)

| Path | Evidence (official) | Fit with the neutral pipeline |
|---|---|---|
| **SePay Bank Hub webhook** | Personal accounts allowed; Free plan for testing; HMAC-SHA256 signed IPN; "Money in" broad bank support; "Money out" only Sacombank/TPBank/VietinBank via memo-VA; retries Fibonacci ≤7; dedup by `transaction_id` | Webhook → candidate + provenance → Inbox. Exactly the shape §Acquisition law demands. One adapter, no ledger change |
| **Bank e-mail / notification forwarding** | Monarch shipped **email forwarding** (Jul 2026) as a top-tier product feature; `my-money-went-bot` precedent for VN bank mails | Parser adapter over existing `parse-text.ts` path |
| **Voice (Web Speech API)** | MISA charges Premium for voice; browser API is free and on-device on most phones | A Ghi mode, not a new area; Capture V2 H3 already specs it |
| **Open API (Circular 64)** | In force 2025-03-01; requires a bank contract with the third party; consent framework exists | Not a solo free path — unchanged from prior memo |

### 2.4 Unchanged

Global premium apps remain US-bank-sync + English; VN open banking still contract-gated; no product in the set is free *and* user-owned *and* Vietnamese. That positioning is intact.

---

## 3. Gap analysis — updated

| Gap | Status vs Sept memo | Who is ahead |
|---|---|---|
| Real-user proof (TTLT, D7 return, correction rate) | **unchanged — biggest gap** | everyone with users |
| Auto-acquisition | **widened** — both VN incumbents lead with it | Money Lover, MISA, MoMo |
| Agent surface | **narrowed from "unique" to "best-governed"** | Copilot (MCP beta), Monarch (assistant) |
| Reconciliation | **closed** (was mislabelled open) | — |
| Reports depth | closed enough (R1 trend, prior-window compare, pace) | Monarch treemap is nicer but not a gap |
| Dashboard first glance | closed (D1–D4) | — |
| PWA/offline | closed (X1/X2) | native apps still win on install friction |
| Voice / receipt capture | open, but voice is a **free** mode MoneyFlow can ship where MISA charges | MISA, Money Lover |
| Household / debt / multi-currency | deferred, unchanged | Money Lover, MISA |

---

## 4. Direction options for the owner

Each is a *block* of work, not one PR. They are not mutually exclusive, but they compete for the same owner and agent time. Ordering below is the recommendation.

### Option A — Evidence block (recommended first; mostly owner time)

Turn the foundation into measurements. No new product surface.

1. Owner action pack (~70 min): provider console exports, Supabase Site URL revert, physical-phone RRB-08 pass, one sanitized real bank export for #576 T5.
2. Closed beta of 5–10 real Vietnamese users for 14 days on production. Collect only what `PRINCIPLES.md §Product health metrics` already names: D7 return, capture→post median, % non-manual transactions, correction rate. Add the 3–4 product events to Vercel Analytics that make those computable (docs-only decision first; Class 1 to implement).
3. One human Capture V2 benchmark run per user on their own phone (the harness exists; the driver gives a 1.0s / 1.8s machine floor to compare against).

Exit: a dated evidence record that says which of Options B–D the users actually pull for. Cost to the agent is low; the block is blocked on the owner, which is exactly why it has not happened.

### Option B — Acquisition foundation, first adapter (lifts the #635 "no new areas" fence for one item)

`PRINCIPLES.md` makes auto-acquisition the strategic default; #635 deferred it tactically. The market evidence in §2.2 says this is the gap VN users will judge first. Proposed bounded first slice, Class 3:

- **SePay Bank Hub webhook adapter** → `ingest_*` RPC → candidate with provenance (`source: sepay`, payload hash, signature verified) → Inbox. No auto-post; the existing approval path stays the only way into the ledger. Money-in covers most banks; money-out is limited to 3 banks — the packet must state that honestly in UI copy.
- Alternative first adapter if SePay onboarding is too heavy for a personal account: **e-mail forwarding** address per user (Monarch precedent) → existing `parse-text.ts`. Lower coverage, zero third-party dependency.

Why now rather than later: the pipeline was built for this and has been idle; a single adapter is the smallest possible proof that "digital transactions don't need retyping" is true in MoneyFlow, and it gives Option A something to measure (% non-manual).

### Option C — Capture V2 slice: voice as a Ghi mode (upgrade-only compliant)

Benchmark floor exists; MISA proves demand and charges for it. Web Speech API is free and on-device on most phones. Ship dictation as a mode of the existing `/capture/quick` (H3), feeding the same parser as paste — not a new surface. Class 2. Measure with the harness (TTLT dictation vs amount-first). Good second slice once Option A has a cohort to measure with.

### Option D — Agent governance sharpening (only on product pull)

Since presence is no longer unique, make the governance visible: `capability_invocations` table + "app X read your balances 12 times this week" in `/settings/apps` (packet #624 is already specified), and finish the write-capability spec review (#617). Cheap, but the A3 rule still applies — do this when a real external client appears, not before.

### Not recommended now

- **#559 full redesign** — Phase 0 postmortem alone is weeks; the September UI work shows the current system can be deepened incrementally. Keep as a parking issue.
- Another round of surface polish (T3 density, D3 day headers) — diminishing returns without users.
- Household, debt, multi-currency, OCR, bank contracts, AI advice — unchanged deferrals.

---

## 5. Housekeeping the audit surfaced (Class 0, can ship immediately)

- Supersede `PRODUCT_COMPETITIVE_MEMORY.md §4.4` (reconciliation is shipped) and update §6 row "Reconciliation: No — next" → Strong; add Copilot MCP / Monarch assistant to §7.
- Archive completed September packets (`backup-reminder-chip`, `offline-pwa-polish`, `capture-v2-benchmark-harness`) to `docs/plans/completed/`.
- Resolve or close the 5 stale `owner_review` packets named in `megaplan-q4-2026.md` — a decision each, not work.
- Open GitHub issues for whichever of Options A–D the owner selects so the backlog surface matches intent again.

---

## 6. Sources

- Repo truth: `main@0086db53` inventory (routes/capabilities/migrations/tests/deps, machine-derived 2026-09-21); `docs/plans/active/*` status lines; `gh issue list`.
- Copilot Money: copilot.money/dispatch (Apr 16 2026 assistant beta; May 15 2026 MCP beta; Jun 11 2026 web splits); releasebot.io Aug 2026 notes (assistant write scope, MCP access broadened).
- Monarch: monarch.com/blog winter-release (AI Assistant), july-product-update (email forwarding, activity log), august-product-update (treemap).
- YNAB: ynab.com/whats-new (Feb 18 2026 Income vs Spending; Jun 4 2026 transaction editor; "Great YNAB Remodel" Siri/Shortcuts).
- Actual MCP: github KazeFreeze/actual-budget-mcp (v3.2.4, Jun 2026), agigante80/actual-mcp-server, NightSquawk/actualbudget-mcp-server.
- Money Lover: Play Store / App Store listings; apkpure changelog 8.73.0.157 (Jul 2026); linked-wallet.moneylover.me.
- MISA: apps.apple.com Sổ Thu Chi MISA listing (2026 copy); moneykeeper.misa.vn; voice-entry guide (Premium-only note).
- SePay: sepay.vn; developer.sepay.vn bankhub IPN + webhook creation docs (event types, bank limits, HMAC, retry schedule).
- Circular 64/2024/TT-NHNN: tapchinganhang.gov.vn; luatvietnam.vn (effective 2025-03-01; third-party contract requirement).

**Limits:** competitor claims are marketing/release-note evidence, not hands-on tests; SePay personal-account eligibility and free-tier limits must be re-verified at signup time; no claim is made about real-user behaviour — that absence is the point of Option A. This memo authorizes no implementation.
