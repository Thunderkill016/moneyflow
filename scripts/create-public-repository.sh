#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_REPO="${1:-Thunderkill016/moneyflow-public}"
SOURCE_REMOTE="${SOURCE_REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
FEATURE_BRANCH="${FEATURE_BRANCH:-design/calm-ledger-daily-shell}"
GITLEAKS_VERSION="8.30.1"
GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Thiếu lệnh '$1'."
}

for command_name in git curl tar sha256sum zip node npm python3 gh; do
  need "$command_name"
done

gh auth status >/dev/null 2>&1 || fail "GitHub CLI chưa đăng nhập. Chạy: gh auth login"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "Hãy chạy script bên trong repository MoneyFlow."
cd "$ROOT"

SOURCE_URL="$(git remote get-url "$SOURCE_REMOTE" 2>/dev/null || true)"
case "$SOURCE_URL" in
  *Thunderkill016/moneyflow.git|*Thunderkill016/moneyflow) ;;
  *) fail "Repository hiện tại không phải Thunderkill016/moneyflow." ;;
esac

printf '==> Cập nhật %s/%s\n' "$SOURCE_REMOTE" "$SOURCE_BRANCH"
git fetch "$SOURCE_REMOTE" "$SOURCE_BRANCH" --tags --prune
SOURCE_REF="$SOURCE_REMOTE/$SOURCE_BRANCH"
SOURCE_SHA="$(git rev-parse "$SOURCE_REF")"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="${OUTPUT_DIR:-$HOME/moneyflow-public-release-$STAMP}"
SNAPSHOT="$RELEASE_DIR/snapshot"
TOOLS_DIR="$RELEASE_DIR/tools"
FEATURE_PATCH="$RELEASE_DIR/${FEATURE_BRANCH//\//-}.patch"
mkdir -p "$SNAPSHOT" "$TOOLS_DIR"

FEATURE_REF="$SOURCE_REMOTE/$FEATURE_BRANCH"
HAS_FEATURE=false
if git fetch "$SOURCE_REMOTE" "$FEATURE_BRANCH"; then
  if git rev-parse --verify "$FEATURE_REF" >/dev/null 2>&1; then
    git diff --binary "$SOURCE_REF...$FEATURE_REF" -- . \
      ':(exclude)docs/plans/**' \
      ':(exclude).github/**' \
      > "$FEATURE_PATCH"
    if [[ -s "$FEATURE_PATCH" ]]; then
      HAS_FEATURE=true
      printf '==> Đã chuẩn bị patch cho %s\n' "$FEATURE_BRANCH"
    fi
  fi
else
  printf '==> Không tìm thấy branch %s; chỉ xuất main\n' "$FEATURE_BRANCH"
fi

GITLEAKS="$TOOLS_DIR/gitleaks"
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS="$(command -v gitleaks)"
else
  printf '==> Tải Gitleaks %s và kiểm tra checksum\n' "$GITLEAKS_VERSION"
  ARCHIVE="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
  curl --fail --location --silent --show-error \
    "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${ARCHIVE}" \
    --output "$TOOLS_DIR/$ARCHIVE"
  printf '%s  %s\n' "$GITLEAKS_SHA256" "$TOOLS_DIR/$ARCHIVE" | sha256sum --check --strict
  tar -xzf "$TOOLS_DIR/$ARCHIVE" -C "$TOOLS_DIR" gitleaks
  chmod 0755 "$GITLEAKS"
fi

printf '==> Quét toàn bộ Git history; report được redact\n'
HISTORY_REPORT="$RELEASE_DIR/gitleaks-history.json"
set +e
"$GITLEAKS" git "$ROOT" \
  --redact \
  --report-format json \
  --report-path "$HISTORY_REPORT" \
  --exit-code 17
