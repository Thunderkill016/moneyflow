# Runbook cấu hình bảo mật provider cho MoneyFlow

**Issue:** #174  
**Dành cho:** chủ dự án thao tác thủ công trên Supabase, Cloudflare và Vercel  
**Ngày kiểm tra tài liệu:** 2026-08-01  
**Production:** `https://mfvn.vercel.app`  
**Supabase project:** `fwpldsdkpzhswpuctbke`  
**Vercel project:** `moneyflow` / `prj_eAusnkm1X1HzAt4wMFbuMnRXela7`

Runbook này hướng dẫn từng bước để hoàn thành các provider controls mà source code và CI không thể tự chứng minh. Làm đúng thứ tự. Không gộp nhiều thay đổi provider vào một lần bấm Save/Publish.

## Nguyên tắc bắt buộc

1. Không gửi secret, access token, API token hoặc ảnh chưa che secret vào chat, issue hay repository.
2. Trước mỗi thay đổi, chụp hoặc xuất cấu hình hiện tại để có thể rollback.
3. Mỗi lần chỉ thay đổi một nhóm cấu hình, sau đó kiểm thử production ngay.
4. Không bật Supabase CAPTCHA trước khi widget Turnstile đã hiển thị và sinh token trên production.
5. Không tạo firewall rule rộng kiểu chặn mọi `POST`, mọi `/api` hoặc mọi traffic chưa xác định.
6. Không dùng tài khoản thật có dữ liệu tài chính để test. Dùng tài khoản kiểm thử riêng.
7. Gặp lỗi đăng nhập hàng loạt, CSP, email không đến hoặc deployment không `READY` thì dừng và rollback theo phần tương ứng.

## Chuẩn bị bằng chứng và rollback

Tạo một thư mục riêng trên máy, ví dụ `moneyflow-issue-174-evidence/`, nhưng không commit secret vào Git.

Trước khi thay đổi, lưu ảnh đã che dữ liệu nhạy cảm của:

- Supabase → Authentication → URL Configuration;
- Supabase → Authentication → Providers → Email;
- Supabase → Authentication → Rate Limits;
- Supabase → Authentication → Bot and Abuse Protection;
- Vercel → Project → Settings → Environment Variables;
- Vercel → Project → Firewall → Configure;
- Cloudflare → Turnstile, nếu đã có widget.

Ghi lại:

- thời gian theo múi giờ Việt Nam;
- deployment production hiện tại;
- giá trị cấu hình cũ, nhưng che secret;
- ai thực hiện;
- thay đổi dự kiến;
- thao tác rollback tương ứng.

**Dừng ngay** nếu production domain không còn là `mfvn.vercel.app`, không xác định được cấu hình hiện tại, hoặc không có quyền khôi phục giá trị cũ.

---

## Phase 1 — Chuẩn hóa Supabase Auth cơ bản

Phase này chưa bật CAPTCHA.

### 1.1 Kiểm tra URL Configuration

Mở Supabase Dashboard → project `fwpldsdkpzhswpuctbke` → **Authentication → URL Configuration**.

Đặt hoặc xác nhận:

```text
Site URL
https://mfvn.vercel.app
```

Redirect URLs phải có ít nhất:

```text
https://mfvn.vercel.app/auth/callback
```

Quy tắc:

- production không dùng wildcard rộng chỉ để “cho chắc”;
- chỉ giữ preview/local callback nếu môi trường đó thực sự đang được dùng;
- xóa domain đã nghỉ sau khi kết thúc migration;
- không thêm path khác nếu source code không sử dụng.

Sau khi Save, mở tab ẩn danh và kiểm tra Google OAuth hoặc flow callback đang dùng. Nếu callback lỗi, khôi phục URL cũ trước khi làm bước tiếp theo.

### 1.2 Đặt minimum password length bằng 12

Mở **Authentication → Providers → Email** hoặc mục Password Security tương đương trong Dashboard.

Đặt:

```text
Minimum password length: 12
```

