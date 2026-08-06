# MoneyFlow — historical failure register

**Status:** active evidence register
**Baseline:** `main@31fc4e852623ee503ee85a728f4be52d1c874d1b`
**Issue:** #310
**Branch:** `chore/historical-failure-prevention`
**Last updated:** 2026-08-06

## Purpose

This register groups repeated failure signatures into system patterns. It is not a list of every red workflow run. A pattern enters the register only when repository, PR, workflow or artifact evidence supports a reusable lesson.

Classification vocabulary:

- **product regression:** candidate or shipped behavior is wrong;
- **contract drift:** code, test, documentation or CI owners disagree;
- **coverage gap:** the relevant state or property was not measured;
- **harness/infrastructure:** test environment or provider failed without product evidence;
- **authoring error:** an edit damaged unrelated content;
- **inconclusive:** evidence is insufficient and must not be relabeled.

Priority considers recurrence, time loss, blast radius and prevention confidence. No exact incident rate is claimed because the available connector does not expose a complete workflow census.

## Ranked register

| ID | Failure family | Evidence | Class | Earliest detection | Priority | Status |
|---|---|---|---|---|---:|---|
| MF-F01 | Project knowledge depends on exact prose | PR #256; Phase 6/8 marker repairs; PR #309 CI #1906 | contract drift | structured policy test | 1 | implementing |
| MF-F02 | UI ownership changes leave stale source/E2E selectors | PR #147; PRs #306–#309 | contract drift | semantic selector inventory | 2 | partial |
| MF-F03 | Audit queries the wrong DOM property | PRs #157, #163, #169 | false green / coverage gap | mutation proof | 3 | partial |
| MF-F04 | Viewport matrix misses responsive ownership bands | PR #168 | coverage gap | breakpoint-adjacent browser projects | 4 | partial |
| MF-F05 | Raw-source regex confuses formatting with behavior | PRs #204–#205; PR #309 | contract drift | structured/normalized contract | 5 | partial |
| MF-F06 | Shared browser state creates order-dependent failures | PR #147; PR #164 | harness | isolated state fixture | 6 | planned |
| MF-F07 | Broad regex/codemod damages unrelated tests | PR #164 | authoring error | diff/count invariant | 7 | planned |
| MF-F08 | Duplicate domain/runtime authorities drift | PRs #153, #164, #180 | architecture risk | owner/import contract | 8 | partial |
| MF-F09 | Generated Playwright output contaminates lint | PR #168 | harness artifact | output-ignore contract | 9 | known path fixed |
| MF-F10 | Same-SHA pass/fail is classified without enough evidence | PR #207; PR #267 | inconclusive/harness | exact-head artifact comparison | 10 | partial |
| MF-F11 | Security job appears green without authoritative analysis | PR #230; PR #304 audit | false green | workflow topology contract | 11 | fixed on main |
| MF-F12 | Static dead-CSS analysis overclaims runtime reachability | PRs #162, #165, #169 | false positive/negative | live DOM evidence | 12 | report-only |

## Detailed records

### MF-F01 — Project knowledge prose became a machine API

- **Signature:** `check:knowledge` fails after a semantically correct paraphrase or historical wording update.
- **Evidence:** PR #256 records a paraphrased required marker; Phase 6 and Phase 8 preserved exact supersession strings; PR #309 CI #1906 rejected four exact strings while the capability truth was correct.
- **Root cause:** stable structure and volatile prose shared one `content.includes()` contract.
- **Prevention:** `PROJECT_KNOWLEDGE_CONTRACT.json` owns stable headings, references, status assertions and budgets. Markdown remains human/AI explanation.
- **Red proof:** missing structure, malformed limits and hard-budget violations fail. Superseded-claim paraphrases pass.
- **Status:** first slice in PR #311.

### MF-F02 — Stale selectors after UI ownership migration

- **Signature:** source or E2E tests search retired classes, labels or regions after a route moves to a local owner.
- **Evidence:** PR #147 missed some Dashboard label changes; PR #306 replaced several retired transaction selectors; PR #307 retargeted account and transfer contracts.
- **Root cause:** selectors were scattered and coupled to implementation vocabulary.
- **Prevention direction:** inventory all source/browser consumers before retiring an owner; use stable roles or `data-slot`; prove zero active legacy consumers.
- **Status:** partially handled by UI migration contracts; repository-wide guard remains pending.

### MF-F03 — Audit measured the wrong thing and stayed green

