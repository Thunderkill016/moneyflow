import 'package:flutter/material.dart';

/// MoneyFlow mobile design tokens — light minimal fintech direction
/// Soft Pop territory (owner-selected 2026-10-15, see
/// docs/design/GENZ_DESIGN_EXPLORATION.md): lilac canvas, white rounded
/// tiles, violet action family, oversized money on the canvas. Dark mode
/// keeps the same structure on an ink-violet canvas. Semantic finance
/// colors stay distinguishable from brand: an amount's color is NEVER the only
/// carrier of sign/direction (tiles still print +/−/↔ via
/// formatMoneyWithKind).
class MfColors extends ThemeExtension<MfColors> {
  const MfColors({
    required this.brand,
    required this.brandSubtle,
    required this.brandText,
    required this.textMuted,
    required this.textSoft,
    required this.borderSubtle,
    required this.borderStrong,
    required this.surfaceMuted,
    required this.navSurface,
    required this.surfaceStrong,
    required this.income,
    required this.incomeSubtle,
    required this.incomeText,
    required this.incomeBorder,
    required this.expense,
    required this.expenseSubtle,
    required this.expenseText,
    required this.expenseBorder,
    required this.transfer,
    required this.transferSubtle,
    required this.transferText,
    required this.transferBorder,
    required this.warning,
    required this.warningSubtle,
    required this.warningText,
    required this.warningBorder,
  });

  /// Orange accent: highlights and small calls to action (never money).
  final Color brand;
  final Color brandSubtle;
  final Color brandText;

  /// Secondary text / captions — never for primary content.
  final Color textMuted;
  final Color textSoft;

  /// In-workspace hairlines vs structural card borders vs inputs.
  final Color borderSubtle;
  final Color borderStrong;

  /// Secondary panel vs pressed/selected fill.
  final Color surfaceMuted;

  /// Floating bottom bar — a hair darker than the canvas (light) or the
  /// card surface (dark); the reference's #F0F0EE / #101623.
  final Color navSurface;
  final Color surfaceStrong;

  /// Financial semantics — mint income, coral expense, violet
  /// transfer, amber warning; each carries a subtle tile tint and a
  /// readable text tone.
  final Color income;
  final Color incomeSubtle;
  final Color incomeText;
  final Color incomeBorder;
  final Color expense;
  final Color expenseSubtle;
  final Color expenseText;
  final Color expenseBorder;
  final Color transfer;
  final Color transferSubtle;
  final Color transferText;
  final Color transferBorder;
  final Color warning;
  final Color warningSubtle;
  final Color warningText;
  final Color warningBorder;

  /// Light-first: the default look.
  static const light = MfColors(
    brand: Color(0xFF6F4EF5),
    brandSubtle: Color(0xFFEFEAFF),
    brandText: Color(0xFF5B3BE0),
    textMuted: Color(0xFF524A6B),
    textSoft: Color(0xFF6F6787),
    borderSubtle: Color(0xFFE9E4F6),
    borderStrong: Color(0xFF8E79C9),
    surfaceMuted: Color(0xFFF1ECFF),
    navSurface: Color(0xFFFFFFFF),
    surfaceStrong: Color(0xFFE9E3F8),
    income: Color(0xFF059669),
    incomeSubtle: Color(0xFFECFDF5),
    incomeText: Color(0xFF047857),
    incomeBorder: Color(0xFF6EE7B7),
    expense: Color(0xFFE11D48),
    expenseSubtle: Color(0xFFFFF1F2),
    expenseText: Color(0xFFBE123C),
    expenseBorder: Color(0xFFFDA4AF),
    transfer: Color(0xFF7C3AED),
    transferSubtle: Color(0xFFF5F3FF),
    transferText: Color(0xFF6D28D9),
    transferBorder: Color(0xFFC4B5FD),
    warning: Color(0xFFD97706),
    warningSubtle: Color(0xFFFFFBEB),
    warningText: Color(0xFFB45309),
    warningBorder: Color(0xFFFCD34D),
  );

  static const dark = MfColors(
    brand: Color(0xFFB7A5FF),
    brandSubtle: Color(0xFF2E2650),
    brandText: Color(0xFFCBBFFF),
    textMuted: Color(0xFFCDC6DE),
    textSoft: Color(0xFFA79FC4),
    borderSubtle: Color(0xFF2C2644),
    borderStrong: Color(0xFF7C6CB0),
    surfaceMuted: Color(0xFF282240),
    navSurface: Color(0xFF1E1A30),
    surfaceStrong: Color(0xFF352D52),
    income: Color(0xFF34D399),
    incomeSubtle: Color(0xFF0D2B22),
    incomeText: Color(0xFF6EE7B7),
    incomeBorder: Color(0xFF1F5E48),
    expense: Color(0xFFFB7185),
    expenseSubtle: Color(0xFF351A20),
    expenseText: Color(0xFFFDA4AF),
    expenseBorder: Color(0xFF5E2531),
    transfer: Color(0xFFA78BFA),
    transferSubtle: Color(0xFF231D3D),
    transferText: Color(0xFFC4B5FD),
    transferBorder: Color(0xFF413078),
    warning: Color(0xFFFBBF24),
    warningSubtle: Color(0xFF33290F),
    warningText: Color(0xFFFCD34D),
    warningBorder: Color(0xFF5E4A13),
  );

