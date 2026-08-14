# MoneyFlow Release Readiness Audit v1

**Audit date:** 2026-08-15  
**Audit base:** `main@5e506799eba162fca53466d55553b07f3d04cfeb`  
**Audit PR:** #388  
**Decision scope:** readiness for controlled closed beta and eventual public beta  
**Current decision:** **BLOCKED**  

This audit is not a feature review and is not a legal certification. It maps current release claims to the evidence layer capable of proving them. Historical accepted work is reused only when it remains applicable to current main. Unknown, stale, cross-layer or unexecuted evidence is not promoted to PASS.

## Status vocabulary

- **PASS** — current/applicable evidence directly proves the claim at the required layer.
- **BLOCKED** — evidence is missing/failed, a current defect/decision prevents the release claim, or the proof exists only at the wrong layer.
- **OWNER-ACCEPTED LIMITATION** — the owner explicitly accepts a real limitation where policy allows it. This audit does not invent owner acceptance.

## Executive decision

MoneyFlow's functional core is materially stronger than its public-beta evidence package.

Current main has strong domain/database evidence for integer-VND arithmetic, transfer neutrality, tenant isolation, destructive cross-tenant denial, archive validation/restore invariants and financial correction paths. The release is nevertheless **BLOCKED** because several user-facing/provider/operational claims are not yet proven at the correct layer.

The highest-priority findings are:

1. current main lacks an authenticated mixed-ledger browser proof that composes income + expense + transfer into the rendered balances/totals the user sees;
2. the public privacy page instructs users to contact `support@moneyflow.app`, while the public `moneyflow.app` website currently identifies a different product/operator (Abstract Software LLC); Atoryn MoneyFlow ownership/control of that domain/contact is not proven;
3. production provider/security settings remain owner/provider-gated through #40/#174 and repository CI cannot prove them;
4. hosted restore remains unexecuted on a hosted account;
5. current production deployment identity/provider read-back is not available in the audit evidence set;
6. the July 2026 privacy policy has not been reviewed against Vietnam's personal-data regime now in force, so legal/privacy operational readiness cannot be called PASS;
7. current browser/emulator accessibility evidence is substantial, but physical-device evidence predates the latest UI slices/hotfix and does not prove the current release candidate.

These findings do **not** justify speculative features, a redesign, Phase E/F, bank sync or new product scope.

---

# 1. Readiness matrix

## A. Financial correctness

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Money is integer VND and unsafe amount shapes are rejected | domain + database | `src/lib/finance.test.ts`; `supabase/tests/database/finance_domain_invariants.test.sql`; `transaction_amount_safety.test.sql`; current runtime unchanged since full #386 CI #2467 | **PASS** | preserve gates |
| Internal transfers do not count as income/expense and keep equal/opposite account movement semantics | domain + database | finance tests + account reconciliation/transfer tests + database finance invariants | **PASS** | preserve gates |
| Edit/delete/correction changes derived totals consistently | domain + database | finance edit/delete tests; account reconciliation correction tests; financial mutation audit tests | **PASS** | preserve gates |
| Authenticated rendered UI shows correct mixed income + expense + transfer totals/balances | authenticated browser/runtime composition | historical PR #345 designed this proof but closed without merging; current authenticated browser directory does not contain the mixed-ledger financial-truth spec | **BLOCKED** | **RRB-01** — add bounded authenticated mixed-ledger browser proof on current main |

**Dimension verdict: BLOCKED.** There is no evidence of a known arithmetic defect; the blocker is a missing release-critical composition proof.

