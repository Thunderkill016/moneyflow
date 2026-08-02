# Public experience foundation research

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** ChatGPT agent, human owner approves  
**Issue/PR:** #216  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Persist a concept-neutral foundation for MoneyFlow's project-wide brand color system and the design process for landing and authentication. Future work must validate page goals, content hierarchy, flows and states through wireframes before applying a palette or visual polish.

## Repository reconnaissance

### Current behavior

- `docs/research/UI_UX_RESEARCH_LEDGER.md` is the cumulative UI/UX index.
- `docs/design/DESIGN_DIRECTION_STATUS.md` rejects Signal Ledger as an active baseline.
- `src/app/document-theme.css` remains the current runtime theme owner and still contains historical palette wording.
- PR #213 contains a separate green-first public palette and candidate landing/auth composition.
- `src/app/globals.css` already maps product consumers to semantic `--mf-*` roles.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` | Durable task-specific research | New source for brand/landing/auth work |
| `docs/AI_UIUX_WORKFLOW.md` | Binding design workflow | Updated to require wireframe-first public work |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Cumulative research index | Remains the general source; detailed new evidence is stored in the referenced task-specific foundation |
| `src/app/document-theme.css` | Runtime semantic palette authority | Not changed in this documentation PR |
| PR #213 landing/auth modules | Candidate implementation | Evidence only; not approved design authority |

### Existing tests and constraints

- Documentation-only checks: diff hygiene, project knowledge and CI classification.
- Browser/database checks are not applicable because no runtime, schema or provider behavior changes.
- Product constraints: manual-first Vietnamese ledger, financial honesty, 44px primary touch targets and no meaning through color alone.

### Similar implementation and recent history

- PR #210 established cumulative research and rejected Signal Ledger as a baseline.
- PR #213 is a candidate landing/auth implementation awaiting owner visual judgment.

### Open questions

- [x] What evidence should govern a MoneyFlow-wide brand color system?
- [x] What wireframe stages must precede landing/auth visual polish?
- [ ] Which palette and wireframe candidates will the owner select in a later implementation packet?

## Research

### Research scope and source selection

- Decision question: What durable process and evidence should govern project-wide brand colors and the landing/auth design workflow?
- Reference maps: cumulative UI/UX ledger and engineering foundations map.
- Source budget: expanded because color-system governance and public-flow wireframing are linked but distinct questions.

### Questions researched

1. What can color psychology reliably establish?
2. How should brand color be separated from finance semantics?
3. What sequence should landing design follow?
4. How should that sequence cover login, registration and recovery?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Elliot & Maier, *Color Psychology*, Annual Review of Psychology | Peer-reviewed review | 2026-08-02 | Color can affect affect, cognition and behavior | Effects are context-dependent; no universal “blue equals trust” rule |
| W3C WCAG 2.2 Use of Color, contrast and focus guidance | Accessibility standards | 2026-08-02 | Color cannot be the sole information carrier; contrast and focus are measurable | Compliance is not a complete brand direction |
| Carbon and Atlassian color foundations | Mature design systems | 2026-08-02 | Separate neutral, brand/action and semantic roles | Do not copy their visual identities |
| Figma and Webflow wireframe guidance | Primary/practitioner workflow | 2026-08-02 | Define goals, sketch structure, iterate and gather feedback before polish | Tool/process guidance, not MoneyFlow product truth |
| Relume workflow | Product workflow | 2026-08-02 | Brief → sitemap → wireframe → style → refinement | AI output is not user validation |
| GOV.UK patterns and confirm-email guidance | Evidence-led service patterns | 2026-08-02 | Clear task, validation, confirmation and recovery states | Do not copy GOV.UK styling |
| OWASP Authentication Cheat Sheet | Security guidance | 2026-08-02 | Avoid account enumeration in login/registration/recovery responses | Generic messages still need recovery guidance |
| Baymard sign-in flow research | Usability research | 2026-08-02 | Preserve intended path after sign-in/reset; auth is a flow | Ecommerce-specific patterns do not automatically apply |
| Current MoneyFlow code and PR #213 | Primary product evidence | 2026-08-02 | Real auth logic, CAPTCHA, OAuth, proof and responsive constraints | Candidate colors/composition are not approved brand law |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Recolor only landing/auth | Fast | Creates another palette owner | Rejected |
| Adopt current cobalt or green palette without selection | Low effort | Reintroduces rejected or unapproved aesthetics | Rejected |
| Monochrome-only product | Neutral | Weak action hierarchy and semantic capacity | Rejected |
| Project-wide semantic roles, candidate comparison, central adoption | Consistent and reversible | Requires owner selection | Selected |
| High-fidelity first | Fast-looking output | Hides hierarchy and flow defects | Rejected |
| Wireframe full landing/auth flows before style | Exposes structural/state issues early | Adds a review gate | Selected |

### Research decision

Color psychology is evidence for hypotheses, not deterministic brand law. MoneyFlow should separate a neutral foundation, one brand/action family, financial semantic roles and a chart palette. White-first surfaces and a non-green trust-oriented hue are candidates; the exact palette remains unapproved.

Landing and authentication must follow: product truth → page goal → content inventory → user flow → three low-fidelity variants → annotated mid-fidelity wireframe → state matrix → accessibility/security review → owner selection → brand/style application → prototype → implementation and evidence.

Auth must cover login, registration, recovery, confirmation, OAuth, CAPTCHA, generic failure, rate limit/session expiry and post-auth route preservation.

### Adoption review

Not applicable. No dependency, provider, framework or runtime architecture is added.

## Specification

### Problem

Historical global tokens, candidate local public tokens and rejected named concepts can cause visual drift. Public screens can also become polished before hierarchy, content and recovery states are validated.

### User stories

- As the owner, I can review structure before color.
- As a future agent, I can resume from GitHub instead of chat memory.
- As a MoneyFlow user, I receive consistent branding and understandable financial/auth states.

### Acceptance criteria

- [x] Detailed color and public-wireframe research is stored in the repository.
- [x] The AI UI/UX workflow requires the new foundation and wireframe-first sequence.
- [x] The research distinguishes binding process from unapproved palette/layout candidates.
- [x] Auth is documented as a complete stateful journey.
- [ ] A later implementation packet presents palette and wireframe candidates for owner selection.

### Required states

- Landing: default, loading proof, unavailable optional media and valid CTA routing.
- Auth: login/register/recovery, submit/OAuth/CAPTCHA loading, field and safe generic errors, confirmation, session expiry and intended-route recovery.
- Responsive: 320, 390, 768 and 1366 structures before high-fidelity approval.
- Accessibility: visible labels, logical focus, non-color cues, contrast and target-size policy.

### Financial and security constraints

- No guessed financial data or outcomes.
- Financial semantics remain distinct from brand color.
- Authentication errors must not reveal whether an account exists.
- No database/RLS impact in this documentation PR.

### Out of scope

- Selecting or implementing the final palette.
- Changing global or local CSS tokens.
- Rebuilding or merging PR #213.
- Changing auth providers, CAPTCHA, database or production.

## Implementation plan

### Architecture fit

Detailed task research lives in `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md`; binding process lives in `docs/AI_UIUX_WORKFLOW.md`; the work packet records scope, source limits and handoff. No new runtime token owner is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` | Add consolidated color, landing and auth research | Durable source |
| `docs/AI_UIUX_WORKFLOW.md` | Require wireframes, state matrices and project-level colors | Prevent future drift |
| this packet | Record evidence and boundaries | Durable handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: documentation only.
- Rollback: revert PR #216.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Pseudoscientific color claims | Explicit context limits and product testing |
| Candidate palette becomes silent law | Candidate label and owner-selection gate |
| Wireframes become a named permanent concept | Record status and rejection reasons |
| Auth styling obscures security | OWASP requirements and full state matrix |
| Duplicate research management | General ledger remains index; focused evidence is in one referenced foundation |

