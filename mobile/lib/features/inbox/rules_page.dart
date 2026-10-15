// "Quy tắc tự điền" — deterministic auto-fill rules for pending inbox
// candidates, mirroring the web's /rules workspace
// (src/components/inbox/rules-page.tsx + src/app/actions/rules.ts).
//
// Product law this surface serves: a rule only prefills a pending
// candidate's category/merchant — it NEVER posts to the ledger; the human
// still approves in "Cần xem". Lower priority wins and only the first
// enabled match applies, so ordering is a real control, not cosmetic.

import 'package:flutter/material.dart';

import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../capture/category_picker.dart';

typedef _RulesData = ({List<InboxRule> rules, List<Category> categories});

/// The rule manager: priority-ordered list, drag-to-reorder, per-row
/// enable switch, create/edit sheet and a guarded delete — the same levers
/// the web page exposes, funneled into the store seams the app injects.
class InboxRulesPage extends StatefulWidget {
  const InboxRulesPage({
    super.key,
    required this.loadRules,
    required this.loadCategories,
    required this.onSave,
    required this.onDelete,
    required this.onReorder,
  });

  /// Priority-ordered rules — RealStore.loadInboxRules /
  /// DemoRuleStore.loadAll.
  final Future<List<InboxRule>> Function() loadRules;

  /// Every category INCLUDING archived — a stored rule may still point at
  /// a hidden category and the row must keep rendering its name honestly;
  /// the create/edit picker filters to active ones itself.
  final Future<List<Category>> Function() loadCategories;

  /// Create (draft.id == null) or update with draft.expectedVersion as the
  /// stale-write guard. Throws the RPC error token — the page maps it with
  /// inboxRuleErrorMessage and refreshes so a stale version heals.
  final Future<InboxRule> Function(InboxRuleDraft draft) onSave;
  final Future<void> Function(String ruleId, int expectedVersion) onDelete;

  /// replace_inbox_rule_priorities — always the COMPLETE ordered id list;
  /// the server refuses a partial set rather than renumbering wrongly.
  final Future<void> Function(List<String> orderedIds) onReorder;

  @override
  State<InboxRulesPage> createState() => _InboxRulesPageState();
}

class _InboxRulesPageState extends State<InboxRulesPage> {
  late Future<_RulesData> _data;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  /// Rules plus the categories the rows and the picker resolve against —
  /// one load pass so a network failure shows one honest error.
  Future<_RulesData> _load() async {
    final rows = await Future.wait([
      widget.loadRules(),
      widget.loadCategories(),
    ]);
    return (
      rules: rows[0] as List<InboxRule>,
      categories: rows[1] as List<Category>,
    );
  }

  /// Every mutation refetches — the server is the source of truth for
  /// priority and version, so the list never trusts its local guess.
  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _data = next;
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

  String _categoryName(_RulesData data, String id) =>
      data.categories.where((c) => c.id == id).map((c) => c.name).firstOrNull ??
      'Danh mục không còn';

