# Product re-orientation — what MoneyFlow is, and what it has accumulated

**Date:** 2026-08-18
**Baseline:** `main@fec1195`
**Status:** assessment and proposal. Nothing is removed by this document.

MoneyFlow's product law names four jobs: **record quickly, know balances, understand
where money went, retain and export trustworthy data.** Everything below measures the
current product against those four sentences.

The numbers are counted from the repository, not estimated.

---

## 1. The navigation is already tiered, and better than I first reported

**This section corrects an error in the first version of this document.** I counted
sixteen destinations by grepping hrefs out of `src/lib/nav-ia.ts` and concluded that a
quarter of the navigation went to Inbox, imports and rules. That was wrong: it flattened
an information architecture that is deliberately tiered, and it made a well-made thing
look broken.

What is actually there:

| Tier | Contents |
|---|---|
| **Primary** — desktop sidebar and mobile tabs | Tổng quan · Giao dịch · **Nhập nhanh** (action) · Tài khoản |
| More → everyday | Báo cáo · Danh mục · Cài đặt |
| More → Kế hoạch | budgets · commitments · goals · income templates |
| More → **Nâng cao** | Hộp thư · Timeline · Quy tắc · Imports · Import CSV thẳng |

**The primary navigation is four items**, and they map cleanly onto the product's own
jobs: understand and balances (Tổng quan), the ledger (Giao dịch), record (Nhập nhanh),
accounts (Tài khoản). Inbox, rules, imports and timeline are already demoted to
"Nâng cao", under a comment in the source that reads *"so the app feels focused"*.

So the product law and the navigation do not contradict each other. Somebody already made
this call, and made it well. **No navigation change is recommended.**

The one weaker point that survives: **export has no destination of its own.** It is
mentioned inside the Báo cáo description ("Thu chi theo kỳ · xuất CSV") and lives at
`/settings/export`, so it is reachable rather than hidden — but retain-and-export is one
of the four jobs and it is the only one without a name in the navigation. That is worth
an owner's opinion, and it is not worth an agent's unilateral edit to a working IA.

## 2. The full surface is larger than the navigation admits

39 route files exist. Beyond the 16 navigable destinations:

- **Four capture surfaces** rather than one: `/capture/quick` plus `/capture/paste`,
  `/capture/share`, `/capture/upload`, none of the last three in navigation.
- **Two ledger views**: `/transactions` and `/timeline`, both navigable.
- `/insights` is a compatibility redirect to `/dashboard`, kept for links that no longer
  need keeping.
- Six settings sub-routes, seven auth/legal routes, and `/onboarding`.

A manual-first ledger with four jobs is carrying four ways to capture and two ways to
read the ledger.

## 3. Documentation has outgrown its usefulness

**335 markdown files, 3.8 MB.**

| Where | Files | Note |
|---|---|---|
| `docs/research/pr-memory/` | 130 | mandated, one per PR — correct as-is |
| `docs/plans/completed/` | 60 | archive of finished work |
| `docs/research/` (top level) | 44 | mixed live and historical |
| `docs/design/` | 14 | includes explicitly rejected directions |
| `docs/plans/active/` | 4 | the live board |
| everything else | ~83 | |

Inside the 44 top-level research files:

- **five** files about Webflow design categories, plus corpus inventories for **Framer**
  and **UXPilot** — design-tool research carried by a Vietnamese expense ledger;
- `PHASE_D_BRAND_STRATEGY.md`, whose successor phase was paused after the owner rejected
  every candidate;
- seven dated one-off UI phase documents from 2026-08-05 to 2026-08-08.

`docs/design/` still carries `CALM_LEDGER_V2.md` (self-declared historical) and
`SIGNAL_LEDGER_V3.md` (a rejected direction).

`docs/cyclewarden/` contains a readiness report from **a different product's agent
framework**.

**But deletion is not the fix, and this is the finding that matters:** these files
reference each other. `WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md` alone has nine inbound
references; the Framer and UXPilot inventories have four each. Deleting them naively
would leave dangling links and break the knowledge contract. The problem is not that
history exists — git keeps it regardless — it is that **nothing distinguishes live
authority from history at a glance**, so every reader pays to work it out.

## 4. The process itself is part of the weight

