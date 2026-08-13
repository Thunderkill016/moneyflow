# MoneyFlow — current project memory

**Status:** the single current implementation-status authority
**Last reconciled:** 2026-08-13
**Current main baseline:** `efaba75ddb55d9835c0a21bc6d578a7344db74f0` (`#365` merged)
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

> Phase A Current Reality / Authority Audit → Phase B product-experience research
> → Phase C Product Experience Architecture → Brand/Product Experience rebuild B→J
> → final physical/device
> visual QA → owner public-beta decision.

`docs/plans/active/public-beta-trust.md` owns that program order. After this PR merges,
the active-packet registry lists only its Trust parent: Repository Resets 1–2, A0
Historical UI / Design Failure Review, Phase A Current Reality / Authority Audit and
Phase B product-experience research are accepted/completed. **Phase C Product
Experience Architecture** is immediate next, deliberately not started and has no
packet; Brand/Product Experience implementation is also not started.

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
| Experience | responsive light/dark web UI; Phase C Product Experience Architecture is immediate next, while the later Brand/Product Experience rebuild is not started |

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

The accepted A0 Historical UI / Design Failure Review retains lessons from
`docs/research/A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md`. Existing brand, UX,
design-system and wireframe documents remain reusable inputs or historical evidence
unless a future approved packet names them as current design authority.

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
- A0 Historical UI / Design Failure Review is accepted/completed; its durable
  guardrails are at `docs/research/A0_HISTORICAL_UI_DESIGN_FAILURE_REVIEW.md`.
- Phase A Current Reality / Authority Audit is accepted/completed in
  `docs/plans/completed/2026-08-13-phase-a-current-reality-authority-audit.md`.
- Phase B product-experience research is accepted/completed in
  `docs/plans/completed/2026-08-13-phase-b-product-experience-research.md` after this
  PR merges. Phase C is immediate next, deliberately not started and has no packet.
- The owner public-beta decision is blocked on the ordered work above and remains
  the only PBT-AC15 closure authority.

## 9. Open pull-request memory

No historical PR record is loaded by default. Read
`docs/research/PR_MEMORY_LOG.md` to locate a named PR, then open only
`docs/research/pr-memory/YYYY/QN/PR-<number>.md`. An open or unmerged record is
candidate evidence, never current truth.

## 10. True gaps after this audit

1. Deliberately start Phase C Product Experience Architecture only when authorised.
2. Execute Brand/Product Experience B→J only in later approved packets.
3. Perform final physical/device visual QA on that rebuilt experience.
4. Obtain the owner’s public-beta decision and record accepted limitations.

## 11. Next allowed action

Phase C Product Experience Architecture is the immediate next phase but is deliberately
not started and has no packet. Do not begin it, implement Brand/UI work, modify Design
Harness, or make provider or production changes without a new bounded authorisation.

## 12. Superseded-status register

- “P3 Prove is open” and “P4 Improve is next” are superseded. P3 is accepted;
  Repository Reset 1 is accepted and Repository Reset 2 precedes Brand/Product
  Experience.
- “Repository Reset 1, Reset 2, A0, Phase A or Phase B is the current task” is
  superseded by completed packets; Phase C is immediate next but remains not started
  and implementation remains not started.
- The prior seven-day self-use gate is withdrawn; no duration substitute exists.
- Historical packets in `docs/plans/archived/` are not active work and never imply
  acceptance. Historical UI evidence remains available for A0 review.
- `reports-no-comparison-or-trends` and `import-integrity-future-work` are historical
  claim identifiers retained only for the knowledge contract’s compatibility checks.
