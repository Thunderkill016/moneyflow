// Sync contract for lib/data/recurring_dismissals.dart: server ∪ local
// merge on load (server rows always count), write-through on dismiss,
// and honest local-only degradation when the network is down.

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/data/recurring_dismissals.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'neon_client_test.dart' show FakeTransport, config, fakeJwt;

class _FakeSync extends PatternDismissalSync {
  _FakeSync({this.serverKeys = const {}, this.failReads = false});

  Set<String> serverKeys;
  bool failReads;
  bool failWrites = false;
  final pushed = <List<String>>[];

  @override
  Future<Set<String>> loadRecurringDismissedKeys() async {
    if (failReads) throw StateError('offline');
    return serverKeys;
  }

  @override
  Future<void> dismissRecurringKeys(List<String> keys) async {
    pushed.add(keys);
    if (failWrites) throw StateError('offline');
    serverKeys = {...serverKeys, ...keys};
  }
}

Future<List<String>?> _stored() async => (await SharedPreferences.getInstance())
    .getStringList('mf_recurring_dismissed');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('local-only mode (no sync seam)', () {
    test('load returns the stored keys', () async {
      SharedPreferences.setMockInitialValues({
        'mf_recurring_dismissed': ['deadbeef'],
      });
      expect(await RecurringDismissals.load(), {'deadbeef'});
    });

    test('dismiss appends once and stays put', () async {
      await RecurringDismissals.dismiss('deadbeef');
      await RecurringDismissals.dismiss('deadbeef');
      expect(await _stored(), ['deadbeef']);
      expect(await RecurringDismissals.load(), {'deadbeef'});
    });
  });

  group('server merge', () {
    test('load unions server and local, persisting the merge', () async {
      SharedPreferences.setMockInitialValues({
        'mf_recurring_dismissed': ['aabbccdd'],
      });
      final sync = _FakeSync(serverKeys: {'deadbeef', '11223344'});
      expect(await RecurringDismissals.load(sync: sync), {
        'aabbccdd',
        'deadbeef',
        '11223344',
      });
      // The merged set lands locally too — the next offline open keeps
      // the server-known keys hidden.
      expect(await _stored(), ['11223344', 'aabbccdd', 'deadbeef']);
    });

    test(
      'load re-publishes keys the server lacks (offline dismissals)',
      () async {
        SharedPreferences.setMockInitialValues({
          'mf_recurring_dismissed': ['aabbccdd'],
        });
        final sync = _FakeSync(serverKeys: {'deadbeef'});
        await RecurringDismissals.load(sync: sync);
        expect(sync.pushed, [
          ['aabbccdd'],
        ]);
        expect(sync.serverKeys, contains('aabbccdd'));
      },
    );

    test('load does not repush keys the server already knows', () async {
      SharedPreferences.setMockInitialValues({
        'mf_recurring_dismissed': ['deadbeef'],
      });
      final sync = _FakeSync(serverKeys: {'deadbeef'});
      await RecurringDismissals.load(sync: sync);
      expect(sync.pushed, isEmpty);
    });

    test(
      'a failed resync push keeps the local row for the next load',
      () async {
        SharedPreferences.setMockInitialValues({
          'mf_recurring_dismissed': ['aabbccdd'],
        });
        final sync = _FakeSync(serverKeys: {'deadbeef'})..failWrites = true;
        expect(await RecurringDismissals.load(sync: sync), {
          'aabbccdd',
          'deadbeef',
        });
        expect(await _stored(), contains('aabbccdd'));
      },
    );
  });

  group('honest degradation', () {
    test(
      'a failed server read serves local only — and pushes nothing',
      () async {
        SharedPreferences.setMockInitialValues({
          'mf_recurring_dismissed': ['aabbccdd'],
        });
        final sync = _FakeSync(failReads: true);
        expect(await RecurringDismissals.load(sync: sync), {'aabbccdd'});
        expect(sync.pushed, isEmpty);
      },
    );

    test('dismiss while the server write fails keeps the local fact', () async {
      final sync = _FakeSync()..failWrites = true;
      await RecurringDismissals.dismiss('deadbeef', sync: sync);
      expect(await _stored(), ['deadbeef']);
      expect(sync.pushed, [
        ['deadbeef'],
      ]);
      // Next open republishes it — the resync path does the healing.
      sync.failWrites = false;
      await RecurringDismissals.load(sync: sync);
      expect(sync.serverKeys, contains('deadbeef'));
    });
  });

  group('write-through', () {
    test('dismiss stores locally and calls the server in one shot', () async {
      final sync = _FakeSync();
      await RecurringDismissals.dismiss('deadbeef', sync: sync);
      expect(await _stored(), ['deadbeef']);
      expect(sync.pushed, [
        ['deadbeef'],
      ]);
      expect(sync.serverKeys, {'deadbeef'});
    });
  });

  group('RealStore wire contract', () {
    Future<RealStore> signedInStore(FakeTransport t) async {
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      return RealStore(
        NeonDataApi(config: config, auth: auth, requester: t.requester),
      );
    }

    void signInOk(FakeTransport t) => t.queue.add(
      FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );

    void jwtOk(FakeTransport t) => t.queue.add(
      FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
    );

    test('loadRecurringDismissedKeys selects the recurring scope', () async {
      final t = FakeTransport();
      signInOk(t);
      jwtOk(t);
      t.queue.add(
        FakeTransport.json(200, [
          {'pattern_key': 'deadbeef'},
          {'pattern_key': 'aabbccdd'},
        ]),
      );
      final store = await signedInStore(t);
      expect(await store.loadRecurringDismissedKeys(), {
        'deadbeef',
        'aabbccdd',
      });
      final url = t.requests.last.url.toString();
      expect(url, contains('/pattern_dismissals'));
      expect(url, contains('scope=eq.recurring'));
      expect(url, contains('select=pattern_key'));
    });

    test('dismissRecurringKeys posts the security-definer RPC', () async {
      final t = FakeTransport();
      signInOk(t);
      jwtOk(t);
      t.queue.add(FakeTransport.json(200, 1));
      final store = await signedInStore(t);
      await store.dismissRecurringKeys(['deadbeef']);
      final req = t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.toString(), contains('/rpc/dismiss_pattern_keys'));
      expect(req.body, {
        'p_scope': 'recurring',
        'p_keys': ['deadbeef'],
      });
    });
  });
}
