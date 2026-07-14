# Autopilot 24/7 — Money Flow

Chạy agent khi bạn ngủ / không có mặt.

## Kiến trúc

```
systemd user service: moneyflow-autopilot.service
        │
        ▼
scripts/agent-daemon.sh  (loop)
        │
        ▼
scripts/agent-orchestrator.sh  (1 cycle)
        │
        ├── agent-refill-backlog.sh
        ├── agent-pick-task.sh
        └── agent-run-headless.sh  →  grok --yolo  (1 task)
                │
                ▼
        lint + typecheck + test → commit → git push origin main
```

## Bật (máy này)

```bash
cd /home/thunder/Code/moneyflow
chmod +x scripts/agent-*.sh

# Thử pick task
bash scripts/agent-pick-task.sh

# 1 cycle thật
bash scripts/agent-orchestrator.sh

# Daemon liên tục (systemd)
bash scripts/agent-daemon-start.sh

# Dừng
bash scripts/agent-daemon-stop.sh
```

**Yêu cầu:** `grok` trong PATH (`~/.local/bin/grok`), đã login; máy không sleep; network cho `git push` + model API.

## Logs

- `logs/agent/daemon.log`
- `logs/agent/*_TASK-*.log`
- `logs/agent/.orchestrator-state` (OK/FAIL; 3 FAIL → nghỉ dài)

## Quy tắc product khi auto

- Làm đúng thứ tự backlog (TASK số nhỏ).
- Inbox-first; không pivot sang AI advisor / Open Banking.
- Không hỏi user; blocked nếu cần secret.

## Reset circuit breaker

```bash
rm -f logs/agent/.orchestrator-state
bash scripts/agent-daemon-start.sh
```