HISTORY_STATUS=$?
set -e
if [[ "$HISTORY_STATUS" -ne 0 && "$HISTORY_STATUS" -ne 17 ]]; then
  fail "Gitleaks không hoàn thành được history scan (exit $HISTORY_STATUS)."
fi
[[ -f "$HISTORY_REPORT" ]] || printf '[]\n' > "$HISTORY_REPORT"

# These six fingerprints were manually reviewed against the original commits.
# They are one SQL test UUID, one fake JWT placeholder, and public browser-side
# Supabase/Vercel configuration. Any other finding still blocks publication.
python3 - "$HISTORY_REPORT" <<'PY'
import json
import sys
from pathlib import Path

report = Path(sys.argv[1])
findings = json.loads(report.read_text() or "[]")
allowed = {
    "b41b33d9a5d698b62fcbc0fa522647d058d75c14:supabase/tests/database/transaction_amount_safety.test.sql:generic-api-key:69",
    "cd17a4b18f0de972a46e1e16f4cec0ded63f7e6d:vercel.json:generic-api-key:7",
    "8e0506f564407176da77a55ca1ccaab995483d4b:vercel.json:generic-api-key:7",
    "8e0506f564407176da77a55ca1ccaab995483d4b:vercel.json:generic-api-key:12",
    "cd17a4b18f0de972a46e1e16f4cec0ded63f7e6d:vercel.json:generic-api-key:13",
    "c7ca29414ed7df7138674bbf9fef70828e30cc65:src/lib/supabase/config.test.ts:generic-api-key:63",
}
unknown = [item for item in findings if item.get("Fingerprint") not in allowed]
reviewed = [item for item in findings if item.get("Fingerprint") in allowed]
print(f"History findings được chấp nhận sau review: {len(reviewed)}")
if unknown:
    print(f"History findings chưa được duyệt: {len(unknown)}", file=sys.stderr)
    for item in unknown:
        print(
            f"- {item.get('RuleID')} {item.get('File')}:{item.get('StartLine')} "
            f"commit={item.get('Commit')} fingerprint={item.get('Fingerprint')}",
            file=sys.stderr,
        )
    raise SystemExit(1)
PY

printf '==> Xuất snapshot từ commit %s\n' "$SOURCE_SHA"
git archive --format=tar "$SOURCE_REF" | tar -xf - -C "$SNAPSHOT"
cd "$SNAPSHOT"

# Remove private project state and local coding-agent material. These files are
# not required to build or run MoneyFlow and should not be published.
rm -rf \
  .agents \
  .claude \
  .grok \
  .cyclewarden \
  .vercel \
  logs \
  output \
  test-results \
  playwright-report \
  blob-report
rm -f \
  AGENT_AUTOPILOT.md \
  AGENT_BACKLOG.md \
  AGENT_ROADMAP.md \
  IDEA.md \
  CLAUDE.md
find scripts -maxdepth 1 -type f -name 'agent-*' -delete 2>/dev/null || true
rm -rf docs/cyclewarden docs/plans
rm -f \
  docs/AGENT_RUNTIME.md \
  docs/AUTOPILOT_PLAN.md \
  docs/CLAUDE_SKILLS.md \
  docs/VIP_AGENT_STACK.md \
  docs/MVP_SHIPPED.md \
  docs/REAL_USE_READINESS_CONTRACT.md

# Mark the two known test-only values so the fresh public history scans cleanly.
# The SQL value is a UUID idempotency fixture. The TypeScript value is a fake
# publishable-key string and is not accepted by production configuration.
python3 <<'PY'
from pathlib import Path

