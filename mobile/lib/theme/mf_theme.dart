import 'package:flutter/material.dart';

/// MoneyFlow mobile design tokens — a 1:1 port of the owner-approved
/// Fresh Blue system in `src/app/document-theme.css` (design authority:
/// `docs/design/CURRENT_DESIGN_SYSTEM.md`). Never invent one-off colors
/// for a state the token set already covers.
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

  /// Action/links/active nav. Light = brand-700, dark = 700-tinted.
  final Color brand;
  final Color brandSubtle;
  final Color brandText;

  /// Secondary text / captions — never for primary content.
  final Color textMuted;
  final Color textSoft;

  /// In-workspace hairlines vs structural card borders vs inputs.
  final Color borderSubtle;
  final Color borderStrong;

  /// Hover/secondary panel vs pressed/selected fill.
  final Color surfaceMuted;
  final Color surfaceStrong;

  /// Financial semantics — an amount color is NEVER the only carrier of
  /// sign/direction (tiles still print +/−/↔ via formatMoneyWithKind).
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

  static const light = MfColors(
    brand: Color(0xFF0369A1), // brand-700 — action pass on white
    brandSubtle: Color(0xFFF0F9FF), // brand-50
    brandText: Color(0xFF0369A1),
    textMuted: Color(0xFF475467),
    textSoft: Color(0xFF667085),
    borderSubtle: Color(0xFFDFE3E8),
    borderStrong: Color(0xFF98A2B3),
    surfaceMuted: Color(0xFFF8FAFC),
    surfaceStrong: Color(0xFFF2F4F7),
    income: Color(0xFF16A34A),
    incomeSubtle: Color(0xFFF0FDF4),
    incomeText: Color(0xFF15803D),
    incomeBorder: Color(0xFF86EFAC),
    expense: Color(0xFFDC2626),
    expenseSubtle: Color(0xFFFEF2F2),
    expenseText: Color(0xFFB91C1C),
    expenseBorder: Color(0xFFFCA5A5),
    transfer: Color(0xFF4F46E5),
    transferSubtle: Color(0xFFEEF2FF),
    transferText: Color(0xFF4338CA),
    transferBorder: Color(0xFFA5B4FC),
    warning: Color(0xFFEAB308),
    warningSubtle: Color(0xFFFEFCE8),
    warningText: Color(0xFFA16207),
    warningBorder: Color(0xFFFDE047),
  );

  static const dark = MfColors(
    brand: Color(0xFF7DD3FC), // brand-300 — action on dark canvas
    brandSubtle: Color(0xFF082F49), // brand-950
    brandText: Color(0xFF7DD3FC),
    textMuted: Color(0xFFD0D5DD),
    textSoft: Color(0xFF98A2B3),
    borderSubtle: Color(0xFF263449),
    borderStrong: Color(0xFF475467),
    surfaceMuted: Color(0xFF1D2939),
    surfaceStrong: Color(0xFF344054),
    income: Color(0xFF4ADE80),
    incomeSubtle: Color(0xFF14532D),
    incomeText: Color(0xFF86EFAC),
    incomeBorder: Color(0xFF22C55E),
    expense: Color(0xFFF87171),
    expenseSubtle: Color(0xFF7F1D1D),
    expenseText: Color(0xFFFCA5A5),
    expenseBorder: Color(0xFFDC2626),
    transfer: Color(0xFF818CF8),
    transferSubtle: Color(0xFF312E81),
    transferText: Color(0xFFA5B4FC),
    transferBorder: Color(0xFF6366F1),
    warning: Color(0xFFFACC15),
    warningSubtle: Color(0xFF713F12),
    warningText: Color(0xFFFDE047),
    warningBorder: Color(0xFFCA8A04),
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

/// Money numerals stay tabular so columns of đồng align and the figure
/// doesn't shimmer during the count-up tween.
TextStyle mfMoneyStyle(TextStyle? base) => (base ?? const TextStyle()).copyWith(
  fontFeatures: const [FontFeature.tabularFigures()],
);

class MfTheme {
  static const _rChip = 8.0;
  static const _rControl = 12.0;
  static const _rCard = 18.0;

  static ThemeData light() => _build(
    const ColorScheme.light(
      primary: Color(0xFF0369A1),
      onPrimary: Color(0xFFFFFFFF),
      primaryContainer: Color(0xFFE0F2FE),
      onPrimaryContainer: Color(0xFF082F49),
      secondary: Color(0xFF475467),
      onSecondary: Color(0xFFFFFFFF),
      secondaryContainer: Color(0xFFF2F4F7),
      onSecondaryContainer: Color(0xFF101828),
      error: Color(0xFFDC2626),
      onError: Color(0xFFFFFFFF),
      errorContainer: Color(0xFFFEF2F2),
      onErrorContainer: Color(0xFFB91C1C),
      surface: Color(0xFFFFFFFF),
      onSurface: Color(0xFF101828),
      onSurfaceVariant: Color(0xFF475467),
      outline: Color(0xFFD0D5DD),
      outlineVariant: Color(0xFFDFE3E8),
      surfaceContainerHighest: Color(0xFFF2F4F7),
    ),
    MfColors.light,
    const Color(0xFFF8FAFC), // canvas
  );

  static ThemeData dark() => _build(
    const ColorScheme.dark(
      primary: Color(0xFF7DD3FC),
      onPrimary: Color(0xFF082F49),
      primaryContainer: Color(0xFF0C4A6E),
      onPrimaryContainer: Color(0xFFE0F2FE),
      secondary: Color(0xFFD0D5DD),
      onSecondary: Color(0xFF101828),
      secondaryContainer: Color(0xFF1D2939),
      onSecondaryContainer: Color(0xFFF8FAFC),
      error: Color(0xFFF87171),
      onError: Color(0xFF450A0A),
      errorContainer: Color(0xFF7F1D1D),
      onErrorContainer: Color(0xFFFCA5A5),
      surface: Color(0xFF101828),
      onSurface: Color(0xFFF8FAFC),
      onSurfaceVariant: Color(0xFFD0D5DD),
      outline: Color(0xFF344054),
      outlineVariant: Color(0xFF263449),
      surfaceContainerHighest: Color(0xFF344054),
    ),
    MfColors.dark,
    const Color(0xFF0C111D), // canvas
  );

  static ThemeData _build(ColorScheme scheme, MfColors mf, Color canvas) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      extensions: [mf],
      // 4px rhythm lives in the pages; the theme carries shape/typography.
      cardTheme: CardThemeData(
        elevation: 0, // borders create structure; shadows stay floating
        color: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rCard),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        margin: EdgeInsets.zero,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: canvas,
        foregroundColor: scheme.onSurface,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_rControl),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          side: BorderSide(color: scheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_rControl),
          ),
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
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_rControl),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: mf.brandSubtle,
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
                ? mf.brandText
                : mf.textSoft,
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rCard),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rChip),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_rControl),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),
      listTileTheme: const ListTileThemeData(minTileHeight: 56),
    );
  }
}