Không thay đổi thêm yêu cầu ký tự trong issue này trừ khi đã có quyết định sản phẩm riêng.

Kỳ vọng:

- đăng ký mới và đổi mật khẩu phải đạt ít nhất 12 ký tự;
- người dùng cũ không bị khóa đăng nhập chỉ vì mật khẩu hiện tại ngắn hơn;
- UI MoneyFlow đã dùng biên 12–72 ký tự, nên provider phải khớp.

Kiểm tra ngay bằng tài khoản test:

- mật khẩu 11 ký tự bị từ chối;
- mật khẩu 12+ ký tự hợp lệ đi qua bước kiểm tra mật khẩu.

### 1.3 Xác nhận email confirmation

Mở **Authentication → Providers → Email**.

Trước khi bật bắt buộc xác nhận email:

1. Kiểm tra email provider/SMTP hiện tại có gửi được mail production.
2. Tạo tài khoản test bằng inbox mày kiểm soát.
3. Xác nhận link trong email quay về đúng `https://mfvn.vercel.app/auth/callback` hoặc flow hiện hành.

Mục tiêu trước public beta:

```text
Confirm email: ON
```

Không bật nếu email không đến, link sai domain hoặc không có cách rollback. Sửa email delivery trước.

### 1.4 Review Auth rate limits

Mở **Authentication → Rate Limits**.

Chụp và ghi lại toàn bộ giá trị hiện tại. So sánh với hướng dẫn chính thức hiện hành của Supabase. Các mốc mặc định thường gặp trong tài liệu gồm:

- OTP: khoảng 360 yêu cầu/giờ;
- thời gian chờ gửi lại OTP, signup confirmation và password reset: khoảng 60 giây;
- verify: khoảng 360 yêu cầu/giờ/IP, có burst;
- token refresh: khoảng 1800 yêu cầu/giờ/IP, có burst.

Các con số trên là mốc tham chiếu, không phải lệnh phải ghi đè. Với MoneyFlow beta:

- giữ mặc định nếu chưa có dữ liệu chứng minh cần thay đổi;
- không hạ token refresh quá thấp;
- không tăng email/OTP vô hạn;
- ghi lại mọi giá trị cuối cùng trong evidence, không ghi secret;
- để CAPTCHA và neutral responses xử lý abuse thay vì tạo ngưỡng khiến người thật bị khóa.

### 1.5 Leaked-password protection

Trong Password Security, kiểm tra leaked-password protection.

- Bật nếu Supabase plan hiện tại hỗ trợ.
- Nếu plan không hỗ trợ, ghi rõ `blocked_by_plan` trong issue #174; không giả vờ hoàn thành.
- Tính năng này là defense in depth, không thay thế minimum 12, CAPTCHA và rate limits.

### 1.6 Smoke sau Phase 1

Dùng production và tài khoản test để kiểm tra:

- đăng ký 11 ký tự bị chặn;
- đăng ký 12+ ký tự hoạt động;
- email confirmation hoạt động nếu đã bật;
- login đúng và login sai;
- refresh session bằng cách reload hoặc mở lại app;
- logout;
- forgot-password với email tồn tại và không tồn tại đều trả public response trung tính;
- callback không rời khỏi domain production.

Chưa chuyển Phase 2 nếu có lỗi.

---

## Phase 2 — Tạo Cloudflare Turnstile production widget

Mở Cloudflare Dashboard → **Turnstile → Add widget**.

Điền:

```text
Widget name: MoneyFlow production auth
Hostname: mfvn.vercel.app
Widget mode: Managed
Pre-clearance: Off
```

Lưu ý hostname:

- chỉ nhập `mfvn.vercel.app`;
- không nhập `https://`;
- không nhập port hoặc path;
- không dùng wildcard trong trường hostname;
- chỉ thêm preview hostname khi preview Auth thực sự được sử dụng và kiểm thử riêng.

Sau khi Create, Cloudflare cung cấp:

- **Site key:** public, dùng trong Vercel;
- **Secret key:** private, chỉ dùng trong Supabase Auth.

