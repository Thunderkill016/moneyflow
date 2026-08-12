# One owner for "today in Vietnam"

## Outcome

The rule that decides which calendar day a transaction belongs to lives in one
tested domain module, and no UI component computes it.

Status: `implemented`. Awaiting owner review and merge.

## Repository reconnaissance

`AGENTS.md`, Financial invariants:

> Financial calculations live in testable domain modules, not UI components.

`src/components/transfer-dialog.tsx:124` computes a transfer's `occurredOn` — the
calendar day the money moved — inline in a React component:

```ts
const occurredOn = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
```

That is a financial value produced in a component, with no `now` parameter, so it
cannot be tested at a date boundary. It is a direct violation of the invariant
above, not a style preference.

The same computation exists **six times under five names**:

| Location | Name | Accepts `now`? | Tested |
|---|---|---|---|
| `src/lib/quick-add-prefs.ts:133` | `todayInVietnam` | yes | **yes** — `quick-add-prefs.test.ts:51` |
| `src/lib/inbox/parse-text.ts:72` | `todayInHoChiMinh` | yes | no |
| `src/server/finance.ts:73` | `currentDateInVietnam` | no | no |
| `src/server/reports.ts:11` | `todayInVietnam` | no | no |
| `src/server/commitments.ts:30` | `currentDateInVietnam` | no | no |
| `src/components/transfer-dialog.tsx:124` | *(inline)* | no | no |

**Corrections found during implementation.** Two entries above were wrong in the
first revision of this packet, and the reconnaissance was incomplete:

- `src/server/commitments.ts:30` is `currentDateInVietnam`, not `todayInVietnam`,
  and it is **exported** — `src/server/goals.ts:7` and
  `src/server/income-templates.ts:13` import it, giving it three more call sites
  than the table implied.
- `todayInVietnam` had two component importers the packet never listed:
  `src/components/split-expense-dialog.tsx:18` and
  `src/components/add-transaction-dialog.tsx:19`.
- There is a **seventh copy**: `localCalendarDate` at
  `src/lib/planning/commitment-due-notify.ts:116`, used by `src/lib/push-client.ts:179`.
  It computes the same value but through `formatToParts` with an ISO fallback and
  takes a `timeZone` parameter that no caller ever passes.

  It is **deliberately not folded in.** Collapsing it would either drop the
  `timeZone` parameter or replace a different implementation and its fallback —
  that is a redefinition, and this packet is a behaviour-preserving move. Folding
  it is a separate decision, recorded here rather than left silent.

All six are byte-equivalent in behaviour today, so **there is no live defect** —
this is not a bug report. The risk is structural:

- Four of the six take no `now`, so no test can pin their boundary behaviour.
- One is inline in a component and untestable at all.
- Only one of the six is covered by a test.
- A future correction — a DST-style rule change, a different locale, a fix to
  midnight handling — will be applied to one copy and miss five.

Related but a different concept, and out of scope: `src/server/budgets.ts:34`
`currentMonthStart()` derives a month, not a day. Also out of scope: the display
formatters in `budgets-page.tsx`, `reports-page.tsx`, `privacy-prefs.ts`,
`push-prefs.ts`, `inbox/review.ts` and the second formatter in `server/finance.ts`
— those format a *given* date for humans and legitimately differ (`vi-VN` vs
`en-CA`). Do not collapse them into this owner.

## Research

`src/lib/quick-add-prefs.ts` is the wrong long-term home: "today in Vietnam" is
not a quick-add preference. But it is the only copy that is exported, accepts an
injectable `now`, and has a passing test — so it is the correct *starting point*,
and moving it is the change, not rewriting it.

`Intl.DateTimeFormat("en-CA", …)` yields `YYYY-MM-DD`, which is why every copy
uses that locale. Keep it; it is deliberate, not incidental.

## Specification

1. Exactly one exported function computes "today in Asia/Ho_Chi_Minh as
   `YYYY-MM-DD`", in `src/lib/`, and it accepts an injectable `now: Date`.