replacements = {
    Path("supabase/tests/database/transaction_amount_safety.test.sql"): (
        "820dbfb1-d289-402e-8a47-74d0e84cb8de",
        " -- gitleaks:allow test UUID",
    ),
    Path("src/lib/supabase/config.test.ts"): (
        "sb_publishable_test_key",
        " // gitleaks:allow test value",
    ),
}
for path, (needle, marker) in replacements.items():
    text = path.read_text()
    lines = text.splitlines(keepends=True)
    matched = 0
    output = []
    for line in lines:
        if needle in line:
            matched += 1
            if "gitleaks:allow" not in line:
                ending = "\n" if line.endswith("\n") else ""
                line = line.rstrip("\n") + marker + ending
        output.append(line)
    if matched == 0:
        raise SystemExit(f"Không tìm thấy test fixture cần đánh dấu trong {path}")
    path.write_text("".join(output))
PY

# Replace private automation with public-safe gates. Full finance, database and
# browser checks remain enabled; only the private project-knowledge gate is
# omitted because private plans were intentionally removed from the snapshot.
rm -rf .github
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'YAML'
name: CI

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  database:
    if: github.event_name != 'pull_request' || github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v2
        with:
          version: latest
          github-token: ${{ github.token }}
      - name: Fresh local reset and pgTAP
        id: database-tests
        continue-on-error: true
        shell: bash
        run: |
          set -o pipefail
          {
            supabase --version
            supabase db start
            supabase db reset --local
            supabase test db
          } 2>&1 | tee database-test-output.log
      - name: Upload failing database output
        if: steps.database-tests.outcome == 'failure'
        uses: actions/upload-artifact@v4
        with:
          name: failing-database-test-output
          path: database-test-output.log
          if-no-files-found: error
          retention-days: 1
      - name: Stop local Supabase
        if: always()
        run: supabase stop --no-backup || true
      - name: Fail after preserving database diagnostics
        if: steps.database-tests.outcome == 'failure'
        run: exit 1

  verify:
    if: github.event_name != 'pull_request' || github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_PUBLIC_APP_MODE: authenticated
      NEXT_PUBLIC_SUPABASE_URL: https://ci-project.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_test_key # gitleaks:allow test value
      NEXT_PUBLIC_SITE_URL: https://ci.example.test
      LEGACY_SITE_HOSTS: old-ci.example.test
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install
        run: npm ci
      - name: Deployment configuration contract
        run: node scripts/check-deployment-env.mjs --force
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Unit tests and static RLS
        run: npm run test
      - name: Production build
        run: npm run build

  e2e:
    if: github.event_name != 'pull_request' || github.event.pull_request.draft == false
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 35
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install
        run: npm ci
      - name: Install Chromium and WebKit
        run: npx playwright install --with-deps chromium webkit
      - name: Expense-path browser smoke
        run: npm run test:e2e
      - name: Cross-device UI audit
        run: npm run test:ui-audit:pr
      - name: Upload Playwright evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-evidence-${{ github.run_id }}-${{ github.run_attempt }}
          path: |
            output/playwright/
            output/playwright-audit/
          if-no-files-found: ignore
          retention-days: 3
YAML

cat > .github/workflows/secret-scan.yml <<'YAML'
name: Secret scan

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Install pinned Gitleaks
        shell: bash
        run: |
          set -euo pipefail
          version='8.30.1'
          archive="gitleaks_${version}_linux_x64.tar.gz"
          curl --fail --location --silent --show-error \
            "https://github.com/gitleaks/gitleaks/releases/download/v${version}/${archive}" \
            --output "/tmp/${archive}"
          echo '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  /tmp/gitleaks_8.30.1_linux_x64.tar.gz' | sha256sum --check --strict
          tar -xzf "/tmp/${archive}" -C /tmp gitleaks
          sudo install -m 0755 /tmp/gitleaks /usr/local/bin/gitleaks
      - run: gitleaks git . --redact --verbose
YAML

cat > README.md <<'MARKDOWN'
# MoneyFlow

MoneyFlow là ứng dụng web quản lý thu chi cá nhân dành cho người Việt: ghi giao dịch, theo dõi số dư, xem dòng tiền theo tháng, quản lý ngân sách và xuất dữ liệu.

## Công nghệ

