# P3 Prove — physical-phone acceptance evidence

Copy this file to `physical-phone-<YYYY-MM-DD>.md` in this directory and fill it in
**while running**, not from memory afterwards.

Validate before committing:

```bash
npm run check:prove-evidence
```

The validator checks that every scenario has a real result, that anything other
than `pass` is explained **and** appears in the Defects table, and that no forbidden
content is present.

Two things it cannot do, so they are yours: it cannot see inside a **screenshot**,
and it cannot recognise a **payee or institution name** written as ordinary prose.
Do not write either.

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

Leave this as `not_possessed` unless you **already own** a second device. That is a
named limitation, not a failure, and never a reason to acquire hardware.

If you do own one, record it in a **separate file** with `Tier: optional` — one file
per device, so a second-platform run can never be mistaken for the required one.
Only a `required`-tier file can satisfy PBT-AC12.

## Automated context

- Emulated viewport/browser coverage: `emulated` — already runs in CI, and is not
  physical evidence for any scenario below.

## Results

One row per scenario, exactly three columns, inside this section only.

Result must be exactly one of:

| Result | Use it when |
|---|---|
| `pass` | observed working as the scenario's expected result describes |
| `fail` | observed not working |
| `blocked` | you could not run it — say why |
| `fail_then_pass` | failed, then worked on retry. **Still a finding.** Explain it and add a Defects row |
| `not_applicable` | your hardware has no such feature (for example no notch). Not a defect |

Anything other than `pass` needs a note **and** a row in **Defects**.

Notes describe **behavior only** — never an amount, description, payee, account or
institution name. Do not paste a number you saw on screen; use the sanitized
observations below.

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
| PP-15 | | |
| PP-16 | | |
| PP-17 | | |

## Sanitized observations

Counts only — keep every value under four digits, and never write a money amount.

- Accounts shown in PP-02: `<count>`
- Register rows before PP-11 reload: `<count>`
- Register rows after PP-11 reload: `<count>`
- PP-05 income/expense totals after the transfer: `<unchanged | changed>`
- PP-06 balance moved by the difference only: `<yes | no>`
- PP-07 was the 8-second undo window comfortable on this device: `<yes | no>`
- PP-13 rows present after the failed save and reload: `<count>`
- PP-15 rows created by the retried save: `<count>` (must be 1)
- PP-16 amount recorded matched what you typed: `<yes | no>`
- Amount entry keypad was numeric: `<yes | no>`
- PP-12 orientations tested: `<portrait | portrait+landscape>`
- PP-12 device has a notch or home indicator: `<yes | no>`
- PP-14 themes checked: `<light | dark | light+dark>`
- PP-17 recorded row's date matched the intended day: `<yes | no>`

## Defects

One row per defect. Severity must be `P0`, `P1` or `finding`. Reproduction steps
describe actions, never private data.

| Ref | Scenario | Severity | Reproduction (behavior only) | Status |
|---|---|---|---|---|
| | | | | |

If there are none, write `none` in the Ref column of a single row.

## Declaration

- [ ] Every result above was observed on the **physical device** named in **Run**,
      held in my hand — not on an emulator, simulator, cloud device farm, or a
      resized desktop browser window.
- [ ] No result was inferred, assumed or back-filled from memory.
- [ ] Any screenshot committed alongside this file has been checked and contains no
      amount, description, payee, account identifier or email.
- [ ] No real amount, transaction description, payee, account identifier, email or
      token appears anywhere in this file.
