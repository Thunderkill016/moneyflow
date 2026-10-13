// Category write contract ported from src/lib/categories.ts +
// src/app/actions/categories.ts + src/lib/transactions/category-presentation.ts.
// The web manages categories by direct PostgREST table writes under RLS
// (no RPC) — these helpers keep the mobile path byte-for-byte aligned on
// what is normalized, validated and sent.

import 'models.dart';

const categoryNameMax = 60; // CATEGORY_NAME_MAX — also the DB check bound.

const categoryKindLabels = {
  TransactionKind.expense: 'Chi tiêu',
  TransactionKind.income: 'Thu nhập',
};

/// Trim + collapse internal whitespace — must match the server's
/// normalizeCategoryName so uniqueness is judged on the same string.
String normalizeCategoryName(String name) =>
    name.trim().replaceAll(RegExp(r'\s+'), ' ');

bool isValidCategoryName(String name) {
  final normalized = normalizeCategoryName(name);
  return normalized.isNotEmpty && normalized.length <= categoryNameMax;
}

/// Name must be unique per kind (DB unique (user_id, name, kind)).
/// Case-sensitive after normalize, same as the Postgres unique index.
bool isCategoryNameUnique(
  String name,
  TransactionKind kind,
  Iterable<Category> categories, {
  String? excludeId,
}) {
  final normalized = normalizeCategoryName(name);
  if (normalized.isEmpty) return false;
  return !categories.any(
    (item) =>
        item.kind == kind &&
        item.id != excludeId &&
        normalizeCategoryName(item.name) == normalized,
  );
}

/// What the dialog submits — the mobile twin of the web's SaveCategoryInput.
/// [id] null = create; kind is only meaningful on create (immutable after).
typedef CategoryDraft = ({
  String? id,
  String name,
  TransactionKind kind,
  String icon,
  String color,
});

/// Client-side mirror of the web's validateSaveCategory — same messages so
/// a rejected write reads identically on both surfaces.
String? validateCategoryDraft(
  CategoryDraft draft,
  Iterable<Category> categories,
) {
  if (draft.kind != TransactionKind.expense &&
      draft.kind != TransactionKind.income) {
    return 'Loại danh mục chưa hợp lệ.';
  }
  final name = normalizeCategoryName(draft.name);
  if (!isValidCategoryName(name)) {
    return 'Tên danh mục cần từ 1 đến $categoryNameMax ký tự.';
  }
  if (!isCategoryNameUnique(
    name,
    draft.kind,
    categories,
    excludeId: draft.id,
  )) {
    return draft.kind == TransactionKind.expense
        ? 'Đã có danh mục chi tiêu cùng tên.'
        : 'Đã có danh mục thu nhập cùng tên.';
  }
  return null;
}

/// Fallback icon/color when a write omits them — src/lib/categories.ts
/// defaultCategoryMeta.
({String icon, String color}) defaultCategoryMeta(TransactionKind kind) =>
    kind == TransactionKind.income
    ? (icon: 'wallet', color: 'green')
    : (icon: 'spark', color: 'violet');

/// The writable icon vocabulary — PICKABLE_CATEGORY_ICONS. The stored string
/// sent to the server is always one of these keys; Material glyphs are only
/// a render-side mapping. Legacy seeded "plus" stays writable server-side
/// (CATEGORY_ICON_NAMES) so an existing row can keep it, but it is not
/// offered in the picker, matching the web.
const pickableCategoryIcons = [
  'bowl',
  'coffee',
  'car',
  'fuel',
  'bus',
  'bike',
  'parking',
  'bag',
  'shirt',
  'laundry',
  'home',
  'wifi',
  'phone',
  'receipt',
  'tax',
  'heart',
  'pill',
  'baby',
  'paw',
  'book',
  'study',
  'gym',
  'music',
  'film',
  'plane',
  'gift',
  'charity',
  'ticket',
  'briefcase',
  'piggy',
  'coins',
  'wallet',
  'bank',
  'spark',
];

/// Icon picker labels — ICON_OPTIONS in src/components/category-dialog.tsx.
const categoryIconLabels = {
  'bowl': 'Ăn uống',
  'coffee': 'Cà phê & đồ uống',
  'car': 'Di chuyển',
  'fuel': 'Xăng & nhiên liệu',
  'bus': 'Xe buýt & công cộng',
  'bike': 'Xe đạp & xe máy',
  'parking': 'Gửi xe',
  'bag': 'Mua sắm',
  'shirt': 'Quần áo & giày dép',
  'laundry': 'Giặt ủi',
  'home': 'Nhà ở',
  'wifi': 'Internet & truyền thông',
  'phone': 'Điện thoại',
  'receipt': 'Hóa đơn',
  'tax': 'Thuế & phí',
  'heart': 'Sức khỏe',
  'pill': 'Thuốc & dược phẩm',
  'baby': 'Con cái & gia đình',
  'paw': 'Thú cưng',
  'book': 'Giáo dục',
  'study': 'Khóa học & nâng cấp',
  'gym': 'Thể thao & gym',
  'music': 'Âm nhạc',
  'film': 'Phim ảnh & giải trí',
  'plane': 'Du lịch',
  'gift': 'Quà tặng & biếu',
  'charity': 'Từ thiện & cúng dường',
  'ticket': 'Vé & khuyến mãi',
  'briefcase': 'Công việc & kinh doanh',
  'piggy': 'Tiết kiệm',
  'coins': 'Cho vay & thu hồi',
  'wallet': 'Thu nhập',
  'bank': 'Tài chính',
  'spark': 'Linh hoạt',
};

