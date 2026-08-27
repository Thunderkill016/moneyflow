# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-27 (post-#497)
**Current main baseline:** `4261cc392870b2d5615ca5d37c38e6ddb42e4ff3` (PR #500 squash-merged)
**Post-merge projection:** PR #501
**Release readiness:** **NOT PUBLIC-BETA READY**. RRB-08 closed by owner declaration on 2026-08-27 — one Android device on Chrome, no iOS/Safari observation. RRB-02 and RRB-05 closed by explicit owner decision on 2026-08-27; RRB-04/06/09 remain owner/provider/legal/read-access dependent. Product work never substitutes for those evidence lanes.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies. Open PRs and unmerged changes remain candidate evidence until merge.

## CHỈ BẠN LÀM ĐƯỢC — ba việc, mỗi việc vài phút

Ba việc còn lại, đã được đặc tả đầy đủ, nằm im 9–33 ngày. Không việc nào cần
code. **#398 đã đóng ngày 27/08** — bằng chứng điện thoại thật đầu tiên của
chương trình này.

| Việc | Chờ từ | Làm gì | Ước tính |
|---|---|---|---|
| **#40** | 25/07 | Supabase Dashboard → Auth → bật leaked-password protection → chạy lại Security Advisor | ~5 phút |
| **#174** | 31/07 | Đọc lại cấu hình provider/Auth/firewall và dán kết quả vào issue | ~15 phút |
| **#426** | 18/08 | Một quyết định: bộ chọn cách ghi (`CaptureSheet`) nên nằm ở đâu trên desktop, khi topbar đã có CTA riêng | quyết định, không phải code |

**RRB-02** đã đóng ngày 27/08/2026 bằng quyết định giới hạn của chủ dự án — đúng
nhánh mà chính gate này cho phép. Logic khôi phục có 42 assertion pgTAP chạy ở mọi
lượt CI; thứ còn chưa chạy là riêng đường Supabase quản lý, và điều đó được ghi
nhận là giới hạn đã chấp nhận chứ không phải đã chứng minh.

## NOW

- [x] **RRB-08 — current physical-device proof** — issue #398 closed by the owner on 2026-08-27 on a POCO X8 Pro, Android, Chrome, authenticated, verdict PASS. Coverage is one Android device; no iOS/Safari observation exists. Evidence in `docs/plans/active/rrb-08-physical-device-proof.md`.

No agent-executable product/governance slice is selected in this post-merge projection. PR #498 is candidate-only until its exact head has required checks, resolved review threads, unchanged base/main and an owner squash merge.

## NEXT

- [ ] **#432 P2 — Low-Maintenance Ingestion** — PR #464 is merged and the projection has been applied; select a new bounded evidence-backed source, normalization or exception-first review slice; reduce interventions/100 transactions without reducing match precision.
- [x] **RRB-02 — hosted restore proof or explicit limitation** — closed 2026-08-27 by the **explicit owner limitation decision** this gate always allowed. Restore is not unverified: `supabase/tests/database/restore_user_archive.test.sql` runs **42 pgTAP assertions over 464 lines** against the real `restore_user_archive` function on every CI run, covering removal reverting the overwritten profile, a bad restore staying recoverable, and a corrected restore rebuilding the ledger, alongside 19 unit-test files on the archive contracts. What stays unproven is narrower than the gate's name suggests: the managed-Supabase path specifically — extensions, roles, `security definer` behaviour and timeouts on a large archive — has never been exercised outside local Postgres. Recorded as an accepted limitation, not as proof.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — owner/provider-gated.
- [ ] **Controlled closed beta** — only after release entry gates clear and no unresolved P0 exists.

## BLOCKED / EXTERNAL EVIDENCE

- [x] **RRB-05 — verified support/privacy contact** — closed by owner decision 2026-08-27 (PR #502). The published address is now the owner's own mailbox, replacing `support@moneyflow.app` on `moneyflow.app`, a domain this project does not own and which serves another company's product. `src/lib/support-contact.test.ts` fails the build if any address on an unowned domain reappears under `src/`. What is proven is that the operator can read the mailbox; no claim is made that a personal Gmail address is the right long-term support channel.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state plus #40/#174 decisions require provider read access; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — competent owner/legal review required.
- [ ] **RRB-09 — production deployment/provider identity read-back** — requires current provider/deployment evidence.
- [ ] **Controlled closed beta / public beta** — blocked by the release-readiness contract; #432 product work does not weaken it.

## OWNER DECISION

- [x] **PR #431 — conflicting pre-#432 product-direction candidate** — closed 2026-08-26 as superseded by merged #432/#433 authority; branch retained on origin.
- [ ] **#426 — simplification program disposition** — preserve evidence-backed friction reductions, but do not restore the corrected false navigation premise or let it compete with #432 as master direction.
- [ ] **#403 — performance disposition** — remains open but no longer the default agent item; resume only if deliberately promoted after higher-value product work.
- [ ] **#174 / #40 provider security decisions** — verify provider state before change/closure.
- [ ] **RRB-05 contact, RRB-06 legal, RRB-02/RRB-03 limitation decisions, PBT-AC15 public-beta go/no-go** — owner boundaries remain explicit.

## HOLD

- [ ] **#403 implementation** — measured, open, not the current product slice.
- [ ] **#426 further implementation** — held pending reconciliation with #432.
- [ ] **Provider integration / native mobile / Wealth / Together / AI mutation** — horizon only; each requires dependency evidence and a bounded researched specification.
- [ ] **Phase E Creative Territories / Phase F broad redesign** — parked; not current authority.

## RECENTLY DONE

- [x] **PR #490 — a nine-digit report total stays inside its cell** — squash-merged as `0cdb1deacf3329de6f333dafec1762f3434d77d8`, returning `main` to green. Originally recorded as: `main` is red because the cross-device audit reports `financial-value-overflowed` on `/reports` at tablet-landscape. The limit predates this session and became visible when PR #487 stopped the demo dating its salary in a past month; the audit did not catch it there because `classify` selected no UI audit for that change. `report-metrics` joins the existing dense-scale rule for summary owners.
- [ ] **PR #498 — licence, Node pin, build identity, health check** — post-merge projection only. The last four engineering-benchmark gaps. `LICENSE` is AGPL-3.0, matching Firefly III: anyone may self-host, but running a modified copy as a service obliges publishing changes; MIT would let a hosted competitor close its source. Node pinned to 22 because CI builds on 22 while local ran 24.16 unnoticed all day. The deployed commit is now baked in and shown on `/security`, and `/api/health` is deliberately shallow so it cannot fail on provider maintenance or probe the database.
- [x] **PR #497 — client errors reach a log a person reads** — squash-merged as `2187a3cec72275dde8851d856bb6322358e427ac`. `logClientError` wrote only to the browser console, so a user hitting a bug in production was invisible. Reports now post to an own route and land in platform runtime logs — no vendor, no new data processor, dependencies unchanged at 17. The server re-sanitises rather than trusting the client and answers 204 in every case.
- [x] **PR #496 — public security page** — squash-merged as `6bc4b6877429f0f491348a34390dd6dc68988e5b`. It also carried PR #495's commits, because #496 was branched from #495 rather than from `main`; #495 was closed as superseded. From the industry benchmark: every commercial product in this category publishes one and MoneyFlow did not, while already doing most of what such a page describes. Split three ways — what the product does, what the platform provides and we cannot verify, and what does not exist. Reporting points at the private channel `SECURITY.md` already defines; no address is invented.
- [x] **PR #495 — board reflects RRB-08 closed** — squash-merged as `da872d92a1e37ec346bdd733d5f61aeb95d8394c`. Records that the owner closed `#398` on 2026-08-27, moves it out of NOW and out of the owner-action table, and restates release readiness: one gate closed, RRB-02/04/05/06/09 still open and the product still not public-beta ready.
- [x] **PR #494 — RRB-08 owner observation recorded** — squash-merged as `da872d92a1e37ec346bdd733d5f61aeb95d8394c`. First current real-phone evidence in this program: POCO X8 Pro, Android, Chrome, authenticated, owner verdict PASS. Recorded verbatim with unstated fields marked as unstated rather than filled in. **#398 stays open**: whether this closes RRB-08 is the owner's declaration, not an agent's.
- [x] **PR #493 — the knowledge contract checks locally** — squash-merged as `cac5f157e6f89a6c0871f89e18f309c9113badaa`. `check:knowledge` returned early without a pull-request event, so a PR memory record was validated for the first time on the runner. That produced three red runs in one day for one class of mistake. It now also validates every record this branch touches, working tree and untracked files included, and the board leads with the four owner-only actions that have sat 9–33 days.
- [x] **#491 / PR #492 — a demo-fixture change selects the visual audit** — squash-merged as `9e2c7db6a048e35234b4d6612d562bcc31709084`. The audit runs with `NEXT_PUBLIC_APP_MODE: "demo"`, so `src/lib/demo/` defines every value it measures, yet nothing under `src/lib/` selected it. Replaying the matchers over PR #487's merge commit returns no selection, which is how the `/reports` overflow reached `main`. Narrow on purpose — `src/lib/demo/` only — with a test pinning that other domain modules still skip it.
- [x] **#488 / PR #489 — the app tells the truth about connectivity** — squash-merged as `8161898898a6a21ef7cc15da8e85233ea428318a`. Awareness only: nothing is queued, cached or retried. Awareness, not capability: nothing is queued, cached or retried.
- [x] **#486 / PR #487 — the demo agrees with itself** — squash-merged as `c79a0e8770e857f5acf39ca4fa86536b43344d66`. Three dashboard panels disagreed: the statement added a 4.209.000 ₫ constant no transaction produced, while the category and weekly panels built from real rows correctly showed nothing, and a fixture row labelled "Hôm nay" had been six weeks old. Demo and authenticated now compute expense identically, and fixture dates plus their relative labels derive from one resolved date passed in by callers. Found by reading the cross-device audit screenshots.
- [x] **PR #485 — the trend draws the income it already computed** — squash-merged as `5c4335d7e17a93d17187f03b29ec8b23521e1b82`. `buildFinancialReport` always returned income per bucket and the page drew only the expense bar. Both series now share one scale, the empty state keys on any activity rather than expense alone, the screen-reader list and `aria-label` report both, and a text legend keeps the distinction off colour alone. Found by the repository audit.
- [x] **PR #484 — a wrong URL now has a way back** — squash-merged as `968288754a59c466c7a3a6b41c76055ba826e0f3`. No `not-found.tsx` existed, so production served Next's built-in English fallback with no route back; verified live before the change. A Server Component with no client JS, no `AppShell` dependency so it renders for signed-out visitors, leading with `/` so one link is correct for both audiences, and its own CSS Module rather than the baselined `.route-error` globals. Found by the repository audit rather than by an issue.
- [x] **#403 attribution result / PR #483** — squash-merged as `0f3e64f1ee5670bea2ca1e5ff5edae64a79e9462`. Issue #403 was closed by the owner on 2026-08-26. The `workflow_dispatch` experiment merged in #419 was finally run (`32991729913`). The loading boundary is confirmed as the early-paint mechanism but fires 1 navigation in 20, and `/dashboard` LCP differs by 160 ms between arms against 368 ms of variance measured on `/`, a route the change cannot affect. Recorded as a **negative result**: the boundary is not the lever for #403 and no performance claim follows in either direction.
- [x] **#418 / PR #482 — patched postcss and nanoid** — squash-merged as `9e2f7f862c89df7544f2b1e262ce7d2c2bb0ceb7`. Confirmed by the provider: both Dependabot alerts now report `fixed`, 0 open. The override's provenance was recovered from `158a9d69`; it exists to stop Next resolving its own nested `postcss 8.4.31`, so it stays and is raised to a patched release with an explicit `nanoid` override. The security test's exact pin, which made applying a security fix fail the security test, is corrected to a patched floor and proven non-vacuous.
- [x] **#417 / PR #481 — stale draft flag can skip the contracts** — squash-merged as `bc68b5a0fc5c6921848ab18a9b26fb38941247dc`. Verified on PR #482: a draft pull request now runs the policy, build, static, unit/RLS and database checks for real instead of reporting skipped-success. Eight jobs gated on the draft flag from their own event payload, which the draft→ready race makes stale; a surviving draft-event run skipped every shard and reported success, so a head could merge with the knowledge, migration identity, classification and diff-hygiene contracts never having run. All nine occurrences removed; `classify` path selection is now the sole gate, as `AGENTS.md` already declares. No branch-protection, required-check, permission or `CODEOWNERS` change.
- [x] **#478 / PR #479 — open the rows behind a report figure** — squash-merged as `f1bc0607bbed80bec3b0d76526c75fe1291e5c62`. `/reports` had no link from any figure to its transactions; category and account rows now open `/transactions` bounded by the report's own window. An account drill-down carries `kind: "expense"` because `filterTransactions` also matches `destinationAccount`. Accounts sum exactly, categories answer membership, and the difference is pinned by test. No schema, RPC, RLS or provider change.
- [x] **#476 / PR #477 — which account the money left from** — squash-merged as `7509d02d25fa2b106c56dc246478fa0d12d920c4`. Reports broke expense down by category and time only; an account breakdown is added to `buildFinancialReport` and rendered beside the category one. Split rows belong **whole** to the paying account rather than being distributed as categories are, transfers stay excluded, and account amounts sum to the range's expense total. No schema, RPC, RLS or provider change.
- [x] **#474 / PR #475 — show the reserve picture instead of only refusing with it** — squash-merged as `2da83e10155c17accfc7ca01b6f3e184a164d182`. `adjust_savings_goal` already enforced `total_allocated + amount <= greatest(0, balance − unpaid commitments)`; the user met it only as a rejection naming two causes and giving neither figure. The goals page now states balance, bills protected, goals reserved and what is left, mirroring the RPC exactly with a test asserting the boundary from both sides. Omitted rather than guessed when an input read fails or in demo. No RPC, migration, RLS or provider change.
- [x] **#472 / PR #473 — carry last month's plan into an empty month** — squash-merged as `dcd3d3bac1506341014d48856133371187d3ede6`. `previousBudgets` were already loaded and used only for comparison text; one action now applies them through the existing `upsert_monthly_budget` RPC. Additive only: a category already budgeted this month is never overwritten, non-positive previous limits are skipped, and the offer is computed from live budget state so it disappears once nothing is missing. No new RPC, migration, RLS or provider change.
- [x] **#470 / PR #471 — unpaid bills are not free money** — squash-merged as `b0099f70910237c8c1b26826effc3fb91085d3b1`. Corrects a defect introduced by #469: unassigned money counted only budget limits, so an unpaid recurring commitment in an unbudgeted category was reported as free cash. Coverage is computed live from client budget state; a bill whose category has a budget is claimed once by that limit, and paid, archived or other-month occurrences claim nothing.
- [x] **#468 / PR #469 — money that has not been given a job yet** — squash-merged as `e33bbd24f1b8bdcc70f185d2f242b7cc45cb05b4`. The budgets page states `unassigned = income recorded this month − limits assigned this month` from recorded income only, selected exactly as the dashboard selects it, with transfers excluded and no carry-over between months. Over-allocation is reported as its own labelled state rather than by colour. It reports arithmetic and gives no spending guidance, guarded by a vocabulary test. No schema, RLS, RPC, provider or ledger-mutation change.

- [x] **#463 / PR #464 — Direct CSV confirmed-rule dry-run** — squash-merged as `3975007738a3cf383c11e73b9e6d9fdfccfb2f59`. Existing explicit rules normalize eligible Direct CSV dry-run rows through exact server-validated rule evidence; every row remains in the existing review/atomic approval path, with no auto-posting, inference or financial-intent memory.
- [x] **#460 / PR #461 — remembered Direct CSV column mapping** — squash-merged as `ba2890670ceabed049aa1ed3bee0a9c8593b194a`. The user can explicitly save and later choose a same-device map for an exact normalized header shape; it stores no source/financial data and never auto-applies or commits a transaction.
- [x] **PR #462 — owner-opt-in agent harness auto-merge** — squash-merged as `86ef47a12e835d303f3550b89caa8ee22306c601`. The host may merge only a run-owned draft PR with fresh required checks, resolved threads, unchanged main/base and its observed head SHA; no child merge/provider/production authority is granted.
- [x] **#458 / PR #459 — Direct CSV recovery handoff** — squash-merged as `3876666da38bdd446c49053da827af731d55cf54`. A server-returned retained batch id exposes existing Inbox/history review actions and tells the user not to retry blindly; it never performs a financial or source mutation.
- [x] **#454 / PR #455 — deterministic PWA Share candidate rules** — squash-merged as `7a758843296b08167ba33ddb1f76e2f81a044a6d` after exact-head Class 3 checks. Explicit rules normalize only matching future Share candidates through an atomic server validation path; every candidate remains pending, with no automatic approval, ledger write, raw-source rewrite, provider/native/AI expansion.
- [x] **#452 / PR #453 — confirmed Inbox rule capture** — merged as `ac86d273876414c76fc050b11d3904dddfbb93b6`. Explicit non-transfer review confirmation creates only a future candidate-stage rule; no automatic approval, ledger write, source rewrite, backfill, migration or provider/native/AI expansion.
- [x] **#450 / PR #451 — PWA Share Target atomic source** — merged as `4d80fbe915155061fc3152740bb65c9cfa5c09ba` after exact-head Class 3 checks. Authenticated `/api/share-target` → `/capture/share` text/CSV persistence creates only pending Inbox batches/candidates; demo stays browser-local with no ledger write or automatic approval.
- [x] **#448 / PR #449 — reviewed source lifecycle → clearing** — merged as `9e709a2116a560da673539a3ff3994928b22262b`. Reviewed exact `posted` evidence may advance one eligible account leg `pending → cleared`; source state never establishes `reconciled`, overwrites ledger facts, deletes facts or demotes user/statement truth.
- [x] **#446 / PR #447 — event-sourced capability harness + same-PR lifecycle convergence** — merged as `eb8861c71dbc5b8173e7e48fff1293470a639816`.
- [x] **#442 / PR #445 — explicit source lineage + lifecycle evidence** — merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0`; exact lineage only, no fuzzy replacement or source-driven ledger overwrite.
- [x] **#443 / PR #444 — fail-closed plan authority resolution** — merged as `99257178ff416e5b1c875f62aea05035824ca9a5`.
- [x] **#440 / PR #441** — changed same-ID source observations can be reviewed without overwriting ledger/reconciliation/canonical provenance.
- [x] **#438 / PR #439** — deleted exact-source reimport/restore precedence is explicit and replay-safe.
- [x] **#436 / PR #437** — later non-manual source evidence can attach to one reviewed existing unprovenanced transaction without mutating its ledger facts.
- [x] **#434 / PR #435** — Direct CSV persists provenance and commits selected rows atomically.
- [x] **#432 P0 / PR #433** — acquisition-first long-term direction became master authority.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `432-vietnam-long-term-product-strategy.md` | master product program | sequencing, invariants, metrics and phase gates |
| `public-beta-trust.md` | release parent program | release-readiness blockers and owner public-beta decision |
| `rrb-08-physical-device-proof.md` | active owner validation | real-phone smoke only; no provider/deployment/production mutation |
| `403-fcp-attribution.md` | held measurement packet | resume only by owner promotion |

## Board rules

1. `npm run plan:resolve` must pass before an agent selects or continues implementation from `NOW`/`NEXT`.
2. `NOW` means current authorized execution, not merely an open issue.
3. One current agent-executable product/governance slice at a time; independent owner/provider/physical-device lanes may remain open.
4. A long-term phase becomes work only when its bounded issue/spec/packet is promoted.
5. A PR that completes the current agent slice must converge this board **before owner handoff in that same PR**; merged work must not remain in `NOW` and routine cleanup cannot be deferred.
6. `OWNER DECISION` is never auto-resolved by an agent.
7. Historical issues/PRs are provenance, not authority, once reconciled.
8. A completing PR may project post-merge `CURRENT_PROJECT_MEMORY.md` truth only when board + memory carry the same PR projection marker; the entire unmerged branch remains candidate evidence.
9. Baseline mismatch is a hard stop. A completing PR may carry an explicit same-PR post-merge projection only if projected Current Work has zero current agent-executable slices, its completed packet leaves `active/`, projected memory converges in the same PR, and `Lifecycle impact: completes current slice` is declared. While open, that projection is validation-only and cannot authorize task selection. After the exact matching squash merge it may activate. Dedicated reconciliation PRs are recovery-only for legacy/stale state or exceptional merge races, not the normal feature lifecycle.
