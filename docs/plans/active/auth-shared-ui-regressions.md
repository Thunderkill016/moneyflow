# Auth and shared-UI regressions (reconciled from PR #334)

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** agent (implementer/evaluator) → human_owner (merge decision)
**Issue/PR:** supersedes the #334 handoff; PR pending
**Last updated:** 2026-08-11

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Close the Auth and shared-UI regressions that are still real on `main@cd109cb`,
so MoneyFlow Trust Secure acceptance is not blocked by password-entry ergonomics,
an unowned account menu, or an unverified amount-visibility claim.

## Repository reconnaissance

### Reconciliation of #334, fresh-verified on `main@cd109cb`

#334 is a draft handoff written against older `main`. Each finding was
re-verified against current source, the ownership gate, and the browser.

| Finding | Verdict | Evidence |
|---|---|---|
| **BUG-A** password fields lack reveal | **STILL REPRODUCES** | `auth-form.tsx` rendered one plain `<input type="password">`; no toggle anywhere |
| **BUG-B** registration has no confirm | **STILL REPRODUCES** | zero `confirmPassword` in the repo; `registerSchema` accepted `fullName/email/password/privacyAccepted` only |
| **BUG-C** onboarding unstyled | **FIXED BY #337** | `onboarding-flow.module.css` exists, 38 `styles.*` bindings, contract green |
| **BUG-D** account dropdown unstyled | **STILL REPRODUCES** | 5 classes recorded as unowned debt in the ownership baseline; menu unreachable from demo suites because `UserChip` renders a plain chip for a demo viewer |
| **BUG-E** amount invisible while typing | **NOT REPRODUCED** | measured across 320/390/desktop × light/dark — see below |
| **BUG-F** wider shared-popup class | **PARTIALLY — one root cause found** | the shared owner gap was the dropdown; no second unrelated defect surfaced in the bounded sweep |

BUG-C and BUG-E were removed from implementation scope rather than carried as
stale acceptance criteria.

### BUG-E measurement (why no code was written for it)

Typed `1250000` into the add-transaction amount field, 6 combinations:

```
320/light   value="1.250.000"  color=#101828  fill=#101828  opacity=1  caret=#101828
320/dark    value="1.250.000"  color=#f8fafc  fill=#f8fafc  opacity=1  caret=#f8fafc
390/*       same, rect 303x45, clientW==scrollW (no clipping)
desktop/*   same, font 34px, rect 531x57
```

`scrollWidth == clientWidth` everywhere, `docOverflow = 0`, `-webkit-text-fill-color`
matches `color` in both themes. Nothing is hidden.

The most likely reason it reproduced for the owner and not here: `text-foreground`
generated **no CSS at all** before #339, so the field's colour depended on
whatever else won the cascade — which in dark mode was near-black text. #339
registered the semantic namespace and layered the element resets, which is
exactly the class of defect that would have produced the screenshot.

No code was invented for a defect that is gone. A regression assertion was added
instead, because the failure mode is high-value and silent.

## Research

No new external research was needed. The applicable provider behaviour is
already recorded in #334 and in `moneyflow-trust-provider-sync.md`, and nothing
in this slice touches Auth flows, PKCE or AMR — it changes password *entry
ergonomics*, a server-side equality check, and the presentation owner of a menu.
Repository code, the ownership gate and browser measurement decided every
verdict here.

## Specification

### Acceptance criteria

1. Every password-taking flow — login, registration, update, deletion re-auth —
   has a reveal control that is `type="button"`, keyboard usable, renames itself
   by state, and never alters or submits the value.
2. Autocomplete semantics preserved: `current-password` for login/re-auth,
   `new-password` for registration/update.
3. Registration collects a confirmation and the **server** rejects a mismatch
   before Supabase `signUp` is reached.
4. The shared `DropdownMenu` owns its presentation; Radix keyboard, focus return
   and Escape behaviour are unchanged.
5. Ownership baseline shrinks only by proven entries; `baselineAdded` stays 0.
6. No provider, Auth, DB or production write.

### Out of scope

Recover flow, OAuth continuity, Edge/log inspection, the remaining MF-04 debt
families, MF-06, MF-08, `product-styles.ts`, any redesign.

## Implementation plan

### Planned changes

