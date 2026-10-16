import 'package:flutter/material.dart';

import '../../data/share/share_text_parser.dart' show foldVietnameseText;
import '../../domain/models.dart';

/// Searchable category bottom sheet — the Money Lover/Wallet picker
/// pattern. A flat dropdown stops scaling once a user has tens of
/// categories; the sheet gives them a filter and a scrollable list.
Future<Category?> showCategoryPicker(
  BuildContext context, {
  required List<Category> categories,
  String? selectedId,
}) {
  return showModalBottomSheet<Category>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) =>
        _CategorySheet(categories: categories, selectedId: selectedId),
  );
}

class _CategorySheet extends StatefulWidget {
  const _CategorySheet({required this.categories, this.selectedId});

  final List<Category> categories;
  final String? selectedId;

  @override
  State<_CategorySheet> createState() => _CategorySheetState();
}

class _CategorySheetState extends State<_CategorySheet> {
  final _query = TextEditingController();

  @override
  void initState() {
    super.initState();
    _query.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<Category> get _filtered {
    final q = foldVietnameseText(_query.text.trim());
    if (q.isEmpty) return widget.categories;
    return widget.categories
        .where((c) => foldVietnameseText(c.name).contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    // Lift the sheet above the keyboard when the user taps the search
    // field — without it the keyboard covers most of the list.
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        expand: false,
        builder: (context, scroll) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _query,
                decoration: const InputDecoration(
                  hintText: 'Tìm danh mục',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: scroll,
                itemCount: _filtered.length,
                itemBuilder: (context, i) {
                  final c = _filtered[i];
                  return ListTile(
                    title: Text(c.name),
                    trailing: c.id == widget.selectedId
                        ? const Icon(Icons.check)
                        : null,
                    onTap: () => Navigator.of(context).pop(c),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
