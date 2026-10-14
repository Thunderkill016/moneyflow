import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/home_shell.dart';
import 'package:moneyflow/features/capture/capture_page.dart'
    show CaptureResult;

Widget _shell({
  Future<CaptureResult?> Function(BuildContext)? onCaptureTap,
  VoidCallback? onCaptureSaved,
}) => MaterialApp(
  home: HomeShell(
    tabBuilders: [
      () => const Text('dashboard-body'),
      () => const Text('activity-body'),
      () => const Text('planning-body'),
      () => const Text('reports-body'),
    ],
    onCaptureTap: onCaptureTap ?? (_) async => null,
    onCaptureSaved: onCaptureSaved ?? () {},
  ),
);

void main() {
  group('HomeShell', () {
    testWidgets('renders five destinations with the center capture action', (
      t,
    ) async {
      await t.pumpWidget(_shell());
      await t.pumpAndSettle();

      for (final label in [
        'Tổng quan',
        'Hoạt động',
        'Ghi',
        'Kế hoạch',
        'Báo cáo',
      ]) {
        expect(find.byKey(ValueKey('nav:$label')), findsOneWidget);
      }
      // Only the active destination shows its label (icon-only otherwise).
      expect(find.text('Tổng quan'), findsOneWidget);
      expect(find.text('Hoạt động'), findsNothing);
      // First tab renders eagerly.
      expect(find.text('dashboard-body'), findsOneWidget);
      // Unvisited tabs stay unbuilt.
      expect(find.text('planning-body'), findsNothing);
    });

    testWidgets('destination taps build and switch tabs lazily', (t) async {
      await t.pumpWidget(_shell());
      await t.pumpAndSettle();

      await t.tap(find.byKey(const ValueKey('nav:Kế hoạch')));
      await t.pumpAndSettle();
      expect(find.text('planning-body'), findsOneWidget);

      // IndexedStack keeps visited tabs mounted but offstage.
      expect(find.text('dashboard-body', skipOffstage: false), findsOneWidget);

      await t.tap(find.byKey(const ValueKey('nav:Báo cáo')));
      await t.pumpAndSettle();
      expect(find.text('reports-body'), findsOneWidget);
    });

    testWidgets('center action invokes capture without switching tabs', (
      t,
    ) async {
      var captureCalls = 0;
      var savedCalls = 0;
      await t.pumpWidget(
        _shell(
          onCaptureTap: (_) async {
            captureCalls++;
            return CaptureResult.saved;
          },
          onCaptureSaved: () => savedCalls++,
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.byKey(const ValueKey('nav:Ghi')));
      await t.pumpAndSettle();

      expect(captureCalls, 1);
      expect(savedCalls, 1);
      // Still on the dashboard tab — capture is an action, not a tab.
      expect(find.text('dashboard-body'), findsOneWidget);
    });

    testWidgets('a cancelled capture does not trigger onCaptureSaved', (
      t,
    ) async {
      var savedCalls = 0;
      await t.pumpWidget(
        _shell(
          onCaptureTap: (_) async => null,
          onCaptureSaved: () => savedCalls++,
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.byKey(const ValueKey('nav:Ghi')));
      await t.pumpAndSettle();
      expect(savedCalls, 0);
    });

    testWidgets('a queued capture does not trigger onCaptureSaved', (t) async {
      var savedCalls = 0;
      await t.pumpWidget(
        _shell(
          onCaptureTap: (_) async => CaptureResult.queued,
          onCaptureSaved: () => savedCalls++,
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.byKey(const ValueKey('nav:Ghi')));
      await t.pumpAndSettle();
      // Nothing landed — reloading would only show an offline error.
      expect(savedCalls, 0);
    });

    testWidgets('the banner slot renders above the tabs', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: HomeShell(
            banner: const Text('pending-banner'),
            tabBuilders: [
              () => const Text('dashboard-body'),
              () => const Text('activity-body'),
              () => const Text('planning-body'),
              () => const Text('reports-body'),
            ],
            onCaptureTap: (_) async => null,
            onCaptureSaved: () {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('pending-banner'), findsOneWidget);
      expect(find.text('dashboard-body'), findsOneWidget);
    });
  });
}
