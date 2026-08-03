# Runbook cấu hình bảo mật provider cho MoneyFlow

**Issue theo dõi:** #174  
**Đối tượng sử dụng:** chủ dự án thao tác thủ công trên Supabase, Cloudflare và Vercel  
**Ngày đối chiếu tài liệu chính thức:** 2026-08-03  
**Phạm vi:** hướng dẫn và bằng chứng; tài liệu này không thực hiện provider write

Runbook này mô tả thứ tự an toàn để hoàn thành các provider controls mà source code và CI không thể chứng minh. Tất cả giá trị nhận diện production và thông số phòng thủ phải được lưu trong hồ sơ vận hành riêng, không đưa vào repository, issue công khai, chat hoặc ảnh chưa che.

## 1. Ranh giới public và private

### Được phép ghi trong repository

- tên loại provider và chức năng được cấu hình;
- thứ tự activation/rollback;
- tên biến môi trường đã tồn tại trong source;
- trạng thái pass/fail đã được tổng hợp;
- mã HTTP kỳ vọng từ các boundary đã công khai trong source;
- liên kết tới tài liệu chính thức.

### Chỉ được ghi trong private operational record

- production hostname và callback cụ thể;
- Supabase project reference;
- Vercel team/project/deployment identifiers;
- Turnstile widget ID, site key đầy đủ và secret;
- Firewall rule ID, exact threshold, window, counting key và request ID;
- email, IP, user ID, log payload hoặc screenshot chưa che;
- dữ liệu tài chính, file import, ghi chú giao dịch hoặc tài khoản thật.

Dùng các placeholder dưới đây trong checklist public:

```text
${PRODUCTION_ORIGIN}
${PRODUCTION_HOSTNAME}
${AUTH_CALLBACK_URL}
${SUPABASE_PROJECT_REF}
${VERCEL_PROJECT}
${TURNSTILE_WIDGET}
${FIREWALL_SHARE_RULE}
${FIREWALL_AUTH_RULE}
${PRIVATE_RATE_LIMIT_PROFILE}
```

## 2. Nguyên tắc bắt buộc

1. Không gửi secret, access token, API token hoặc ảnh chưa che vào GitHub, chat hay tài liệu public.
2. Export hoặc chụp cấu hình hiện tại trước mỗi provider write.
3. Mỗi lần chỉ thay đổi một nhóm cấu hình; smoke production ngay sau đó.
4. Không bật Supabase CAPTCHA trước khi deployment production đã render widget và sinh token hợp lệ.
5. Không tạo Firewall rule rộng kiểu mọi `POST`, mọi `/api` hoặc mọi traffic.
6. Mọi rule mới phải bắt đầu ở chế độ quan sát/Log với threshold private đủ rộng, rồi mới cân nhắc enforcement.
7. Không dùng tài khoản thật có dữ liệu tài chính để test.
8. Không chạy request loop không giới hạn hoặc payload lớn lặp lại.
9. Nếu login/signup/reset, callback, email delivery, CSP hoặc Share Target regress thì dừng và rollback ngay.
10. Không đóng issue #174 chỉ vì runbook hoặc CI xanh; cần provider evidence đã redacted.

## 3. Chuẩn bị private operational record

Tạo một hồ sơ riêng ngoài repository. Mỗi operation ghi:

```text
Timestamp (+07:00):
Operator:
Provider/project (private):
Configuration before (redacted):
Planned change:
Rollback action:
Production deployment before:
Verification performed:
Result:
Configuration after (redacted):
Related private screenshot/log/request IDs:
```

Trước khi làm, lưu trạng thái hiện tại của:

- Supabase Auth URL Configuration;
- Email provider/confirmation settings;
- Password security;
- Auth Rate Limits;
- Bot and Abuse Protection;
- Cloudflare Turnstile widget settings nếu đã có;
- Vercel Production environment variables;
- Vercel Firewall rules và draft configuration;
- deployment production đang phục vụ canonical domain.

Dừng nếu không xác định được cấu hình cũ hoặc không có quyền rollback.

---

## 4. Phase 1 — Supabase Auth baseline, chưa bật CAPTCHA

