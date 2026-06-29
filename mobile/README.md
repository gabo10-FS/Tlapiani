# Tlapiani - Aplicación Móvil (Última Milla)

Este directorio contiene el código base del componente de **Movilidad en la Última Milla** para Tlapiani. Se trata de una aplicación móvil híbrida desarrollada en **Flutter** diseñada específicamente para operar en zonas rurales con nula o baja conectividad celular en México. Su propósito es permitir a los voluntarios y autoridades locales escanear los códigos QR de los lotes de ayuda, validar criptográficamente su integridad en tiempo real (offline) y sincronizar las bitácoras con el servidor central una vez que se detecte una conexión estable a internet.

---

## Tecnologías y Dependencias

La aplicación se desarrollará en **Flutter (Dart)** para garantizar compatibilidad multiplataforma (enfocado principalmente en dispositivos Android de gama media-baja). El archivo `pubspec.yaml` debe incluir las siguientes dependencias clave:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Navegación y Estado
  provider: ^6.1.1               # Gestión de estado recomendada (o flutter_bloc / riverpod)
  
  # Criptografía
  crypto: ^3.0.3                 # Cálculo local del Hash SHA-256
  
  # Persistencia Local (Modo Offline)
  sqflite: ^2.3.0                # Base de datos relacional SQLite local
  path: ^1.8.3                   # Utilidades de rutas de archivos para SQLite
  flutter_secure_storage: ^9.0.0 # Almacenamiento seguro de tokens JWT
  
  # Hardware y Conectividad
  mobile_scanner: ^5.1.1         # Escaneo rápido de códigos QR usando la cámara nativa
  connectivity_plus: ^6.0.3      # Detección de estado de red (Wi-Fi / Datos móviles)
  
  # HTTP Client
  http: ^1.2.1                   # Consumo de la API REST del backend
```

---

## Estructura Recomendada de Archivos

Para mantener una arquitectura limpia y modular en Flutter, se sugiere la siguiente estructura de carpetas bajo el directorio `lib/`:

```
lib/
├── main.dart                  # Punto de entrada de la aplicación
├── models/
│   └── lote_model.dart        # Modelo de datos para Lote y Entrega
├── services/
│   ├── api_service.dart       # Cliente HTTP y lógica de sincronización diferida
│   ├── database_service.dart  # Inicialización y queries a la base de datos SQLite local
│   └── cryptography_service.dart # Recálculo y validación de firmas SHA-256
├── screens/
│   ├── login_screen.dart      # Autenticación inicial con JWT
│   ├── home_screen.dart       # Pantalla principal y estado de sincronización
│   ├── scanner_screen.dart    # Interfaz de la cámara para escanear el QR
│   └── sync_screen.dart       # Gestión manual del historial de entregas locales
└── widgets/
    └── offline_indicator.dart # Banner flotante indicador del estado de red
