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
      // Every destination shows its label — the active pill only
      // changes colour, never size, so taps cannot shift neighbours.
      expect(find.text('Tổng quan'), findsOneWidget);
      expect(find.text('Hoạt động'), findsOneWidget);
      expect(find.text('Kế hoạch'), findsOneWidget);
      expect(find.text('Báo cáo'), findsOneWidget);
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

    testWidgets('selectTab switches programmatically — the dashboard '
        '"Mở Kế hoạch" nudge path', (t) async {
      final key = GlobalKey<HomeShellState>();
      await t.pumpWidget(
        MaterialApp(
          home: HomeShell(
            key: key,
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
      expect(find.text('planning-body'), findsNothing);

      key.currentState!.selectTab(homeShellPlanningTab);
      await t.pumpAndSettle();
      expect(find.text('planning-body'), findsOneWidget);

      // Out-of-range and same-tab selects are honest no-ops.
      key.currentState!.selectTab(9);
      key.currentState!.selectTab(-1);
      key.currentState!.selectTab(homeShellPlanningTab);
      await t.pumpAndSettle();
      expect(find.text('planning-body'), findsOneWidget);
      expect(find.text('reports-body'), findsNothing);
    });

    testWidgets(
      'the active destination is a neon dot, never a filled pill blob',
      (t) async {
        await t.pumpWidget(_shell());
        await t.pumpAndSettle();

        // The indicator contract: a small circle under each label, the
        // active one painted primary. The old stadium blob painted the
        // whole cell primary — assert the painted area can never come
        // back by checking no nav child carries a full-cell primary
        // ShapeDecoration.
        final dots = find.byWidgetPredicate(
          (w) =>
              w is AnimatedContainer &&
              w.decoration is BoxDecoration &&
              (w.decoration as BoxDecoration).shape == BoxShape.circle,
        );
        // Every cell keeps a dot slot laid out (transparent when
        // inactive) so selection changes never resize the bar.
        expect(dots, findsNWidgets(4));
        final primary = Theme.of(t.element(dots.first)).colorScheme.primary;
        final painted = t
            .widgetList<AnimatedContainer>(dots)
            .where((w) => (w.decoration as BoxDecoration).color == primary);
        expect(painted.length, 1);

        // Tapping another destination moves the dot, still exactly one.
        await t.tap(find.byKey(const ValueKey('nav:Báo cáo')));
        await t.pumpAndSettle();
        final paintedAfter = t
            .widgetList<AnimatedContainer>(dots)
            .where((w) => (w.decoration as BoxDecoration).color == primary);
        expect(paintedAfter.length, 1);

        // No nav cell paints a primary-filled stadium pill anymore.
        final blob = find.byWidgetPredicate(
          (w) =>
              w is AnimatedContainer &&
              w.decoration is ShapeDecoration &&
              ((w.decoration as ShapeDecoration).shape is StadiumBorder) &&
              (w.decoration as ShapeDecoration).color == primary,
        );
        expect(blob, findsNothing);
      },
    );

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
