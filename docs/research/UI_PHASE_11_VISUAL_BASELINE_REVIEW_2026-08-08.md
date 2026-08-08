# MoneyFlow UI Phase 11 — selective visual baseline review

- **Reviewed:** 2026-08-08
- **Baseline:** P10 exact head `9912dc621306c73f14407e175eb1a468b90ea933`
- **Latest reviewed source candidate:** `59490eaf7d739ec5838eca53d046590a4302ef92`
- **P10 UI artifact:** `9017516431`, `ui-audit-evidence-31242364910-1`, `sha256:24e4b9fc354fdd03497f31d767c351f139ffd49f13b40fc2762b6c132f8f3805`
- **P11 UI artifact:** `9018358358`, `ui-audit-evidence-31245158440-1`, `sha256:de29f06b58593a81dcc4ca733f49bfa5f9c9e2fd2fd2c9cf7559a2167b035978`
- **P10 Playwright summary:** 554 total / 426 passed / 127 skipped / 1 flaky / 0 unexpected
- **P11 Playwright summary:** 554 total / 427 passed / 127 skipped / **0 flaky / 0 unexpected**
- **Review result:** **PASS — no stable visual diff in the selected critical baseline set**

## Purpose

Phase 11 requires selective visual baselines and review of every intentional diff rather than treating automated interaction checks as visual acceptance. The P11 candidate repairs two timing/ownership defects discovered only by reading raw retry evidence:

1. AppShell mobile reserve was unavailable until the client mounted marker appeared;
2. demo transaction persistence could return success and navigate before a queued React state updater executed the localStorage side effect.

Neither change is intended to redesign settled UI. This review therefore compares the same deterministic full-page screenshots from the final P10 artifact and the latest P11 source candidate artifact.

## Selected baseline set

The review intentionally covers the changed AppShell boundary plus public and transaction surfaces across light/dark, desktop/mobile and Chromium/WebKit evidence.

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

All eight selected P10/P11 PNG hashes are present unchanged in the latest source-candidate artifact. Their RGB pixel-diff ratio, mean absolute RGB difference and maximum channel difference remain exactly zero.

## Manual review notes

- Dashboard desktop dark: sidebar, topbar, cards, planning rows and action hierarchy remain intact.
- Dashboard phone dark: fixed bottom navigation remains visually separated from content; no stable clipping or overlap is introduced.
- Dashboard WebKit iPhone: workspace layout and bottom navigation remain stable after first-paint ownership repair.
- Landing desktop/iPhone: Guided Story composition remains unchanged; AppShell work does not leak into public presentation.
- Quick Capture WebKit iPhone: compact form, field stack and fixed navigation remain readable; synchronous demo persistence does not alter settled presentation.
- Transactions desktop dark/WebKit iPhone: filters, totals, empty ledger surface and mobile navigation remain stable.

There is therefore **no intentional settled visual diff to approve**. P11 changes state/geometry availability timing and demo mutation commit ordering, not stable visual design.

## Latest source-candidate automated context

Head `59490eaf7d739ec5838eca53d046590a4302ef92` produced:

- CI #2039 / run `31245158440`: success;
- policy, project knowledge, static quality, lint/typecheck, production build and database classification: success;
- complete unit/static-RLS suite: **785 passed / 0 failed**;
- Browser smoke: **94 passed / 0 failed / 0 flaky**;
- Browser artifact `9018297784`, digest `sha256:62bf778b664e596920ba9f0ee96edcc26a3cb177a95791ab70eee941781919ae`;
- Cross-device UI audit: **554 total / 427 passed / 127 intentional skips / 0 failed / 0 flaky**;
- UI audit artifact `9018358358`, digest `sha256:de29f06b58593a81dcc4ca733f49bfa5f9c9e2fd2fd2c9cf7559a2167b035978`;
- CodeQL #1145 / run `31245158435`: success;
- Secret-history #1145 / run `31245158458`: success.

The branch head will move once this evidence report and the remaining current records are updated. Protected exact-head checks must therefore rerun one final time on the resulting documentation head before owner review.

## Acceptance boundary

This report satisfies the **candidate visual-review portion** of P11-T2 for the latest source candidate. It does not satisfy:

- physical Android Chrome acceptance;
- physical iOS/Safari acceptance;
- production verification of the exact P11 code, because Vercel has not created a PR #321 preview deployment;
- final owner merge/program archival.

The actual P11 candidate must reach an owner-approved deployed commit before physical-device checks can validate that implementation.