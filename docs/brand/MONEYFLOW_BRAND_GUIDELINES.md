# MoneyFlow Brand Guidelines

**Version:** 1.1  
**Status:** reusable brand foundation; canonical identity is logo v2 in `docs/design/MONEYFLOW_LOGO.md`
**Owner:** MoneyFlow  
**Last updated:** 2026-07-28

Tài liệu này định nghĩa nền tảng thương hiệu, ngôn ngữ, hệ thống hình ảnh và quy tắc ứng dụng của MoneyFlow. It does not select the next Brand/Product Experience layout or palette beyond explicit owner decisions.

## Authority

| Area | Source |
|---|---|
| Product and financial truth | [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md) |
| Brand foundation | Tài liệu này |
| Canonical logo | [`../design/MONEYFLOW_LOGO.md`](../design/MONEYFLOW_LOGO.md) |
| UI visual contract | [`../design/CALM_LEDGER_V2.md`](../design/CALM_LEDGER_V2.md) |
| Tokens and components | [`../design-system.md`](../design-system.md) |
| UX law | [`../UX_PRINCIPLES.md`](../UX_PRINCIPLES.md) |
| AI UI workflow | [`../AI_UIUX_WORKFLOW.md`](../AI_UIUX_WORKFLOW.md) |

Khi có xung đột, product truth và nguồn chuyên biệt mới hơn được ưu tiên.

## Approved identity summary

MoneyFlow dùng logo M-based v1 đã được owner phê duyệt ngày 2026-07-28.

Nguồn canonical:

- vector/app icon: `src/app/icon.svg`;
- repeated in-product geometry: `src/app/ai-uiux-guardrails.css`, nằm trong compatibility boundary hiện có;
- usage contract: `docs/design/MONEYFLOW_LOGO.md`;
- PWA metadata: `src/app/manifest.ts`.

Không dùng song song các concept M/F/O, flow ring, chart, coin, wallet hoặc gradient đã bị loại.

## 1. Brand foundation

### MoneyFlow là gì?

MoneyFlow là sổ thu chi cá nhân **manual-first** dành cho người Việt. Manual-first là lựa chọn chiến lược, không phải giới hạn kỹ thuật tạm thời: người dùng tự ghi mỗi giao dịch, nên luôn biết chính xác điều gì vừa được ghi và vì sao — không phải đoán xem một thuật toán đồng bộ ngân hàng vừa phân loại đúng hay sai. Sản phẩm giúp người dùng:

1. ghi thu, chi hoặc chuyển tiền nhanh;
2. biết tiền đang nằm ở tài khoản nào;
3. hiểu tiền đã đi đâu trong kỳ;
4. sửa sai mà không làm hỏng sổ;
5. giữ và xuất dữ liệu đáng tin.

MoneyFlow không phải:

- ngân hàng hoặc công cụ kết nối ngân hàng;
- ứng dụng đầu tư, chứng khoán hay crypto;
- cố vấn tài chính tự động;
- công cụ hứa hẹn làm giàu;
- phần mềm kế toán doanh nghiệp;
- trò chơi hoặc hệ thống gamification tài chính.

### Vì sao manual-first, không phải bank-sync

Phần lớn ứng dụng quản lý chi tiêu tại Việt Nam (Money Lover, MISA và tương tự) cạnh tranh bằng số lượng ngân hàng liên kết được và mức độ tự động hoá phân loại giao dịch. MoneyFlow cố tình đi hướng ngược lại: không xin quyền truy cập ngân hàng, không tự động phân loại bằng thuật toán mờ, không đoán hộ người dùng nên chi bao nhiêu. Cái giá phải trả là người dùng gõ tay nhiều hơn; cái nhận lại là không có khoảng cách nào giữa "máy nghĩ gì" và "người dùng biết gì" — mọi dòng trong sổ đều do chính người dùng xác nhận là đúng.

### Primary audience

