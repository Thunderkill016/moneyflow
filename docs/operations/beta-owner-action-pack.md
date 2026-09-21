# Beta owner action pack

**Status:** active checklist for the owner — every remaining public-beta gate that only the owner can move.
**Purpose:** turn each open gate into concrete steps with exact evidence to capture, in the order that unblocks the most. Nothing here is a product change; it is the owner's hands, console access and decisions.
**Owner:** Thunderkill016
**Created:** 2026-09-21
**Source of truth for verdicts:** `docs/plans/active/public-beta-trust.md` (B4 assessment)

Estimated total owner time: one console session (~30–40 min) + one phone session (~20 min) + dispositions (~10 min) + the legal review (calendar-dependent).

---

## Step 0 — Merge PR #631 (phone-smoke tool)

PR #631 (`feat(rrb-08): self-serve phone-smoke evidence page`) is open and all-green but **not merged**, so `https://mfvn.vercel.app/rrb-08.html` still returns 404. Merge it, wait for the Vercel production deploy, then confirm the page loads. Everything in Step 1 depends on this.

## Step 1 — RRB-08 physical-phone smoke (~20 min, needs a real phone)

Cheapest gate; the runbook (#399) and the evidence tool (#631) are ready.

1. On a real phone — ideally one iOS/Safari device since the iOS evidence cell is still empty — open `https://mfvn.vercel.app/rrb-08.html`.
2. The page auto-fills commit/build (via same-origin `/api/health`), device model, OS/browser version and network. Correct anything it guessed.
3. In a second tab open `https://mfvn.vercel.app` and run the six checkpoints on the page: open/shell, auth surface, core ledger (incl. transfer ≠ income/expense), amount keyboard focus, accounts/transactions, theme.
4. PASS/FAIL/N-A each step, note defects with severity. Stop immediately on any P0 listed at the top of the page (e.g. bypassed auth, another tenant's data, wrong money totals).
5. Tap **Tạo biên bản** → **Sao chép** → paste into issue #398. Do not paste passwords, OTPs, statements or real financial data.

Done = the report is on #398 and the owner records PASS or files defects.

## Step 2 — RRB-04 / #174 provider read-back (~30–40 min, one console session)

Full checklist lives in `docs/compliance/P1_GATE_PREPARATION.md` §3.1 and the Vietnamese runbook `docs/operations/provider-security-controls.vi.md`. Record each answer with the date and where it was read; never record secret values.

**Supabase dashboard:**
- [ ] Project reference + **region** (the cross-border answer RRB-06 needs)
- [ ] Confirm the production deployment actually points at this project
- [ ] Auth settings vs `docs/configuration.md`: password min length **12**, email confirmation, CAPTCHA, rate limits, Site URL + redirect allow-list (only `mfvn.vercel.app` + intentional origins), neutral anti-enumeration responses
- [ ] Who holds `service_role` and where it lives
- [ ] Backup schedule/retention; whether a restore has ever been exercised (feeds RRB-02)

**Vercel dashboard:**
- [ ] Firewall/rate-limit configuration read-back
- [ ] Production env var **names** present (never values): `NEXT_PUBLIC_APP_MODE`, `NEXT_PUBLIC_SITE_URL`, Supabase keys, `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CAPABILITY_WRITE_CLIENT_IDS` if used
- [ ] Whether Analytics / Speed Insights / Turnstile are enabled in production
- [ ] Deployment protection state (was disabled on 2026-08-18)

`#40` (leaked-password check) is already an accepted Free-plan limitation — record that disposition in the same session. This session also closes the Supabase half of RRB-09 (the deployment half is already evidenced by `/api/health` → commit `67b3b7ed`).

## Step 3 — Dispositions to sign (~10 min)

Draft texts below; edit and record in `public-beta-trust.md` (or reply on the issue and the agent will file them).

**RRB-05 — formal close.** Evidence already merged: `src/lib/support-contact.ts` publishes the owner's own mailbox (`SUPPORT_EMAIL`), `OWNED_HOSTS` excludes `moneyflow.app`, `support-contact.test.ts` fails the build on regression.
> Draft: "RRB-05 closed. Published support contact is an owner-controlled mailbox; the foreign `moneyflow.app` contact was removed and a contract test guards it. Verified by owner mailbox control + merged code."

**RRB-02 — hosted restore.** Choose one:
> (a) "Accepted limitation for closed beta: hosted restore unexecuted; archive/export contract is proven repo-side; restore risk is borne by Supabase backups (verify in Step 2) and accepted by owner." — or —
> (b) Authorize a bounded hosted restore proof against a disposable/authorized target; the agent then executes it.

**RRB-03 — destructive recent-auth edges.** Choose one:
> (a) "Accepted limitation: stale-AMR/account-mismatch destructive probes unexecuted; fail-closed evidence exists; residual risk accepted for beta boundary." — or —
> (b) Authorize a safe fresh proof; the agent prepares the bounded plan.

**Closed-beta stop/support protocol.** Draft baseline to adopt:
> "Support channel: `SUPPORT_EMAIL` mailbox, owner-monitored, target first response ≤ 3 days. Stop protocol: on a P0 (auth bypass, cross-tenant data, money arithmetic wrong, data loss) — stop inviting testers, post status on #398/tracking issue, fix on a focused branch, re-run RRB-08 smoke before resuming. Incident record goes in the trust packet handoff table."

## Step 4 — RRB-06 legal review prep (bring this to whoever reviews)

Law 91/2025/QH15 + Decree 356/2025/NĐ-CP, both in force 2026-01-01. **This section is agent research for the reviewer, not a legal opinion.**

**How the law maps to MoneyFlow's actual data** (inventory: `P1_GATE_PREPARATION.md` §1.1):

- **Sensitive personal data.** Decree 356 Điều 4(k) lists bank credentials, card info, bank transaction history and customer financial/credit/insurance information at credit institutions as sensitive. Open question for the reviewer: whether manually-entered ledger data counts — imported bank statements clearly do. If any user imports statements, MoneyFlow directly processes sensitive personal data.
- **Small-business exemption likely unavailable.** Law Điều 38 + Decree Điều 41 let small businesses skip DPIA, dossier updates and DPO designation for 5 years — **except** entities that "trực tiếp xử lý dữ liệu cá nhân nhạy cảm" (directly process sensitive personal data). If the sensitive-data reading applies, the exemption does not.
- **Cross-border transfer.** Verified: Vercel `sin1` (Singapore); Supabase region unverified until Step 2. Storing Vietnamese users' data abroad is cross-border transfer → Decree 356 Điều 18: impact-assessment dossier (Mẫu 09) + transfer contract + self-assessment, filed via the Ministry of Public Security portal.
- **Financial-activity obligations** (Decree Điều 8): if classified as operating in the financial domain — technical standards, **annual** compliance self-assessment, full processing logs, specific consent content.
- **Individual vs enterprise status.** The owner is an individual developer; whether a free app run by an individual is a "bên kiểm soát dữ liệu" with the filing obligations above is a lawyer question — the law applies to "cơ quan, tổ chức, cá nhân" but filing mechanics presume an organization.
- **Penalties:** up to 3 tỷ đồng per violation (org); cross-border violations up to 5% of prior-year revenue; data sale up to 10× the gain.

**Already in place** (worth showing the reviewer): privacy policy page, `export_user_archive` (access/portability), `purge_user_tenant_data` + auth cascade (erasure), RLS tenant isolation, narrowed telemetry, soft-delete.

**Gaps to ask about:** consent text sufficiency for sensitive data; retention (none exists — data persists until account deletion); DPIA filing status; processor agreements with Supabase/Vercel/Cloudflare; breach-notification process (72h-class obligations exist in the regime); whether the individual-operator reading changes the filing path.

## Step 5 — Ops leftovers (~10 min, opportunistic)

- `CAPABILITY_WRITE_CLIENT_IDS` — only needed when a third-party MCP client is allowed to call `candidates.propose`. Set in Vercel env when that day comes; nothing to do if no external client is planned yet.
- `/settings/apps` — after the next deploy, sanity-test revoking the `mcp-inspector` grant once (UI exists since #621).
- `www.moneyflow.app` — **no action**: it serves a different company's product ("Money Flow", Abstract Software LLC), verified live 2026-09-21. It was never ours; nothing exists in our Vercel to remove.

## Step 6 — After the gates

With RRB-04/05/06/08/09 closed or dispositioned: run a bounded closed-beta cohort (a few real users, the support channel from Step 3), collect core-loop/support evidence, then record **PBT-AC15** — the public-beta go/no-go — in the trust packet.

**G4** (Track D) stays parked until a real bank export file exists for #576; nothing here substitutes for it.
