// Bank-notification capture pilot — parser coverage over realistic VN
// bank/wallet texts, dedupe determinism, the controller's opt-in/best-
// effort contract, the store's RPC payload, and the consent surface's
// honest state rendering.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/data/notification_capture/bank_notification_parser.dart';
import 'package:moneyflow/data/notification_capture/notification_capture_channel.dart';
import 'package:moneyflow/data/notification_capture/notification_capture_controller.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/notification_capture/notification_capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _pkg = 'com.VCB';
const _label = 'Vietcombank';
const _t0 =
    1791858600000; // 2026-10-13 02:30 UTC — fixed for deterministic keys/dates

BankNotificationDraft? parse(String text, {String? title}) =>
    parseBankNotification(
      packageName: _pkg,
      sourceLabel: _label,
      title: title ?? _label,
      text: text,
      postTimeMs: _t0,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // The session token lives in secure storage — an empty mock keeps
  // AuthGate's restore off the platform channel; the prefs-seeded token
  // in the menu tests then exercises the real migration path.
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  group('bank notification parser', () {
    test('VCB debit — masked account, grouped amount, SD balance tail', () {
      final d = parse('TK 001xxxx GD -50,000VND SD 10,450,000');
      expect(d, isNotNull);
      expect(d!.kind, TransactionKind.expense);
      expect(d.amountMinor, 50000);
      expect(d.accountName, 'Vietcombank 001xxxx');
      expect(d.rawSnippet, contains('-50,000VND'));
      expect(d.dedupeKey, startsWith('notif:'));
    });

    test('MoMo expense — đ suffix + known merchant', () {
      final d = parseBankNotification(
        packageName: 'com.mservice.momotransfer',
        sourceLabel: 'MoMo',
        title: 'MoMo',
        text: 'Bạn vừa chi -120.000đ tại Grab',
        postTimeMs: _t0,
      )!;
      expect(d.kind, TransactionKind.expense);
      expect(d.amountMinor, 120000);
      expect(d.merchant, 'Grab');
      expect(d.accountName, 'MoMo'); // no masked tail → source label only
    });

    test('a 20+-digit run drops the event instead of crashing', () {
      // audit P1-2: "GD -99999999999999999999" overflows int64 — the
      // honest outcome is no candidate, not a crash and not a wrapped
      // amount. The notification is dropped like every other parse fail.
      expect(parse('GD -99999999999999999999 VND'), isNull);
      // A real amount next to a serial still parses the real amount.
      final d = parse('TK 001xxxx GD -50,000VND REF 99999999999999999999');
      expect(d, isNotNull);
      expect(d!.amountMinor, 50000);
    });

    test('MB balance-change wording + ND note extraction', () {
      final d = parseBankNotification(
        packageName: 'com.mbmobile',
        sourceLabel: 'MB Bank',
        title: 'MB Bank',
        text: 'SD TK xxx thay doi -350,000 VND. ND: TIEN NHA',
        postTimeMs: _t0,
      )!;
      expect(d.kind, TransactionKind.expense);
      expect(d.amountMinor, 350000);
      expect(d.note, 'TIEN NHA');
      expect(d.accountName, 'MB Bank'); // all-masked tail proves nothing
    });

    test('Techcombank credit — plus sign, account tail, note', () {
      final d = parseBankNotification(
        packageName: 'vn.com.techcombank.bb.app',
        sourceLabel: 'Techcombank',
        title: 'Techcombank',
        text: 'Số dư TK 1903xxxx +2,000,000 VND. ND: chuyen tien',
        postTimeMs: _t0,
      )!;
      expect(d.kind, TransactionKind.income);
      expect(d.amountMinor, 2000000);
      expect(d.accountName, 'Techcombank 1903xxxx');
      expect(d.note, 'chuyen tien');
    });

    test('English credit notification', () {
      final d = parse('Your account received +500,000 VND from NGUYEN VAN A')!;
      expect(d.kind, TransactionKind.income);
      expect(d.amountMinor, 500000);
    });

    test('k-shorthand credit', () {
      final d = parse('GD +75k tai HIGHLANDS')!;
      expect(d.kind, TransactionKind.income);
      expect(d.amountMinor, 75000);
      expect(d.merchant, 'Highlands Coffee');
    });

    test('tr-shorthand decimal debit beats the SD balance', () {
      final d = parse('TK xxxx1234 -1.2tr qua QR. SD: 5tr')!;
      expect(d.kind, TransactionKind.expense);
      expect(d.amountMinor, 1200000);
      expect(d.accountName, 'Vietcombank xxxx1234');
    });

    test('ZaloPay payment — đ suffix + known merchant', () {
      final d = parseBankNotification(
        packageName: 'vn.com.vng.zalopay',
        sourceLabel: 'ZaloPay',
        title: 'ZaloPay',
        text: 'Giao dịch thành công -85.000đ tại CIRCLE K',
        postTimeMs: _t0,
      )!;
      expect(d.kind, TransactionKind.expense);
      expect(d.amountMinor, 85000);
      expect(d.merchant, 'Circle K');
    });

    test('cash-withdrawal phrasing still parses the movement', () {
      final d = parse('TK xxx- rut tien mat -2,000,000d. SD 8,000,000d')!;
      expect(d.kind, TransactionKind.expense);
      expect(d.amountMinor, 2000000);
    });

    test('naked transfer line stays reviewable, not silent', () {
      final d = parse('Quý khách đã chuyển 300.000đ đến NGUYEN THI B')!;
      // 'chuyển' alone can't prove expense vs transfer — low confidence
      // flags it for the reviewer instead of guessing.
      expect(d.amountMinor, 300000);
      expect(d.confidence, 'low');
    });

    test('occurred_on falls back to the VN date of postTime', () {
      // 2026-10-13 02:30 UTC = 09:30 in Vietnam (UTC+7).
      final d = parse('GD -50,000VND', title: 'VCB')!;
      expect(d.occurredOn, '2026-10-13');
    });

    test('no amount → null (a draft needs provable money)', () {
      expect(parse('Nhắc thanh toán hóa đơn điện ngày 25'), isNull);
      expect(parse('Chào bạn! Cập nhật app để nhận ưu đãi'), isNull);
    });

    test('OTP/verification traffic never becomes a fake amount draft', () {
      expect(parse('OTP cua ban la 483920'), isNull);
      expect(parse('Ma xac minh cua ban: 104920'), isNull);
      expect(parse('Your verification code is 881122'), isNull);
      expect(parse('Ma PIN moi da duoc thiet lap'), isNull);
    });

    test('merchant falls back to the source label, never "Không rõ"', () {
      final d = parseBankNotification(
        packageName: 'vn.com.vng.zalopay',
        sourceLabel: 'ZaloPay',
        title: 'ZaloPay',
        text: '-99.000đ',
        postTimeMs: _t0,
      )!;
      expect(d.merchant, 'ZaloPay');
      expect(d.merchant, isNot('Không rõ'));
    });
  });

  group('dedupe key', () {
    test('same package + minute + content → same key', () {
      final a = notificationDedupeKey(
        packageName: _pkg,
        title: 'VCB',
        text: 'GD -50,000VND',
        postTimeMs: _t0,
      );
      final b = notificationDedupeKey(
        packageName: _pkg,
        title: 'VCB',
        text: 'GD -50,000VND',
        postTimeMs: _t0 + 30 * 1000, // same minute
      );
      expect(a, b);
    });

    test('minute boundary, package or content change → different key', () {
      final base = notificationDedupeKey(
        packageName: _pkg,
        title: 'VCB',
        text: 'GD -50,000VND',
        postTimeMs: _t0,
      );
      expect(
        notificationDedupeKey(
          packageName: _pkg,
          title: 'VCB',
          text: 'GD -50,000VND',
          postTimeMs: _t0 + 60 * 1000,
        ),
        isNot(base),
      );
      expect(
        notificationDedupeKey(
          packageName: 'com.mbmobile',
          title: 'VCB',
          text: 'GD -50,000VND',
          postTimeMs: _t0,
        ),
        isNot(base),
      );
      expect(
        notificationDedupeKey(
          packageName: _pkg,
          title: 'VCB',
          text: 'GD -51,000VND',
          postTimeMs: _t0,
        ),
        isNot(base),
      );
    });

    test('diacritic/whitespace differences still dedupe', () {
      final a = notificationDedupeKey(
        packageName: _pkg,
        title: 'VCB',
        text: 'Số dư   thay đổi -50.000đ',
        postTimeMs: _t0,
      );
      final b = notificationDedupeKey(
        packageName: _pkg,
        title: 'VCB',
        text: 'so du thay doi -50.000d',
        postTimeMs: _t0,
      );
      expect(a, b);
    });
  });

  group('controller', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    Future<void> getPrefs() => SharedPreferences.getInstance();

    NotificationCaptureController controller(_FakeGateway gw) =>
        // These tests cover parse/dedup/counting — keep the submit path
        // off so stats stay honest regardless of the build default.
        NotificationCaptureController(
          gateway: gw,
          submitEnabled: false,
          submit: (_) async {},
        );

    RawBankNotification raw(String text, {int? postTimeMs}) =>
        RawBankNotification(
          packageName: _pkg,
          sourceLabel: _label,
          title: _label,
          text: text,
          postTimeMs: postTimeMs ?? _t0,
        );

    test(
      'signed-out events are dropped — nothing persists unattributed',
      () async {
        final gw = _FakeGateway(pending: [raw('GD -50,000VND')]);
        final c = controller(gw);
        await getPrefs();
        await c.bind(null);
        await c.flushPending();
        expect(gw.consumeCalls, 0); // never even drained while unbound
        expect(c.stats.received, 0);
      },
    );

    test('opt-in OFF drops events before parsing', () async {
      final gw = _FakeGateway(pending: [raw('GD -50,000VND')]);
      final c = controller(gw);
      await getPrefs();
      await c.bind('u1');
      expect(c.stats.received, 0);
    });

    test(
      'enabled + bound: parses, dedupes re-broadcasts, counts honestly',
      () async {
        final gw = _FakeGateway(
          pending: [
            raw('TK 001xxxx GD -50,000VND SD 10,450,000'),
            raw('TK 001xxxx GD -50,000VND SD 10,450,000'), // re-broadcast
            raw('OTP cua ban la 483920'), // parse failure
          ],
        );
        final c = controller(gw);
        await getPrefs();
        await c.setEnabled(true);
        await c.bind('u1');
        expect(c.stats.received, 2); // first + the OTP, dedup ate the copy
        expect(c.stats.parsed, 1);
        expect(c.stats.parseFailed, 1);
        expect(c.stats.submitted, 0); // flag off — nothing submitted
      },
    );

    test('submitEnabled path submits parsed drafts once', () async {
      final gw = _FakeGateway(
        pending: [raw('GD -50,000VND'), raw('GD -50,000VND')],
      );
      final submitted = <BankNotificationDraft>[];
      final c = NotificationCaptureController(
        gateway: gw,
        submitEnabled: true,
        submit: (drafts) async => submitted.addAll(drafts),
      );
      await getPrefs();
      await c.setEnabled(true);
      await c.bind('u1');
      expect(submitted, hasLength(1));
      expect(submitted.single.amountMinor, 50000);
      expect(c.stats.submitted, 1);
    });

    test('live stream events flow through the same pipeline', () async {
      final gw = _FakeGateway();
      final submitted = <BankNotificationDraft>[];
      final c = NotificationCaptureController(
        gateway: gw,
        submitEnabled: true,
        submit: (drafts) async => submitted.addAll(drafts),
      )..start();
      await getPrefs();
      await c.setEnabled(true);
      await c.bind('u1');
      gw.emit(raw('GD -99,000VND'));
      await pumpEventQueue(times: 30);
      expect(submitted.single.amountMinor, 99000);
      await c.dispose();
    });

    test(
      'a rebind mid-handle never submits the old owner\'s event under the new account',
      () async {
        // Repro of the reviewed race: the event arrives while A is bound
        // and its handler is already in-flight inside the isEnabled
        // await; bind(B) lands in that window. The draft belongs to A —
        // it must not go out under B's session. A sync stream starts
        // _handle inside emit() so the yield window is deterministic.
        var sessionOwner = 'A'; // the live auth session, like _store's
        final submittedUnder = <String>[];
        final gw = _FakeGateway(syncEvents: true);
        final c = NotificationCaptureController(
          gateway: gw,
          submitEnabled: true,
          submit: (drafts) async => submittedUnder.add(sessionOwner),
        )..start();
        await getPrefs();
        await c.setEnabled(true);
        await c.bind('A');
        gw.emit(raw('GD -50,000VND')); // handler in-flight under A
        sessionOwner = 'B';
        await c.bind('B');
        await pumpEventQueue(times: 30);
        expect(submittedUnder, isNot(contains('B')));
        await c.dispose();
      },
    );

    test(
      'a parked flush abandons remaining events on rebind instead of reattributing them',
      () async {
        // Two events parked under A; B binds mid-flush — neither may be
        // submitted under B's session.
        var sessionOwner = 'A';
        final submittedUnder = <String>[];
        final gw = _FakeGateway(
          pending: [raw('GD -10,000VND'), raw('GD -20,000VND')],
          pendingOwner: 'A',
          syncEvents: true,
        );
        var gate = 0;
        late final NotificationCaptureController c;
        c = NotificationCaptureController(
          gateway: gw,
          submitEnabled: true,
          submit: (drafts) async {
            gate++;
            if (gate == 1) await c.bind('B'); // rebind inside first submit
            submittedUnder.add(sessionOwner);
          },
        )..start();
        await getPrefs();
        await c.setEnabled(true);
        await c.bind('A');
        sessionOwner = 'B';
        await pumpEventQueue(times: 30);
        expect(submittedUnder, isNot(contains('B')));
        await c.dispose();
      },
    );

    test(
      'parked raw events never answer to a different account\'s bind',
      () async {
        // The reviewed native gap: A's parked events must be dropped,
        // not served, when B's session opens. The fake mirrors the
        // bridge's owner check — consumePending(userId) only answers to
        // the recorded disk owner, and setCaptureSession drops the queue
        // on an owner change.
        final gw = _FakeGateway(
          pending: [raw('GD -50,000VND')],
          pendingOwner: 'A',
        );
        var parsed = 0;
        final c = NotificationCaptureController(
          gateway: gw,
          submitEnabled: true,
          submit: (_) async => parsed++,
        )..start();
        await getPrefs();
        await c.setEnabled(true);
        await c.bind('B'); // B's session — A's parked event must die unread
        await pumpEventQueue(times: 30);
        expect(gw.consumeCalls, greaterThan(0));
        expect(parsed, 0);
        expect(c.stats.received, 0);
        await c.dispose();
      },
    );

    test(
      'a held draft survives controller recreation — durable outbox drains on the next bind',
      () async {
        // The reviewed loss: submit fails offline, the process dies, the
        // event was already marked seen — previously the draft was gone.
        // With the durable outbox the next bind's drain still submits
        // it, and a re-broadcast of the same event dedupes instead of
        // double-posting.
        final submitted = <BankNotificationDraft>[];
        var offline = true;
        Future<void> submit(List<BankNotificationDraft> drafts) async {
          if (offline) throw const SocketException('offline');
          submitted.addAll(drafts);
        }

        final gw = _FakeGateway(syncEvents: true);
        final c1 = NotificationCaptureController(
          gateway: gw,
          submitEnabled: true,
          submit: submit,
        )..start();
        await getPrefs();
        await c1.setEnabled(true);
        await c1.bind('u1');
        gw.emit(raw('GD -50,000VND'));
        await pumpEventQueue(times: 30);
        expect(submitted, isEmpty); // held, not delivered

        // Process death → new controller, same prefs, same account.
        await c1.dispose(); // single-subscription stream: c1 must let go first
        offline = false;
        final c2 = NotificationCaptureController(
          gateway: gw,
          submitEnabled: true,
          submit: submit,
        )..start();
        await c2.bind('u1');
        await pumpEventQueue(times: 30);
        expect(submitted.single.amountMinor, 50000);

        // A re-broadcast after recovery dedupes — no double draft.
        gw.emit(raw('GD -50,000VND'));
        await pumpEventQueue(times: 30);
        expect(submitted, hasLength(1));
        await c2.dispose();
      },
    );

    test('queueable submit failure holds the draft for retry', () async {
      var calls = 0;
      final gw = _FakeGateway(pending: [raw('GD -50,000VND')]);
      final c = NotificationCaptureController(
        gateway: gw,
        submitEnabled: true,
        submit: (drafts) async {
          calls++;
          if (calls == 1) throw const SocketException('offline');
        },
      );
      await getPrefs();
      await c.setEnabled(true);
      await c.bind('u1');
      expect(calls, 2); // held draft retried on bind, then landed
      expect(c.stats.submitted, 1);
      expect(c.stats.dropped, 0);
    });

    test('business rejection drops honestly — no infinite retry', () async {
      var calls = 0;
      final gw = _FakeGateway(pending: [raw('GD -50,000VND')]);
      final c = NotificationCaptureController(
        gateway: gw,
        submitEnabled: true,
        submit: (drafts) async {
          calls++;
          throw NeonAuthException(400, 'PGRST202 function not found');
        },
      );
      await getPrefs();
      await c.setEnabled(true);
      await c.bind('u1');
      expect(calls, 1);
      expect(c.stats.dropped, 1);
      expect(c.stats.submitted, 0);
    });

    test(
      'dedupe ring persists per account — other accounts unaffected',
      () async {
        final gw = _FakeGateway(pending: [raw('GD -50,000VND')]);
        final c = controller(gw)..start();
        await getPrefs();
        await c.setEnabled(true);
        await c.bind('u1');
        expect(c.stats.received, 1);
        // Rebind same account — the persisted ring still dedupes.
        gw.pending = [raw('GD -50,000VND')];
        await c.bind('u1');
        expect(c.stats.received, 1);
        // Another account must NOT inherit u1's parked raw text — the
        // owner-scoped pending contract drops it unread on the swap.
        gw.pending = [raw('GD -50,000VND')];
        await c.bind('u2');
        expect(c.stats.received, 0);
        // ...but u2's own dedupe ring is fresh: the same notification
        // arriving LIVE under u2 counts as u2's own evidence.
        gw.emit(raw('GD -50,000VND'));
        await pumpEventQueue(times: 30);
        expect(c.stats.received, 1);
      },
    );
  });

  group('store RPC payload', () {
    test(
      'create_inbox_candidates carries notification source + dedupe id',
      () async {
        final harness = _Harness();
        await harness.signIn();
        final draft = parse('TK 001xxxx GD -50,000VND SD 10,450,000')!;
        harness.t.queue.add(
          _FakeTransport.json(200, [
            {'id': 'c1'},
          ]),
        );
        final count = await harness.store.createNotificationCandidates([draft]);
        expect(count, 1);

        final req = harness.t.requests.last;
        expect(req.url.path, '/neondb/rest/v1/rpc/create_inbox_candidates');
        final body = req.body as Map<String, dynamic>;
        final list = body['p_candidates'] as List;
        expect(list, hasLength(1));
        final c = list.single as Map<String, dynamic>;
        expect(c['source'], 'notification');
        expect(c['kind'], 'expense');
        expect(c['amount_minor'], 50000);
        expect(c['occurred_on'], '2026-10-13');
        expect(c['source_external_id'], draft.dedupeKey);
        expect(c['source_external_id'], startsWith('notif:'));
        expect(c['parser_version'], 'notif_capture@1.0');
        expect(c['account_name'], 'Vietcombank 001xxxx');
        expect(c['raw_snippet'], contains('-50,000VND'));
        expect(c.containsKey('local_id'), isFalse); // RPC refuses it by design
        expect(c.containsKey('status'), isFalse); // server hardcodes pending
      },
    );

    test(
      'incomplete response is an honest failure, not a silent half-write',
      () async {
        final harness = _Harness();
        await harness.signIn();
        harness.t.queue.add(_FakeTransport.json(200, <Object?>[]));
        expect(
          () => harness.store.createNotificationCandidates([
            parse('GD -50,000VND')!,
          ]),
          throwsFormatException,
        );
      },
    );
  });

  group('consent page', () {
    // The page body is a lazy ListView and the primary button sits below
    // the 800x600 test fold — scroll until it exists before asserting.
    Future<void> scrollToButton(WidgetTester t) => t.scrollUntilVisible(
      find.byType(FilledButton),
      160,
      scrollable: find.byType(Scrollable),
    );

    testWidgets('permission OFF shows honest state + settings deep link', (
      t,
    ) async {
      final gw = _FakeGateway()..accessEnabled = false;
      final controller = NotificationCaptureController(
        gateway: gw,
        submit: (_) async {},
      );
      await t.pumpWidget(
        MaterialApp(
          home: NotificationCapturePage(gateway: gw, controller: controller),
        ),
      );
      await t.pumpAndSettle();

      // Assert above-the-fold copy first — scrolling to the button pushes
      // the mid-page bullets out of the lazy viewport again.
      expect(find.text('Tắt'), findsOneWidget);
      // Honest coverage copy — never claims more than the whitelist.
      expect(find.text('2 nguồn được hỗ trợ'), findsOneWidget);
      expect(
        find.textContaining('MoneyFlow không tự ghi vào sổ'),
        findsOneWidget,
      );
      await scrollToButton(t);
      expect(find.text('Bật thu gom — mở Cài đặt'), findsOneWidget);

      await t.tap(find.text('Bật thu gom — mở Cài đặt'));
      await t.pumpAndSettle();
      expect(gw.openSettingsCalls, 1);
    });

    testWidgets('granted + opted-in shows active state and can disable', (
      t,
    ) async {
      SharedPreferences.setMockInitialValues({
        NotificationCaptureController.enabledKey: true,
      });
      final gw = _FakeGateway()..accessEnabled = true;
      final controller = NotificationCaptureController(
        gateway: gw,
        submit: (_) async {},
      );
      await t.pumpWidget(
        MaterialApp(
          home: NotificationCapturePage(gateway: gw, controller: controller),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Đang bật'), findsOneWidget);
      await scrollToButton(t);
      expect(find.text('Tắt thu gom'), findsOneWidget);

      await t.tap(find.text('Tắt thu gom'));
      await t.pumpAndSettle();
      expect(await controller.isEnabled(), isFalse);
      // The status card is back above the fold — scroll up to it.
      await t.scrollUntilVisible(
        find.text('Đã cấp quyền · tắt trong app'),
        -400,
        scrollable: find.byType(Scrollable),
      );
    });

    testWidgets('granted but not opted: one tap enables in-app', (t) async {
      final gw = _FakeGateway()..accessEnabled = true;
      final controller = NotificationCaptureController(
        gateway: gw,
        submit: (_) async {},
      );
      await t.pumpWidget(
        MaterialApp(
          home: NotificationCapturePage(gateway: gw, controller: controller),
        ),
      );
      await t.pumpAndSettle();
      await scrollToButton(t);
      expect(find.text('Bật thu gom'), findsOneWidget);

      await t.tap(find.text('Bật thu gom'));
      await t.pumpAndSettle();
      expect(await controller.isEnabled(), isTrue);
      await t.scrollUntilVisible(
        find.text('Đang bật'),
        -400,
        scrollable: find.byType(Scrollable),
      );
    });
  });

  group('dashboard menu item', () {
    testWidgets('menu shows the entry with OFF state when not enabled', (
      t,
    ) async {
      HttpOverrides.global = _OfflineHttp();
      addTearDown(() => HttpOverrides.global = null);
      SharedPreferences.setMockInitialValues({
        'neon.session_token': 'saved-token',
      });
      final gw = _FakeGateway()..accessEnabled = false;
      await t.pumpWidget(
        MaterialApp(
          home: AuthGate(
            shareReceiver: const _NoopShare(),
            quickActions: const _NoopQuick(),
            notificationGateway: gw,
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.byType(PopupMenuButton<int>));
      await t.pumpAndSettle();
      expect(find.text('Thu gom thông báo ngân hàng'), findsOneWidget);
      expect(find.textContaining('đang bật'), findsNothing);
    });

    testWidgets('enabled label shows the real source count', (t) async {
      HttpOverrides.global = _OfflineHttp();
      addTearDown(() => HttpOverrides.global = null);
      SharedPreferences.setMockInitialValues({
        'neon.session_token': 'saved-token',
        NotificationCaptureController.enabledKey: true,
      });
      final gw = _FakeGateway()..accessEnabled = true;
      await t.pumpWidget(
        MaterialApp(
          home: AuthGate(
            shareReceiver: const _NoopShare(),
            quickActions: const _NoopQuick(),
            notificationGateway: gw,
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.byType(PopupMenuButton<int>));
      await t.pumpAndSettle();
      expect(
        find.text('Thu gom thông báo · đang bật (2 nguồn)'),
        findsOneWidget,
      );
    });
  });
}

/// Two-source fake — the page's "N nguồn" copy follows whatever the
/// platform reports, so tests pin the count too.
class _FakeGateway extends NotificationCaptureGateway {
  _FakeGateway({
    this.pending = const [],
    this.pendingOwner = 'u1',
    bool syncEvents = false,
  }) : _events = StreamController<RawBankNotification>.broadcast(
         sync: syncEvents,
       );

  bool accessEnabled = false;
  int openSettingsCalls = 0;
  int consumeCalls = 0;
  List<RawBankNotification> pending;

  /// The account that parked [pending] — the disk-side owner native
  /// would have recorded when the events were captured.
  final String pendingOwner;
  final StreamController<RawBankNotification> _events;

  void emit(RawBankNotification n) => _events.add(n);

  @override
  Future<bool> isAccessEnabled() async => accessEnabled;

  @override
  Future<bool> openAccessSettings() async {
    openSettingsCalls++;
    return true;
  }

  @override
  Future<List<String>> supportedSources() async => const [
    'Vietcombank',
    'MoMo',
  ];

  /// Disk-side owner recorded for the parked events — seeded from
  /// [pendingOwner] like the native KEY_OWNER surviving a process kill.
  String? _diskOwner;

  @override
  Future<List<RawBankNotification>> consumePending(String userId) async {
    consumeCalls++;
    // Same contract as native: parked raw text answers only to the owner
    // that captured it — anything else gets the queue dropped unread.
    final disk = _diskOwner ??= pending.isNotEmpty ? pendingOwner : null;
    final out = disk == userId ? pending : <RawBankNotification>[];
    pending = const [];
    return out;
  }

  @override
  Future<void> setCaptureSession(String? userId, bool enabled) async {
    // The native bridge drops parked raw text on any owner change or
    // disable — mirror that so tests exercise the real contract.
    final disk = _diskOwner ??= pending.isNotEmpty ? pendingOwner : null;
    if (disk != userId || !enabled) pending = const [];
    _diskOwner = userId;
  }

  @override
  Stream<RawBankNotification> stream() => _events.stream;

  @override
  Future<void> clearPending() async {}
}

class _NoopShare extends ShareIntentReceiver {
  const _NoopShare();
  @override
  Future<String?> consumeInitialShare() async => null;
  @override
  Stream<String> stream() => const Stream.empty();
}

class _NoopQuick extends QuickActionSource {
  const _NoopQuick();
  @override
  Future<String?> consumeInitialAction() async => null;
  @override
  Stream<String> stream() => const Stream.empty();
}

/// Fails every HttpClient call instantly — drives AuthGate's session
/// restore down its offline path so the signed-in shell pumps without a
/// backend (same harness as quick_action_test).
class _OfflineHttp extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _OfflineClient();
}

class _OfflineClient extends Fake implements HttpClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) =>
      throw const SocketException('offline (test)');
}

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String _fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

class _FakeTransport {
  final requests = <NeonRequest>[];
  final queue = <NeonResponse>[];

  NeonRequester get requester => (req) async {
    requests.add(req);
    assert(queue.isNotEmpty, 'unexpected request: ${req.url}');
    return queue.removeAt(0);
  };

  static NeonResponse json(
    int status,
    Object body, {
    Map<String, String> headers = const {},
  }) => NeonResponse(status: status, headers: headers, body: jsonEncode(body));
}

class _Harness {
  final t = _FakeTransport();
  late final auth = NeonAuthClient(config: _config, requester: t.requester);
  late final api = NeonDataApi(
    config: _config,
    auth: auth,
    requester: t.requester,
  );
  late final store = RealStore(api);

  Future<void> signIn() async {
    t.queue.add(
      _FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );
    await auth.signIn('e', 'p');
    t.queue.add(
      _FakeTransport.json(200, {}, headers: {'set-auth-jwt': _fakeJwt()}),
    );
  }
}
