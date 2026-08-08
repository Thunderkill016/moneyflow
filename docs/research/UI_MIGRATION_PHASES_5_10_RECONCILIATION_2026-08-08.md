# MoneyFlow UI migration — Phases 5–10 delivery reconciliation

- **Recorded:** 2026-08-08
- **Repository:** `Thunderkill016/moneyflow`
- **Audited main:** `a65f6f59167b894f9e538e5840e989e27250fdd4`
- **Purpose:** reconcile post-merge lifecycle truth before Phase 11 final acceptance
- **Authority boundary:** merged code + exact-head workflow evidence + read-only Vercel deployment evidence outrank stale pre-merge status headers in the dedicated Phase 5–10 packets.

## Why this record exists

The Phase 5–10 implementation pull requests were merged successfully, but several dedicated work packets still carry their pre-merge `active`, `ready_for_review`, `evaluating` or `implementing` headers. Those headers are historical execution state, not current product state. Rewriting the historical body of every packet before Phase 11 would add noise and could obscure the evidence sequence, so this reconciliation records the actual delivered state in one current source and `CURRENT_PROJECT_MEMORY.md` points here.

This record does **not** mark the overall P0–P11 program accepted. Phase 11 remains open for the final exact-head matrix, visual review, physical-device evidence and dependency-ordered production journey.

## Reconciled phase table

| Phase | Product PR | Exact implementation head | Protected evidence | Main merge | Production evidence | Reconciled state |
|---|---|---|---|---|---|---|
| P5 Transactions/Capture/Timeline | #306 | `15a7ed6fcaf97596088f365c7703e9d3227ed97d` | CI #1831 `31070857527`; CodeQL #949 `31070857501`; secret #949 `31070857528` — success | `f6cea659030397e21d4287912faef173bc7a0966` | `dpl_GCYtqTVBnRuKLrEd3k7G7TnTkbbt` — READY production | delivered / merged / deployed |
| P6 Accounts/Transfer | #307 | `3d41d812a9eab934d262a6765928fad17500ccd8` | CI #1857 `31077818858`; CodeQL #974 `31077818561`; secret #974 `31077818555` — success | `372036fe8d1e583c3a81083ebef11f902e4f8b46` | `dpl_GD5hVfLXh66rmrJnZiiADN8f4HK9` — READY production | delivered / merged / deployed |
| P7 Planning | #308 | `e273e3911537d6a90f680d4382058f0d8023b0d0` | CI #1871 `31088167232`; CodeQL #987 `31088167509`; secret #987 `31088167470` — success | `31fc4e852623ee503ee85a728f4be52d1c874d1b` | `dpl_4tr8rU45ZvixXt31WUVSNuUKQu6G` — READY production | delivered / merged / deployed |
| P8 Secondary/Safety | #309 | `5469838fe724081ac8f13e2005d88349a7671866` | CI #1939 `31151391032`; CodeQL #1050 `31151391029`; secret #1050 `31151391001` — success | `8b97566a9bb70228ea5593d545660900aa626efb` | `dpl_BvY4C3T3szH22FDq93WxwGTBMHc7` — READY production | delivered / merged / deployed |
| P9 Public/Auth cleanup | #318 | `f6e797fa1197787a3b06bc48c0ee5c6de76948a4` | CI #1981 `31179395858`; CodeQL #1088 `31179395145`; secret #1088 `31179395087` — success | `10a11d3492af02cf303ff1ee6981e734676c15fd` | `dpl_3DKmriP8MV8YTw2hHeMuMtHHAmav` — READY production | delivered / merged / deployed |
| P10 Legacy retirement | #319 | `9912dc621306c73f14407e175eb1a468b90ea933` | CI #2025 `31242364910`; CodeQL #1132 `31242365127`; secret #1132 `31242365044` — success | `a65f6f59167b894f9e538e5840e989e27250fdd4` | `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` — READY production | delivered / merged / deployed; P11 found one retry signal requiring final-acceptance remediation |

## Phase-specific delivered boundaries