- **Signature:** an audit passes while the visible defect exists because its selector or metric does not match live DOM.
- **Evidence:** PR #163 queried `[data-money]` while `MoneyValue` emitted `data-money-value`; PR #157 found a 44px rule under a dead ancestor while controls rendered at 42px; PR #169 removed a green test for dead `.topbar` CSS.
- **Root cause:** tests asserted declarations or assumed selectors instead of observable behavior.
- **Prevention direction:** every new audit records the live selector, measured property and a controlled mutation that makes the test fail.

### MF-F04 — Responsive gap between phone and desktop

- **Signature:** endpoint phone and desktop projects pass while tablet or collapsed-navigation widths fail.
- **Evidence:** PR #168 found five unnamed controls at 768px and 1024px while 390px and 1366px both passed.
- **Root cause:** behavior changed in an intermediate breakpoint band.
- **Prevention direction:** map each responsive ownership band to at least one audit project and cover critical breakpoint edges.

### MF-F05 — Raw-source regex confused wording and formatting

- **Signature:** JSX line wrapping breaks a capability test, or a negative regex rejects a required negated sentence.
- **Evidence:** PRs #204–#205 replaced ambiguous URL substring assertions with exact CSP token lists. PR #309 required “chưa phải bản sao lưu đầy đủ” and also rejected a longer string containing it.
- **Prevention direction:** normalize bounded source checks; prefer exported capability constants or browser-visible semantics; avoid ambiguous substring security assertions.

### MF-F06 — Browser state leaks between specs

- **Signature:** a spec passes alone but fails after another spec against the same demo server/profile.
- **Evidence:** PR #147 recorded shared localStorage between `expense-path` and `global-pfm-ux`; PR #164 recorded a moving local failure that passed in CI.
- **Root cause:** browser-local demo state was not consistently reset.
- **Prevention direction:** one fixture owns cookie/localStorage/indexedDB reset and deterministic seeding; repeat or reverse order before labeling a flake.

### MF-F07 — Broad text edits remove unrelated content

- **Signature:** regex/codemod changes more tests or code than intended while syntax remains valid.
- **Evidence:** PR #164 records a regex edit deleting an unrelated prefs-shape test; an unexpected test-count change exposed it.
- **Prevention direction:** exact anchors or AST-aware edits; codemod manifest; before/after symbol or test-count invariant.

### MF-F08 — Duplicate authorities drift

- **Signature:** date, transfer or transaction rules exist in multiple modules with inconsistent testability.
- **Evidence:** PR #153 centralized transfer mutation ownership; PR #164 centralized “today in Vietnam”; PR #180 separated production transaction contracts from demo fixtures.
- **Prevention direction:** one owner per domain fact, injectable time/identity, architecture import contracts and tracked compatibility retirement.

### MF-F09 — Generated output entered source tooling

- **Signature:** a deliberately failing Playwright run leaves generated files that trigger unrelated lint failures.
- **Evidence:** PR #168 recorded 184 lint errors before the output path was ignored.
- **Prevention direction:** configured test output directories must also appear in lint/source-tool ignore contracts.

### MF-F10 — Flake classification without adequate evidence

- **Signature:** one failed job passes on retry and is immediately called flaky, or one local failure is called a regression despite baseline reproduction.
- **Evidence:** PR #207 SAFE-09 passed on a same-SHA rerun; PR #267 preserved independent shard retry; prior UI work reproduced local failures on baseline while CI passed.
- **Prevention direction:** classification requires SHA identity, retry outcome, trace/artifact and baseline or isolated reproduction where feasible. One retry is evidence, not proof.

## Prevention closure rule

A failure family is not closed merely because the current PR becomes green. Closure requires:

1. a stable signature or counterexample;
2. repository evidence for root cause;
3. prevention at the earliest reliable layer;
4. an executable regression contract proven capable of failing;
5. no reduction in financial, database, browser or security coverage;
6. documented residual risk when automation is unsafe.

Do not automate weak guesses. Dead-CSS reachability, browser-flake classification and provider incidents need evidence from the layer that can actually observe them.

## Next slices

1. Complete MF-F01 exact-head verification.
2. Evaluate a low-noise source-contract hygiene rule for MF-F05.
3. Audit Playwright demo-state ownership for MF-F06.
4. Map responsive breakpoints to audit projects for MF-F04.
5. Add a machine-readable failure-event format only after a reliable Actions collector exists; do not fabricate historical frequencies.