/// The writable color vocabulary — CATEGORY_COLORS, in the web picker's
/// option order with its Vietnamese labels (COLOR_OPTIONS).
const categoryColorOptions = [
  ('blue', 'Xanh dương'),
  ('green', 'Xanh lá'),
  ('violet', 'Tím'),
  ('amber', 'Hổ phách'),
  ('cyan', 'Xanh ngọc'),
  ('coral', 'San hô'),
  ('pink', 'Hồng'),
  ('red', 'Đỏ'),
];

List<String> get categoryColorKeys =>
    categoryColorOptions.map((option) => option.$1).toList();

/// One offerable row of the "Gói danh mục Việt Nam" — a creatable draft
/// (name + kind + icon/color from the same writable vocabulary the
/// pickers use), never a stored row.
typedef CategoryPackItem = ({
  String name,
  TransactionKind kind,
  String icon,
  String color,
});

/// Vietnamese-life categories the signup defaults don't ship
/// (handle_new_user seeds 8 expense + 3 income rows; the seed list is
/// mirrored in vietnam_pack_sheet_test.dart). Deliberately skipped:
/// - 'Ăn uống', 'Di chuyển', 'Thưởng'… — already signup defaults, and
///   offering them would only collide. The runtime presence check below
///   also catches users who renamed or custom-added the same name.
/// - 'Đi lại' — semantic duplicate of the default 'Di chuyển', which
///   already covers xe/Grab/xăng.
/// - 'Ma chay' — folded into 'Hiếu hỉ': hiếu is the funeral side, hỉ the
///   wedding side, and both are the same envelope-money event.
const vietnamCategoryPack = <CategoryPackItem>[
  // Hiếu hỉ — weddings + funerals gifting, the most common Vietnamese
  // social expense. 'charity' (hands giving) is the closest glyph.
  (
    name: 'Hiếu hỉ',
    kind: TransactionKind.expense,
    icon: 'charity',
    color: 'red',
  ),
  // Lì xì given (Tết envelopes to kids/elders) — red like the envelope.
  (name: 'Lì xì', kind: TransactionKind.expense, icon: 'gift', color: 'red'),
  // Kids' costs beyond tuition (which 'Giáo dục' already covers).
  (name: 'Con cái', kind: TransactionKind.expense, icon: 'baby', color: 'pink'),
  // Hometown trips — xe khách is the iconic mode, hence 'bus'.
  (name: 'Về quê', kind: TransactionKind.expense, icon: 'bus', color: 'amber'),
  // Money for parents/siblings/family obligations.
  (
    name: 'Gia đình',
    kind: TransactionKind.expense,
    icon: 'heart',
    color: 'coral',
  ),
  // Lucky money received — 'Lì xì nhận' keeps it distinct from the
  // expense side even though uniqueness is only per-kind.
  (
    name: 'Lì xì nhận',
    kind: TransactionKind.income,
    icon: 'gift',
    color: 'red',
  ),
  // Reselling second-hand (Chợ Tốt, pass groups) — 'bag' reads as goods.
  (name: 'Bán đồ', kind: TransactionKind.income, icon: 'bag', color: 'amber'),
  // Refunds / hoàn tiền / cashback landing back as income.
  (
    name: 'Hoàn tiền',
    kind: TransactionKind.income,
    icon: 'coins',
    color: 'green',
  ),
];

/// True when a same-kind category with this pack name already exists —
/// judged on the normalized name by the same rule the write path
/// enforces, so an archived row or a differently-spaced variant still
/// counts as present and is never re-offered for creation.
bool categoryPackItemPresent(
  CategoryPackItem item,
  Iterable<Category> categories,
) => !isCategoryNameUnique(item.name, item.kind, categories);

/// Pack entries not yet present — the offer card hides itself entirely
/// once every name exists (idempotent re-open shows "Đã có" instead).
List<CategoryPackItem> missingCategoryPackItems(
  Iterable<Category> categories,
) => [
  for (final item in vietnamCategoryPack)
    if (!categoryPackItemPresent(item, categories)) item,
];

/// The web action's categoryError() — map the PostgREST/Postgres failure to
/// the same Vietnamese message; unknown strings degrade to the honest
/// generic, never a crash. The `category_*`/`invalid_*` tokens are the
/// raised exception messages of the upsert_financial_category RPC
/// (db/neon/migrations/20261010120000) — PostgREST echoes them verbatim.
String categoryErrorMessage(Object error) {
  final msg = error.toString();
  if (msg.contains('categories_user_id_name_kind_key') ||
      msg.contains('category_name_taken') ||
      msg.contains('duplicate key') ||
      msg.contains('unique')) {
    return 'Đã có danh mục cùng tên trong loại này.';
  }
  if (msg.contains('category_not_found')) return 'Không tìm thấy danh mục.';
  if (msg.contains('saved_unread')) {
    return 'Đã lưu nhưng chưa tải lại được danh mục.';
  }
  if (msg.contains('category_kind_locked')) {
    return 'Không đổi được loại sau khi tạo.';
  }
  if (msg.contains('invalid_category_name')) {
    return 'Tên danh mục cần từ 1 đến $categoryNameMax ký tự.';
  }
  return 'Không thể cập nhật danh mục. Hãy thử lại.';
}

/// Hard-delete failures (mobile-only affordance; the web has no delete).
/// FK-restrict references (transactions, budgets, commitments) make delete
/// impossible — archive is the supported hide path, so say exactly that.
String categoryDeleteErrorMessage(Object error) {
  final msg = error.toString();
  if (msg.contains('foreign key') ||
      msg.contains('23503') ||
      msg.contains('violates')) {
    return 'Danh mục đang gắn giao dịch, ngân sách hoặc cam kết — '
        'hãy ẩn thay vì xóa hẳn.';
  }
  return 'Không xóa được danh mục. Hãy thử lại.';
}
