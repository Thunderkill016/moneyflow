import 'package:flutter/material.dart';

import '../../domain/commitments.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../theme/mf_theme.dart';

/// D8 — PocketGuard's bill-calendar slice: a month grid under the
/// commitments list marking which days have a commitment due, and a
/// tap-a-day detail row. Pure presentation over the string-dated domain
/// helpers — the grid never invents due dates (a malformed month renders
/// an empty grid, not a guessed layout), and a non-monthly commitment
/// only marks a day in the month its cycle actually lands.
class CommitmentCalendar extends StatefulWidget {
  const CommitmentCalendar({
    super.key,
    required this.monthStart,
    required this.commitments,
    required this.today,
    this.onPay,
  });

  /// YYYY-MM-01 — the month the grid shows.
  final String monthStart;

  /// The ACTIVE commitments (archived rows are filtered by the page).
  final List<RecurringCommitment> commitments;

  /// YYYY-MM-DD — status colors and the today ring resolve against it.
  final String today;

  /// Same seam the list tile's "Trả" button uses — the calendar adds no
  /// second write path. Null hides the per-row pay action (demo).
  final Future<void> Function(RecurringCommitment c)? onPay;

  @override
  State<CommitmentCalendar> createState() => _CommitmentCalendarState();
}

class _CommitmentCalendarState extends State<CommitmentCalendar> {
  /// Vietnamese calendars read T2…CN (Monday-first).
  static const _weekdayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  /// At most three dots per cell — beyond that the marker stops being a
  /// glanceable signal and the tapped detail row carries the real list.
  static const _maxDots = 3;

  int? _selectedDay;

  Color _dotColor(BuildContext context, CommitmentStatus status) {
    final scheme = Theme.of(context).colorScheme;
    return switch (status) {
      CommitmentStatus.overdue => context.mf.expenseText,
      CommitmentStatus.dueToday => context.mf.warningText,
      CommitmentStatus.upcoming => scheme.onSurfaceVariant,
      CommitmentStatus.scheduled => scheme.onSurfaceVariant,
      CommitmentStatus.paidDifferent => context.mf.transferText,
      CommitmentStatus.paid => context.mf.incomeText,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cells = commitmentMonthGrid(widget.monthStart);
    final todayInMonth =
        widget.today.startsWith(widget.monthStart.substring(0, 8))
        ? int.tryParse(widget.today.substring(8, 10))
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Weekday header row.
            Row(
              children: [
                for (final w in _weekdayHeaders)
                  Expanded(
                    child: Center(
                      child: Text(
                        w,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: context.mf.textMuted,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            // Rows of seven Expanded cells — deliberately NOT a GridView:
            // even a non-scrolling GridView registers a Scrollable, which
            // would silently join the page's scrollable finders.
            for (var row = 0; row * 7 < cells.length; row++)
              Row(
                children: [
                  for (var col = 0; col < 7; col++)
                    Expanded(
                      child:
                          row * 7 + col < cells.length &&
                              cells[row * 7 + col] != null
                          ? _dayCell(
                              context,
                              cells[row * 7 + col]!,
                              todayInMonth,
                              scheme,
                            )
                          : const SizedBox(height: 44),
                    ),
                ],
              ),
            const Divider(height: 20),
            _selectedDay == null
                ? Text(
                    'Chạm một ngày để xem cam kết đến hạn',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: context.mf.textMuted,
                    ),
                  )
                : _dayDetail(context, _selectedDay!),
          ],
        ),
      ),
    );
  }

  Widget _dayCell(
    BuildContext context,
    int day,
    int? todayInMonth,
    ColorScheme scheme,
  ) {
    final due = commitmentsDueOnDay(
      widget.commitments,
      monthStart: widget.monthStart,
      day: day,
    );
    final selected = _selectedDay == day;
    final isToday = todayInMonth == day;
    return InkWell(
      customBorder: const CircleBorder(),
      onTap: () => setState(() => _selectedDay = selected ? null : day),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: selected ? scheme.primary : null,
              border: isToday && !selected
                  ? Border.all(color: scheme.primary, width: 1.2)
                  : null,
            ),
            child: Text(
              '$day',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: selected
                    ? scheme.onPrimary
                    : isToday
                    ? scheme.primary
                    : null,
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final c in due.take(_maxDots))
                Container(
                  width: 4,
                  height: 4,
                  margin: const EdgeInsets.symmetric(
                    horizontal: 1,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _dotColor(
                      context,
                      commitmentStatus(
                        c,
                        monthStart: widget.monthStart,
                        today: widget.today,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  /// The tapped day's due list — name, amount, status line, and the same
  /// "Trả" write the feed tile uses (never a parallel pay path).
  Widget _dayDetail(BuildContext context, int day) {
    final due = commitmentsDueOnDay(
      widget.commitments,
      monthStart: widget.monthStart,
      day: day,
    );
    if (due.isEmpty) {
      return Text(
        'Ngày $day không có cam kết đến hạn',
        style: Theme.of(
          context,
        ).textTheme.bodySmall?.copyWith(color: context.mf.textMuted),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ngày $day', style: Theme.of(context).textTheme.labelLarge),
        for (final c in due) ...[
          Builder(
            builder: (context) {
              final status = commitmentStatus(
                c,
                monthStart: widget.monthStart,
                today: widget.today,
              );
              return Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.name,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        Text(
                          '${formatMoney(c.amountMinor)} · '
                          '${commitmentStatusLabel(
                            status,
                            monthStart: widget.monthStart,
                            today: widget.today,
                            dueDay: c.dueDay,
                            paidAmountMinor: c.paidAmountMinor,
                            dueMonth: commitmentDueMonth(c, monthStart: widget.monthStart),
                            format: formatMoney,
                          )}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: _dotColor(context, status)),
                        ),
                      ],
                    ),
                  ),
                  if (!c.paidThisMonth && widget.onPay != null)
                    TextButton(
                      onPressed: () => widget.onPay!(c),
                      child: const Text('Trả'),
                    ),
                ],
              );
            },
          ),
        ],
      ],
    );
  }
}
