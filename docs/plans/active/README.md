# MoneyFlow — Current Work Board

**Last reconciled:** 2026-08-15
**Current main baseline:** `5a2ef2d9f42c22138c97ac97b822997a95c28569` (#386 merged)
**Release readiness:** **NOT PUBLIC-BETA READY** — open-work reconciliation is complete, Release Readiness Audit v1 is now the authorized current task, and PBT-AC15 remains an owner decision.

This board is the owner-facing answer to **“đang làm gì, tiếp theo là gì, cái gì đang block, cái gì cần tao quyết?”** Current code/provider truth outrank stale issue/PR bodies.

## NOW

- [ ] **Release Readiness Audit v1** — audit current product reality using `PASS / BLOCKED / OWNER-ACCEPTED LIMITATION`; cover financial correctness, recovery/data safety, auth/tenant isolation, security/privacy, usability/accessibility, deployment/operations, support and closed-beta readiness. Carry forward current evidence from reconciliation and accepted trust work: the mixed-ledger authenticated financial-truth scenario from historical #345, current Supabase production/security posture, physical-phone limitations, hosted-restore limitation, CI/runtime hardening findings, WCAG 2.2, OWASP ASVS 5.0, NIST SSDF 1.1 and current Vietnam personal-data law as applicable review inputs. **Done when:** one canonical audit, explicit blocker backlog and a controlled closed-beta validation plan exist. **Next actor:** agent.

## NEXT

- [ ] **Fix only release blockers found by the audit** — no speculative feature work or visual polish. Each blocker becomes its own bounded task with risk-selected evidence. **Next actor:** agent after audit.
- [ ] **Controlled closed beta** — onboard a small real-user cohort only after readiness gates allow it. **Done when:** real-user evidence exists for core jobs, correction/recovery, balance/history trust and support burden. **Next actor:** owner + agent.

## BLOCKED

- [ ] **Public-beta release** — blocked until the readiness audit is complete, unresolved P0/P1 blockers are zero or explicitly owner-accepted where policy permits, required provider/security decisions are resolved, controlled-beta evidence is available and PBT-AC15 is recorded. **Next actor:** owner after evidence.

## OWNER DECISION

- [ ] **#174 — provider-side security controls** — retain until current provider state is re-audited; no provider write without explicit scoped approval.
- [ ] **#40 — Supabase leaked-password protection** — verify current provider/plan state before enabling or closing; repository code cannot prove this setting.
- [ ] **PBT-AC15 — final public-beta go/no-go and accepted limitations** — agent prepares evidence; owner closes the gate.

## HOLD

- [ ] **Phase E Creative Territories** — paused; every proposed territory was owner-rejected and none is selected.
- [ ] **Phase F / broader Brand-Product Experience implementation** — not started and not implied by sequence.

## RECENTLY DONE

- [x] **Open-work reconciliation** — complete. Historical issues/PRs were classified against current main rather than merged for hygiene. No open PR remains; #40/#174 remain intentionally open owner/provider decisions.
- [x] **`js-yaml` 4.3.1 security backport** — fresh current-main PR #386 replaced Dependabot #320, preserved two deterministic knowledge-policy findings, then passed full ready-state CI #2467, CodeQL #1544 and Secret history #1544 before protected squash merge as `5a2ef2d9…`; #320 closed superseded.
- [x] **Dispatcher boundary reconciliation** — merged #384; lifecycle closed by #385 and stale #380 closed superseded.
- [x] **Amount focus hotfix** — merged #383; exact-head CI, CodeQL and secret-history passed, including browser smoke and cross-device UI audit.
- [x] **UI evolutionary refresh Slice 1 + Slice 2** — merged #370 and #381.
- [x] **Phases A–D; P1 Secure / P2 Recover / P3 Prove** — accepted completed records with named limitations preserved.

## Active packet registry

| Packet | Role now | Authority boundary |
|---|---|---|
| `public-beta-trust.md` | active parent program | release-readiness sequence, trust gates and owner public-beta decision |

## Board rules

1. `NOW` means current authorized execution, not merely an open issue.
2. New substantive work must appear here before it becomes execution authority.
3. Completion/abandonment updates this board in lifecycle closeout; merged work must not remain in `NOW`.
4. `OWNER DECISION` is never auto-resolved by an agent.
5. Historical issues/PRs are provenance, not authority, once reconciled.
6. Deeper implementation truth lives in [`CURRENT_PROJECT_MEMORY.md`](../../research/CURRENT_PROJECT_MEMORY.md); the active parent program lives in [`public-beta-trust.md`](public-beta-trust.md).
