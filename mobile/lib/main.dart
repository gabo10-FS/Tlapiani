import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/scanner_screen.dart';
import 'screens/validation_result_screen.dart';
import 'screens/history_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TlapianiApp());
}

class TlapianiApp extends StatefulWidget {
  const TlapianiApp({super.key});

  /// Permite acceder al estado de TlapianiApp desde cualquier widget secundario
  /// para alternar el tema de la aplicación.
  static _TlapianiAppState of(BuildContext context) =>
      context.findAncestorStateOfType<_TlapianiAppState>()!;

  @override
  State<TlapianiApp> createState() => _TlapianiAppState();
}

class _TlapianiAppState extends State<TlapianiApp> {
  ThemeMode _themeMode = ThemeMode.dark; // Tema por defecto: Oscuro

  bool get isDarkMode => _themeMode == ThemeMode.dark;

  void toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tlapiani Mobile',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      
      // ☀️ TEMA CLARO PREMIUM
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF3F4F6), // Gris claro
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF10B981), // Verde esmeralda
          secondary: Colors.amber,
          surface: Colors.white,
          error: Color(0xFFD32F2F),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF1F2937),
          elevation: 1,
          centerTitle: true,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
        ),
        dividerColor: const Color(0xFFE5E7EB),
      ),

      // 🌙 TEMA OSCURO PREMIUM
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F1115), // Negro azulado
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Colors.amber,
          surface: Color(0xFF161920),
          error: Color(0xFFD32F2F),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF161920),
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF161920),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF2C3240)),
          ),
        ),
        dividerColor: const Color(0xFF2C3240),
      ),
      
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/home': (context) => const HomeScreen(),
        '/scanner': (context) => const ScannerScreen(),
        '/validation_result': (context) => const ValidationResultScreen(),
        '/history': (context) => const HistoryScreen(),
      },
    );
  }
}
