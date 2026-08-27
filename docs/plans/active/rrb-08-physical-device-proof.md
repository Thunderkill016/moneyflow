# RRB-08 — current physical-device proof

**Status:** active, blocked on real-phone observation
**Execution state:** specified / prepared
**Issue:** #398
**Owner:** Thunderkill016 + agent
**Risk:** Class 2 validation
**Permission scope:** branch_write + owner-observed physical-device evidence; no provider/production/database write
**Started from:** `main@1bb50814d62acdc6e45c6977bbe6184b5d028dac`

## Repository reconnaissance

- Release Readiness Audit v1 defines RRB-08 as a P2 evidence gap, not a known product defect.
- Historical owner-observed PBT-AC12 physical-phone evidence predates Slice 2, amount-focus hotfix #383 and RRB-07 auth repair #394.
- Current CI/browser evidence is strong but remains a different evidence layer.
- Issue #398 is the bounded execution contract after explicit owner promotion on 2026-08-15.
- No current real-phone observation has been supplied in this session.

## Research

Repo/current audit was read first. External research was limited to optional diagnostics for the required physical-device layer.

Apple documents inspecting webpages on a connected iOS/iPadOS device from Safari on a Mac. Enable **Settings → Apps → Safari → Advanced → Web Inspector**, connect/trust the device, then inspect the open webpage from Safari's Develop menu.

Primary source: https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios

Chrome DevTools documents remote debugging live Chrome content on an Android phone: enable Developer Options + USB debugging, connect the device, open `chrome://inspect#devices` on the development machine, then inspect the live tab.

Primary source: https://developer.chrome.com/docs/devtools/remote-debugging

These tools help capture console/network/layout diagnostics. They are optional aids, not substitutes for direct physical observation.

## Specification

### Outcome

Produce current-release physical-phone evidence after UI Slice 1 + Slice 2, amount-focus hotfix #383 and RRB-07 auth semantic repair #394. Browser emulation, simulators and CI browser runs remain useful regression evidence but do not satisfy this packet.

### Authority and boundary

The owner explicitly promoted the next Current Work item on 2026-08-15. This packet owns RRB-08 only.

It does **not** authorize:

- a redesign or new UI slice;
- provider/Auth configuration writes;
- deployment or production-data mutation;
- destructive account testing;
- unrelated mobile polish;
- treating emulator/browser evidence as physical-device evidence.

### Done when

One bounded smoke on a real phone records:

- device model and OS version;
- browser and browser version when available;
- exact origin/runtime mode tested;
- pass/fail for each smoke step below;
- observed defects with P0/P1/P2 classification;
- screenshots or diagnostics only when they contain no secrets/private financial data.

If a defect is found, split the minimum fix into a bounded follow-up. Do not expand this validation packet into implementation work.

### Test data

Prefer a synthetic account/ledger. Never attach or paste passwords, OTPs, tokens, raw bank statements, full archives or private financial data into GitHub evidence.

Use amounts that make transfer neutrality visually obvious. The run does not need to recreate the exact RRB-01 fixture; it must only make the observed result unambiguous.

### Stop conditions

Stop immediately and classify as P0 if the run shows any of these:

- wrong financial totals/balances;
- transfer counted as income/expense;
- auth bypass or cross-tenant exposure;
- destructive/unrecoverable data loss;
- privacy data routed to an unrelated operator.

Do not continue merely to complete the checklist after a P0 trust failure.

## Implementation plan

1. Freeze the repository-side evidence contract and current authority.
2. Select the real release-candidate origin at execution time and record its mode/origin; do not infer production identity from repo CI.
3. Run the bounded smoke on one real phone in normal portrait orientation.
4. Capture only privacy-safe notes/screenshots; optionally attach remote Web Inspector/DevTools diagnostics if safe and available.
5. Classify any defect P0/P1/P2 and split a bounded fix only when evidence exposes a real defect.
6. Mark RRB-08 PASS only after direct physical observation completes the evidence template.

## Tasks

### RRB08-T1 — open and shell

- Open the selected release-candidate origin on the real phone.
- Record whether the run is `authenticated` or `demo`.
- Verify the primary shell is usable in normal portrait orientation.
- No release-critical control may be clipped, covered or unreachable.

### RRB08-T2 — authentication surface

If authenticated mode is available:

- email and password fields are usable with the software keyboard;
- password reveal control remains reachable and independently understandable;
- paste into password remains possible;
- navigation after login remains usable.

Do not claim Google OAuth or Turnstile accessibility/security behavior unless that provider-managed behavior is directly observed and separately recorded.

### RRB08-T3 — core ledger

Using synthetic values:

- create/use an account;
- record one income;
- record one expense;
- create one internal transfer;
- confirm the transfer does not become income or expense;
- confirm account and aggregate totals remain visibly coherent.

### RRB08-T4 — amount capture / keyboard

For Expense, Income and Transfer capture:

- focus the Amount field with the software keyboard open;
- verify there is one intentional visible focus contour, not a double contour;
- verify the Amount control and submit/cancel path remain reachable while the keyboard is open;
- rotate only if needed to diagnose a defect; portrait is the acceptance orientation.

### RRB08-T5 — accounts and transactions

- primary totals and account balances are readable without horizontal clipping;
- open at least one transaction/account detail path;
- edit/cancel/back interactions remain reachable;
- no accidental destructive action is triggered by ordinary scrolling/tapping.

### RRB08-T6 — theme

If light and dark mode are available without mutating anything beyond presentation preference:

- verify the same critical flow remains readable in both;
- record any contrast/focus/readability defect rather than redesigning during the run.

## Evaluation

### Evidence template

```text
Date/time:
Release candidate / commit if known:
Origin:
Mode: authenticated | demo
Device model:
OS + version:
Browser + version:
Network context: Wi-Fi | mobile data | other

1. Open/shell: PASS | FAIL — notes
2. Auth surface: PASS | FAIL | N/A — notes
3. Core ledger: PASS | FAIL — notes
4. Amount capture/keyboard: PASS | FAIL — notes
5. Accounts/transactions: PASS | FAIL — notes
6. Theme: PASS | FAIL | N/A — notes

Observed defects:
- none
or
- severity — exact reproduction — expected vs observed — safe screenshot/diagnostic reference

Overall RRB-08 verdict: PASS | BLOCKED
```

### Current evidence state

- Browser/emulation regression evidence on current main is strong, including #394 UI audit and the post-merge full-main regression after #396.
- Historical owner-observed PBT-AC12 physical-phone evidence exists, but predates Slice 2, #383 and #394.
- **An owner observation was supplied on 2026-08-27 and is recorded below.** It is the first current real-phone evidence in this program. Whether it closes RRB-08 is the owner's call, not this document's.

### Owner observation — 2026-08-27

Recorded verbatim from what the owner reported. Everything not reported is marked
unstated rather than filled in, because a physical-device record that guesses is
worth less than one with gaps.

```text
Date/time: 2026-08-27 (time unstated)
Release candidate / commit if known: unstated; main was cac5f157 on this date
Origin: https://mfvn.vercel.app  (confirmed by the owner as the correct address)
Mode: authenticated — a real account
Device model: POCO X8 Pro
OS + version: Android, version unstated
Browser + version: Chrome, version unstated
Network context: unstated

1. Open/shell: PASS — owner reported "pass hết" across the run
2. Auth surface: PASS — signed in with a real account
3. Core ledger: PASS
4. Amount capture/keyboard: PASS
5. Accounts/transactions: PASS
6. Theme: PASS

Observed defects:
- none reported

Overall RRB-08 verdict: PASS (owner's verdict)
```

**What this evidence does and does not carry.** The owner reported a single
summary verdict rather than six separate notes, so the per-checkpoint PASS lines
above are that summary applied to each step, not six independent observations.
OS version, browser version, network context and time are unstated. One Android
device on Chrome is covered; no iOS or Safari observation exists, which matters
because `webkit-iphone` was the only CI project to behave differently during the
2026-08-27 session.

The owner also stated that **demo mode is used only for AI/agent testing, not by
real users**. That corrects the justification given in PR #487, which argued the
demo is "the first thing a stranger sees". The change there remains worthwhile —
the audits render demo, so a demo that contradicts itself makes those gates
measure fiction — but the reason recorded in that PR was wrong.

### Next action

**Owner decision.** The observation above is supplied; whether it satisfies
RRB-08 is for the owner to declare, and #398 stays open until they do. No agent
may mark this complete, and physical-device readiness must not be inferred from
CI or browser emulation.

If the owner wants the gap closed rather than accepted, the smallest additions
are an iOS/Safari observation and the unstated fields above.