Lưu secret vào password manager. Không dán secret vào Vercel public environment, GitHub, issue, screenshot hoặc chat.

Cloudflare token có thời hạn ngắn và chỉ dùng một lần. Widget phải reset sau token lỗi, hết hạn hoặc sau một request không redirect.

---

## Phase 3 — Bật widget ở Vercel, nhưng Supabase enforcement vẫn OFF

Mở Vercel Dashboard → project `moneyflow` → **Settings → Environment Variables**.

Thêm hoặc sửa trong scope **Production**:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Cloudflare Site key>
NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true
```

Không tạo biến kiểu:

```text
NEXT_PUBLIC_TURNSTILE_SECRET
TURNSTILE_SECRET trong Vercel frontend
```

Secret không thuộc Vercel public config.

Environment variable chỉ ảnh hưởng deployment mới. Sau khi lưu:

1. Redeploy production từ commit `main` hiện tại.
2. Chờ deployment chuyển sang `READY`.
3. Xác nhận alias `mfvn.vercel.app` trỏ vào deployment mới.
4. Supabase CAPTCHA vẫn phải OFF ở thời điểm này.

### 3.1 Kiểm tra widget production

Mở tab ẩn danh:

- `https://mfvn.vercel.app/login`
- `https://mfvn.vercel.app/register`
- `https://mfvn.vercel.app/forgot-password`

Xác nhận:

- widget tải được;
- không có CSP error liên quan `challenges.cloudflare.com`;
- submit bị khóa cho đến khi có token;
- token lỗi/hết hạn làm widget reset;
- layout không tràn ngang trên điện thoại nhỏ;
- login, signup và reset vẫn hoạt động khi Supabase enforcement còn OFF.

Có thể kiểm tra response header:

```bash
curl -I https://mfvn.vercel.app/login
```

Khi feature bật, CSP phải cho phép đúng origin Turnstile cần thiết, không mở rộng tùy tiện sang domain khác.

### Rollback Phase 3

Nếu widget hoặc CSP làm Auth không dùng được:

1. Đặt `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` trong Vercel Production.
2. Redeploy.
3. Xác nhận ba trang Auth trở lại bình thường.
4. Giữ site key để điều tra; không công khai secret.

---

## Phase 4 — Bật CAPTCHA enforcement trong Supabase

Chỉ làm khi Phase 3 đã pass.

Mở Supabase → **Authentication → Bot and Abuse Protection**.

Thao tác:

1. Bật **Enable CAPTCHA protection**.
2. Chọn provider **Cloudflare Turnstile**.
3. Dán **Secret key** lấy từ Cloudflare.
4. Save.

Supabase chỉ cần CAPTCHA secret để xác thực token; browser dùng site key từ Vercel.

### 4.1 Smoke ngay sau khi Save

Không rời máy sau khi bật. Kiểm tra ngay:

1. Đăng ký bằng tài khoản test mới.
2. Login bằng tài khoản test.
3. Forgot-password.
4. Thử submit khi chưa hoàn thành challenge.
5. Đợi challenge hết hạn hoặc tạo một lần thất bại, rồi xác nhận widget reset và lần tiếp theo hoạt động.
6. Thử email tồn tại và không tồn tại; public response không được tiết lộ trạng thái tài khoản.
7. Kiểm tra Supabase Auth logs và Vercel logs cho `captcha_failed`, 4xx tăng bất thường hoặc CSP/client error.

### Rollback Phase 4

Nếu user thật không thể login/signup/reset:

1. **Tắt CAPTCHA enforcement trong Supabase trước.**
2. Kiểm tra Auth lại với widget vẫn hiện.
3. Nếu widget vẫn gây lỗi, đặt `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` ở Vercel và redeploy.
4. Không xóa hoặc rotate secret trong lúc đang khôi phục, trừ khi có dấu hiệu secret bị lộ.

---

## Phase 5 — Vercel Firewall

Vercel Firewall bảo vệ trước khi request đi vào application compute. Nó không thay thế Supabase CAPTCHA/rate limits và không chặn được request gọi thẳng Supabase domain.

