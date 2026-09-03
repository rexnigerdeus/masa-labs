import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Thème The Everyday Co. — Vitae
/// Palette cohérente avec la landing page et les autres apps
class AppTheme {
  // Couleurs communes The Everyday Co.
  static const Color bg = Color(0xFFFAFAF7);
  static const Color bg2 = Color(0xFFF4F2EC);
  static const Color dark = Color(0xFF171411);
  static const Color dark2 = Color(0xFF26211C);
  static const Color card = Color(0xFFFFFFFF);
  static const Color text = Color(0xFF171411);
  static const Color muted = Color(0xFF5C5650);
  static const Color muted2 = Color(0xFF8A8378);
  static const Color yellow = Color(0xFFFDF150);
  static const Color yellowSoft = Color(0xFFFFF6A6);

  // Couleur Vitae (steel blue)
  static const Color vitae = Color(0xFF3F6E91);
  static const Color vitaeSoft = Color(0xFFD6E4EF);
  static const Color vitaeDark = Color(0xFF2C526E);

  // Couleurs des autres apps (pour référence cross-app)
  static const Color kassa = Color(0xFF4E8462);
  static const Color kredi = Color(0xFF6E5F94);
  static const Color rondo = Color(0xFFB8703A);

  // Couleurs de statut
  static const Color success = Color(0xFF4E8462);
  static const Color warning = Color(0xFFC99A2E);
  static const Color error = Color(0xFFB85638);

  // Palette de couleurs proposées pour les CV (6 choix par template)
  static const List<Color> cvAccentColors = [
    Color(0xFF3F6E91), // Steel blue (défaut)
    Color(0xFFB8703A), // Terracotta
    Color(0xFF4E8462), // Sage green
    Color(0xFF6E5F94), // Muted purple
    Color(0xFF8B2635), // Bordeaux
    Color(0xFF1A1A1A), // Noir sobre
  ];

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: bg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: vitae,
        brightness: Brightness.light,
        surface: bg,
        onSurface: text,
        primary: vitae,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          letterSpacing: -1.5,
          color: text,
        ),
        headlineLarge: GoogleFonts.inter(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.8,
          color: text,
        ),
        headlineMedium: GoogleFonts.inter(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.5,
          color: text,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: text,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: muted,
        ),
        bodySmall: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: muted2,
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: text,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        foregroundColor: text,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: text,
        ),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bg2,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: vitae, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: GoogleFonts.inter(color: muted, fontSize: 14),
        hintStyle: GoogleFonts.inter(color: muted2, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: vitae,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: vitae,
          side: const BorderSide(color: vitae),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: card,
        selectedItemColor: vitae,
        unselectedItemColor: muted2,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 12),
      ),
    );
  }
}