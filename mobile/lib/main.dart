import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/scanner_screen.dart';
import 'screens/validation_result_screen.dart';
import 'screens/history_screen.dart';
import 'theme/app_theme.dart';

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
  ThemeMode _themeMode = ThemeMode.dark; // Tema por defecto: Oscuro (igual que el Dashboard)

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
      
      // ☀️ TEMA CLARO (Sincronizado con variables CSS del Dashboard)
      theme: AppTheme.lightTheme,

      // 🌙 TEMA OSCURO (Sincronizado con variables CSS del Dashboard)
      darkTheme: AppTheme.darkTheme,
      
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
