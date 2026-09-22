# MoneyFlow canon — the fixed authority set

**Status:** binding owner decision, 2026-09-22.
**Owner:** Thunderkill016.

This document freezes the external authorities MoneyFlow builds against. It is not a
reading list and not a roadmap. Every future roadmap, feature proposal, redesign or
strategy memo must route through the authority table below before it may claim a
product reason to exist. If a proposal cannot name the authority and the stage gate it
serves, it does not proceed — the agent's job is evidence and execution, not
open-ended product strategy.

Standing constraints already decided by the owner: solo developer, 100% free stack,
no beta cohort or gated rollout, upgrade existing surfaces in place.

---

## 1. Authority table

| Question | Canon authority |
|---|---|
| What is MoneyFlow ultimately helping the user achieve? | CFPB Financial Well-Being |
| How is financial capability / well-being measured? | CFPB scale + OECD/INFE Toolkit 2026 |
| How is a product/service built and run? | GOV.UK Service Standard |
| Product & design philosophy | GOV.UK Design Principles |
| Is the UI usable by everyone? | WCAG 2.2 AA |
| Is the application actually secure? | OWASP ASVS 5.0 |
| Is security *operation* mature? | NIST CSF 2.0 |
| Is the privacy architecture right? | NIST Privacy Framework |
| Privacy law in Vietnam | Law 91/2025/QH15 + Decree 356/2025/NĐ-CP (both effective 2026-01-01; NĐ 13/2023 expired) |
| Bank / provider API security, when that day comes | RFC 9700 (OAuth 2.0 Security BCP) + FAPI 2.0 |
| Financial interoperability model, when that day comes | ISO 20022 (ISO 20022-1:2026) |

No other source outranks these on their question. Blogs, competitor changelogs and
older research docs are evidence, not authority.

---

## 2. Per-source application notes

### 2.1 CFPB Financial Well-Being — the product north star

CFPB defines financial success not as "more money" or "higher net worth" but as four
things: control over day-to-day finances, capacity to absorb a financial shock,
being on track toward goals, and the freedom of choice that lets a person enjoy life.
The Financial Well-Being Scale is a validated measurement instrument.

MoneyFlow's existing direction maps directly onto it:

- **Reality** → control over day-to-day finances
- **Resilience** → capacity to absorb a shock
- **Progress** → on track toward goals
- **Choice** → financial freedom of choice

The product strategy was not invented; it has a real research foundation. New work
must name which of the four it serves.

- <https://www.consumerfinance.gov/consumer-tools/educator-tools/financial-well-being-resources/>
- <https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/>

### 2.2 OECD/INFE Toolkit 2026 — measurement, and a guardrail

Published 2026-01-13. Measures financial literacy, digital financial literacy,
inclusion, resilience and well-being in adults. Use it to keep MoneyFlow from a
classic failure: turning a money-management app into a financial-morality lecturer.
MoneyFlow surfaces facts, context and choices — it does not judge the user.

- <https://www.oecd.org/en/publications/oecd-infe-toolkit-for-measuring-financial-literacy-inclusion-and-well-being-2026_92f2d439-en.html>

### 2.3 GOV.UK Service Standard — how to build and run

Fourteen points: understand real user needs, solve the whole problem (not one
screen), keep the service simple, accessibility, iterate frequently, privacy and
security, define success up front, operate reliably. The standard is explicit: put
the service in front of real users as early as possible, observe, collect data,
iterate. MoneyFlow's current phase is *measure*, not *keep shipping features*.

- <https://www.gov.uk/service-manual/service-standard>
- <https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs>
- <https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently>
- <https://www.gov.uk/service-manual/service-standard/point-10-define-success-publish-performance-data>

### 2.4 GOV.UK Design Principles — product/design law

Start with user needs. **Do less.** Design with data. Do the hard work to make it
simple. Iterate. Then iterate again. These are the principles GDS used to build
national-scale services, not startup slogans. "Do less" is the decisive one for
MoneyFlow: the question is never "YNAB/Monarch/Copilot has X, build it" — it is
"which user job is currently failing?"

- <https://www.gov.uk/guidance/government-design-principles>

### 2.5 WCAG 2.2 — UI/accessibility target

W3C Recommendation; testable success criteria on desktop and mobile. AA is the
default target. Pay particular attention to: contrast, keyboard operation, focus
visibility, target size, error identification, labels/instructions, error prevention
for financial/data actions, and accessible authentication. Note **3.3.4 Error
Prevention (Legal, Financial, Data)** — review/undo/correction before financial
mutation is a conformance concern, not a nice-to-have.

