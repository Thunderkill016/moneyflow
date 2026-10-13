import 'package:flutter/material.dart';

import '../../domain/categories.dart';
import '../../domain/models.dart';
import 'category_visuals.dart';
import 'vietnam_pack_sheet.dart';

/// Category management — mirrors the web's /categories page
/// (categories-page.tsx): sections split active expense / active income /
/// archived, defaults are editable and archivable just like custom rows,
/// and writes go through the same PostgREST contract as the web action.
class CategoriesPage extends StatefulWidget {
  const CategoriesPage({
    super.key,
    required this.loadCategories,
    required this.onSave,
    required this.onSetArchived,
    this.onDelete,
  });

  /// Must return every category including archived (loadAllCategories) —
  /// the "Đã ẩn" section lists them for restore.
  final Future<List<Category>> Function() loadCategories;

  /// Create (draft.id == null) or update. Throws on failure — the page
  /// maps it with categoryErrorMessage and keeps the dialog open.
  final Future<void> Function(CategoryDraft draft) onSave;

  final Future<void> Function(String id, bool archived) onSetArchived;

  /// Hard-delete a custom category; returns false when nothing was removed.
  /// Null hides the affordance entirely (e.g. surfaces without the right).
  final Future<bool> Function(String id)? onDelete;

  @override
  State<CategoriesPage> createState() => _CategoriesPageState();
}

class _CategoriesPageState extends State<CategoriesPage> {
  late Future<List<Category>> _categories;

  /// Last successfully loaded rows — uniqueness checks inside the dialog
  /// read this, never the in-flight future.
  List<Category> _loaded = const [];

  @override
  void initState() {
    super.initState();
    _categories = widget.loadCategories();
  }