### 4.1 URL Configuration

Trong Supabase Dashboard, mở Auth URL Configuration và đối chiếu với cấu hình production đang dùng:

```text
Site URL: ${PRODUCTION_ORIGIN}
Redirect URL: ${AUTH_CALLBACK_URL}
```

Yêu cầu:

- production dùng URL chính xác thay vì wildcard rộng;
- chỉ giữ preview/local callback thực sự được sử dụng;
- application `redirectTo` và allow-list phải khớp;
- domain đã nghỉ phải được loại bỏ sau migration window.

Sau khi lưu, smoke callback bằng tài khoản test. Callback lỗi thì khôi phục cấu hình cũ trước khi tiếp tục.

### 4.2 Password policy

Application MoneyFlow yêu cầu 12–72 ký tự cho đăng ký và đổi mật khẩu. Đặt minimum password length của provider thành **12** để direct Auth calls không đi vòng qua validation ứng dụng.

Không tự ý thêm character-composition rule trong task này nếu chưa có product decision riêng.

Kiểm tra bằng tài khoản test:

- mật khẩu ngắn hơn policy bị từ chối;
- mật khẩu hợp lệ được chấp nhận;
- một tài khoản test hiện hữu vẫn đăng nhập và đổi mật khẩu đúng flow.

Nếu provider policy mới làm tài khoản hiện hữu regress, rollback và ghi bằng chứng; không giả định trước hành vi migration của user cũ.

### 4.3 Email confirmation và delivery

Trước khi bật hoặc siết email confirmation:

1. Xác nhận SMTP/email provider production gửi được.
2. Tạo tài khoản test bằng inbox do owner kiểm soát.
3. Xác nhận link quay về `${AUTH_CALLBACK_URL}`.
4. Kiểm tra expired/used link có lỗi trung tính và không lộ account existence.

Chỉ bật yêu cầu xác nhận email khi delivery và rollback đã được chứng minh.

### 4.4 Leaked-password protection

Bật leaked-password protection nếu plan hiện tại hỗ trợ. Nếu không hỗ trợ, ghi `blocked_by_plan` trong private record và issue summary đã redacted.

Tính năng này là defense in depth, không thay thế minimum password length, CAPTCHA, rate limits và neutral responses.

### 4.5 Review Auth rate limits

Mở Authentication → Rate Limits và export giá trị hiện tại vào private record.

Quy tắc:

- không copy mặc định từ tài liệu vào production một cách máy móc;
- không công khai exact values;
- không hạ token/session traffic thấp đến mức khóa user thật;
- không tăng email/OTP vô hạn;
- dùng CAPTCHA và neutral responses để giảm abuse thay vì chỉ siết một endpoint;
- mọi thay đổi phải có lý do, owner và rollback.

Sau thay đổi, xác nhận 429 chỉ xuất hiện trong probe kiểm soát và flow bình thường vẫn hoạt động.

### 4.6 Smoke sau Phase 1

Dùng production và tài khoản test để kiểm tra:

- password boundary;
- signup và email confirmation nếu bật;
- login đúng/sai;
- refresh session;
- logout;
- forgot-password với email tồn tại và không tồn tại có public response trung tính;
- OAuth/callback không rời canonical production origin.

Chưa chuyển Phase 2 nếu có lỗi.

---

## 5. Phase 2 — Tạo Cloudflare Turnstile widget production

Trong Cloudflare Dashboard, tạo widget riêng cho production Auth.

Thiết lập:

- tên mô tả rõ purpose và environment;
- mode `Managed` trừ khi có quyết định riêng;
- hostname chỉ gồm `${PRODUCTION_HOSTNAME}` và các hostname intentional khác đã được review;
- không nhập scheme, port, path hoặc wildcard;
- không dùng Any Hostname;
- tách widget production khỏi development/test;
- pre-clearance để off trừ khi có kiến trúc Cloudflare-zone riêng được review.

Cloudflare cung cấp:

- **site key:** public, được dùng ở browser;
- **secret key:** private, chỉ dùng cho server/provider validation.

Lưu secret trong password manager. Không dán secret vào Vercel public env, GitHub, issue, screenshot hoặc chat.

