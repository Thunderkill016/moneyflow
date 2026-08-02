# Completed — landing and authentication product-evidence redesign

- **Accepted date:** 2026-08-02
- **Original packet:** `docs/plans/active/landing-auth-product-evidence.md`
- **Pull request:** #213
- **Merged commit:** `8afad4ecb6e29eeafdac0e6d025612e94043657a`
- **Final reviewed head:** `9369e59b41b9599bf764150b82a4ab3035e4ec82`
- **Execution state:** accepted
- **Permission used:** branch write and owner-authorized merge; no provider, database or production-data write

## Accepted outcome

MoneyFlow now uses one project-wide white-first neutral and trust-blue brand/action system across public and authenticated surfaces. Green remains reserved for income/success, red for expense/danger, amber for warning and violet for transfers or neutral money movement.

The public entry experience was rebuilt from the selected wireframes:

- landing: proof-led split hero using sanitized MoneyFlow product evidence;
- narrative: `ghi giao dịch → cập nhật tài khoản → mở sổ đối chiếu`;
- authentication: task-first form with a compact factual proof rail;
- existing login, registration, recovery, password update, Google OAuth, Turnstile, privacy acceptance and redirect behavior preserved;
- no testimonial, user count, fake balance, savings result, pricing claim, bank-sync implication or AI-advice claim added.

Current decision sources:

- `docs/design/PUBLIC_ENTRY_SELECTION.md`;
- `docs/design/BRAND_COLOR_SYSTEM.md`;
- `docs/design/DESIGN_DIRECTION_STATUS.md`;
- `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md`.

Signal Ledger remains rejected as an active design direction.

## Exact-head verification

CI run `30743370704` passed on final synchronized head `9369e59b41b9599bf764150b82a4ab3035e4ec82`:

- diff hygiene, project knowledge and CI classification;
- deployment configuration, CSS ownership and architecture;
- lint, typecheck, unit/static RLS and production build;
- fresh Supabase reset and pgTAP;
- Expense and Auth CAPTCHA browser smoke;
- production cross-device UI audit;
- CodeQL and secret-history scan.

Final Playwright artifact:

- artifact ID `8832162106`;
- digest `sha256:444a8d16f868644d227db8aec6861dff19a032f6c0eae0ea8718f7c01346b0c9`.

Human visual review covered landing light/dark and authentication mobile/desktop. The final observed mint-green proof-rail residue was corrected to the project brand role before merge.

## Production acceptance

Vercel deployment `dpl_22UMVziyynU6kuuHEC4B7ffw9iX1` is `READY` and identifies exact GitHub commit `8afad4ecb6e29eeafdac0e6d025612e94043657a` on `main`.

Production smoke on `https://mfvn.vercel.app`:

- `/` returned HTTP 200 and rendered the selected landing proposition and product evidence;
- `/login` returned HTTP 200 and rendered the task-first authentication flow;
- `/register` returned HTTP 200 and rendered registration, privacy acceptance and CAPTCHA state;
- no Vercel runtime-error cluster was found in the two-hour post-merge window checked on 2026-08-02.

This evidence confirms deployment and route rendering. It does not claim provider-side CAPTCHA policy, registration completion or OAuth callback acceptance beyond the existing provider state.

## Scope retained

No database schema, RLS, financial calculation, Supabase Auth behavior, OAuth provider configuration, Turnstile provider setting, dependency or production data was changed by this redesign.

## Rollback

Revert merge commit `8afad4ecb6e29eeafdac0e6d025612e94043657a` or promote the preceding production deployment. Provider and database rollback are not required because those boundaries were unchanged.
