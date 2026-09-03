import 'dart:convert';
import 'dart:io';
import '../models/lote_model.dart';

class SyncResult {
  final bool success;
  final int registrosProcesados;
  final int alertasDetectadas;
  final String mensaje;

  SyncResult({
    required this.success,
    this.registrosProcesados = 0,
    this.alertasDetectadas = 0,
    required this.mensaje,
  });
}

class ApiService {
  static final ApiService instance = ApiService._init();

  // URL base configurable (por defecto apunta a localhost/emulador)
  String baseUrl = Platform.isAndroid ? 'http://10.0.2.2:8000/api/v1' : 'http://127.0.0.1:8000/api/v1';
  
  String? _authToken;
  String? _userEmail;
  String? _userRole;
  String _deviceUuid = 'DISPOSITIVO-TLAP-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}';

  ApiService._init();

  bool get isAuthenticated => _authToken != null && _authToken!.isNotEmpty;
  String? get userEmail => _userEmail;
  String? get userRole => _userRole;
  String get deviceUuid => _deviceUuid;

  void setBaseUrl(String url) {
    baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  void logout() {
    _authToken = null;
    _userEmail = null;
    _userRole = null;
  }

  /// Inicia sesión con el backend central (POST /api/v1/auth/login)
  Future<bool> login(String email, String password) async {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 8);

    try {
      final uri = Uri.parse('$baseUrl/auth/login');
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType.json;

      final payload = jsonEncode({
        'email': email.trim(),
        'password': password.trim(),
      });

      request.write(payload);
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();

      if (response.statusCode == 200) {
        final data = jsonDecode(responseBody);
        _authToken = data['access_token'];
        _userRole = data['rol'];
        _userEmail = email.trim();
        return true;
      } else {
        String errorMsg = 'Credenciales inválidas';
        try {
          final data = jsonDecode(responseBody);
          if (data['detail'] != null) errorMsg = data['detail'].toString();
        } catch (_) {}
        throw Exception(errorMsg);
      }
    } finally {
      client.close();
    }
  }

  /// Sincroniza en bulto todas las entregas locales (POST /api/v1/envios/sincronizar)
  Future<SyncResult> sincronizarEntregas(List<Entrega> entregas) async {
    if (entregas.isEmpty) {
      return SyncResult(
        success: true,
        registrosProcesados: 0,
        alertasDetectadas: 0,
        mensaje: 'No hay registros para sincronizar.',
      );
    }

    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 12);

    try {
      final uri = Uri.parse('$baseUrl/envios/sincronizar');
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType.json;

      if (_authToken != null) {
        request.headers.set('Authorization', 'Bearer $_authToken');
      }

      final payload = jsonEncode({
        'dispositivo_uuid': _deviceUuid,
        'timestamp_sincronizacion': DateTime.now().toUtc().toIso8601String(),
        'entregas': entregas.map((e) => {
          'lote_id': e.loteId,
          'hash_origen': e.hashOrigen,
          'hash_calculado_recepcion': e.hashCalculadoRecepcion,
          'integridad_validada': e.integridadValidada,
          'timestamp_entrega': e.timestampEntrega,
          'receptor_firma_id': e.receptorFirmaId,
        }).toList(),
      });

      request.write(payload);
      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();

      if (response.statusCode == 200) {
        final data = jsonDecode(responseBody);
        return SyncResult(
          success: true,
          registrosProcesados: data['registros_procesados'] ?? entregas.length,
          alertasDetectadas: data['alertas_manipulacion_detectadas'] ?? 0,
          mensaje: data['status'] ?? 'Consolidado exitosamente en MariaDB',
        );
      } else if (response.statusCode == 401) {
        return SyncResult(
          success: false,
          mensaje: 'Sesión expirada o no autorizada. Por favor inicia sesión.',
        );
      } else {
        String errorMsg = 'Error del servidor (${response.statusCode})';
        try {
          final data = jsonDecode(responseBody);
          if (data['detail'] != null) errorMsg = data['detail'].toString();
        } catch (_) {}
        return SyncResult(
          success: false,
          mensaje: errorMsg,
        );
      }
    } catch (e) {
      return SyncResult(
        success: false,
        mensaje: 'Error de red al sincronizar: $e',
      );
    } finally {
      client.close();
    }
  }
}