  /// Row switch = a full upsert with the enabled flag flipped and the
  /// stored version as the stale-write guard — the same write path the
  /// web's toggleEnabled uses (one RPC, no separate enable endpoint).
  Future<void> _toggle(InboxRule rule) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await widget.onSave((
        id: rule.id,
        expectedVersion: rule.version,
        matchField: rule.matchField,
        containsText: rule.containsText,
        categoryId: rule.categoryId,
        merchantName: rule.merchantName,
        enabled: !rule.enabled,
      ));
      if (mounted) {
        _snack(rule.enabled ? 'Đã tắt quy tắc.' : 'Đã bật quy tắc.');
      }
    } catch (e) {
      if (mounted) _snack(inboxRuleErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (!mounted) return;
    // Refresh either way: success refetches canonical state, and a
    // stale_write heals the version the next attempt will send.
    await _refresh();
  }

  /// Drag-to-reorder — the complete ordered id list goes to the server in
  /// one write; a raced/stale list is refused (incomplete_rule_order) and
  /// the refresh restores the real order.
  Future<void> _reorder(int oldIndex, int newIndex) async {
    final _RulesData data;
    try {
      data = await _data;
    } catch (_) {
      // The FutureBuilder already shows the load error — nothing to
      // reorder against.
      return;
    }
    final ids = [for (final r in data.rules) r.id];
    // ReorderableListView semantics: dropping past the end reports the
    // index after removal — the standard adjust-before-move.
    if (newIndex > oldIndex) newIndex -= 1;
    final id = ids.removeAt(oldIndex);
    ids.insert(newIndex, id);
    setState(() => _busy = true);
    try {
      await widget.onReorder(ids);
      if (mounted) _snack('Đã cập nhật thứ tự ưu tiên.');
    } catch (e) {
      if (mounted) _snack(inboxRuleErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (!mounted) return;
    await _refresh();
  }

  Future<void> _confirmDelete(InboxRule rule) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa quy tắc?'),
        content: const Text(
          'Quy tắc sẽ ngừng áp dụng cho các mục chờ duyệt mới. '
          'Bằng chứng đã áp dụng trên các mục cũ vẫn giữ nguyên — '
          'không giao dịch nào bị thay đổi hay xóa.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Xóa quy tắc'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.onDelete(rule.id, rule.version);
      if (mounted) _snack('Đã xóa quy tắc.');
    } catch (e) {
      if (mounted) _snack(inboxRuleErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (!mounted) return;
    await _refresh();
  }

  /// Create (editing == null) or edit — the sheet returns 'saved' on a
  /// landed write and 'stale' when the server rejected a stale version, so
  /// the page can refresh and say why honestly.
  Future<void> _openForm(_RulesData data, {InboxRule? editing}) async {
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _RuleSheet(
        editing: editing,
        categories: [
          for (final c in data.categories)
            if (!c.isArchived) c,
        ],
        onSave: widget.onSave,
      ),
    );
    if (!mounted || result == null) return;
    if (result == 'stale') {
      _snack('Quy tắc đã được thay đổi ở nơi khác. Hãy tải lại rồi thử lại.');
    } else {
      _snack(editing == null ? 'Đã thêm quy tắc.' : 'Đã cập nhật quy tắc.');
    }
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quy tắc tự điền')),
      body: FutureBuilder<_RulesData>(
        future: _data,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được quy tắc'),
                    const SizedBox(height: 8),
                    Text(
                      'Kiểm tra kết nối mạng rồi thử lại.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
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
          final data = snap.data!;
          final active = [
            for (final c in data.categories)
              if (!c.isArchived) c,
          ];
          if (data.rules.isEmpty) {
            // Mirror the web EmptyState: when no active category exists the
            // rules feature has nothing to fill, so the copy says so
            // instead of dangling a create button that can only fail.
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.rule_outlined),
                      title: const Text('Chưa có quy tắc'),
                      subtitle: Text(
                        active.isEmpty
                            ? 'Quy tắc cần một danh mục để gợi ý. '
                                  'Tạo danh mục trước, rồi quay lại đặt '
                                  'quy tắc đầu tiên.'
                            : 'Quy tắc tự điền danh mục cho tin nhắn/ngân '
                                  'hàng đã lưu khi nội dung khớp — ví dụ chứa '
                                  '“HIGHLANDS” → Ăn uống. Giao dịch vẫn do '
                                  'bạn duyệt trong Cần xem.',
                      ),
                    ),
                  ),
                  if (active.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    FilledButton.tonalIcon(
                      onPressed: () => _openForm(data),
                      icon: const Icon(Icons.add),
                      label: const Text('Thêm quy tắc'),
                    ),
                  ],
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ReorderableListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              buildDefaultDragHandles: false,
              itemCount: data.rules.length,
              onReorder: (oldIndex, newIndex) {
                // Sync reorder re-locks only the guard; the await stays in
                // the fire-and-reload path so the framework callback never
                // awaits network.
                if (!_busy) _reorder(oldIndex, newIndex);
              },
              itemBuilder: (context, i) {
                final rule = data.rules[i];
                return Card(
                  key: ValueKey(rule.id),
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      radius: 14,
                      child: Text(
                        '${i + 1}',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ),
                    title: Text(
                      formatInboxRuleSummary(
                        rule,
                        _categoryName(data, rule.categoryId),
                      ),
                    ),
                    subtitle: Text(
                      '${ruleMatchFieldLabels[rule.matchField]} · '
                      'Phiên bản ${rule.version} · '
                      '${rule.enabled ? 'Đang bật' : 'Đã tắt'}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Switch(
                          value: rule.enabled,
                          onChanged: _busy ? null : (_) => _toggle(rule),
                        ),
                        PopupMenuButton<String>(
                          onSelected: (action) {
                            switch (action) {
                              case 'edit':
                                _openForm(data, editing: rule);
                              case 'delete':
                                _confirmDelete(rule);
                            }
                          },
                          itemBuilder: (ctx) => const [
                            PopupMenuItem(value: 'edit', child: Text('Sửa')),
                            PopupMenuItem(value: 'delete', child: Text('Xóa')),
                          ],
                        ),
                        // Explicit handle — long-press-anywhere works too,
                        // but a visible grip keeps reorder discoverable.
                        ReorderableDragStartListener(
                          index: i,
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(Icons.drag_indicator),
                          ),
                        ),
                      ],
                    ),
                    onTap: _busy ? null : () => _openForm(data, editing: rule),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FutureBuilder<_RulesData>(
        future: _data,
        builder: (context, snap) {
          final data = snap.data;
          final canCreate =
              data != null && data.categories.any((c) => !c.isArchived);
          if (!canCreate) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: _busy ? null : () => _openForm(data),
            icon: const Icon(Icons.add),
            label: const Text('Thêm quy tắc'),
          );
        },
      ),
    );
  }
}