This is uncomfortable to write, because the process has genuine value and it caught real
defects while this assessment was being produced. But minimalism has to apply to how the
project is run, not only to what it ships.

Every pull request must produce a memory record. There are **130** of them. Non-trivial
work needs a packet; there are 60 completed ones and a 4-entry active board. A knowledge
contract, a CI-policy contract, an active-packet registry validator and a
presentation-ownership gate all run on top of the ordinary test suite.

What that machinery is worth, measured on this session rather than assumed: it rejected
two pull requests for missing their own memory record, caught a CSS class with no
presentation owner, caught a 44 px touch target that would have shipped, and — most
valuable — the review discipline caught a claimed 99 ms performance improvement that was
noise. Without it, `main` would contain a false performance claim.

What it costs: every change, however small, pays a fixed tax in records, packets and
gate cycles. A one-line fix and a subsystem rewrite pay nearly the same. That is the
definition of a process that does not scale down, and this product is small.

**The proportionate answer is not to dismantle it.** It is to make the tax scale with
risk, which the risk-proportional policy already claims to do for *gates* but not for
*paperwork*. A Class 0 documentation change and a Class 3 database change both require a
full memory record today.

## 5. What this suggests about direction

The product is not lost. Its financial core is genuinely strong: integer đồng, transfer
neutrality, soft delete with recovery, RLS with tenant-isolation tests, a real export and
a real delete path. Very few products at this stage have that.

What has drifted is **proportion**. Capability was added faster than identity was
defended, so today the navigation devotes as much room to import tooling as to
understanding money, and the export promise that underwrites the brand is not on it.

## 6. Proposal, in tiers by risk

Nothing here is executed by this document. Tier 1 is reversible and mechanical; tier 3
is a product decision only the owner can make.

### Tier 1 — separate authority from history (no deletion)

**Done in this change.** Sixteen files moved to `docs/archive/` behind a README stating
that nothing inside is authority: the Webflow/Framer/UXPilot design-tool research, seven
dated UI phase documents, and the CycleWarden report from another product. Inbound
documentation references were repointed; no behaviour changed and nothing was lost, since
git holds the history either way.

`CALM_LEDGER_V2.md` and `SIGNAL_LEDGER_V3.md` were candidates and **stayed put**. They are
load-bearing for code — `SIGNAL_LEDGER_V3.md` is read by three files under `src/` — and a
first attempt broke two tests. Moving them means changing those tests, which deserves its
own review. The lesson is worth stating plainly: inbound **code** references must be
checked, not only documentation links.

### Tier 2 — one open question about export

Export is the only one of the four jobs without a destination of its own. It is reachable
through Báo cáo and Settings, so this is a question rather than a defect, and it belongs
to the owner: does retain-and-export deserve naming in the navigation, or is being
reachable enough? I am not editing a working information architecture to settle a
question I raised on a miscount.

### Tier 3 — make the process scale down *(owner decision)*

Let the memory-record requirement follow the same risk classes the gates already use: a
short line in the pull request for Class 0 and Class 1, a full record for Class 2 and
above. That keeps the audit trail exactly where it has proven to catch things, and stops
charging a subsystem-sized tax for a one-line change.

### Tier 4 — decide what the product is not *(owner only)*

Three questions, each a real product decision rather than cleanup:

1. ~~Do Inbox, imports and rules deserve a quarter of the navigation?~~ **Withdrawn.**
   They are already behind More → Nâng cao; the question rested on my miscount.
2. **Do `/transactions` and `/timeline` both need to exist?** Two ways to read one ledger
   is a cost paid on every future change.
3. **Do four capture surfaces earn their keep?** `/capture/paste`, `/capture/share` and
   `/capture/upload` are not in navigation. If they are used, they should be findable; if
   they are not, they are maintenance with no audience.

**No feature should be removed on my judgement.** Each represents work someone chose to
do, and usage data would settle these questions faster than argument — which the project
does not currently collect.

## 7. What this document deliberately does not claim

It does not say the product is badly built; the evidence says the opposite about its
financial core. Nor does it argue for removing verification — the same session that
produced this document had four of its own mistakes caught by these gates. It does not assert any feature is unused, because nothing here measures
usage. And it makes no recommendation about brand direction, which is the owner's
judgement and was already exercised when every Phase E candidate was rejected.