  @override
  MfColors copyWith() => this; // fixed token set — nothing to lerp by field

  @override
  MfColors lerp(MfColors? other, double t) => t < 0.5 ? this : (other ?? this);
}

/// Convenience — `context.mf` reads the semantic token set. Hosts that
/// don't apply [MfTheme] (isolated widget tests, embedded surfaces)
/// get the brightness-matching fallback instead of a null crash.
extension MfThemeX on BuildContext {
  MfColors get mf =>
      Theme.of(this).extension<MfColors>() ??
      (Theme.of(this).brightness == Brightness.dark
          ? MfColors.dark
          : MfColors.light);
}

/// Rounded-square icon tile for a transaction kind — the same pastel
/// tile on every money list. The arrow glyph carries direction; the tint
/// only reinforces it (the signed amount is always printed beside it).
class MfKindIcon extends StatelessWidget {
  const MfKindIcon(this.kind, {super.key});

  /// 'income' | 'expense' | 'transfer'
  final String kind;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    final (bg, fg, icon) = switch (kind) {
      'income' => (mf.incomeSubtle, mf.incomeText, Icons.south_west),
      'expense' => (mf.expenseSubtle, mf.expenseText, Icons.north_east),
      _ => (mf.transferSubtle, mf.transferText, Icons.swap_horiz),
    };
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Icon(icon, color: fg),
    );
  }
}

/// Pastel sticker fills shared by wallet cards and icon tiles — the
/// Soft Pop accent set (pink / mint / peri / violet). Dark ink text sits
/// on every one of them, so contrast holds in both themes.
const mfPastelFills = [
  Color(0xFFFF9FB8),
  Color(0xFF7FE5C4),
  Color(0xFF8FA8FF),
  Color(0xFFC7B7FF),
];
const mfPastelInk = Color(0xFF211A33);

/// Rounded-square icon tile on a pastel fill (the reference's "My
/// Savings" / wallet-row icon).
class MfSquareIcon extends StatelessWidget {
  const MfSquareIcon({
    super.key,
    required this.icon,
    this.fill,
    this.size = 44,
  });

  final IconData icon;
  final Color? fill;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: fill ?? mfPastelFills.first,
      borderRadius: BorderRadius.circular(size * 0.32),
    ),
    child: Icon(icon, color: mfPastelInk, size: size * 0.5),
  );
}

/// Vertical-tick progress bar (the reference's savings bar): [ratio] of
/// the ticks are filled with [color], the rest sit muted. An optional
/// [marker] (0..1) draws a taller ink tick — the budget "today" pace.
class MfTickBar extends StatelessWidget {
  const MfTickBar({
    super.key,
    required this.ratio,
    this.color,
    this.marker,
    this.height = 22,
  });

  final double ratio;
  final Color? color;
  final double? marker;
  final double height;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    return CustomPaint(
      size: Size(double.infinity, height),
      painter: _TickPainter(
        ratio: ratio.clamp(0.0, 1.0),
        fill: color ?? const Color(0xFF86B85A),
        rest: mf.borderStrong,
        markerColor: Theme.of(context).colorScheme.onSurface,
        marker: marker,
      ),
    );
  }
}

class _TickPainter extends CustomPainter {
  _TickPainter({
    required this.ratio,
    required this.fill,
    required this.rest,
    required this.markerColor,
    this.marker,
  });

  final double ratio;
  final Color fill;
  final Color rest;
  final Color markerColor;
  final double? marker;

  static const _tickWidth = 2.0;
  static const _gap = 2.0;

  @override
  void paint(Canvas canvas, Size size) {
    final n = ((size.width + _gap) / (_tickWidth + _gap)).floor();
    final paint = Paint()..strokeWidth = _tickWidth;
    for (var i = 0; i < n; i++) {
      final x = i * (_tickWidth + _gap) + _tickWidth / 2;
      paint.color = (i + 0.5) / n <= ratio ? fill : rest;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    if (marker != null) {
      final x = (marker!.clamp(0.0, 1.0) * size.width).clamp(1.0, size.width);
      canvas.drawLine(
        Offset(x, -2),
        Offset(x, size.height + 2),
        Paint()
          ..color = markerColor
          ..strokeWidth = 2,
      );
    }
  }

  @override
  bool shouldRepaint(_TickPainter o) =>
      o.ratio != ratio ||
      o.fill != fill ||
      o.rest != rest ||
      o.marker != marker ||
      o.markerColor != markerColor;
}

/// Money numerals stay tabular so columns of đồng align and the figure
/// doesn't shimmer during the count-up tween. `hero` tightens tracking
/// for the oversized display figure — the neo-fintech signature.
TextStyle mfMoneyStyle(TextStyle? base, {bool hero = false}) =>
    (base ?? const TextStyle()).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
      letterSpacing: hero ? -1.0 : null,
      height: hero ? 1.05 : null,
    );

class MfTheme {
  static const _rControl = 14.0;
  static const _rCard = 24.0;

