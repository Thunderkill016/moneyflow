# #463 — Apply confirmed Inbox rules in Direct CSV dry-run

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** #463 / PR pending  
**Base at implementation start:** `main@86ef47a12e835d303f3550b89caa8ee22306c601`  
**Last updated:** 2026-08-26

## Outcome

When a user imports a matching CSV again, Direct CSV dry-run can reuse an existing explicit Inbox rule to normalize the merchant/category of an eligible row. The user still sees the row, dry-run, duplicate/transfer skips and the existing explicit all-or-nothing commit review; no rule posts a transaction by itself.

## Repository reconnaissance

### Current behavior

- Direct CSV maps every eligible income/expense row to one manually selected default category before the direct approval RPC. It has no rule input or rule provenance (`src/components/inbox/direct-csv-import-page.tsx`, `src/lib/inbox/direct-csv-import.ts`).
- Paste and PWA Share already reuse explicit candidate-stage rules. `applyRulesToTargets` rejects transfers and preserves already-set categories by default; `apply_inbox_rule_to_candidate` rechecks tenant, enabled rule, exact version, category kind and source-field match on the server.
- Authenticated Direct CSV stores pending source candidates and then calls the existing batch approval RPC. If approval fails, its retained batch/candidates are the recovery path; it must not gain a second ledger path.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/inbox/apply-rules.ts` | deterministic rule selection | reuse unchanged; no inferred rules |
| `src/lib/inbox/direct-csv-import.ts` | pure Direct CSV dry-run plan | add optional rule-aware row plan/test coverage |
| `src/components/inbox/direct-csv-import-page.tsx` | visible dry-run/review | load/render exact rule result; preserve explicit review |
| `src/app/imports/direct/page.tsx` and `src/server/rules.ts` | initial authenticated rules workspace | reuse tenant-scoped rule read |
| `src/app/actions/direct-csv-import.ts` | authenticated acquisition/approval boundary | carry only exact rule id/version; never trust client normalization alone |
| `supabase/migrations/*share_target*_ingestion.sql` | atomic candidate + rule validation precedent | reuse the transaction pattern; retain Direct CSV batch/recovery semantics |

### Existing tests and constraints

- Related unit tests: `src/lib/inbox/direct-csv-import.test.ts`, `src/lib/inbox/apply-rules.test.ts`, `src/lib/inbox/share-payload.test.ts`.
- Database/RLS tests: Direct CSV rule validation must prove tenant isolation, stale/mismatched rollback and no financial transaction on failure.
- Browser tests: Direct CSV dry-run and review must expose rule-applied and no-rule states without relying on color.
- Product law: integer VND, transfer neutrality, pending source evidence and explicit review remain unchanged.

### Similar implementation and recent history

- #454/PR #455 applies an exact selected rule inside an atomic Share candidate transaction; it is the validation/provenance precedent, not a license to reuse Share behavior blindly.
- #460/PR #461 deliberately remembers only exact CSV column mappings on-device; it does not remember account/category choices and must remain separate.

### Open questions

- [x] Can Direct CSV reuse the rule contract without auto-posting? Yes: category/merchant normalization happens before the unchanged explicit review and existing approval RPC.
- [x] Can submitted rule data be trusted? No: authenticated mode must validate exact rule ownership/version/match within its source transaction.

## Research

### Research scope and source selection

- Decision question: how can repeated CSV classification require less manual work without weakening configured mapping validation, duplicate checks or explicit ledger review?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md`.
- Source budget: two external primary product-documentation sources plus current executable MoneyFlow contracts.
- Expected decision: reuse only explicit deterministic rules at dry-run, with server-side revalidation and no learned/automatic posting.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [Firefly III CSV import guide](https://docs.firefly-iii.org/how-to/data-importer/import/csv/) | primary product documentation | 2026-08-25 | CSV column configuration should be validated and optional rules are applied after import configuration | does not define MoneyFlow financial semantics or automatic posting |
| [Actual Budget importing guide](https://actualbudget.org/docs/transactions/importing/) | primary product documentation | 2026-08-25 | file import needs duplicate-aware processing and a manual record may be matched later | MoneyFlow retains stricter existing provenance/review rules and does not copy automatic ledger mutation |
| `src/lib/inbox/apply-rules.ts` plus `apply_inbox_rule_to_candidate` | current executable domain/database contract | 2026-08-25 | exact user-scoped rule/version/match validation, transfer exclusion and candidate-stage provenance already exist | only current candidate semantics; no Direct CSV authorization by itself |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Apply existing explicit rules during dry-run; server validates exact evidence before approval | reduces repeated categorization and keeps existing source/ledger flow | stale rules must recover safely | select |
| Infer a rule from prior Direct CSV rows | fewer initial clicks | hidden automation and unmeasured precision | reject |
| Auto-approve matching Direct CSV rows | fewer review actions | bypasses financial review and correction boundary | reject |
| Remember Direct CSV account/category selections | easy local convenience | conflates source shape with user financial intent; outside #461 contract | reject |

### Research decision

The selected slice only applies rules the user already created and renders the normalized result before the existing confirmation. Server validation remains authoritative; a stale, foreign, disabled, mismatched or category-incompatible rule fails the source preparation atomically before a ledger transaction can exist. The work adds no dependency, provider or background service.

### Adoption review

Not applicable: no dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

Direct CSV repeatedly assigns the same default category even when the user has already explicitly confirmed a matching Inbox rule. That adds avoidable manual classification and hides an existing deterministic normalization contract from a high-volume source.

### User stories

- As a user who already confirmed a rule, I can see its category/merchant normalization in Direct CSV dry-run before I decide to write the batch.
- As a cautious user, a rule match never skips duplicate/transfer checks, never writes without the current confirmation, and can be audited by exact rule version.

### Acceptance criteria

- [ ] Matching enabled candidate-stage rules may normalize eligible non-transfer Direct CSV rows during dry-run, retaining exact rule id/version evidence.
- [ ] Existing parsed categories and transfers remain unchanged; unruled rows use current selected income/expense defaults.
- [ ] Authenticated source preparation revalidates tenant ownership, rule enabled/version/category-kind and source match atomically; invalid evidence creates no ledger transaction and no partial source batch/candidate state.
- [ ] The existing Direct CSV review stays required and its summary discloses the number of normalized rows; duplicate/transfer logic and VND integer amounts remain unchanged.
- [ ] Demo uses its existing browser-local explicit rules; authenticated data remains tenant isolated.

### Required states

- Loading: rule availability never blocks file parsing; authenticated unavailable rules report a calm fallback and retain current import behavior.
- Empty: no saved rule leaves every row on the current default-category behavior.
- Populated: each rule-normalized preview row shows textual category/rule information and review discloses its count.
- Validation/error: invalid/stale rule evidence fails source preparation before approval, leaves no source batch/candidate state and asks the user to reload/recheck dry-run; no blind retry.
- Recovery/undo: rules can be edited/disabled in `/rules`; once committed, existing per-transaction recovery remains the only ledger undo path.
- Long data / large VND: keep current 5,000-row and integer-VND limits; no raw source expansion.
- Mobile/tablet/desktop: preview stays scrollable and rule result remains readable at existing breakpoints.
- Accessibility: normalized state and errors are textual/live, not color-only.

### Financial and security constraints

- No guessed financial data, recommendation, account/category-memory or automatic approval.
- VND stays integer đồng; transfers remain excluded from rule normalization and direct import.
- Authenticated rules/candidates/batches are user-owned and must preserve existing RLS/server validation. Client rule fields are evidence requests, never authority.

### Out of scope

- Rule inference/learning, account/category preset storage, automatic approval, transfer creation, provider/native/AI work, parser/mapping redesign, migrations that rewrite prior candidates, and production schema deployment.

## Implementation plan

### Architecture fit

The candidate-stage rule domain owns deterministic matching; Direct CSV owns source-specific dry-run and review. The existing authenticated source boundary will prepare rule-aware candidates atomically, then call the unchanged batch approval contract. This preserves one ledger truth and makes source-rule provenance inspectable.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/inbox/direct-csv-import.ts` + test | add rule-aware dry-run normalization and exact evidence fields | pure, testable decision before UI/server work |
| Direct CSV page/route + focused UI test | load explicit rules, render normalized preview/review summary and preserve defaults | user-visible exception-first review |
| Direct CSV server action + action tests | accept paired rule evidence and use atomic source preparation | client input cannot establish rule truth |
| focused Supabase migration + pgTAP | prepare one Direct CSV source batch/candidate set and validate rules atomically | enforce ownership, match/version and rollback below UI |
| board/current memory/PR record | register/close lifecycle truth | required authority and delivery evidence |

### Data and migration impact

- Schema/migration: add only an RPC/wrapper or compatible extension of the existing source-ingestion contract; no new table/policy or backfill.
- Backfill: none; historical candidates and rules are unchanged.
- Compatibility: no-rule/auth-unavailable behavior retains the existing Direct CSV path; Share remains bounded by its own endpoint contract.
- Rollback: revert the focused PR. Existing Direct CSV direct defaults and current rule paths remain available; no source/ledger rewrite is required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Client submits a foreign/stale/non-matching rule | database test proves exact tenant/version/match validation and atomic rollback |
| Rule touches a transfer or parsed category | pure tests prove transfer/category preservation |
| Rule changes before confirmation | authenticated preparation rejects evidence before ledger approval and tells the user to reload/recheck dry-run; no source state exists to recover |
| 5,000-row batch regresses | preserve current cap and use one set-based database operation, never per-row network RPCs |
| User mistakes normalization for auto-posting | explicit preview/review copy and browser assertions |

### Verification plan

- Static: `npm run check:migrations`, `npm run check:knowledge`, `npm run test:ci-policy`, `npm run verify:prepush`.
- Unit/domain: focused Direct CSV/rule/action tests, including counterexamples and TDD red/green record.
- Database: `npm run test:db` plus new pgTAP RLS/atomicity assertions; provider DB check if Docker remains unavailable.
- Browser flow: Direct CSV matching/no-rule/stale-rule recovery on desktop/mobile.
- Responsive/visual: `npm run test:ui-audit:pr` and focused review of preview table/dialog.
- Production/manual: no deployment or provider/production write; post-merge schema activation requires owner-approved separate action.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Register #463 and write the bounded specification/plan | authority resolved | packet, board and `plan:resolve` | complete |
| T2 | Write pure rule-aware Direct CSV failure tests | T1 | observed RED test failure | complete |
| T3 | Implement minimal pure plan and UI preview/review state | T2 | focused green tests | complete |
| T4 | Add authenticated atomic validation/preparation contract | T2 | migration checks + pgTAP (local Postgres unavailable) | complete |
| T5 | Evaluate, run risk-selected gates and create PR record | T3, T4 | exact outputs and PR evidence | in progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-25 | planner | implementer | planned | #463, this packet, main@86ef47a1, focused current-code reconnaissance and two primary sources | database wrapper design still needs TDD and pgTAP | write pure failing rule-aware Direct CSV test |
| 2026-08-26 | implementer | evaluator | evaluating | focused RED/GREEN tests, migration/RLS checks, lint and typecheck | local PostgreSQL and browser-provider evidence still pending | complete selected local gates and create draft PR |

### Current permission boundary

- Granted scope: `branch_write` in `feat/463-direct-csv-rule-preview` and its PR.
- Exact repositories/providers/resources: local MoneyFlow branch plus GitHub issue #463/PR; read-only external documentation research.
- Forbidden writes: `main`, force-push, production/provider schema/data/configuration, secrets and unrelated issue closure.
- Human approval required before: deployment or production schema application.
- Rollback or stop condition: stop if the only safe solution requires new rule semantics, a provider boundary or loss of existing source/ledger atomicity; revert the focused branch to remove the behavior.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Rule-aware dry-run | focused pure test plus Playwright desktop/mobile Direct CSV rule flow | pass |
| Server validation and atomicity | migration identity/RLS checks pass; pgTAP suite added, but local PostgreSQL is unavailable | provider DB check pending |
| Explicit review/accessible mobile UI | focused desktop/mobile Playwright flow passes; existing responsive audits for `/imports/direct` passed at 320px and 360px before full matrix was intentionally stopped | pass for focused evidence |

### Research and adoption evidence

- Selected sources support configuration-first, duplicate-aware import; they do not authorize MoneyFlow auto-posting.
- No new dependency/provider/pattern adoption is proposed.

### Review findings

- Correctness: rule evidence is paired client-side and atomically revalidated before existing batch approval; preview uses the server-read normalized category.
- Security/ownership: migration has `SECURITY DEFINER`, empty `search_path`, authenticated-only execute, tenant account/category checks and reuses the existing rule validator; pgTAP provider evidence remains pending.
- UI/UX/accessibility: textual preview/review state passes focused desktop/mobile browser coverage; no rule match leaves the default category path intact.
- Maintainability/duplication: rule matching remains in the existing domain helper and server authority remains `apply_inbox_rule_to_candidate`.
- Scope compliance: no auto-post, rule inference, remembered financial intent, transfer rule application, provider/native/AI work or production write was added.

### Remaining limitations

- Local PostgreSQL remains unavailable (`LegacyDbConnectError`); exact-head provider database evidence is required.
- Full `npm run test:e2e` had 120 passing cases and four pre-existing CAPTCHA readiness failures on desktop/mobile because `input[name="captchaToken"]` was absent; this slice did not modify auth/CAPTCHA.
- The 698-case UI audit was intentionally stopped after targeted Direct CSV responsive cases passed; do not represent the full matrix as green.

## Delivery record

- Branch: `feat/463-direct-csv-rule-preview`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: none
- Production flow verified: none
- Work packet moved to `docs/plans/completed/`: pending merge and acceptance
