#!/usr/bin/env python3
"""
Compare MoneyFlow codebase against competitor best-of patterns.
If gaps remain, inject TASK-6xx ready items into AGENT_BACKLOG.md.
Exit 0 always (injection is success). Prints JSON summary.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def read(root: Path, rel: str) -> str:
    p = root / rel
    if not p.exists():
        return ""
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def exists(root: Path, rel: str) -> bool:
    return (root / rel).exists()


def backlog_ids(text: str) -> set[str]:
    return set(re.findall(r"^### (TASK-\d+)", text, re.M))


def task_status(text: str, tid: str) -> str | None:
    m = re.search(
        rf"### {re.escape(tid)} —[\s\S]*?- \*\*Status:\*\* `(\w+)`",
        text,
    )
    return m.group(1) if m else None


def inject_task(text: str, tid: str, title: str, desc: str, competitor: str) -> str:
    if tid in backlog_ids(text):
        # Re-open if was done but check still fails
        st = task_status(text, tid)
        if st in ("ready", "in_progress", "deferred"):
            return text
        if st == "done":
            # new cycle task
            base = int(tid.split("-")[1])
            tid = f"TASK-{base + 1000}"  # e.g. 1601 retry space
            while tid in backlog_ids(text):
                n = int(tid.split("-")[1]) + 1
                tid = f"TASK-{n}"
        else:
            return text

    entry = (
        f"\n### {tid} — {title}\n"
        f"- **Status:** `ready`\n"
        f"- **Mô tả:** {desc} Ref: competitor pattern from {competitor}. "
        f"See docs/COMPETITOR_GAP_BAR.md + docs/research/07_GITHUB_OSS_BEST.md. "
        f"G5 only — no bank sync/AI/family/AGPL paste.\n"
        f"- **Source:** agent-competitor-gap\n"
        f"- **Done khi:** gap check passes; lint/typecheck/test pass.\n"
    )
    marker = "## Nhật ký"
    if marker in text:
        return text.replace(marker, entry + "\n" + marker, 1)
    return text + entry


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    backlog_path = root / "AGENT_BACKLOG.md"
    if not backlog_path.exists():
        print(json.dumps({"error": "no backlog"}))
        return 1

    text = backlog_path.read_text(encoding="utf-8")
    # Load key sources once
    sources = {
        "finance": read(root, "src/lib/finance.ts") + read(root, "src/lib/reports.ts") + read(root, "src/lib/budgets.ts"),
        "transfers": read(root, "src/lib/transfers.ts"),
        "nav": read(root, "src/lib/nav-ia.ts"),
        "dash": read(root, "src/components/moneyflow-dashboard.tsx"),
        "tx": read(root, "src/components/transactions-page.tsx"),
        "dialog": read(root, "src/components/add-transaction-dialog.tsx"),
        "landing": read(root, "src/components/landing-page.tsx"),
        "onboard": read(root, "src/lib/onboarding.ts"),
        "export": read(root, "src/lib/export-data.ts"),
        "attention": read(root, "src/lib/attention.ts"),
        "prefs": read(root, "src/lib/quick-add-prefs.ts"),
        "shell": read(root, "src/components/layout/app-shell.tsx"),
        "manifest": read(root, "src/app/manifest.ts"),
        "e2e": read(root, "e2e/expense-path.spec.ts"),
        "perfdoc": read(root, "docs/performance-budgets.md"),
        "weekly": read(root, "src/lib/weekly-summary.ts"),
        "empty": read(root, "src/components/empty-state.tsx"),
        "budgets_page": read(root, "src/components/budgets-page.tsx"),
        "accounts_page": read(root, "src/components/accounts-page.tsx"),
        "goals_page": read(root, "src/components/goals-page.tsx"),
        "commit_page": read(root, "src/components/commitments-page.tsx"),
        "cat_page": read(root, "src/components/categories-page.tsx"),
        "landing_test": read(root, "src/lib/landing-copy.test.ts"),
        "nav_test": read(root, "src/lib/nav-ia.test.ts"),
        "transfer_test": read(root, "src/lib/transfers.test.ts")
        + read(root, "src/lib/reports.test.ts")
        + read(root, "src/lib/budgets.test.ts"),
    }

    checks: list[dict] = []

    def add(cid, competitor, title, desc, passed: bool, task_id: str):
        checks.append(
            {
                "id": cid,
                "competitor": competitor,
                "title": title,
                "pass": passed,
                "task_id": task_id,
                "desc": desc,
            }
        )

    # --- Firefly / Actual: transfer ≠ expense ---
    tsrc = sources["finance"] + sources["transfer_test"]
    add(
        "transfer_not_expense",
        "Firefly/Actual",
        "COMP-GAP transfer never expense totals",
        "Harden domain: transfer excluded from expense sums, budgets, reports, weekly summary; unit tests must assert.",
        bool(
            re.search(r"transfer", tsrc, re.I)
            and (
                "exclud" in tsrc.lower()
                or "kind !== \"transfer\"" in tsrc
                or "kind !== 'transfer'" in tsrc
                or "ignores transfer" in tsrc.lower()
                or "exclude" in tsrc.lower()
            )
            and "transfer" in sources["transfer_test"].lower()
        ),
        "TASK-601",
    )

    # --- Firefly: transfer subtitle ---
    add(
        "transfer_subtitle",
        "Firefly",
        "COMP-GAP transfer list “không tính chi”",
        "All transfer rows use transferRowSubtitle / TRANSFER_LIST_HINT on transactions + insights.",
        "transferRowSubtitle" in sources["tx"]
        and "transferRowSubtitle" in sources["dash"]
        and "không tính chi" in sources["transfers"],
        "TASK-602",
    )

    # --- Ivy / Money Lover: quick add ---
    add(
        "quick_add_recent",
        "Ivy/MoneyLover",
        "COMP-GAP quick-add recent categories + amount focus",
        "AddTransactionDialog: recent categories order + amount autofocus on open.",
        "orderCategoriesByRecent" in sources["dialog"]
        or "recentCategory" in sources["dialog"]
        or "pushRecentCategoryId" in sources["prefs"],
        "TASK-603",
    )

    # --- Copilot: attention strip ---
    add(
        "attention_strip",
        "Copilot",
        "COMP-GAP attention strip on Insights",
        "buildAttentionItems wired on dashboard; budgets near/over + bills.",
        "buildAttentionItems" in sources["dash"] and "attention-strip" in sources["dash"],
        "TASK-604",
    )

    # --- MoneyFlow USP: safe-to-spend ---
    add(
        "safe_to_spend",
        "PocketGuard/MoneyFlow",
        "COMP-GAP safe-to-spend visible with explain",
        "Insights shows safe-to-spend / có thể chi with short VN explain always visible.",
        (
            "safe" in sources["dash"].lower()
            or "có thể chi" in sources["dash"]
            or "Safe" in sources["dash"]
        )
        and ("explain" in sources["dash"].lower() or "giải thích" in sources["dash"] or "chia đều" in sources["dash"]),
        "TASK-605",
    )

    # --- Actual/Sheets: export discoverability ---
    add(
        "export_discoverable",
        "Actual/Sheets",
        "COMP-GAP export ≤2 clicks from Insights",
        "Insights has Xuất CSV / EXPORT path; export-data helpers present.",
        (
            "EXPORT" in sources["dash"]
            or "export" in sources["dash"].lower()
            or "Xuất" in sources["dash"]
        )
        and "EXPORT_SETTINGS_HREF" in sources["export"],
        "TASK-606",
    )

    # --- Monarch: dashboard KPIs ---
    add(
        "dashboard_kpis",
        "Monarch",
        "COMP-GAP Insights KPI completeness",
        "Dashboard must show balance/thu/chi style KPIs + recent + Ghi chi CTA (GHI_CHI).",
        "GHI_CHI" in sources["dash"]
        and ("insights-kpi" in sources["dash"] or "KPI" in sources["dash"] or "totals" in sources["dash"]),
        "TASK-607",
    )

    # --- Lunch Money: search ---
    add(
        "txn_search",
        "LunchMoney",
        "COMP-GAP transaction search + ⌘K",
        "Transactions searchBar + app-shell Cmd+K shortcut to search.",
        "searchBar" in sources["tx"]
        and ("isSearchShortcut" in sources["shell"] or "⌘" in sources["shell"]),
        "TASK-608",
    )

    # --- G5 landing ---
    add(
        "landing_g5",
        "G5 vs ML ads",
        "COMP-GAP landing thu chi not inbox brand",
        "Landing + landing-copy tests forbid Hộp thư brand; require thu chi / có thể chi.",
        "Hộp thư" not in sources["landing"]
        and exists(root, "src/lib/landing-copy.test.ts")
        and ("thu chi" in sources["landing"].lower() or "có thể chi" in sources["landing"]),
        "TASK-609",
    )

    # --- Nav Core vs Lab ---
    add(
        "nav_lab",
        "Best-of IA",
        "COMP-GAP inbox demoted to Advanced",
        "PRIMARY_NAV no inbox; ADVANCED_NAV includes /inbox; tests in nav-ia.test.ts.",
        "/inbox" in sources["nav"]
        and "ADVANCED_NAV" in sources["nav"]
        and "Inbox is Advanced" in sources["nav_test"]
        or (
            "ADVANCED_NAV_LINKS" in sources["nav"]
            and 'href: "/inbox"' in sources["nav"]
            and "PRIMARY_NAV" in sources["nav"]
            and not re.search(
                r"PRIMARY_NAV[\s\S]{0,800}href:\s*\"/inbox\"",
                sources["nav"],
            )
        ),
        "TASK-610",
    )

    # fix nav_lab pass logic - my boolean is messy
    # recompute properly below after loop - actually fix now:
    # I'll fix in the add call - let me recalculate

    # --- Onboarding ---
    add(
        "onboarding_paths",
        "G5",
        "COMP-GAP onboarding ends at insights/ghi chi",
        "ONBOARDING_SKIP_HREF insights; QUICK capture/quick; never /inbox.",
        "/insights" in sources["onboard"]
        and "/capture/quick" in sources["onboard"]
        and "/inbox" not in sources["onboard"],
        "TASK-611",
    )

    # --- Empty states ---
    empty_ok = all(
        "EmptyState" in sources[k] or "empty" in sources[k].lower()
        for k in ("dash", "tx", "accounts_page", "budgets_page")
    )
    add(
        "empty_states",
        "SaaS UX",
        "COMP-GAP core empty states one CTA",
        "EmptyState or single primary CTA on insights/transactions/accounts/budgets at minimum.",
        empty_ok and "EmptyState" in sources["empty"],
        "TASK-612",
    )

    # --- Soft delete undo ---
    add(
        "soft_delete_undo",
        "SaaS",
        "COMP-GAP soft-delete Hoàn tác",
        "Transactions soft-delete with undo toast/restore path.",
        "Hoàn tác" in sources["tx"] or "restore" in sources["tx"].lower(),
        "TASK-613",
    )

    # --- Weekly ritual ---
    add(
        "weekly_summary",
        "Ritual/Copilot",
        "COMP-GAP weekly summary on insights",
        "Weekly summary module + dashboard card.",
        "weekly" in sources["dash"].lower() and "buildWeeklySummary" in sources["weekly"],
        "TASK-614",
    )

    # --- PWA start insights ---
    add(
        "pwa_start",
        "G5 PWA",
        "COMP-GAP manifest start_url /insights",
        "manifest start_url must be /insights not /inbox.",
        'start_url: "/insights"' in sources["manifest"]
        or "start_url: '/insights'" in sources["manifest"],
        "TASK-615",
    )

    # --- E2E expense path ---
    add(
        "e2e_expense",
        "Quality",
        "COMP-GAP e2e expense path present",
        "e2e/expense-path.spec.ts covers landing → add expense → insights → export.",
        exists(root, "e2e/expense-path.spec.ts")
        and "insights" in sources["e2e"].lower()
        and ("export" in sources["e2e"].lower() or "csv" in sources["e2e"].lower()),
        "TASK-616",
    )

    # --- Perf documented ---
    add(
        "perf_doc",
        "Web Vitals",
        "COMP-GAP Lighthouse scores documented",
        "docs/performance-budgets.md has LCP/CLS and lab scores or mitigation.",
        "LCP" in sources["perfdoc"] and "CLS" in sources["perfdoc"],
        "TASK-617",
    )

    # --- Ghi chi global CTA ---
    add(
        "ghi_chi_global",
        "MoneyLover FAB",
        "COMP-GAP global Ghi chi tiêu CTA",
        "GHI_CHI_TIEU_LABEL in nav-ia; shell FAB or primary.",
        "GHI_CHI_TIEU" in sources["nav"]
        and ("GHI_CHI" in sources["shell"] or "Ghi chi" in sources["shell"] or "fab" in sources["shell"].lower()),
        "TASK-618",
    )

    # Fix nav_lab - recompute last check with wrong boolean
    for c in checks:
        if c["id"] == "nav_lab":
            primary = sources["nav"]
            # crude: ADVANCED has inbox, PRIMARY block before ADVANCED shouldn't list /inbox as primary link
            has_adv_inbox = 'href: "/inbox"' in primary and "ADVANCED_NAV" in primary
            # PRIMARY_NAV array should not include href inbox
            pm = re.search(
                r"export const PRIMARY_NAV[\s\S]*?^];",
                primary,
                re.M,
            )
            primary_has_inbox = bool(pm and "/inbox" in pm.group(0))
            c["pass"] = has_adv_inbox and not primary_has_inbox and exists(
                root, "src/lib/nav-ia.test.ts"
            )

    failed = [c for c in checks if not c["pass"]]
    injected = []
    for c in failed:
        before = text
        text = inject_task(
            text,
            c["task_id"],
            c["title"],
            c["desc"],
            c["competitor"],
        )
        if text != before:
            injected.append(c["task_id"])

    backlog_path.write_text(text, encoding="utf-8")

    # Ship competitor bar report
    report = root / "docs" / "COMPETITOR_GAP_REPORT.md"
    lines = [
        "# Competitor gap report (auto)\n",
        f"**Generated by** `agent-competitor-gap.py`\n",
        f"**Passed:** {len(checks) - len(failed)} / {len(checks)}\n",
        f"**Injected tasks:** {', '.join(injected) if injected else 'none'}\n",
        "\n| Check | Competitor | Pass |\n|-------|------------|------|\n",
    ]
    for c in checks:
        mark = "✅" if c["pass"] else "❌"
        lines.append(f"| {c['id']} | {c['competitor']} | {mark} |\n")
    report.write_text("".join(lines), encoding="utf-8")

    summary = {
        "total": len(checks),
        "passed": len(checks) - len(failed),
        "failed": [c["id"] for c in failed],
        "injected": injected,
        "all_pass": len(failed) == 0,
    }
    print(json.dumps(summary, ensure_ascii=False))
    print(f"[competitor-gap] {summary['passed']}/{summary['total']} pass; injected={injected}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
