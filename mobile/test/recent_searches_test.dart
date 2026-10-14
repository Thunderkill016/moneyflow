import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/recent_searches.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('RecentSearches', () {
    test('records newest-first and persists for a fresh load', () async {
      await RecentSearches.record('cafe');
      await RecentSearches.record('xăng');
      // The "persisted" store is the same SharedPreferences backend a
      // later page build reads — a fresh load proves the round trip.
      expect(await RecentSearches.load(), ['xăng', 'cafe']);
    });

    test(
      'dedupes case-insensitively and bumps the repeat to the top',
      () async {
        await RecentSearches.record('Cafe');
        await RecentSearches.record('xăng');
        await RecentSearches.record(' cafe ');
        expect(await RecentSearches.load(), ['cafe', 'xăng']);
      },
    );

    test('caps at five entries', () async {
      for (final q in ['a', 'b', 'c', 'd', 'e', 'f']) {
        await RecentSearches.record(q);
      }
      expect(await RecentSearches.load(), ['f', 'e', 'd', 'c', 'b']);
    });

    test('blank queries are never stored', () async {
      await RecentSearches.record('   ');
      await RecentSearches.record('');
      expect(await RecentSearches.load(), isEmpty);
    });

    test('clear empties the list', () async {
      await RecentSearches.record('cafe');
      await RecentSearches.clear();
      expect(await RecentSearches.load(), isEmpty);
    });
  });
}
