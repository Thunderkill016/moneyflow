import 'package:flutter/material.dart';

import '../features/capture/capture_page.dart' show CaptureResult;
import '../theme/mf_theme.dart';

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
    this.banner,
  });

  /// Builders for the four real tabs, in nav order around the center
  /// capture action: Tổng quan, Hoạt động, Kế hoạch, Báo cáo.
  final List<Widget Function()> tabBuilders;

  /// Optional strip pinned above the tab body on every tab — used for
  /// the pending-captures notice. It sits outside the scrollable tab
  /// content so per-tab offline labels keep their place.
  final Widget? banner;

  /// Pushes the capture flow; the shell owns no capture logic of its own.
  /// A non-null result (saved or savedPartial) reloads the tabs — a
  /// partial save still wrote a transaction the surfaces must show.
  final Future<CaptureResult?> Function(BuildContext context) onCaptureTap;

  /// Called after a capture was saved — reloads the tabs that need it.
  final VoidCallback onCaptureSaved;

  @override
  State<HomeShell> createState() => HomeShellState();
}

/// Tab index of the Kế hoạch destination — the dashboard's "Mở Kế
/// hoạch" nudge targets it by name, not by a bare 2.
const homeShellPlanningTab = 2;

/// Tab index the month-summary card's "Xem báo cáo tháng" selects.
const homeShellReportsTab = 3;

class HomeShellState extends State<HomeShell> {
  int _tab = 0;
  final _built = List<Widget?>.filled(4, null);
  final _visited = <int>{0};

  /// Switch tabs programmatically — the dashboard remainder card's
  /// "Mở Kế hoạch" nudge uses it so the pointer is a real destination,
  /// not a dead affordance. Out-of-range indexes are ignored.
  void selectTab(int index) {
    if (index < 0 || index >= widget.tabBuilders.length) return;
    if (index == _tab) return;
    setState(() {
      _tab = index;
      _visited.add(index);
    });
  }

  Future<void> _capture() async {
    final result = await widget.onCaptureTap(context);
    // `queued` means nothing landed — the held intent replays later and
    // its own drain report reloads the tabs then.
    if (result != null && result != CaptureResult.queued) {
      widget.onCaptureSaved();
    }
  }

  @override
  Widget build(BuildContext context) {
    final children = List<Widget>.generate(4, (i) {
      if (!_visited.contains(i)) return const SizedBox.shrink();
      return _built[i] ??= widget.tabBuilders[i]();
    });
    return Scaffold(
      body: Column(
        children: [
          // The shell owns no top inset — without SafeArea the banner
          // slides under the status bar and its action is untappable.
          if (widget.banner != null)
            SafeArea(bottom: false, child: widget.banner!),
          Expanded(
            child: IndexedStack(index: _tab, children: children),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: _FloatingNav(
          selected: _tab,
          onSelect: (tab) => setState(() {
            _tab = tab;
            _visited.add(tab);
          }),
          onCapture: _capture,
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon, this.selectedIcon);
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Floating pill navigation (Savor reference): a soft grey capsule inset
/// from the screen edges. All four destinations are equal-width cells
/// showing icon + label stacked; the active tab only changes fill colour
/// so tapping never resizes or shifts the neighbours, and the capture
/// action is a round accent button.
class _FloatingNav extends StatelessWidget {
  const _FloatingNav({
    required this.selected,
    required this.onSelect,
    required this.onCapture,
  });

  final int selected;
  final ValueChanged<int> onSelect;
  final VoidCallback onCapture;

  static const _items = [
    _NavItem('Tổng quan', Icons.home_outlined, Icons.home),
    _NavItem('Hoạt động', Icons.receipt_long_outlined, Icons.receipt_long),
    _NavItem('Kế hoạch', Icons.event_note_outlined, Icons.event_note),
    _NavItem('Báo cáo', Icons.bar_chart_outlined, Icons.bar_chart),
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final mf = context.mf;
    Widget tab(int i) {
      final item = _items[i];
      final active = i == selected;
      return Expanded(
        child: Semantics(
          button: true,
          selected: active,
          label: item.label,
          excludeSemantics: true,
          child: InkWell(
            key: ValueKey('nav:${item.label}'),
            customBorder: const StadiumBorder(),
            onTap: () => onSelect(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              height: 48,
              decoration: ShapeDecoration(
                color: active ? scheme.primary : Colors.transparent,
                shape: const StadiumBorder(),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    active ? item.selectedIcon : item.icon,
                    size: 19,
                    color: active ? scheme.onPrimary : mf.textSoft,
                  ),
                  const SizedBox(height: 1),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      item.label,
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                        color: active ? scheme.onPrimary : mf.textSoft,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: SizedBox(
        width: double.infinity,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: context.mf.navSurface,
            borderRadius: BorderRadius.circular(36),
            border: Border.all(color: mf.borderSubtle),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14000000),
                blurRadius: 24,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            // Equal-width cells: the active pill never grows, so tapping
            // a destination can never shift its neighbours.
            child: Row(
              children: [
                tab(0),
                const SizedBox(width: 8),
                tab(1),
                const SizedBox(width: 8),
                Semantics(
                  button: true,
                  label: 'Ghi',
                  excludeSemantics: true,
                  child: InkWell(
                    key: const ValueKey('nav:Ghi'),
                    customBorder: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    onTap: onCapture,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: mf.brand,
                        // Rounded square like the reference's orange "+".
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.add, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                tab(2),
                const SizedBox(width: 8),
                tab(3),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
