# MoneyFlow — historical failure register

**Status:** active evidence register  
**Baseline:** `main@31fc4e852623ee503ee85a728f4be52d1c874d1b`  
**Issue:** #310  
**Branch:** `chore/historical-failure-prevention`  
**Last updated:** 2026-08-06

## Purpose

This register groups repeated failure signatures into system patterns. It is not a list of every red workflow run. A failure enters the register when repository, PR, workflow or artifact evidence supports a reusable lesson.

Classification:

- **product regression:** shipped or candidate behavior is wrong;
- **contract drift:** code, test, documentation or CI owners disagree;
- **coverage gap:** the relevant state or property was not measured;
- **harness/infrastructure:** the test environment or provider failed without product evidence;
- **authoring error:** a change operation damaged unrelated content;
- **inconclusive:** evidence is insufficient and must not be relabeled as product or infrastructure.

Priority is a judgment over recurrence, time lost, blast radius and prevention confidence. It is not a fabricated incident count; the available connector does not expose a complete paginated workflow census.

## Ranked register

| ID | Failure family | Evidence | Classification | Earliest reliable detection | Priority | Prevention status |
|---|---|---|---|---|---:|---|
| MF-F01 | Project knowledge depends on exact prose | PR #256; P6/P8 marker repairs; PR #309 CI #1906 | contract drift | structured policy test | 1 | implementing |
| MF-F02 | UI ownership changes leave stale source/E2E selectors | PR #147; PRs #306–#309 | contract drift | semantic selector inventory + affected browser tests | 2 | partial |
| MF-F03 | Audit queries the wrong DOM attribute/property | PRs #157, #163, #169 | false green / coverage gap | mutation proof + contract test | 3 | partial |
| MF-F04 | Viewport matrix misses a responsive ownership band | PR #168 | coverage gap | breakpoint-adjacent browser projects | 4 | partial |
| MF-F05 | Source-text regex tests confuse formatting with behavior | PRs #204–#205; PR #309 | contract drift | normalized parser/structured capability test | 5 | partial |
| MF-F06 | Shared browser state produces order-dependent failures | PR #147; PR #164 observations | harness/infrastructure | isolated storage fixture + repeat/order test | 6 | planned |
| MF-F07 | Broad regex/codemod edits damage unrelated tests | PR #164; import codemod history | authoring error | count/diff invariant + focused test | 7 | planned |
| MF-F08 | Duplicate domain/runtime authorities drift | PRs #153, #164, #180 | architecture risk | architecture import/owner contract | 8 | partial |
| MF-F09 | Generated Playwright output contaminates lint/source checks | PR #168 | harness artifact | generated-output ignore contract | 9 | done for known path |
| MF-F10 | Same-SHA browser failure is assumed flaky or real without evidence | PR #207 SAFE-09; PR #267 retry topology | inconclusive/harness | exact-head rerun + artifact comparison | 10 | partial |
| MF-F11 | Security job appears green without doing authoritative analysis | PR #230; PR #304 audit | false green | workflow topology contract | 11 | done on main |
| MF-F12 | Static dead-CSS analysis overclaims runtime reachability | PRs #162, #165, #169 | false positive/negative | DOM evidence + screenshot comparison | 12 | report-only by design |

## Detailed records

### MF-F01 — Project knowledge prose became a machine API

- **Signature:** `check:knowledge` fails because a semantically correct sentence was paraphrased or a historical claim changed wording.
- **Evidence:**
  - PR #256 records a first knowledge run failing after a project-contract marker was paraphrased.
  - Phase 6 and Phase 8 required commits preserving exact supersession markers.
  - PR #309 CI #1906 rejected current project memory for four exact strings even though the updated capability truth was correct.
