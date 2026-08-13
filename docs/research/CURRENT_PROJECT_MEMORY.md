# MoneyFlow — current project memory

**Status:** the single current implementation-status authority
**Last reconciled:** 2026-08-13
**Current main baseline:** `4ba1864ccadfdd4d8363815ba2a9eafc1a373c88` (`#367` merged)
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

`docs/plans/active/public-beta-trust.md` owns that program order. Repository Resets
1–2, A0 Historical UI / Design Failure Review, Phase A Current Reality / Authority
Audit, Phase B product-experience research, **Phase C Product Experience
Architecture** and **Phase D Brand Strategy** are accepted/completed in merged or
staged-completed records. **Phase E Creative Territories** is the immediate next
phase, is not started and has no packet. The later Brand/Product Experience rebuild
is not started.

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
| Experience | responsive light/dark web UI; Phase C Product Experience Architecture and Phase D Brand Strategy are accepted/completed, while Phase E Creative Territories is immediate next but not started/no packet, no territory is proposed or selected, and the later Brand/Product Experience rebuild is not started |

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
- Phase B product-experience research is accepted/completed in merged #366 at
  `main@60f91b7`. Phase C Product Experience Architecture is accepted/completed in
  merged #367 at `main@4ba1864`.
- **Phase D Brand Strategy is accepted/completed** in its staged completed record, with
  the durable authority at `docs/research/PHASE_D_BRAND_STRATEGY.md`. It locks audience,
  role, positioning, promise hierarchy, differentiation, trust builders/breakers,
  personality, Vietnamese verbal principles, controlled vocabulary, anti-positioning and
  proof architecture, and makes **no** visual decision. Earlier brand/design material is
  input only: Signal Ledger v3 stays rejected, Calm Ledger v2 stays historical, and only
  four named elements of the brand guidelines are promoted.
- **Fresh Blue (owner decision, 2026-08-13):** released as a constraint on Phase E
  exploration — territories need not preserve it — while remaining the **current shipped
  colour implementation truth** until a later owner-selected territory and approved
  migration supersede it. Selects no palette or territory; authorises no runtime, CSS,
  token or UI change. Recorded in `docs/design/DESIGN_DIRECTION_STATUS.md`.
- **Brand claim ceiling:** claim a property the product enforces, never a verification
  that has not happened. Bounds today: hosted restore has never run against a live
  account; no aggregate yet links to its records, so traceability is a target, not a
  shipped drill-down; and direct CSV import writes approved rows without the Inbox
  queue. Provenance contract: a record comes from deliberate user entry **or** data the
  user supplied and accepted — manual capture is the default identity, direct CSV is
  secondary. Traceability is claimed only for **ledger-derived** figures, never for
  planning projections, demo samples or counts. The physical-phone run **is** accepted
  (PBT-AC12).
- Phase E Creative Territories is immediate next, not started and has no packet; no
  creative territory is proposed or selected; implementation remains not started.
- The owner public-beta decision is blocked on the ordered work above and remains
  the only PBT-AC15 closure authority.

## 9. Open pull-request memory

No historical PR record is loaded by default. Read
`docs/research/PR_MEMORY_LOG.md` to locate a named PR, then open only
`docs/research/pr-memory/YYYY/QN/PR-<number>.md`. An open or unmerged record is
candidate evidence, never current truth.

## 10. True gaps after this audit

1. Separately start Phase E Creative Territories only after this exact Phase D delivery
   head merges, and only when authorised. Phase E produces three territories; it does
   not select one.
2. Keep Phase E bounded to producing three distinct territories for owner selection; do
   not select one, and do not begin implementation.
3. Execute Brand/Product Experience B→J only in later approved packets.
4. Perform final physical/device visual QA on that rebuilt experience.
5. Obtain the owner’s public-beta decision and record accepted limitations.

## 11. Next allowed action

After this exact Phase D delivery head merges, separately open Phase E Creative
Territories only when authorised, and only to produce three territories for owner
selection. Do not begin implementation, modify Design Harness, or make
provider or production changes without a new bounded authorisation.

## 12. Superseded-status register

- “P3 Prove is open” and “P4 Improve is next” are superseded. P3 is accepted;
  Repository Reset 1 is accepted and Repository Reset 2 precedes Brand/Product
  Experience.
- “Repository Reset 1, Reset 2, A0, Phase A, Phase B, Phase C or Phase D is the current
  task” is superseded by completed packets; Phase E Creative Territories is immediate
  next but not started/no packet, no territory is proposed or selected, and
  implementation remains not started.
- “The four P3 physical-phone remediations are unverified on hardware” is superseded:
  PBT-AC12 is accepted, PP-12 passes after #358, and PP-01 plus the presentation
  findings remain parked.
- The prior seven-day self-use gate is withdrawn; no duration substitute exists.
- Historical packets in `docs/plans/archived/` are not active work and never imply
  acceptance. Historical UI evidence remains available for A0 review.
- `reports-no-comparison-or-trends` and `import-integrity-future-work` are historical
  claim identifiers retained only for the knowledge contract’s compatibility checks.
