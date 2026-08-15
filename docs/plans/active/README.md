# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15
**Current main baseline:** `9911eafa157ecca5a1fd8571bb38712ac4de1445` (#391 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — RRB-01 is closed with current authenticated rendered financial-truth proof. Remaining P1 entry gates are provider/contact/legal/production-evidence boundaries; the next fully agent-owned repository task is RRB-07.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **RRB-07 — WCAG 2.2 Accessible Authentication proof** — produce bounded current-main browser/accessibility evidence for login, registration and recovery against the applicable WCAG 2.2 Accessible Authentication (Minimum) boundary. Reuse current auth/a11y harnesses; do not turn the task into a visual redesign. **Done when:** applicable authentication inputs/steps are mapped to the criterion, targeted browser evidence passes, and any actual defect is fixed only as a bounded release blocker with exact-head protected checks. **Next actor:** agent.

## NEXT

- [ ] **RRB-08 — current physical-device proof** — current release candidate needs bounded real-phone evidence after the latest UI slices/hotfix. **Next actor:** owner + agent; physical-device observation required.
- [ ] **RRB-02 — hosted restore proof or explicit limitation** — execute only against a disposable/authorized hosted target, or obtain explicit owner acceptance at the proper release boundary. **Next actor:** owner + agent if authorized.
- [ ] **RRB-03 — destructive recent-auth provider-edge proof or explicit limitation** — stale-AMR/account-mismatch destructive edges remain owner/provider-gated. **Next actor:** owner.
- [ ] **Controlled closed beta** — start only after all P1 entry gates are cleared and no unresolved P0 exists.

## BLOCKED

- [ ] **RRB-05 — verified support/privacy contact** — source publishes `support@moneyflow.app`, but operator control is unproven. External beta is blocked until the owner proves control or selects an owner-controlled replacement; the agent must not invent that choice.
- [ ] **RRB-04 — provider/Auth/firewall read-back** — current provider state for password policy, confirmation, CAPTCHA, rate limits, trusted callbacks/OAuth and edge controls is not available through the connected tools. #40/#174 remain owner/provider decisions; no provider write is authorized.
- [ ] **RRB-06 — Vietnam personal-data legal/privacy operational review** — requires competent owner/legal review; the agent does not issue a compliance certification.
- [ ] **RRB-09 — production deployment/provider identity read-back** — repository tooling available in this session does not expose current Vercel/Supabase production identity. Do not infer deployed SHA/origin/mode/provider state from repo CI.
- [ ] **Controlled closed beta** — blocked on RRB-04, RRB-05, RRB-06 and RRB-09 P1 entry gates and any future P0.
- [ ] **Public-beta release** — blocked until blocker dispositions, controlled-beta evidence, provider/security decisions and PBT-AC15 are complete.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing.
- [ ] **RRB-05 operator contact/domain choice** — prove control or select an owner-controlled replacement before external beta.
- [ ] **RRB-06 legal/privacy decision** — competent review determines applicable operational obligations/remediation.
- [ ] **RRB-02 / RRB-03 limitation decisions** — explicit owner acceptance is required if proof will not be executed at the applicable release boundary.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **RRB-01 authenticated mixed-ledger rendered financial truth** — issue #390 / PR #391. Current authenticated browser evidence proves a coherent two-account ledger with `2,700,000` VND aggregate balance, `2,000,000` income, `300,000` expense, `1,700,000` net, neutral `500,000` internal transfer, `1,200,000` cash and `1,500,000` bank balances. Final head `873f4d4d…` passed CI #2492, CodeQL #1566 and Secret history #1566 before protected squash merge as `9911eafa…`. Database/provider claims remain separately owned.
- [x] **Release Readiness Audit v1** — #388 merged as `6459fdf7…`; canonical matrix + nine RRB blockers + controlled closed-beta plan recorded.
- [x] **Open-work reconciliation** — complete through #387; #40/#174 remain intentional owner/provider decisions.
- [x] **`js-yaml` 4.3.1 security backport** — #386 merged; stale Dependabot #320 closed superseded.
- [x] **Dispatcher boundary reconciliation** — #384/#385 completed; stale #380 closed superseded.
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