- **Root cause:** `scripts/check-project-knowledge.mjs` mixed stable structure with volatile product prose in one `content.includes()` list.
- **Why existing checks missed the design defect:** the checker correctly detected a missing string but could not distinguish structural contract from wording.
- **Earliest prevention:** JSON schema/shape plus Markdown heading/reference validation.
- **Permanent action:** `PROJECT_KNOWLEDGE_CONTRACT.json` owns machine-readable assertions and budgets; prose remains human/AI explanation.
- **Regression proof:** paraphrasing superseded claims remains green; missing heading and exceeded hard budget remain red.
- **Status:** implementing in issue #310.

### MF-F02 — Stale selectors after UI ownership migration

- **Signature:** unit/source/E2E tests search retired classes, labels or regions after a route moves to a new local owner.
- **Evidence:**
  - PR #147 changed Dashboard labels and structure; CI E2E failed because only some renamed labels had been searched.
  - PR #306 repeatedly replaced `.manager-row`, `.empty-state-actions`, `.transaction-dialog` and other retired selectors with roles or `data-slot` evidence.
  - PR #307 retargeted account and transfer contracts after ownership moved.
- **Root cause:** selectors were scattered and coupled to implementation vocabulary instead of an explicit route evidence contract.
- **Earliest prevention:** affected-spec search before implementation plus stable semantic roles/slots owned by the new route.
- **Permanent action:** inventory source and browser consumers of a retired owner before deletion; add one contract proving legacy selectors have zero active consumers.
- **Status:** partially addressed by Phase 1 and Phase 5–8 migration contracts; cross-PR guard remains planned.

### MF-F03 — Audit measured the wrong thing and stayed green

- **Signature:** audit passes while the visible defect exists because its query or metric does not match rendered behavior.
- **Evidence:**
  - PR #163 found the money audit queried `[data-money]`, while `MoneyValue` emitted `data-money-value`; it also measured clipping but not wrapping or paint spill.
  - PR #157 found a 44px CSS rule under a dead `.app-shell` ancestor while actual controls rendered at 42px.
  - PR #169 removed a green test that guarded dead `.topbar` CSS and described the opposite of the actual topbar.
- **Root cause:** tests asserted source declarations or assumed selectors rather than proving they match live DOM and can fail on a controlled defect.
- **Earliest prevention:** mutation proof: deliberately introduce the prohibited state and verify the audit turns red.
- **Permanent action:** every new visual audit records the live selector, measured property and one red-proof fixture or mutation.
- **Status:** partial; money and target-size audits include stronger measurements, but no generic audit-proof contract yet.

### MF-F04 — Responsive gap between phone and desktop

- **Signature:** phone and desktop pass while tablet/collapsed-navigation widths fail.
- **Evidence:** PR #168 measured five unnamed controls at 768px and 1024px, while 390px and 1366px both had zero.
- **Root cause:** behavior changed within an intermediate breakpoint band that endpoint viewports did not represent.
- **Earliest prevention:** include at least one viewport inside every distinct responsive ownership band and one near critical breakpoints.
- **Permanent action:** derive selected audit projects from actual breakpoint/ownership contracts, not only device popularity.
- **Status:** current cross-device audit includes tablet portrait/landscape, but breakpoint-to-project consistency should be contract-tested.

### MF-F05 — Raw-source regex confused wording and formatting

- **Signature:** JSX line wrapping breaks a capability test, or a negative regex rejects the same phrase required inside a negated sentence.
- **Evidence:** PRs #204–#205 replaced ambiguous URL substring assertions with exact CSP token lists. PR #309 contained a test that required “chưa phải bản sao lưu đầy đủ” and also rejected a longer string containing that phrase.
- **Root cause:** tests treated raw source text as parsed capability state.
- **Earliest prevention:** normalize whitespace for bounded source contracts; prefer exported structured constants or browser-visible semantics.
- **Permanent action:** no new multiline JSX capability test without normalization; no security/capability assertion based on ambiguous substring membership.
- **Status:** PR #309 repaired locally; broader prevention planned.

### MF-F06 — Browser state leaks between specs

