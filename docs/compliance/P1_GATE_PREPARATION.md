# P1 gate preparation — data inventory and read-back checklists

**Last updated:** 2026-08-18
**Baseline:** `main@fec1195`
**Purpose:** turn the four remaining P1 release gates from open-ended asks into short,
prepared sessions. It **does not close any gate** — RRB-04, RRB-05, RRB-06 and RRB-09
all still require the owner, a provider account, or a qualified lawyer.

Everything below is derived from current code and migrations, with the file cited.
Where the code does not answer a question, this document says so rather than guessing.

---

## 1. RRB-06 — Vietnam personal-data legal/privacy review

An agent cannot produce a legal opinion. What it can do is remove the discovery cost,
so the lawyer spends the session on judgement rather than on reverse-engineering the
system. Hand them sections 1.1–1.6.

### 1.1 What personal data exists

**Identity and account** — held by Supabase Auth (`auth.users`) plus:

| Table | Personal content | Source |
|---|---|---|
| `profiles` | `full_name`, `avatar_url`, `currency_code`, `locale`, `timezone` | `20260714000100_initial_financial_schema.sql` |

**Financial content** — this is the sensitive core. Every table below is keyed by
`user_id` referencing `auth.users(id)`:

`financial_transactions` (kind, `note` capped at 500 chars, `occurred_on`),
`transaction_entries` (amounts), `accounts`, `categories`, `monthly_budgets`,
`recurring_commitments`, `commitment_occurrences`, `recurring_income_templates`,
`income_template_occurrences`, `savings_goals`, `savings_goal_allocations`,
`account_reconciliations`, `account_reconciliation_events`, `inbox_candidates`,
`inbox_rules`, `import_batches`, `transaction_import_provenance`,
`financial_mutation_audit_events`, `archive_restore_batches`, `archive_restore_rows`.

**A note field is free text.** `financial_transactions.note` accepts up to 500
characters of anything the user types. Assume it can contain names, places, health
references or other special-category data, because nothing prevents that.

**Demo mode holds nothing server-side.** It is browser-local storage only
(`NEXT_PUBLIC_APP_MODE=demo`), so a demo user's data never reaches a processor.

### 1.2 Processors and where data goes

| Processor | Role | What it receives | Region |
|---|---|---|---|
| Supabase | database + Auth | everything in 1.1 | **UNVERIFIED — this is RRB-04/09** |
| Vercel | hosting + serverless execution | all request traffic | **verified 2026-08-18: region `sin1`, Singapore** (§3.0) |
| Vercel Analytics (`@vercel/analytics`) | page analytics | page views | **UNVERIFIED** |
| Vercel Speed Insights (`@vercel/speed-insights`) | performance telemetry | route shape only, see 1.3 | **UNVERIFIED** |
| Cloudflare Turnstile | auth captcha, when enabled | challenge interaction on auth pages | **UNVERIFIED** |

Fonts are handled by `next/font/google`, which self-hosts at build time, so no runtime
request reaches Google from a user's browser.

**The single biggest open question for the lawyer is region and cross-border transfer,
and the repository cannot answer it.** No verified statement about the production
Supabase or Vercel region exists anywhere. That is precisely what RRB-04 and RRB-09 are
for, which is why they should be done *before* the legal session, not after.

### 1.3 Privacy-protective measures already implemented

These are real and worth showing the lawyer, because they change the risk picture:

- **Telemetry is deliberately narrowed.** `src/lib/speed-insights.ts` strips the query
  string and fragment from every reported URL and refuses to report at all from
  `/auth/`, `/update-password`, `/reset-password`, `/capture/share` and `/imports/`.
  So auth callback tokens, share payloads and import identifiers are not sent.
- **Row Level Security** on user-owned tables, with tenant-isolation tests in
  `supabase/tests/database/`.
- **Least privilege on data export**: `export_user_archive()` is revoked from `public`
  and `anon` and granted only to `authenticated`
  (`20260812000000_export_user_archive.sql`).
- **Deletion is server-only**: `purge_user_tenant_data(uuid)` is revoked from everyone
  and granted only to `service_role`.
- **Soft delete with recovery** for ledger rows, so an accidental delete is reversible.

### 1.4 Data subject rights — how they are served today

| Right | Mechanism | State |
|---|---|---|
| Access / portability | `export_user_archive()` RPC, versioned archive contract | implemented |
| Erasure | `purge_user_tenant_data(user_id)` then Auth deletion | implemented, see 1.5 |
| Rectification | ordinary edit flows | implemented |

