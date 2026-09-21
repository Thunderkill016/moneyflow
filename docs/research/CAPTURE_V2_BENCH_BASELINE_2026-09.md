# Capture V2 benchmark — scripted baseline (2026-09-21)

Evidence note for the Capture V2 spec's Slice 0 (TTLT / taps / correction
evidence). This run exercises the merged harness `/capture-bench.html` (#636)
end-to-end on a local production build in demo mode.

## What this is — and is not

- **A machine floor, not human TTLT.** A Playwright driver performs the real
  tap/fill work at script speed inside the same browser context, so every
  number is a lower bound: no human reading, aiming, or hesitation, and the
  ~1–3s cross-tab latency the harness warns about is still included.
- **A working proof of the measurement path.** Storage events stop the timer
  on the real app build; `match` correctly verifies kind+amount of each new
  ledger row; `candidateMs` vs `ledgerMs` split works for the paste pipeline.
- **Not authorization for any product change.** Human runs on representative
  devices remain the gating evidence tier for H1/H4.

## Results — scripted, demo fixtures, localhost, 390px context

| Task | Route | Total | Candidate leg | Match | Taps |
|---|---|---|---|---|---|
| A1 chi 45k | /capture/quick | 1.1s | — | đúng | 5 |
| A2 thu 15tr | /capture/quick | 1.0s | — | đúng | 4 |
| A3 transfer 500k | /capture/quick | 1.0s | — | đúng | 5 |
| A4 chi 45k lặp | /capture/quick | 0.9s | — | đúng | 5 |
| D1 "cafe 45k" | /capture/paste | 1.8s | 0.9s | đúng | 5 |
| D2 "đổ xăng 185k hôm qua" | /capture/paste | 1.8s | 0.8s | đúng | 5 |
| D3 SMS bank giả | /capture/paste | 1.8s | 0.9s | đúng | 5 |

Median: **amount-first 1.0s** (n=4), **description 1.8s** (n=3).

## Observations that survive the scripted caveat

1. **A4 confirms the stable-defaults surface (#596).** On the repeat visit the
   category chip row is displaced by a learned pattern button ("Dùng mẫu chi,
   Ăn uống, MB Bank"). A script written against the A1 path fails to find the
   chip — a human sees the suggestion and taps it. Pattern path measured
   fastest of the group (0.9s at script speed).
2. **Description mode pays a real second leg.** Every D task spends ~0.9s to
   candidate plus ~0.9s candidate→ledger (paste → Vào Inbox → inbox → Duyệt →
   Duyệt vào sổ). Even at machine speed the pipeline is ~1.8× amount-first;
   the human gap will be larger because the review step is reading work.
3. **All seven matches were đúng** — including the transfer probe (A3 records
   `transfer`, never income/expense) and the SMS-shaped input (D3 → 250.000₫
   expense).
4. **Warm-up persistence matters for measurement.** Demo samples live in
   memory until the first save; without priming, the first save persists the
   whole sample set and the harness counts them as new rows. The driver saves
   a throwaway 1.000₫ row before measuring.

## Reproduce

```bash
npm run build && npx next start -p 8471   # serve the production build
node scripts/capture-bench-driver.mjs     # drives harness + app tabs
```

`BENCH_ORIGIN` overrides the origin (e.g. the Vercel deploy). The driver
writes results into the harness UI and prints the generated report block;
human fields (device, network, cohort) are marked as scripted so pasted
evidence is never mistaken for a human run.

## Next evidence needed

- Owner run on a physical phone (the RRB-08 tier) with real taps counted.
- A fresh-profile cohort run (`f-cohort` = fresh-profile) for first-time
  capture cost — demo fixtures are the stable-history cohort only.
