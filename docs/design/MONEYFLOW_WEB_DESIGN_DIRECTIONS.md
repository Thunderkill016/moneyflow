# MoneyFlow web design directions

**Status:** owner review required
**Date:** 2026-08-04
**Scope:** public experience first; authenticated workspace follows after structural selection

These directions apply the merged Webflow, UX Pilot and Framer research. They differ by information hierarchy and user flow, not by color treatment. Current product truth remains fixed: B3.2 logo, Fresh Blue identity, public Light-only routes, workspace theme choice, no invented social proof and no unsupported bank-sync claims.

## Shared success event

A visitor understands what MoneyFlow does, sees credible product evidence, chooses `Tạo sổ`, reaches registration and completes the first useful workspace action.

## Direction A — Proof-first split

### Thesis

Show the product clearly in the first viewport. The value proposition and one large readable product proof share the hero.

### Desktop structure

```text
Header
├─ Brand
├─ Cách hoạt động
├─ Quyền kiểm soát
├─ Đăng nhập
└─ Tạo sổ

Hero 45/55
├─ Copy
│  ├─ Kicker
│  ├─ H1
│  ├─ Lead
│  ├─ Primary CTA
│  ├─ Secondary anchor
│  └─ Trust facts
└─ Product proof
   ├─ One large readable account view
   └─ Two supporting task views

Three-step explanation
Control and trust
Final CTA
Footer
```

### Mobile structure

```text
Copy
Primary CTA
Trust facts
Large product view
Quick capture card
Ledger card
Three steps
Control and trust
Final CTA
```

No screenshot collage on 320–390 px. Every product image becomes a readable task card.

### Strengths

- Fastest route from claim to evidence.
- Builds trust with current product behavior instead of decoration.
- Low implementation risk because it evolves the current landing structure.

### Risks

- Hero can feel dense if the product proof is not cropped carefully.
- Requires disciplined image sizing and performance budgets.

## Direction B — Guided story

### Thesis

Lead with a simple narrative: what the user records, what changes, and how they verify the result.

### Desktop structure

```text
Header
Centered hero
├─ H1
├─ One-sentence explanation
└─ Primary CTA

Story band 01 — Bạn vừa ghi gì?
Story band 02 — Số dư nào thay đổi?
Story band 03 — Con số đến từ đâu?

Trust proof grid
Final CTA
Footer
```

Each story band combines concise copy with one relevant product view.

### Mobile structure

The same sequence remains linear. Each story band becomes one full-width block with copy before product proof.

### Strengths

- Strongest educational flow for first-time finance-app users.
- Makes MoneyFlow's ledger logic understandable without accounting language.
- Excellent fit for content-first design and accessibility.

### Risks

- Product CTA may appear less immediate than Direction A.
- Longer page and more copy require strict editing.

## Direction C — Task-led product tour

### Thesis

Let the visitor begin with a real job: record an expense, inspect a balance, or find a transaction.

### Desktop structure

```text
Header
Hero
├─ Value statement
├─ Primary CTA
└─ Task selector
   ├─ Ghi một khoản chi
   ├─ Kiểm tra số dư
   └─ Tìm lại một giao dịch

Task proof 1
Task proof 2
Task proof 3
Control and trust
Final CTA
Footer
```

### Mobile structure

Task selector becomes tabs or an accessible disclosure. Only one task proof is expanded at a time.

### Strengths

- Most product-led and interactive direction.
- Connects the landing page directly to first-use workspace jobs.
- Creates a reusable content model for onboarding.

### Risks

- Highest interaction and testing cost.
- Tabs/disclosures can hide important content if implemented poorly.
- Requires stronger analytics and usability evidence before full commitment.

## Evaluation matrix

| Criterion | A — Proof-first | B — Guided story | C — Task-led |
|---|---:|---:|---:|
| Understand value quickly | 5 | 4 | 4 |
| Product credibility | 5 | 4 | 5 |
| First-time education | 4 | 5 | 4 |
| Mobile simplicity | 4 | 5 | 3 |
| Implementation risk | 5 | 4 | 2 |
| Future onboarding reuse | 3 | 4 | 5 |

## Recommendation

Select **Direction A** as the next implementation baseline. It preserves the strongest parts of the current landing, fixes the known mobile screenshot problem and gives the clearest path to measurable registration without introducing a new interaction system.

Retain Direction B as the content-order fallback if user review shows the product logic is still unclear. Treat Direction C as a later experiment only after a privacy-safe event baseline exists.

## Owner decision required

Choose one structural direction before high-fidelity redesign:

- A — Proof-first split
- B — Guided story
- C — Task-led product tour

Choosing a direction authorizes annotated mid-fidelity work, not automatic production merge.
