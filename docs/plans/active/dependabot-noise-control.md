# Dependabot noise control

**Status:** active  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controls merge and acceptance  
**Branch:** `chore/dependabot-noise-control`

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Problem

The initial Dependabot configuration opened nine independent pull requests at once, referenced custom labels that did not exist, split `react` from `react-dom`, and proposed several unreviewed major GitHub Action upgrades.

## Scope

- change npm and GitHub Actions version checks from weekly to monthly;
- cap npm version-update pull requests at two and GitHub Actions at one;
- group `next`, `react`, and `react-dom` minor/patch updates as one web-runtime change;
- group all other npm minor/patch updates as one change;
- group all GitHub Actions updates as one change;
- remove custom labels so GitHub can manage Dependabot's default dependency labels;
- add npm cooldowns so newly released versions are not proposed immediately;
- close the stale one-dependency pull requests created from the previous configuration;
- preserve manual review and keep auto-merge disabled.

## Non-goals

- no dependency version is upgraded in this task;
- no Dependabot pull request is merged;
- no production deployment or provider setting changes;
- no automatic major-version acceptance.

## Verification

- validate the YAML structure against current GitHub Dependabot option names;
- confirm the branch diff contains only this packet and `.github/dependabot.yml`;
- run exact-head CI;
- confirm stale Dependabot pull requests are closed with a supersession explanation;
- stop at `ready_for_review` until the human owner explicitly authorizes merge.

## Rollback

Revert the configuration commit or restore the previous weekly, ungrouped configuration. Closed Dependabot pull requests can be reopened, and the bot can recreate updates on the next configured run.