### Verification plan

- Static: diff hygiene.
- Knowledge/CI classification: required.
- Unit/domain/database/browser/production: not applicable to documentation-only diff.
- Manual: owner reviews research boundaries before later implementation.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Research color psychology, finance semantics and accessibility | none | source table | done |
| T2 | Research landing/auth wireframe process and states | T1 | foundation sections 5–7 | done |
| T3 | Create durable foundation document | T1, T2 | repository file | done |
| T4 | Update AI UI/UX workflow | T3 | repository diff | done |
| T5 | Open documentation PR and run selected CI | T4 | PR #216 | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | implementer | specified | sources + repository reconnaissance | final palette/wireframe unselected | Write docs |
| 2026-08-02 | implementer | evaluator | ready_for_review | foundation + workflow + PR #216 | CI pending; owner selection remains future work | Review exact-head checks and merge decision |

### Current permission boundary

- Granted scope: documentation branch and PR only.
- Resource: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, production, providers, database, runtime code and tokens.
- Human approval required before: merge, palette selection or implementation.
- Stop condition: any candidate is presented as approved without owner decision.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Durable research exists | `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` | pass |
| Workflow requires it | `docs/AI_UIUX_WORKFLOW.md` | pass |
| Candidate/binding boundary is explicit | both files and PR #216 | pass |
| Documentation CI | pending | pending |

### Research and adoption evidence

- Sources support role separation, wireframe-first design and auth-flow coverage.
- Color-psychology and ecommerce limitations remain explicit.
- New dependency/tool adoption: not applicable.

### Review findings

- Correctness: claims are bounded by source type and product evidence.
- Security/ownership: account enumeration and intended-route recovery are included.
- UI/UX/accessibility: non-color cues, responsive wireframes and state matrices are required.
- Maintainability/duplication: one focused foundation is referenced by the existing workflow.
- Scope compliance: documentation only.

### Remaining limitations

- No final palette or wireframe has been selected.
- Visual competitor references are not copied into the repository.
- Implementation and physical-device validation belong to a later packet.

## Delivery record

- Branch: `research/public-experience-foundation`.
- PR: #216.
- Squash commit: pending.
- CI run: pending.
- Production deployment: not applicable.
- Production flow verified: not applicable.
- Work packet moved to `docs/plans/completed/`: after merge and owner acceptance.