class Lote {
  final String loteId;
  final String tipoBien;
  final double cantidadKg;
  final int comunidadDestinoId;
  final String timestampCreacion;
  final String hashOrigen;

  Lote({
    required this.loteId,
    required this.tipoBien,
    required this.cantidadKg,
    required this.comunidadDestinoId,
    required this.timestampCreacion,
    required this.hashOrigen,
  });

  /// Crea una instancia de Lote a partir de un mapa JSON.
  factory Lote.fromJson(Map<String, dynamic> json) {
    return Lote(
      loteId: json['lote_id'] ?? '',
      tipoBien: json['tipo_bien'] ?? '',
      cantidadKg: (json['cantidad_kg'] as num?)?.toDouble() ?? 0.0,
      comunidadDestinoId: json['comunidad_destino_id'] ?? 0,
      timestampCreacion: json['timestamp_creacion'] ?? '',
      hashOrigen: json['hash_sha256'] ?? json['hash_origen'] ?? '',
    );
  }

  /// Convierte la instancia de Lote a un mapa JSON.
  Map<String, dynamic> toJson() {
    return {
      'lote_id': loteId,
      'tipo_bien': tipoBien,
      'cantidad_kg': cantidadKg,
      'comunidad_destino_id': comunidadDestinoId,
      'timestamp_creacion': timestampCreacion,
      'hash_sha256': hashOrigen,
    };
  }
}

class Entrega {
  final int? id;
  final String loteId;
  final String hashOrigen;
  final String hashCalculadoRecepcion;
  final bool integridadValidada;
  final String timestampEntrega;
  final String receptorFirmaId;

  Entrega({
    this.id,
    required this.loteId,
    required this.hashOrigen,
    required this.hashCalculadoRecepcion,
    required this.integridadValidada,
    required this.timestampEntrega,
    required this.receptorFirmaId,
  });

  /// Crea una instancia de Entrega a partir de un mapa de base de datos (SQLite).
  factory Entrega.fromMap(Map<String, dynamic> map) {
    return Entrega(
      id: map['id'],
      loteId: map['lote_id'] ?? '',
      hashOrigen: map['hash_origen'] ?? '',
      hashCalculadoRecepcion: map['hash_calculado_recepcion'] ?? '',
      integridadValidada: (map['integridad_validada'] as int) == 1,
      timestampEntrega: map['timestamp_entrega'] ?? '',
      receptorFirmaId: map['receptor_firma_id'] ?? '',
    );
  }

  /// Convierte la instancia de Entrega a un mapa para SQLite.
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'lote_id': loteId,
      'hash_origen': hashOrigen,
      'hash_calculado_recepcion': hashCalculadoRecepcion,
      'integridad_validada': integridadValidada ? 1 : 0,
      'timestamp_entrega': timestampEntrega,
      'receptor_firma_id': receptorFirmaId,
    };
  }

  /// Convierte a JSON para sincronización con el backend.
  Map<String, dynamic> toJson() {
    return {
      'lote_id': loteId,
      'hash_origen': hashOrigen,
      'hash_calculado_recepcion': hashCalculadoRecepcion,
      'integridad_validada': integridadValidada,
      'timestamp_entrega': timestampEntrega,
      'receptor_firma_id': receptorFirmaId,
    };
  }
}
