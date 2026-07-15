# Telegram báo cáo autopilot MoneyFlow

Mỗi khi orchestrator **xong 1 task** (OK hoặc FAIL), script gửi tin nhắn Telegram.

## 1. Tạo bot

1. Chat với [@BotFather](https://t.me/BotFather) trên Telegram  
2. `/newbot` → lấy **token** dạng `123456:ABC...`  
3. Chat với bot của bạn (bấm Start)  
4. Lấy **chat id**:
   - Chat với [@userinfobot](https://t.me/userinfobot), hoặc  
   - Mở: `https://api.telegram.org/bot<TOKEN>/getUpdates` sau khi nhắn bot

## 2. Cấu hình (không commit secret)

```bash
mkdir -p ~/.config/moneyflow
cat > ~/.config/moneyflow/telegram.env <<'EOF'
TELEGRAM_BOT_TOKEN=123456:YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
EOF
chmod 600 ~/.config/moneyflow/telegram.env
```

Hoặc file trong repo (đã gitignore): `.env.telegram` cùng format.

## 3. Systemd (daemon)

Service load env file nếu có:

```bash
systemctl --user daemon-reload
systemctl --user restart moneyflow-autopilot.service
```

## 4. Thử gửi

```bash
cd /home/thunder/Code/moneyflow
bash scripts/agent-telegram-notify.sh ok "MoneyFlow test" "Kết nối Telegram OK"
```

## 5. Nội dung tin

- ✅ Task id + tiêu đề  
- Commit SHA  
- Số task `ready` còn lại  
- ❌ Fail: nhắc xem `logs/agent/`  
