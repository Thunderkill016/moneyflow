# Money Flow — Báo cáo nghiên cứu sản phẩm & chiến lược phát triển

**Ngày nghiên cứu:** 2026-07-14  
**Phiên bản:** 1.0  
**Ngôn ngữ:** Tiếng Việt  
**Phạm vi:** Product strategy, competitive research, MVP, architecture, GTM, legal/privacy, founder roadmap  

> **Quy ước bằng chứng**  
> - **[Dữ kiện]** — có nguồn hoặc quan sát được từ codebase/repo.  
> - **[Suy luận]** — logic từ dữ kiện, chưa được đo trực tiếp.  
> - **[Giả thuyết]** — cần kiểm chứng bằng phỏng vấn / experiment.  
> - **[Chưa có đủ bằng chứng]** — không khẳng định số liệu.

---

## Mục lục kết quả bắt buộc (mục 23)

1. [Executive summary](#1-executive-summary)  
2. [Kết luận có nên tiếp tục](#2-kết-luận-có-nên-tiếp-tục)  
3. [Vấn đề cốt lõi](#3-vấn-đề-cốt-lõi-được-xác-nhận)  
4. [Nhóm khách hàng khởi đầu](#4-nhóm-khách-hàng-khởi-đầu)  
5. [So sánh đối thủ](#5-so-sánh-đối-thủ)  
6. [Market gap](#6-market-gap)  
7. [Năm chiến lược sản phẩm](#7-năm-chiến-lược-sản-phẩm)  
8. [Chiến lược được chọn](#8-chiến-lược-được-chọn)  
9. [MVP cụ thể](#9-mvp-cụ-thể)  
10. [User journey](#10-user-journey)  
11. [Wireframe text](#11-wireframe-text)  
12. [Kiến trúc hệ thống](#12-kiến-trúc-hệ-thống)  
13. [Database schema](#13-database-schema)  
14. [API contract](#14-api-contract)  
15. [Parser pipeline](#15-parser-pipeline)  
16. [Rule engine design](#16-rule-engine-design)  
17. [Security checklist](#17-security-checklist)  
18. [Legal and privacy checklist](#18-legal-and-privacy-checklist)  
19. [Roadmap 12 tháng](#19-roadmap-12-tháng)  
20. [Roadmap 3 năm](#20-roadmap-3-năm)  
21. [Product backlog ưu tiên](#21-product-backlog-ưu-tiên)  
22. [Go-to-market](#22-go-to-market)  
23. [Pricing](#23-pricing)  
24. [Unit economics](#24-unit-economics)  
25. [Risk register](#25-risk-register)  
26. [North Star Metric](#26-north-star-metric)  
27. [Kill criteria](#27-kill-criteria)  
28. [Kế hoạch 7 ngày](#28-kế-hoạch-hành-động-7-ngày-đầu)  
29. [Kế hoạch 30 ngày](#29-kế-hoạch-hành-động-30-ngày-đầu)  
30. [Lộ trình founder học lập trình](#30-kế-hoạch-phát-triển-dành-cho-founder-đang-học-lập-trình)  

Phụ lục: [Phân biệt bài toán](#phụ-lục-a-phân-biệt-các-bài-toán) · [Hành vi người dùng](#phụ-lục-b-hành-vi-người-dùng) · [Taxonomy capture](#phụ-lục-c-taxonomy-transaction-capture) · [Phản biện](#phụ-lục-d-phản-biện) · [Câu hỏi quyết định](#phụ-lục-e-câu-hỏi-quyết-định-cuối)

---

## 1. Executive summary

Money Flow **không nên** cạnh tranh head-on với Money Lover / YNAB / Monarch bằng dashboard + ngân sách + “AI tư vấn”.

**[Suy luận]** Lợi thế khả thi tại Việt Nam (và các thị trường Open Banking chưa chín) nằm ở **transaction capture & normalization**: biến sao kê, paste text, CSV/XLS, screenshot và (sau này) notification thành giao dịch sạch, có thể review theo exception, export hoặc đồng bộ vào ledger.

Repo hiện tại **[Dữ kiện]** đã có: Next.js + Supabase, ledger double-entry (minor units), accounts/categories/transactions, budgets, goals, commitments, safe-to-spend, RLS, auth — định vị “Có thể chi hôm nay?”. Đây là **lớp quyết định tài chính** tốt, nhưng **lớp thu thập dữ liệu** còn thủ công (dialog nhập tay).

**Quyết định chiến lược (chính):**

| Hạng mục | Quyết định |
|---|---|
| **MVP** | **Statement-to-Inbox**: paste text / upload CSV·XLS·PDF → parse rule-based → inbox review → approve/bulk fix → export CSV (+ optional ghi vào ledger Money Flow) |
| **ICP ban đầu** | Người Việt có **≥2 nguồn tiền** (NH + ví), đang dùng **Excel/Sheets** hoặc đã bỏ app vì nhập tay; ưu tiên freelancer / seller online |
| **Wedge** | “Dán hoặc tải sao kê → 2 phút ra file Excel sạch + danh sách giao dịch chờ duyệt” |
| **Không làm trước** | Open Banking, SMS harvesting, LLM-first OCR cloud đắt, family sharing, full accounting, dashboard AI |
| **Backup** | Android notification companion (sau khi paste/upload PMF) |
| **Dài hạn** | Parser + rule memory → B2B API/SDK cho kế toán dịch vụ & SME SEA |

**Kết luận tổng:** **Tiếp tục**, nhưng **pivot trọng tâm sang capture-first / inbox-first**, dùng dashboard hiện có như **destination** sau khi capture ổn — không phải product chính để validate.

---

## 2. Kết luận có nên tiếp tục

### Có — có điều kiện

**Lý do tiếp tục**

1. **[Dữ kiện]** Open Banking VN chưa là commodity consumer: hệ sinh thái API đang phát triển, chưa thay thế được export sao kê + multi-wallet.  
2. **[Dữ kiện]** Ứng dụng PF phổ biến (YNAB, Monarch, Copilot…) phụ thuộc Plaid/MX/Finicity — **không cover VN**. File import là fallback.  
3. **[Dữ kiện cộng đồng]** User YNAB thường gặp duplicate, pending mismatch, bank sync hỏng — ngay cả khi có sync, **review & dedupe** vẫn là pain.  
4. **[Suy luận]** Tại VN, multi-bank + MoMo/ZaloPay/ShopeePay + tiền mặt = capture fragmentation cao hơn US.  
5. **[Dữ kiện repo]** Đã có nền ledger + auth + privacy-oriented stack — giảm chi phí build destination.

**Điều kiện tiếp tục (không thỏa thì pivot/dừng):**

- Trong 30–45 ngày validation: ≥15 phỏng vấn chất lượng + ≥10 người sẵn sàng gửi sao kê đã redact + ≥30% nói sẽ dùng tool miễn phí hang.
- Trong 90 ngày prototype: ≥50 import sessions, parse field accuracy ≥85% trên 2–3 định dạng ưu tiên, ≥40% người import lại tuần 2.

**Không nên tiếp tục nếu:** chỉ xây thêm dashboard/budget mà không đo được nhu cầu capture; hoặc founder không sẵn sàng làm parser fixtures / user interviews.

---

## 3. Vấn đề cốt lõi được xác nhận

### Giả thuyết gốc

> Người dùng không muốn nhập từng giao dịch, nhưng dữ liệu nằm rải rác ở NH, ví, email, SMS, notification, PDF, Excel, ảnh hóa đơn.

| Thành phần | Trạng thái |
|---|---|
| “Không muốn nhập tay” | **Được củng cố mạnh** bởi hành vi industry (auto-import là default selling point US apps) + churn thủ công phổ biến **[Suy luận + quan sát cộng đồng]** |
| “Dữ liệu rải rác” | **Hợp lý tại VN** (multi-bank + e-wallet + cash) **[Suy luận]**; **chưa có survey định lượng nội bộ** |
| “Universal Financial Inbox là product đúng” | **Hướng đúng nhưng quá rộng cho MVP** — cần wedge hẹp |
| “Capture đủ để thành công ty” | **Chưa chứng minh** — có thể là feature của PF app **hoặc** trở thành platform B2B **[Giả thuyết]** |

### Vấn đề được **xác nhận đủ để build**

**Job cốt lõi:**  
> “Giúp tôi đưa giao dịch từ nhiều nguồn thô vào một danh sách **đúng, có thể sửa nhanh, có audit**, mà không phải gõ lại từng dòng.”

### Vấn đề **chưa được xác nhận**

- Người dùng B2C VN sẵn sàng **trả tiền** bao nhiêu chỉ cho capture (không kèm budget).  
- Mức chấp nhận **upload sao kê** vs sợ privacy.  
- Notification listener có adoption đủ cao hay bị Google Play / user fear chặn.

### Phân biệt pain (quan trọng)

| Bài toán | Pain | Ai trả tiền? | Độ fit Money Flow MVP |
|---|---|---|---|
| PF management | “Tôi chi tiêu thế nào?” | Cá nhân, ARPU thấp | Destination sau |
| **Transaction capture** | “Tôi lười / không kịp ghi” | Cá nhân + freelancer | **Wedge** |
| Chứng từ (receipt) | “Cần hóa đơn hoàn ứng” | Expensify-like, B2B | Sau |
| Chuẩn hóa | “Merchant tên lộn xộn” | Power user, kế toán | Core moat |
| Đối soát | “Hai sổ không khớp” | SME, kế toán | B2B later |
| Kế toán | Sổ cái, thuế, báo cáo | SME | Out of scope early |

---

## 4. Nhóm khách hàng khởi đầu

### ICP chính (Beachhead)

**“Multi-source Excel Freelancer / Seller VN”**

- 25–40 tuổi, VN.  
- ≥2 tài khoản NH **hoặc** NH + ví.  
- Đang (hoặc từng) ghi chi tiêu bằng **Excel/Google Sheets** hoặc app rồi bỏ.  
- Có thói quen tải sao kê / copy lịch sử GD để đối chiếu.  
- Thu nhập không đều (freelance, bán hàng online) → **cần biết dòng tiền**, không chỉ budget cố định.

**Aha moment mục tiêu:**  
Upload/paste 1 sao kê → thấy 50–200 giao dịch parse được → sửa 5–10 dòng sai → export CSV sạch **hoặc** approve vào Money Flow.

### ICP phụ (wave 2)

1. Người nhiều ví + NH, ghi thủ công mỗi tối → bỏ cuộc.  
2. Hộ kinh doanh nhỏ / kế toán dịch vụ cần chuẩn hóa sao kê khách (B2B wedge).

### Không phải ICP giai đoạn 1

- User chỉ muốn “app đẹp có biểu đồ” không chịu upload.  
- Enterprise accounting.  
- User chỉ dùng 1 ví và hài lòng Money Lover free.

### Tiêu chí chọn beachhead

| Tiêu chí | Excel Freelancer | Family | Pure consumer casual | Kế toán SME |
|---|---|---|---|---|
| Pain tần suất | Cao | TB | Thấp–TB | Cao |
| Khả năng upload | Cao | TB | Thấp | Rất cao |
| Sẵn sàng trả | TB–Cao | TB | Thấp | Cao |
| Sales cycle | Ngắn | TB | Dài (free) | Dài hơn |
| Fit founder solo | **Cao** | Thấp (social) | Cạnh tranh Money Lover | Cần trust |

---

## 5. So sánh đối thủ

### 5.1 Bảng tổng hợp

| Sản phẩm | Đối tượng | Capture | Auto | Review | File import | OCR | Rules | Giá (tham chiếu 2026) | VN? | Gap cho MF |
|---|---|---|---|---|---|---|---|---|---|---|
| **Money Lover** | Consumer SEA | Manual + limited auto + receipt claims | Thấp–TB | Manual | Có hạn | Receipt marketing | Category | Lifetime ~$10–20; Linked Wallet sub | **Có** | Capture multi-source kém; UX already crowded |
| **YNAB** | Budget discipline US+ | Plaid/MX + **file import** | Cao (US) | Strong register | OFX/CSV/QFX | Không focus | Rules | **$14.99/mo hoặc $109/yr** | Kém (no local banks) | Không cover VN banks |
| **Monarch** | Couples/net worth | Plaid/Finicity/MX | Cao | Review + recategorize | Import history | Không core | Rules | **~$14.99/mo · $99.99/yr**, trial 7d | Không | Same |
| **Copilot Money** | iOS design-first | Bank link | Cao | Clean UI | Hạn chế | Không core | AI cat. | ~$95/yr class | Không | iOS-only bias |
| **Rocket Money** | Sub cancel / bills | Bank link | Cao | Subscription focus | — | — | — | Free + premium ~$6–14/mo | Không | Khác job |
| **Wallet (BudgetBakers)** | International PF | Bank + manual | TB–Cao | — | Có | — | — | Freemium | Hạn chế | Generic |
| **Spendee** | Budget visual | Manual + bank (region) | TB | — | — | — | — | Freemium | Hạn chế | — |
| **Expensify** | Business expense | SmartScan + cards | Cao | Approve workflow | — | **Core** | Policy | Per-user B2B | Có thể | B2B expense ≠ PF capture |
| **Firefly III** | Self-host power | Import tools + manual | TB | Full | CSV etc. | Community | Rules | Free OSS | Self-host | UX khó, không wedge VN banks |
| **Actual Budget** | Local-first budget | CSV primarily | Thấp | Register | CSV | Không | — | Free OSS | Self-host | Cần importer tốt |
| **GnuCash / hledger / Beancount** | Ledger nerds | Import scripts | Thấp | CLI/UI | OFX/CSV | Không | Scripts | Free | Có | High skill |
| **Veryfi / Holofin-class** | B2B extraction | Statement OCR API | Cao | API | PDF | Core | — | API pricing | API | Commodity extraction, không consumer inbox |

Nguồn giá/tính năng: trang pricing YNAB; so sánh Monarch/Rocket Money (wallstreetsurvivor, rocketmoney.com compare); App Store Money Lover IAP; docs YNAB file import & pending transactions.

### 5.2 Phản hồi tiêu cực phổ biến (community — không phải survey)

- **YNAB:** duplicate import, pending vs cleared mismatch, bank connection drop.  
- **US PF apps:** phụ thuộc aggregator; reconcilation fatigue.  
- **Manual apps (Money Lover class):** nhập tay mệt → bỏ app (quan sát product genre; **chưa có % churn nội bộ**).  
- **OSS:** setup importer, bank format, maintenance.

### 5.3 Khả năng hoạt động tại Việt Nam

| Lớp | Thực tế |
|---|---|
| Plaid-like consumer sync | **Không** là default cho user retail VN |
| Export CSV/PDF từ NH/app | **Có** (từng NH khác format) |
| E-wallet export | Không đồng nhất **[Chưa map đủ]** |
| Open Banking consumer app | Đang hình thành, **không nên phụ thuộc MVP** |

### 5.4 Khoảng trống Money Flow có thể khai thác

1. **VN/SEA multi-source formats** (NH + ví) với template parser.  
2. **Inbox-first review** (không auto-ghi sai).  
3. **Paste Anything** (SMS/noti text / copy từ app).  
4. **Export-first** cho user Excel (không ép đổi sang full app).  
5. **Privacy-first** (không xin password NH, raw retention ngắn).  
6. **Rule memory** học từ correction — cảm giác “thông minh” không cần LLM bill lớn.

---

## 6. Market gap

### Gap chính (được chọn)

> **Không có sản phẩm consumer-grade tại VN** biến *sao kê / text / file rời* thành *giao dịch sạch + workflow duyệt* với UX hiện đại, đồng thời **không phụ thuộc Open Banking**.

### Gap phụ

| Gap | Mô tả | Upside |
|---|---|---|
| Excel bridge | “Biến PDF sao kê thành Sheets sạch” | Lead magnet + retention |
| Seller recon | Đối chiếu đơn Shopee/TikTok vs tiền vào TK | B2B-light |
| Parser packs | Community templates theo NH | Moat data |
| Privacy local parse | Parse client-side CSV | Trust |

### Không phải gap (tránh)

- “Cần thêm một dashboard chi tiêu đẹp hơn Money Lover.”  
- “Cần AI chat tư vấn đầu tư.”  
- “Cần clone YNAB zero-based đầy đủ.”

---

## 7. Năm chiến lược sản phẩm

### S1 — Universal Financial Inbox (B2C full vision)

| | |
|---|---|
| **KH** | Consumer multi-account |
| **Pain** | Dữ liệu rải rác |
| **VP** | Một inbox cho mọi nguồn GD |
| **Wedge** | Paste + upload + sau noti |
| **Core** | Inbox, parsers, rules, ledger |
| **Moat** | Templates + rule memory + trust |
| **Chi phí** | Cao nếu full sources |
| **Rủi ro** | Quá rộng; feature not product |
| **$$$** | Freemium B2C khó |
| **Global** | Cao nếu schema chuẩn |
| **Fail** | Không focus; burn time multi-channel |

### S2 — Statement Parser cho Excel people (**MVP khuyến nghị**)

| | |
|---|---|
| **KH** | Excel/Sheets freelancers, multi-bank |
| **Pain** | Copy tay từ PDF/CSV lộn xộn |
| **VP** | Sao kê → Excel/CSV sạch trong vài phút |
| **Wedge** | 3 ngân hàng + 1 ví phổ biến |
| **Core** | Upload, parse, review grid, export |
| **Moat** | Format VN + correction dataset (opt-in) |
| **Chi phí** | **Thấp–TB** |
| **Rủi ro** | Bị coi là utility 1-shot |
| **$$$** | Freemium + Pro import volume |
| **Global** | Trung bình → cao (mọi nơi có statement) |
| **Fail** | Accuracy thấp; user không quay lại |

### S3 — Android Transaction Capture Companion

| | |
|---|---|
| **KH** | Android power users |
| **Pain** | Noti GD không vào sổ |
| **VP** | Capture gần real-time từ notification |
| **Wedge** | 1 app companion + web inbox |
| **Core** | Notification listener, queue, parse text |
| **Moat** | Template regex noti VN banks |
| **Chi phí** | TB–Cao (Play policy, privacy) |
| **Rủi ro** | Sợ quyền, policy Google, OEM kill |
| **$$$** | Sub mobile |
| **Global** | Cao ở thị trường Android |
| **Fail** | Trust collapse; ban store |

### S4 — Finance Capture cho Freelancer & Seller

| | |
|---|---|
| **KH** | Seller + freelancer |
| **Pain** | Thu chi nhiều nguồn, thuế/đối soát |
| **VP** | Dòng tiền business+personal tách được |
| **Wedge** | Import NH + tag client/order |
| **Core** | Inbox + tags + export kế toán |
| **Moat** | Workflow seller VN |
| **Chi phí** | TB |
| **Rủi ro** | Scope creep accounting |
| **$$$** | Cao hơn pure B2C |
| **Global** | SEA seller boom |
| **Fail** | Không khác Excel đủ |

### S5 — Parser API / SDK (B2B platform)

| | |
|---|---|
| **KH** | Kế toán dịch vụ, fintech, SME tools |
| **Pain** | Mỗi khách 1 format sao kê |
| **VP** | Normalize statements via API |
| **Wedge** | API + web demo |
| **Core** | Parser registry, webhooks, SLA |
| **Moat** | Coverage + accuracy benchmarks |
| **Chi phí** | Cao (support, SLA) |
| **Rủi ro** | Sales cycle, liability |
| **$$$** | **Cao nhất** (usage-based) |
| **Global** | Rất cao |
| **Fail** | Commodity OCR vendors; no distribution |

### Chiến lược bổ sung đã xét (rút gọn)

- Local-first / privacy tracker → tốt branding, khó monetize sớm.  
- Family inbox → social complexity.  
- Marketplace parser templates → phase 4–5.  
- Open-source core + hosted → GTM tốt sau khi pipeline ổn.

---

## 8. Chiến lược được chọn

### Tiêu chí chọn

1. Founder **ít vốn**, đang học code.  
2. Validate **pain capture** không cần full PF.  
3. Tận dụng **codebase ledger** hiện có.  
4. Rủi ro pháp lý thấp (không SMS silent, không password NH).  
5. Đường dẫn lên B2B / SEA.

### Lựa chọn

| Vai trò | Chiến lược |
|---|---|
| **MVP (chính)** | **S2 — Statement-to-Inbox (Excel bridge)** |
| **Dự phòng** | **S3 — Android companion** nếu upload adoption cao nhưng real-time demand mạnh |
| **Dài hạn upside** | **S5 — Parser API/SDK** (+ S4 seller workflow làm distribution) |

### Positioning câu một dòng

> **Money Flow là hộp thư giao dịch tài chính:** dán hoặc tải sao kê → hệ thống trích xuất → bạn duyệt theo ngoại lệ → xuất Excel hoặc ghi sổ “có thể chi hôm nay”.

### Quan hệ với product hiện tại

- **Giữ:** ledger, accounts, safe-to-spend, budgets (destination).  
- **Đổi trọng tâm UX:** **Inbox / Import** lên primary nav; dashboard không phải activation path.  
- **Tránh:** quảng cáo “AI tài chính” khi engine là rules + parsers.

---

## 9. MVP cụ thể

### Định nghĩa MVP (vertical slice)

**Tên nội bộ:** `Capture MVP v0`  
**Thời gian mục tiêu founder part-time:** 4–8 tuần sau validation  
**Stack:** Next.js + TS + Supabase (hiện có) + parser TypeScript thuần trước; Python worker chỉ khi PDF/OCR cần.

### Flow bắt buộc

1. Đăng nhập (đã có).  
2. **Paste text** hoặc **upload CSV/XLS** (PDF text-layer phase 1.5).  
3. Source detector (heuristic + user confirm).  
4. Parser extract rows.  
5. Normalize date/amount/currency (VND first).  
6. Duplicate check trong batch + vs ledger gần đây.  
7. **Inbox** `needs_review`.  
8. User approve / edit / reject / bulk category.  
9. Lưu rule đơn giản từ correction.  
10. Timeline tối thiểu **hoặc** export CSV.

### Tính năng

| Bắt buộc (P0) | Nên có (P1) | Chưa làm (P2+) |
|---|---|---|
| Auth | PDF text extract 1 NH | OCR scan |
| Paste Anything | Transfer pair detect | Android noti |
| CSV import generic column map | Merchant dictionary seed | Email forward |
| XLSX import | Bulk edit | Open Banking |
| Inbox list + detail | Import history | Family |
| Edit fields | Confidence badge | Split complex |
| Approve / reject | Rules UI basic | LLM parse |
| Export CSV | Duplicate vs history | Goals trong capture flow |
| Raw artifact store + delete | Idempotent re-import | Dashboard rebuild |
| Explain “vì sao parse vậy” (raw highlight) | | |

### Giả thuyết cần kiểm chứng

1. User chịu **upload/paste** sao kê nếu privacy rõ.  
2. Parse **≥85%** rows đúng amount+date trên format ưu tiên → họ thấy “đáng”.  
3. Correction **<15%** rows → quay lại import.  
4. Export CSV **đủ value** ngay cả khi chưa dùng dashboard.  
5. B2C free tier → paid khi volume / multi-source.

### Dữ liệu thu thập (product analytics — tối thiểu, privacy-safe)

- # import batches / user / week  
- source_type distribution  
- parse_success_rate, field_accuracy (sampled)  
- median time paste→first approve  
- % rows auto vs manual edit  
- export vs ledger-commit ratio  
- D7/D30 return import  

**Không** log raw full statement vào analytics tools bên thứ ba.

### Chỉ số thành công MVP (90 ngày post-launch soft)

| Metric | Mục tiêu sơ bộ |
|---|---|
| Phỏng vấn validated | ≥15 |
| Activated importers (1 batch success) | ≥50 |
| Repeat importers (week 2) | ≥40% of activated |
| Median review time / txn | ≤8 giây |
| Correction rate | ≤20% fields critical |
| NPS-like “sẽ dùng lại” | ≥50% interview follow-up |

### Kill criteria (MVP)

Xem [§27](#27-kill-criteria).

---

## 10. User journey

### Journey A — First value (Excel bridge)

1. Đọc landing: “Sao kê → Excel sạch, không nhập tay”.  
2. Đăng ký email/Google.  
3. Onboarding 3 bước: (1) quyền riêng tư (2) chọn nguồn đầu (3) upload/paste demo.  
4. Xem preview 10 dòng đầu + cảnh báo confidence.  
5. Map cột nếu CSV lạ (1 lần).  
6. Vào Inbox: 87 needs review / 12 high confidence.  
7. Bulk approve high confidence.  
8. Sửa 5 merchant sai → “Nhớ rule?”.  
9. Export CSV **hoặc** “Ghi vào sổ Money Flow”.  
10. Safe-to-spend cập nhật (nếu commit ledger).

### Journey B — Weekly ritual

1. Mở app → badge Inbox “23 mới”.  
2. Paste 2 đoạn noti + 1 CSV.  
3. Review-by-exception 3 phút.  
4. Done. Không mở chart.

### Journey C — Parser fail gracefully

1. Upload PDF lạ.  
2. System: “Không nhận diện template — trích text thô / map tay”.  
3. User map 4 cột.  
4. Lưu mapping cho lần sau.  
5. Không bịa số.

---

## 11. Wireframe text

> Nguyên tắc: **không màu, không style** — chỉ cấu trúc & ưu tiên hành động.  
> Tham chiếu thêm: `docs/wireframes.md`, `docs/UX_PRINCIPLES.md` (cần cập nhật inbox-first).

### 11.1 Onboarding

```
[Logo Money Flow]
Bạn không cần nhập tay từng giao dịch.
Dán text, tải CSV/XLS/PDF → duyệt → xong.

[ ] Tôi hiểu: không bao giờ hỏi mật khẩu ngân hàng
[ ] Tôi đồng ý chính sách xử lý sao kê (link)

[Tiếp tục]

Bước 2/3: Nguồn đầu tiên?
( ) Dán text từ SMS/app  ( ) Tải file CSV/XLS  ( ) Xem demo mẫu

Bước 3/3: [Chọn file / Dán vào đây]
```

### 11.2 Inbox (home)

```
Inbox                          [+ Capture]
Cần duyệt: 34    Đã duyệt hôm nay: 12

Filter: [All] [Low confidence] [Duplicates] [Transfers?]
Sort: newest import

□  12/07  Highlands Coffee     -45.000  VND  ⚠ merchant?  [Sửa]
□  12/07  TRANSFER to *1234    -2.000.000    ⇄ có thể CK   [Ghép]
☑  11/07  LUONG CT ABC         +25.000.000   ✓ high         [OK]
...
[Duyệt đã chọn] [Từ chối] [Gán danh mục hàng loạt]
```

### 11.3 Paste Anything

```
Dán bất cứ thứ gì
┌─────────────────────────────────────┐
│ (textarea)                          │
│ VD: cafe 45k tiền mặt               │
│ hoặc nguyên đoạn SMS ngân hàng      │
└─────────────────────────────────────┘
Nguồn gợi ý: [Tự nhận] [MB SMS] [MoMo] [Khác]
[Phân tích]  (primary)

Kết quả preview (trước khi vào inbox)
- 3 giao dịch tìm thấy
- 1 không chắc amount → highlight
```

### 11.4 Upload statement

```
Tải sao kê
[Kéo thả CSV, XLS, XLSX, PDF]  max 10MB

Sau upload:
File: MB_062026.pdf (text layer ✓)
Template: MB Bank statement v3 (82% match)
[Dùng template này] [Map cột thủ công]

Progress: Extract → Normalize → Dedupe → Inbox
```

### 11.5 Quick Add

```
+ Nhanh
Số tiền*  [        ] VND
Ghi chú   [cafe            ]
Tài khoản [Tiền mặt ▾]
[Lưu]  (1 tap sau khi fill amount)
Hint: “cafe 45k” cũng dán được ở Paste
```

### 11.6 Transaction review

```
Chi tiết giao dịch ứng viên
Amount: -45.000 VND     Confidence: 0.71
Date: 2026-07-12
Merchant raw: "HIGHLANDS COFFEE Q1"
Merchant norm: Highlands Coffee (rule #12)
Category: Ăn uống
Account: Techcombank
Source: paste / import_batch_88
Raw: ...HIGHLANDS...45,000đ...
Parser: bank_sms_mb@1.4.0
Vì sao: regex amount + merchant dict

[Duyệt] [Sửa] [Trùng với…] [Từ chối]
```

### 11.7 Bulk correction

```
Đã chọn 12 giao dịch
Gán category: [Ăn uống ▾]
Gán account:  [MoMo ▾]
Merchant contains "GRAB" → normalize "Grab"
[ ] Tạo rule cho lần sau
[Áp dụng]
```

### 11.8 Rules

```
Rules (ưu tiên cao → thấp)
1. merchant ~ /HIGHLANDS/i → norm Highlands; cat Ăn uống
2. amount > 0 & desc ~ /LUONG|SALARY/i → cat Lương
[Thêm rule] [Import community pack - later]
```

### 11.9 Import history

```
Lịch sử import
2026-07-14  MB.csv     120 rows  4 rejected  [Xem] [Xóa raw]
2026-07-07  paste×3      3 rows  0 rejected
```

### 11.10 Timeline (minimal)

```
Dòng thời gian (đã duyệt)
14/07  -45.000  Highlands  Ăn uống
13/07  -2.0tr   CK nội bộ  (không tính chi)
...
[Export CSV]
```

### 11.11 Privacy settings

```
Quyền riêng tư
- Lưu raw file: [7 ngày ▾] / [Xóa ngay sau parse]
- [ ] Cho phép dùng correction ẩn danh cải thiện parser (opt-in)
- Chưa: notification listener
[Tải toàn bộ dữ liệu] [Xóa tài khoản]
```

### 11.12 Export & delete

```
Export
Khoảng ngày [    ]→[    ]  Format CSV
[Tải]

Xóa tài khoản
Gõ DELETE để xác nhận
Xóa: profile, ledger, imports, raw artifacts trong 30 ngày soft-delete policy
```

### UX khi parser không chắc

- Không auto-post vào ledger.  
- Badge confidence + field-level uncertainty.  
- Luôn show **raw snippet** cạnh field.  
- Primary CTA: “Sửa & duyệt”, không “Bỏ qua im lặng”.

---

## 12. Kiến trúc hệ thống

### 12.1 So sánh stack (rút gọn)

| Lựa chọn | Ưu | Nhược | Quyết định |
|---|---|---|---|
| **Next.js + TS + React** | Đang dùng, full-stack, Vercel | — | **Giữ** |
| Supabase PG + Auth + Storage | RLS, free tier, realtime | Vendor lock TB | **Giữ** |
| Firebase | Nhanh mobile | Query/money model kém hơn PG | Không |
| Python worker | PDF/OCR ecosystem | Thêm deploy | **Phase PDF/OCR** |
| Node-only parse | Đơn giản MVP | PDF yếu hơn | **MVP CSV/text** |
| Vercel | Fit Next | Timeout worker | Edge/API short jobs |
| Railway/Render Docker | Worker dài | Chi phí | Khi có queue |
| Cloudflare R2 | Cheap storage raw | — | Optional |
| Flutter companion | Cross-platform | Học thêm | Muộn |
| **Kotlin Android** | Noti listener native | Chỉ Android | Phase mobile |

### 12.2 Stack chính thức

```
Web/PWA:     Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
Auth/DB:     Supabase (Postgres + Auth + RLS + Storage)
Domain $:    integer minor units (đã có)
Parse MVP:   TypeScript packages in-repo (csv/xlsx/text)
Parse later: Python worker (pdfplumber/PyMuPDF → optional PaddleOCR)
Jobs:        Supabase queue / DB job table → worker
Charts later: Recharts (đã có pattern)
Forms:       React Hook Form + Zod
Icons:       Lucide
Deploy web:  Vercel
Worker:      Railway/Render khi cần
```

### 12.3 Sơ đồ kiến trúc (logic)

```
[Browser PWA]
   |  paste/upload/quick-add
   v
[Next.js Server Actions / Route Handlers]
   |-- auth (Supabase session)
   |-- create import_batch + store raw (Storage)
   |-- enqueue parse_job
   v
[Parser Worker] (TS now / Python later)
   validate → extract → detect source → template
   → normalize → rules → dedupe → transfer guess
   → write candidate_transactions (review_state)
   v
[Postgres + RLS]
   candidates → user review → financial_transactions (+ entries)
   v
[Export CSV | Dashboard safe-to-spend]
```

### 12.4 Modules

| Module | Trách nhiệm |
|---|---|
| Authentication | Supabase email/OAuth |
| User/workspace | profiles; workspace later |
| Accounts/wallets | accounts hiện có |
| Raw artifacts | storage path, checksum, retention |
| Import batches | status machine |
| Source detector | heuristics |
| Parser registry | versioned parsers |
| Normalizer | date, amount, VND |
| Rule engine | priority rules |
| Merchant dictionary | aliases |
| Categorization | rules + defaults |
| Duplicate detector | fingerprint |
| Transfer matcher | opposite legs |
| Review inbox | UI + state |
| Audit log | field changes |
| Export | CSV |
| Privacy/retention | jobs delete raw |
| Android ingestion | later API |
| API/SDK | later |

### 12.5 Ranh giới

- **Frontend:** capture UX, inbox, review, settings.  
- **Backend (Next server):** authz, orchestration, no heavy OCR.  
- **Worker:** CPU-heavy parse; pure functions + fixtures.  
- **DB:** source of truth; money chỉ qua RPC an toàn (mở rộng pattern hiện có).

### 12.6 Versioning parser

- ID: `{provider}_{kind}@semver` ví dụ `vcb_csv@1.2.0`.  
- Mỗi candidate lưu `parser_id`, `parser_version`, `template_id`.  
- Đổi parser → regression fixture suite bắt buộc.

### 12.7 Lỗi, idempotency, chống trùng

- Import: `content_sha256` + `user_id` unique → re-upload cùng file = same batch or reject.  
- Job: `idempotency_key` per batch.  
- Txn candidate fingerprint: `hash(account_hint|date|amount|raw_desc_norm)`.  
- Ledger commit: giữ `idempotency_key` như schema hiện tại.

### 12.8 Raw vs normalized + xóa raw

- Raw: Storage private bucket, path `userId/batchId/file`.  
- Normalized: rows DB.  
- Policy default: xóa raw sau **7 ngày** hoặc ngay khi user chọn; soft-delete batch metadata giữ audit tối thiểu.

### 12.9 Cấu trúc thư mục đề xuất (bổ sung repo)

```
src/
  app/
    inbox/
    capture/
      paste/page.tsx
      upload/page.tsx
    rules/
    imports/
  modules/
    capture/
      source-detect.ts
      normalize.ts
      dedupe.ts
      transfer.ts
      confidence.ts
    parsers/
      registry.ts
      csv/generic.ts
      csv/vcb.ts
      text/sms-mb.ts
      xlsx/generic.ts
    rules/
      engine.ts
      learn.ts
  server/
    imports.ts
    candidates.ts
packages/ (optional later)
  parser-core/
worker/ (later)
  python/
supabase/migrations/
  ..._import_and_candidates.sql
fixtures/
  parsers/
    vcb_csv_v1/
      sample.csv
      expected.json
```

---

## 13. Database schema

### 13.1 Bổ sung trên nền hiện có

Giữ `financial_transactions` + `transaction_entries` (ledger). Thêm lớp **candidate / import**.

```sql
-- rút gọn logic; implement qua migration riêng

create type public.import_status as enum (
  'uploaded', 'processing', 'needs_review', 'completed', 'failed', 'cancelled'
);

create type public.review_state as enum (
  'pending', 'approved', 'rejected', 'merged_duplicate', 'linked_transfer'
);

create type public.source_type as enum (
  'manual', 'quick_add', 'nl_text', 'paste', 'csv', 'xlsx', 'pdf',
  'image_receipt', 'image_screenshot', 'email', 'notification', 'api'
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type public.source_type not null,
  source_provider text, -- e.g. vcb, momo, unknown
  status public.import_status not null default 'uploaded',
  original_filename text,
  content_sha256 text not null,
  raw_storage_path text,
  parser_id text,
  parser_version text,
  row_count int,
  error_message text,
  retention_delete_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_sha256)
);

create table public.raw_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  mime_type text not null,
  byte_size int not null check (byte_size > 0 and byte_size <= 10485760),
  storage_path text not null,
  extracted_text_preview text, -- truncated; full text optional side file
  created_at timestamptz not null default now()
);

create table public.transaction_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  external_id text,
  fingerprint text not null,
  source_type public.source_type not null,
  source_provider text,
  raw_text text,
  raw_artifact_id uuid references public.raw_artifacts(id),
  account_id uuid references public.accounts(id),
  direction text not null check (direction in ('in','out','transfer','unknown')),
  amount_minor bigint not null check (amount_minor <> 0),
  currency_code text not null default 'VND',
  booked_on date,
  occurred_on date,
  merchant_raw text,
  merchant_normalized text,
  category_id uuid references public.categories(id),
  tags text[] not null default '{}',
  note text not null default '',
  channel text,
  txn_type text, -- fee, refund, cash_withdraw, salary, installment, ...
  transfer_group_id uuid,
  duplicate_of uuid,
  confidence numeric(4,3) not null default 0,
  parser_id text,
  parser_version text,
  rule_ids text[] not null default '{}',
  review_state public.review_state not null default 'pending',
  explanation jsonb not null default '{}', -- field-level reasons
  posted_transaction_id uuid references public.financial_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table public.categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- null reserved future global
  priority int not null default 100,
  is_enabled boolean not null default true,
  match jsonb not null, -- {field, op, value}
  actions jsonb not null,
  version int not null default 1,
  source text not null default 'user', -- user|learned|system
  created_at timestamptz not null default now()
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- null = system seed
  pattern text not null,
  normalized_name text not null,
  default_category_id uuid
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
```

### 13.2 Transaction schema chuẩn (logical)

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| id | ✓ | UUID |
| external_id | | Từ file/bank |
| import_batch_id | | |
| source_type / provider | ✓ | |
| raw_text / artifact | | Giữ đến khi duyệt hoặc theo retention |
| account | ✓ khi approve | |
| direction | ✓ | |
| amount_minor | ✓ | Integer; VND = đồng |
| currency | ✓ | Default VND |
| occurred_on / booked_on | ≥1 | |
| merchant_raw / normalized | | |
| category | ✓ khi approve expense/income | |
| tags, note | | |
| channel | | ATM, POS, online… |
| txn_type | | refund, fee, transfer… |
| transfer_link | | |
| duplicate_link | | |
| confidence | ✓ candidate | |
| parser_version | ✓ nếu auto | |
| rule_applied | | |
| review_state | ✓ candidate | |
| audit | | append-only |

### 13.3 Hỗ trợ case đặc biệt

| Case | Cách model |
|---|---|
| VND | amount_minor = VND units |
| Multi-currency | currency_code + future FX table |
| Refund | direction in / txn_type refund + link |
| Pending/posted | review + optional status on candidate |
| Transfer | pair candidates / two ledger entries (đã có transfer) |
| Split | phase 2: child allocations |
| Installment | txn_type + meta |
| Bank fee | category system + txn_type fee |
| Cash withdraw | txn_type + optional transfer to cash account |
| Income | direction in |
| Cancelled | reject / void posted via soft-delete pattern |
| Edit after import | audit_events + update before post; after post dùng transaction edit RPC |

---

## 14. API contract

### 14.1 Server actions / REST nội bộ (MVP)

```http
POST /api/imports
Content-Type: multipart/form-data
file | text
→ { batch_id, status }

GET /api/imports/:batchId
→ { status, counts, errors }

POST /api/imports/:batchId/remap
{ column_map }
→ { status }

GET /api/inbox?state=pending&cursor=
→ { items[], next_cursor }

GET /api/inbox/:candidateId
→ { candidate, explanation, raw_snippet }

PATCH /api/inbox/:candidateId
{ fields... }
→ { candidate }

POST /api/inbox/bulk
{ ids[], action: approve|reject|categorize, payload }
→ { results }

POST /api/inbox/:id/approve
→ { transaction_id }

GET /api/export/transactions?from&to
→ CSV file

DELETE /api/account
→ { scheduled_deletion_at }

POST /api/rules
GET /api/rules
PATCH /api/rules/:id
```

### 14.2 Worker message

```json
{
  "job_type": "parse_import_batch",
  "batch_id": "uuid",
  "user_id": "uuid",
  "attempt": 1,
  "idempotency_key": "uuid"
}
```

### 14.3 Future public API (không làm sớm)

```http
POST /v1/statements
Authorization: Bearer sk_...
→ { id, status }

GET /v1/statements/{id}
→ { transactions: NormalizedTxn[] }
```

---

## 15. Parser pipeline

### 15.1 Pipeline 15 bước

1. **File validation** — mime, size ≤10MB, extension allowlist.  
2. **Malware/size check** — reject executable; zip bomb guard.  
3. **Text extraction** — CSV decode; XLSX sheet; PDF text layer.  
4. **OCR fallback** — phase 2+ (PaddleOCR/Tesseract).  
5. **Source identification** — header signatures, column names, bank keywords.  
6. **Template matching** — registry score.  
7. **Row segmentation** — lines/tables.  
8. **Field extraction** — date, amount, desc.  
9. **Date/amount normalization** — `dd/mm/yyyy`, `1.234.567`, `45k`, `45.000đ`.  
10. **Merchant cleanup** — strip city codes, card masks.  
11. **Classification** — fee/transfer/refund heuristics.  
12. **Duplicate detection** — fingerprint.  
13. **Transfer detection** — opposite amount same day.  
14. **Confidence calculation** — weighted field scores.  
15. **Review routing** — auto-suggest only; post only on approve (MVP).

### 15.2 Chiến lược theo loại nguồn

| Nguồn | Cách làm MVP | Thư viện |
|---|---|---|
| CSV | Header detect + column map UI | papaparse / custom |
| XLS/XLSX | First sheet heuristics | SheetJS (license check) / exceljs |
| PDF text | extract text + regex blocks | pdfplumber / unpdf |
| PDF scan | OCR | PaddleOCR (VI) later |
| Screenshot | OCR + layout | later |
| Receipt | amount+date focus | later |
| Bank noti text | regex templates VN | pure TS |
| Email | parse MIME | later |

### 15.3 Đánh giá thư viện OSS (tóm tắt)

| Lib | License* | VI | Self-host | Integrate | Ghi chú |
|---|---|---|---|---|---|
| Tesseract | Apache-2.0 | TB | ✓ | TB | Nhẹ, VI kém Paddle |
| PaddleOCR | Apache-2.0 | **Tốt hơn** | ✓ | Nặng GPU/CPU | Ưu tiên OCR VI |
| OCRmyPDF | GPL | — | ✓ | TB | PDF pipeline |
| pdfplumber | MIT | n/a | ✓ | Dễ | Text PDF |
| PyMuPDF | AGPL/commercial | n/a | ✓ | Dễ | **Chú ý license** |
| Camelot/Tabula | MIT/Apache | n/a | ✓ | TB | Table PDF |
| pandas/openpyxl | BSD | n/a | ✓ | Dễ | Tabular |
| RapidFuzz | MIT | n/a | ✓ | Dễ | Merchant fuzzy |
| dateparser | BSD | TB | ✓ | Dễ | Multi format |
| ofxtools / mt-940 | OSS | n/a | ✓ | TB | Chuẩn quốc tế |

\*Luôn xác nhận license trước production.

### 15.4 Fixtures & benchmark

```
fixtures/parsers/vcb_csv_v1/
  input.csv
  expected.json   # list of {date, amount_minor, merchant_raw}
  meta.json       # parser_id, notes
```

Metrics: row recall, amount accuracy, date accuracy, merchant exact/fuzzy, latency p95, memory.

Gate: không merge parser nếu regression >1% trên suite.

---

## 16. Rule engine design

### 16.1 Format rule (JSON)

```json
{
  "id": "rul_...",
  "priority": 50,
  "match": {
    "all": [
      { "field": "merchant_raw", "op": "contains", "value": "HIGHLANDS", "case_insensitive": true }
    ]
  },
  "actions": [
    { "set": "merchant_normalized", "value": "Highlands Coffee" },
    { "set": "category_name", "value": "Ăn uống" }
  ],
  "explain": "Merchant chứa HIGHLANDS"
}
```

### 16.2 Priority & conflict

1. User explicit rule (cao).  
2. Learned from last correction (medium).  
3. System/global seed (thấp).  
4. Cùng priority → rule mới hơn thắng; log conflict.  
5. Không silent override field user vừa sửa trong session.

### 16.3 Versioning & scopes

- `system` / `workspace` / `user` / future `community`.  
- Mỗi apply lưu `rule_ids[]` trên candidate.  
- Rollback: disable rule version; không rewrite history đã post trừ khi user re-run.

### 16.4 Học từ correction

Khi user sửa merchant/category ≥2 lần cùng pattern → đề xuất rule (không auto-create destructive).  
Opt-in share anonymized pattern later.

### 16.5 Giải thích

UI: “Gán Ăn uống vì rule #12 (HIGHLANDS) + parser amount regex”.

### 16.6 Có phải moat?

| | |
|---|---|
| Rules đơn lẻ | Dễ copy — **không moat** |
| Library + correction graph + bank templates + UX trust | **Moat trung bình**, compounding |
| Bán dữ liệu user | **Cấm** |

---

## 17. Security checklist

- [ ] TLS everywhere  
- [ ] Encryption at rest (Supabase/storage)  
- [ ] RLS mọi bảng user-owned  
- [ ] Không bao giờ thu thập password/OTP NH  
- [ ] Không log raw statement vào APM  
- [ ] Redact account numbers in UI (mask)  
- [ ] File allowlist + size limit  
- [ ] Virus scanning strategy when scale  
- [ ] Signed URLs short-lived for download  
- [ ] CSRF/session cookie secure (Supabase SSR)  
- [ ] Rate limit upload  
- [ ] Idempotent writes  
- [ ] Audit log privileged actions  
- [ ] Export & delete account  
- [ ] Dependency scanning  
- [ ] STRIDE review trước public beta  

### STRIDE tối thiểu

| Threat | Ví dụ | Mitigation |
|---|---|---|
| Spoofing | Giả session | Supabase auth, httpOnly |
| Tampering | Sửa amount client | Server validate + RPC |
| Repudiation | User chối xóa | Audit log |
| Info disclosure | Leak raw files | RLS, private bucket |
| DoS | Upload flood | Rate limit, max size |
| Elevation | Đọc batch user khác | RLS tests |

---

## 18. Legal and privacy checklist

### Khung pháp lý VN (cập nhật research 2026-07)

| Văn bản | Nội dung liên quan | Ghi chú |
|---|---|---|
| **NĐ 13/2023/NĐ-CP** | Bảo vệ DLCN; hiệu lực 01/7/2023 | Nền tảng consent, xử lý DLCN |
| **Luật BVDLCN 2025 (91/2025/QH15)** | Có hiệu lực **01/01/2026** (theo nguồn pháp lý/truyền thông pháp luật) | Chế tài nặng hơn: tới **5% doanh thu** (chuyển XBI), **3 tỷ**, mua bán data **×10 khoản thu** — theo tổng hợp luatvietnam; **đây không phải tư vấn pháp lý** |
| Open Banking VN | Hệ sinh thái đang phát triển | **Không** dựa vào để MVP |

**[Chưa có đủ bằng chứng / không kết luận pháp lý]:** phân loại chính xác “dữ liệu tài chính nhạy cảm” trong mọi use-case upload sao kê — **cần rà soát luật sư** trước commercial launch.

### Checklist triển khai

- [ ] Privacy policy tiếng Việt rõ: dữ liệu gì, lưu bao lâu, không bán data  
- [ ] Consent tách: tài khoản vs xử lý sao kê vs opt-in improve parser  
- [ ] DPIA nội bộ trước khi thu scale  
- [ ] Retention raw ngắn  
- [ ] Quyền truy cập / export / xóa  
- [ ] Đánh giá chuyển dữ liệu xuyên biên giới nếu host ngoài VN (Supabase region!)  
- [ ] Không đọc SMS không có UX consent rõ  
- [ ] Notification listener: giải thích + tối thiểu + Play policy  
- [ ] Incident response plan  
- [ ] Không quảng cáo “an toàn tuyệt đối”  

### Privacy-by-design (bắt buộc product)

1. Không password/OTP NH.  
2. Minimize fields.  
3. Raw short retention.  
4. Local parse path cho CSV (future enhancement).  
5. User control delete.  
6. Transparent parser explanation.

---

## 19. Roadmap 12 tháng

| Quý | Mục tiêu | Deliverables | Success gate |
|---|---|---|---|
| **Q1** | Validate + Capture slice | 15–30 interviews; landing; paste+CSV+inbox+export; 2–3 templates | Repeat import intent |
| **Q2** | MVP harden | XLSX, PDF text 1–2 banks, rules, dedupe, retention, privacy pages | 100 activated |
| **Q3** | PMF loop | Bulk fix, merchant dict, PWA share, commit-to-ledger polish | W4 retention import >25% |
| **Q4** | Expand capture | Screenshot OCR pilot, Android companion alpha, seller tags pilot | Paid conversion experiment |

---

## 20. Roadmap 3 năm

| Năm | Theme | Kết quả |
|---|---|---|
| **Y1** | Capture MVP + VN templates | Consumer wedge + trust |
| **Y2** | Mobile capture + shared workspace light + accounting export | SEA expansion start |
| **Y3** | Parser API/SDK + community packs + B2B pilots | Platform revenue mix |

---

## 21. Product backlog ưu tiên

### Now (P0)

1. Landing + waitlist questions (capture-focused).  
2. User interview script (15 câu).  
3. `import_batches` + storage migration.  
4. Paste text parser (NL quick + SMS regex skeleton).  
5. Generic CSV import + column mapper.  
6. Inbox UI + approve → ledger.  
7. Export CSV.  
8. Privacy policy draft + delete account.  
9. Parser fixtures harness.  
10. Analytics events privacy-safe.

### Next (P1)

11. XLSX.  
12. Duplicate fingerprint.  
13. Rule engine v1 + learn prompt.  
14. PDF text one bank.  
15. Import history + raw delete.  
16. Confidence & explanation UI.  
17. Transfer suggestion.

### Later (P2)

18. OCR.  
19. Android noti.  
20. Email.  
21. Family.  
22. Public API.  
23. LLM assist with hard cost cap.

### Won’t (giai đoạn này)

- Open Banking production.  
- Investment advice AI.  
- Clone full YNAB envelopes.  
- SMS silently.

---

## 22. Go-to-market

### 10 users

- Bạn bè freelancer + 5 người trong group “quản lý chi tiêu”.  
- Concierge: **founder parse tay/file giúp** trong 48h.

### 50 users

- Facebook groups Excel/freelance/seller.  
- Post case study: “PDF MB → CSV sạch”.  
- Lead magnet: Google Sheet template + hướng dẫn export sao kê.

### 100 users

- TikTok/YouTube short: screen record paste SMS → inbox.  
- SEO: “chuyển sao kê ngân hàng sang excel”, “doc file sao ke csv”.  
- Product Hunt later (global privacy angle).

### 1.000 users

- Referral “tặng thêm 50 imports”.  
- Partnership kế toán dịch vụ (họ là power importer).  
- Open-source **1 parser template** để credibility.

### Landing page copy (draft)

- **Headline:** Sao kê ngân hàng thành danh sách giao dịch sạch — trong vài phút.  
- **Sub:** Không nhập tay. Không xin mật khẩu ngân hàng. Bạn duyệt trước khi ghi sổ.  
- **Pain:** Nhiều TK + ví; Excel rối; app chi tiêu bỏ vì lười gõ.  
- **Demo:** GIF paste → inbox.  
- **CTA:** Thử miễn phí / Gửi sao kê mẫu (đã che số TK).  
- **Trust:** Retention raw 7 ngày; xóa 1 click; không bán dữ liệu.  
- **Waitlist Q:** Bạn đang dùng app/Excel nào? Bao nhiêu TK/ví? Có tải sao kê không?

### Concierge test

Thu 10 file đã redact → đo thời gian manual vs tool → cải thiện parser trước scale.

---

## 23. Pricing

### Nguyên tắc

Không bán dữ liệu. Free đủ để aha. Paid theo **volume import / sources / OCR**.

### Đề xuất thử nghiệm VN

| Gói | Giá thử | Include |
|---|---|---|
| **Free** | 0đ | 2 import batches/tuần; paste unlimited nhẹ; export CSV; 1 template auto |
| **Pro** | **49.000–79.000đ/tháng** hoặc **399.000–599.000đ/năm** | Unlimited import hợp lý; rules; PDF; priority parsers; raw retention control |
| **Business** (sau) | **299.000–999.000đ/tháng** | Multi-client workspace kế toán; API low volume |

**[Giả thuyết giá]** — phải A/B sau có usage.

So sánh neo: YNAB ~$109/năm; Money Lover lifetime rẻ → **VN Pro phải rẻ hơn Western PF**, bán **tiết kiệm thời gian** không “lifestyle budget”.

---

## 24. Unit economics

### Giả định (minh họa — không phải forecast đã validate)

| Hạng mục | Ước lượng |
|---|---|
| Hosting / user active / tháng | $0.02–0.10 (free tier heavy early) |
| Storage raw 7 ngày | Thấp nếu purge |
| OCR / page (khi có) | Self-host CPU cost hoặc $0; tránh API đắt |
| Support | Chủ yếu self-serve + FAQ |
| Conversion free→pro | 2–5% **[Giả thuyết]** |
| ARPU pro | ~50–70k VND/tháng |

### 3 kịch bản (năm 1, illustrative)

| | Xấu | Cơ sở | Tốt |
|---|---|---|---|
| MAU capturers | 200 | 1.000 | 5.000 |
| Paid | 5 | 40 | 250 |
| MRR | ~0.3tr | ~2.5tr | ~15tr VND |
| Kết luận | Side project | Bootstrap được | Thuê help parser |

**Hòa vốn:** khi Pro covers Vercel/Supabase + domain + time opportunity — **chưa có đủ bằng chứng** số chính xác; theo dõi cash monthly.

---

## 25. Risk register

| ID | Rủi ro | P | I | Mitigation |
|---|---|---|---|---|
| R1 | Chỉ là feature, không product | M | H | Export-first + ritual weekly import metric |
| R2 | User không upload sao kê | H | H | Paste text path; privacy UX; concierge |
| R3 | Parser accuracy thấp | H | H | Fixtures; human review always |
| R4 | Money Lover copy | M | M | Speed VN templates + inbox UX |
| R5 | Open Banking làm commodity capture | L–M | H | Move upstack rules/normalization/API |
| R6 | Privacy incident | L | **Critical** | Minimize raw; RLS; delete; legal |
| R7 | Play policy noti | M | H | Defer Android; optional |
| R8 | Founder overbuild dashboard | H | H | Backlog P0 only capture |
| R9 | Legal cross-border data | M | H | Chọn region; DPIA |
| R10 | 2 năm 0 users | M | H | 30-day kill gates |

---

## 26. North Star Metric

### North Star

> **Số giao dịch hợp lệ được người dùng duyệt (approve) mỗi tuần**  
> `Weekly Approved Transactions (WAT)`

Phản ánh capture + trust + value thực.

### Metric layers

| Loại | Metric | Ghi chú |
|---|---|---|
| Vanity | Downloads, pageviews | Không ra quyết định |
| Activation | First batch → ≥1 approve trong 24h | |
| Retention | WAU importers; W4 repeat import | |
| Quality | Correction rate; parse accuracy | |
| Revenue | Paid conversion; churn | |
| Trust | Delete rate; support privacy tickets; opt-in rate | |

Supporting: time-to-first-approve; % auto-high-confidence; export count.

---

## 27. Kill criteria

**Dừng hoặc pivot mạnh nếu:**

1. Sau **30 ngày** outreach: <10 phỏng vấn **hoặc** <3 người chịu gửi sao kê redact.  
2. Sau **90 ngày** prototype với ≥30 user thử: **<15%** import lại lần 2.  
3. Correction rate **>40%** trên critical fields sau 2 template tốt nhất → approach sai.  
4. Không ai dùng export **và** không ai commit ledger — value = 0.  
5. Phát hiện rào pháp lý chặn xử lý sao kê consumer mà không có path compliance khả thi (luật sư).  

**Pivot sang B2B sớm nếu:** consumer weak nhưng kế toán/seller trả tiền concierge parse.

---

## 28. Kế hoạch hành động 7 ngày đầu

| Ngày | Việc |
|---|---|
| D1 | Chốt ICP + viết 15 câu hỏi phỏng vấn; list 30 người/group để liên hệ |
| D2 | Landing 1-page capture-first (có thể route `/landing` chỉnh copy) |
| D3 | 5 phỏng vấn; xin 3 file mẫu redact |
| D4 | Phân tích 3 file → manual schema fields; ghi pain |
| D5 | Prototype CLI/TS: parse 1 CSV mẫu → JSON |
| D6 | Vẽ flow inbox trên paper; cập nhật UX principles “inbox-first” note |
| D7 | Quyết định go/no-go tuần 2 dựa trên ≥5 interviews; viết changelog strategy |

---

## 29. Kế hoạch hành động 30 ngày đầu

| Tuần | Mục tiêu |
|---|---|
| W1 | Validation (mục 28) |
| W2 | Migration import_batches + candidates; paste UI; store raw |
| W3 | CSV generic + inbox approve → ledger; export |
| W4 | 1 bank template; dedupe basic; privacy page; 10 beta users |

**Output cuối tháng:** video demo 60s + 10 user thử thật + metrics sheet.

---

## 30. Kế hoạch phát triển dành cho founder đang học lập trình

### Thứ tự học (song song build)

JS → TS → React → Next.js → Postgres/SQL → Supabase Auth → Zod validation → File upload → Parser pure functions → Testing → Security basics → Deploy → (later) Python PDF → Android.

### Milestones nhỏ (Definition of Done)

| # | Milestone | Học | FE | BE/DB | Test | Tránh over-engineer |
|---|---|---|---|---|---|---|
| 1 | Parse text → 1 txn object | Regex, date | — | pure fn | unit | Đừng OCR |
| 2 | Lưu candidate | SQL insert | form | table | integration | Đừng queue |
| 3 | Inbox list | React list | page | select RLS | — | Đừng virtualize sớm |
| 4 | Approve/edit | forms | dialog | RPC post ledger | unit money | Đừng multi-currency |
| 5 | CSV upload | File API | dropzone | storage | fixture | Đừng multi-sheet AI |
| 6 | Batch status | state machine | progress | status enum | — | Đừng kafka |
| 7 | Dedupe | hashing | badge | unique fingerprint | unit | Đừng ML |
| 8 | Rules | JSON match | rules page | table | unit | Đừng RETE engine |
| 9 | PDF text | pdf lib | upload | worker optional | fixture | Đừng GPU OCR |
| 10 | Beta deploy | Vercel | — | prod env | smoke | Đừng microservices |

### Lỗi phổ biến

- Float cho tiền → **luôn minor int**.  
- Parse trên client only không validate server.  
- Auto-write ledger không review.  
- Log raw ra console production.  
- Xây dashboard trước khi 1 import work.

---

# Phụ lục A — Phân biệt các bài toán

1. **PF management** — hiểu & quyết định chi tiêu (safe-to-spend).  
2. **Capture** — đưa dữ liệu vào hệ thống.  
3. **Chứng từ** — lưu hóa đơn hợp lệ.  
4. **Chuẩn hóa** — merchant/category/schema thống nhất.  
5. **Đối soát** — khớp 2 nguồn.  
6. **Kế toán** — sổ sách, thuế, báo cáo pháp định.

Money Flow MVP = **(2)+(4)** với đường vào **(1)**; không làm (6) sớm.

---

# Phụ lục B — Hành vi người dùng (8 nhóm)

| Nhóm | JTBD | Trigger | Data ở đâu | Bottleneck | Bỏ cuộc vì | Privacy | Upload? | Noti? | Pay? | Freq | Aha |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Manual | Kiểm soát chi | Hết tiền cuối tháng | Não + bill | Gõ từng món | Lười | TB | TB | Cao | Thấp | Daily fail | 1-tap add |
| 2 Ex-app | Lại thử manage | Guilt | Cũ + NH | Re-entry | Friction | TB | TB | TB | Thấp | Burst | Import 1 tháng 1 lần |
| 3 Excel | Báo cáo tự làm | Thuế/Q | Sheets+export | Clean PDF | Mệt format | Cao | **Cao** | Thấp | **Cao** | Weekly | PDF→sheet sạch |
| 4 Freelance | Dòng tiền | Khách trả trễ | NH+ví+PP | Multi source | Chaos | Cao | **Cao** | TB | **Cao** | Weekly | All income 1 view |
| 5 Seller | Lãi thực | Thấy bán chạy nhưng không có tiền | Ecom+NH+ví | Đối soát | Rối | TB | **Cao** | TB | **Cao** | Daily–weekly | Map order↔credit |
| 6 Multi-account | Net position | Phí/tài khoản nhiều | Nhiều app | Chuyển khoản double-count | Sai số | Cao | Cao | Cao | TB | Weekly | Transfer detect |
| 7 Family | Minh bạch | Cãi tiền | 2 phones | Shared UX | Privacy couple | Cao | TB | Thấp | TB | Weekly | Shared inbox later |
| 8 Bookkeeper | Nhanh sổ | Deadline | PDF khách | Manual entry | Giờ công | **Rất cao** | **Cao** | Không | **Rất cao** | Daily | Batch accuracy |

### 15+ câu hỏi phỏng vấn (không dẫn dắt)

1. Tuần trước bạn ghi chép thu chi như thế nào (nếu có)?  
2. Lần gần nhất bạn muốn biết mình đã tiêu gì — bạn mở app/tool nào?  
3. Bạn đang dùng bao nhiêu tài khoản ngân hàng và ví?  
4. Dữ liệu giao dịch của bạn hiện nằm ở đâu?  
5. Hãy kể lần gần nhất bạn tải sao kê hoặc export lịch sử.  
6. Bạn làm gì với file đó sau khi tải?  
7. Công đoạn nào tốn thời gian nhất khi tổng hợp chi tiêu?  
8. Bạn từng dùng app quản lý chi tiêu nào? Điều gì khiến bạn dừng?  
9. Khi nào thì “gần đúng” là đủ, khi nào phải “khớp từng đồng”?  
10. Bạn có dùng Excel/Google Sheets không? Sheet đó phục vụ việc gì?  
11. Bạn cảm thấy thế nào nếu một app yêu cầu tải sao kê lên?  
12. Bạn đã từng cấp quyền đọc thông báo cho app nào? Vì sao có/không?  
13. Nếu có công cụ rút giao dịch từ file giúp bạn, bạn kỳ vọng kết quả trông ra sao?  
14. Bạn sẵn sàng trả bao nhiêu / tháng cho việc tiết kiệm X phút mỗi tuần? (hỏi sau khi họ tự ước thời gian)  
15. Ai khác nhìn thấy dữ liệu tài chính của bạn hiện nay?  
16. Bạn phân biệt tiền cá nhân và tiền công việc thế nào?  
17. Hãy mô tả một giao dịch “khó ghi” gần đây (chuyển khoản, hoàn tiền, ship COD…).  
18. Điều gì khiến bạn tin một công cụ tài chính?

---

# Phụ lục C — Taxonomy transaction capture (chấm điểm 1–5)

**Thang:** 1 = thấp/xấu · 5 = cao/tốt.  
**Cost/complexity/risk:** 5 = đắt/khó/rủi ro cao (xấu cho early).  
**Fit low-budget founder:** 5 = rất phù hợp.

| Phương thức | Value | Speed | Acc | Build$ | Run$ | Complex | Priv risk | Legal risk | Scale | Moat | Founder fit | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Manual | 2 | 1 | 5 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 5 | P0 always |
| Quick add | 3 | 4 | 5 | 2 | 1 | 1 | 1 | 1 | 3 | 1 | 5 | P0 |
| NL input | 4 | 5 | 3 | 2 | 1 | 2 | 1 | 1 | 3 | 2 | 5 | P0 |
| Paste clipboard | 5 | 5 | 3 | 2 | 1 | 2 | 2 | 1 | 4 | 3 | 5 | **P0** |
| CSV upload | 5 | 4 | 4 | 2 | 1 | 2 | 2 | 1 | 5 | 3 | 5 | **P0** |
| Excel upload | 5 | 4 | 4 | 2 | 1 | 2 | 2 | 1 | 5 | 3 | 5 | **P0** |
| PDF upload | 5 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 5 | 4 | 4 | P1 |
| OCR receipt | 3 | 3 | 2 | 4 | 3 | 4 | 3 | 2 | 3 | 2 | 2 | P2 |
| OCR screenshot | 4 | 3 | 2 | 4 | 3 | 4 | 3 | 2 | 4 | 3 | 2 | P2 |
| PWA share | 4 | 5 | 3 | 3 | 1 | 3 | 2 | 1 | 4 | 3 | 4 | P1–2 |
| Android share | 4 | 5 | 3 | 3 | 1 | 3 | 2 | 1 | 4 | 3 | 3 | P2 |
| Noti listener | 5 | 5 | 3 | 4 | 2 | 4 | 5 | 4 | 4 | 5 | 2 | P2–3 |
| SMS parse | 4 | 5 | 3 | 4 | 2 | 4 | 5 | 5 | 3 | 4 | 1 | Avoid early |
| Email forward | 4 | 3 | 3 | 3 | 2 | 3 | 4 | 3 | 4 | 3 | 3 | P2 |
| Gmail API | 4 | 4 | 3 | 4 | 2 | 4 | 4 | 3 | 4 | 3 | 2 | P3 |
| Browser ext | 3 | 4 | 3 | 3 | 1 | 3 | 3 | 2 | 3 | 2 | 3 | P2 |
| Webhook | 3 | 5 | 4 | 3 | 2 | 3 | 2 | 2 | 5 | 4 | 3 | P3 API |
| Open Banking | 5 | 5 | 4 | 5 | 3 | 5 | 3 | 4 | 5 | 2 | 1 | P4+ |
| Bank API direct | 4 | 5 | 4 | 5 | 3 | 5 | 3 | 4 | 3 | 2 | 1 | P4+ |
| Wallet export | 4 | 3 | 4 | 2 | 1 | 2 | 2 | 1 | 4 | 3 | 5 | P1 |
| Ecom order hist | 4 | 3 | 3 | 4 | 2 | 4 | 3 | 2 | 4 | 4 | 2 | P2 seller |
| QR receipt | 2 | 3 | 2 | 3 | 2 | 3 | 2 | 1 | 2 | 1 | 2 | Later |
| MT940/CAMT/OFX | 3 | 4 | 5 | 3 | 1 | 3 | 2 | 1 | 4 | 2 | 3 | P2 intl |
| Sheets import | 4 | 3 | 4 | 2 | 1 | 2 | 2 | 1 | 4 | 2 | 5 | P1 |
| 3rd party API/SDK | 5 | 5 | 4 | 5 | 3 | 5 | 3 | 3 | 5 | 5 | 2 | Y2–3 |

**Thứ tự giai đoạn đề xuất:**  
P0 paste/CSV/XLS/quick/NL → P1 PDF text, wallet export, sheets, PWA share → P2 OCR, email, Android share/noti → P3 API → P4 Open Banking.

---

# Phụ lục D — Phản biện

### Vì sao không chỉ Excel?

Excel **không** parse PDF/SMS giúp bạn; không dedupe; không transfer detect; không multi-device ritual tốt. **Nhưng** Excel thắng nếu tool capture kém accuracy — user quay lại copy-paste. Money Flow phải **thắng ở import+review**, có thể **export về Excel**.

### Vì sao Money Lover / NH không copy?

Họ **có thể** copy feature. Rào cản: focus roadmap (ML = consumer budget; NH = sticky own rails only). MF thắng bằng **multi-institution normalization + inbox workflow + tốc độ template VN**. Không có moat vĩnh viễn nếu không data/rules compounding.

### Capture có thành công ty?

**Có thể** nếu: (a) B2C subscription scale SEA **hoặc** (b) B2B API. **Rủi ro feature-only** là thật — mitigation = workflow + memory + destination ledger + API path.

### User có tải sao kê?

**Một phần** power user có; casual có thể không. Nên **paste** song song. **[Giả thuyết — interview].**

### Noti có làm sợ?

**Có** — defer; khi làm phải UX trust xuất sắc.

### Open Banking đến thì sao?

Capture thô rẻ hơn → giá trị chuyển sang **normalization, rules, reconciliation, cross-wallet, audit, API**.

### Parser 70% có useful?

**Có** nếu 70% rows đúng và 30% review nhanh hơn gõ từ đầu; **không** nếu silent wrong post. Review-by-exception bắt buộc.

### Feature hay product?

MVP là **product utility**; company cần mở rộng workflow/B2B. Thừa nhận rủi ro.

### B2C trả tiền?

Khó hơn B2B; ARPU VN thấp; cần volume hoặc upsell Pro. **Neo giá thấp**.

### Chuyển B2B?

**Giữ B2C wedge** để học format; **monetize B2B** khi accuracy+templates đủ. Primary go-to-market early = B2C-like freelancers (prosumer).

### Rủi ro pháp lý giết dự án?

Rò dữ liệu; xử lý DLCN không consent; noti/SMS xâm lấn; cross-border. Compliance-first.

### Mất 2 năm 0 user?

Xây dashboard/AI; không phỏng vấn; không fixtures; không ship capture.

---

# Phụ lục E — Câu hỏi quyết định cuối

1. **Bắt đầu bằng sản phẩm gì?**  
   **Statement-to-Inbox**: paste + CSV/XLS → review → export/ledger.

2. **KH đầu tiên?**  
   Freelancer/seller VN multi-source, đang dùng Excel/Sheets hoặc bỏ app vì nhập tay.

3. **Tính năng đầu?**  
   Paste Anything + generic CSV import + Inbox approve.

4. **Chưa xây?**  
   Open Banking, SMS silent, LLM-paid OCR, family, full accounting, AI advisor.

5. **Lợi thế đầu?**  
   UX capture/review cho format VN + privacy (no bank password) + tận dụng ledger sẵn.

6. **Moat dài hạn?**  
   Parser template coverage + rule/correction memory + (sau) API distribution — **không** bán raw data.

7. **B2C hay B2B?**  
   **Prosumer B2C-first** (freelancer/seller) → **B2B API/kế toán** khi pipeline chín. Không pure enterprise trước.

8. **7 ngày tới?**  
   Phỏng vấn + file mẫu + landing capture + parse 1 CSV end-to-end.

9. **Dấu hiệu tiếp tục?**  
   Người ta gửi sao kê; import lại; nói “tiết kiệm được buổi tối”.

10. **Dấu hiệu dừng/pivot?**  
   Không ai chịu đưa data; không repeat; accuracy không cải thiện sau fixtures; chỉ xin thêm chart.

---

## Phụ lục F — Liên hệ codebase hiện tại

| Hiện có | Hành động |
|---|---|
| Dashboard safe-to-spend | Giữ; **không** là activation |
| Manual add transaction | Giữ Quick Add; bổ sung Paste/Upload |
| Ledger + RLS | Nền approve candidate |
| Budgets/goals | Post-capture value |
| `docs/UX_PRINCIPLES.md` | Cập nhật: Inbox-first bên cạnh “có thể chi hôm nay” |
| `docs/design-system.md` | Áp dụng cho Inbox components |
| Missing | import schema, parser modules, inbox routes |

**Khuyến nghị product copy:**  
Core question mở rộng thành 2 nhịp:

1. **Capture:** “Giao dịch đã vào chưa?”  
2. **Decision:** “Hôm nay có thể chi bao nhiêu?”

---

## Phụ lục G — Nguồn chính (không đầy đủ)

- YNAB Pricing — ynab.com/pricing (2026).  
- YNAB File-Based Import; Pending transactions support docs.  
- Rocket Money vs Monarch comparisons (2026 pricing ~$14.99/mo Monarch; Rocket freemium).  
- Money Lover Google Play / App Store IAP (Premium lifetime ~$19.99 class; Linked Wallet sub).  
- NĐ 13/2023/NĐ-CP — vanban.chinhphu.vn.  
- Luật BVDLCN 2025 (91/2025/QH15) — thuvienphapluat / luatvietnam tổng hợp chế tài từ 01/01/2026.  
- Open Banking Vietnam landscape articles / trackers (2024–2025).  
- Community: Reddit r/ynab threads on duplicates & pending.  
- Repo nội bộ: `/home/thunder/Code/moneyflow` README, migrations, AGENTS.md.

---

*Hết báo cáo v1.0. Tài liệu này là quyết định sản phẩm có thể hành động, không phải tư vấn pháp lý hay cam kết tài chính.*