```

---

## Módulos y Requerimientos Funcionales

### 1. Autenticación y Sesión Segura
- **Login**: Los voluntarios deben iniciar sesión por primera vez con conexión a internet para descargar sus credenciales y el token de acceso JWT.
- **Persistencia**: El token JWT debe almacenarse en el almacenamiento seguro del dispositivo utilizando `flutter_secure_storage`. Si no hay internet, la app debe permitir el acceso local si las credenciales coinciden con los datos previamente cacheados de forma segura.

### 2. Escáner de Integridad (Cámara y QR)
- **Activación de Cámara**: Utilizar la cámara del smartphone mediante `mobile_scanner`. Se debe optimizar el ciclo de vida del controlador de la cámara para apagarla inmediatamente cuando el usuario salga de esta pantalla, reduciendo significativamente el consumo de batería.
- **Lectura del QR**:
  - Al escanear, el código QR entregará la información estructurada del lote. El QR debe contener los siguientes campos:
    - `lote_id` (Ej. `TLAP-2026-9981`)
    - `tipo_bien` (Ej. `Canasta Básica Alimentos`)
    - `cantidad_kg` (Ej. `25.0`)
    - `comunidad_destino_id` (Ej. `21005`)
    - `timestamp_creacion` (Ej. `2026-06-29T09:15:00Z`)
    - `hash_origen` (El hash firmado originalmente por el backend: `8f3c64e32...`)

### 3. Validación Criptográfica Local (Modo Offline)
Una vez escaneados los datos del lote, la aplicación debe realizar la verificación criptográfica **completamente fuera de línea**:
- **Algoritmo**: Recalcular el hash SHA-256 concatenando los campos del lote en el orden exacto especificado por el contrato del backend.
  - **Fórmula de concatenación**:
    $$Sello = SHA-256(ID\_Lote \ || \ Tipo\_Bien \ || \ Cantidad \ || \ Destino \ || \ Timestamp)$$
  - *Nota*: Asegurarse de utilizar el mismo formato de texto, separadores (ej. el caracter pipe `|` o concatenación directa) y codificación UTF-8 que el backend.
- **Verificación**:
  - Comparar el hash recalculado localmente con el `hash_origen` leído del código QR.
  - **Resultado Exitoso (Match)**: Mostrar una pantalla o tarjeta en color **verde esmeralda** indicando "Integridad Validada. El paquete no ha sido manipulado". Registrar la entrega como exitosa (`integridad_validada = true`).
  - **Resultado Fallido (No-Match)**: Mostrar una alerta sonora y visual en color **rojo carmesí** indicando "ALERTA DE ALTERACIÓN. El contenido o destino del lote no coincide con el sello digital de origen". Registrar la entrega como alerta de manipulación (`integridad_validada = false`).

### 4. Base de Datos Local (Persistencia SQLite)
Cuando la aplicación se encuentra en una zona rural sin cobertura, todas las entregas validadas deben almacenarse localmente.
- **Base de Datos**: SQLite gestionada a través del servicio `database_service.dart`.
- **Esquema de la Tabla `entregas`**:
```sql
CREATE TABLE entregas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lote_id TEXT NOT NULL,
  hash_origen TEXT NOT NULL,
  hash_calculado_recepcion TEXT NOT NULL,
  integridad_validada INTEGER NOT NULL, -- 0 para falso, 1 para verdadero
  timestamp_entrega TEXT NOT NULL,       -- ISO 8601 del momento exacto del escaneo
  receptor_firma_id TEXT NOT NULL        -- Identificación de quien recibe (ej. CURP)
);
```

### 5. Sincronización Diferida
La aplicación debe monitorear el estado de la red en segundo plano utilizando `connectivity_plus`.
- **Detección de Red**:
  - Al detectar una transición de "sin red" a "red activa" (Wi-Fi o datos móviles), la aplicación debe notificar al voluntario de forma sutil e iniciar el proceso de sincronización.
- **Envío en Lote (Batch)**:
  - Leer todas las filas de la tabla local `entregas`.
  - Si existen registros, realizar una petición POST al endpoint del backend `/api/v1/envios/sincronizar` enviando el listado completo de entregas en formato JSON.
  - El payload debe coincidir con el contrato:
    ```json
    {
      "dispositivo_uuid": "UUID-UNICO-DEL-DISPOSITIVO",
      "timestamp_sincronizacion": "2026-06-29T12:00:00Z",
      "entregas": [ ... ]
    }
    ```
  - **Limpieza Local**: Si el servidor responde con un código `200 OK` confirmando la consolidación en MariaDB, la aplicación debe eliminar esas filas específicas de la base de datos SQLite local para evitar duplicidades y liberar almacenamiento en el dispositivo.

---

## Optimización para Dispositivos de Gama Media-Baja (RNF-3.2)

1. **Eficiencia en Memoria**: Evitar mantener en memoria imágenes de escaneo grandes. Liberar inmediatamente el buffer de la cámara de `mobile_scanner` tras una lectura exitosa.
2. **Consumo de Batería**: No ejecutar tareas de polling innecesarias para detectar internet. En su lugar, utilizar los streams de eventos nativos provistos por `connectivity_plus`.
3. **Tamaño del Paquete (APK)**: Mantener el tamaño del APK al mínimo evitando dependencias redundantes o archivos de assets (imágenes pesadas, fuentes sin comprimir) no utilizados. Usar imágenes en formato vectorial (SVG) siempre que sea posible.
4. **Diseño de Interfaz Híbrida**: Diseñar un banner flotante discreto en la parte superior o inferior de la pantalla que muestre claramente el estado actual:
   - 🟢 *En línea (Sincronizado)*
   - 🟡 *Modo Offline (X entregas pendientes de sincronizar)*
