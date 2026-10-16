import 'package:flutter/material.dart';

/// MoneyFlow mobile design tokens — NEON GREEN direction (owner decision
/// 2026-10-16, supersedes Soft Pop purple; see
/// docs/design/greenvault-reference/). Dark mode is the primary
/// experience: near-black green-undertone canvas, neon #00FF88 actions,
/// white type. Light mode keeps the same structure on a white canvas
/// where the brand adapts to an accessible green (pure #00FF88 strokes
/// and text fail contrast on light surfaces, so fills keep the literal
/// brand while thin accents use the #00A854-family variant).
///
/// Semantic finance colors stay distinguishable from brand: income is
/// emerald, expense rose, transfer cyan — an amount's color is NEVER the
/// only carrier of sign/direction (tiles still print +/−/↔ via
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

  /// Neon green brand: CTA/FAB fills, active states, brand accents.
  /// Anything printed ON it must use a dark ink — white fails contrast.
  final Color brand;
  final Color brandSubtle;

  /// Brand-colored text/icon accent on plain surfaces — on light this is
  /// the darker #00A854-family variant since #00FF88 itself is too light.
  final Color brandText;

  /// Secondary text / captions — never for primary content.
  final Color textMuted;
  final Color textSoft;

  /// In-workspace hairlines vs structural card borders vs inputs.
  final Color borderSubtle;
  final Color borderStrong;

  /// Secondary panel vs pressed/selected fill.
  final Color surfaceMuted;

  /// Floating bottom bar — the card surface tone (dark) or white (light)
  /// so the pill floats on the canvas without a heavier fill.
  final Color navSurface;
  final Color surfaceStrong;

  /// Financial semantics — emerald income, rose expense, cyan
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

  /// Light set — the secondary mode. Brand stays literal #00FF88 for
  /// fills; brandText and the ColorScheme primary drop to the accessible
  /// #00A854 family so text, icons and hairlines stay legible on white.
  static const light = MfColors(
    brand: Color(0xFF00FF88),
    brandSubtle: Color(0xFFD9FCE8),
    brandText: Color(0xFF00803E),
    textMuted: Color(0xFF42564B),
    textSoft: Color(0xFF64766C),
    borderSubtle: Color(0xFFD9EAE0),
    borderStrong: Color(0xFF5E8C74),
    surfaceMuted: Color(0xFFE8F4EC),
    navSurface: Color(0xFFFFFFFF),
    surfaceStrong: Color(0xFFD7EBDE),
    income: Color(0xFF059669),
    incomeSubtle: Color(0xFFECFDF5),
    incomeText: Color(0xFF047857),
    incomeBorder: Color(0xFF6EE7B7),
    expense: Color(0xFFE11D48),
    expenseSubtle: Color(0xFFFFF1F2),
    expenseText: Color(0xFFBE123C),
    expenseBorder: Color(0xFFFDA4AF),
    transfer: Color(0xFF0891B2),
    transferSubtle: Color(0xFFECFEFF),
    transferText: Color(0xFF0E7490),
    transferBorder: Color(0xFF67E8F9),
    warning: Color(0xFFD97706),
    warningSubtle: Color(0xFFFFFBEB),
    warningText: Color(0xFFB45309),
    warningBorder: Color(0xFFFCD34D),
  );

  /// Dark set — the primary experience. Near-black canvas with a green
  /// undertone, neon green actions, white type.
  static const dark = MfColors(
    brand: Color(0xFF00FF88),
    brandSubtle: Color(0xFF0E2B1E),
    brandText: Color(0xFF00FF88),
    textMuted: Color(0xFFA9C1B5),
    textSoft: Color(0xFF7E9489),
    borderSubtle: Color(0xFF1F2E26),
    borderStrong: Color(0xFF4A7560),
    surfaceMuted: Color(0xFF16211B),
    navSurface: Color(0xFF121715),
    surfaceStrong: Color(0xFF1E2D24),
    income: Color(0xFF34D399),
    incomeSubtle: Color(0xFF0D2B22),
    incomeText: Color(0xFF6EE7B7),
    incomeBorder: Color(0xFF1F5E48),
    expense: Color(0xFFFB7185),
    expenseSubtle: Color(0xFF351A20),
    expenseText: Color(0xFFFDA4AF),
    expenseBorder: Color(0xFF5E2531),
    transfer: Color(0xFF22D3EE),
    transferSubtle: Color(0xFF0B2A30),
    transferText: Color(0xFF67E8F9),
    transferBorder: Color(0xFF155E6B),
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

/// The deeper brand step — gradient end next to [MfColors.brand]
/// (owner token #00CC6A); also the default progress-fill tone.
const mfBrandDeep = Color(0xFF00CC6A);

/// Sticker fills shared by wallet cards and icon tiles — bright fills
/// that pop on the dark canvas without muddying the neon brand. Dark
/// ink sits on every one of them, so contrast holds in both themes.
const mfPastelFills = [
  Color(0xFF8AFFC4), // neon mint — the brand-family pastel
  Color(0xFFFF9FB8), // pink
  Color(0xFF8FD8FF), // sky
  Color(0xFFFFD9A8), // sand
];

/// Ink printed on pastel/brand fills — near-black with a green
/// undertone; also the right icon tone on `mf.brand` neon surfaces.
const mfPastelInk = Color(0xFF0E1A13);

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
        fill: color ?? mfBrandDeep,
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
      // Light-mode primary is the accessible member of the neon family:
      // #00FF88 itself fails contrast for icons/text/hairlines on white,
      // so controls take #00A854-family green while mf.brand keeps the
      // literal neon for fills that carry dark ink (FAB, illustrations).
      primary: Color(0xFF00803E),
      onPrimary: Color(0xFFFFFFFF),
      primaryContainer: Color(0xFFD9FCE8),
      onPrimaryContainer: Color(0xFF005C2E),
      primaryFixed: Color(0xFFD9FCE8),
      primaryFixedDim: Color(0xFFA5F0C0),
      onPrimaryFixed: Color(0xFF005227),
      onPrimaryFixedVariant: Color(0xFF007A3B),
      secondary: Color(0xFF42564B),
      onSecondary: Color(0xFFFFFFFF),
      secondaryContainer: Color(0xFFD7EBDE),
      onSecondaryContainer: Color(0xFF0E1A13),
      secondaryFixed: Color(0xFFD7EBDE),
      secondaryFixedDim: Color(0xFFBCDCC9),
      onSecondaryFixed: Color(0xFF1F3428),
      onSecondaryFixedVariant: Color(0xFF3C5446),
      tertiary: Color(0xFF00803E),
      onTertiary: Color(0xFFFFFFFF),
      tertiaryContainer: Color(0xFFD9FCE8),
      onTertiaryContainer: Color(0xFF005C2E),
      tertiaryFixed: Color(0xFFD9FCE8),
      tertiaryFixedDim: Color(0xFFA5F0C0),
      onTertiaryFixed: Color(0xFF005227),
      onTertiaryFixedVariant: Color(0xFF007A3B),
      error: Color(0xFFE11D48),
      onError: Color(0xFFFFFFFF),
      errorContainer: Color(0xFFFFF1F2),
      onErrorContainer: Color(0xFF9F1239),
      surface: Color(0xFFF2F7F4),
      onSurface: Color(0xFF0E1A13),
      onSurfaceVariant: Color(0xFF42564B),
      surfaceContainerLowest: Color(0xFFFFFFFF),
      surfaceContainerLow: Color(0xFFF5FAF7),
      surfaceContainer: Color(0xFFEFF7F1),
      surfaceContainerHigh: Color(0xFFE5F2EA),
      surfaceContainerHighest: Color(0xFFD7EBDE),
      outline: Color(0xFF5E8C74),
      outlineVariant: Color(0xFFD9EAE0),
      inverseSurface: Color(0xFF1A211D),
      onInverseSurface: Color(0xFFF2F7F4),
      inversePrimary: Color(0xFF00FF88),
    ),
    MfColors.light,
    const Color(0xFFFFFFFF), // white canvas — light token set
  );

  /// Dark counterpart — the primary experience: near-black canvas with a
  /// green undertone, neon green actions on layered dark surfaces.
  static ThemeData dark() => _build(
    const ColorScheme.dark(
      primary: Color(0xFF00FF88),
      onPrimary: Color(0xFF062417),
      primaryContainer: Color(0xFF0E3A24),
      onPrimaryContainer: Color(0xFF8AFFC4),
      primaryFixed: Color(0xFFD9FCE8),
      primaryFixedDim: Color(0xFFA5F0C0),
      onPrimaryFixed: Color(0xFF005227),
      onPrimaryFixedVariant: Color(0xFF007A3B),
      secondary: Color(0xFFA9C1B5),
      onSecondary: Color(0xFF0A0E0C),
      secondaryContainer: Color(0xFF1E2D24),
      onSecondaryContainer: Color(0xFFFFFFFF),
      secondaryFixed: Color(0xFFD7EBDE),
      secondaryFixedDim: Color(0xFFBCDCC9),
      onSecondaryFixed: Color(0xFF1F3428),
      onSecondaryFixedVariant: Color(0xFF3C5446),
      tertiary: Color(0xFF00FF88),
      onTertiary: Color(0xFF062417),
      tertiaryContainer: Color(0xFF0E3A24),
      onTertiaryContainer: Color(0xFF8AFFC4),
      tertiaryFixed: Color(0xFFD9FCE8),
      tertiaryFixedDim: Color(0xFFA5F0C0),
      onTertiaryFixed: Color(0xFF005227),
      onTertiaryFixedVariant: Color(0xFF007A3B),
      error: Color(0xFFFB7185),
      onError: Color(0xFF3B0A13),
      errorContainer: Color(0xFF351A20),
      onErrorContainer: Color(0xFFFDA4AF),
      surface: Color(0xFF121715),
      onSurface: Color(0xFFFFFFFF),
      onSurfaceVariant: Color(0xFFA9C1B5),
      surfaceContainerLowest: Color(0xFF070A08),
      surfaceContainerLow: Color(0xFF0E1310),
      surfaceContainer: Color(0xFF121715),
      surfaceContainerHigh: Color(0xFF182019),
      surfaceContainerHighest: Color(0xFF1E2D24),
      outline: Color(0xFF4A7560),
      outlineVariant: Color(0xFF1F2E26),
      inverseSurface: Color(0xFFE8F4EC),
      onInverseSurface: Color(0xFF0E1A13),
      inversePrimary: Color(0xFF00803E),
    ),
    MfColors.dark,
    const Color(0xFF0A0E0C), // near-black green-undertone canvas
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
        // gently on the light canvas (dark keeps a hairline: shadows
        // vanish on near-black).
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
          // Solid brand fill: a semibold label keeps it confident,
          // not heavy.
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
      // The FAB is the screen's primary action — neon fill + dark ink,
      // the same treatment as the nav bar's center capture button.
      // Secondary/utility actions stay tonal or text, never neon.
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFF00FF88),
        foregroundColor: mfPastelInk,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
        ),
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
        // Active destination is a solid brand pill — neon with dark ink
        // on dark, accessible green with white ink on light.
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
      // Pill chips: surface at rest, solid brand green when selected.
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
