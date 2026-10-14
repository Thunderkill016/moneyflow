import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/session_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The session token lives in flutter_secure_storage; plain
/// SharedPreferences only ever holds a pre-migration copy that read()
/// moves across once. The plugin's setMockInitialValues swaps in an
/// in-memory platform, so these tests exercise the real migration code.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  Future<String?> secureRead(String key) =>
      const FlutterSecureStorage().read(key: key);

  group('SessionStore', () {
    test('read returns null when nothing was stored', () async {
      expect(await SessionStore.read(), isNull);
    });

    test('write stores token+userId in secure storage only', () async {
      await SessionStore.write('tok-1', userId: 'u-1');
      expect(await secureRead('neon.session_token'), 'tok-1');
      expect(await secureRead('neon.user_id'), 'u-1');
      // The credential must not exist in plaintext prefs too.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('neon.session_token'), isNull);
      expect(prefs.getString('neon.user_id'), isNull);

      final stored = await SessionStore.read();
      expect(stored?.token, 'tok-1');
      expect(stored?.userId, 'u-1');
    });

    test(
      'read migrates a legacy plaintext session into secure storage',
      () async {
        SharedPreferences.setMockInitialValues({
          'neon.session_token': 'legacy-tok',
          'neon.user_id': 'u-legacy',
        });
        final stored = await SessionStore.read();
        expect(stored?.token, 'legacy-tok');
        expect(stored?.userId, 'u-legacy');

        // Migrated: secure holds it, the plaintext keys are gone.
        expect(await secureRead('neon.session_token'), 'legacy-tok');
        expect(await secureRead('neon.user_id'), 'u-legacy');
        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getString('neon.session_token'), isNull);
        expect(prefs.getString('neon.user_id'), isNull);
      },
    );

    test('a secure value wins over a stale legacy copy', () async {
      SharedPreferences.setMockInitialValues({'neon.session_token': 'old'});
      await SessionStore.write('fresh', userId: 'u-2');
      // write() already dropped the plaintext; secure wins either way.
      expect((await SessionStore.read())?.token, 'fresh');
    });

    test('clear removes both stores\' copies', () async {
      await SessionStore.write('tok', userId: 'u');
      SharedPreferences.setMockInitialValues({
        'neon.session_token': 'leftover-plaintext',
      });
      await SessionStore.clear();
      expect(await secureRead('neon.session_token'), isNull);
      expect(await secureRead('neon.user_id'), isNull);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('neon.session_token'), isNull);
    });
  });
}