Một cá nhân Việt Nam muốn quản lý tiền của chính mình mà không phải học thuật ngữ kế toán, giao mật khẩu ngân hàng cho bên thứ ba hoặc học một phương pháp ngân sách phức tạp trước khi ghi giao dịch đầu tiên. Họ đã từng mở một app tài chính, thấy quá nhiều màn hình xin quyền và biểu đồ tự động, rồi bỏ ngang trước khi ghi được giao dịch thật đầu tiên.

### Purpose

Giúp người dùng nhìn rõ tiền của mình mà không cần đoán.

### Mission

Biến những dòng tiền rời rạc hằng ngày thành một sổ cá nhân rõ ràng, chính xác và dễ kiểm tra.

### Vision

Trở thành cuốn sổ tài chính cá nhân người Việt có thể tin dùng mỗi ngày.

### Brand promise

> Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn.

### Brand essence

> Rõ từng dòng tiền.

### Positioning

> MoneyFlow là sổ thu chi cá nhân dành cho người Việt muốn ghi nhận và hiểu tiền của mình một cách rõ ràng, không cần học một hệ thống tài chính phức tạp và không bị một cố vấn tự động phán xét.

### Value proposition

- **Ghi đúng:** thu, chi và chuyển được giữ đúng bản chất.
- **Nhìn rõ:** số dư và giao dịch được tổ chức để dễ quét và đối chiếu.
- **Giữ quyền kiểm soát:** người dùng có thể sửa, phục hồi và xuất dữ liệu của mình.

## 2. Brand story

Tiền không tự biến mất. Người dùng chỉ thường không nhớ nó đã đi đâu — cuối tháng nhìn số dư thấp hơn dự kiến, mở app ngân hàng ra thấy một danh sách giao dịch có tên viết tắt khó hiểu, và không thể trả lời nổi câu hỏi đơn giản nhất: "tháng này tiền của mình đã đi đâu?"

Mỗi ngày, tiền đi qua tiền mặt, tài khoản ngân hàng, ví điện tử, hóa đơn, thu nhập, khoản chuyển nội bộ và những kế hoạch do chính người dùng tạo. Khi các dòng tiền không được ghi nhận rõ ràng, người dùng mất cảm giác kiểm soát và phải đoán dựa trên ký ức.

MoneyFlow bắt đầu từ một sự thật đơn giản: trước khi lập kế hoạch hoặc tối ưu, người dùng cần một cuốn sổ đáng tin để ghi lại điều đã thực sự xảy ra — không phải một bảng điều khiển đẹp che giấu việc không ai thực sự biết dữ liệu đến từ đâu.

MoneyFlow không phán xét, không hứa hẹn làm giàu và không biến tổng tài sản thành số tiền nên tiêu. Sản phẩm ghi lại trung thực, sắp xếp rõ ràng và để quyết định cuối cùng thuộc về người dùng.

## 3. Brand personality

MoneyFlow là:

- **Bình tĩnh:** không dùng sợ hãi hoặc tội lỗi để thúc đẩy tương tác.
- **Rõ ràng:** thông tin quan trọng được nhìn thấy trước.
- **Trung thực:** không che số âm hoặc bịa dữ liệu còn thiếu.
- **Đáng tin:** dữ liệu có thể kiểm tra, sửa, phục hồi và xuất ra.
- **Gần gũi:** tiếng Việt trước, tránh thuật ngữ không cần thiết.
- **Có tổ chức:** tài khoản, giao dịch và trạng thái có quan hệ rõ.

MoneyFlow không nên nghe hoặc trông như ngân hàng quyền lực, startup crypto hiếu thắng, ứng dụng làm giàu nhanh, trò chơi tài chính, bảng tính kế toán lạnh lẽo hoặc trợ lý AI biết mọi thứ.

Cảm xúc đích mà MoneyFlow muốn để lại sau mỗi lần mở app là **"bình tĩnh tự tin"** — cảm giác một người kế toán giỏi của gia đình mang lại: không phấn khích giả tạo khi số dư tăng, không dọa dẫm khi số dư giảm, chỉ đơn giản là biết rõ và yên tâm vì biết rõ.

