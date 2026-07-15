#!/usr/bin/env bash
# Keep MoneyFlow autopilot fed until MVP_BEST_BAR is shipped.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKLOG="$ROOT/AGENT_BACKLOG.md"
SHIPPED="$ROOT/docs/MVP_SHIPPED.md"
MIN_READY="${MIN_READY:-3}"
export PATH="/home/thunder/.local/bin:${PATH}"

cd "$ROOT"
bash "$ROOT/scripts/agent-refill-backlog.sh" 2>/dev/null || true

python3 - "$ROOT" "$MIN_READY" <<'PY'
import re, sys
from pathlib import Path
from datetime import datetime, timezone

root = Path(sys.argv[1])
min_ready = int(sys.argv[2])
backlog_path = root / "AGENT_BACKLOG.md"
text = backlog_path.read_text(encoding="utf-8")

def count_status(status: str) -> int:
    return len(re.findall(rf"\*\*Status:\*\* `{status}`", text))

def existing_ids() -> set:
    return set(re.findall(r"^### (TASK-\d+)", text, re.M))

ready = count_status("ready")
ids = existing_ids()
added = 0
notes = []

if ready < min_ready:
    deferred_blocks = []
    for block in re.split(r"(?=^### TASK-\d+)", text, flags=re.M):
        m = re.match(r"^### (TASK-\d+) — (.+)$", block, re.M)
        if not m:
            continue
        if re.search(r"- \*\*Status:\*\* `deferred`", block):
            num = int(m.group(1).split("-")[1])
            deferred_blocks.append((num, m.group(1)))
    deferred_blocks.sort(key=lambda x: x[0])
    for num, tid in deferred_blocks:
        if ready + added >= min_ready:
            break
        pattern = rf"(### {re.escape(tid)} —[\s\S]*?- \*\*Status:\*\* )`deferred`"
        new_text, n = re.subn(pattern, r"\1`ready`", text, count=1)
        if n:
            text = new_text
            text = re.sub(
                rf"(### {re.escape(tid)} —[\s\S]*?)- \*\*Deferred:\*\*[^\n]*\n",
                r"\1",
                text,
                count=1,
            )
            added += 1
            notes.append(f"promoted {tid}")

