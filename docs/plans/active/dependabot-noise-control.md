# Dependabot noise control

**Status:** active  
**Execution state:** ready_for_review  
**Active role:** human owner  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controls merge and acceptance  
**Branch:** `chore/dependabot-noise-control`  
**PR:** #197

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Repository reconnaissance

The initial `.github/dependabot.yml` ran npm and GitHub Actions checks weekly, allowed up to eight simultaneous version-update pull requests, and specified custom `dependencies` and `security` labels. The repository did not contain the requested `dependencies` label, so Dependabot reported a configuration warning on every generated pull request.

The first run opened nine independent pull requests (#185–#193). They were based on an older `main`, split `react` from `react-dom`, and included several unreviewed major GitHub Actions upgrades.

## Research

The current GitHub Dependabot reference confirms:

- `schedule.interval: monthly` is supported;
- `open-pull-requests-limit` bounds open version-update pull requests;
- `groups` combines matching dependency updates into one pull request;
- group `update-types` accepts `major`, `minor`, and `patch`;
- `cooldown` delays version updates without delaying security updates;
- omitting custom `labels` restores GitHub-managed default Dependabot labels.

## Specification

### Required outcome

Dependabot remains enabled but becomes low-noise, grouped, and manually reviewed.

### Acceptance criteria

- npm and GitHub Actions checks run monthly in the Vietnam timezone;
- at most two npm version-update PRs and one GitHub Actions version-update PR are open;
- `next`, `react`, and `react-dom` minor/patch updates are proposed together;
- all other npm minor/patch updates are grouped together;
- all GitHub Actions updates are grouped together;
- newly released npm versions observe a cooldown;
- no custom missing labels are requested;
- auto-merge remains disabled;
- old one-dependency PRs are closed without merging any dependency update;
- exact-head CI passes before merge.

### Non-goals

- no dependency version upgrade;
- no automatic major-version acceptance;
- no provider, deployment, schema, or production-data change.

## Implementation plan

1. Replace the weekly, high-limit configuration with monthly grouped updates.
2. Remove custom labels and preserve the `deps` commit prefix.
3. Add npm cooldowns for major, minor, and patch releases.
4. Open a focused configuration PR from current `main`.
5. Close #185–#193 as superseded, with explicit comments that no update was accepted.
6. Run full exact-head CI and resolve any repository-contract failures.
7. Stop at `ready_for_review` for owner-controlled merge.

## Tasks

- [x] Update `.github/dependabot.yml`.
- [x] Open PR #197 from current `main`.
- [x] Close #185–#193 as superseded and unmerged.
- [x] Confirm there are no remaining open Dependabot PRs.
- [x] Run CI #804 and diagnose the knowledge-contract failure.
- [x] Add all required work-packet sections.
- [x] Pass full CI #805 after the correction.
- [x] Move to `ready_for_review` after CI is green.

## Evaluation

### Evidence

- branch diff is limited to `.github/dependabot.yml` and this work packet;
- all nine old Dependabot PRs are closed and none was merged;
- an open-PR search for `dependabot[bot]` returns no results;
- CI #805, run `30703411379`, passed knowledge, deployment, CSS and architecture contracts; lint; typecheck; unit/static RLS; production build; fresh Supabase reset and pgTAP; Auth/expense browser smoke; production cross-device audit; and evidence upload;
- this final state-only packet update must receive its own exact-head CI before merge.

### Merge gate

The human owner must review PR #197 and explicitly authorize merge after exact-head CI on this revision is green.

## Rollback

Revert the configuration commit or restore the previous weekly, ungrouped configuration. Closed Dependabot pull requests can be reopened, and Dependabot can recreate updates on a later configured run.