## 4. Messaging

### Primary message

> Biết chính xác tiền đã đi đâu.

### Supporting message

> Ghi thu, chi và chuyển tiền trong một sổ rõ ràng, thuộc về bạn.

### Primary tagline

> Ghi rõ. Hiểu tiền.

Tagline chỉ dùng trong marketing khi có đủ không gian. Không đặt trong app icon, favicon hoặc logo lockup nhỏ.

### Approved alternatives

- Rõ từng dòng tiền.
- Ghi đúng để nhìn rõ.
- Mọi dòng tiền, một nơi rõ ràng.
- Sổ thu chi bạn có thể tin.
- Tiền của bạn. Dữ liệu của bạn.

### Claim boundaries

Được nói:

- ghi và quản lý thu chi;
- theo dõi số dư trên tài khoản do người dùng khai báo;
- hiểu tiền đã đi đâu;
- sửa và xuất dữ liệu;
- chuyển tiền nội bộ không tính thành thu hoặc chi.

Không được nói nếu chưa có bằng chứng và specification mới:

- kết nối tự động mọi ngân hàng;
- biết người dùng nên tiêu bao nhiêu hôm nay;
- tối ưu tài chính bằng AI;
- giúp người dùng giàu hơn;
- bảo đảm tiết kiệm hoặc lợi nhuận;
- thay thế chuyên gia tài chính hoặc kế toán.

## 5. Voice and tone

MoneyFlow luôn bình tĩnh, trực tiếp, tự nhiên, tôn trọng, không phán xét và minh bạch về trạng thái cùng giới hạn.

| Tình huống | Tone |
|---|---|
| Onboarding | Thân thiện, ngắn, hướng đến hành động đầu tiên. |
| Ghi giao dịch | Cô đọng, rõ loại giao dịch và số tiền. |
| Thành công | Xác nhận vừa đủ; không ăn mừng quá mức. |
| Lỗi | Bình tĩnh, nêu điều xảy ra và bước sửa. |
| Dữ liệu thiếu | Trung thực về điều chưa biết. |
| Hành động nguy hiểm | Rõ hậu quả và đường phục hồi. |
| Báo cáo | Mô tả dữ liệu, không suy diễn động cơ. |

Tốt:

> Đã ghi khoản chi 45.000 ₫.

Tránh:

> Tuyệt vời! Bạn đang tiến gần hơn đến tự do tài chính!

Tốt:

> Chưa đủ dữ liệu để tính kế hoạch chi tiêu.

Tránh:

> Hôm nay bạn nên tiêu dưới 350.000 ₫.

Tốt:

> Chuyển từ MB Bank sang Tiền mặt

Tránh:

> Khởi tạo bút toán điều chuyển nội bộ

## 6. Visual identity principles

MoneyFlow áp dụng tư duy thiết kế có mục đích, không sao chép phong cách Apple.

- **Purpose before decoration:** mỗi yếu tố phải giúp nhận diện, làm rõ thông tin, chỉ ra hành động hoặc tạo cấu trúc.
- **Calm, not empty:** tối giản không được làm thiếu dữ liệu cần kiểm tra.
- **One recognizable gesture:** một tài sản nhận diện chỉ có một ý tưởng cốt lõi.
- **Neutral first:** neutral surfaces chiếm phần lớn trải nghiệm.
- **Financial semantics are not branding:** màu thu, chi và chuyển không phải màu logo.
- **Craft at every size:** kiểm tra ở kích thước sử dụng thật, không chỉ poster.

## 7. Canonical logo v1

Hệ thống logo gồm:

1. **Symbol:** M trắng trong container xanh bo góc.
2. **Wordmark:** chữ `MoneyFlow` dễ đọc.
3. **Primary lockup:** symbol + wordmark theo chiều ngang.
4. **Reversed lockup:** dùng trên bề mặt tối được phê duyệt.
5. **Monochrome variants:** dùng khi hạn chế sản xuất yêu cầu.

