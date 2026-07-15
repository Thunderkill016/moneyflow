#!/usr/bin/env python3
"""
Knowledge-driven gap analysis for MoneyFlow.

Only emits tasks that close a real best-in-class PFM gap
(see docs/research/08_PFM_BEST_IN_CLASS.md).

Never emits busywork (green test reruns, empty doc-only tasks).
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path


def read(root: Path, rel: str) -> str:
    p = root / rel
    if not p.is_file():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def exists(root: Path, rel: str) -> bool:
    return (root / rel).is_file()


@dataclass
class Check:
    id: str
    competitor: str
    jtdb: str
    title: str
    gap_desc: str
    done_khi: str
    non_goal: str
    task_id: str
    passed: bool


def backlog_ids(text: str) -> set[str]:
    return set(re.findall(r"^### (TASK-\d+)", text, re.M))


def task_status(text: str, tid: str) -> str | None:
    m = re.search(
        rf"### {re.escape(tid)} —[\s\S]*?- \*\*Status:\*\* `(\w+)`",
        text,
    )
    return m.group(1) if m else None


def next_retry_id(text: str, base: int) -> str:
    n = base
    while f"TASK-{n}" in backlog_ids(text):
        n += 1
    return f"TASK-{n}"


def inject(text: str, c: Check) -> tuple[str, str | None]:
    """Return (new_text, injected_id or None)."""
    tid = c.task_id
    st = task_status(text, tid)
    if st in ("ready", "in_progress", "deferred"):
        return text, None
    if st == "done":
        # Still failing after done → new task with higher id, same story
        tid = next_retry_id(text, int(c.task_id.split("-")[1]) + 500)
    elif st is not None:
        return text, None

    entry = f"""
