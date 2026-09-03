import 'package:flutter/material.dart';

/// Sistema de Diseño Central de Tlapiani para Flutter
/// Réplica exacta de los tokens HSL y reglas visuales de `dashboard/css/styles.css`
class AppTheme {
  // ==========================================
  // 🌙 PALETA MODO OSCURO (Default)
  // ==========================================
  // --bg-primary: hsl(220, 15%, 8%) -> #111418
  static const Color darkBgPrimary = Color(0xFF111418);
  // --bg-secondary: hsl(220, 12%, 14%) -> #1F2227
  static const Color darkBgSecondary = Color(0xFF1F2227);
  // --bg-tertiary: hsl(220, 12%, 20%) -> #2D3137
  static const Color darkBgTertiary = Color(0xFF2D3137);

  // --text-main: hsl(210, 20%, 98%) -> #F8FAFD
  static const Color darkTextMain = Color(0xFFF8FAFD);
  // --text-muted: hsl(210, 10%, 65%) -> #9CA6B0
  static const Color darkTextMuted = Color(0xFF9CA6B0);

  // --glass-border: hsla(210, 20%, 100%, 0.06)
  static const Color darkGlassBorder = Color(0x14FFFFFF);
  // --glass-bg: hsla(220, 12%, 14%, 0.6)
  static const Color darkGlassBg = Color(0x991F2227);

  // ==========================================
  // ☀️ PALETA MODO CLARO
  // ==========================================
  // --bg-primary: hsl(220, 20%, 96%) -> #F3F5F8
  static const Color lightBgPrimary = Color(0xFFF3F5F8);
  // --bg-secondary: #FFFFFF
  static const Color lightBgSecondary = Color(0xFFFFFFFF);
  // --bg-tertiary: hsl(220, 15%, 88%) -> #DCE1E7
  static const Color lightBgTertiary = Color(0xFFDCE1E7);

  // --text-main: hsl(220, 25%, 12%) -> #171C26
  static const Color lightTextMain = Color(0xFF171C26);
  // --text-muted: hsl(220, 12%, 45%) -> #656F80
  static const Color lightTextMuted = Color(0xFF656F80);

  // --glass-border: hsla(220, 15%, 10%, 0.08)
  static const Color lightGlassBorder = Color(0x14171C26);

  // ==========================================
  // 🎨 COLORES DE ACENTO COMPARTIDOS (Tokens)
  // ==========================================
  // --accent-emerald: hsl(145, 63%, 42%) -> Éxito / Seguro / Custodia
  static const Color accentEmerald = Color(0xFF27AF5F);
  // --accent-amber: hsl(35, 92%, 50%) -> Advertencia / Pendiente
  static const Color accentAmber = Color(0xFFF5950A);
  // --accent-crimson: hsl(355, 78%, 56%) -> Alerta / Manipulación
  static const Color accentCrimson = Color(0xFFE63848);
  // --accent-crimson-text: hsl(355, 78%, 72%) (mayor contraste sobre fondo oscuro)
  static const Color accentCrimsonText = Color(0xFFF2818C);
  // --accent-blue: hsl(205, 85%, 55%) -> Información / En ruta
  static const Color accentBlue = Color(0xFF2B96EC);

  // ==========================================
  // 🌈 GRADIENTES & SOMBRAS
  // ==========================================
  // Gradiente oficial del logo: Emerald -> Blue (135 grados)
  static const LinearGradient brandGradient = LinearGradient(
    colors: [accentEmerald, accentBlue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // --glow-shadow: 0 0 20px hsla(145, 63%, 42%, 0.15)
  static const BoxShadow glowEmerald = BoxShadow(
    color: Color(0x2627AF5F),
    blurRadius: 20,
    spreadRadius: 2,
  );

  // --shadow-soft
  static const BoxShadow shadowSoft = BoxShadow(
    color: Color(0x3500050D),
    blurRadius: 24,
    offset: Offset(0, 10),
  );

  // ==========================================
  // 🌙 TEMA OSCURO FLUTTER
  // ==========================================
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBgPrimary,
      fontFamily: 'Outfit',
      colorScheme: const ColorScheme.dark(
        primary: accentEmerald,
        secondary: accentBlue,
        tertiary: accentAmber,
        error: accentCrimson,
        surface: darkBgSecondary,
        surfaceContainerHighest: darkBgTertiary,
        onSurface: darkTextMain,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkBgSecondary,
        foregroundColor: darkTextMain,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        shape: Border(bottom: BorderSide(color: darkGlassBorder, width: 1)),
      ),
      cardTheme: CardThemeData(
        color: darkBgSecondary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: darkGlassBorder, width: 1),
        ),
      ),
      dividerColor: darkGlassBorder,
      // Botones Pill-Shaped (.btn en dashboard)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentEmerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: darkTextMain,
          side: const BorderSide(color: darkGlassBorder),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }

  // ==========================================
  // ☀️ TEMA CLARO FLUTTER
  // ==========================================
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightBgPrimary,
      fontFamily: 'Outfit',
      colorScheme: const ColorScheme.light(
        primary: accentEmerald,
        secondary: accentBlue,
        tertiary: accentAmber,
        error: accentCrimson,
        surface: lightBgSecondary,
        surfaceContainerHighest: lightBgTertiary,
        onSurface: lightTextMain,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: lightBgSecondary,
        foregroundColor: lightTextMain,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        shape: Border(bottom: BorderSide(color: lightGlassBorder, width: 1)),
      ),
      cardTheme: CardThemeData(
        color: lightBgSecondary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: lightGlassBorder, width: 1),
        ),
      ),
      dividerColor: lightGlassBorder,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentEmerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: lightTextMain,
          side: const BorderSide(color: lightGlassBorder),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }
}

/// Widget: Marca Oficial Tlapiani (.brand-mark del Dashboard)
/// Cuadro con gradiente esmeralda a azul y esquinas redondeadas
class BrandMark extends StatelessWidget {
  final double size;
  const BrandMark({super.key, this.size = 38});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: AppTheme.brandGradient,
        borderRadius: BorderRadius.circular(size * 0.29), // ~11px para 38px
        boxShadow: const [AppTheme.glowEmerald],
      ),
      child: Icon(
        Icons.verified_user_rounded,
        color: Colors.white,
        size: size * 0.55,
      ),
    );
  }
}

/// Widget: Badge / Pill con Dot (.badge y .dot del Dashboard)
enum BadgeStatus { emerald, amber, crimson, blue }

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeStatus status;

  const StatusBadge({
    super.key,
    required this.label,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    Color baseColor;
    switch (status) {
      case BadgeStatus.emerald:
        baseColor = AppTheme.accentEmerald;
        break;
      case BadgeStatus.amber:
        baseColor = AppTheme.accentAmber;
        break;
      case BadgeStatus.crimson:
        baseColor = AppTheme.accentCrimson;
        break;
      case BadgeStatus.blue:
        baseColor = AppTheme.accentBlue;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: baseColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: baseColor.withOpacity(0.28), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: baseColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: baseColor,
            ),
          ),
        ],
      ),
    );
  }
}
