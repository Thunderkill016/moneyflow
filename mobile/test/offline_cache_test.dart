import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/offline_cache.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Mirrors OfflineCache._key so tests can seed raw (possibly corrupt)
/// payloads directly into SharedPreferences.
const _cacheKey = 'mf_dashboard_snapshot';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late OfflineCache cache;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    cache = OfflineCache(prefs);
  });

  DashboardSnapshot sample({int savedAtMs = 1700000000000}) =>
      DashboardSnapshot(
        savedAtMs: savedAtMs,
        accounts: const [
          AccountSummary(
            id: 'acc-cash',
            name: 'Tiền mặt',
            kind: AccountKind.cash,
            currencyCode: 'VND',
            initialBalance: 500000,
            balance: 1250000,
            icon: 'wallet',
            color: '#33691E',
            updatedAt: '2026-01-05T08:30:00Z',
          ),
          AccountSummary(
            id: 'acc-ewallet',
            name: 'MoMo',
            kind: AccountKind.eWallet,
            currencyCode: 'VND',
            initialBalance: 0,
            balance: -42000,
            isArchived: true,
          ),
        ],
        transactions: const [
          Transaction(
            id: 'tx-pho',
            kind: TransactionKind.expense,
            categoryId: 'cat-food',
            category: 'Ăn uống',
            note: 'phở sáng',
            accountId: 'acc-cash',
            account: 'Tiền mặt',
            amount: 45000,
            occurredOn: '2026-01-05',
            payee: 'Phở Hà Nội',
            reviewStatus: TransactionReviewStatus.needsReview,
            updatedAt: '2026-01-05T09:00:00Z',
          ),
          Transaction(
            id: 'tx-transfer',
            kind: TransactionKind.transfer,
            categoryId: '',
            category: 'Chuyển tiền',
            note: '',
            accountId: 'acc-cash',
            account: 'Tiền mặt',
            amount: 200000,
            occurredOn: '2026-01-04',
            payee: 'Savings move',
            destinationAccountId: 'acc-ewallet',
            destinationAccount: 'MoMo',
          ),
        ],
      );

  test('readDashboard returns null when nothing is cached', () {
    expect(cache.readDashboard(), isNull);
  });

  test('save then read preserves every field', () async {
    final snap = sample();
    await cache.saveDashboard(snap);

    final read = cache.readDashboard()!;
    // Deep equality across the whole encoded payload.
    expect(read.toJson(), snap.toJson());

    // Spot-check the fields that matter for honest rendering.
    expect(read.savedAtMs, snap.savedAtMs);
    expect(read.accounts, hasLength(2));
    expect(read.transactions, hasLength(2));

    final archived = read.accounts[1];
    expect(archived.kind, AccountKind.eWallet);
    expect(archived.isArchived, isTrue);
    expect(archived.icon, isNull);
    expect(archived.updatedAt, isNull);

    final expense = read.transactions[0];
    expect(expense.reviewStatus, TransactionReviewStatus.needsReview);
    expect(expense.payee, 'Phở Hà Nội');

    final transfer = read.transactions[1];
    expect(transfer.kind, TransactionKind.transfer);
    expect(transfer.destinationAccountId, 'acc-ewallet');
    expect(transfer.destinationAccount, 'MoMo');
    expect(transfer.payee, 'Savings move');
    expect(transfer.reviewStatus, TransactionReviewStatus.reviewed);
  });

  test(
    'readDashboard returns null on corrupt JSON instead of throwing',
    () async {
      await prefs.setString(_cacheKey, '{broken json,,,');
      expect(cache.readDashboard(), isNull);
    },
  );

  test(
    'readDashboard returns null when the payload is not a JSON object',
    () async {
      await prefs.setString(_cacheKey, jsonEncode(['not', 'a', 'map']));
      expect(cache.readDashboard(), isNull);
    },
  );

  test('readDashboard returns null when a required field is missing', () async {
    final payload = sample().toJson()..remove('savedAtMs');
    await prefs.setString(_cacheKey, jsonEncode(payload));
    expect(cache.readDashboard(), isNull);
  });

  test('readDashboard returns null when a nested field is missing', () async {
    final payload = sample().toJson();
    final tx = (payload['transactions']! as List).first as Map<String, Object?>;
    tx.remove('kind');
    await prefs.setString(_cacheKey, jsonEncode(payload));
    expect(cache.readDashboard(), isNull);
  });

  test('readDashboard returns null when a field has the wrong type', () async {
    final payload = sample().toJson();
    payload['accounts'] = 'not-a-list';
    await prefs.setString(_cacheKey, jsonEncode(payload));
    expect(cache.readDashboard(), isNull);
  });

  test('clear removes the cached snapshot', () async {
    await cache.saveDashboard(sample());
    expect(cache.readDashboard(), isNotNull);

    await cache.clear();
    expect(cache.readDashboard(), isNull);
  });

  test('a second save overwrites the first', () async {
    await cache.saveDashboard(sample(savedAtMs: 1111));
    await cache.saveDashboard(sample(savedAtMs: 2222));

    expect(cache.readDashboard()!.savedAtMs, 2222);
  });
}
