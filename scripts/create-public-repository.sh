#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_REPO="${1:-Thunderkill016/moneyflow-public}"
SOURCE_REMOTE="${SOURCE_REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
GITLEAKS_VERSION="8.30.1"
GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Thiếu lệnh '$1'."
}

need git
need curl
need tar
need sha256sum
need zip
need node
need npm
need gh

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
mkdir -p "$SNAPSHOT" "$TOOLS_DIR"

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
set +e
"$GITLEAKS" git "$ROOT" \
  --redact \
  --report-format json \
  --report-path "$RELEASE_DIR/gitleaks-history.json" \
  --exit-code 17
HISTORY_STATUS=$?
set -e
if [[ "$HISTORY_STATUS" -ne 0 ]]; then
  fail "Gitleaks phát hiện finding trong history. Không tạo repo public. Xem: $RELEASE_DIR/gitleaks-history.json"
fi
[[ -f "$RELEASE_DIR/gitleaks-history.json" ]] || printf '[]\n' > "$RELEASE_DIR/gitleaks-history.json"

printf '==> Xuất snapshot từ commit %s\n' "$SOURCE_SHA"
git archive --format=tar "$SOURCE_REF" | tar -xf - -C "$SNAPSHOT"
cd "$SNAPSHOT"

# Remove private project-state and local coding-agent material. These are not
# needed to build or run MoneyFlow and should not be carried into the public repo.
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

# Replace private-repository automation with public-safe, secret-free checks.
rm -rf .github
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'YAML'
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_PUBLIC_APP_MODE: authenticated
      NEXT_PUBLIC_SUPABASE_URL: https://ci-project.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_test_key
      NEXT_PUBLIC_SITE_URL: https://ci.example.test
      LEGACY_SITE_HOSTS: old-ci.example.test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check:deployment-env
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
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
npm run check:deployment-env
npm run lint
npm run typecheck
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
set +e
"$GITLEAKS" dir "$SNAPSHOT" \
  --redact \
  --report-format json \
  --report-path "$RELEASE_DIR/gitleaks-snapshot.json" \
  --exit-code 18
SNAPSHOT_STATUS=$?
set -e
if [[ "$SNAPSHOT_STATUS" -ne 0 ]]; then
  fail "Gitleaks phát hiện finding trong snapshot. Không tạo repo public. Xem: $RELEASE_DIR/gitleaks-snapshot.json"
fi
[[ -f "$RELEASE_DIR/gitleaks-snapshot.json" ]] || printf '[]\n' > "$RELEASE_DIR/gitleaks-snapshot.json"

printf '==> Kiểm tra source public\n'
npm ci
npm run check:deployment-env
npm run lint
npm run typecheck
npm run build
rm -rf node_modules .next out build coverage

printf '==> Tạo Git history mới chỉ có một commit\n'
git init -b main
if ! git config user.name >/dev/null 2>&1; then
  GH_LOGIN="$(gh api user --jq .login)"
  GH_ID="$(gh api user --jq .id)"
  git config user.name "$GH_LOGIN"
  git config user.email "${GH_ID}+${GH_LOGIN}@users.noreply.github.com"
fi
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

# Public repositories support GitHub secret scanning. Do not fail the release if
# an account policy does not expose one of these toggles.
gh repo edit "$TARGET_REPO" --enable-secret-scanning 2>/dev/null || true
gh repo edit "$TARGET_REPO" --enable-secret-scanning-push-protection 2>/dev/null || true
gh repo edit "$TARGET_REPO" --add-topic nextjs --add-topic typescript --add-topic supabase --add-topic personal-finance --add-topic vietnam 2>/dev/null || true

REPO_URL="$(gh repo view "$TARGET_REPO" --json url --jq .url)"
printf '\nHOÀN TẤT\nRepo: %s\nSource commit: %s\nAudit + ZIP: %s\n' "$REPO_URL" "$SOURCE_SHA" "$RELEASE_DIR"