Không đặt slogan hoặc full wordmark trong app icon.

Kích thước tối thiểu:

- 16px: favicon-only, phải kiểm tra raster;
- 24px: compact symbol;
- 32–36px: navigation mark;
- 64px trở lên: marketing/PWA contexts;
- clear space tối thiểu: một phần tư chiều rộng symbol.

Không:

- đổi hình học giữa các màn hình;
- thêm chart, mũi tên, đồng tiền hoặc ký hiệu tiền tệ;
- thêm gradient, glass, glow, bevel hay 3D;
- đổi brand green thành màu semantic income;
- dùng nhiều concept logo cùng lúc;
- lặp logo như trang trí trong signed-in product.

## 8. Color system

### Light/default

| Role | Value |
|---|---|
| Brand green | `#0B6B3A` |
| Brand hover | `#075A30` |
| Brand subtle | `#E6F4EB` |
| Strong text | `#102019` |
| Muted text | `#5B6B62` |
| Canvas | `#F4F7F5` |
| Surface | `#FFFFFF` |
| Border | `#D7E1DB` |

### Dark

| Role | Value |
|---|---|
| Brand green | `#4AD58A` |
| Brand subtle | `#123522` |
| Strong text | `#F0F7F3` |
| Muted text | `#A8B7AE` |
| Canvas | `#0D1511` |
| Surface | `#141F19` |
| Border | `#2B3B32` |

### Financial semantic colors

| Meaning | Light | Dark |
|---|---|---|
| Income/success | `#0F766E` | `#4FD1C5` |
| Expense/danger | `#B83A35` | `#FF817A` |
| Transfer/info | `#3459C7` | `#8EA6FF` |
| Warning | `#9A5B00` | `#F6BC62` |

Brand green không thay thế semantic colors. Không phân biệt thu, chi và chuyển chỉ bằng màu.

Gradient trang trí không thuộc visual language chính.

## 9. Typography

UI và brand communications dùng **Inter** với system fallbacks.

Số tiền dùng numeric style có `font-variant-numeric: tabular-nums`; không truncation trong detail, form, table hoặc dialog.

| Role | Guidance |
|---|---|
| Hero | 42–72px responsive, chỉ trên marketing. |
| Page title | 28–44px tùy viewport. |
| Section title | 20–28px. |
| Card/title | 16–20px. |
| Body | 14–16px. |
| Metadata | 12px, không dùng cho nội dung chính. |

Không dùng SF Pro chỉ để trông giống Apple. Không thu nhỏ chữ để cứu bố cục; sửa layout.

## 10. Shape, spacing and composition

- Base rhythm: 4px.
- Phone gutter: 16px.
- Tablet gutter: 24px.
- Desktop gutter: 32px.
- Content max width: 1240px.
- Control radius: 10px.
- Container radius: 16px.
- Marketing panel radius: 24px.
- Minimum interactive target: 44×44px.
- Một viewport có một primary action rõ.
- Dùng border để tạo cấu trúc; shadow dành cho floating layers.
- Card chỉ nhóm một ý; không card trong card.
- Số tiền là scan target mạnh sau page title.

## 11. Iconography and data visualization

Functional icon phải quen thuộc, nhất quán về stroke/weight, nhận ra ở kích thước thật, đi kèm label khi cần và không phụ thuộc màu.

- Income: dấu `+`, direction tăng khi phù hợp và label.
- Expense: dấu `−`, direction giảm khi phù hợp và label.
- Transfer: `↔` hoặc hai account names.

Biểu đồ chỉ xuất hiện khi trả lời một câu hỏi mà số hoặc danh sách không trả lời tốt hơn.

- Giá trị hiện tại: số lớn.
- Xu hướng: line chart.
- So sánh danh mục: horizontal bar.
- Cơ cấu: bar/stacked bar; pie/donut chỉ khi rất ít phần và có label.
- Tiến độ: progress bar.

