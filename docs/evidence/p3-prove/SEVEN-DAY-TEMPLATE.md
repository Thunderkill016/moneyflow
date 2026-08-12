# P3 Prove — seven-day sanitized self-use log

Copy this file to `seven-day-<YYYY-MM-DD>.md` (the date of **day 1**) and fill in one
row per day, **on the day**, not afterwards.

Do not create this file until P3-T1 has passed with no open P0 and every P1 has a
recorded owner decision. See the Day 0 prerequisites in
`docs/plans/active/moneyflow-trust-prove.md`.

Validate before committing:

```bash
npm run check:prove-evidence
```

The validator applies the same privacy scan as the physical-phone file. It cannot
see inside a screenshot, and it cannot recognise a payee or institution name written
as prose — do not write either.

## Run

- Day 1 date: `YYYY-MM-DD`
- Attempt: `1`
- Device: `<same device row as the physical-phone file>`
- Production commit SHA at day 1: `<40-hex SHA>`
- Session: `authenticated`

## Days

A day counts only when MoneyFlow was your actual ledger that day. `Balances OK`
means you looked and they were right. `DB repair` must be `no` — a `yes` breaks the
streak and this attempt ends.

**Which day is it?** Use the ledger's own day (Asia/Ho_Chi_Minh), the same day the
app uses when it defaults a new transaction's date. A day counts by when you
**recorded** it, not by the date on the transaction.

| Day | Date | Transactions | Balances OK | DB repair | Defect ref | Notes |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |

A day with genuinely no money movement counts **only** with `Transactions: 0` **and**
`Balances OK: yes` — you opened the app and confirmed balances still looked right.
Silence is not a completed day.

## Interruptions

Record anything that ended or paused this attempt, and what happened next.

| Date | What happened | Effect on the streak |
|---|---|---|
| | | |

## Declaration

- [ ] Every row was recorded on the day it describes, not reconstructed afterwards.
- [ ] MoneyFlow was my actual ledger on each day marked complete.
- [ ] No manual database repair was needed on any day marked complete.
- [ ] No real amount, transaction description, payee, account identifier, email or
      token appears anywhere in this file.
