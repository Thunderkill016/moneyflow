# Signal Ledger v3 — archived

Status: retired on 2026-08-02.

Signal Ledger was an exploratory visual direction introduced during the first
full-product refresh. It helped establish useful implementation foundations:

- one semantic token authority;
- independent colours for income, expense, transfer and warning;
- visible keyboard focus;
- readable monetary values;
- reduced-motion support;
- product-owned components without copied external assets.

It is no longer an active product or brand direction.

## Why it was retired

The concept selected a visual language before the public product proposition was
properly researched. Warm paper, graphite, cobalt, editorial headings, numbered
sections and a “financial decision system” narrative became constraints that
landing and authentication content had to serve.

This produced two problems:

1. The public page explained the design concept more strongly than it explained
   MoneyFlow's proven behaviour.
2. Authentication inherited marketing and storytelling that competed with the
   user's immediate task.

Removing the visible Signal Ledger sections alone was not sufficient. The first
revision of PR #208 then became too generic because it removed the concept
without replacing it with a product-specific evidence model.

## What replaces it

The active public-experience brief is:

`docs/design/PUBLIC_EXPERIENCE_RESEARCH_2026.md`

That document starts from MoneyFlow's actual differentiator: balances are built
from distinct income, expense and transfer records, and users can open the
ledger to inspect and correct the data behind a number.

## Token status

`src/app/document-theme.css` remains the semantic theme authority because the
role-based token architecture is useful and stable. Existing colour values are
implementation details, not a named brand doctrine. They may evolve through
future product-wide work, but PR #208 does not redesign authenticated routes.

## Historical note

This file remains in the repository to explain earlier commits and prevent the
same style-first process from being repeated. It must not be cited as the basis
for new public or product-interface work.