## B. Recovery and data safety

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Core ledger correction/destructive actions are recoverable/soft-delete where required | domain + database + user flow as applicable | product law; finance delete/edit tests; tenant isolation test proves unauthorized soft-delete fails and owner rows remain active; historical recovery work | **PASS** | preserve regression coverage |
| Full account archive export has deterministic/versioned complete shape | database contract | `export_user_archive.test.sql` has populated multi-domain archive assertions and tenant/auth boundaries | **PASS** | preserve gate |
| Restore rejects wrong owner/version/corrupt/unsafe payloads, requires valid target state and is atomic/fail-closed | database contract | `restore_user_archive.test.sql` covers auth/tenant/version/safety/atomicity and current DB suite remains part of release gates | **PASS** | preserve gate |
| Hosted export/restore has been exercised against the current hosted account | hosted provider/runtime | hosted export accepted historically; hosted restore explicitly remains unexecuted | **BLOCKED** | **RRB-02** — execute safe hosted restore proof if authorized, or obtain explicit owner acceptance for the release boundary |

**Dimension verdict: BLOCKED** for public-beta readiness. The database restore contract is strong; hosted proof is a distinct unresolved claim.

## C. Authentication and tenant isolation

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Authenticated tenants cannot read or mutate another tenant's financial rows | database/RLS | `tenant_isolation_and_deletion.test.sql` uses two auth identities and proves account/category/transaction/entries/feed/balance/budget isolation plus rejected cross-tenant writes/transfers | **PASS** | preserve pgTAP/current migrations |
| Browser role cannot obtain service-role-only destructive authority | database privileges | tenant-deletion + browser-role/security-definer catalog tests | **PASS** | preserve gates |
| Unauthenticated/authenticated application modes are explicit rather than silently sharing demo truth | architecture + browser harness | explicit app-mode contract; auth harness contains unauthenticated boundaries and authenticated ownership paths | **PASS** | preserve mode-specific tests |
| Recent-auth destructive identity flows are proven on current provider for password/OAuth edge conditions | production/provider | historical password + Google recent-auth evidence exists; stale-AMR and real account-mismatch destructive probes remain intentionally unexecuted | **BLOCKED** | **RRB-03** — owner decides whether existing fail-closed evidence is an accepted limitation for beta or authorizes fresh safe provider proof |

**Dimension verdict: BLOCKED** only at the provider/destructive edge-proof boundary; current RLS/tenant isolation itself is strongly covered.

## D. Security and privacy

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Repository changes are scanned for code/security/secret regressions | repository/provider CI | protected CodeQL + Secret history scans; full ready-state CI on recent current-runtime heads | **PASS** | keep required checks |
| Supabase public-beta Auth controls match the documented contract | provider read-back | `docs/configuration.md` requires password >=12, confirmation, CAPTCHA, rate-limit review, trusted callbacks/OAuth and neutral responses; #40/#174 remain open because repo cannot prove current dashboard/firewall state | **BLOCKED** | **RRB-04** — provider read-back/owner decisions for #40 and #174; no write without scoped approval |
| Privacy notice exists and explains collection, RLS, retention, export/deletion and contact | shipped source/browser | `/privacy` exists; policy updated July 2026 and covers these subjects | **PASS** for presence/content baseline | legal/operational review remains separate |
| Published privacy/support contact belongs to this MoneyFlow operator | domain/mail ownership/provider | source tells users to contact `support@moneyflow.app`; on 2026-08-15 the public `https://www.moneyflow.app/` and `/privacy` identify another Money Flow product operated by Abstract Software LLC with a different support address | **BLOCKED** | **RRB-05 (P1)** — prove ownership/control of the contact/domain or replace it with an owner-controlled verified support/privacy channel before external beta |
| Current privacy/data-handling operations are reviewed against applicable Vietnam personal-data obligations | owner/legal + operational evidence | Law 91/2025/QH15 and Decree 356/2025/NĐ-CP are in force from 2026-01-01; repository policy alone cannot establish compliance, records, roles or required legal procedures | **BLOCKED** | **RRB-06** — owner/legal review; record operational actions without inventing a legal certification |

**Dimension verdict: BLOCKED.** The support-domain mismatch/unproven ownership is release-critical because privacy/data requests must not be routed to an unrelated operator.

