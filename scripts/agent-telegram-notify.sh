#!/usr/bin/env bash
# Send MoneyFlow autopilot report to Telegram.
# Requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
# Optional: ~/.config/moneyflow/telegram.env  or  $ROOT/.env.telegram (gitignored)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load secrets without printing them
for f in \
  "${MONEYFLOW_TELEGRAM_ENV:-}" \
  "$HOME/.config/moneyflow/telegram.env" \
  "$ROOT/.env.telegram"
do
  if [[ -n "${f}" && -f "$f" ]]; then
    # shellcheck disable=SC1090
    set -a
    # only export TELEGRAM_* lines
    # shellcheck disable=SC1091
    source <(grep -E '^[[:space:]]*TELEGRAM_[A-Z0-9_]+=' "$f" | sed 's/\r$//')
    set +a
  fi
done

STATUS="${1:-info}"   # ok | fail | info
TITLE="${2:-MoneyFlow autopilot}"
BODY="${3:-}"

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "[telegram] skip: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (see docs/TELEGRAM_NOTIFY.md)"
  exit 0
fi

ICON="ℹ️"
case "$STATUS" in
  ok|success) ICON="✅" ;;
  fail|error) ICON="❌" ;;
  ship) ICON="🏆" ;;
  start) ICON="🤖" ;;
esac

# Telegram text limit ~4096; keep short
TEXT="${ICON} *${TITLE}*
${BODY}
_$(date -Iseconds)_"

# Escape for MarkdownV2 is painful; use HTML parse_mode
html_escape() {
  sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
}
HTML_TITLE=$(printf '%s' "$TITLE" | html_escape)
HTML_BODY=$(printf '%s' "$BODY" | html_escape)
HTML="${ICON} <b>${HTML_TITLE}</b>
${HTML_BODY}
<i>$(date -Iseconds)</i>"

# Prefer curl JSON
set +e
RESP=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${HTML}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "disable_web_page_preview=true" \
  2>&1)
CODE=$?
set -e
if [[ "$CODE" -ne 0 ]]; then
  echo "[telegram] curl failed: $RESP"
  exit 0
fi
if echo "$RESP" | grep -q '"ok":true\|"ok": true'; then
  echo "[telegram] sent"
else
  echo "[telegram] API error: $RESP"
fi
exit 0