CATALOG = [
    ("TASK-500", "BEST-MVP re-run full test suite and fix failures",
     "Run npm run lint && typecheck && test; fix any failure. If green, document in nhật ký only."),
    ("TASK-501", "BEST-MVP e2e expense path green",
     "npm run test:e2e must pass; fix selectors/copy drift. Demo mode."),
    ("TASK-502", "BEST-MVP transfer exclusion matrix complete",
     "Ensure finance/reports/budgets/weekly-summary all ignore transfer; add missing unit tests."),
    ("TASK-503", "BEST-MVP soft-delete + undo on transactions",
     "Hoàn tác toast works demo+server path messages VN; tests if pure helpers."),
    ("TASK-504", "BEST-MVP insights KPI + Ghi chi + export CTAs",
     "Contract test dashboard source: KPI widgets + GHI_CHI + EXPORT present."),
    ("TASK-505", "BEST-MVP empty states one CTA all core routes",
     "insights, transactions, accounts, budgets, goals, commitments, categories — one primary CTA."),
    ("TASK-506", "BEST-MVP safe-to-spend always explained",
     "One calm Vietnamese line always visible under safe-to-spend."),
    ("TASK-507", "BEST-MVP attention strip calm max 4",
     "Budgets near/over + bills due; optional inbox neutral; tests."),
    ("TASK-508", "BEST-MVP onboarding never inbox",
     "Paths only /insights and /capture/quick; tests assert."),
    ("TASK-509", "BEST-MVP nav Advanced vs Core lock",
     "inbox/rules/imports not primary; landing forbid inbox slogans tests green."),
    ("TASK-510", "BEST-MVP export ≤2 clicks from insights",
     "Visible Xuất CSV; e2e or contract."),
    ("TASK-511", "BEST-MVP production build demo env",
     "Build with placeholder Supabase env green; note in README if needed."),
    ("TASK-512", "BEST-MVP mvp-verify.sh green",
     "Create/run scripts/mvp-verify.sh = lint+typecheck+test+build; exit 0."),
    ("TASK-513", "BEST-MVP a11y money signs + focus",
     "a11y-baseline tests pass; fix regressions."),
    ("TASK-514", "BEST-MVP mobile FAB and bottom nav",
     "FAB not covered by demo banner; mobile CSS fix if needed."),
    ("TASK-515", "BEST-MVP Lighthouse document landing+insights",
     "Run or update docs/performance-budgets.md with lab scores and mitigations."),
    ("TASK-516", "BEST-MVP Actual-style budget remaining polish",
     "Remaining amount clear mono; calm near/over; no envelope method."),
    ("TASK-517", "BEST-MVP Ivy-style quick add polish",
     "Amount autofocus; recent categories; keep-open stable."),
    ("TASK-518", "BEST-MVP Firefly-style transfer subtitle everywhere",
     "transferRowSubtitle on all transfer rows; tests."),
    ("TASK-519", "BEST-MVP commitments empty + pay path",
     "Empty CTA; pay/undo still correct; tests."),
    ("TASK-520", "BEST-MVP goals empty + insights card",
     "Empty CTA; featured goal or calm empty."),
    ("TASK-521", "BEST-MVP categories CRUD uniqueness",
     "categories tests green; empty CTA."),
    ("TASK-522", "BEST-MVP reports transfer excluded + CSV safe",
     "reports tests green formula escape."),
    ("TASK-523", "BEST-MVP privacy + delete account",
     "privacy-policy and delete-account tests green."),
    ("TASK-524", "BEST-MVP demo banner register CTA",
     "Demo sticky; Đăng ký visible; no cover primary actions."),
    ("TASK-525", "BEST-MVP code-split remaining heavy dialogs",
     "dynamic() on account/budget/commitment/goal dialogs if missing."),
    ("TASK-526", "BEST-MVP prefetch Ghi chi on insights idle",
     "router.prefetch /capture/quick or dialog chunk on idle."),
    ("TASK-527", "BEST-MVP weekly summary → reports",
     "Link works; calm copy."),
    ("TASK-528", "BEST-MVP Cmd+K focus search on transactions",
     "focus=search query autofocus search input."),
    ("TASK-529", "BEST-MVP RLS check script green",
     "npm run check:rls or document skip if no docker; no weaken RLS."),
    ("TASK-530", "BEST-MVP no raw financial logs",
     "safe-log + safe-analytics tests pass."),
    ("TASK-531", "BEST-MVP landing G5 copy regression",
     "landing-copy tests pass; fix any drift."),
    ("TASK-532", "BEST-MVP integer money fuzz edge cases",
     "Add tests: large VND, zero reject, transfer same account reject."),
    ("TASK-533", "BEST-MVP split expense still not break budgets",
     "If split exists: budget counts lines; tests."),
    ("TASK-534", "BEST-MVP income templates separate from bills",
     "Nav/planning: income-templates secondary; no primary clutter."),
    ("TASK-535", "BEST-MVP re-verify all exit criteria in MVP_DEFINITION",
     "Update docs/MVP_DEFINITION.md checkboxes or note evidence SHAs."),
    ("TASK-536", "BEST-MVP re-run e2e after polish wave",
     "test:e2e green again after recent UI changes."),
    ("TASK-537", "BEST-MVP performance content-visibility panels",
     "Below-fold insights/landing content-visibility without breaking a11y."),
    ("TASK-538", "BEST-MVP settings hub clear export path",
     "Settings lists export/privacy/delete clearly."),
    ("TASK-539", "BEST-MVP Vietnamese error strings audit",
     "User-facing ok:false messages non-empty VN in hooks/actions."),
    ("TASK-540", "BEST-MVP ship decision: write MVP_SHIPPED if gates green",
     "Run mvp-verify + e2e; if green write docs/MVP_SHIPPED.md with date and evidence; else fix only."),
]
for cycle in range(2, 8):
    CATALOG.append((
        f"TASK-{540+cycle}",
        f"BEST-MVP quality cycle {cycle}: fix test/e2e/build regressions",
        f"Full verify lint+typecheck+test+e2e+build; fix failures only. Cycle {cycle}. No new features outside G5.",
    ))

if ready + added < min_ready:
    for tid, title, desc in CATALOG:
        if tid in ids:
            continue
        if ready + added >= min_ready + 2:
            break
        entry = (
            f"\n### {tid} — {title}\n"
            f"- **Status:** `ready`\n"
            f"- **Mô tả:** {desc}\n"
            f"- **Source:** agent-ensure-work BEST_MVP catalog\n"
            f"- **Done khi:** lint/typecheck/test pass; commit+push if daemon.\n"
        )
        marker = "## Nhật ký"
        if marker in text:
            text = text.replace(marker, entry + "\n" + marker, 1)
        else:
            text += entry
        ids.add(tid)
        added += 1
        notes.append(f"injected {tid}")

