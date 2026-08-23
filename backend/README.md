# Tlapiani - Backend API (FastAPI & MariaDB)

Este directorio contiene el núcleo lógico, criptográfico y analítico de Tlapiani. Es una API RESTful de alto rendimiento construida con **FastAPI** (Python) y diseñada para ejecutarse de forma nativa en entornos de producción tradicionales (**Bare-Metal**) utilizando **Apache** como proxy inverso y **MariaDB** como motor de persistencia inmutable.

> **Nota sobre requisitos:** el documento formal de requisitos del proyecto pide PostgreSQL (RF-1.4) y contenerización completa en Docker (RNF-3.1). Este backend se queda deliberadamente en **MariaDB + bare-metal** tal como está documentado aquí; es una desviación consciente frente al documento de requisitos, no un descuido.

---

## Quickstart (desarrollo local)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows — en Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # y ajustar credenciales de MariaDB

alembic upgrade head          # crea el esquema + triggers de inmutabilidad
uvicorn app.main:app --reload --port 8000

pytest                        # tests unitarios de los servicios (no requieren BD)
```

`GET /docs` expone el Swagger UI una vez levantado el servidor.

---

## Módulos Centrales de Desarrollo

El backend expone su lógica a través de dos submódulos críticos en el directorio `app/services/`:

### Módulo A: Motor de Priorización Inteligente (IA)
Este servicio calcula de manera agnóstica y automatizada el nivel de urgencia de atención para cada localidad vulnerable de México. Evita la manipulación humana ejecutando una ponderación multivariable basada en la siguiente ecuación matemática:

$$SU = (\alpha \cdot IM) + (\beta \cdot IE) + (\gamma \cdot CE)$$

Donde:
- **$SU$**: Score de Urgencia Final (Normalizado de 0 a 100).
- **$IM$**: Índice de Marginación de la localidad (Fuente: CONAPO).
- **$IE$**: Índice de Vulnerabilidad Estructural o pobreza extrema (Fuente: CONEVAL).
- **$CE$**: Coeficiente de Emergencia Dinámica ante desastres naturales (Fuente: CENAPRED).
- **$\alpha, \beta, \gamma$**: Constantes de ponderación donde se cumple estrictamente la restricción de peso:
  $$\alpha + \beta + \gamma = 1$$

El desarrollador del backend debe implementar este motor de forma que las constantes puedan parametrizarse a través de variables de entorno, y proveer una tarea programada o endpoint administrativo para recalcular los Scores de todas las comunidades cuando se actualicen los índices o se emita una alerta de desastre (CENAPRED).

### Módulo B: Capa Criptográfica de Integridad (SHA-256)
Para erradicar el desvío de insumos, este servicio mitiga la manipulación de la información generando un "Sello de Integridad Digital" inalterable.

Cada vez que un lote es despachado, el servicio concatena los metadatos estructurados del envío y genera un resumen hash único:

$$Sello = SHA-256(ID\_Lote \ || \ Tipo\_Bien \ || \ Cantidad \ || \ Destino \ || \ Timestamp)$$

El registro subsiguiente en la base de datos almacena el hash del evento anterior, construyendo una cadena lógica de custodia (tipo Ledger/Blockchain). Si un paquete es alterado en tránsito, el hash recalculado en la aplicación móvil fallará de inmediato al compararse con este registro.

---

## Diseño de Base de Datos (MariaDB)

La base de datos relacional se ejecutará directamente sobre la máquina host. El DDL real y versionado vive en `migrations/versions/0001_initial_schema.py` (Alembic); lo de abajo es la referencia de diseño y ya incluye las correcciones sobre el boceto original (`AUTOINCREMENT` → `AUTO_INCREMENT`, que no es sintaxis válida de MariaDB) y las columnas añadidas para cerrar los gaps de diseño de alta de usuarios, despacho a ruta e ingesta de alertas CENAPRED:

```sql
-- Catálogo de Comunidades Rurales y Vulnerables
CREATE TABLE comunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    latitud DECIMAL(9, 6) NOT NULL,
    longitud DECIMAL(9, 6) NOT NULL,
    indice_marginacion DECIMAL(5, 2) DEFAULT 0.00,
    indice_pobreza DECIMAL(5, 2) DEFAULT 0.00,
    coeficiente_emergencia DECIMAL(5, 2) DEFAULT 0.00,
    score_urgencia DECIMAL(5, 2) DEFAULT 0.00,
    clasificacion VARCHAR(50) DEFAULT 'Prioridad Baja',
    alerta_activa BOOLEAN DEFAULT FALSE,         -- alerta CENAPRED vigente — ver Contrato #7
    alerta_motivo VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Usuarios del Sistema (RF-2.1)
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL, -- 'Administrador', 'Donante', 'Transportista'
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contador atómico para generar IDs TLAP-YYYY-XXXX sin colisiones bajo
-- concurrencia (RNF-2.2) — ver app/services/integridad_service.py
CREATE TABLE lote_secuencias (
    anio INT PRIMARY KEY,        -- sin AUTO_INCREMENT: el año se fija explícitamente
    ultimo_numero INT NOT NULL DEFAULT 0
);