### 1.5 Two findings the lawyer should be told about

**(a) The erasure guarantee rests on a cascade, not on the purge function.**
`purge_user_tenant_data` deletes **19** tables. `archive_restore_batches` and
`archive_restore_rows` were created later, in
`20260812000000_export_user_archive.sql`, and are in neither the purge function nor the
deletion test. They are still removed on account deletion, because both declare
`user_id ... references auth.users(id) on delete cascade` — so erasure is complete
*provided the flow actually deletes the Auth user*. The function's own comment claims it
purges "every current MoneyFlow tenant row", and that is now inaccurate. Any flow that
purges without deleting the Auth user would leave those rows behind.

**(b) The deletion coverage test is a hand-maintained list.**
`supabase/tests/database/tenant_isolation_and_deletion.test.sql` enumerates tables
literally rather than deriving them from the schema, so it cannot notice a new tenant
table being added. Five tables the purge function does delete are absent from that test:
`account_reconciliation_events`, `account_reconciliations`,
`financial_mutation_audit_events`, `inbox_rules`, `transaction_import_provenance`.
The test passes, but it does not prove what its name implies. This is a verification
gap, not evidence of data surviving deletion.

Neither is a live data leak. Both are the kind of thing that must be stated plainly to
a reviewer rather than discovered by them.

### 1.6 What the repository cannot answer

- **Retention.** No purge schedule, TTL or retention policy exists in code for any table,
  including `financial_mutation_audit_events`. Data appears to persist until the user
  deletes their account. Whether that is lawful is a decision, not a lookup.
- **Legal basis** for each processing purpose.
- **Whether the published privacy policy matches reality** — see RRB-05 below.
- **Processor agreements** with Supabase, Vercel and Cloudflare.
- **The governing instrument and its current form.** Vietnam's personal-data framework
  has been moving; naming the specific decree or law in force, and what it requires of a
  service like this, is exactly the judgement being bought. This document deliberately
  does not assert it.

---

## 2. RRB-05 — operator-controlled support/privacy contact

**This gate is already partly failing in public, and that is the finding.**

`src/components/privacy-policy-page.tsx` publishes **`support@moneyflow.app`**. The
policy is live and makes a commitment on that address. RRB-05 exists because nobody has
verified the operator controls it.

**What public DNS establishes, read 2026-08-18:** `moneyflow.app` resolves
(`216.198.79.1`), is served by Google Cloud DNS nameservers
(`ns-cloud-e1..e4.googledomains.com`), and carries **Google Workspace MX records**
(`aspmx.l.google.com` and its alternates). So the domain is live and mail is
provisioned — a mailbox at `support@moneyflow.app` is plausible rather than
imaginary.

**What DNS cannot establish:** who owns it. Public records do not prove control,
and this document will not infer it.

That narrows RRB-05 to a single question the operator can answer in under a minute,
which is the whole point:

1. **Can you send and receive mail at `support@moneyflow.app` right now?**
2. Who monitors it, and within what response time?
3. Does the address survive a change of hosting or personnel?
4. If the answer to (1) is no, **the published policy must change before beta**, not
   after — a privacy policy naming an unreachable contact is worse than one naming none.

This needs a person and an account. No amount of preparation substitutes for it.

---

## 3. RRB-04 and RRB-09 — provider and production read-back

### 3.0 Vercel side: read and recorded, 2026-08-18

The Vercel half is no longer inference. Read directly from the provider on
2026-08-18 via the connected Vercel account:

| Fact | Value |
|---|---|
| Team | `thunderkill016's projects` — `team_1MZEcAVjG3nrOnklJxYIqGQs`, no SAML configured |
| Production project | `moneyflow` — `prj_eAusnkm1X1HzAt4wMFbuMnRXela7` |
| Framework / runtime | Next.js, Node `24.x` |
| Latest production deployment | `dpl_G1atNtCLqSTVkTqje222dZRK6Mnd`, `READY`, target `production`, 2026-08-17T19:18:35Z |
| Domains | `mfvn.vercel.app`, `moneyflow-thunderkill016s-projects.vercel.app`, `moneyflow-git-main-thunderkill016s-projects.vercel.app` |
| Custom domain | **none** — all three are `.vercel.app` |
| Password protection | **disabled** |
| Vercel Authentication (SSO) | **disabled** |
| Trusted IPs | **disabled** |

