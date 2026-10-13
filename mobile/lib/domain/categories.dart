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

/// The web action's categoryError() — map the PostgREST/Postgres failure to
/// the same Vietnamese message; unknown strings degrade to the honest
/// generic, never a crash.
String categoryErrorMessage(Object error) {
  final msg = error.toString();
  if (msg.contains('categories_user_id_name_kind_key') ||
      msg.contains('duplicate key') ||
      msg.contains('unique')) {
    return 'Đã có danh mục cùng tên trong loại này.';
  }
  if (msg.contains('category_not_found')) return 'Không tìm thấy danh mục.';
  if (msg.contains('saved_unread')) {
    return 'Đã lưu nhưng chưa tải lại được danh mục.';
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
