# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15
**Current main baseline:** `6459fdf7ed59119bf220993ff5c1637789323429` (#388 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — Release Readiness Audit v1 is complete; bounded blocker remediation is now authorized, beginning with RRB-01. PBT-AC15 remains an owner decision.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **RRB-01 — authenticated mixed-ledger rendered financial-truth proof** — add one bounded authenticated browser scenario on current main proving income + expense + internal transfer compose into the rendered per-account balances and aggregate income/expense totals without test-only finance shortcuts. **Done when:** transfer remains neutral to income/expense; rendered account balances/totals match the deterministic fixture; focused browser evidence plus exact-head protected checks pass; any exposed product defect becomes an explicit bounded fix rather than being hidden inside the test. **Next actor:** agent.

## NEXT

- [ ] **RRB-05 — verified support/privacy contact** — prove `support@moneyflow.app` / domain control or replace public support/privacy surfaces with an owner-controlled verified channel before any external beta. Owner/domain decision required before assuming control.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — record current production provider state for password policy, confirmation, CAPTCHA, rate limits, trusted callbacks/OAuth and edge controls; retain #40/#174 as owner/provider decisions. No provider write without scoped approval.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — owner/legal boundary; record review/remediation without AI-issued compliance certification.
- [ ] **RRB-09 — production deployment/provider identity read-back** — tie canonical origin, authenticated mode, deployed commit and intended provider identity to the release candidate using read-only evidence when available.
- [ ] **RRB-02 / RRB-03 / RRB-07 / RRB-08** — resolve P2 hosted-restore, destructive recent-auth edge, Accessible Authentication and current physical-device proof gaps in bounded tasks or explicit owner acceptance where policy permits.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after P1 entry gates allow it. Capture real-user core-loop, correction/recovery, balance/history trust and support evidence without leaking private financial data.

## BLOCKED

- [ ] **Controlled closed beta** — blocked until RRB-01, RRB-04, RRB-05, RRB-06 and RRB-09 satisfy their P1 entry gates and no unresolved P0 exists.
- [ ] **Public-beta release** — blocked until audit blockers have final dispositions, controlled-beta evidence is available, required provider/security decisions are resolved and PBT-AC15 is recorded.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting.
- [ ] **RRB-05 operator contact/domain choice** — ownership/control must be proven or an owner-controlled replacement selected before external beta.
- [ ] **RRB-06 legal/privacy decision** — competent owner/legal review determines applicable operational obligations and remediation.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **Release Readiness Audit v1** — PR #388 merged as `6459fdf7…`; canonical `docs/release/RELEASE_READINESS_AUDIT_V1.md` contains the seven-dimension readiness matrix, nine bounded RRB blockers and controlled closed-beta plan. Final head `04c3f600…` passed CI #2484, CodeQL #1559 and Secret history #1559. Public/closed beta remain blocked on explicit evidence/decision gates.
- [x] **Open-work reconciliation** — complete through #387; historical work was classified against current main and #40/#174 remain intentional owner/provider decisions.
- [x] **`js-yaml` 4.3.1 security backport** — #386 merged from current main with full protected checks; stale Dependabot #320 closed superseded.
- [x] **Dispatcher boundary reconciliation** — #384 merged; lifecycle closed by #385 and stale #380 closed superseded.
- [x] **Amount focus hotfix** — #383 merged with exact-head UI/browser evidence.
- [x] **UI evolutionary refresh Slice 1 + Slice 2** — #370 and #381 merged.
- [x] **Phases A–D; P1 Secure / P2 Recover / P3 Prove** — accepted completed records with named limitations preserved.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness blocker sequence, controlled-beta gates and owner public-beta decision |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. Historical issues/PRs are provenance, not authority, once reconciled.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
