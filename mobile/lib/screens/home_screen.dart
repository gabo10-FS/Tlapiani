import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../services/database_service.dart';
import '../services/api_service.dart';
import '../main.dart';
import '../theme/app_theme.dart';

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

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      _updateConnectionStatus(results);
    });

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

  Future<void> _checkInitialConnectivity() async {
    final List<ConnectivityResult> results = await Connectivity().checkConnectivity();
    await _updateConnectionStatus(results);
  }

  Future<void> _updateConnectionStatus(List<ConnectivityResult> results) async {
    final bool hasInterface = results.contains(ConnectivityResult.wifi) ||
                              results.contains(ConnectivityResult.mobile) ||
                              results.contains(ConnectivityResult.ethernet) ||
                              results.contains(ConnectivityResult.vpn);
    
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
                  ? 'Conexión restablecida con el servidor' 
                  : 'Modo Offline activado. Validaciones guardadas en SQLite local.',
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: _isOnline ? AppTheme.accentEmerald : AppTheme.accentAmber,
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

  /// Diálogo para autenticarse como Transportista / Administrador
  Future<bool> _showLoginDialog() async {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;

    final emailController = TextEditingController(text: ApiService.instance.userEmail ?? '');
    final passController = TextEditingController();
    bool loading = false;
    String? errorMessage;

    final loggedIn = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: cardBg,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: const [
              BrandMark(size: 24),
              SizedBox(width: 10),
              Text('Iniciar Sesión', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Para sincronizar con MariaDB se requiere una cuenta autorizada (Transportista o Administrador).',
                  style: TextStyle(fontSize: 12.5),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico',
                    prefixIcon: Icon(Icons.email_outlined, size: 20),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Contraseña',
                    prefixIcon: Icon(Icons.lock_outline, size: 20),
                  ),
                ),
                if (errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    errorMessage!,
                    style: const TextStyle(color: AppTheme.accentCrimson, fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.of(ctx).pop(false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      setDialogState(() {
                        loading = true;
                        errorMessage = null;
                      });
                      try {
                        final ok = await ApiService.instance.login(
                          emailController.text,
                          passController.text,
                        );
                        if (ok && ctx.mounted) {
                          Navigator.of(ctx).pop(true);
                        }
                      } catch (e) {
                        setDialogState(() {
                          loading = false;
                          errorMessage = e.toString().replaceAll('Exception: ', '');
                        });
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentEmerald,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
              ),
              child: loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Entrar'),
            ),
          ],
        ),
      ),
    );

    return loggedIn == true;
  }

  /// Diálogo para configurar la URL del Servidor Backend
  void _showServerConfigDialog() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;
    final urlController = TextEditingController(text: ApiService.instance.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Configurar Servidor API', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Ingresa la URL pública o local del backend (FastAPI):',
              style: TextStyle(fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: urlController,
              decoration: const InputDecoration(
                labelText: 'URL Base',
                hintText: 'https://tu-servidor.com/api/v1',
                prefixIcon: Icon(Icons.dns_outlined, size: 20),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final newUrl = urlController.text.trim();
              if (newUrl.isNotEmpty) {
                ApiService.instance.setBaseUrl(newUrl);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Servidor configurado: $newUrl'),
                    backgroundColor: AppTheme.accentBlue,
                  ),
                );
              }
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentBlue,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  /// Sincronización real con el backend mediante API REST
  Future<void> _syncData() async {
    if (!_isOnline) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sin conexión de red. La sincronización requiere acceso a internet.'),
          backgroundColor: AppTheme.accentCrimson,
        ),
      );
      return;
    }

    if (_pendingCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No hay registros locales pendientes de sincronizar.'),
          backgroundColor: AppTheme.accentEmerald,
        ),
      );
      return;
    }

    // Si no está autenticado, solicitar inicio de sesión
    if (!ApiService.instance.isAuthenticated) {
      final loggedIn = await _showLoginDialog();
      if (!loggedIn) return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: AppTheme.accentEmerald),
      ),
    );

    final db = DatabaseService.instance;
    final entregas = await db.readAllEntregas();

    // Llamada HTTP real al backend
    final result = await ApiService.instance.sincronizarEntregas(entregas);

    if (mounted) {
      Navigator.of(context).pop(); // Cerrar loader

      if (result.success) {
        // Únicamente si el backend confirmó 200 OK, vaciamos la base de datos local
        await db.clearAll();
        await _refreshPendingCount();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${result.mensaje} (${result.registrosProcesados} procesados, ${result.alertasDetectadas} alertas).',
            ),
            backgroundColor: AppTheme.accentEmerald,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        // En caso de error, los datos se preservan íntegros en SQLite
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al sincronizar: ${result.mensaje}'),
            backgroundColor: AppTheme.accentCrimson,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textMain = isDark ? AppTheme.darkTextMain : AppTheme.lightTextMain;
    final textMuted = isDark ? AppTheme.darkTextMuted : AppTheme.lightTextMuted;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;
    final glassBorder = isDark ? AppTheme.darkGlassBorder : AppTheme.lightGlassBorder;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const BrandMark(size: 28),
            const SizedBox(width: 10),
            Text(
              'TLAPIANI',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                letterSpacing: 1.5,
                color: textMain,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: StatusBadge(
              label: _isOnline ? 'Online' : 'Offline',
              status: _isOnline ? BadgeStatus.emerald : BadgeStatus.amber,
            ),
          ),
          // Botón para configurar la URL del servidor
          IconButton(
            icon: Icon(Icons.settings_outlined, color: textMuted, size: 20),
            onPressed: _showServerConfigDialog,
            tooltip: 'Configurar servidor',
          ),
          // Selector de tema Claro / Oscuro
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
              color: textMuted,
              size: 20,
            ),
            onPressed: () {
              TlapianiApp.of(context).toggleTheme();
            },
            tooltip: 'Alternar Tema',
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner de red estilizado como tarjeta del Dashboard
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isOnline
                        ? AppTheme.accentEmerald.withOpacity(0.25)
                        : AppTheme.accentAmber.withOpacity(0.25),
                    width: 1,
                  ),
                  boxShadow: const [AppTheme.shadowSoft],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: _isOnline
                            ? AppTheme.accentEmerald.withOpacity(0.12)
                            : AppTheme.accentAmber.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _isOnline ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                        color: _isOnline ? AppTheme.accentEmerald : AppTheme.accentAmber,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isOnline ? 'CONECTADO AL SISTEMA CENTRAL' : 'MODO LOCAL DESCONECTADO',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              letterSpacing: 0.5,
                              color: _isOnline ? AppTheme.accentEmerald : AppTheme.accentAmber,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _isOnline 
                                ? (ApiService.instance.isAuthenticated
                                    ? 'Sesión iniciada (${ApiService.instance.userEmail}). Listo para sincronizar.'
                                    : 'En línea. Pulsa sincronizar para iniciar sesión.')
                                : 'Sin internet. Las entregas se firman y guardan en SQLite.',
                            style: TextStyle(
                              fontSize: 12,
                              color: textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Tarjeta de Estadísticas (.stat del Dashboard)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: glassBorder, width: 1),
                  boxShadow: const [AppTheme.shadowSoft],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ENTREGAS PENDIENTES',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.8,
                            color: textMuted,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '$_pendingCount',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            color: textMain,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Almacenadas en SQLite local',
                          style: TextStyle(
                            fontSize: 12,
                            color: textMuted,
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(
                      label: _pendingCount > 0 ? 'Por sincronizar' : 'Al día',
                      status: _pendingCount > 0 ? BadgeStatus.amber : BadgeStatus.emerald,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Acciones principales
              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  children: [
                    _buildActionCard(
                      title: 'Escanear QR',
                      subtitle: 'Validar Integridad',
                      icon: Icons.qr_code_scanner_rounded,
                      accentColor: AppTheme.accentEmerald,
                      cardBg: cardBg,
                      glassBorder: glassBorder,
                      textMain: textMain,
                      textMuted: textMuted,
                      onTap: () async {
                        await Navigator.of(context).pushNamed('/scanner');
                        _refreshPendingCount();
                      },
                    ),
                    _buildActionCard(
                      title: 'Historial',
                      subtitle: 'Bitácora Local',
                      icon: Icons.history_rounded,
                      accentColor: AppTheme.accentBlue,
                      cardBg: cardBg,
                      glassBorder: glassBorder,
                      textMain: textMain,
                      textMuted: textMuted,
                      onTap: () async {
                        await Navigator.of(context).pushNamed('/history');
                        _refreshPendingCount();
                      },
                    ),
                  ],
                ),
              ),

              // Botón Pill "SINCRONIZAR AHORA"
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [AppTheme.glowEmerald],
                ),
                child: ElevatedButton.icon(
                  onPressed: _syncData,
                  icon: const Icon(Icons.sync_rounded, size: 20),
                  label: const Text('SINCRONIZAR AHORA'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentEmerald,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: const StadiumBorder(),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required Color cardBg,
    required Color glassBorder,
    required Color textMain,
    required Color textMuted,
    required VoidCallback onTap,
  }) {
    return Material(
      color: cardBg,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: glassBorder, width: 1),
            boxShadow: const [AppTheme.shadowSoft],
          ),
          padding: const EdgeInsets.all(18.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: accentColor,
                  size: 26,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: textMain,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: textMuted,
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
