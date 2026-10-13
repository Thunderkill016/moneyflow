import 'package:flutter/material.dart';

import '../../domain/categories.dart';
import '../../domain/models.dart';
import 'category_visuals.dart';

/// Per-item outcome of a pack run — every checked row reports its own
/// result instead of hiding behind one blanket success/failure.
enum _PackOutcome { added, exists, failed }

/// Opens the "Gói danh mục Việt Nam" picker over the categories page.
/// Resolves true when at least one category was created — tracked via a
/// callback rather than the pop value so a barrier-dismissed sheet still
/// reports the writes that already landed.
Future<bool> showVietnamCategoryPackSheet(
  BuildContext context, {
  required List<Category> existing,
  required Future<void> Function(CategoryDraft draft) onSave,
}) async {
  var added = false;
  final popped = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => VietnamCategoryPackSheet(
      existing: existing,
      onSave: onSave,
      onAdded: () => added = true,
    ),
  );
  return added || (popped ?? false);
}

/// One-tap pack sheet: every pack item listed with a pre-checked box,
/// names that already exist disabled as "Đã có" (the idempotent
/// re-open), and per-item honest outcomes after the run.
class VietnamCategoryPackSheet extends StatefulWidget {
  const VietnamCategoryPackSheet({
    super.key,
    required this.existing,
    required this.onSave,
    this.onAdded,
  });

  /// Every category incl. archived, snapshotted at open time — a name
  /// that exists (even hidden) is never re-offered for creation.
  final List<Category> existing;

  /// The same write seam the single-add dialog uses
  /// (CategoriesPage.onSave) — one awaited call per checked item.
  final Future<void> Function(CategoryDraft draft) onSave;

  /// Fired once the first create lands — the parent refreshes even when
  /// the sheet is later dismissed instead of closed via "Xong".
  final VoidCallback? onAdded;

  @override
  State<VietnamCategoryPackSheet> createState() =>
      _VietnamCategoryPackSheetState();
}

class _VietnamCategoryPackSheetState extends State<VietnamCategoryPackSheet> {
  /// Presence is decided once at open — rows can't silently flip while
  /// the user reads the list.
  late final List<bool> _exists = [
    for (final item in vietnamCategoryPack)
      categoryPackItemPresent(item, widget.existing),
  ];

  /// Everything missing starts checked: one tap on the confirm button
  /// adds the whole pack, and the boxes are the pick-and-choose opt-out.
  late final Set<int> _checked = {
    for (var i = 0; i < vietnamCategoryPack.length; i++)
      if (!_exists[i]) i,
  };

  var _running = false;
  var _addedCount = 0;

  /// index → outcome once the run finished; null before any attempt.
  Map<int, _PackOutcome>? _outcomes;
  final _failureMessages = <int, String>{};

  Future<void> _run() async {
    setState(() => _running = true);
    final outcomes = <int, _PackOutcome>{};
    // Names created during this run count as present for later items —
    // a name can never be written twice, and a row that landed on
    // another device mid-run degrades to the honest "Đã có".
    final present = [...widget.existing];
    var added = 0;
    // Set iteration is insertion-ordered, so items save in pack order.
    for (final i in _checked) {
      final item = vietnamCategoryPack[i];
      if (categoryPackItemPresent(item, present)) {
        outcomes[i] = _PackOutcome.exists;
        continue;
      }
      try {
        await widget.onSave((
          id: null,
          name: item.name,
          kind: item.kind,
          icon: item.icon,
          color: item.color,
        ));
      } catch (e) {
        outcomes[i] = _PackOutcome.failed;
        _failureMessages[i] = categoryErrorMessage(e);
        continue;
      }
      outcomes[i] = _PackOutcome.added;
      added++;
      present.add(Category(id: 'pack-$i', name: item.name, kind: item.kind));
    }
    if (added > 0) {
      _addedCount = added;
      widget.onAdded?.call();
    }
    setState(() {
      _outcomes = outcomes;
      _running = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        expand: false,
        builder: (context, scroll) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Gói danh mục Việt Nam',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Thêm các danh mục đời sống Việt Nam — tùy chọn, '
                    'có thể sửa/ẩn sau',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            if (_outcomes != null) _summaryBanner(context),
            Expanded(
              // SingleChildScrollView + Column, not a lazy ListView:
              // the pack is a fixed 8 rows, so every tile (and its
              // per-item status) is built and visible to a11y/tests.
              child: SingleChildScrollView(
                controller: scroll,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final kind in [
                      TransactionKind.expense,
                      TransactionKind.income,
                    ]) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                        child: Text(
                          categoryKindLabels[kind]!,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                      for (var i = 0; i < vietnamCategoryPack.length; i++)
                        if (vietnamCategoryPack[i].kind == kind) _itemTile(i),
                    ],
                  ],
                ),
              ),
            ),
            _actions(context),
          ],
        ),
      ),
    );
  }

  /// Post-run tally — "đã có" counts pre-existing and mid-run skips so
  /// the numbers always reconcile with the per-row statuses.
  Widget _summaryBanner(BuildContext context) {
    final outcomes = _outcomes!;
    final added = outcomes.values.where((o) => o == _PackOutcome.added).length;
    final exists = outcomes.values
        .where((o) => o == _PackOutcome.exists)
        .length;
    final failed = outcomes.values
        .where((o) => o == _PackOutcome.failed)
        .length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Text(
        'Đã thêm $added · đã có $exists'
        '${failed > 0 ? ' · lỗi $failed' : ''}',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }

  Widget _itemTile(int i) {
    final item = vietnamCategoryPack[i];
    final outcome = _outcomes?[i];
    // "Đã có" covers three honest states: present at open, skipped
    // mid-run because it just appeared, or it genuinely landed.
    final (label, failed) = switch ((outcome, _exists[i])) {
      (_PackOutcome.added, _) => ('Đã thêm', false),
      (_PackOutcome.exists, _) || (_, true) => ('Đã có', false),
      (_PackOutcome.failed, _) => (
        _failureMessages[i] ?? 'Không thể cập nhật danh mục. Hãy thử lại.',
        true,
      ),
      _ => (null, false),
    };
    return CheckboxListTile(
      value: _checked.contains(i),
      // Locked once a run starts — the outcome list must match what was
      // attempted, not what the checkbox says afterwards.
      onChanged: _exists[i] || _running || _outcomes != null
          ? null
          : (v) => setState(() {
              if (v ?? false) {
                _checked.add(i);
              } else {
                _checked.remove(i);
              }
            }),
      secondary: CircleAvatar(
        radius: 16,
        backgroundColor: categoryColor(item.color),
        child: Icon(categoryIconData(item.icon), size: 16, color: Colors.white),
      ),
      title: Text(item.name),
      subtitle: label == null
          ? null
          : Text(
              label,
              style: failed ? TextStyle(color: Colors.red.shade700) : null,
            ),
      controlAffinity: ListTileControlAffinity.trailing,
    );
  }

  Widget _actions(BuildContext context) {
    if (_outcomes != null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        child: Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: () => Navigator.pop(context, _addedCount > 0),
            child: const Text('Xong'),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: Row(
        children: [
          TextButton(
            onPressed: _running ? null : () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          const Spacer(),
          FilledButton(
            onPressed: _checked.isEmpty || _running ? null : _run,
            child: Text(
              _running ? 'Đang thêm…' : 'Thêm ${_checked.length} danh mục',
            ),
          ),
        ],
      ),
    );
  }
}