- **Signature:** a spec passes alone but fails after another spec against the same server/profile.
- **Evidence:** PR #147 records `global-pfm-ux` failing after `expense-path` because demo localStorage was reused; it passed in isolation and CI used a fresh run. PR #164 records a moving local E2E failure that passed on CI.
- **Root cause:** browser-local demo state and server lifetime were not consistently reset at spec boundaries.
- **Earliest prevention:** one fixture owns localStorage/indexedDB/cookie reset and deterministic demo seeding.
- **Permanent action:** add order-reversal/repeat evidence for stateful suites before labeling a failure flaky.
- **Status:** planned; do not add blind retries.

### MF-F07 — Broad text edits remove unrelated content

- **Signature:** regex/codemod changes more tests or code than intended while syntax remains valid.
- **Evidence:** PR #164 records a regex edit deleting an unrelated prefs-shape test; the unexpected test-count drop exposed it. Earlier import work preserved codemod output for the same reason.
- **Root cause:** structural code was edited as undifferentiated text without an explicit changed-symbol/file invariant.
- **Earliest prevention:** inspect diff and assert expected test/file count deltas before accepting the edit.
- **Permanent action:** codemods produce a manifest; destructive regex edits require exact anchors and a before/after count or AST-aware alternative.
- **Status:** planned.

### MF-F08 — Duplicate authorities drift

- **Signature:** the same date, transfer or transaction contract exists in multiple modules with inconsistent testability.
- **Evidence:** PR #153 centralized client transfer mutation ownership; PR #164 centralized “today in Vietnam”; PR #180 separated production transaction contracts from demo fixtures.
- **Root cause:** local convenience copies became implicit authorities.
- **Earliest prevention:** architecture checks on imports/owners and domain helpers with injectable time/identity.
- **Permanent action:** one owner per financial/domain fact; compatibility barrels are transitional and zero-consumer retirement is tracked.
- **Status:** several families fixed and architecture-locked.

### MF-F09 — Generated test output entered lint scope

- **Signature:** a deliberately failing Playwright run leaves generated code that creates unrelated lint errors.
- **Evidence:** PR #168 records 184 lint errors from generated output before `output/**` was ignored.
- **Root cause:** artifact directories and source directories shared tool discovery scope.
- **Earliest prevention:** lint/config contract requiring all configured test output directories to be ignored.
- **Status:** known path fixed; config-to-ignore consistency remains a possible follow-up.

### MF-F10 — Flake classification without adequate evidence

- **Signature:** one failed browser job passes on retry and is immediately called flaky, or one local failure is called a regression despite baseline reproduction.
- **Evidence:** PR #207 SAFE-09 passed on a same-SHA rerun; PR #267 preserved independent shard retry; PR #158 reproduced a local failure on the baseline and CI passed.
- **Root cause:** outcome labels were assigned before comparing SHA, trace, state and baseline.
- **Earliest prevention:** classification requires exact-head identity, retry result, trace/artifact and baseline or isolated reproduction when feasible.
- **Permanent action:** preserve `product`, `harness`, `provider`, `inconclusive` as separate statuses; one retry is evidence, not proof of flakiness.
- **Status:** operational policy exists; durable machine-readable incident census remains future work.

## Prevention rules

A recurring failure is not “closed” merely because the current PR is green. Closure requires:

1. a stable signature or counterexample;
2. repository evidence for the root cause;
3. prevention at the earliest reliable layer;
4. a regression test or executable contract proven capable of failing;
5. no reduction in financial, database, browser or security coverage;
6. a documented residual risk or reason automation is unsafe.

Do not automate weak guesses. Dead-CSS reachability, browser flake classification and production/provider incidents require evidence that their layer can actually observe.

## Next prevention slices

1. Complete MF-F01 structured project-knowledge contract.
2. Add a bounded source-contract hygiene checker for multiline JSX/ambiguous negative assertions only if repository examples can be detected without false positives.
3. Audit Playwright demo-state reset ownership and add isolation evidence for MF-F06.
4. Map responsive breakpoints to audit projects for MF-F04.
5. Define a machine-readable failure-event format only after a reliable Actions collector is available; do not fabricate historical frequencies from incomplete connector results.
