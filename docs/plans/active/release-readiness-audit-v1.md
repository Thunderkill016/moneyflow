# Release Readiness Audit v1

**Status:** discovery  
**Execution state:** discovery  
**Active role:** researcher  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** pending  
**Last updated:** 2026-08-15

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 cross-boundary audit because it evaluates financial truth, recovery, Auth/tenant isolation, security/privacy, accessibility, deployment/operations and release decisions. The audit itself authorizes no provider, production-data, database, Edge or deployment write.

## Outcome

Produce one current, evidence-layer-correct release decision package for MoneyFlow: a canonical `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION` readiness matrix, an explicit bounded blocker backlog and a controlled closed-beta validation plan. The audit must not implement findings or create feature scope.

## Repository reconnaissance

### Current behavior

- MoneyFlow is a released functional MVP but is not public-beta ready.
- Open-work reconciliation is complete at `main@5e506799eba162fca53466d55553b07f3d04cfeb`; there are no open PRs and #40/#174 remain intentional provider/owner decisions.
- Historical Provider Sync, P1 Secure, P2 Recover and P3 Prove are accepted evidence with named limitations; historical acceptance is not automatically current public-beta proof.
- UI Slice 1/2 and the amount-focus hotfix are merged; no new UI slice or brand phase is authorized.
- The current board makes this audit the sole NOW task.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/product/PRINCIPLES.md` | product law, financial honesty, daily-use priorities | reuse as release contract |
| `ARCHITECTURE.md` | evidence layers, ownership, financial/RLS invariants | reuse |
| `docs/configuration.md` | provider/Auth public-beta checklist | reuse; do not claim provider state from prose |
| `docs/deployment.md` | PR/deployment/runtime evidence boundaries | reuse |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current trust and named limitations | reuse current truth |
| `docs/plans/completed/*trust*` | provider/recovery/physical provenance | read only as named evidence |
| current tests / CI / migrations | executable financial, RLS, recovery and browser evidence | inspect current main |
| `docs/release/` | canonical release evidence destination | add one v1 audit result only |

### Existing tests and constraints

- Domain finance tests own integer-VND arithmetic, transfer neutrality and reconciliation behavior.
- pgTAP/local Supabase tests own schema/RLS/RPC/tenant-isolation claims.
- Browser/authenticated harnesses own runtime composition/flow claims; they do not prove PostgreSQL/provider state.
- Cross-device UI audit owns emulator/browser viewport evidence; it does not prove a physical device.
- Provider dashboard/read-back and production runtime each require their own evidence; repository CI cannot substitute for them.
- PBT-AC15 remains an explicit owner decision.

### Similar implementation and recent history

- Historical MVP acceptance reconciled feature completeness but explicitly did not prove hosted/provider/physical-device production readiness.
- P1 Secure accepted password/OAuth recent-auth production evidence and explicitly named stale-AMR/account-mismatch destructive probes as unexecuted.
- P2 Recover accepted the archive/restore contract with hosted restore still unexecuted.
- P3 Prove accepted owner-observed physical-phone evidence; no signed repository result file exists.
- Closed PR #345 designed a mixed-ledger authenticated browser truth scenario but was not merged. It is audit evidence of a known proof gap, not implementation authority.
- Current CI logs still show checkout/runtime credential-hardening warnings; audit must classify consequence before any tooling change.

### Open questions

- [ ] Does current main directly prove mixed-ledger authenticated rendered financial truth, or is #345's unmerged scenario still a release-proof gap?
- [ ] Does current database/RLS suite cover every user-owned table and destructive/recovery path required for closed beta?
- [ ] Is hosted restore required before closed beta/public beta, or can the owner explicitly accept the current limitation at the appropriate release boundary?
- [ ] Which provider/Auth/security controls can be read back without writes, and which remain owner/provider decisions (#40/#174)?
- [ ] Does current shipped UI satisfy the relevant WCAG 2.2 AA interaction/authentication checks on actual release-critical flows?
- [ ] Is current main deployed and production identity/read-back aligned, or is production evidence stale relative to the release candidate?
- [ ] Are privacy notice, data-subject handling, retention/deletion and operational records adequate for legal review under the current Vietnam personal-data regime?
- [ ] What exact stop-beta criteria, support path and evidence capture are required for a controlled cohort?

## Research

### Research scope and source selection

- Decision question: which current external baselines materially change MoneyFlow's release-readiness evidence requirements?
- Reference maps consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus current official primary sources.
- Source budget: five source groups rather than the default two-to-four because accessibility, application security, secure-development and Vietnam personal-data law are separate authority domains; legal law + implementing decree are treated as one legal source group.
- Expected decision: derive audit questions/evidence needs only; do not adopt a new framework, dependency or product scope.

### Questions researched

1. Which WCAG 2.2 AA additions are directly relevant to MoneyFlow's keyboard/mobile/auth flows?
2. What stable application-security verification baseline is current?
3. What secure-development baseline is current and useful for release process review?
4. Which Vietnam personal-data primary instruments are currently in force?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| W3C — WCAG 2.2, https://www.w3.org/TR/WCAG22/ | W3C Recommendation | 2026-08-15 | WCAG 2.2 is the current Recommendation; relevant AA additions include Focus Not Obscured, Target Size (Minimum) and Accessible Authentication (Minimum). | Audit only release-critical flows; this is not a claim of whole-site conformance until tested. |
| OWASP — ASVS 5.0.0, https://owasp.org/www-project-application-security-verification-standard/ | primary open application-security standard | 2026-08-15 | 5.0.0 is the latest stable ASVS and provides testable web-application security requirements. | Filter to MoneyFlow architecture; do not pretend every ~350 requirement applies. |
| NIST SP 800-218 — SSDF v1.1, https://csrc.nist.gov/pubs/sp/800/218/final | US government secure-development standard | 2026-08-15 | stable high-level practices for integrating security into the SDLC and addressing root causes of vulnerabilities. | Process baseline, not product certification. |
| Vietnam Law 91/2025/QH15 + Decree 356/2025/NĐ-CP, https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup= and https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160 | official Government legal texts | 2026-08-15 | Personal Data Protection Law and implementing decree are in force from 2026-01-01. | Creates legal-review questions; this agent audit is not legal advice or a definitive compliance opinion. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Re-run old release checklist and declare green | fast | promotes stale evidence and mixes evidence layers | reject |
| Full feature/product audit | broad | turns readiness into roadmap/feature creep | reject |
| Evidence-layer release audit with bounded external baselines | current, falsifiable, keeps scope on trust/release | may expose blockers requiring later tasks | select |

### Research decision

Observed: current authoritative standards reinforce MoneyFlow's existing evidence-layer model rather than requiring a new framework. WCAG 2.2 adds concrete interaction/authentication checks relevant to release-critical flows; ASVS 5.0.0 and SSDF 1.1 provide security verification/process lenses; Vietnam's current personal-data law/decree require a legal/privacy review boundary.

Inference: the audit should map only applicable controls to existing MoneyFlow evidence and classify unverified provider/legal/physical claims as BLOCKED rather than inventing compliance.

Product judgment: public-beta breadth is not the target of this audit. Closed-beta safety and trust are evaluated first; feature completeness is already historical input.

### Adoption review

Not applicable. No dependency, provider, service, tool, framework or architecture pattern is adopted by this audit.

## Specification

### Problem

The functional MVP and historical trust checkpoints exist, but there is no single current package proving that the present repository, present provider configuration, present production deployment and present real-user experience jointly satisfy the release claims MoneyFlow would make to a closed/public beta user.

### User stories

- As the product owner, I can see which release claims are directly proven, blocked or explicitly accepted as limitations so I do not make a beta decision from stale/ambiguous evidence.
- As a beta user, I can trust that MoneyFlow does not knowingly expose me to unresolved money-truth, ownership, recovery or security failures hidden behind generic green CI.
- As an implementer, I receive bounded blocker tasks rather than an unbounded "make it production ready" mandate.

### Acceptance criteria

- [ ] One canonical audit under `docs/release/` covers all seven dimensions.
- [ ] Every material row names the claim, required evidence layer, current evidence/provenance, current status and next action/owner.
- [ ] Status vocabulary is exactly `PASS`, `BLOCKED` or `OWNER-ACCEPTED LIMITATION`.
- [ ] Unknown/stale/unexecuted evidence is never called PASS.
- [ ] Financial correctness explicitly evaluates current mixed-ledger authenticated rendered truth and transfer neutrality.
- [ ] Recovery evaluates current edit/delete recovery plus archive/export/validation/restore and hosted-restore evidence.
- [ ] Auth/isolation evaluates current RLS/ownership and recent-auth identity boundaries without destructive production testing.
- [ ] Security/privacy evaluates current repository scans, applicable ASVS/SSDF controls, provider decision gaps and legal/privacy review flags.
- [ ] Usability/accessibility evaluates release-critical flows against relevant WCAG 2.2 AA checks and separates emulator/browser from physical-device proof.
- [ ] Deployment/operations evaluates exact candidate/deployment identity, environment contract, observability/recovery/support boundaries and stale-vs-current provider evidence.
- [ ] A bounded blocker backlog is produced with severity, owner, evidence gap and required task class; the audit does not implement it.
- [ ] A controlled closed-beta validation plan defines cohort boundary, entry gates, evidence capture, support path, stop-beta criteria and exit evidence.
- [ ] PBT-AC15 remains owner-only and is not auto-closed.

### Required states

- Loading/empty/populated/error/recovery: evaluate only where relevant to release-critical user flows; do not create new UI requirements.
- Long data / large VND: use current domain/browser evidence where available; unverified extremes remain explicit.
- Mobile/tablet/desktop: browser/emulation evidence is recorded separately from physical phone.
- Accessibility: keyboard focus visibility, target size and accessible authentication are explicit WCAG 2.2 review items.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer-neutral income/expense semantics remain release invariants.
- Authenticated data ownership/RLS evidence must come from DB/runtime/provider layers appropriate to the claim.
- Provider writes, destructive account tests, production financial-data mutation and deployment are forbidden in this audit unless separately authorized later.

### Out of scope

- Implementing blockers.
- New feature work, visual polish, Slice 3, Phase E/F, bank sync, AI advice or OCR identity.
- Provider/security configuration writes.
- Definitive legal-compliance certification.
- Reopening stale PRs as implementation authority.

## Implementation plan

### Architecture fit

The audit is documentation/evidence work owned by the existing public-beta trust program. `public-beta-trust.md` remains the parent release authority; this packet owns audit execution; the final `docs/release/` audit owns the decision matrix. Code/tests/provider truth remain authoritative for their own layers.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/release-readiness-audit-v1.md` | execution packet/evidence provenance | Class 3 audit lifecycle |
| `docs/plans/active/README.md` | register active child packet only | routing; no duplicate findings |
| `docs/release/RELEASE_READINESS_AUDIT_V1.md` | canonical matrix + blocker backlog + beta plan | owner decision package |
| PR memory after PR exists | bounded lifecycle evidence | repository contract |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: docs/evidence only.
- Rollback: revert the audit PR; no external state changes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| old PASS is promoted to current PASS | require current applicability + evidence date/head/layer |
| browser test is treated as RLS/provider proof | explicit evidence-mode column |
| unverified provider setting is guessed | BLOCKED / owner-provider action only |
| audit becomes feature wishlist | blockers must tie to release claim and evidence |
| legal standard is overclaimed | flag for legal review; no compliance opinion |
| owner-accepted limitation is invented | require explicit existing/new owner acceptance |
| retry hides a failure | preserve first failure classification |

### Verification plan

- Static/policy: `git diff --check`, project knowledge contract, CI policy contract.
- Unit/domain/database/browser: inspect current-main evidence and run/extend only verification needed to answer an audit claim; any executable test addition becomes a separately bounded blocker/proof task, not hidden inside the audit.
- Provider/production: read-only evidence only when tooling/permission exists; otherwise BLOCKED.
- Responsive/physical: distinguish emulator/browser audit from owner-observed physical evidence.
- Final audit PR: exact-head protected CI, CodeQL, secret-history, review/thread recheck.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| RA-T1 | inventory current financial correctness evidence | none | domain + DB + authenticated/runtime tests | doing |
| RA-T2 | inventory recovery/data-safety evidence | none | P2 + current tests/archive contracts | todo |
| RA-T3 | inventory Auth/tenant-isolation evidence | none | RLS/pgTAP + P1/provider history | todo |
| RA-T4 | inventory security/privacy evidence | none | scans/config/issues + ASVS/SSDF/legal flags | todo |
| RA-T5 | inventory usability/accessibility evidence | none | UI audit/browser/physical + WCAG 2.2 | todo |
| RA-T6 | inventory deployment/operations evidence | none | deployment config + current production/provider provenance | todo |
| RA-T7 | define controlled closed-beta support evidence | RA-T1–T6 | product law + current gaps | todo |
| RA-T8 | synthesize canonical matrix + blocker backlog + beta plan | RA-T1–T7 | audit document | todo |
| RA-T9 | skeptical evaluation + exact-head delivery | RA-T8 | review + protected checks | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-15 | parent program | researcher | discovery | Current Work Board + current memory + accepted trust records | provider/current-production and mixed-ledger proof not yet reconciled | inventory current evidence by dimension |

### Current permission boundary

- Granted scope: repository reads/research, branch/PR documentation and current-main verification that does not mutate external state.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: provider configuration, production financial data, Supabase schema/Edge, deployment, destructive Auth/account operations.
- Human approval required before: provider/production writes, accepting a new limitation, controlled-beta launch, PBT-AC15.
- Stop condition: any finding that requires implementation becomes a proposed bounded blocker task; do not silently fix it inside this audit.

## Evaluation

### Acceptance evidence

Pending RA-T1–T9.

### Research and adoption evidence

Research sources are current official/primary baselines and are used only as scoped audit lenses. No adoption is performed.

### Review findings

Pending skeptical evaluation after the matrix is complete.

### Remaining limitations

Current evidence inventory incomplete; no readiness status may be inferred from this discovery-state packet.

## Delivery record

- Branch: `audit/release-readiness-v1`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable to audit docs
- Production flow verified: not claimed
- Work packet moved to `docs/plans/completed/`: pending
