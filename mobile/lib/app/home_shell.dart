import 'package:flutter/material.dart';

import '../features/capture/capture_page.dart' show CaptureResult;

/// Bottom-navigation shell — the reference-app layout: Tổng quan /
/// Hoạt động / [Ghi] / Kế hoạch / Báo cáo, with the center destination
/// acting as the capture action instead of a tab (MISA/Money Lover
/// pattern). Tabs are built lazily and kept alive via IndexedStack.
class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.tabBuilders,
    required this.onCaptureTap,
    required this.onCaptureSaved,
  });

  /// Builders for the four real tabs, in nav order around the center
  /// capture action: Tổng quan, Hoạt động, Kế hoạch, Báo cáo.
  final List<Widget Function()> tabBuilders;

  /// Pushes the capture flow; the shell owns no capture logic of its own.
  /// A non-null result (saved or savedPartial) reloads the tabs — a
  /// partial save still wrote a transaction the surfaces must show.
  final Future<CaptureResult?> Function(BuildContext context) onCaptureTap;

  /// Called after a capture was saved — reloads the tabs that need it.
  final VoidCallback onCaptureSaved;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  final _built = List<Widget?>.filled(4, null);
  final _visited = <int>{0};

  Future<void> _capture() async {
    final result = await widget.onCaptureTap(context);
    if (result != null) widget.onCaptureSaved();
  }

  @override
  Widget build(BuildContext context) {
    final children = List<Widget>.generate(4, (i) {
      if (!_visited.contains(i)) return const SizedBox.shrink();
      return _built[i] ??= widget.tabBuilders[i]();
    });
    return Scaffold(
      body: IndexedStack(index: _tab, children: children),
      bottomNavigationBar: NavigationBar(
        // Display index: two real tabs, capture action, two real tabs.
        selectedIndex: _tab >= 2 ? _tab + 1 : _tab,
        onDestinationSelected: (i) {
          if (i == 2) {
            _capture();
            return;
          }
          final tab = i > 2 ? i - 1 : i;
          setState(() {
            _tab = tab;
            _visited.add(tab);
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Hoạt động',
          ),
          NavigationDestination(icon: _CaptureIcon(), label: 'Ghi'),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note),
            label: 'Kế hoạch',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart),
            label: 'Báo cáo',
          ),
        ],
      ),
    );
  }
}

/// Filled-circle center action — visually the "big middle button" of the
/// reference apps without breaking NavigationBar layout.
class _CaptureIcon extends StatelessWidget {
  const _CaptureIcon();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return CircleAvatar(
      radius: 20,
      backgroundColor: scheme.primary,
      child: Icon(Icons.add, color: scheme.onPrimary, size: 26),
    );
  }
}
