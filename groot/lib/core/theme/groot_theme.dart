import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ThÃ¨me Groot Habits â€” palette vÃ©gÃ©tale du design system (Â§1)
///
/// Principe directeur (Â§0) : une matiÃ¨re organique â€” bois, Ã©corce, feuille,
/// terre â€” jamais le combo crÃ¨me/terracotta gÃ©nÃ©rique. Jamais de rouge
/// saturÃ©, mÃªme pour les erreurs : `clay` est l'alerte maximale.
class GrootTheme {
  // ---- Tokens couleur (light mode, design system Â§1.1) ----
  static const Color green900 = Color(0xFF28402F); // Mousse profonde
  static const Color green600 = Color(0xFF5E8B5A); // Sauge vivante
  static const Color green300 = Color(0xFFA8CBA1); // Pousse tendre
  static const Color amber500 = Color(0xFFE3A857); // Ambre dorÃ© â€” rÃ©compenses
  static const Color bark600 = Color(0xFF7A5C3E); // Ã‰corce â€” "Ã  arrÃªter"
  static const Color clay500 = Color(0xFFC1694F); // Argile brÃ»lÃ©e â€” alerte douce
  static const Color paper100 = Color(0xFFF3EEDF); // Lin â€” fond principal
  static const Color paper50 = Color(0xFFFAF7EE); // Lin clair â€” cartes
  static const Color ink900 = Color(0xFF26251F); // Charbon doux
  static const Color ink500 = Color(0xFF6B695F); // Charbon dÃ©lavÃ©

  // ---- Dark mode "Sous-bois" (design system Â§1.2) ----
  static const Color bgDark = Color(0xFF161E19); // Sous-bois
  static const Color surfaceDark = Color(0xFF20291F); // Tronc
  static const Color greenDarkAccent = Color(0xFF82B26E);
  static const Color amberDarkAccent = Color(0xFFF0BE73);
  static const Color textDarkPrimary = Color(0xFFEFE9D8);
  static const Color textDarkSecondary = Color(0xFFA9A493);

  // ---- Rayons asymÃ©triques (design system Â§3.2) ----
  /// Carte d'habitude : 20px haut-gauche / 8px ailleurs ("coin de feuille")
  static BorderRadius get cardLeaf => const BorderRadius.only(
        topLeft: Radius.circular(20),
        topRight: Radius.circular(8),
        bottomLeft: Radius.circular(8),
        bottomRight: Radius.circular(8),
      );

  /// Bouton primaire : 16px uniforme (prÃ©visible au toucher)
  static const BorderRadius button = BorderRadius.all(Radius.circular(16));

  /// Bottom sheet : 28px haut uniquement
  static BorderRadius get sheetTop => const BorderRadius.vertical(
        top: Radius.circular(28),
      );

  /// Chips de famille : cercle plein
  static const BorderRadius chip = BorderRadius.all(Radius.circular(100));

  // ---- Ombre chaude (design system Â§3.3) : jamais de noir pur ----
  static List<BoxShadow> get warmShadow => [
        BoxShadow(
          color: green900.withValues(alpha: 0.12),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  // ---- Typographie (design system Â§2) ----
  // Baloo 2 pour titres/chiffres de streak, Public Sans pour le corps.

  static ThemeData get lightTheme => _theme(
        brightness: Brightness.light,
        scaffold: paper100,
        surface: paper50,
        primary: green600,
        onPrimary: paper50,
        text: ink900,
        textMuted: ink500,
        accent: amber500,
        border: green300,
      );

  static ThemeData get darkTheme => _theme(
        brightness: Brightness.dark,
        scaffold: bgDark,
        surface: surfaceDark,
        primary: greenDarkAccent,
        onPrimary: bgDark,
        text: textDarkPrimary,
        textMuted: textDarkSecondary,
        accent: amberDarkAccent,
        border: textDarkSecondary.withValues(alpha: 0.3),
      );

  static ThemeData _theme({
    required Brightness brightness,
    required Color scaffold,
    required Color surface,
    required Color primary,
    required Color onPrimary,
    required Color text,
    required Color textMuted,
    required Color accent,
    required Color border,
  }) {
    final headings = GoogleFonts.baloo2TextTheme().apply(
      bodyColor: text,
      displayColor: text,
    );
    final body = GoogleFonts.publicSansTextTheme().apply(
      bodyColor: text,
      displayColor: text,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: scaffold,
      colorScheme: ColorScheme(
        primary: primary,
        onPrimary: onPrimary,
        secondary: accent,
        onSecondary: ink900,
        surface: surface,
        onSurface: text,
        error: clay500,
        onError: paper50,
        brightness: brightness,
        outline: border,
      ),
      textTheme: body.copyWith(
        // Titres en Baloo 2 â€” ronds, organiques
        displayLarge: headings.displayLarge?.copyWith(
          fontSize: 32,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        headlineLarge: headings.headlineLarge?.copyWith(
          fontSize: 26,
          fontWeight: FontWeight.w500,
          color: text,
        ),
        headlineMedium: headings.headlineMedium?.copyWith(
          fontSize: 20,
          fontWeight: FontWeight.w500,
          color: text,
        ),
        titleLarge: headings.titleLarge?.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        titleMedium: headings.titleMedium?.copyWith(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        // Chiffres de streak : Baloo 2 aussi
        titleSmall: headings.titleSmall?.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        bodyLarge: body.bodyLarge?.copyWith(fontSize: 16, color: text),
        bodyMedium: body.bodyMedium?.copyWith(
          fontSize: 14,
          color: textMuted,
        ),
        bodySmall: body.bodySmall?.copyWith(
          fontSize: 12,
          color: textMuted,
        ),
        labelLarge: body.labelLarge?.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: text,
        ),
        labelSmall: body.labelSmall?.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: textMuted,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: scaffold,
        foregroundColor: text,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: headings.headlineMedium?.copyWith(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: text,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: cardLeaf),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size(64, 52),
          shape: const RoundedRectangleBorder(borderRadius: button),
          textStyle: body.labelLarge?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          minimumSize: const Size(64, 52),
          side: BorderSide(color: border),
          shape: const RoundedRectangleBorder(borderRadius: button),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        hintStyle: body.bodyMedium?.copyWith(color: textMuted),
        border: OutlineInputBorder(
          borderRadius: cardLeaf,
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: cardLeaf,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: cardLeaf,
          borderSide: BorderSide(color: primary, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: cardLeaf,
          borderSide: const BorderSide(color: clay500),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surface,
        selectedColor: primary,
        labelStyle: body.labelLarge,
        shape: const RoundedRectangleBorder(borderRadius: chip),
        side: BorderSide(color: border),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(borderRadius: sheetTop),
        showDragHandle: true,
      ),
      snackBarTheme: SnackBarThemeData(
        // Toast de validation (Â§6) : fond green900, texte paper50
        backgroundColor: brightness == Brightness.light ? green900 : surfaceDark,
        contentTextStyle: body.bodyMedium?.copyWith(
          color: brightness == Brightness.light ? paper50 : textDarkPrimary,
        ),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: button),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: green300.withValues(alpha: 0.5),
        labelTextStyle: WidgetStatePropertyAll(
          body.labelSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1),
      listTileTheme: ListTileThemeData(
        shape: RoundedRectangleBorder(borderRadius: cardLeaf),
        iconColor: primary,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return onPrimary;
          return textMuted;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primary;
          return border;
        }),
      ),
    );
  }
}