/// Create/edit sheet — the same levers the web dialog exposes (contains
/// string, match field, target category, optional merchant rename, enabled
/// flag). A stale-write rejection pops 'stale' so the host refreshes before
/// the user retries against the new version.
class _RuleSheet extends StatefulWidget {
  const _RuleSheet({
    required this.editing,
    required this.categories,
    required this.onSave,
  });

  final InboxRule? editing;

  /// Active (non-archived) categories only — the picker can never target a
  /// hidden category, matching the server trigger's rule_category_not_
  /// available guard for writes that need one.
  final List<Category> categories;
  final Future<InboxRule> Function(InboxRuleDraft draft) onSave;

  @override
  State<_RuleSheet> createState() => _RuleSheetState();
}

class _RuleSheetState extends State<_RuleSheet> {
  late final TextEditingController _contains = TextEditingController(
    text: widget.editing?.containsText ?? '',
  );
  late final TextEditingController _merchant = TextEditingController(
    text: widget.editing?.merchantName ?? '',
  );
  late RuleMatchField _field = widget.editing?.matchField ?? RuleMatchField.any;
  late String? _categoryId = widget.editing?.categoryId;
  late bool _enabled = widget.editing?.enabled ?? true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _contains.dispose();
    _merchant.dispose();
    super.dispose();
  }

  String _categoryName() =>
      widget.categories
          .where((c) => c.id == _categoryId)
          .map((c) => c.name)
          .firstOrNull ??
      'Chọn';

  Future<void> _pickCategory() async {
    final picked = await showCategoryPicker(
      context,
      categories: widget.categories,
      selectedId: _categoryId,
    );
    if (picked != null) setState(() => _categoryId = picked.id);
  }

  Future<void> _save() async {
    final draft = (
      id: widget.editing?.id,
      expectedVersion: widget.editing?.version,
      matchField: _field,
      containsText: _contains.text,
      categoryId: _categoryId ?? '',
      merchantName: _merchant.text,
      enabled: _enabled,
    );
    final problem = validateInboxRuleDraft(draft);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSave(draft);
      if (mounted) Navigator.of(context).pop('saved');
    } catch (e) {
      // A stale version means the local form is obsolete — close so the
      // refreshed list (and its fresh versions) is what the user retries
      // from, instead of re-failing against the same old version.
      if (e.toString().contains('stale_write')) {
        if (mounted) Navigator.of(context).pop('stale');
        return;
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _error = inboxRuleErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.editing;
    return Padding(
      // Lift above the keyboard — same as the category picker sheet.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              editing == null ? 'Thêm quy tắc' : 'Sửa quy tắc',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            Text(
              'Chuỗi khớp không phân biệt hoa thường. '
              'Nội dung gốc của ứng viên không bị thay đổi.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _contains,
              maxLength: ruleContainsMax,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Nếu chứa',
                hintText: 'HIGHLANDS, LUONG, GRAB…',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text('Trong trường', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              children: [
                for (final f in ruleMatchFieldOptions)
                  ChoiceChip(
                    label: Text(ruleMatchFieldLabels[f]!),
                    selected: _field == f,
                    onSelected: _busy
                        ? null
                        : (_) => setState(() => _field = f),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: _busy ? null : _pickCategory,
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Thì danh mục',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.arrow_drop_down),
                ),
                child: Text(
                  _categoryName(),
                  style: _categoryId == null
                      ? TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _merchant,
              maxLength: ruleMerchantMax,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Đổi tên nơi giao dịch (tùy chọn)',
                hintText: 'Highlands Coffee',
                border: OutlineInputBorder(),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Bật quy tắc sau khi lưu'),
              subtitle: const Text(
                'Quy tắc tắt vẫn giữ phiên bản nhưng không tham gia khớp.',
              ),
              value: _enabled,
              onChanged: _busy ? null : (v) => setState(() => _enabled = v),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  child: const Text('Hủy'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(editing == null ? 'Thêm quy tắc' : 'Lưu thay đổi'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
