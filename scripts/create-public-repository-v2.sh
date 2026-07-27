#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: Hãy chạy script bên trong repository MoneyFlow." >&2
  exit 1
}
cd "$ROOT"

REMOTE="${SOURCE_REMOTE:-origin}"
BRANCH="ops/public-snapshot-audit"
TMP_SCRIPT="$(mktemp /tmp/create-public-repository.XXXXXX.sh)"
trap 'rm -f "$TMP_SCRIPT"' EXIT

git fetch "$REMOTE" "$BRANCH"
git show "$REMOTE/$BRANCH:scripts/create-public-repository.sh" > "$TMP_SCRIPT"

python3 - "$TMP_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
needle = """Website production: https://mfvn.vercel.app

## Bảo mật
"""
replacement = """Website production: https://mfvn.vercel.app

## MVP và quy tắc đóng góp

- [MVP definition and readiness gates](docs/MVP_DEFINITION.md)
- Xem thêm hướng dẫn tác nhân tại [AGENTS.md](AGENTS.md).

Do not push feature or fix commits directly to `main`. Mọi thay đổi phải đi qua branch và pull request với các gate phù hợp.

## Bảo mật
"""
if needle not in text:
    raise SystemExit("Không tìm thấy README template cần cập nhật trong generator.")
path.write_text(text.replace(needle, replacement, 1))
PY

chmod 0700 "$TMP_SCRIPT"
exec bash "$TMP_SCRIPT" "$@"
