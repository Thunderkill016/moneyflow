# Beta owner action pack

**Status:** active checklist for the owner.
**Purpose:** the minimum that actually gates a *closed* beta with invited users, plus what is deferred to the public-beta decision. Rescoped 2026-09-21 on owner direction — the full audit gate list was sized for public beta; several items are disproportionate for a free, single-operator closed beta.
**Owner:** Thunderkill016
**Source of truth for verdicts:** `docs/plans/active/public-beta-trust.md`

Estimated total owner time for the closed-beta path: **~40 minutes** (20 phone + 10 console + 10 signatures). Everything deferred is listed at the bottom so nothing silently disappears.

---

## Closed-beta minimum

### 1 — RRB-08 physical-phone smoke (~20 min, real phone)

The one real-world evidence gate; the tool is live at `https://mfvn.vercel.app/rrb-08.html`.

1. On a real phone — ideally one iOS/Safari device — open `https://mfvn.vercel.app/rrb-08.html`.
2. The page auto-fills commit/build, device model, OS/browser, network. Correct anything it guessed.
3. In a second tab open `https://mfvn.vercel.app` and run the six checkpoints: open/shell, auth surface, core ledger (transfer ≠ income/expense), amount keyboard, accounts/transactions, theme.
4. PASS/FAIL/N-A each step. Stop on any P0 (auth bypass, another tenant's data, wrong money totals).
5. **Tạo biên bản** → **Sao chép** → paste into issue #398. No passwords, OTPs, statements or real financial data in the report.

### 2 — Minimal provider check (~10 min, Supabase + Vercel dashboards)

Three looks only — the exhaustive read-back is deferred to public beta (below).

- [ ] Supabase: project reference + **region** — confirms where user data physically sits (the cross-border answer RRB-06 needs)
- [ ] Supabase: who holds `service_role` and where it is stored
- [ ] Backups: schedule exists and has a retention window
- [x] Whether a restore has ever been exercised — YES, hosted rehearsal passed 2026-09-23 (export→delete→fresh-account→restore round-trip on disposable tenants; per-table row counts matched, residue zero)

Record each answer with date + where it was read. Never record secret values.

### 3 — Dispositions to sign (~10 min)

Edit and record in `public-beta-trust.md` (or reply on the tracking issue and the agent files them).

**RRB-05 — formal close** (evidence already merged — `support-contact.ts` + contract test):
> "RRB-05 closed. Published support contact is an owner-controlled mailbox; the foreign `moneyflow.app` contact was removed and a contract test guards it."

**RRB-02 — hosted restore.** Executed 2026-09-23 under option (b): bounded proof against disposable auth tenants on the live project passed (see `public-beta-trust.md` "Evidence since the last status update"). What remains is the owner's formal disposition.
> Draft: "RRB-02 closed. Hosted export/restore round-trip proven on managed Supabase against disposable tenants on 2026-09-23; evidence recorded in the trust packet."

**RRB-03 — destructive recent-auth edges:**
> "Accepted limitation for closed beta: stale-AMR/account-mismatch destructive probes unexecuted; fail-closed evidence exists; residual risk accepted. Revisit before public beta."

**Stop/support protocol** — adopt:
> "Support: `SUPPORT_EMAIL` mailbox, owner-monitored, first response ≤ 3 days. On a P0 (auth bypass, cross-tenant data, wrong money arithmetic, data loss): stop inviting testers, post status on the tracking issue, fix on a focused branch, re-run the phone smoke before resuming."

### 4 — RRB-06 legal, proportionate read (~5 min)

For a free, single-operator closed beta the proportionate action is awareness, not filing:

- Know the facts: user data (including sensitive financial data) sits in Vercel `sin1` Singapore + Supabase (region from Step 2) — i.e. outside Vietnam. Law 91/2025 + Decree 356/2025 are in force; financial data is sensitive personal data under Điều 4(k); the small-business exemption likely does not cover direct sensitive-data processing.
- Record the decision: formal DPIA / cross-border dossier / DPO filings are **deferred to the pre-public-beta review**, on the grounds that a free closed beta with invited users is a proportionate-risk context. This is an owner risk acceptance, not a compliance claim.
- Keep the privacy policy honest (it already is) and the support mailbox working.

If the product ever opens public registration or imports real bank statements at scale → run the deferred legal review below *before* that, not after.

### 5 — Ops leftovers (opportunistic)

- `CAPABILITY_WRITE_CLIENT_IDS` — only when a third-party MCP client is allowed to `candidates.propose`; nothing to do today.
- `/settings/apps` — sanity-test revoking the `mcp-inspector` grant once (UI live since #621).
- `www.moneyflow.app` — **no action**: different company's product, never ours.

Then: invite the closed-beta cohort, collect core-loop/support evidence per Step 4's protocol.

---

## Deferred to public-beta gate (PBT-AC15 prep)

Not needed for closed beta; required before the public go/no-go. Kept here so nothing is lost.

- **RRB-04 full read-back** — the complete Supabase/Vercel checklist in `docs/compliance/P1_GATE_PREPARATION.md` §3.1 + `docs/operations/provider-security-controls.vi.md`: auth settings vs `docs/configuration.md` (password ≥12, confirmation, CAPTCHA, rate limits, redirect allow-list, anti-enumeration), Firewall config, env var names, Analytics/Speed Insights/Turnstile state, deployment protection.
- **RRB-06 formal legal review** — the brief below goes to a competent reviewer; outcome may be filings (DPIA Mẫu 10, cross-border Mẫu 09 via the Ministry of Public Security portal), consent-text changes, retention policy, processor DPAs, breach-notification process.
- **RRB-09 Supabase half** — folded into the full read-back above.
- **PBT-AC15** — the public-beta go/no-go decision itself.

### RRB-06 legal brief (agent research, not legal advice)

Law 91/2025/QH15 + Decree 356/2025/NĐ-CP, in force 2026-01-01. MoneyFlow's data inventory: `P1_GATE_PREPARATION.md` §1.1.

- **Sensitive personal data:** Điều 4(k) NĐ 356 — bank credentials, card info, bank transaction history, customer financial/credit info. Open question: whether manually-entered ledger data counts; imported bank statements clearly do.
- **Small-business exemption:** Law Điều 38 + NĐ Điều 41 — 5-year exemption from DPIA/dossier-updates/DPO, but it excludes entities that "trực tiếp xử lý dữ liệu cá nhân nhạy cảm". If the sensitive reading applies, no exemption.
- **Cross-border:** Vercel `sin1` Singapore verified; Supabase region from the console check above → likely NĐ Điều 18 dossier (Mẫu 09 + transfer contract + self-assessment) via the MoPS portal.
- **Financial-domain obligations:** NĐ Điều 8 — technical standards, annual compliance self-assessment, full processing logs, specific consent content — if classified as financial-domain activity.
- **Individual vs enterprise:** the law binds "cá nhân" too, but filing mechanics presume an organization — lawyer question.
- **Penalties:** up to 3 tỷ đồng/violation (org); cross-border up to 5% prior-year revenue; data sale up to 10× gain.
- **Already in place:** privacy policy, `export_user_archive`, `purge_user_tenant_data` + auth cascade, RLS, narrowed telemetry, soft-delete.
- **Ask the reviewer about:** consent text for sensitive data, retention (none today — data lives until account deletion), DPIA filing, processor agreements (Supabase/Vercel/Cloudflare), breach-notification process, individual-operator filing path.

**G4** (Track D) stays parked until a real bank export file exists for #576.