## E. Usability and accessibility

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Release-critical browser flows have keyboard/focus/responsive/target-size coverage | browser/a11y | `e2e/audit/` contains critical-browser, keyboard/focus, dialog responsive, accessible-name and `minimum-target-size.responsive.audit.spec.ts`; #383 proved one intentional amount focus contour across Expense/Income/Transfer and target phone viewports | **PASS** for browser/emulator evidence | keep current UI/a11y audit gates |
| Current auth flows meet relevant WCAG 2.2 Accessible Authentication behavior | browser/a11y + product review | auth flows are tested, but this audit did not find one explicit current acceptance record mapping login/register/recovery to WCAG 2.2 Accessible Authentication (Minimum) constraints | **BLOCKED** | **RRB-07** — bounded accessibility proof of release-critical auth flows; fix only if evidence exposes a defect |
| Current release UI has physical-device proof after the latest UI slices + focus hotfix | physical device | P3 owner-observed physical-phone evidence predates #381/#383; #383 evidence is browser/emulation, explicitly not physical-device evidence | **BLOCKED** | **RRB-08** — controlled physical-device smoke on current release candidate; this may be collected as a closed-beta entry/early cohort gate |

**Dimension verdict: BLOCKED** for public beta; browser accessibility coverage is substantial and should not be conflated with physical-device proof.

## F. Deployment and operations

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Repository only deploys `main` and production config fails closed when malformed | repo/deployment contract | `docs/deployment.md`, `vercel.json` and deployment-env checks; main-only deployment policy documented | **PASS** at repository contract layer | preserve checks |
| Current production deployment is the intended audited main identity | Vercel production read-back | audit has no current Vercel deployment identity/read-back tool/evidence | **BLOCKED** | **RRB-09** — read back canonical production deployment SHA/origin/env mode before beta; do not deploy merely to obtain evidence |
| Current Supabase/edge/Auth production identity and settings match the intended project | provider read-back | historical accepted provider sync exists; #40/#174 and current config checklist show provider settings still need current evidence | **BLOCKED** | combine with RRB-04 provider read-back where possible |
| Closed-beta support and stop/incident handling is explicit | operations | privacy page provides a support address, but that contact is unverified and there is no accepted current closed-beta support/stop protocol | **BLOCKED** | resolved by RRB-05 + the controlled-beta plan below |

**Dimension verdict: BLOCKED.** Repo deployment policy is sound; current external deployment/provider identity is not proven by repo CI.

## G. Controlled closed-beta readiness

| Claim | Required evidence layer | Current evidence | Status | Next action |
|---|---|---|---|---|
| Entry gates prevent users entering while money/security/privacy P1 blockers are unresolved | owner + release matrix | this audit defines gates below; blockers still open | **BLOCKED** | clear entry-gate blockers |
| Cohort can report problems through an operator-controlled channel | operations | current published support contact ownership is unproven | **BLOCKED** | RRB-05 |
| Beta captures real-device/core-loop/trust evidence without leaking private financial data into issue logs | beta protocol | defined below, not yet executed | **BLOCKED** | execute only after entry gates |

**Dimension verdict: BLOCKED** until entry gates are satisfied.

---

# 2. Blocker backlog

Priority here means release consequence, not implementation order. Each implementation/proof task must get its own bounded work item; this audit PR must not implement them.

