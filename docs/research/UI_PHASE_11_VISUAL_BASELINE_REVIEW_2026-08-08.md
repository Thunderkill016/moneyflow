# MoneyFlow UI Phase 11 — selective visual baseline review

- **Reviewed:** 2026-08-08
- **Baseline:** P10 exact head `9912dc621306c73f14407e175eb1a468b90ea933`
- **Candidate:** P11 exact head before this report `ea5756ccee62ba5b6ab56f7a9983a0061289a8ed`
- **P10 UI artifact:** `9017516431`, `ui-audit-evidence-31242364910-1`, `sha256:24e4b9fc354fdd03497f31d767c351f139ffd49f13b40fc2762b6c132f8f3805`
- **P11 UI artifact:** `9018027242`, `ui-audit-evidence-31244036703-1`, `sha256:4263d05ed8022be90616623cb5853db14a5fe96fbc032be46305c82e40987fd7`
- **P10 Playwright summary:** 554 total / 426 passed / 127 skipped / 1 flaky / 0 unexpected
- **P11 Playwright summary:** 554 total / 427 passed / 127 skipped / **0 flaky / 0 unexpected**
- **Review result:** **PASS — no stable visual diff in the selected critical baseline set**

## Purpose

Phase 11 requires selective visual baselines and review of every intentional diff rather than treating automated interaction checks as visual acceptance. The P11 code change repairs a first-paint AppShell reserve race; it is not intended to redesign stable rendered surfaces. This review therefore compares the same deterministic full-page screenshots from the final P10 artifact and the P11 candidate artifact.

The P10 flaky browser signal is reviewed separately from stable screenshot output: the first attempt caught transient zero shell reserve before the mounted marker, while the settled screenshot was already visually stable. The P11 source/test fix removes that first-paint race and the full matrix returns zero flaky tests.

## Selected baseline set

The review intentionally covers the changed AppShell boundary plus public control surfaces across light/dark, desktop/mobile and Chromium/WebKit evidence.

| Screenshot | Dimensions | P10 SHA-256 | P11 SHA-256 | Pixel diff | Review |
|---|---:|---|---|---:|---|
| `dashboard-chromium-desktop-dark.png` | 1366×1804 | `69e12da60c0dee13560e63ca17501fef01dd2b981e4d1dec5051b46d56974678` | same | 0.000000 | unchanged |
| `dashboard-chromium-phone-dark.png` | 390×1878 | `662dd97d56fa1c7f5768af39f23af91a98db3a6bba68f4d4b7c1cbf96108bf06` | same | 0.000000 | unchanged |
| `dashboard-webkit-iphone.png` | 390×1877 | `13f2b883f6a82daee3ef3e3ce941b7e5ba8bae1329a4ee0281332a922c3e565e` | same | 0.000000 | unchanged |
| `landing-chromium-desktop-dark.png` | 1366×5161 | `4efb916cbb170649b3013732d46ff48d5bf85a14cc58ddcaa2223584f49c2ade` | same | 0.000000 | unchanged |
| `landing-webkit-iphone.png` | 390×5921 | `20a2e65da3244fbf39e737335c40ba48baa98d3b7df7cdb8c0b617ea29aa0be2` | same | 0.000000 | unchanged |
| `quick-capture-webkit-iphone.png` | 390×1467 | `8bc3debd2383e7d932d6074739e2889a59b8ad33212db85abe9129ff2bf42177` | same | 0.000000 | unchanged |
| `transactions-chromium-desktop-dark.png` | 1366×993 | `c72f6a6a035490d16252e44a8f950aae81cd6db650c2875bf1a59c38f06a27cf` | same | 0.000000 | unchanged |
| `transactions-webkit-iphone.png` | 390×1773 | `5cd44e456e954ef7f1d79fff8606b75661bd00e693b4fe9fafadf312ca138503` | same | 0.000000 | unchanged |

All eight P10/P11 PNG pairs are **byte-identical**. Their RGB pixel-diff ratio, mean absolute RGB difference and maximum channel difference are all exactly zero.

## Manual review notes

The selected contact set was visually reviewed after the hash/pixel comparison.

- Dashboard desktop dark: sidebar, topbar, cards, planning rows and action hierarchy remain intact.
- Dashboard phone dark: fixed bottom navigation remains visually separated from content; no stable clipping or overlap is introduced.
- Dashboard WebKit iPhone: light workspace layout and bottom navigation remain stable after the first-paint ownership fix.
- Landing desktop/iPhone: public Guided Story composition remains unchanged; P11 AppShell work does not leak into public presentation.
- Quick Capture WebKit iPhone: compact form, field stack and fixed navigation remain readable with no settled-state geometry shift.
- Transactions desktop dark/WebKit iPhone: filters, totals, empty ledger surface and mobile navigation remain stable.

There is therefore **no intentional settled visual diff to approve**. P11 changes only when the layout-critical AppShell custom properties become available: they now exist on the server-rendered shell before hydration instead of appearing only after the client mounted marker.

## Automated acceptance context

P11 candidate head `ea5756ccee62ba5b6ab56f7a9983a0061289a8ed` produced:

- CI #2032 / run `31244036703`: success;
- Browser smoke: 94 passed, 0 failed/flaky;
- Cross-device UI audit: 554 scheduled, 427 passed, 127 intentional skips, 0 failed, **0 flaky**;
- CodeQL #1138 / `31244036704`: success;
- Secret-history #1138 / `31244036708`: success;
- database checks: correctly classified not required for this presentation/test/docs change.

The candidate head changes after this documentation report is committed, so these results are intermediate evidence only. Protected exact-head checks must rerun on the final documentation head before owner review.

## Acceptance boundary

This report satisfies the **candidate visual-review portion** of P11-T2. It does not satisfy:

- physical Android Chrome acceptance;
- physical iOS/Safari acceptance;
- production verification of the exact P11 code, because Vercel does not currently create a PR preview deployment for #321;
- final owner merge/program archival.

The actual P11 fix must first reach an owner-approved deployed commit before physical-device checks can validate that implementation.