# MF — Review nhánh Flutter Android (PR #787, external)

- **Provenance:** owner-provided external review of `feat/mobile-flutter` @
  `2cdb47b4` (pushed 2026-10-14). Read-only review: source reading +
  Flutter analyze/test + out-of-repo reproduction harness + CI log.
- **Disposition:** every finding below was fixed in the PR-787 hardening
  tranche before the squash merge (`6e770c14` on main). Disposition table
  maps each item to the shipped fix; see "Map" at the bottom.
- **Remaining open items from the review** are the device/owner gates it
  lists — physical-device acceptance, production Neon smoke, signed AAB —
  which stay with the owner.

## Disposition map (finding → fix, verified on main)

| #    | Finding                              | Fix (verified in source on main)                                                                                                       |
| ---- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Notification controller race A→B     | Generation fence: `_generation` checked after every await (`notification_capture_controller.dart:151,196,200`)                         |
| 4.2  | Native pending without owner         | `NotificationCaptureService.kt`: consent+owner gate before persist; `KEY_OWNER` bound; owner-only consume; cleared on disable/sign-out |
| 4.3  | `mf_notif_pending.xml` in backup     | Excluded in `backup_rules.xml:25` and `data_extraction_rules.xml:26,33`                                                                |
| 4.4  | RAM-only outbox                      | Per-account durable outbox `mf_notif_outbox_$userId`, max 20 (`notification_capture_controller.dart:126,136`)                          |
| 4.5  | Logout offline leaves session        | `discardSession()` + local clear path (`auth_client.dart:163,170,204,251`)                                                             |
| 4.6  | Offline queue outlives owner         | Owner fence in `offline_queue.dart:118–398` — mid-pass owner change stops without verdict; no drop of A's items under B                |
| 4.7  | Inbox fallback wrong-kind category   | Kind-filtered resolution (`inbox.dart:267–274`) — mismatched-name fallback removed                                                     |
| 4.8  | 31/02 accepted as real date          | Strict calendar validation (`csv_import.dart:473` bounds + year/month/day equality)                                                    |
| 4.9  | Seeded wallet counted as used ledger | `app.dart:747` — seeded cash wallet alone is not ledger use; onboarding not auto-done                                                  |
| 4.10 | Debug-signing release fallback       | Fail-closed unless `-PmfAllowDebugRelease` / `MF_ALLOW_DEBUG_RELEASE` (`build.gradle.kts:16,26`)                                       |
| 4.11 | Archive drops commitment cadence     | `20261016090000_commitment_interval_archive.sql` keeps `interval_months`; verifier repointed to new ingress                            |
| 4.12 | Endpoint guard only non-empty        | Release mode requires auth+data defines; HTTPS/host validation in `neon_config.dart:44–65`                                             |

CI section 5 items (whitespace, missing headings, migration baseline,
7→8-param schema test) were all fixed and the final CI on merge ref
`b83f3569` was fully green, including pgTAP + the new `verify_mobile`
gate the review recommended (pin-resolve SDK, analyze, test, JVM tests,
APK build).