2. `transfer-dialog.tsx` imports it. No date arithmetic remains in the component.
3. The other four copies are deleted and import the owner.
4. Tests cover at least: a mid-day instant, and the two instants either side of
   midnight ICT — an instant that is still "yesterday" in UTC but already today in
   Ho Chi Minh, and the reverse.
5. Behaviour is unchanged for every existing caller. This is a move, not a
   redefinition.
6. Display formatters listed as out of scope above are untouched.

## Implementation plan

- Choose the owner module. `src/lib/vietnam-date.ts` is a reasonable name; the
  packet does not mandate one, but it must not be a `*-prefs` or `*-store` module.
- Move `todayInVietnam` there with its `now = new Date()` parameter, and move its
  existing test with it.
- Replace the five other copies with imports.
- **`src/lib/**` import rule applies:** a runtime import inside `src/lib` must be
  relative with an explicit `.ts` extension, because `npm run test` is the plain
  Node runner and ignores tsconfig paths. `src/server/*` and components may use
  `@/lib/…`.
- `parse-text.ts`'s `todayInHoChiMinh` has **two live callers**:
  `src/lib/inbox/parse-csv.ts:12,446` and `src/lib/inbox/parse-pdf.ts:19,327`,
  both as the `options.today` fallback. Repoint those two rather than deleting the
  name blind. Note `parse-pdf.ts` is reached only through `await import(...)` for
  code-splitting — it looks unused to a static grep but is live.

Risks:

- `transfer-dialog.tsx` is a client component; the owner module must stay free of
  `server-only` imports or the client build breaks.
- Deleting an exported name (`todayInHoChiMinh`) can break an unrelated import.
  Grep before removing.
- A test that asserts a fixed date will pass or fail depending on the machine's
  clock unless `now` is injected. Every new test must pass an explicit `Date`.

## Tasks

1. Create the owner module and move the tested implementation into it.
2. Add the midnight-boundary tests required by specification item 4.
3. Repoint `transfer-dialog.tsx` — this is the item that satisfies the
   `AGENTS.md` invariant.
4. Repoint `server/finance.ts`, `server/reports.ts`, `server/commitments.ts`,
   `lib/inbox/parse-text.ts`, and delete the private copies.
5. Confirm zero remaining `Intl.DateTimeFormat("en-CA"` occurrences that compute
   the current date, outside the owner module.

## Evaluation

- [x] `grep -rn 'en-CA' src/` — down from 8 occurrences to 4. Only
      `src/lib/vietnam-date.ts` computes the current date. The others are
      `src/server/budgets.ts:35` (`currentMonthStart`, a month and out of scope)
      and `src/lib/planning/commitment-due-notify.ts:120` (`localCalendarDate`,
      the seventh copy recorded above and deliberately left).
- [x] Midnight-boundary tests present and passing, all with injected `Date`:
      the ICT boundary itself (`17:00:00.000Z` → next day) and one millisecond
      before it, a UTC-next-day instant that is the same Vietnam day, and month
      and year rollovers.
- [x] `npm run test` — **590 before, 594 after**: five boundary tests added, one
      moved out of `quick-add-prefs.test.ts`.
- [x] `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`
      (zero warnings), `typecheck`, `build`.
- [x] Behaviour verified directly rather than inferred: `/capture/quick` defaults
      its date field to `2026-07-30`, matching the Vietnam calendar day computed
      independently, and `/commitments` and `/goals` — both server routes that
      consume the moved function — render.
- [~] `test:e2e` — 7/8 pass locally. The one failure **moves between runs**:
      `expense-path` on `mobile-chromium` in one run, `global-pfm-ux` on
      `chromium` in the next, each passing in isolation. Both are the demo-store
      `localStorage` poll, and `global-pfm-ux` was previously shown to fail on
      `origin/main` with no changes applied. Sandbox artifact; CI starts a fresh
      server per run and is the authority.

A mistake worth recording: the first attempt removed the moved test with a regex
that also deleted an unrelated `validates prefs shape` test. It was caught by the
test count dropping to 593 instead of 594, restored from `origin/main`, and redone
as an exact edit. A count that only *looks* plausible is not evidence.