Turnstile token có thời hạn ngắn và chỉ dùng một lần. Widget phải có khả năng reset khi token lỗi, hết hạn hoặc đã được sử dụng.

---

## 6. Phase 3 — Deploy widget qua Vercel, Supabase enforcement vẫn OFF

Trong Vercel Production environment, thêm hoặc xác nhận:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key của ${TURNSTILE_WIDGET}>
NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true
```

Không tạo biến public chứa secret. Turnstile secret không thuộc Vercel frontend config.

Sau khi lưu:

1. Redeploy production từ current `main`.
2. Chờ deployment `READY`.
3. Xác nhận canonical domain trỏ vào deployment mới.
4. Giữ Supabase CAPTCHA enforcement **OFF**.

### 6.1 Verify widget production

Trong tab ẩn danh, kiểm tra login, register và forgot-password:

- widget tải được;
- CSP cho phép đúng origin Turnstile cần thiết;
- submit không đi tiếp khi thiếu token;
- token lỗi/hết hạn làm widget reset;
- layout không tràn ở viewport nhỏ;
- Auth vẫn hoạt động trong lúc Supabase enforcement còn off.

### Rollback Phase 3

Nếu widget/CSP làm Auth không dùng được:

1. đặt `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false`;
2. redeploy;
3. xác nhận ba Auth flow trở lại bình thường;
4. giữ site key để điều tra, không công khai secret.

---

## 7. Phase 4 — Bật CAPTCHA enforcement trong Supabase

Chỉ làm khi Phase 3 đã pass.

Trong Supabase Auth → Bot and Abuse Protection:

1. chọn Cloudflare Turnstile;
2. nhập secret từ `${TURNSTILE_WIDGET}`;
3. bật CAPTCHA protection;
4. save một lần;
5. smoke ngay, không rời operation giữa chừng.

Kiểm tra:

- signup mới;
- login;
- forgot-password;
- submit không có challenge;
- token hết hạn hoặc đã dùng;
- widget reset và request tiếp theo thành công;
- email tồn tại/không tồn tại vẫn có response trung tính;
- Auth/Vercel logs không có `captcha_failed`, CSP hoặc 4xx cluster bất thường.

### Rollback Phase 4

1. Tắt Supabase CAPTCHA enforcement trước.
2. Smoke Auth với widget vẫn render.
3. Nếu widget còn gây lỗi, tắt public flag ở Vercel và redeploy.
4. Chỉ rotate secret khi có dấu hiệu lộ hoặc quy trình rotation riêng.

---

## 8. Phase 5 — Vercel Firewall

Vercel Firewall bảo vệ request trước application compute. Nó không thay thế Supabase CAPTCHA/rate limits và không bảo vệ request gọi trực tiếp tới Supabase domain.

### 8.1 Public Share Target

Tạo rule chỉ match:

- method `POST`;
- route/path public Share Target đã xác nhận từ source, gồm `/capture/share` và `/api/share-target` nếu production routing vẫn đúng;
- production environment/canonical host khi UI hỗ trợ scope này.

Threshold, window, algorithm và counting key phải nằm trong `${PRIVATE_RATE_LIMIT_PROFILE}`.

Rollout:

1. tạo draft hoặc rule ở follow-up action `Log`;
2. review diff trước khi Publish/Apply;
3. quan sát traffic bình thường đủ lâu để phát hiện NAT/shared-IP false positive;
4. chỉ sau đó đổi follow-up action sang `429`, `deny` hoặc `challenge` phù hợp;
5. ghi rule ID, exact values, traffic samples và rollback trong private record.

Firewall config có hiệu lực ở edge sau khi publish/apply; không cần application redeploy chỉ để cập nhật rule.

### 8.2 Auth-facing edge control

Supabase Auth CAPTCHA và Auth rate limits là lớp chính. Không challenge mọi `GET /login`, `GET /register` hoặc static asset.

Chỉ thêm Vercel rule nếu traffic view chứng minh request Auth đi qua một route/method ổn định. Nếu Server Actions hoặc proxying không tạo stable match, ghi `not_applicable` và không đoán rule.

### 8.3 Attack Mode

Attack Mode chỉ dùng trong incident đang diễn ra và phải có owner, timestamp, stop condition và rollback. Không bật thường trực.

---

## 9. Phase 6 — Production probes có kiểm soát

Chỉ dùng dữ liệu synthetic. Exact request count, timing và request IDs để trong private record.

### 9.1 Unsupported content type

Gửi một request synthetic với content type không được hỗ trợ tới Share Target API.

Kỳ vọng trước khi rate limit bị vượt:

```text
HTTP 415
```

### 9.2 Oversized body

Gửi **một** payload synthetic vừa vượt application limit đã được xác nhận từ source.

Kỳ vọng:

```text
HTTP 413
```

Không lặp payload lớn.

### 9.3 Rate-limit enforcement

Sau khi rule đã chuyển khỏi Log, chạy một probe bounded theo `${PRIVATE_RATE_LIMIT_PROFILE}`.

Kỳ vọng:

- request ban đầu vẫn tới application boundary;
- request vượt ngưỡng nhận `429` hoặc action đã review;
- Firewall traffic view ghi rule match;
- sau window, request bình thường hoạt động lại.

Không commit script chứa exact production thresholds.

### 9.4 Android Share Target

Trên thiết bị test:

1. share một đoạn text synthetic ngắn;
2. share một file synthetic hợp lệ dưới giới hạn;
3. xác nhận Inbox nhận dữ liệu;
4. xác nhận thao tác bình thường không bị Firewall chặn;
5. không dùng ảnh sao kê hoặc thông tin tài chính thật làm evidence public.

---

## 10. Final Auth verification

Dùng tài khoản test chuyên dụng:

- [ ] password dưới minimum bị từ chối;
- [ ] password hợp lệ được chấp nhận;
- [ ] email confirmation/callback đúng production;
- [ ] login đúng hoạt động sau Turnstile;
- [ ] login sai trả thông báo trung tính;
- [ ] refresh và logout hoạt động;
- [ ] forgot-password hoạt động sau Turnstile;
- [ ] email tồn tại/không tồn tại có cùng public response;
- [ ] token hết hạn/đã dùng làm widget reset;
- [ ] không có Turnstile secret trong browser bundle/public env;
- [ ] không có runtime error cluster mới;
- [ ] private record chứa provider IDs, rule values và rollback evidence.

## 11. Mẫu public completion summary cho issue #174

Không paste private record vào issue. Chỉ đăng bản tổng hợp:

```markdown
## Provider controls verification — YYYY-MM-DD HH:mm +07:00

