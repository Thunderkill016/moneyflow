## Problem and outcome

<!-- What user/system problem is solved? Describe the outcome, not only files changed. -->

## Work packet / source of truth

<!-- Link docs/plans/active/<slug>.md, or explain why this is a tiny mechanical change. -->

## Repository reconnaissance and research

- Existing implementation reused:
- Relevant tests/history reviewed:
- Decision question researched:
- Reference map consulted:
- Selected sources (two to four by default):
- What those sources establish:
- Important source limits or patterns intentionally not copied:
- Important unknowns or assumptions:

### Tool, dependency or architecture adoption

<!-- Write Not applicable when the PR adds no tool, dependency, provider, service, framework or architecture pattern. -->

- Observed problem and simpler alternatives:
- License/code-reuse compatibility:
- Secrets, user-data and privacy exposure:
- Runtime/deployment/operational ownership:
- Migration, rollback and removal condition:

## Changes

- 

## Scope boundaries

- Intentionally not changed:
- Follow-up work, if any:

## Verification evidence

- [ ] `npm run check:knowledge`
- [ ] `npm run check:deployment-env`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Supabase reset + pgTAP, when database behavior can be affected
- [ ] Browser smoke, when user flows can be affected
- [ ] Cross-device/visual audit, when UI can be affected
- [ ] Screenshot or artifact reviewed, when UI can be affected

Evidence/CI links:

## Product, financial and security review

- [ ] Acceptance criteria are observable and satisfied.
- [ ] Research scope was bounded and selected sources remain applicable to the final diff.
- [ ] Studied repositories did not silently expand product or architecture scope.
- [ ] Any new tool/dependency/pattern passed license, security, ownership and rollback review, or is not applicable.
- [ ] No missing financial data was guessed.
- [ ] Integer VND and transfer invariants remain intact.
- [ ] Ownership/RLS implications were reviewed.
- [ ] Loading, empty, populated, error and recovery states were considered.
- [ ] Mobile, long-data and accessibility behavior were considered.
- [ ] No unrelated refactor or feature expansion is included.

## Deployment

- Production verification steps:
- Exact affected route/flow:
- Work packet destination after merge: `docs/plans/completed/...`