Không dùng 3D, gradient/glow, brand green cho mọi series hoặc màu là dấu hiệu duy nhất.

## 12. Imagery and motion

Photography phản ánh đời sống Việt Nam tự nhiên, tránh sự giàu có phô trương và stock clichés.

Illustration chỉ dùng để giải thích, onboarding, empty state hoặc tạo warmth vừa đủ; không mascot phán xét hoặc gamification tài chính.

Product screenshot phải phản ánh UI hiện hành, dùng dữ liệu demo rõ là demo, không che lỗi hoặc cắt số tiền.

Motion:

- interaction: 100–150ms;
- structural change: 180–240ms;
- không choreography trên số tiền;
- không animation logo trong luồng hằng ngày;
- tôn trọng `prefers-reduced-motion`.

## 13. Applications

### Signed-in product

Logo compact trong navigation, không lặp trên card và không cạnh tranh với số tiền.

### Public landing

First viewport cần product truth ngắn, một CTA chính, một CTA phụ, representative ledger preview và trust proof.

### Authentication

Logo + wordmark ổn định, copy nói facts, không hứa hẹn tài chính, error gần field và được announce.

### Social avatar

Dùng symbol canonical; không đặt full wordmark vào avatar nhỏ.

### App icon and favicon

Dùng symbol canonical, không chứa chữ hoặc slogan, kiểm tra 16/24/32/64/192/512px và optical adjustment.

## 14. Marketing and SEO

### Source of truth for indexable pages

`src/app/robots.ts` and `src/app/sitemap.ts` are the canonical, executable list of what is public and indexable. Today that is exactly: `/` (landing), `/login`, `/register`, `/privacy`. Every authenticated app route is deliberately disallowed — it shows a user's own or demo financial data, not marketing content, and indexing it would be both a privacy smell and thin/duplicate content for search engines. When a new public marketing page is added, it must be added to both files in the same change; this document does not duplicate that list so it cannot drift from what is actually deployed.

### Metadata contract

- Every indexable route sets its own `description` and `alternates.canonical` — no page relies on inheriting the root layout's generic description (checked by `src/lib/seo.test.ts`).
- `openGraph` and `twitter` metadata objects are **repeated in full** on each page, not partially overridden. Next.js shallow-merges these objects between a layout and a page — a page-level `openGraph: { title }` silently replaces the layout's `type`/`locale`/`siteName`, it does not merge into them. This bit the first implementation of this section; do not reintroduce it.
- The Open Graph image (`src/app/opengraph-image.tsx`) reuses the exact canonical mark path from `src/app/icon.svg`. A social preview that doesn't match the app icon a user later sees is a small trust leak — treat drift between the two as a bug.
- JSON-LD `SoftwareApplication` structured data lives on the landing page only; it is a statement of what the product *is*, so it must stay in lockstep with the "MoneyFlow không phải" list in §1 — do not let it imply financial-advice or investment features.

### Keyword and content posture

MoneyFlow does not compete on covering the most banks or the most automated categorization — that is Money Lover's and MISA's ground, and claiming it would be untrue. Content and on-page copy should instead own the manual-first, trustworthy-ledger territory: "ghi thu chi", "sổ thu chi cá nhân", "quản lý chi tiêu không cần liên kết ngân hàng", "sổ chi tiêu minh bạch". Do not write copy chasing "quản lý tài chính bằng AI" or "kết nối ngân hàng tự động" keywords — ranking for a promise the product doesn't keep produces bad-fit signups and contradicts §4's claim boundaries.

### Sharing and social copy

Reuse the approved tagline and alternatives from §4 rather than improvising new claims per channel. Any marketing copy destined for a page or post outside this repository (social captions, ad copy, app-store listing) is still bound by the same claim boundaries as in-product copy — a claim that would be rejected in a dialog is equally rejected in an ad.

## 15. Accessibility and localization