- Supabase Auth baseline reviewed: pass / blocked with reason
- Password policy aligned with application: pass
- Email confirmation and callback smoke: pass / intentionally deferred
- Leaked-password protection: enabled / blocked_by_plan
- Turnstile production widget restricted and verified: pass
- Site key/secret separation verified: pass
- Supabase CAPTCHA enforcement and rollback smoke: pass
- Auth rate limits reviewed with values retained privately: pass
- Share Target edge control published and observed: pass
- Auth edge rule: verified / not_applicable because no stable match
- 413 / 415 / enforcement response: pass
- Android Share Target normal flow: pass
- New runtime error cluster: none observed
- Private identifiers, thresholds, request IDs and screenshots retained outside repository: confirmed
```

## 12. Definition of done cho issue #174

Chỉ đóng issue khi:

1. Supabase Auth settings đã có provider evidence.
2. Turnstile widget production đã được giới hạn hostname và verified.
3. Site key ở browser config; secret chỉ ở provider validation.
4. CAPTCHA enforcement đã bật và Auth smoke pass.
5. Rate limits đã review bằng private values.
6. Share Target edge rule đã publish và legitimate flow không regress.
7. 413, 415 và enforcement response đã được chứng minh.
8. Android Share Target bình thường hoạt động.
9. Không có runtime error cluster mới.
10. Public summary không lộ identifiers, thresholds hoặc user data.

## 13. Nguồn chính thức

- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://developers.cloudflare.com/turnstile/get-started/
- https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/
- https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
- https://vercel.com/docs/vercel-firewall
- https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