- Next.js, React và TypeScript
- Supabase Auth và PostgreSQL với Row Level Security
- Playwright, Node test và pgTAP
- Vercel

## Chạy cục bộ

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`.env.example` mặc định dùng demo mode. Để dùng Supabase thật, chuyển `NEXT_PUBLIC_APP_MODE` sang `authenticated` và điền các biến public tương ứng trong `.env.local`. Không commit `.env.local` hay service-role key.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Website production: https://mfvn.vercel.app

## Bảo mật

Không đăng token, mật khẩu, link khôi phục, session cookie hoặc dữ liệu tài chính thật trong nội dung công khai. Xem `SECURITY.md`.

## Quyền sử dụng

Mã nguồn được công khai để xem và phục vụ phát triển MoneyFlow. Không có quyền sao chép, phân phối hoặc sử dụng thương mại nếu chưa có sự cho phép bằng văn bản. Xem `LICENSE`.
MARKDOWN

cat > LICENSE <<'TEXT'
Copyright (c) 2026 Thunderkill016. All rights reserved.

This source code is publicly viewable, but no permission is granted to copy,
modify, distribute, sublicense, sell, host, or use it commercially without prior
written permission from the copyright holder.
TEXT

cat > SECURITY.md <<'MARKDOWN'
# Security policy

Hãy dùng GitHub Security Advisories của repository để báo cáo lỗ hổng riêng tư.

Không đăng công khai mật khẩu, API key, token, session cookie, link xác nhận hoặc khôi phục tài khoản, sao kê hay dữ liệu tài chính thật.

MoneyFlow không bao giờ yêu cầu đưa `SUPABASE_SERVICE_ROLE_KEY` vào mã frontend hoặc biến `NEXT_PUBLIC_*`.
MARKDOWN

cat > PUBLIC_SNAPSHOT.md <<MARKDOWN
# Public snapshot