backlog_path.write_text(text, encoding="utf-8")
ready_after = len(re.findall(r"\*\*Status:\*\* `ready`", text))
print(f"[ensure-work] ready {ready} → {ready_after}; changes: {', '.join(notes) or 'none'}")

shipped = root / "docs" / "MVP_SHIPPED.md"
deferred_left = len(re.findall(r"\*\*Status:\*\* `deferred`", text))
ready_left = len(re.findall(r"\*\*Status:\*\* `ready`", text))
in_prog = len(re.findall(r"\*\*Status:\*\* `in_progress`", text))
all_catalog_done = True
for tid, _, _ in CATALOG:
    m = re.search(rf"### {re.escape(tid)} —[\s\S]*?- \*\*Status:\*\* `(\w+)`", text)
    if not m or m.group(1) != "done":
        all_catalog_done = False

if all_catalog_done and ready_left == 0 and deferred_left == 0 and in_prog == 0:
    if not shipped.exists():
        shipped.write_text(
            f"""# MVP SHIPPED — MoneyFlow

**Date (UTC):** {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")}  
**Bar:** `docs/MVP_BEST_BAR.md`

Catalog TASK-500+ all done; no ready/deferred/in_progress.

Autopilot may idle 1h between re-checks. Human smoke-test recommended.
""",
            encoding="utf-8",
        )
        print("[ensure-work] wrote docs/MVP_SHIPPED.md")
PY

# Competitor gap analysis → create tasks until patterns match best-of bar
python3 "$ROOT/scripts/agent-competitor-gap.py" "$ROOT" 2>/dev/null || true

READY=$(grep -c '\*\*Status:\*\* `ready`' "$BACKLOG" 2>/dev/null || true)
echo "[ensure-work] final ready=${READY:-0}"
[[ -f "$SHIPPED" ]] && echo "[ensure-work] MVP_SHIPPED present"
[[ "${READY:-0}" -ge 1 ]] || exit 1

# Ship only when competitor gaps all pass + no ready/deferred/in_progress
python3 - "$ROOT" <<'PY'
import re, json, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone
root = Path(sys.argv[1])
backlog = (root / "AGENT_BACKLOG.md").read_text(encoding="utf-8")
ready = len(re.findall(r"\*\*Status:\*\* `ready`", backlog))
deferred = len(re.findall(r"\*\*Status:\*\* `deferred`", backlog))
in_prog = len(re.findall(r"\*\*Status:\*\* `in_progress`", backlog))
# run gap silently for all_pass
import importlib.util
spec = importlib.util.spec_from_file_location("gap", root / "scripts" / "agent-competitor-gap.py")
# Just read report if exists after previous run
report = root / "docs" / "COMPETITOR_GAP_REPORT.md"
all_pass = False
if report.exists():
    txt = report.read_text(encoding="utf-8")
    # "Passed: N / N"
    m = re.search(r"\*\*Passed:\*\* (\d+) / (\d+)", txt)
    if m and m.group(1) == m.group(2) and int(m.group(1)) > 0:
        all_pass = True
shipped = root / "docs" / "MVP_SHIPPED.md"
if all_pass and ready == 0 and deferred == 0 and in_prog == 0:
    shipped.write_text(
        f"""# MVP SHIPPED — MoneyFlow (competitor bar pass)

**Date (UTC):** {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")}  
**Bars:** `docs/MVP_BEST_BAR.md` + `docs/COMPETITOR_GAP_BAR.md`  
**Report:** `docs/COMPETITOR_GAP_REPORT.md` — all checks ✅  

Autopilot idle allowed. Re-run `python3 scripts/agent-competitor-gap.py` after major changes.
""",
        encoding="utf-8",
    )
    print("[ensure-work] MVP_SHIPPED written (competitor bar all pass)")
elif shipped.exists() and not all_pass:
    print("[ensure-work] gaps remain — keep working (ship flag may be stale)")
else:
    print(f"[ensure-work] ship not yet: all_pass={all_pass} ready={ready} deferred={deferred} in_prog={in_prog}")
PY
