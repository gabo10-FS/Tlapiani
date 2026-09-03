import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models/lote_model.dart';

class CryptographyService {
  /// Calcula el hash SHA-256 de los metadatos de un lote según la especificación oficial del backend.
  /// 
  /// Concatena los siguientes campos con el delimitador pipe (|) y 2 decimales fijos:
  /// ID_Lote | Tipo_Bien | Cantidad_Kg | Comunidad_Destino_Id | Timestamp
  static String calcularHash(Lote lote) {
    final String cantidadStr = lote.cantidadKg.toStringAsFixed(2);
    
    final List<String> partes = [
      lote.loteId,
      lote.tipoBien,
      cantidadStr,
      lote.comunidadDestinoId.toString(),
      lote.timestampCreacion,
    ];
    
    final String payload = partes.join('|');
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