-- Lotes de Ayuda y Donaciones
CREATE TABLE lotes (
    id VARCHAR(50) PRIMARY KEY, -- Formato: TLAP-YYYY-XXXX
    tipo_bien VARCHAR(150) NOT NULL,
    cantidad_kg DECIMAL(10, 2) NOT NULL,
    origen_acopio VARCHAR(150) NOT NULL,
    comunidad_destino_id INT NOT NULL,
    estado_actual VARCHAR(50) DEFAULT 'Creado', -- 'Creado', 'En Ruta', 'Entregado Exitosamente', 'Alerta de Manipulación'
    hash_sha256 VARCHAR(64) NOT NULL,           -- Sello original generado por el backend
    transportista_id INT NULL,                  -- asignado al despachar — ver Contrato #6
    despachado_en TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comunidad_destino_id) REFERENCES comunidades(id),
    FOREIGN KEY (transportista_id) REFERENCES usuarios(id)
);

-- Bitácora de Envíos y Validación Criptográfica (Inmutable)
CREATE TABLE envios_bitacora (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lote_id VARCHAR(50) NOT NULL,
    hash_origen VARCHAR(64) NOT NULL,
    hash_calculado_recepcion VARCHAR(64) NOT NULL,
    integridad_validada BOOLEAN NOT NULL,
    timestamp_entrega TIMESTAMP NOT NULL,
    receptor_firma_id VARCHAR(50) NOT NULL,  -- Identificador del receptor en campo (CURP)
    dispositivo_uuid VARCHAR(100) NOT NULL,  -- UUID del celular que validó
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- REQUISITO RNF-1.1: Restricción de Inmutabilidad en la Bitácora
-- Se debe definir un Trigger en MariaDB para impedir cualquier UPDATE o DELETE en envios_bitacora.
DELIMITER //
CREATE TRIGGER trg_prevent_update_bitacora
BEFORE UPDATE ON envios_bitacora
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se permite la modificación de registros históricos de entrega.';
END;
//

CREATE TRIGGER trg_prevent_delete_bitacora
BEFORE DELETE ON envios_bitacora
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se permite la eliminación de registros históricos de entrega.';
END;
//
DELIMITER ;
```

---

## Contratos de la API (Endpoints y Payloads)

Todas las peticiones a endpoints de administración y sincronización requieren la cabecera `Authorization: Bearer <JWT_TOKEN>`.

### 1. Autenticación
- **Endpoint**: `POST /api/v1/auth/login`
- **Payload Entrada**:
  ```json
  {
    "email": "admin@tlapiani.mx",
    "password": "mi_password_seguro"
  }
  ```
- **Respuesta (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "rol": "Administrador"
  }
  ```

### 2. Registro de Lotes (Dashboard Web → Backend)
- **Endpoint**: `POST /api/v1/donaciones/registrar`
- **Payload Entrada**:
  ```json
  {
    "tipo_bien": "Canasta Básica Alimentos",
    "cantidad_kg": 25.0,
    "comunidad_destino_id": 21005,
    "origen_acopio": "Centro de Acopio Puebla Centro"
  }
  ```
- **Respuesta (201 Created)**:
  ```json
  {
    "lote_id": "TLAP-2026-9981",
    "status": "Asignado",
    "hash_sha256": "8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e",
    "timestamp_creacion": "2026-06-29T09:15:00Z"
  }
  ```

### 3. Obtener Comunidades por Prioridad (Dashboard Web/Móvil → Backend)
- **Endpoint**: `GET /api/v1/comunidades/prioridad`
- **Respuesta (200 OK)**:
  ```json
  [
    {
      "comunidad_id": 21005,
      "nombre": "San Juan Cancuc",
      "estado": "Chiapas",
      "score_urgencia": 98.40,
      "clasificacion": "Prioridad Crítica",
      "coordenadas": { "lat": 16.924700, "lng": -92.428300 },
      "alerta_activa": true
    }
  ]
  ```
  `alerta_activa` refleja si la comunidad tiene una alerta CENAPRED vigente (ver Contrato #8, `POST /comunidades/{id}/alerta-emergencia`). No estaba en el contrato original — se agregó al resolver el gap de diseño de ingesta de CENAPRED.

### 4. Sincronización de Auditorías en Campo (App Móvil → Backend)
- **Endpoint**: `POST /api/v1/envios/sincronizar`
- **Payload Entrada**:
  ```json
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
  ```
- **Respuesta (200 OK)**:
  ```json
  {
    "sincronizacion_id": "SYNC-88192",
    "registros_procesados": 1,
    "alertas_manipulacion_detectadas": 0,
    "status": "Consolidado exitosamente"
  }
  ```

### 5. Historial del Lote (Público - Portal de Transparencia)
- **Endpoint**: `GET /api/v1/donaciones/historial/{lote_id}`
- **Respuesta (200 OK)**:
  ```json
  {
    "lote_id": "TLAP-2026-9981",
    "tipo_bien": "Canasta Básica Alimentos",
    "cantidad_kg": 25.0,
    "origen_acopio": "Centro de Acopio Puebla Centro",
    "comunidad_destino": "San Juan Cancuc, Chiapas",
    "hash_origen": "8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e",
    "estado_actual": "Entregado",
    "bitacora_movimientos": [
      {
        "estado": "Creado",
        "timestamp": "2026-06-29T09:15:00Z",
        "detalle": "Lote registrado y sellado en origen"
      },
      {
        "estado": "Entregado",
        "timestamp": "2026-06-29T12:30:00Z",
        "detalle": "Validación exitosa en campo. Receptor: CURP_RECEPTOR_VALIDADO. Dispositivo: 99f4c331..."
      }
    ]
  }
  ```

### 6. Alta de Usuarios (RF-2.1, solo Administrador)
- **Endpoint**: `POST /api/v1/usuarios/registrar`
- **Payload Entrada**:
  ```json
  {
    "nombre_completo": "Carlos Mendoza",
    "email": "carlos.mendoza@tlapiani.mx",
    "password": "temp_password_segura",
    "rol": "Transportista"
  }
  ```
- **Respuesta (201 Created)**:
  ```json
  {
    "id": 10,
    "nombre_completo": "Carlos Mendoza",
    "email": "carlos.mendoza@tlapiani.mx",
    "rol": "Transportista",
    "activo": true,
    "created_at": "2026-08-22T10:00:00Z"
  }
  ```
- **Listado**: `GET /api/v1/usuarios` (solo Administrador) — devuelve un arreglo de usuarios en el mismo formato.

### 7. Despacho de Lote a Ruta (RF-1.4 / RF-2.3, Administrador o Transportista)
Transiciona un lote de `Creado` a `En Ruta` asignándole un transportista. Solo es válido si el lote está en `Creado`; en cualquier otro estado responde `409 Conflict`.
- **Endpoint**: `POST /api/v1/donaciones/{lote_id}/despachar`
- **Payload Entrada**:
  ```json
  {
    "transportista_id": 10,
    "notas": "Ruta hacia San Juan Cancuc vía Ocosingo"
  }
  ```
- **Respuesta (200 OK)**:
  ```json
  {
    "lote_id": "TLAP-2026-9981",
    "estado_actual": "En Ruta",
    "transportista_id": 10,
    "despachado_en": "2026-08-22T10:05:00Z"
  }
  ```

### 8. Alerta de Emergencia CENAPRED (RF-1.1, solo Administrador)
Ingesta manual de una alerta de desastre para una comunidad: ajusta su `coeficiente_emergencia` y dispara el recálculo **de esa comunidad únicamente** (no un recálculo masivo — ver `app/services/priorizacion_service.py::recalcular_comunidad`). No existe un feed público estable de CENAPRED para automatizar esta ingesta, así que es un endpoint administrativo.

`coeficiente_emergencia` va en escala **0–100**, la misma que `indice_marginacion`/`indice_pobreza` — no 0–1. Con `γ=0.2`, una alerta de severidad máxima (100) puede aportar hasta 20 puntos al Score de Urgencia final; en escala 0–1 el aporte máximo sería 0.2 sobre 100, casi sin efecto práctico. El backend valida `0 ≤ coeficiente_emergencia ≤ 100` (`422` si no cumple).

- **Endpoint**: `POST /api/v1/comunidades/{comunidad_id}/alerta-emergencia`
- **Payload Entrada**:
  ```json
  {
    "coeficiente_emergencia": 95,
    "motivo": "Sismo 7.2 Mw reportado por CENAPRED",
    "activa": true
  }
  ```
- **Respuesta (200 OK)**: la comunidad actualizada, con `score_urgencia` y `clasificacion` ya recalculados.
  ```json
  {
    "id": 21005,
    "nombre": "San Juan Cancuc",
    "estado": "Chiapas",
    "score_urgencia": 95.00,
    "clasificacion": "Prioridad Crítica",
    "alerta_activa": true,
    "alerta_motivo": "Sismo 7.2 Mw reportado por CENAPRED",
    "updated_at": "2026-08-22T10:05:00Z"
  }
  ```

### 9. Desactivar Alerta de Emergencia (RF-1.1, solo Administrador)
Cierra la alerta vigente de una comunidad sin borrar el historial: pone `alerta_activa = false` y dispara el recálculo de esa comunidad. **No** modifica `alerta_motivo` (queda como registro de auditoría de la última alerta emitida) ni `coeficiente_emergencia` — bajar el coeficiente es una decisión aparte, explícita, vía el endpoint #8; desactivar la alerta no la implica automáticamente. Idempotente: llamarlo sobre una comunidad sin alerta activa no es error.
- **Endpoint**: `PATCH /api/v1/comunidades/{comunidad_id}/alerta-emergencia`
- **Payload Entrada**: ninguno.
- **Respuesta (200 OK)**: la comunidad actualizada (mismo formato que el endpoint #8), con `alerta_activa: false`.

### 10. Recálculo Masivo de Scores (RF-1.1, solo Administrador)
Para cuando se actualizan en bloque los índices de CONAPO/CONEVAL (ej. anualmente).
- **Endpoint**: `POST /api/v1/comunidades/recalcular`
- **Respuesta (200 OK)**:
  ```json
  { "comunidades_actualizadas": 214, "timestamp": "2026-08-22T10:10:00Z" }
  ```

---

## Configuración para Despliegue en Producción (Bare-Metal)

Al no permitirse el uso de contenedores (Docker/Podman), la aplicación se ejecutará utilizando herramientas nativas del sistema operativo Linux.

### 1. Variables de Entorno (`.env`)
Ver `.env.example` en la raíz del backend (copiar a `.env` y ajustar credenciales):
```env
# Driver async (aiomysql) para cumplir RNF-2.2 — concurrencia real de FastAPI.
# Alembic deriva su propia URL síncrona (pymysql) a partir de esta; no hace
# falta mantener dos variables.
DATABASE_URL=mysql+aiomysql://tlapiani_user:password_seguro@localhost:3306/tlapiani_db
JWT_SECRET=super_secret_key_genera_una_robusta
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Constantes del Score de Urgencia (Suma = 1.0)
PRIORIDAD_ALPHA=0.4  # Peso para Marginación (CONAPO)
PRIORIDAD_BETA=0.4   # Peso para Pobreza (CONEVAL)
PRIORIDAD_GAMMA=0.2  # Peso para Emergencias (CENAPRED)

CORS_ORIGINS=http://localhost:3000
```

### 2. Servicio del Sistema (`systemd`)
Para mantener el servidor FastAPI corriendo continuamente en segundo plano:
Crear el archivo `/etc/systemd/system/tlapiani-backend.service`:

```ini
[Unit]
Description=Tlapiani Backend FastAPI Service
After=network.target mariadb.service

[Service]
User=www-data
WorkingDirectory=/var/www/Tlapiani/backend
ExecStart=/var/www/Tlapiani/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tlapiani-backend.service
sudo systemctl start tlapiani-backend.service
```

### 3. Configuración de Apache como Proxy Inverso
Para exponer la API al exterior de manera segura utilizando HTTPS y servir el Dashboard estático.
Crear el archivo de configuración en Apache (ej. `/etc/apache2/sites-available/tlapiani.conf`):

```apache
<VirtualHost *:80>
    ServerName tlapiani.gob.mx
    DocumentRoot /var/www/Tlapiani/dashboard

    # Servir archivos estáticos del Dashboard
    <Directory /var/www/Tlapiani/dashboard>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Redirección de la API al servicio FastAPI
    ProxyPreserveHost On
    ProxyPass /api/v1 http://127.0.0.1:8000/api/v1
    ProxyPassReverse /api/v1 http://127.0.0.1:8000/api/v1

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/tlapiani_error.log
    CustomLog ${APACHE_LOG_DIR}/tlapiani_access.log combined
</VirtualHost>
```

Habilitar módulos y el sitio en Apache:
```bash
sudo a2enmod proxy proxy_http
sudo a2ensite tlapiani.conf
sudo systemctl restart apache2
```

### 4. HTTPS obligatorio (RNF-1.2)
El vhost de arriba sirve en `:80` sin cifrar — no cumple RNF-1.2 tal cual. Generar certificado y forzar TLS antes de exponer el servicio a producción, ej. con Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d tlapiani.gob.mx
```
`certbot --apache` añade el bloque `<VirtualHost *:443>` y la redirección `80 → 443` automáticamente sobre `tlapiani.conf`.

Los archivos de `deploy/tlapiani-backend.service` y `deploy/tlapiani.conf` en este repo son la versión canónica de lo anterior — cópialos a `/etc/systemd/system/` y `/etc/apache2/sites-available/` respectivamente en vez de transcribirlos a mano.