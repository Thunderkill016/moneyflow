# MoneyFlow web design selection

**Date:** 2026-08-04
**Owner decision:** Direction B — Guided story
**PR:** #282
**Status:** selected for annotated mid-fidelity and bounded implementation

## Decision

The MoneyFlow owner selected **Direction B — Guided story** after reviewing the three coded responsive alternatives.

Direction B becomes the structural authority for the public-entry redesign. Direction A and Direction C remain rejected alternatives for this slice and must not be silently mixed back into implementation.

## Selected structure

```text
Header
Centered hero
├─ Clear value proposition
├─ One-sentence explanation
├─ Primary CTA
└─ Compact trust facts

Story 01 — Bạn vừa ghi gì?
├─ Explain income, expense and internal transfer
└─ Show quick-capture product proof

Story 02 — Số dư nào thay đổi?
├─ Explain account-specific balance change
└─ Show account product proof

Story 03 — Con số đến từ đâu?
├─ Explain traceability and correction
└─ Show transaction-ledger product proof

Control and trust
Final CTA
Footer
```

## Why B was selected

- It explains MoneyFlow's ledger model without accounting terminology.
- It gives first-time finance-app users the clearest learning sequence.
- The same content order works naturally on desktop and mobile.
- It avoids the dense first viewport of Direction A.
- It avoids the interaction and analytics cost of Direction C.

## Implementation contract

- Preserve B3.2 logo geometry and the current Fresh Blue semantic authority.
- Keep public routes Light-only and preserve workspace theme selection.
- Use real MoneyFlow test-environment product media only.
- Keep one primary action per viewport.
- Use the story order `ghi → tài khoản thay đổi → mở sổ kiểm tra`.
- On 320–390 px, every story becomes one linear full-width block with copy before product proof.
- Make authentication supporting copy mode-specific in the same bounded public-entry slice.
- Do not add bank sync, AI advice, invented social proof, savings claims or unsupported performance claims.
- Do not change financial, database, authentication-provider or production-data behavior.

## Rejected alternatives

### A — Proof-first split

Rejected for this slice because the first viewport remains comparatively dense and gives less room to teach the ledger logic.

### C — Task-led product tour

Rejected for this slice because it adds interaction, hidden-state and measurement costs before a privacy-safe conversion baseline exists.

## Next gate

1. Produce annotated mid-fidelity for Direction B in the existing React/CSS stack.
2. Apply it to the real landing/auth branch surfaces.
3. Remove temporary A/B/C preview routes before merge.
4. Run exact-head static, unit, build, Chromium/WebKit and responsive checks.
5. Obtain owner visual approval before merge.

This decision authorizes branch implementation and review. It does not authorize automatic merge or production rollout.
