import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models/lote_model.dart';

class CryptographyService {
  /// Calcula el hash SHA-256 de los metadatos de un lote.
  /// 
  /// Concatena los siguientes campos: ID_Lote + Tipo_Bien + Cantidad + Destino + Timestamp.
  /// Admite un [delimiter] opcional (por defecto vacío, p.ej. '', o '|').
  /// Utiliza un formateador para la cantidad (`cantidadKg`) con 1 decimal por defecto para
  /// asegurar la compatibilidad con tipos flotantes del backend (ej. 25.0).
  static String calcularHash(Lote lote, {String delimiter = '', int decimalPlaces = 1}) {
    // Convertimos la cantidad a string con la cantidad de decimales adecuada.
    // Si no tiene decimales (ej. es entero), se puede formatear de forma especial.
    final String cantidadStr = lote.cantidadKg.toStringAsFixed(decimalPlaces);
    
    final List<String> partes = [
      lote.loteId,
      lote.tipoBien,
      cantidadStr,
      lote.comunidadDestinoId.toString(),
      lote.timestampCreacion,
    ];
    
    final String payload = partes.join(delimiter);
    final List<int> bytes = utf8.encode(payload);
    final Digest digest = sha256.convert(bytes);
    
    return digest.toString();
  }

  /// Verifica si el hash calculado localmente coincide con el hash original firmado por el backend.
  static bool validarIntegridad(Lote lote, String hashCalculado) {
    if (lote.hashOrigen.isEmpty || hashCalculado.isEmpty) return false;
    return lote.hashOrigen.trim().toLowerCase() == hashCalculado.trim().toLowerCase();
  }
}
