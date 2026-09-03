import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo oficial con gradiente (Emerald -> Blue)
              const BrandMark(size: 68),
              const SizedBox(height: 24),

              // Título con tipografía y espaciado consistente
              Text(
                'TLAPIANI',
                style: TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 4,
                  color: isDark ? AppTheme.darkTextMain : AppTheme.lightTextMain,
                ),
              ),
              const SizedBox(height: 10),

              // Eslogan oficial del proyecto
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Cada gramo verificado, cada entrega asegurada.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13.5,
                    color: isDark ? AppTheme.darkTextMuted : AppTheme.lightTextMuted,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              const SizedBox(height: 48),

              // Indicador sutil de carga
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: AppTheme.accentEmerald,
                  strokeWidth: 2.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