  static ThemeData light() => _build(
    const ColorScheme.light(
      primary: Color(0xFF6F4EF5),
      onPrimary: Color(0xFFFFFFFF),
      primaryContainer: Color(0xFFEFEAFF),
      onPrimaryContainer: Color(0xFF3B2797),
      secondary: Color(0xFF524A6B),
      onSecondary: Color(0xFFFFFFFF),
      secondaryContainer: Color(0xFFE9E3F8),
      onSecondaryContainer: Color(0xFF211A33),
      error: Color(0xFFE11D48),
      onError: Color(0xFFFFFFFF),
      errorContainer: Color(0xFFFFF1F2),
      onErrorContainer: Color(0xFF9F1239),
      surface: Color(0xFFFFFFFF),
      onSurface: Color(0xFF211A33),
      onSurfaceVariant: Color(0xFF524A6B),
      outline: Color(0xFFDCD5EE),
      outlineVariant: Color(0xFFE9E4F6),
      surfaceContainerHighest: Color(0xFFE9E3F8),
    ),
    MfColors.light,
    const Color(0xFFF8F5FF), // lilac Soft Pop canvas
  );

  /// Dark counterpart: ink-violet canvas, layered violet surfaces.
  static ThemeData dark() => _build(
    const ColorScheme.dark(
      primary: Color(0xFFB7A5FF),
      onPrimary: Color(0xFF221744),
      primaryContainer: Color(0xFF2E2650),
      onPrimaryContainer: Color(0xFFCBBFFF),
      secondary: Color(0xFFCDC6DE),
      onSecondary: Color(0xFF161224),
      secondaryContainer: Color(0xFF352D52),
      onSecondaryContainer: Color(0xFFF4F2FB),
      error: Color(0xFFFB7185),
      onError: Color(0xFF3B0A13),
      errorContainer: Color(0xFF351A20),
      onErrorContainer: Color(0xFFFDA4AF),
      surface: Color(0xFF1E1A30),
      onSurface: Color(0xFFF4F2FB),
      onSurfaceVariant: Color(0xFFCDC6DE),
      outline: Color(0xFF7C6CB0),
      outlineVariant: Color(0xFF2C2644),
      surfaceContainerHighest: Color(0xFF352D52),
    ),
    MfColors.dark,
    const Color(0xFF161224), // ink-violet canvas
  );

  static ThemeData _build(ColorScheme scheme, MfColors mf, Color canvas) {
    final dark = scheme.brightness == Brightness.dark;
    // Typography base — overrides below derive from it so size, family
    // and tracking stay on the platform scale instead of a bare style.
    final text = ThemeData(
      useMaterial3: true,
      brightness: scheme.brightness,
    ).textTheme;
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      extensions: [mf],
      // 4px rhythm lives in the pages; the theme carries shape/typography.
      cardTheme: CardThemeData(
        // Soft diffused shadow instead of a hard border — tiles float
        // gently on the lilac canvas (dark keeps a hairline: shadows
        // vanish on ink).
        elevation: dark ? 0 : 1,
        shadowColor: const Color(0x0F000000),
        surfaceTintColor: Colors.transparent,
        color: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rCard),
          side: BorderSide(color: mf.borderSubtle),
        ),
        margin: EdgeInsets.zero,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: canvas,
        foregroundColor: scheme.onSurface,
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
          color: scheme.onSurface,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          // Vivid violet fill: a semibold label keeps it confident, not heavy.
          textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
          shape: const StadiumBorder(),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          side: BorderSide(color: scheme.outline),
          shape: const StadiumBorder(),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(minimumSize: const Size(48, 40)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_rControl),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_rControl),
          borderSide: BorderSide(color: mf.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_rControl),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        // Active destination is a solid violet pill (light violet in dark).
        backgroundColor: dark ? mf.navSurface : scheme.surface,
        indicatorColor: scheme.primary,
        indicatorShape: const StadiumBorder(),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(
            color: s.contains(WidgetState.selected)
                ? scheme.onPrimary
                : mf.textSoft,
          ),
        ),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => TextStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected)
                ? FontWeight.w600
                : FontWeight.w400,
            color: s.contains(WidgetState.selected)
                ? scheme.onSurface
                : mf.textSoft,
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rCard),
          side: BorderSide(color: mf.borderSubtle),
        ),
      ),
      // Pill chips: white at rest, solid violet when selected — the
      // Soft Pop period / category pills.
      chipTheme: ChipThemeData(
        // ≥48dp so quick-amount/filter chips are real touch targets.
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        shape: const StadiumBorder(),
        side: BorderSide(color: mf.borderSubtle),
        backgroundColor: scheme.surface,
        selectedColor: scheme.primary,
        checkmarkColor: scheme.onPrimary,
        labelStyle: text.labelLarge?.copyWith(color: scheme.onSurface),
        secondaryLabelStyle: text.labelLarge?.copyWith(color: scheme.onPrimary),
        showCheckmark: false,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rControl),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: mf.borderSubtle,
        thickness: 1,
        space: 1,
      ),
      listTileTheme: const ListTileThemeData(minTileHeight: 56),
    );
  }
}