| ID | Priority | Finding | Owner | Expected class | Done when |
|---|---|---|---|---|---|
| **RRB-01** | P1 | authenticated mixed-ledger rendered financial truth is not proven on current main | agent | Class 2 | current-main authenticated browser scenario proves income, expense, internal transfer, per-account balances and aggregate totals without test-only finance shortcuts; exact-head browser/CI evidence passes |
| **RRB-05** | P1 | public privacy/support contact uses `support@moneyflow.app` while control of `moneyflow.app` is unproven and the public site is another operator/product | owner + agent | owner/domain decision + Class 1 copy/config fix if needed | owner-controlled contact/domain is proven; app privacy/support surfaces use only verified operator-owned contact; no privacy request can be routed to an unrelated operator |
| **RRB-04** | P1 | current production Auth/firewall/public-beta security settings are not fully read back; #40/#174 remain open | owner + agent/provider read | Class 3 provider/security | current provider state is recorded for password policy, confirmation, CAPTCHA, rate limits, callbacks/OAuth, neutral behavior and edge controls; owner decisions are explicit; any approved change has provider read-back |
| **RRB-06** | P1 | current privacy/data operations have no recorded legal review against Vietnam's current personal-data regime | owner/legal | owner/legal decision | competent review records required notices/process/roles/retention/data-subject handling and any remediation; audit does not self-certify compliance |
| **RRB-09** | P1 | current production deployment/provider identity is not proven against the audited release candidate | agent if read access exists, otherwise owner/provider | Class 3 read-back | canonical origin, authenticated mode, deployed commit and intended Supabase project/settings identity are read back and tied to the release candidate |
| **RRB-03** | P2 | stale-AMR/account-mismatch destructive recent-auth provider edges remain unexecuted | owner | Class 3 owner decision | owner either explicitly accepts named limitation for the beta boundary or authorizes a safe fresh proof with fail-closed results |
| **RRB-02** | P2 | hosted restore remains unexecuted | owner + agent if authorized | Class 3 hosted recovery proof | safe hosted restore proof passes against a disposable/authorized target, or owner explicitly accepts the limitation for the applicable beta boundary |
| **RRB-07** | P2 | WCAG 2.2 Accessible Authentication mapping is not explicitly proven for current login/register/recovery | agent | Class 2 | targeted browser/a11y evidence passes; any defect is fixed separately |
| **RRB-08** | P2 | physical-device evidence predates latest UI slices/hotfix | owner + agent | Class 2 validation | current release candidate completes bounded physical-phone smoke; evidence notes device/browser/mode and observed defects |

### Severity rule

- P0 during beta: stop immediately — wrong financial totals/balances, transfer counted as income/expense, cross-tenant exposure, auth bypass, unrecoverable/destructive data loss, privacy data routed to an unrelated operator, or destructive action succeeding without required identity boundary.
- P1: blocks starting/continuing broader cohort until resolved or explicitly owner-handled where policy permits.
- P2: important readiness evidence/limitation; may be sequenced into the controlled-beta plan only when it cannot create a P0/P1 trust failure.

---

# 3. Controlled closed-beta validation plan

## Purpose

Closed beta is an evidence-gathering phase, not a declaration that public beta is ready. It exists to validate the daily ledger and support burden with real users/devices after the P1 entry blockers are cleared.

## Cohort boundary

- owner-selected small cohort; keep the initial wave at **no more than 5 users** so support and trust failures remain containable;
- use real accounts in the authenticated production/staging environment selected by the owner;
- never require users to send raw bank statements, passwords, OTPs or complete financial exports to support;
- synthetic test ledgers are preferred for diagnostic reproduction; users may use their real ledger only by their own choice under the reviewed privacy boundary.

## Entry gates

Before inviting the first external beta user:

1. RRB-01 financial runtime proof PASS;
2. RRB-05 verified owner-controlled support/privacy contact PASS;
3. RRB-04 current provider security read-back completed with no unresolved P0/P1 provider defect;
4. RRB-06 legal/privacy review completed to the level required by the owner for external beta;
5. RRB-09 production deployment/provider identity tied to the candidate;
6. no open P0; P1 blockers are zero unless the owner explicitly records an allowed limitation;
7. exact release candidate passes repository required checks, database/RLS gates and release-critical browser smoke.

RRB-02/03/07/08 must be explicitly resolved, accepted where policy permits, or scheduled as bounded early-beta evidence before public-beta consideration. Absence of evidence is not implicit acceptance.

## Per-user core loop

Capture pass/fail and notes without copying private financial details:

1. register/confirm/login and recover session;
2. complete onboarding/profile;
3. create/use accounts;
4. record one income and one expense;
5. create one internal transfer and confirm it does not alter income/expense totals;
6. reload/reopen and confirm persisted balances/history;
7. edit/correct an entry;
8. exercise a recoverable delete/recovery path where safe;
9. inspect dashboard/transaction history/reports for understandable totals;
10. export scoped data and locate the full backup/archive capability;
11. complete logout/login and basic mobile navigation;
12. report any confusing/incorrect state through the verified support path.

## Evidence capture

For each session record only:

- anonymous beta participant ID;
- date;
- device + OS + browser;
- release/deploy commit identity;
- runtime mode;
- scenario result codes;
- defect/issue IDs;
- user-observed trust/confusion notes with sensitive amounts/names redacted unless explicitly needed and consented.

Do not store passwords, OTPs, raw statements, full archives or unnecessary real financial values in GitHub/Slack/support logs.

## Stop-beta criteria

Stop invitations and triage immediately on any P0:

- displayed/derived money is wrong for a reproducible ledger;
- transfer changes income/expense totals;
- one user can see/change another user's data;
- auth/identity boundary is bypassed;
- data is destroyed or becomes unrecoverable contrary to the product contract;
- privacy/support flow sends user data to an unverified/unrelated operator;
- production/provider drift makes the audited environment identity uncertain.

Pause expansion on repeated P1 failures: save/load unreliability, account deletion uncertainty, inaccessible auth/core flow, broken support channel, or security controls materially weaker than the recorded release configuration.

## Exit evidence for public-beta consideration

- all beta P0 = zero;
- P1 = zero or explicitly owner-accepted where policy allows;
- every audit blocker has a final disposition/evidence link;
- current physical-device evidence includes the shipped candidate;
- support volume/failure categories are summarized;
- provider/deployment identity is current;
- legal/privacy owner review is recorded;
- owner records PBT-AC15 go/no-go and accepted limitations.

---

# 4. External baseline applicability

These sources are audit lenses, not new product frameworks:

- W3C WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- OWASP ASVS 5.0.0: https://owasp.org/www-project-application-security-verification-standard/
- NIST SP 800-218 SSDF v1.1: https://csrc.nist.gov/pubs/sp/800/218/final
- Vietnam Law 91/2025/QH15: official Government legal text, effective 2026-01-01
- Vietnam Decree 356/2025/NĐ-CP: official implementing decree, effective 2026-01-01

WCAG review is scoped to release-critical UI/auth flows; ASVS controls are filtered to MoneyFlow architecture; SSDF informs delivery/process questions; Vietnamese legal materials trigger owner/legal review rather than an AI-issued compliance opinion.

## Domain/contact verification note

External check on 2026-08-15 found `https://www.moneyflow.app/` and `https://www.moneyflow.app/privacy` presenting a separate Money Flow product operated by Abstract Software LLC with `usemoneyflow@abstractsoftware.dev` as its published contact. MoneyFlow repository source currently publishes `support@moneyflow.app`. Until ownership/control is proven, Atoryn MoneyFlow must treat that support/privacy channel as unsafe for external-user data requests.

---

# 5. Audit conclusion

**Public beta: BLOCKED.**  
**Controlled closed beta: BLOCKED on P1 entry gates.**

The audit does not find evidence that MoneyFlow's core ledger arithmetic, transfer neutrality, database restore contract or tenant isolation are broadly broken. The principal release risk is that some claims are either unproven in authenticated runtime/production/provider/physical layers or depend on unresolved owner/provider/privacy decisions.

The next implementation sequence after this audit is:

1. agent-owned P1 proof/remediation that does not require provider/owner decisions — start with **RRB-01 authenticated mixed-ledger financial-truth proof**;
2. owner/provider-gated P1 items RRB-05/RRB-04/RRB-06/RRB-09 are surfaced for decision/read-back rather than bypassed;
3. P2 evidence tasks are executed or explicitly accepted only at the proper boundary;
4. controlled closed beta starts only after entry gates pass;
5. PBT-AC15 remains owner-only.