**Project identity is now unambiguous.** Two similarly named projects exist —
`moneyflow-reference-led-v2` and `moneyflow-public-entry-review-v1` — which is
exactly the confusion RRB-09 exists to remove. The production one is `moneyflow`,
identified by a deployment whose target is `production`.

**Region: `sin1` — Singapore.** Read from the `x-vercel-id` response header on all
three hostnames, 2026-08-18. **This is the cross-border answer the legal review
needs**, and it means user data does not stay in Vietnam.

**There is no preview environment.** All twenty most recent deployments carry
`target: production`. Every merge to `main` deploys straight to production; there is
no staging tier. The three hostnames are aliases of the *same* deployment, confirmed
by identical build asset hashes (`/_next/static/chunks/05-c3ty_6dwfk.js`) served from
each. An earlier draft of this document raised the possibility that public preview
deployments carried production credentials — **that concern is retracted; no preview
deployments exist.**

### 3.0.1 The finding that changes the urgency

**MoneyFlow is already live, public, and accepting registrations.**

Measured on 2026-08-18 against `https://mfvn.vercel.app`:

- the site returns HTTP 200 with no password, SSO or IP protection;
- it runs in **authenticated mode**, not demo — `/login` returns 200, and `/dashboard`
  returns `307 → /login?next=%2Fdashboard`, which is the real Supabase-backed auth path;
- **`/register` returns 200** and serves a working email/password signup form;
- the live `/privacy` page publishes `support@moneyflow.app`;
- the Vercel project was created **2026-07-13**, so this has been publicly reachable
  for over a month.

The project's own documents describe the P1 gates as blocking *controlled closed beta*,
which reads as though data collection has not started. It can start today, from any
browser. Whether anyone has actually signed up is not something this document
investigates or should — the point is that the capability is open.

**So RRB-06 is not a pre-beta formality.** A live service is collecting Vietnamese
personal financial data under a privacy policy whose contact address nobody has
verified, in a region nobody had recorded until today. If the owner's intent is that
this is not yet open to real users, the fastest correction is Vercel password
protection or removing the public alias — a setting change, not a release process.

**Also for the owner, not a defect:** no custom domain is attached, yet the privacy
policy publishes an address at `moneyflow.app`. See §2.

**Still unverified on the Vercel side**, because the connected tooling does not
expose it: the deployment **region** — which is the cross-border answer the legal
review needs — the environment variables present in production, and whether
Analytics, Speed Insights and Turnstile are enabled there.

### 3.1 Supabase side: entirely unverified

**The repository still holds no verified statement about the database.** Every claim
about it is inference from configuration files. These two gates exist to replace that
with fact, and they gate the legal review in section 1, because region and processor
identity are inputs to it.

Checklist for one provider session. Record each answer with the date and where it was
read:

**Supabase**
- [ ] project reference and **region** (this is the cross-border answer)
- [ ] which project the production deployment actually points at
- [ ] whether RLS is enforced on every table listed in 1.1
- [ ] who holds the `service_role` key, and where it is stored
- [ ] Auth settings: providers enabled, session lifetime, password policy, email
      confirmation, rate limits
- [ ] backup schedule and retention, and whether restore has ever been exercised
      (this also feeds RRB-02)

**Vercel**
- [ ] project, production domain, and deployment **region**
- [ ] environment variables present in production, by name only — never record values
- [ ] whether Analytics and Speed Insights are enabled in production
- [ ] whether Turnstile is enabled, and with which site key
- [ ] deployment protection settings

**Both**
- [ ] data processing agreement in place, and where it is filed
- [ ] sub-processor list, and whether it is monitored for change

---

## 4. Recommended order

1. **RRB-04 + RRB-09 first.** One provider session. It converts every "UNVERIFIED" in
   section 1.2 into a fact, and the legal review needs those facts.
2. **RRB-05.** A short ownership confirmation, but it may force a policy correction, so
   do not leave it last.
3. **RRB-06.** Book the lawyer once 1 and 2 are answered, and hand them sections 1.1–1.6.

Doing RRB-06 before the provider read-back wastes the most expensive hour, because the
first question a competent reviewer asks is where the data physically sits.

---

## 5. What this document is not

It is not a legal opinion, not a privacy policy, and not evidence that any gate is
closed. It is preparation. RRB-04, RRB-05, RRB-06 and RRB-09 remain open, and closing
them requires the owner, a provider account, and a qualified lawyer respectively.
