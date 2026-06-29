1. Backend (/backend)
Es el motor central del ecosistema. Funciona de manera nativa como un servicio del sistema (systemd) expuesto mediante un proxy inverso en Apache.

Responsabilidades:
- Validar la autenticación y emitir tokens de sesión (JWT).
- Ejecutar el algoritmo del Score de Urgencia (IA) cruzando las métricas de CONAPO, CONEVAL y CENAPRED.  
- Generar el identificador criptográfico SHA-256 inicial combinando los metadatos de los suministros.  
- llProveer la persistencia inmutable de la bitácora logística en la base de datos MariaDB.

2. Dashboard Web (/dashboard_web)
La interfaz administrativa de escritorio empaquetada como archivos estáticos servidos directamente por Apache.
Responsabilidades:
- Permitir a los administradores registrar la entrada y salida de inventario físico.
- Renderizar el mapa de vulnerabilidad nacional consumiendo los Scores de la API.  
- Transformar el hash emitido por el backend en un código QR dinámico listo para impresión física.
- Proveer una vista pública de auditoría para donantes externos.

3. Aplicación Móvil (/mobile_app)
Herramienta portátil nativa construida en Flutter para la validación en el terreno ("Última Milla").  
Responsabilidades:
- Activar el hardware de la cámara para escanear los códigos QR de los paquetes.  
- Recalcular de forma local y autónoma (offline) el hash SHA-256 del paquete para verificar que la información no fue alterada en el trayecto.  
- Almacenar temporalmente las firmas digitales de recibido en la base de datos embebida (modo offline).  
- Sincronizar de forma diferida las bitácoras acumuladas al detectar conectividad de red.  

------------------------------------------------------
Contratos de la API (Endpoints y JSON Payloads)
Todas las peticiones deben incluir el encabezado Authorization: Bearer <JWT_TOKEN> a excepción de las consultas públicas de transparencia.

1. Gestión de Suministros (Dashboard Web → Backend)
Endpoint: POST /api/v1/donaciones/registrar
Descripción: Registra un nuevo paquete de ayuda y genera su sello inmutable.
Payload de Entrada (JSON):
{
  "tipo_bien": "Canasta Básica Alimentos",
  "cantidad_kg": 25.0,
  "comunidad_destino_id": 21005,
  "origen_acopio": "Centro de Acopio Puebla Centro"
}
Respuesta del Servidor (JSON 201 Created):
{
  "lote_id": "TLAP-2026-9981",
  "status": "Asignado",
  "hash_sha256": "8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e",
  "timestamp_creacion": "2026-06-29T09:15:00Z"
}

2. Mapa de Calor Socioeconómico (Dashboard Web → Backend)
Endpoint: GET /api/v1/comunidades/prioridad
Descripción: Retorna el listado de comunidades ordenadas por el algoritmo de inteligencia artificial.
Respuesta del Servidor (JSON 200 OK):
[
  {
    "comunidad_id": 21005,
    "nombre": "San Juan Cancuc",
    "estado": "Chiapas",
    "score_urgencia": 98.4,
    "clasificacion": "Prioridad Crítica",
    "coordenadas": { "lat": 16.9247, "lng": -92.4283 }
  },
  {
    "comunidad_id": 21089,
    "nombre": "Sierra Norte Localidad B",
    "estado": "Puebla",
    "score_urgencia": 75.2,
    "clasificacion": "Prioridad Alta",
    "coordenadas": { "lat": 20.1234, "lng": -97.5678 }
   }
   
Se puede considerar enviar datos extras sobre los lugares para tener más información en el mapa.
]

3. Sincronización de Auditorías en Campo (App Móvil → Backend)
Endpoint: POST /api/v1/envios/sincronizar
Descripción: Envía los paquetes validados localmente de forma offline hacia el servidor central para cerrar la auditoría.  
Payload de Entrada (JSON):
{
  "dispositivo_uuid": "99f4c331-8822-4cba-a111-d002f1a92a88",
  "timestamp_sincronizacion": "2026-06-29T09:45:12Z",
  "entregas": [

    {
      "lote_id": "TLAP-2026-9981",
      "hash_origen": "8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e",
      "hash_calculado_recepcion": "8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e",
      "integridad_validada": true,
      "timestamp_entrega": "2026-06-29T06:30:00Z",
      "receptor_firma_id": "CURP_RECEPTOR_VALIDADO"
    }
  ]
}

Respuesta del Servidor (JSON 200 OK):
{
  "sincronizacion_id": "SYNC-88192",
  "registros_procesados": 1,
  "alertas_manipulacion_detectadas": 0,
  "status": "Consolidado exitosamente en MariaDB"
}
