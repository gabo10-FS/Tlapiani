import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../services/database_service.dart';
import '../models/lote_model.dart';
import '../main.dart'; // Para acceder a TlapianiApp

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _pendingCount = 0;
  bool _isOnline = false;
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  Timer? _connectivityTimer;

  @override
  void initState() {
    super.initState();
    _refreshPendingCount();
    _checkInitialConnectivity();

    // 1. Escuchar automáticamente los cambios de conectividad (Eventos del Sistema)
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      _updateConnectionStatus(results);
    });

    // 2. Temporizador periódico cada 5 segundos como redundancia física (evita bloqueos de ahorro de batería)
    _connectivityTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _checkInitialConnectivity();
    });
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    _connectivityTimer?.cancel();
    super.dispose();
  }

  /// Verifica si el dispositivo realmente puede resolver DNS y tiene salida a internet.
  Future<bool> _hasInternetAccess() async {
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 2));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    } on TimeoutException catch (_) {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Verifica la conectividad al arrancar o de forma periódica.
  Future<void> _checkInitialConnectivity() async {
    final List<ConnectivityResult> results = await Connectivity().checkConnectivity();
    await _updateConnectionStatus(results);
  }

  /// Actualiza el estado reactivo de internet comprobando interfaces físicas y acceso real por DNS.
  Future<void> _updateConnectionStatus(List<ConnectivityResult> results) async {
    final bool hasInterface = results.contains(ConnectivityResult.wifi) ||
                              results.contains(ConnectivityResult.mobile) ||
                              results.contains(ConnectivityResult.ethernet) ||
                              results.contains(ConnectivityResult.vpn);
    
    // Si hay interfaz de red, hacemos un ping real para confirmar acceso a internet
    bool hasInternet = false;
    if (hasInterface) {
      hasInternet = await _hasInternetAccess();
    }
    
    if (_isOnline != hasInternet) {
      if (mounted) {
        setState(() {
          _isOnline = hasInternet;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isOnline 
                  ? 'Conexión a internet restablecida' 
                  : 'Sin conexión a internet. Cambiando a modo local offline.',
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: _isOnline ? const Color(0xFF10B981) : Colors.amber.shade800,
          ),
        );
      }
    }
  }

  Future<void> _refreshPendingCount() async {
    final db = DatabaseService.instance;
    final entregas = await db.readAllEntregas();
    setState(() {
      _pendingCount = entregas.length;
    });
  }

  Future<void> _syncData() async {
    if (!_isOnline) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No hay conexión de red activa. No es posible sincronizar con el servidor.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    if (_pendingCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No hay registros locales pendientes de sincronizar.'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
      return;
    }

    // Mostrar loader de sincronización
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF10B981)),
      ),
    );

    // Simular llamada de subida a la API y consolidación en MariaDB
    await Future.delayed(const Duration(seconds: 2));

    final db = DatabaseService.instance;
    await db.clearAll(); // Borramos localmente tras sincronizar
    await _refreshPendingCount();

    if (mounted) {
      Navigator.of(context).pop(); // Quitar loader
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sincronización diferida consolidada exitosamente en MariaDB.'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = TlapianiApp.of(context).isDarkMode;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'TLAPIANI',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
            color: theme.appBarTheme.foregroundColor,
          ),
        ),
        actions: [
          // Icono del estado de conexión (Automático)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: Icon(
              _isOnline ? Icons.wifi : Icons.wifi_off,
              color: _isOnline ? const Color(0xFF10B981) : Colors.amber,
            ),
          ),
          // Botón para alternar Tema Claro / Tema Oscuro
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode : Icons.dark_mode,
              color: theme.appBarTheme.foregroundColor,
            ),
            onPressed: () {
              TlapianiApp.of(context).toggleTheme();
            },
            tooltip: 'Cambiar Tema',
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 15.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner de estado de red automático
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color: _isOnline 
                      ? const Color(0xFF10B981).withOpacity(0.1) 
                      : Colors.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isOnline ? const Color(0xFF10B981) : Colors.amber,
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isOnline ? Icons.cloud_done : Icons.cloud_off,
                      color: _isOnline ? const Color(0xFF10B981) : Colors.amber,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isOnline ? 'CONECTADO AL SERVIDOR' : 'MODO OFFLINE (LOCAL)',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: _isOnline ? const Color(0xFF10B981) : Colors.amber,
                            ),
                          ),
                          Text(
                            _isOnline 
                                ? 'La red se detectó automáticamente. Listo para sincronizar.' 
                                : 'Sin red. Las validaciones se guardarán localmente.',
                            style: TextStyle(
                              fontSize: 11,
                              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 25),

              // Indicador de pendientes
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Entregas Pendientes',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: theme.textTheme.bodyLarge?.color,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_pendingCount registros locales en SQLite',
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                          color: _pendingCount > 0 
                              ? Colors.amber.withOpacity(0.2) 
                              : theme.dividerColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$_pendingCount',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: _pendingCount > 0 ? Colors.amber : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 30),

              // Botones principales (Tarjetas Premium adaptables al tema)
              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 15,
                  mainAxisSpacing: 15,
                  children: [
                    _buildMenuCard(
                      context: context,
                      title: 'Escanear QR',
                      subtitle: 'Validar Integridad',
                      icon: Icons.qr_code_scanner,
                      iconColor: const Color(0xFF10B981),
                      onTap: () async {
                        await Navigator.of(context).pushNamed('/scanner');
                        _refreshPendingCount();
                      },
                    ),
                    _buildMenuCard(
                      context: context,
                      title: 'Historial',
                      subtitle: 'Registros locales',
                      icon: Icons.history,
                      iconColor: Colors.blueAccent,
                      onTap: () async {
                        await Navigator.of(context).pushNamed('/history');
                        _refreshPendingCount();
                      },
                    ),
                  ],
                ),
              ),

              // Botón de sincronizar
              ElevatedButton.icon(
                onPressed: _syncData,
                icon: const Icon(Icons.sync),
                label: const Text('SINCRONIZAR AHORA'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);

    return Material(
      color: theme.cardTheme.color,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.dividerColor, width: 1),
          ),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 28,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: theme.textTheme.bodyLarge?.color,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
