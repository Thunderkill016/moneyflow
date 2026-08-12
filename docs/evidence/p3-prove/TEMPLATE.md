# P3 Prove — physical-phone acceptance evidence

Copy this file to `physical-phone-<YYYY-MM-DD>.md` in this directory and fill it in
**while running**, not from memory afterwards.

Validate before committing:

```bash
npm run check:prove-evidence
```

The validator checks that every scenario is present with a real result, that a
`fail_then_pass` carries an explanation, and that no forbidden content is present.
It cannot see inside a screenshot — **you** are the last check on that.

## Run

- Run date: `YYYY-MM-DD`
- Tier: `required`
- Platform: `<Android | iOS>`
- OS version: `<e.g. 15>`
- Browser: `<e.g. Chrome | Safari>`
- Browser version: `<e.g. 141>`
- Production commit SHA under test: `<40-hex SHA>`
- Session: `authenticated` (never `demo`)

## Optional second platform

- Second platform: `not_possessed`

Leave this as `not_possessed` unless you already own a second device. That is a
named limitation, not a failure, and it is never a reason to acquire hardware.

## Automated context

- Emulated viewport/browser coverage: `emulated` — already runs in CI, and is not
  physical evidence for any scenario below.

## Results

One row per scenario. Result must be exactly one of `pass`, `fail`, `blocked`,
`fail_then_pass`. Notes describe **behavior only** — no amounts, no descriptions,
no payees, no account or institution names.

| ID | Result | Notes |
|---|---|---|
| PP-01 | | |
| PP-02 | | |
| PP-03 | | |
| PP-04 | | |
| PP-05 | | |
| PP-06 | | |
| PP-07 | | |
| PP-08 | | |
| PP-09 | | |
| PP-10 | | |
| PP-11 | | |
| PP-12 | | |
| PP-13 | | |
| PP-14 | | |

## Sanitized observations

- Accounts shown in PP-02: `<count>`
- Register rows before PP-11 reload: `<count>`
- Register rows after PP-11 reload: `<count>`
- PP-05 income/expense totals after the transfer: `<unchanged | changed>`
- PP-07 was the 8-second undo window comfortable on this device: `<yes | no>`
- PP-03/PP-04/PP-12 numeric keypad appeared for amount entry: `<yes | no>`
- PP-12 orientations tested: `<portrait | portrait+landscape>`
- PP-14 themes checked: `<light | dark | light+dark>`

## Defects

One row per defect. Severity must be `P0`, `P1` or `finding`. Reproduction steps
describe actions, never private data.

| Ref | Scenario | Severity | Reproduction (behavior only) | Status |
|---|---|---|---|---|
| | | | | |

If there are none, write `none` in the Ref column of a single row.

## Declaration

- [ ] Every result above was observed on the physical device named in **Run**, not on
      an emulator, simulator, device farm or resized desktop browser.
- [ ] No result was inferred, assumed or back-filled from memory.
- [ ] Any screenshot committed alongside this file has been checked and contains no
      amount, description, payee, account identifier or email.
- [ ] No real amount, transaction description, payee, account identifier, email or
      token appears anywhere in this file.
