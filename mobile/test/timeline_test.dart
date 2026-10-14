import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/timeline.dart';

/// Contract mirror of src/components/transactions/timeline-workspace.tsx —
/// the mobile timeline is the same read-only "đã duyệt" ledger boundary:
/// reviewed rows only, day-grouped, net-per-day, income/expense/net totals.
Transaction tx({
  String id = 't1',
  TransactionKind kind = TransactionKind.expense,
  int amount = 10000,
  String occurredOn = '2026-10-20',
  TransactionReviewStatus reviewStatus = TransactionReviewStatus.reviewed,
  String note = 'Ăn sáng',
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'c1',
  category: 'Ăn uống',
  note: note,
  accountId: 'a1',
  account: 'Ví tiền mặt',
  amount: amount,
  occurredOn: occurredOn,
  reviewStatus: reviewStatus,
);

void main() {
  group('timelineDayGroups', () {
    test('groups rows by occurredOn preserving feed order', () {
      final rows = [
        tx(id: 'a', occurredOn: '2026-10-20'),
        tx(id: 'b', occurredOn: '2026-10-20'),
        tx(id: 'c', occurredOn: '2026-10-18'),
      ];
      final groups = timelineDayGroups(rows, today: '2026-10-20');
      expect(groups.map((g) => g.date), ['2026-10-20', '2026-10-18']);
      expect(groups[0].transactions.map((t) => t.id), ['a', 'b']);
      expect(groups[1].transactions.map((t) => t.id), ['c']);
    });

    test('drops needsReview rows — the timeline is reviewed-only', () {
      final rows = [
        tx(id: 'ok'),
        tx(id: 'draft', reviewStatus: TransactionReviewStatus.needsReview),
      ];
      final groups = timelineDayGroups(rows, today: '2026-10-20');
      expect(groups.single.transactions.single.id, 'ok');
    });

    test('net per day counts income minus expense, transfers excluded', () {
      final rows = [
        tx(id: 'in', kind: TransactionKind.income, amount: 300000),
        tx(id: 'out', kind: TransactionKind.expense, amount: 100000),
        tx(id: 'mv', kind: TransactionKind.transfer, amount: 900000),
      ];
      final group = timelineDayGroups(rows, today: '2026-10-20').single;
      expect(group.netForDay, 200000);
    });

    test('relative labels: Hôm nay / Hôm qua / dd/MM/yyyy', () {
      final rows = [
        tx(id: 'a', occurredOn: '2026-10-20'),
        tx(id: 'b', occurredOn: '2026-10-19'),
        tx(id: 'c', occurredOn: '2026-10-15'),
      ];
      final groups = timelineDayGroups(rows, today: '2026-10-20');
      expect(groups[0].label, 'Hôm nay');
      expect(groups[1].label, 'Hôm qua');
      expect(groups[2].label, '15/10/2026');
      expect(groups[0].displayDate, '20/10/2026');
    });
  });

  group('timelineTotals', () {
    test('income / expense / net over the filtered set', () {
      final rows = [
        tx(id: 'in', kind: TransactionKind.income, amount: 300000),
        tx(id: 'out', kind: TransactionKind.expense, amount: 100000),
        tx(id: 'mv', kind: TransactionKind.transfer, amount: 900000),
        tx(id: 'draft', reviewStatus: TransactionReviewStatus.needsReview),
      ];
      final t = timelineTotals(rows);
      expect(t.count, 3); // the draft is not part of the trusted totals
      expect(t.income, 300000);
      expect(t.expense, 100000);
      expect(t.net, 200000);
    });
  });
}