Mở Vercel → project `moneyflow` → **Firewall → Configure → New Rule**.

### 5.1 Rule cho Web Share Target

Tạo một rule có hai nhóm OR, hoặc hai rule riêng nếu UI không hỗ trợ OR rõ ràng.

Điều kiện:

```text
Method equals POST
Path equals /capture/share
OR
Method equals POST
Path equals /api/share-target
```

Cấu hình khởi đầu đề xuất:

```text
Action: Rate Limit
Algorithm: Fixed Window
Window: 60 seconds
Limit: 30 requests
Key: IP
Follow-up action giai đoạn đầu: Log
```

Quy trình an toàn:

1. Save rule ở chế độ Log.
2. Review Changes → Publish.
3. Quan sát traffic thật hoặc synthetic traffic ít nhất 15–30 phút.
4. Xác nhận không có user bình thường tiến gần ngưỡng.
5. Edit rule, đổi follow-up action thành `429`.
6. Review Changes → Publish lần nữa.

`30/60s/IP` là starting point cho beta, không phải hằng số vĩnh viễn. Nếu traffic cho thấy carrier NAT hoặc workflow hợp lệ chạm ngưỡng, tăng có kiểm soát và ghi lý do.

Sau khi publish, ghi vào evidence:

- rule name;
- rule ID;
- path/method conditions;
- window, request limit và key;
- action;
- thời gian publish;
- ảnh traffic view;
- rollback: disable/delete rule hoặc quay lại bản config trước.

### 5.2 Auth abuse control ở Vercel

Supabase Auth CAPTCHA và Auth rate limits là lớp chính. Không challenge mọi `GET /login` hoặc `GET /register`.

Chỉ tạo edge rule nếu Firewall logs cho thấy Next.js Auth POST có path ổn định. Starting point:

```text
Method equals POST
Path equals /login
OR /register
OR /forgot-password

Fixed Window: 60 seconds
Limit: 20 requests
Key: IP
Action ban đầu: Log
```

Sau khi quan sát không có false positive mới đổi sang `429` hoặc `Challenge`.

Nếu Next.js Server Action không hiện bằng các path ổn định trong traffic view, không đoán rule. Ghi rằng Auth edge rule không phù hợp và dựa vào Supabase CAPTCHA/rate limits.

### 5.3 Không dùng Attack Mode thường trực

Attack Mode chỉ dùng trong sự cố đang diễn ra. Không bật lâu dài vì làm tăng friction và có thể phá Web Share Target hoặc Auth flow.

---

## Phase 6 — Kiểm thử Firewall và application boundaries

Chỉ dùng dữ liệu synthetic, không dùng file tài chính thật.

### 6.1 Unsupported content type phải trả 415

```bash
curl -i \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{}' \
  https://mfvn.vercel.app/api/share-target
```

Kỳ vọng trước khi rate limit bị vượt:

```text
HTTP 415
```

### 6.2 Payload quá 12 MiB phải trả 413

Linux/macOS:

```bash
head -c 13631488 /dev/zero | \
curl -i \
  -X POST \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @- \
  https://mfvn.vercel.app/api/share-target
```

Kỳ vọng:

```text
HTTP 413
```

Chạy một lần là đủ. Không lặp payload lớn.

### 6.3 Rate limit phải trả 429 sau ngưỡng

Chỉ chạy sau khi rule đã chuyển từ Log sang `429`:

```bash
for i in $(seq 1 35); do
  code=$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data '{}' \
    https://mfvn.vercel.app/api/share-target)
  printf '%02d %s\n' "$i" "$code"
done
```

Kỳ vọng:

- các request đầu có thể trả 415 từ app;
- sau khi vượt ngưỡng, Firewall trả 429;
- Vercel traffic view hiển thị rule match;
- sau hết cửa sổ 60 giây, request bình thường được phép trở lại.

Không chạy loop liên tục.

### 6.4 Normal Android Share Target

Trên thiết bị Android hoặc flow thực tế:

1. Share một đoạn text ngắn vào MoneyFlow.
2. Share một file text hợp lệ dưới giới hạn.
3. Xác nhận Inbox nhận dữ liệu.
4. Xác nhận không bị 429 trong thao tác bình thường.
5. Không dùng ảnh sao kê hoặc thông tin tài chính thật cho evidence công khai.

---

## Phase 7 — Production Auth verification cuối cùng

Dùng một tài khoản test chuyên dụng và một inbox mày kiểm soát.

Checklist:

- [ ] 11-character password bị từ chối.
- [ ] 12+ character password được chấp nhận.
- [ ] Email confirmation tới inbox và callback đúng production.
- [ ] Login đúng hoạt động sau Turnstile.
- [ ] Login sai trả thông báo trung tính.
- [ ] Refresh session hoạt động.
- [ ] Logout hoạt động.
- [ ] Forgot-password hoạt động sau Turnstile.
- [ ] Email tồn tại và không tồn tại có cùng public response.
- [ ] Challenge hết hạn/thất bại reset đúng.
- [ ] Không có Turnstile secret trong browser bundle hoặc Vercel public env.
- [ ] Không có runtime error cluster mới.
- [ ] Firewall rule IDs và thresholds đã được ghi lại.

## Bằng chứng được phép đưa vào repository/issue

Được ghi:

- tên widget;
- widget ID hoặc site key đã che phần lớn;
- domain được allow;
- deployment ID;
- firewall rule ID, conditions và threshold;
- trạng thái pass/fail;
- timestamp;
- ảnh dashboard đã che secret, email, IP, token và user ID.

Không được ghi:

- Turnstile secret;
- Supabase access token, secret key hoặc service-role key;
- Vercel token;
- email/IP/user ID thật;
- nội dung giao dịch, ghi chú, file import hoặc sao kê.

## Mẫu completion evidence cho issue #174

```markdown
## Provider controls completed — YYYY-MM-DD HH:mm +07:00

### Supabase Auth
- Minimum password length: 12
- Site URL: https://mfvn.vercel.app
- Redirect URL verified: https://mfvn.vercel.app/auth/callback
- Email confirmation: enabled and tested / intentionally deferred with reason
- Rate limits reviewed: yes; values recorded in private evidence
- CAPTCHA provider: Cloudflare Turnstile
- Leaked-password protection: enabled / blocked_by_plan

### Cloudflare Turnstile
- Widget name: MoneyFlow production auth
- Allowed hostname: mfvn.vercel.app
- Mode: Managed
- Secret not recorded in repository: confirmed

### Vercel
- Production deployment: dpl_...
- CAPTCHA public env configured: yes
- Firewall share rule ID: rule_...
- Share threshold: 30 requests / 60 seconds / IP → 429
- Auth edge rule: rule_... / not created because request path was not stable

### Verification
- Register/login/refresh/logout/reset: pass
- Neutral account-existence responses: pass
- Android Share Target normal flow: pass
- Unsupported request: 415
- Oversized request: 413
- Rate-limit probe: 429 after threshold
- New runtime error clusters: none

### Rollback proof
- Supabase CAPTCHA disable path recorded
- Vercel CAPTCHA flag rollback recorded
- Firewall disable/config rollback recorded
```

## Definition of done cho issue #174

Chỉ đóng issue khi:

1. Supabase Auth settings đã được xác minh bằng provider evidence.
2. Turnstile widget production đã được tạo và giới hạn hostname.
3. Site key ở Vercel, secret chỉ ở Supabase.
4. CAPTCHA enforcement đã bật và production Auth smoke pass.
5. Rate limits đã review.
6. Firewall share rule đã publish và verified.
7. Android Share Target bình thường vẫn hoạt động.
8. 413, 415 và 429 đã được chứng minh.
9. Không có runtime error mới.
10. Evidence đã được redacted và ghi vào issue #174.

## Nguồn chính thức

- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://developers.cloudflare.com/turnstile/get-started/
- https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/
- https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
- https://vercel.com/docs/vercel-firewall
- https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