  Future<void> _refresh() async {
    final next = widget.loadCategories();
    setState(() {
      _categories = next;
    });
    try {
      await next;
    } catch (_) {
      // The FutureBuilder renders the honest error state already.
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Create when [editing] is null; otherwise edit name/icon/color in
  /// place — kind stays locked like the web dialog (immutable after create).
  Future<void> _showForm({Category? editing}) async {
    final name = TextEditingController(text: editing?.name ?? '');
    var kind = editing?.kind ?? TransactionKind.expense;
    var icon = editing?.icon ?? defaultCategoryMeta(kind).icon;
    var color = editing?.color ?? defaultCategoryMeta(kind).color;
    // A stored icon outside the pickable set (legacy seeded "plus") stays
    // selectable so an untouched edit round-trips the same value — the
    // server-side schema accepts it (CATEGORY_ICON_NAMES).
    final iconOptions = [
      ...pickableCategoryIcons,
      if (!pickableCategoryIcons.contains(icon)) icon,
    ];
    // A stored color outside the palette can't render anyway; fall back to
    // the kind default so saving repairs it rather than crashing the field.
    if (!categoryColorKeys.contains(color)) {
      color = defaultCategoryMeta(kind).color;
    }
    String? error;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(editing == null ? 'Thêm danh mục' : 'Sửa danh mục'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  maxLength: categoryNameMax,
                  decoration: const InputDecoration(
                    labelText: 'Tên danh mục',
                    hintText: 'Ví dụ: Cà phê',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<TransactionKind>(
                  initialValue: kind,
                  decoration: InputDecoration(
                    labelText: 'Loại',
                    border: const OutlineInputBorder(),
                    helperText: editing == null
                        ? null
                        : 'Không đổi được loại sau khi tạo',
                  ),
                  items: [
                    for (final k in [
                      TransactionKind.expense,
                      TransactionKind.income,
                    ])
                      DropdownMenuItem(
                        value: k,
                        child: Text(categoryKindLabels[k]!),
                      ),
                  ],
                  // Kind is immutable after create — the web's
                  // saveCategoryAction rejects a kind change outright.
                  onChanged: editing != null
                      ? null
                      : (v) => setDlg(() {
                          kind = v ?? kind;
                          // Same reset as the web's handleKindChange — the
                          // new kind's default identity wins over the old.
                          final meta = defaultCategoryMeta(kind);
                          icon = meta.icon;
                          color = meta.color;
                        }),
                ),
                const SizedBox(height: 12),
                // Keys force the fields to re-read initialValue after a
                // kind switch resets icon/color to the new kind's defaults.
                DropdownButtonFormField<String>(
                  key: ValueKey('icon-$kind'),
                  initialValue: icon,
                  decoration: const InputDecoration(
                    labelText: 'Biểu tượng',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final key in iconOptions)
                      DropdownMenuItem(
                        value: key,
                        child: Row(
                          children: [
                            Icon(categoryIconData(key), size: 20),
                            const SizedBox(width: 8),
                            Text(categoryIconLabels[key] ?? key),
                          ],
                        ),
                      ),
                  ],
                  onChanged: (v) => setDlg(() => icon = v ?? icon),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  key: ValueKey('color-$kind'),
                  initialValue: color,
                  decoration: const InputDecoration(
                    labelText: 'Màu nhận diện',
                    helperText:
                        'Màu chỉ hỗ trợ nhận diện; loại luôn ghi bằng chữ.',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final (key, label) in categoryColorOptions)
                      DropdownMenuItem(
                        value: key,
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 8,
                              backgroundColor: categoryColor(key),
                            ),
                            const SizedBox(width: 8),
                            Text(label),
                          ],
                        ),
                      ),
                  ],
                  onChanged: (v) => setDlg(() => color = v ?? color),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: TextStyle(color: Colors.red.shade700)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () async {
                final draft = (
                  id: editing?.id,
                  name: normalizeCategoryName(name.text),
                  kind: editing?.kind ?? kind,
                  icon: icon,
                  color: color,
                );
                final problem = validateCategoryDraft(draft, _loaded);
                if (problem != null) {
                  setDlg(() => error = problem);
                  return;
                }
                try {
                  await widget.onSave(draft);
                } catch (e) {
                  setDlg(() => error = categoryErrorMessage(e));
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: Text(editing == null ? 'Thêm danh mục' : 'Lưu thay đổi'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) {
      _snack(editing == null ? 'Đã thêm danh mục.' : 'Đã cập nhật danh mục.');
      _refresh();
    }
  }

  /// The one-tap pack sheet — resolves true when at least one row
  /// landed, so even a barrier-dismissed sheet refreshes the list.
  Future<void> _showPack() async {
    final added = await showVietnamCategoryPackSheet(
      context,
      existing: _loaded,
      onSave: widget.onSave,
    );
    if (added) _refresh();
  }

  /// Archiving needs the same review the web gives ("Ẩn danh mục?") — new
  /// transactions lose the picker entry but history is kept. Unarchiving is
  /// immediate, matching the web's no-confirm restore.
  Future<void> _toggleArchived(Category c) async {
    if (c.isArchived) {
      await _applyArchived(c, false);
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ẩn danh mục?'),
        content: Text(
          '"${c.name}" sẽ biến mất khỏi picker khi ghi giao dịch mới. '
          'Giao dịch, ngân sách và lịch sử cũ không bị xóa; bạn có thể hiện '
          'lại sau.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ẩn danh mục'),
          ),
        ],
      ),
    );
    if (ok == true) await _applyArchived(c, true);
  }

  Future<void> _applyArchived(Category c, bool archived) async {
    try {
      await widget.onSetArchived(c.id, archived);
    } catch (e) {
      if (mounted) _snack(categoryErrorMessage(e));
      return;
    }
    _snack(archived ? 'Đã ẩn danh mục.' : 'Đã hiện lại danh mục.');
    _refresh();
  }

  /// Permanent delete — only custom rows (RLS categories_delete_custom_own
  /// blocks defaults; the menu hides it for them). FK-restrict references
  /// still refuse server-side, which is why the confirm text says so.
  Future<void> _confirmDelete(Category c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Xóa hẳn "${c.name}"?'),
        content: const Text(
          'Danh mục tự tạo sẽ bị xóa vĩnh viễn và không khôi phục được. '
          'Nếu danh mục đang gắn giao dịch, ngân sách hoặc cam kết thì không '
          'xóa được — hãy ẩn thay.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa hẳn'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final deleted = await widget.onDelete!(c.id);
      if (!deleted) {
        if (mounted) {
          _snack(
            'Không xóa được — danh mục không còn hoặc không xóa hẳn được.',
          );
        }
        return;
      }
    } catch (e) {
      if (mounted) _snack(categoryDeleteErrorMessage(e));
      return;
    }
    _snack('Đã xóa danh mục.');
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Danh mục')),
      body: FutureBuilder<List<Category>>(
        future: _categories,
        builder: (context, snap) {
          if (snap.hasError) {
            // Honest failure — never a spinner that pretends to still load.
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được danh mục — thử lại khi có mạng'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _refresh,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          _loaded = snap.data!;
          final expense = [
            for (final c in _loaded)
              if (c.kind == TransactionKind.expense && !c.isArchived) c,
          ];
          final income = [
            for (final c in _loaded)
              if (c.kind == TransactionKind.income && !c.isArchived) c,
          ];
          final archived = [
            for (final c in _loaded)
              if (c.isArchived) c,
          ];
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                if (_loaded.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(child: Text('Chưa có danh mục')),
                  ),
                // Offer the pack only while it still has something to
                // give — once every name exists the card disappears and
                // the categories themselves are the proof it ran.
                if (missingCategoryPackItems(_loaded).isNotEmpty)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: const Icon(Icons.auto_awesome),
                      title: const Text('Gói danh mục Việt Nam'),
                      subtitle: const Text(
                        'Thêm các danh mục đời sống Việt Nam — tùy chọn, '
                        'có thể sửa/ẩn sau',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: _showPack,
                    ),
                  ),
                ..._section('Chi tiêu đang dùng', expense),
                ..._section('Thu nhập đang dùng', income),
                if (archived.isNotEmpty) ..._section('Đã ẩn', archived),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showForm,
        icon: const Icon(Icons.add),
        label: const Text('Thêm danh mục'),
      ),
    );
  }

  List<Widget> _section(String title, List<Category> items) {
    if (items.isEmpty) return const [];
    return [
      Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 8),
        child: Text(title, style: Theme.of(context).textTheme.titleMedium),
      ),
      for (final c in items) _row(c),
    ];
  }

  Widget _row(Category c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: categoryColor(c.color),
          child: Icon(categoryIconData(c.icon), color: Colors.white, size: 20),
        ),
        title: Text(c.name),
        subtitle: Text(
          '${categoryKindLabels[c.kind]} · '
          '${c.isDefault ? 'Danh mục mặc định' : 'Danh mục tự tạo'}'
          '${c.isArchived ? ' · Đã ẩn khỏi giao dịch mới' : ''}',
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (action) {
            switch (action) {
              case 'edit':
                _showForm(editing: c);
              case 'archive':
                _toggleArchived(c);
              case 'delete':
                _confirmDelete(c);
            }
          },
          itemBuilder: (ctx) => [
            // The web hides Sửa on archived rows — restore first, then edit.
            if (!c.isArchived)
              const PopupMenuItem(value: 'edit', child: Text('Sửa')),
            PopupMenuItem(
              value: 'archive',
              child: Text(c.isArchived ? 'Hiện lại' : 'Ẩn'),
            ),
            // RLS only deletes custom (non-default) rows — don't offer a
            // destructive action that can never succeed on defaults.
            if (!c.isDefault && widget.onDelete != null)
              const PopupMenuItem(value: 'delete', child: Text('Xóa hẳn')),
          ],
        ),
        onTap: c.isArchived ? null : () => _showForm(editing: c),
      ),
    );
  }
}
