# MoneyFlow — current project memory

**Status:** the single current implementation-status authority
**Last reconciled:** 2026-08-13
**Current main baseline:** `c248176b6ab60b8acf331b5f6e9a2c7908f724ac` (`#363` merged)
**Routing:** use `docs/context/README.md`; open
`docs/research/pr-memory/YYYY/QN/PR-<number>.md` only for a named provenance need.

## 1. Current decision

MoneyFlow is a released functional MVP: a Vietnamese, manual-first personal
income-and-expense ledger. The product principles, financial invariants and released
scope are authoritative in `docs/product/PRINCIPLES.md`; code, migrations and tests
outrank this summary on implementation facts.

The repository is **not public-beta ready**. MoneyFlow Trust Provider Sync, P1 Secure,
P2 Recover and P3 Prove are accepted. P3 is based on owner-observed physical-phone
acceptance, not a signed/filed evidence run. The exact program order is:

> A0 Historical UI / Design Failure Review → Phase A Current Reality / Authority Audit
> → Brand/Product Experience rebuild B→J → final physical/device
> visual QA → owner public-beta decision.

`docs/plans/active/public-beta-trust.md` owns that program order. The active-packet
registry lists the Trust parent and its deliberately started A0 child: Repository
Resets 1–2 are accepted/completed by merged #360 and #362. A0 Historical UI / Design
Failure Review is active/current under its own packet; no Brand/Product Experience
implementation has started.

## 2. Current runtime and trust boundaries

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit
  browser-local exploration. Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced movements, not income or expense;
  destructive ledger actions are recoverable and tenant ownership is enforced below
  the UI.
- The complete archive capability is at `/settings/backup`, distinct from report
  export. Hosted export was accepted; hosted restore was never executed and remains
  an owner-accepted limitation. See the completed Recover packet for evidence.
- The Supabase project is MoneyFlow-only; the historical Atoryn cleanup migration is
  removal evidence, not an active subsystem.
- Provider configuration, production data and deployment writes require a new
  scoped owner approval. `npm run agent:doctor` reports policy but grants none.

## 3. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit, soft delete/recovery |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Ownership | complete versioned archive/export/validation/restore contract; hosted restore limitation remains |
| Experience | responsive light/dark web UI; Brand/Product Experience rebuild is next, not implemented |

## 4. MoneyFlow Trust and physical-device truth

| Gate | Current result |
|---|---|
| PBT-AC12 physical core-ledger run | accepted — PP-03, PP-12 and PP-16 pass; PP-07 functional pass with a parked presentation finding |
| PBT-AC13 duration gate | withdrawn by owner; no replacement streak/count |
| PBT-AC14 daily-loop blockers | accepted — no unresolved P0/P1 blocker; PP-01 performance and PP-07 presentation remain parked findings |
| PBT-AC15 final public-beta decision | open — no public-beta-ready claim |

Completed evidence is routed through:

- `docs/plans/completed/2026-08-12-moneyflow-trust-prove.md`;
- `docs/plans/completed/2026-08-12-moneyflow-trust-recover.md`;
- `docs/plans/completed/2026-08-11-account-deletion-recent-auth.md`;
- `docs/plans/completed/2026-08-11-moneyflow-trust-provider-sync.md`.

## 5. Current capability inventory details

The inventory above is deliberately summary-level. For a product-gap or future-module
decision, route through `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md` and
`docs/research/PRODUCT_COMPETITIVE_MEMORY.md`; neither is an immediate execution
plan. The long-term vision is input, not permission to bypass the current sequence.

## 6. Presentation and brand input

The upcoming A0 Historical UI Failure Review must retain lessons from
`docs/research/UI_UX_RESEARCH_LEDGER.md`,
`docs/research/UI_OPEN_WORK_DISPOSITION_2026-08-05.md`, and the completed UI-system
migration packets. Existing brand, UX, design-system and wireframe documents are
reusable inputs or historical evidence unless a future approved packet names them as
current design authority.

## 7. Configuration and delivery truth

- `docs/configuration.md` owns environment-variable and provider-setting contract.
- `docs/deployment.md` owns branch/deployment workflow; `.env.example`, `vercel.json`
  and `scripts/check-deployment-env.mjs` are executable/supporting truth.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classification and
  selected gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns execution states,
  handoffs and permission scopes.
- `scripts/classify-ci-changes.mjs` solely maps paths to CI gates;
  `scripts/agent-policy.mjs` is the machine-readable projection of delivery policy.

## 8. Reconciled issue status

- P3 Prove is accepted and archived; do not reopen it from old seven-day/P4 wording.
- Repository Resets 1–2 are accepted/completed. Reset 2 retired only 13
  evidence-proven unowned source/assets in merged #362 and did not authorize Brand/UI
  work.
- A0 Historical UI / Design Failure Review is active/current. It is a retrospective,
  not a UI redesign or Design Harness implementation.
- Phase A Current Reality / Authority Audit follows accepted A0. It is not started and
  has no packet.
- The owner public-beta decision is blocked on the ordered work above and remains
  the only PBT-AC15 closure authority.

## 9. Open pull-request memory

No historical PR record is loaded by default. Read
`docs/research/PR_MEMORY_LOG.md` to locate a named PR, then open only
`docs/research/pr-memory/YYYY/QN/PR-<number>.md`. An open or unmerged record is
candidate evidence, never current truth.

## 10. True gaps after this audit

1. Complete the active A0 historical UI/design failure review and durable guardrails.
2. Separately start Phase A Current Reality / Authority Audit.
3. Execute Brand/Product Experience B→J only in later approved packets.
4. Perform final physical/device visual QA on that rebuilt experience.
5. Obtain the owner’s public-beta decision and record accepted limitations.

## 11. Next allowed action

Complete the active A0 retrospective only: inspect historical evidence and record
guardrails. Do not implement Brand/UI work, modify Design Harness, or make provider or
production changes.

## 12. Superseded-status register

- “P3 Prove is open” and “P4 Improve is next” are superseded. P3 is accepted;
  Repository Reset 1 is accepted and Repository Reset 2 precedes Brand/Product
  Experience.
- “Repository Reset 1 or 2 is the current task” is superseded by #360/#362 completed
  packets; A0 retrospective is active, while implementation and Phase A are not
  started.
- The prior seven-day self-use gate is withdrawn; no duration substitute exists.
- Historical packets in `docs/plans/archived/` are not active work and never imply
  acceptance. Historical UI evidence remains available for A0 review.
- `reports-no-comparison-or-trends` and `import-integrity-future-work` are historical
  claim identifiers retained only for the knowledge contract’s compatibility checks.
