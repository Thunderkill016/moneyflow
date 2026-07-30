# MF CONTROL-01 — Project Truth Reconciliation

**Status:** active  
**Owner:** MoneyFlow  
**Master issue:** #148  
**Started:** 2026-07-30

## Outcome

Remove false work-in-progress and restore one reliable development queue before the next implementation initiative starts.

GitHub issues and pull requests own dynamic work status. Repository documents own durable product truth, architecture boundaries, decision rationale and delivery evidence. This packet is a temporary handoff for #148, not a second backlog.

## Confirmed finding

`docs/plans/active/mf-safe-ux.md` is stale. It says authenticated owner acceptance is pending, while master issue #134 is closed as completed after PR #146, CI #559, production deployment and real-phone owner acceptance.

## Scope

1. Move MF SAFE-UX from `active/` to `completed/` and record the final accepted delivery.
2. Clarify the active-packet lifecycle so a closed master issue cannot remain represented as active work.
3. Keep the development queue in issue #148 instead of copying changing issue state into another Markdown status file.

## Non-goals

- No runtime, financial-domain, database, Auth, RLS or production change.
- No repo-wide documentation reorganization.
- No new label or milestone taxonomy.
- No ADR for status cleanup.
- No implementation of #145, #72, #53 or #40.
- No merge, close or redesign of draft logo PR #119.

## Queue at start

- **NOW:** #148 — complete this reconciliation.
- **NEXT:** #145 — diagnose and fix the shared desktop dialog regression.
- **FOLLOW-UP:** rescope only the still-valid remainder of #72; then run the trusted daily-ledger verification loop.
- **LATER:** split the uncompleted portions of #53 only when one becomes a deliberate initiative.
- **BLOCKED/EXTERNAL:** #40 Supabase managed setting/plan constraint.
- **PARKED:** PR #119 and unrelated feature/redesign work.

## Tasks

- [x] Compare current open issues, open PRs, active packets and completed delivery history.
- [x] Confirm #134 owner acceptance and completed state.
- [ ] Create the completed MF SAFE-UX packet with final delivery evidence.
- [ ] Remove the stale active MF SAFE-UX packet.
- [ ] Clarify the lifecycle rule in `docs/plans/active/README.md`.
- [ ] Open a focused draft PR linked to #148.
- [ ] Run or obtain CI evidence for the documentation contracts.
- [ ] Merge only after owner review, then close #148.

## Acceptance criteria

- `docs/plans/active/` contains only deliberately active work.
- No current packet claims #134 still awaits owner acceptance.
- The completed MF SAFE-UX record names PR #146, merge commit, CI, production deployment and accepted residual risk.
- Dynamic queue status remains in GitHub rather than being duplicated across multiple Markdown files.
- The diff is small, documentation-only and independently reviewable.

## References

- Master issue: #148
- Completed initiative: #134
- Final remediation: PR #146
- Next implementation issue: #145
