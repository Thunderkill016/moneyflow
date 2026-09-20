# MoneyFlow Megaplan — Q4 2026 (Oct–Dec roadmap)

**Status:** active roadmap
**Execution state:** owner-approved sequencing; individual tracks still require their own bounded packets/decisions before code
**Owner:** human owner
**Last updated:** 2026-09-20

A 2–3 month product-wide roadmap sequencing the shipped capability/agent layer, public-beta readiness gates, pending owner-review packets, acquisition foundation, and a bounded write-capability research track — with explicit owner decision gates. This document sequences; it does not itself authorize implementation — each track executes through its own packet/PR per `AGENTS.md` and `RISK_PROPORTIONAL_DELIVERY.md`.

## Repository reconnaissance

### Bối cảnh đã verify (facts, không phải suy đoán)

**Đã ship (main `d3fbad3d`):**
- Capability layer: v0 (#605) → ledger trust (#606) → `Minor` brand (#607) → transports P2a Bearer API (#610), P2b MCP endpoint (#613), P2c OAuth consent (#612)
- OAuth 2.1 flow đã verify end-to-end thật: authorize → login → consent → token → `/api/mcp` 200 → `ledger_summary` trả data thật dưới RLS (MCP Inspector + dev server + cloud Supabase, 2026-09-20)

**Đang mở / treo:**
- 12 packet trong `docs/plans/active/` — 5 ở trạng thái `owner_review`/`ready_for_review` (#590 home-ledger-trust, #592 activity-workstream, `ghi-5-stable-ledger-defaults`, `financial-wellbeing-product-strategy`, `repair-security-workflows`)
- Issues: #602 (activity open transaction), #559 (web redesign — WIP parked tại commit `818b213f`, recoverable qua local reflog), #174 (provider security controls — gate public beta), #608 (P2 — xong, cần đóng)
- `p2-capability-transports.md` — hoàn tất, cần archive sang `completed/`
- Master program #432: phases P0–P9; P0 gần xong (P0.8–P0.10 stale từ 8/21), P1 Acquisition Foundation blocked chờ bounded packet
- Supabase Site URL đang để `http://localhost:3000` — cần revert về prod domain (owner)
- SDK đã có `auth.oauth.listGrants()`/`revokeGrant()` — client-management UX khả thi ngay
- Vercel auto-deploy main → prod — `/oauth/consent` sẽ live sau deploy

## Research

Evidence base per track: Track A builds on the merged P2 packet (`docs/plans/completed/p2-capability-transports.md`) and its research (MCP spec, Supabase OAuth 2.1 docs, SDK types — `listGrants`/`revokeGrant` confirmed in the installed `auth-js`). Track B inherits `public-beta-trust` + issue #174's reconciled evidence. Track C/D defer to each packet's own research. Write-capability work has no prior spec — the A4 packet must do its own research before any code.

## Nguyên tắc ràng buộc (product law)

- Không claim provider sync/native capture trước khi có implementation
- Write/mutation capabilities = product-law-sensitive → **bắt buộc Class 3 spec + owner authorize trước khi code** (cùng mức với bank acquisition)
- RLS/tenant isolation không thể bypass; integer VND; không tạo data path song song
- Supabase OAuth server đang **beta** — pin behavior, theo dõi GA
- Rate limiter đang process-local (đã ghi hạn chế; edge limiter là plan riêng có sẵn)
- Bài học stacked PR: **không `--delete-branch`** khi còn PR con phụ thuộc

## Specification

Sequencing contract: five tracks, five owner gates (G1–G5), no track self-authorizes — each executes through its own bounded packet/PR per `AGENTS.md` and `RISK_PROPORTIONAL_DELIVERY.md`.

## Implementation plan

### 5 Track — sequencing Oct–Dec 2026

### Track 0 — Housekeeping (tuần 1, zero-risk, làm ngay)
| # | Việc | Effort |
|---|---|---|
| 0.1 | Đóng issue #608 (P2 done), link squash commits | minutes |
| 0.2 | Archive `docs/plans/active/p2-capability-transports.md` → `completed/` + cập nhật Delivery record (squash shas, CI, prod-verified note) | S |
| 0.3 | Reconcile #432 P0.8–P0.10 (stale từ 8/21 — verify done/still-open) | S |
| 0.4 | Owner: revert Supabase Site URL → prod domain sau deploy | owner, minutes — done (`https://mfvn.vercel.app`; legacy `www.moneyflow.app` serves a stale ~3-week-old build — removal/redirect noted as cleanup) |
| 0.5 | Owner: prod OAuth smoke — reuse existing `mcp-inspector` client (redirect URI is client-side localhost, works against prod) | owner, ~10min — done 2026-09-20: Inspector → `https://mfvn.vercel.app/api/mcp` → authorize → prod consent → approve → token → tools served real data |

### Track A — Capability/agent layer (P3 của capability program)
| # | Việc | Phụ thuộc | Class |
|---|---|---|---|
| A1 | Prod OAuth verification trên deployed domain — sau Track 0.4/0.5, xác nhận flow trên prod URL | deploy + 0.4/0.5 | ops — done 2026-09-20 on `mfvn.vercel.app` |
| A2 | **Connected-apps UX**: trang settings "Ứng dụng đã kết nối" — `listGrants()` hiển thị client + scopes + granted_at, `revokeGrant()` cho revoke. Đây là mảng trust còn thiếu: user approve nhưng không thấy/revoke được | — | 2 |
| A3 | Capability coverage expansion theo nhu cầu product: `accounts.list`, `budgets.status`, `goals.status`, `activity.candidates` — mỗi cái giờ là schema + injectable deps + golden + manifest regen (giá rẻ); chỉ thêm khi product surface cần, không add speculatively | — | 1 mỗi cái |
| A4 | **Write-capability spec research** (packet Class 3, docs-only): idempotency keys, provenance (`source: agent`, `oauth_client_id` claim), confirm-in-app vs auto-post modes, scope granularity (`write:transactions` vs `read`), reversal/undo semantics, audit trail, throttle chặt hơn, MCP `readOnlyHint=false` annotations, owner-only feature flag, staged rollout. **Không code** — chỉ spec | owner authorize (G2) | 3 |
| A5 | Invocation/audit log: D5 chỉ là structured log tối thiểu — quyết định có surface vào Activity feed không (gắn với C2/#592), và có cần bảng `capability_invocations` không | C2 | spec |

### Track B — Public-beta gates (parent: `public-beta-trust`, issue #174)
| # | Việc | Ai làm |
|---|---|---|
| B1 | #174 provider controls: Turnstile prod keys/config, auth rate limits, email provider settings — **owner ops** + agent verify bằng read-only evidence | owner + agent |
| B2 | `repair-security-workflows` review → merge/descope | owner review |
| B3 | `rrb-08` physical-device proof — owner quan sát trên điện thoại thật (đang blocked) | owner |
| B4 | Public-beta readiness assessment — honest go/no-go tổng hợp B1–B3 + trust evidence | agent draft, owner decide |

### Track C — Product experience (owner-review packets)
| # | Việc | Quyết định cần |
|---|---|---|
| C1 | #590 home ledger trust + next maintenance action | owner: merge / iterate / close |
| C2 | #592 Activity 2.0 unified maintenance + #602 (open exact transaction — slice của nó) | owner: merge / iterate / close |
| C3 | `ghi-5-stable-ledger-defaults` — capture defaults + post-save correction | owner review |
| C4 | `financial-wellbeing-product-strategy` — positioning, input cho P5 Connected Planning (#432) | owner review |
| C5 | #559 redesign — territory decision vẫn mở; exploration recoverable từ `818b213f` (local reflog). **Đề xuất park rõ ràng** hoặc owner chọn territory | owner decide |

### Track D — Acquisition foundation (master program #432 P1/P2)
| # | Việc | Phụ thuộc |
|---|---|---|
| D1 | #576 Vietnam bank-export pilot — hoàn tất evaluation: export thật → pipeline → trustworthy ledger, đo effort vs manual re-entry | owner provides export file |
| D2 | Nếu D1 "go" → P1 Acquisition Foundation **bounded Class 3 packet** (per #432: recon `/imports`, paste/share/upload/direct CSV, parser helpers, transaction mutations, transfer matching, reconciliation, RLS trước khi đề xuất schema) | G4 |
| D3 | P2 low-maintenance ingestion — hoãn tới khi P1 có evidence | D2 |

## Tasks

### Timeline

#### Tháng 10 — Consolidate & unblock owner reviews
- Track 0 toàn bộ (tuần 1)
- **G1**: owner review 5 packet pending (C1–C4 + B2) → merge/iterate/close từng cái
- A1 prod verification sau deploy
- **G2**: owner authorize A4 spec → agent viết write-capability packet (docs-only)
- B1 owner ops bắt đầu

#### Tháng 11 — Ship review decisions + beta gates
- C1/C2/C3 iterations land theo quyết định G1
- B1–B3 hoàn tất → **G3**: public-beta go/no-go (B4)
- A2 connected-apps UI ship (nếu C-stream không chiếm hết)
- D1 pilot evaluation → **G4**: go/no-go cho D2 spec
- A4 spec draft xong → owner review

#### Tháng 12 — Next horizon (phân nhánh theo gate)
- **Nếu G4 go**: D2 P1 acquisition spec → implementation slices
- **Nếu A4 spec approved (G5)**: write capability implementation — staged, owner-flagged, provenance-tagged, confirm-mode trước auto-post
- A3 capability expansion theo product pull
- Year-end: capability program retrospective + roadmap refresh

### Owner decision gates (tóm tắt)
| Gate | Khi | Quyết định |
|---|---|---|
| G1 | T10 | Review/close 5 pending packets |
| G2 | T10 | Authorize write-cap spec research |
| G3 | T11 | Public-beta go/no-go |
| G4 | T11 | #576 pilot → P1 spec authorize |
| G5 | T12 | Write-cap implementation authorize |

### Không nằm trong plan
- Dynamic client registration (giữ off — manual registration đủ)
- Redis/session infra cho MCP (stateless là quyết định đúng trên serverless)
- Per-capability OAuth scopes (v1 giữ đơn giản; `client_id` policy nếu cần sau)
- PAT mint/storage (đã reject — bypass RLS)
- #559 visual implementation (chờ territory decision)

## Evaluation

Acceptance for the roadmap itself: housekeeping (Track 0) merged and verified; each subsequent gate produces either an owner decision or an explicit carry-over. Progress is measured per track by its own packet's acceptance criteria — this document only sequences them.

### Rủi ro
- **Supabase OAuth beta thay đổi** → pin SDK version, contract tests, theo dõi changelog
- **5 pending packets có thể conflict** khi review → G1 xử lý tuần tự, không merge mù
- **Write-cap scope creep** → spec phải định nghĩa confirm-in-app trước; auto-post chỉ sau evidence
- **Owner bandwidth** — nhiều gate phụ thuộc owner ops (#174, Site URL, device proof, packet reviews): schedule các việc owner thành 1 buổi/batch