| Area | Change |
|---|---|
| `auth-password-field.tsx` | new shared composition — one reveal control, four flows |
| `auth-form.tsx` | uses it for password; adds the registration confirmation field |
| `auth-form.module.css` | control + toggle presentation, 44×44 target |
| `lib/auth-password-confirmation.ts` | pure match rule, so the server behaviour is testable |
| `(auth)/actions.ts` | `registerSchema` gains `confirmPassword` and a `refine` using that rule |
| `ui/dropdown-menu.module.css` | presentation owner for the shared menu |
| `ui/dropdown-menu.tsx` | binds the module; adds a `danger` variant |
| `user-chip.tsx` | drops `profile-menu`/`danger` globals for the owned variant |
| tests | 6 unit; 5 authenticated desktop; 5 audit (reveal + amount) |

### Risks and counterexamples

| Risk | Handling |
|---|---|
| Reveal button submits the form | `type="button"` asserted in the browser, plus a URL-unchanged assertion |
| Client-only confirmation | rule lives in the schema; test asserts parse→guard→signUp ordering |
| Password persisted or logged | state is a boolean; nothing writes the value anywhere |
| Autocomplete regression | asserted per flow in the browser |
| Radix behaviour broken by styling | keyboard/Escape/focus-return asserted |
| Menu clipped by the shell | portal position and in-viewport asserted |
| Baseline shrunk beyond proof | the 6 removals are exactly the classes no longer emitted |

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Fresh-verify BUG-A…F on `main@cd109cb` | — | reconciliation table above | done |
| T2 | Shared password field with reveal | T1 | `auth-password-field.tsx`; audit contracts | done |
| T3 | Confirmation field + server enforcement | T1 | `auth-password-confirmation.ts`; 6 unit tests | done |
| T4 | Presentation owner for the shared dropdown | T1 | `dropdown-menu.module.css`; 5 authenticated desktop tests | done |
| T5 | Amount regression assertion (no fix needed) | T1 | measured 6 combinations; audit contract | done |
| T6 | Bounded shared-owner sweep | T4 | one root cause, recorded below | done |
| T7 | Shrink baseline by proven entries only | T4 | 319 → 313, `baselineAdded: 0` | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-11 | human_owner | implementer | planned | #334 handoff; `main@cd109cb` | #334 findings written against older main | Fresh-verify each finding |
| 2026-08-11 | implementer | evaluator | implementing | reconciliation table; the changes below | reveal-toggle target size | Attack the diff |
| 2026-08-11 | evaluator | human_owner | evaluating | measured evidence + exact-head CI | provider-side Secure acceptance still open | Owner review and merge decision |

### Current permission boundary

- **Granted scope:** `branch_write` on `fix/auth-shared-ui-regressions`.
- **Forbidden writes:** Supabase provider config or secrets, Auth identity or credential creation/mutation, production DB or data, Edge deployment/config, account deletion, branch protection.
- **Human approval required before:** anything requiring a provider or Auth write.
- **Rollback or stop condition:** presentation and validation only; revert the commit. No migration, no data mutation, nothing to unwind on a provider.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Reveal on login and register | browser: type flips, value intact, URL unchanged, name follows state | pass |
| Reveal reaches update + re-auth | same component; both modes render it | pass |
| Autocomplete per flow | asserted `current-password` / `new-password` | pass |
| Confirmation enforced server-side | 6 unit tests incl. parse→guard→signUp ordering | pass |
| Dropdown is a real surface | light + dark: background, border, radius, shadow, in-viewport | pass |
| Radix behaviour intact | ArrowDown highlight, Escape, focus return | pass |
| Target sizes | 44×44 enforced by the existing audit — it caught my 40px toggle | pass after fix |
| Amount readable | measured, 6 combinations | pass |
| Ownership | 319 → 313, `baselineAdded: 0`, 6 proven removals | pass |

### Independent evaluator findings

- **Toggle was 40px tall.** Caught by the repo's own minimum-target-size audit,
  not by me. Raised to 44×44 and re-verified.
- `form` around the logout item was a flex parent and would have broken the
  item's layout; set to `display: contents`.
- Confirmation compares exactly — no trimming or case folding, since both are
  legal password characters and normalising would accept a confirmation that
  differs from what is stored.
- Nothing persists or logs the password: the only new state is a boolean.

### Remaining limitations

- Desktop dropdown evidence comes from the authenticated harness and its
  loopback double, not a hosted Supabase project.
- `auth-captcha` e2e cannot run locally (no `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- Emulated viewports only; not physical-device acceptance.
- BUG-F: no second unrelated shared-owner defect was found in the bounded sweep.
  That is a bounded-sweep result, not proof that none exists.

## Delivery record

- Base: `main@cd109cb8c8e942e57f261078f6d4052ac435ded6`.
- #334 remains the provenance handoff and is superseded by this work.
- No provider, Auth, DB or production write was performed or requested.