### {tid} — {c.title}
- **Status:** `ready`
- **Competitor / pattern:** {c.competitor}
- **JTBD:** {c.jtdb}
- **Gap:** {c.gap_desc}
- **Mô tả:** Đóng gap best-in-class PFM (docs/research/08_PFM_BEST_IN_CLASS.md). {c.gap_desc}
- **Done khi:** {c.done_khi}
- **Non-goal:** {c.non_goal}
- **Source:** agent-competitor-gap (knowledge-driven)
"""
    marker = "## Nhật ký"
    if marker in text:
        text = text.replace(marker, entry + "\n" + marker, 1)
    else:
        text += entry
    return text, tid


def primary_nav_has_inbox(nav: str) -> bool:
    m = re.search(r"export const PRIMARY_NAV[\s\S]*?^];", nav, re.M)
    return bool(m and "/inbox" in m.group(0))


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    backlog_path = root / "AGENT_BACKLOG.md"
    text = backlog_path.read_text(encoding="utf-8") if backlog_path.is_file() else ""

    finance = (
        read(root, "src/lib/finance.ts")
        + read(root, "src/lib/reports.ts")
        + read(root, "src/lib/budgets.ts")
        + read(root, "src/lib/weekly-summary.ts")
    )
    finance_tests = (
        read(root, "src/lib/finance.test.ts")
        + read(root, "src/lib/reports.test.ts")
        + read(root, "src/lib/budgets.test.ts")
        + read(root, "src/lib/weekly-summary.test.ts")
        + read(root, "src/lib/transfers.test.ts")
    )
    transfers = read(root, "src/lib/transfers.ts")
    nav = read(root, "src/lib/nav-ia.ts")
    nav_test = read(root, "src/lib/nav-ia.test.ts")
    dash = read(root, "src/components/moneyflow-dashboard.tsx")
    tx = read(root, "src/components/transactions-page.tsx")
    dialog = read(root, "src/components/add-transaction-dialog.tsx")
    prefs = read(root, "src/lib/quick-add-prefs.ts")
    landing = read(root, "src/components/landing-page.tsx")
    landing_test = read(root, "src/lib/landing-copy.test.ts")
    onboard = read(root, "src/lib/onboarding.ts")
    export_lib = read(root, "src/lib/export-data.ts")
    shell = read(root, "src/components/layout/app-shell.tsx")
    manifest = read(root, "src/app/manifest.ts")
    e2e = read(root, "e2e/expense-path.spec.ts")
    perf = read(root, "docs/performance-budgets.md")
    attention = read(root, "src/lib/attention.ts")
    hooks = read(root, "src/hooks/use-transactions.ts")
    empty = read(root, "src/components/empty-state.tsx")
    pages = {
        "accounts": read(root, "src/components/accounts-page.tsx"),
        "budgets": read(root, "src/components/budgets-page.tsx"),
        "goals": read(root, "src/components/goals-page.tsx"),
        "commitments": read(root, "src/components/commitments-page.tsx"),
        "categories": read(root, "src/components/categories-page.tsx"),
    }

    checks: list[Check] = []

    def reg(
        cid: str,
        competitor: str,
        jtdb: str,
        title: str,
        gap: str,
        done: str,
        non_goal: str,
        tid: str,
        passed: bool,
    ) -> None:
        checks.append(
            Check(cid, competitor, jtdb, title, gap, done, non_goal, tid, passed)
        )

    # 1 Firefly/Actual — transfer integrity (THE money correctness bar)
    transfer_ok = (
        ("transfer" in finance_tests.lower())
        and (
            "exclud" in finance_tests.lower()
            or "ignore" in finance_tests.lower()
            or "not count" in finance_tests.lower()
            or "≠" in finance_tests
            or "!== \"transfer\"" in finance
            or "!== 'transfer'" in finance
            or 'kind === "transfer"' in finance
        )
        and "không tính chi" in transfers
    )
    reg(
        "transfer_integrity",
        "Firefly + Actual (transfer ≠ expense)",
        "Chuyển ví không được làm tăng ‘chi tháng’ sai.",
        "COMP: transfer never counts as expense (domain+UI)",
        "Domain totals and list copy must treat transfer as non-expense.",
        "Unit tests prove expense/budget/report/weekly ignore transfer; UI shows ‘Chuyển khoản · không tính chi’; npm test pass.",
        "Do not add bank sync or FX conversion engine.",
        "TASK-601",
        transfer_ok and "transferRowSubtitle" in tx and "transferRowSubtitle" in dash,
    )

    # 2 Money Lover / Ivy — fast entry
    entry_ok = (
        ("recentCategory" in dialog or "orderCategoriesByRecent" in dialog or "pushRecentCategoryId" in prefs)
        and ("amountInputRef" in dialog or "focus()" in dialog)
        and ("GHI_CHI_TIEU" in nav or "Ghi chi" in nav)
    )
    reg(
        "fast_entry",
        "Money Lover + Ivy (quick add)",
        "Ghi một khoản chi trong vài giây, lặp lại được.",
        "COMP: quick-add focus + recent categories + global Ghi chi",
        "Entry path must be FAB/dialog-fast with remembered categories.",
        "Dialog focuses amount; recent categories ordered; global CTA Ghi chi tiêu; npm test pass.",
        "Do not build OCR or SMS import as core.",
        "TASK-602",
        entry_ok,
    )

    # 3 Monarch — overview
    overview_ok = (
        "GHI_CHI" in dash
        and ("insights-kpi" in dash or "totals." in dash)
        and ("topCategor" in dash or "topExpense" in dash or "categories" in dash.lower())
    )
    reg(
        "overview_dashboard",
        "Monarch (overview dashboard)",
        "Mở app là thấy số dư / thu / chi / tiền đi đâu.",
        "COMP: Insights KPI overview complete",
        "Dashboard must present clear month picture + primary Ghi chi.",
        "Contract: dashboard has KPI section, recent, Ghi chi CTA; tests if pure helpers; npm test pass.",
        "Do not add net-worth hero or investment portfolio.",
        "TASK-603",
        overview_ok,
    )

    # 4 PocketGuard — safe to spend
    sts_ok = (
        ("có thể chi" in dash.lower() or "safe" in dash.lower() or "Safe" in dash)
        and ("chia đều" in dash or "giải thích" in dash or "explain" in dash.lower() or "safeExplain" in dash)
    )
    reg(
        "safe_to_spend",
        "PocketGuard (safe-to-spend)",
        "Biết hôm nay/tháng còn chi được bao nhiêu, có giải thích ngắn.",
        "COMP: safe-to-spend + always-visible explain",
        "Safe-to-spend without explain is incomplete vs best PFM.",
        "Insights shows safe-to-spend with one calm VN explain line always visible; npm test pass.",
        "Do not add AI spending advice.",
        "TASK-604",
        sts_ok,
    )

    # 5 Copilot — attention
    att_ok = "buildAttentionItems" in dash and "attention" in dash and len(attention) > 50
    reg(
        "attention",
        "Copilot Money (to-review / attention)",
        "Mở app biết việc cần xử lý (budget/hóa đơn), không ồn.",
        "COMP: attention strip budgets + bills",
        "Need calm attention for near/over budget and due bills.",
        "attention.ts covers near/over + unpaid due; dashboard strip; unit tests; npm test pass.",
        "Do not spam push notifications without opt-in.",
        "TASK-605",
        att_ok and "budget" in attention and ("due" in attention or "commitment" in attention or "Hóa đơn" in attention),
    )

    # 6 Actual / Sheets — export ownership
    export_ok = (
        ("EXPORT" in dash or "Xuất" in dash or "export" in dash.lower())
        and "EXPORT_SETTINGS_HREF" in export_lib
        and exists(root, "src/components/export-settings-page.tsx")
    )
    reg(
        "export_ownership",
        "Actual + Sheets (data ownership)",
        "Xuất dữ liệu của tôi bất cứ lúc nào, không bị lock-in.",
        "COMP: CSV export discoverable from Insights",
        "Export must be ≤2 clicks from home overview.",
        "Insights CTA to export; CSV formula-safe tests; npm test pass.",
        "Do not sell data or require paid export.",
        "TASK-606",
        export_ok,
    )

    # 7 Goodbudget lite — category budgets
    budget_ok = exists(root, "src/components/budgets-page.tsx") and (
        "budgetThreshold" in read(root, "src/lib/budgets.ts")
        or "near" in read(root, "src/lib/budgets.ts")
    )
    reg(
        "category_budgets",
        "Goodbudget / ML (category limits)",
        "Đặt hạn mức danh mục, biết gần/vượt một cách bình tĩnh.",
        "COMP: category monthly budgets with calm thresholds",
        "Budgets need near/over labels and transfer ignored in spent.",
        "budgets tests ignore transfer; calm labels; empty one CTA; npm test pass.",
        "Do not implement full YNAB envelope onboarding.",
        "TASK-607",
        budget_ok and "transfer" in read(root, "src/lib/budgets.test.ts").lower(),
    )

    # 8 Lunch Money — find transactions
    search_ok = "searchBar" in tx and (
        "isSearchShortcut" in shell or "⌘" in shell or "metaKey" in shell
    )
    reg(
        "txn_search",
        "Lunch Money (find transactions)",
        "Tìm lại giao dịch nhanh khi sổ dài.",
        "COMP: ledger search + keyboard shortcut",
        "Need filter/search on transactions and Cmd/Ctrl+K path.",
        "searchBar on transactions; ⌘K focuses or navigates with autofocus; unit tests for shortcut helper; npm test pass.",
        "Do not require server full-text search if client filter works for MVP.",
        "TASK-608",
        search_ok,
    )

    # 9 G5 landing + nav (product identity)
    landing_ok = (
        exists(root, "src/lib/landing-copy.test.ts")
        and ("thu chi" in landing.lower() or "có thể chi" in landing)
        and "Hộp thư giao dịch" not in landing
        and "Hộp thư" not in landing[:800]
    )
    nav_ok = (
        not primary_nav_has_inbox(nav)
        and 'href: "/inbox"' in nav
        and "ADVANCED" in nav
        and exists(root, "src/lib/nav-ia.test.ts")
    )
    reg(
        "product_identity",
        "G5 vs Money Lover ads / inbox pivot",
        "Web thu chi rõ ràng, không brand hộp thư, lab ẩn.",
        "COMP: landing G5 + inbox only in Advanced",
        "Primary IA and marketing must stay thu chi.",
        "landing-copy + nav-ia tests green; PRIMARY has no /inbox; ADVANCED has /inbox; npm test pass.",
        "Do not expand inbox marketing on landing.",
        "TASK-609",
        landing_ok and nav_ok,
    )

    # 10 Onboarding → first expense
    onboard_ok = (
        "/insights" in onboard
        and "/capture/quick" in onboard
        and "/inbox" not in onboard
    )
    reg(
        "onboarding_first_expense",
        "G5 + ML first-run",
        "Lần đầu vào app: có ví và đường ghi chi, không lạc inbox.",
        "COMP: onboarding ends at insights or quick add",
        "Onboarding must not send users to inbox-first.",
        "onboarding.ts paths only insights + capture/quick; tests; npm test pass.",
        "Do not require bank link onboarding.",
        "TASK-610",
        onboard_ok,
    )

    # 11 Empty states — best SaaS PFM
    def one_empty(page: str) -> bool:
        return "EmptyState" in page or (
            "Chưa có" in page and ("primary" in page.lower() or "Thêm" in page or "Ghi" in page)
        )

    empty_ok = all(one_empty(pages[k]) for k in ("accounts", "budgets")) and (
        "EmptyState" in dash or "Chưa có giao dịch" in dash
    )
    reg(
        "empty_states",
        "Best-practice SaaS PFM empty UX",
        "Màn trống chỉ một hành động rõ, không rối.",
        "COMP: core empty states single primary CTA",
        "Empty multi-CTA confuses first-run users.",
        "insights/accounts/budgets/goals/commitments/categories: one primary CTA each; npm test pass if contract tests added.",
        "Do not add secondary CTAs that compete with primary.",
        "TASK-611",
        empty_ok and "EmptyState" in empty,
    )

    # 12 Soft delete undo
    undo_ok = "Hoàn tác" in tx or ("restore" in tx.lower() and "DELETE_UNDO" in tx)
    reg(
        "soft_delete",
        "Consumer fintech undo",
        "Xóa nhầm vẫn hoàn tác được trong vài giây.",
        "COMP: soft-delete with undo on transactions",
        "Destructive money actions need undo.",
        "Soft-delete + Hoàn tác toast/restore; tests; npm test pass.",
        "Do not hard-delete without confirm.",
        "TASK-612",
        undo_ok,
    )

    # 13 Error parity VN
    err_ok = (
        "Mất kết nối" in hooks
        and ("Thử lại" in hooks or "thử lại" in hooks)
    )
    reg(
        "error_parity",
        "Trust UX (all PFM leaders)",
        "Lỗi mạng/lưu không im lặng — luôn có câu tiếng Việt.",
        "COMP: VN error messages on all transaction mutations",
        "Silent failures destroy trust in money apps.",
        "use-transactions every server path has VN fallback + network catch; npm test pass.",
        "Do not show raw stack traces to users.",
        "TASK-613",
        err_ok,
    )

    # 14 E2E critical path
    e2e_ok = (
        exists(root, "e2e/expense-path.spec.ts")
        and "insights" in e2e.lower()
        and ("export" in e2e.lower() or "csv" in e2e.lower() or "Tải" in e2e)
    )
    reg(
        "e2e_critical_path",
        "Ship quality (all serious products)",
        "Luồng ghi chi → thấy trên tổng quan → xuất được phải luôn xanh.",
        "COMP: Playwright expense path green",
        "Missing/broken e2e means MVP not shippable.",
        "npm run test:e2e passes; fix selectors to match a11y labels; no inbox dependency.",
        "Do not replace with inbox-only e2e.",
        "TASK-614",
        e2e_ok,
    )

    # 15 PWA start
    pwa_ok = 'start_url: "/insights"' in manifest or "start_url: '/insights'" in manifest
    reg(
        "pwa_home",
        "G5 PWA",
        "Cài PWA mở đúng Tổng quan thu chi.",
        "COMP: manifest start_url /insights",
        "PWA must not open inbox as home.",
        "manifest start_url /insights; unit test if present; npm test pass.",
        "Do not set start_url to /inbox.",
        "TASK-615",
        pwa_ok,
    )

    # 16 Perf documentation (real scores, not fake tasks)
    perf_ok = "LCP" in perf and "CLS" in perf and (
        "landing" in perf.lower() or "/landing" in perf
    )
    reg(
        "perf_documented",
        "Modern web PFM (Core Web Vitals)",
        "Trang marketing + tổng quan không giật CLS; LCP được đo và ghi.",
        "COMP: performance budgets documented with lab notes",
        "Undocumented perf is not a managed MVP.",
        "docs/performance-budgets.md has LCP/CLS targets and latest lab notes; optional remeasure; npm test pass for doc contract.",
        "Do not block ship forever on LCP&lt;2.5s if mitigations + CLS green documented.",
        "TASK-616",
        perf_ok,
    )

    # 17 Weekly review (ritual — Core polish)
    weekly_ok = "buildWeeklySummary" in read(root, "src/lib/weekly-summary.ts") and (
        "weekly" in dash.lower() or "WEEKLY" in dash
    )
    reg(
        "weekly_ritual",
        "Ritual / Copilot weekly review",
        "Cuối tuần nhìn lại thu chi ngắn, không email bắt buộc.",
        "COMP: in-app weekly summary on Insights",
        "Weekly card supports habit without spam.",
        "Weekly summary on insights with calm VN; link to reports; tests; npm test pass.",
        "Do not require email provider.",
        "TASK-617",
        weekly_ok,
    )

    # 18 Multi-wallet
    accounts_ok = exists(root, "src/components/accounts-page.tsx") and (
        "Thêm" in pages["accounts"] or "EmptyState" in pages["accounts"]
    )
    reg(
        "multi_wallet",
        "Money Lover multi-wallet",
        "Tiền mặt + bank + ví điện tử tách rõ.",
        "COMP: multi-wallet accounts page usable",
        "Accounts are core JTBD for VN users.",
        "Add/archive wallet UX; empty one CTA Thêm ví; npm test pass.",
        "Do not require open banking to add wallet.",
        "TASK-618",
        accounts_ok,
    )

    failed = [c for c in checks if not c.passed]
    injected: list[str] = []
    for c in failed:
        text, iid = inject(text, c)
        if iid:
            injected.append(iid)

    backlog_path.write_text(text, encoding="utf-8")

    report = root / "docs" / "COMPETITOR_GAP_REPORT.md"
    lines = [
        "# Competitor / best-in-class gap report\n\n",
        "Driven by `docs/research/08_PFM_BEST_IN_CLASS.md` — **no busywork tasks**.\n\n",
        f"**Passed:** {len(checks) - len(failed)} / {len(checks)}\n\n",
        f"**Injected:** {', '.join(injected) if injected else 'none'}\n\n",
        "| Check | Competitor pattern | Pass |\n|-------|-------------------|------|\n",
    ]
    for c in checks:
        mark = "✅" if c.passed else "❌"
        lines.append(f"| `{c.id}` | {c.competitor} | {mark} |\n")
    if failed:
        lines.append("\n## Open gaps (will become tasks)\n\n")
        for c in failed:
            lines.append(f"### {c.id}\n")
            lines.append(f"- JTBD: {c.jtdb}\n")
            lines.append(f"- Gap: {c.gap_desc}\n")
            lines.append(f"- Done: {c.done_khi}\n\n")
    report.write_text("".join(lines), encoding="utf-8")

    summary = {
        "total": len(checks),
        "passed": len(checks) - len(failed),
        "failed": [c.id for c in failed],
        "injected": injected,
        "all_pass": len(failed) == 0,
    }
    print(json.dumps(summary, ensure_ascii=False))
    print(
        f"[competitor-gap] {summary['passed']}/{summary['total']} "
        f"best-in-class checks; injected={injected}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