- <https://www.w3.org/TR/WCAG22/>

### 2.6 OWASP ASVS 5.0 — technical security checklist

Stable release; defines, builds, tests and verifies security requirements for web
applications and services. "Is CodeQL green" is not the question — the contract is
authentication, authorization, session management, input validation, API security,
data protection, cryptography, logging, configuration. Supabase RLS is good but is
only one part of that surface.

- <https://owasp.org/projects/asvs> / <https://github.com/OWASP/ASVS/releases>

### 2.7 NIST CSF 2.0 — security *operations* maturity

Six functions: GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER. MoneyFlow is
currently strong on PROTECT. A real financial service also needs incident detection,
response, backup/recovery, credential-compromise handling, provider-outage handling,
supply-chain security and disaster recovery. This is the step from "secure web app"
to "safely operated financial service."

- <https://www.nist.gov/cyberframework>

### 2.8 NIST Privacy Framework — privacy is not security

Built to help organisations develop products while proactively managing privacy
risk. MoneyFlow holds one of the most sensitive data types a person has — long-term
financial history. It frames the questions: what data is needed, why, how long is it
kept, who can access it, can the user export it, delete it, do they understand?

- <https://www.nist.gov/privacy-framework/privacy-framework>

### 2.9 Vietnam PDPD law — legal baseline, updated

Decree 13/2023 is no longer the primary authority. **Law 91/2025/QH15** took effect
2026-01-01, and **Decree 356/2025/NĐ-CP** (guiding implementation) took effect the
same day; NĐ 13/2023 expired from that date. These two instruments are MoneyFlow's
legal privacy baseline in Vietnam. Do not cite stale 2023-era privacy posts as
authority.

- <https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3>
- <https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=187276>

### 2.10 OAuth Security BCP + FAPI 2.0 — future bank connectivity

Not needed now, but mandatory the day MoneyFlow connects a bank/provider. RFC 9700
is the current OAuth 2.0 Security Best Current Practice and deprecates older OAuth
patterns; FAPI 2.0 is the OpenID Foundation's security profile for high-security
financial APIs (final 2025). If a bank API requires OAuth/OpenID: do not invent an
authentication architecture — start here.

- <https://www.rfc-editor.org/info/rfc9700/>
- <https://openid.net/specs/fapi-security-profile-2_0.html>

### 2.11 ISO 20022 — reference model, not an implementation target

ISO 20022-1:2026 (April 2026) defines the shared framework/metamodel for business
processes, financial data elements and messages. It is the reference model for
designing provider adapters and canonical financial concepts — valuable when
MoneyFlow must normalize bank A / bank B / wallet / card / statement / Open API into
one canonical transaction and source model. It does not turn MoneyFlow into a
core-banking system.

- <https://www.iso.org/standard/20022-1>

---

## 3. The stage model

Roadmap order is fixed. Each stage is a gate: it must be measurably true before the
next stage is the priority.

### Stage 0/1 — Financial Reality, then Low-maintenance Reality

MoneyFlow must know exactly what it knows, and say clearly what it does not:
ledger → accounts → transfers → provenance → correction → reconciliation → backup.
Then reduce the effort of keeping that Reality true: manual → frequent patterns →
statement import → deterministic rules → matching → exception review → safe
acquisition → optional provider connectivity. **This is where MoneyFlow stands.**

### Stage 2 — Resilience

Once Reality is good enough: income cadence, obligations, liquidity, reserves,
irregular expenses, debt. No fake "safe to spend" without the data to back it.

### Stage 3 — Progress

Goals, debt plans, savings plans, plan-vs-actual, scenarios.

### Stage 4 — Choice

What-if, A-vs-B, trade-offs, projections, user-controlled automation. AI lives here
or as an accelerator on earlier stages — it is not the foundation.

**Current conclusion:** do not open another large feature system. Prove Stage 0/1 —
that a user can maintain a trustworthy financial reality with decreasing effort.
Until that is measurably true, wealth, AI advising, household, fancy planning,
native mobile and big redesigns do not address the actual bottleneck.

---

## 4. The operating loop

The agent no longer plays Chief Product Strategist. Owner-level decisions stay with
the owner ("do I want to serve this group?", "do I accept this risk/cost?",
"do I merge/release?"). "What do we build next?" is answered mechanically:

```text
current evidence
      ↓
current stage gate
      ↓
biggest failing user problem
      ↓
smallest experiment
      ↓
measure
      ↓
keep / change / kill
```

No infinite roadmap brainstorming. Every proposal must state its stage, the user
problem it closes, the smallest experiment that tests it, and the measurement that
decides keep/change/kill.
