# Archive — history, not authority

**Nothing in this directory is authority.** Not for the product, not for design, not for
engineering practice. It is kept because it explains how decisions were reached, and
because deleting it would leave dangling references across the documentation.

If a file here contradicts current code, `docs/plans/active/README.md`, or
`docs/research/CURRENT_PROJECT_MEMORY.md`, the current source wins without discussion.

## What is here and why it moved

**Design-tool research** — `WEBFLOW_DESIGN_CATEGORY_*` (five files),
`FRAMER_DESIGN_CORPUS_INVENTORY.md`, `UXPILOT_DESIGN_CORPUS_INVENTORY.md`,
`WEB_DESIGN_PROCESS_CONVERGENCE.md`. Research into design-tool categories that a
Vietnamese manual-first expense ledger does not act on.

**Dated one-off UI phase records** — seven documents from 2026-08-05 to 2026-08-08
capturing a migration that has since completed. Point-in-time snapshots, not contracts.

**Another product's cycle report** — `moneyflow-a2-readiness-2026-07-25.md` came from the
CycleWarden agent framework rather than from this project's own lifecycle.

## What deliberately stayed put

`docs/design/CALM_LEDGER_V2.md` and `docs/design/SIGNAL_LEDGER_V3.md` are both
superseded design directions and belong here by every documentation argument. They are
**not** here, because they are load-bearing for code: `SIGNAL_LEDGER_V3.md` is read
directly by three files under `src/` and `CALM_LEDGER_V2.md` by one. A first attempt at
this move broke two tests for exactly that reason.

Archiving them means updating those tests, which is a code change and deserves its own
review rather than riding along with a documentation move. The lesson generalises:
inbound **code** references have to be checked, not only documentation links.

## Why archived rather than deleted

Git holds the history either way, so deletion would not have destroyed anything. But
these files reference one another and are referenced from live documents —
`WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md` alone had nine inbound references. Deleting them
would have left broken links across the documentation and given a false impression that
the reasoning never existed.

The problem was never that history existed. It was that a reader could not tell history
from authority at a glance. This directory is that boundary, made explicit.

See `docs/product/REORIENTATION_2026-08.md` for the measurement that prompted the move.
