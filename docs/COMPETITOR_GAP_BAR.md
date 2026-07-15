# Competitor gap bar — so sánh web/app PFM rồi vá đến khi pass

**Mục tiêu:** Sau khi hết task/pool/catalog, agent **tự so với đối thủ**, tìm thiếu sót, **tạo task**, làm đến khi **mọi check PASS**.  
**Luật G5:** chỉ học pattern; **không** bank sync / AI / family / envelope full / AGPL paste / inbox brand.

## Đối thủ tham chiếu

| Competitor | Pattern bắt buộc (Core) | Pattern cấm / Lab only |
|------------|-------------------------|-------------------------|
| Money Lover | Multi-ví, ghi nhanh, budget danh mục | Ads, paywall core |
| Ivy Wallet | Amount focus, recent categories, FAB | GPL copy |
| Firefly | Transfer ≠ chi, bills/commitments | AGPL copy, dense ERP |
| Actual | Export CSV, budget remaining, import lab | Full envelope onboarding |
| Copilot | Attention “cần chú ý” | iOS-only lock-in |
| Monarch | Dashboard KPI rõ | Net-worth-first MVP |
| Sheets | Export ownership | — |
| YNAB | (không ép method) | Zero-based force |

## Checks (agent scanner)

Mỗi check: `id` · competitor · pass condition (file/test) · task nếu fail.

Khi **tất cả PASS** + `MVP_BEST_BAR` + verify green → `docs/MVP_SHIPPED.md`.

Xem implementation: `scripts/agent-competitor-gap.py`