Snapshot này được tạo từ commit \`$SOURCE_SHA\` của repository riêng tư.

Không bao gồm lịch sử Git, issues, pull requests, CycleWarden state, agent backlog, log hoặc provider state.
MARKDOWN

printf '==> Quét working tree sẽ public\n'
SNAPSHOT_REPORT="$RELEASE_DIR/gitleaks-snapshot.json"
set +e
"$GITLEAKS" dir "$SNAPSHOT" \
  --redact \
  --report-format json \
  --report-path "$SNAPSHOT_REPORT" \
  --exit-code 18
SNAPSHOT_STATUS=$?
set -e
if [[ "$SNAPSHOT_STATUS" -ne 0 ]]; then
  fail "Gitleaks phát hiện finding mới trong snapshot. Không tạo repo public. Xem: $SNAPSHOT_REPORT"
fi
[[ -f "$SNAPSHOT_REPORT" ]] || printf '[]\n' > "$SNAPSHOT_REPORT"

printf '==> Kiểm tra source public bằng cấu hình CI giả\n'
npm ci
env \
  NEXT_PUBLIC_APP_MODE=demo \
  NEXT_PUBLIC_SITE_URL=https://ci.example.test \
  LEGACY_SITE_HOSTS=old-ci.example.test \
  node scripts/check-deployment-env.mjs --force
npm run lint
npm run typecheck
npm run test
env \
  NEXT_PUBLIC_APP_MODE=demo \
  NEXT_PUBLIC_SITE_URL=https://ci.example.test \
  LEGACY_SITE_HOSTS=old-ci.example.test \
  npm run build
rm -rf node_modules .next out build coverage

printf '==> Tạo Git history mới chỉ có một commit\n'
git init -b main
GH_LOGIN="$(gh api user --jq .login)"
GH_ID="$(gh api user --jq .id)"
git config user.name "$GH_LOGIN"
git config user.email "${GH_ID}+${GH_LOGIN}@users.noreply.github.com"
git add --all
git commit -m "Initial public snapshot from MoneyFlow ${SOURCE_SHA:0:12}"

printf '==> Tạo ZIP và checksum\n'
(cd "$SNAPSHOT" && zip -qry "$RELEASE_DIR/moneyflow-public-snapshot.zip" . -x '.git/*')
sha256sum "$RELEASE_DIR/moneyflow-public-snapshot.zip" > "$RELEASE_DIR/moneyflow-public-snapshot.zip.sha256"

printf '==> Tạo hoặc sử dụng repository %s\n' "$TARGET_REPO"
if gh repo view "$TARGET_REPO" --json isEmpty >/dev/null 2>&1; then
  IS_EMPTY="$(gh repo view "$TARGET_REPO" --json isEmpty --jq .isEmpty)"
  [[ "$IS_EMPTY" == "true" ]] || fail "Repository $TARGET_REPO đã tồn tại và không rỗng."
  gh auth setup-git
  git remote add origin "https://github.com/${TARGET_REPO}.git"
  git push --set-upstream origin main
else
  gh repo create "$TARGET_REPO" \
    --public \
    --source "$SNAPSHOT" \
    --remote origin \
    --push \
    --description "MoneyFlow — ứng dụng quản lý thu chi cá nhân cho người Việt" \
    --homepage "https://mfvn.vercel.app" \
    --disable-issues \
    --disable-wiki
fi

gh repo edit "$TARGET_REPO" --enable-secret-scanning 2>/dev/null || true
gh repo edit "$TARGET_REPO" --enable-secret-scanning-push-protection 2>/dev/null || true
gh repo edit "$TARGET_REPO" \
  --add-topic nextjs \
  --add-topic typescript \
  --add-topic supabase \
  --add-topic personal-finance \
  --add-topic vietnam \
  2>/dev/null || true

PUBLIC_PR_URL=""
if [[ "$HAS_FEATURE" == "true" ]]; then
  printf '==> Chuyển branch %s sang repository public\n' "$FEATURE_BRANCH"
  git switch -c "$FEATURE_BRANCH"
  git apply --index "$FEATURE_PATCH"
  rm -rf docs/plans
  git add --all

  FEATURE_REPORT="$RELEASE_DIR/gitleaks-feature.json"
  set +e
  "$GITLEAKS" dir "$SNAPSHOT" \
    --redact \
    --report-format json \
    --report-path "$FEATURE_REPORT" \
    --exit-code 19
  FEATURE_STATUS=$?
  set -e
  if [[ "$FEATURE_STATUS" -ne 0 ]]; then
    fail "Feature branch có finding mới. Chưa push. Xem: $FEATURE_REPORT"
  fi

  git commit -m "feat: migrate Calm Ledger signed-in shell"
  git push --set-upstream origin "$FEATURE_BRANCH"

  EXISTING_PR="$(gh pr list --repo "$TARGET_REPO" --head "$FEATURE_BRANCH" --json url --jq '.[0].url // ""')"
  if [[ -n "$EXISTING_PR" ]]; then
    PUBLIC_PR_URL="$EXISTING_PR"
  else
    PUBLIC_PR_URL="$(gh pr create \
      --repo "$TARGET_REPO" \
      --base main \
      --head "$FEATURE_BRANCH" \
      --title "feat: migrate signed-in shell to Calm Ledger" \
      --body "Migrated from the private MoneyFlow redesign branch without private history or planning documents. Public CI is the verification authority for this PR.")"
  fi
  git switch main
fi

REPO_URL="$(gh repo view "$TARGET_REPO" --json url --jq .url)"
printf '\nHOÀN TẤT\nRepo: %s\nSource commit: %s\nAudit + ZIP: %s\n' "$REPO_URL" "$SOURCE_SHA" "$RELEASE_DIR"
if [[ -n "$PUBLIC_PR_URL" ]]; then
  printf 'Redesign PR: %s\n' "$PUBLIC_PR_URL"
fi
