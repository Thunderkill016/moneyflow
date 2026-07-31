# Enforce the research and AI delivery contract

**Status:** completed  
**Owner:** ChatGPT  
**Issue/PR:** #177  
**Completed:** 2026-08-01

## Outcome

MoneyFlow's repository reference maps are now part of the enforced delivery system. Non-trivial work must begin with a bounded decision question, record selected sources and limitations, and review license, security, privacy, ownership and rollback before adopting a tool, dependency, provider or architecture pattern.

## Decisions preserved

- The existing `AGENTS.md`, AI delivery workflow, work-packet template, PR template and `check:knowledge` gate were extended instead of creating another management framework.
- Two to four focused sources are the default when external research is required.
- A repository appearing in a map is permission to study it, not approval to adopt it.
- Mechanical checks protect files and stable contract markers; human review still judges source quality and applicability.
- Existing historical packets were not retroactively invalidated.

## Acceptance evidence

- `AGENTS.md` links both maps and states the bounded-source rule.
- Research authority, applicability and adoption gates are captured in the workflow and templates.
- `check:knowledge` fails when maps, index links or stable research-contract markers are removed.
- Exact-head CI #697, run `30672086282`, passed verify, database and E2E jobs.

## Delivery record

- Branch: `agent/enforce-research-contract`
- PR: #177
- Squash commit: `f899a97de4b49a47416e523b7bd969b77eb0a88c`
- CI: #697, run `30672086282`, success
- Production deployment: not applicable
- Production flow verified: not applicable
