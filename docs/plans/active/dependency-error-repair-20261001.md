# Dependency and verification error repair

**Execution state:** implementing. **Active role:** implementer. **Permission scope:** branch_write. **Owner:** Thunderkill016. **Issue/PR:** owner request to resolve all observed errors, PR #737. **Last updated:** 2026-10-01.

## Outcome and scope

Resolve the observed dependency advisories and remaining ESLint warning without changing financial behavior. This serves Canon Stage 0 reliable foundation and OWASP ASVS dependency hygiene. Exit requires zero npm audit findings, clean lint/typecheck, full local verification and required CI. It does not establish an exhaustive absence of every possible defect or production exploitation.

## Repository reconnaissance

Current main is `0afb5cd0`. npm audit reports 9 affected packages: Next.js, fast-uri, hono, undici, ip-address, brace-expansion and three dependent packages. Existing overrides pin fast-uri and hono below patched versions; the lockfile holds other vulnerable transitive versions. Next.js is pinned at 16.3.4. The quick-add legacy metadata test removes reviewStatus using an unused destructured variable, producing one lint warning. PRs #735/#736 are independent, currently passing static/unit/build gates while browser gates run.

## Research and adoption decision

Sources accessed 2026-10-01:

- [Next.js advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j): affected Node ImageResponse uses with attacker-controlled SVG; patched at 16.3.6. Installed dependency is affected by version; exploitability of this application is not established.
- [fast-uri advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj): normalization fix in 3.1.8; preserve the existing 3.x API family rather than adopting 4.x.
- [Hono advisory](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv): patched JSX escaping; update the existing 4.x override.
- npm registry metadata and audit identify compatible patched versions for the remaining packages. The registry is version evidence, not proof of application reachability.

Use compatible upstream releases and non-force npm audit repair within existing version ranges. Keep Next and its ESLint configuration aligned. No new dependency/provider or secret collection; existing licenses and architecture remain. Reject force/major upgrades. package.json and package-lock.json own versions; revert both for rollback. Node 22 compatibility is checked in CI; local host currently runs Node 24.

## Specification

Financial behavior must remain unchanged. Dependency versions must resolve to supported fixes without major upgrades. Legacy transaction fixtures must genuinely omit review metadata and remain rejected as trusted history. Installation must be reproducible from the lockfile.

## Implementation plan

1. Update Next/ESLint configuration to 16.3.8, fast-uri override to 3.1.8 and Hono to a patched 4.x version.
2. Refresh compatible vulnerable transitive dependencies; inspect lockfile/package diffs and run npm audit again.
3. Remove the lint warning by removing legacy review metadata from a cloned row; preserve the test's assertion.
4. Run clean install, npm audit, verify:prepush, CI-policy tests and affected browser evidence. Record limitations and CI status in the PR provenance record.

## Evaluation, ownership and rollback

Existing financial, capture, capability and provider-boundary tests guard behavior. Meaningful existing tests exercise the changed fixture; dependency changes require the full build/unit/browser gates, not a test that merely asserts version strings. No database/schema change. No production deployment or data mutation is included. Rollback is a revert of this focused PR. Required CI and owner review precede merge.

## Tasks

- [x] Inspect affected versions and primary advisories.
- [x] Update compatible dependencies and confirm zero audit findings.
- [x] Preserve the missing-review-metadata test while removing its lint warning.
- [ ] Complete final local and exact-head CI verification.
- [x] Record PR provenance; owner handoff follows verification.