- Contrast phù hợp.
- Focus rõ.
- Keyboard đầy đủ.
- Touch target tối thiểu 44×44px.
- Text zoom 200%.
- Screen-reader labels có nghĩa.
- Không phụ thuộc màu.
- Reduced motion.
- Error nhận biết và sửa được.
- Vietnamese copy tự nhiên.

Logo decorative khi có adjacent accessible product name; không đọc lặp `MoneyFlow MoneyFlow`.

MoneyFlow là Vietnamese-first:

- viết tiếng Việt trước, không dịch word-by-word;
- VND lưu bằng integer đồng;
- hiển thị grouping theo locale Việt Nam;
- dùng `125.420.000 ₫`, không dùng `125.420.000 d`;
- dùng date format rõ, tránh ngày/tháng mơ hồ.

## 16. Governance

Đổi brand promise, positioning, canonical logo, primary brand color, typography chính hoặc claim boundaries là significant change và cần:

1. research/work packet;
2. alternatives;
3. owner approval;
4. cập nhật source of truth;
5. implementation và evidence;
6. PR review.

Canonical asset phải có vector source, owner, version/date, approved variants và một nơi duy nhất trong repo.

Không tạo logo mới trong component, palette song song, typography không ghi lại, icon style riêng hoặc brand document cạnh tranh.

## 17. Release checklist

### Brand/content

- [ ] Message phù hợp positioning.
- [ ] Không có claim vượt scope.
- [ ] Voice bình tĩnh, rõ, không phán xét.
- [ ] Vietnamese copy tự nhiên.
- [ ] CTA nói rõ hành động.

### Marketing and SEO

- [ ] Route added to both `src/app/robots.ts` and `src/app/sitemap.ts` if it is genuinely public (or added to neither if it isn't).
- [ ] Page sets its own `description` and `alternates.canonical` — does not rely on inheriting the layout default.
- [ ] `openGraph`/`twitter` objects repeat the full shape (`type`, `locale`, `siteName`, `card`) rather than a partial override.
- [ ] Keyword/content copy stays inside claim boundaries (§4) — no bank-sync or AI-advice claims to chase rankings.

### Visual

- [ ] Logo dùng asset canonical.
- [ ] Color roles đúng.
- [ ] Semantic finance không bị dùng như branding.
- [ ] Typography và spacing theo system.
- [ ] Không gradient/glow/glass trang trí.
- [ ] Product screenshot phản ánh UI thật.

### Accessibility and evidence

- [ ] Contrast, focus, keyboard và text 200% đạt.
- [ ] Không phụ thuộc màu.
- [ ] Logo/accessibility name không lặp.
- [ ] SVG/vector source được giữ.
- [ ] Responsive screenshots được review.
- [ ] Favicon/PWA được kiểm tra.
- [ ] Không có duplicate asset hoặc parallel system.
- [ ] Required CI/browser checks pass.

## Current approved decisions

| Area | Decision |
|---|---|
| Product category | Vietnamese manual-first personal ledger |
| Brand promise | Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn. |
| Brand essence | Rõ từng dòng tiền. |
| Personality | Calm, clear, honest, trustworthy, approachable, organized |
| Primary type | Inter |
| Brand green light | `#0B6B3A` |
| Brand green dark | `#4AD58A` |
| UI contract | Calm Ledger v2 |
| Canonical logo | M-based mark v1 |
| Logo approval | Owner-approved 2026-07-28 |
| Canonical vector | `src/app/icon.svg` |
| Product compatibility geometry | `src/app/ai-uiux-guardrails.css` |
| Decorative gradients/glass | Excluded |
| Financial advice claims | Excluded until explicitly researched and approved |
| Logo v2 exploration | Owner reviewed multiple new directions 2026-07-28 (coin/rice-stalk, banknote, intersecting marks) and declined all; canonical logo remains M-based v1 |
| Differentiation vs. Money Lover / MISA | Manual-first, no bank sync, no auto-categorization — explicit, not incidental |
| SEO foundation | Shipped — `src/app/robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, per-page OG/Twitter/canonical metadata, JSON-LD |