### P5

- Transactions, quick capture and Timeline presentation moved behind local owners and shared primitives.
- Integer-VND, split exactness, transfer exclusion and soft-delete recovery were preserved.
- Cross-device browser evidence was green on the exact PR head.

### P6

- Accounts and Transfer presentation moved behind local owners.
- Active totals remain currency-separated; archived balances/history remain visible; transfer mutation semantics were preserved.
- A zero-balance account-closing rule remains a separate financial-product decision, not unfinished P6 UI work.

### P7

- Budgets, commitments, recurring income and Goals moved behind Planning owners.
- Copy was corrected so expected obligations and Goal earmarks are not represented as locked cash.
- Tracking-budget semantics remain unchanged; envelope/rollover/funding models are not hidden P7 requirements.

### P8

- Reports, Categories, Inbox review, Rules, Imports and Settings/data-rights presentation moved behind secondary/safety owners.
- The mobile Rules add-action regression discovered during evaluation was fixed before merge.
- Full backup/restore, provider-backed recent authentication and bank sync remain separate product/security scope.

### P9

- Landing/Auth source ownership was aligned with Guided Story + Fresh Blue.
- Dead public/auth CSS generations were retired and both mobile entry actions remained reachable.
- Public routes remain light-only; auth/provider semantics were not changed.

### P10

- Migrated authenticated legacy presentation layers were retired or reassigned to current owners.
- `MinimumTargetSizeContract` was removed after direct ownership and target-size evidence.
- `src/app/legacy.css` remains intentionally because `globals.css` is still its one live foundation import.
- `src/app/document-theme.css` remains semantic token authority; no DTCG pipeline was introduced.
- Exact P10 source gate reached one legacy import, zero `!important` declarations and zero unauthorized document selectors.

## P11 evidence quality finding

The P10 cross-device job succeeded overall, but the final artifact contained **one flaky WebKit/iPhone test**: `signed-in shell exposes one authored navigation model`. The first attempt observed mobile navigation already visible while the shell parent still had `padding-bottom: 0`; retry #1 passed. Playwright therefore classifies the test as flaky rather than first-attempt passed.

Source inspection found a concrete reason: AppShell layout variables were defined only under `html[data-moneyflow-shell="mounted"]`, and that marker is added by client `useEffect`. The P11 branch moves the same shell-owned variables onto `.shell` so the server-rendered shell has mobile reserve/layer/focus geometry before hydration. Browser evidence is also split so first-paint shell reserve is checked immediately, while document-level scroll padding waits for the explicit mounted marker.

This finding does not invalidate the merged P10 implementation scope, but it **does** prevent claiming final P11 acceptance until the corrected exact-head matrix returns zero failed and zero flaky tests.

## Production observation after P10

Read-only Vercel evidence on 2026-08-08 established:

- latest P10 production deployment `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` is `READY` for `main@a65f6f59167b894f9e538e5840e989e27250fdd4`;
- public `/` returned HTTP 200 with current Guided Story/Fresh Blue rendering;
- `/login` returned HTTP 200 with current Auth presentation;
- unauthenticated `/dashboard` reached the expected Login boundary;
- no runtime-error cluster was found in the inspected one-hour window.

These are valid post-merge production observations, but they do not substitute for P11's dependency-ordered authenticated production journey after physical-device gates.

## Remaining program boundary

P0–P10 implementation is delivered on `main`. The only current UI-migration execution phase is P11 final acceptance. The program must remain open until:

1. the corrected exact-head browser matrix has zero flaky/failed tests;
2. critical visual evidence is reviewed;
3. physical Android Chrome evidence exists;
4. physical iOS Safari evidence exists or the owner explicitly waives that parent-plan exception with limitations;
5. the post-physical production journey is verified;
6. current memory/issue state is reconciled and the owner accepts/merges the closure.

Dedicated Phase 5–10 packet status headers should therefore be read as historical pre-merge execution metadata. This record plus merged code/evidence is the current lifecycle reconciliation until final program archival.