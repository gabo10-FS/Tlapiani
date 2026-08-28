# Integración Backend ↔ Dashboard/Móvil — Mismatches Detectados

Este documento registra las diferencias entre lo que expone el backend real (`backend/app/api/v1/`, contrato en `backend/README.md`) y lo que actualmente consumen `dashboard_web` y `mobile_app`. **No se modificó ningún archivo de `dashboard/` ni `mobile/` para producir este documento** — es solo diagnóstico, por decisión de scope (ver `Tlapiani/CLAUDE.md` y el historial de esta conversación).

Importante: los `services/*.api.ts` del dashboard son **mocks con datos hardcodeados**, no clientes HTTP reales todavía (todos tienen un comentario `// TODO: reemplazar con → await browserClient...`). Esto no es una integración rota — es trabajo de integración que directamente no ha empezado. El propósito de este documento es que, cuando alguien lo empiece, sepa exactamente qué cambiar.

## Resumen

| Endpoint backend | ¿Dashboard lo consume? | Estado |
|---|---|---|
| `POST /api/v1/donaciones/registrar` | Sí, mock en `inventario.api.ts` | 🔴 Mismatch — endpoint y payload distintos |
| `GET /api/v1/donaciones/historial/{lote_id}` | Sí, mock en `transparencia.api.ts` | 🔴 Mismatch — modelo de datos distinto |
| `POST /api/v1/donaciones/{lote_id}/despachar` | Sí, mock en `despacho.api.ts` | 🔴 Mismatch — el más profundo de todos |
| `GET /api/v1/comunidades/prioridad` | Sí, mock en `mapa.api.ts` | 🔴 Mismatch — endpoint, casing, tipos e IDs |
| `POST /api/v1/auth/login` | Indirectamente (BFF propio) | 🟡 Payload alineado, pero flujo aún no conectado |
| `POST /api/v1/usuarios/registrar`, `GET /api/v1/usuarios` | No | ⚪ Sin equivalente en el dashboard todavía |
| `POST /api/v1/comunidades/{id}/alerta-emergencia`, `/recalcular` | No | ⚪ Sin equivalente, pero el campo `alertaActiva` ya existe en el tipo del mapa |
| `POST /api/v1/envios/sincronizar` | No aplica (es de `mobile_app`) | 🟢 Alineado con `mobile/README.md` |

---

## 1. `POST /api/v1/donaciones/registrar`

**Backend real** (`app/schemas/lote.py::RegistroLotePayload`):
```json
{
  "tipo_bien": "Alimentos",
  "cantidad_kg": 25.0,
  "comunidad_destino_id": 21005,
  "origen_acopio": "Centro de Acopio Puebla Centro"
}
```
Respuesta: `{ "lote_id", "status", "hash_sha256", "timestamp_creacion" }`.

**Dashboard mock** (`dashboard/modules/inventario/services/inventario.api.ts` + `lote.types.ts::RegistroLotePayload`):
- Endpoint distinto: `POST /inventario/lotes` (no `/api/v1/donaciones/registrar`).
- Payload en camelCase y con campos distintos:
  ```ts
  { tipoBien: TipoBien; cantidad: number; unidad: string; idComunidadDestino: string; nombreComunidad: string }
  ```
- `idComunidadDestino` es un **string** (`"COM-OAX-01"`); en el backend `comunidad_destino_id` es un **INT** autoincremental. No son el mismo tipo de identificador — no se puede simplemente renombrar el campo, hay que resolver primero cómo el dashboard va a obtener IDs numéricos reales de `GET /comunidades/prioridad`.
- El mock genera el hash del lote en el propio cliente (`crypto.randomUUID()` concatenado) — **no es SHA-256 real** ni sigue la fórmula de RF-1.2. Esto es aceptable en un mock, pero es importante que no sobreviva a la integración: el hash *debe* venir siempre del backend.
- No existe el campo `unidad` en el backend — `cantidad_kg` asume kilogramos siempre. Si el dashboard necesita otras unidades (litros, cajas, prendas — ya usadas en sus datos mock), eso requiere una decisión de producto antes de integrar, no es solo un rename.

**Qué necesitaría cambiar del lado del dashboard** (para cuando se aborde, no ahora):
1. Apuntar `inventarioService.registrarLote` a `POST /api/v1/donaciones/registrar`.
2. Convertir el payload a snake_case con los 4 campos exactos de arriba.
3. Resolver `comunidad_destino_id` como INT — probablemente el `<select>` de comunidad debe poblarse desde `GET /comunidades/prioridad` (que si expone `comunidad_id: number`) en vez de un mock de strings.
4. Decidir qué hacer con `unidad`, que no tiene equivalente en el backend actual.
5. Dejar de generar el hash en el cliente; usarlo tal cual lo devuelve `hash_sha256`.

---

## 2. `GET /api/v1/donaciones/historial/{lote_id}`

**Backend real** (`app/schemas/lote.py::HistorialLoteResponse`):
```json
{
  "lote_id": "TLAP-2026-9981",
  "tipo_bien": "...", "cantidad_kg": 25.0, "origen_acopio": "...",
  "comunidad_destino": "San Juan Cancuc, Chiapas",
  "hash_origen": "...", "estado_actual": "Entregado Exitosamente",
  "bitacora_movimientos": [ { "estado", "timestamp", "detalle" } ]
}
```

**Dashboard mock** (`transparencia.api.ts` + `auditoria.types.ts::PasaporteDigital`):
- Formato de ID completamente distinto: `LOT-YYYYMMDD-XXX` (ej. `LOT-20240115-001`) vs el formato real del backend `TLAP-YYYY-XXXX` (generado por `lote_secuencias`, ver `integridad_service.py`). Cualquier lote que exista hoy solo en el mock nunca va a poder buscarse contra el backend real.
- El timeline del mock (`EventoAuditoria`) modela cada evento con su **propio hash encadenado** (`hashBloque: "hash del bloque anterior"`) — una estructura tipo blockchain evento-a-evento. El backend **no implementa eso**: la inmutabilidad de RNF-1.1 se logra con un trigger SQL que bloquea `UPDATE`/`DELETE` sobre `envios_bitacora`, no con una cadena de hashes por evento. `bitacora_movimientos` del backend no trae `hashBloque` ni `actor` (salvo el que ya está embebido en el texto de `detalle`) ni un campo `tipo` categorizado (`creacion`/`transito`/`entrega`/`alerta`/`verificacion`) — solo `estado`/`timestamp`/`detalle` en texto libre.
- El dashboard usa el término "pasaporte digital" (`getPasaporteById`, `PasaporteDigital`) mientras el backend y el `README.md` raíz usan "historial". Es solo naming, pero conviene unificarlo para no confundir a quien lea ambos lados.

**Qué necesitaría cambiar del lado del dashboard:**
1. Decidir si el timeline hash-encadenado (`hashBloque`) es un requisito de producto real o quedó del boceto inicial — si es real, es un cambio de **backend** (agregar hash por evento a `envios_bitacora`/estado), no solo de integración del dashboard.
2. Adaptar `PasaporteDigital` a los campos reales de `HistorialLoteResponse`, o mapear uno a otro en una capa de transformación.
3. El formato de ID debe pasar a `TLAP-YYYY-XXXX` en cualquier dato de prueba nuevo.

---

## 3. `POST /api/v1/donaciones/{lote_id}/despachar`

Este es el mismatch más profundo — no es solo de nombres de campo, es de **modelo de datos**.

**Backend real**: despachar es una **transición de estado sobre el lote existente** (`lotes.estado_actual: Creado → En Ruta`, más `transportista_id`/`despachado_en`). No se crea una entidad nueva ni se regenera el hash — el sello SHA-256 se generó una sola vez, en `registrar_lote`.
```json
// payload: { "transportista_id": 10, "notas": "..." }
// respuesta: { "lote_id", "estado_actual", "transportista_id", "despachado_en" }
```

**Dashboard mock** (`despacho.api.ts` + `despacho.types.ts`): modela el despacho como una **entidad nueva e independiente** (`Despacho`, con su propio `id: "DSP-001"`, su propio `estado: "Pendiente"|"En Camino"|"Completado"|"Cancelado"` — 4 valores que no existen en `EstadoLote` del backend), y **genera un hash nuevo en el cliente** (`crearDespacho` hace `crypto.randomUUID()...` otra vez) como si el despacho tuviera su propio sello, cuando el sello es del lote y ya existe desde que se registró.
- `operador` es un string libre con el nombre de la persona; el backend usa `transportista_id` (FK a `usuarios`, debe ser un usuario real con `rol = "Transportista"`).
- El mock construye su propio `qrData` (`{ idLote, hash, comunidadDestino, timestamp, version }`) en camelCase — el backend no tiene ningún endpoint que devuelva esta forma; el QR tendría que construirse en el cliente combinando el payload que el dashboard ya envió a `/donaciones/registrar` con la respuesta de esa llamada (ver nota en la sección de móvil más abajo sobre qué campos necesita el QR).

**Qué necesitaría cambiar del lado del dashboard:**
1. Repensar `Despacho` como una vista sobre `Lote` en estado `En Ruta`, no como una entidad separada con su propio ciclo de vida de 4 estados.
2. Cambiar `operador` (string libre) por selección de un `transportista_id` real, lo que a su vez requiere que exista alguna forma de listar transportistas — hoy no hay UI para eso, y del lado backend sería `GET /api/v1/usuarios?rol=Transportista` (actualmente `GET /usuarios` no soporta filtro por rol; sería una extensión menor si se necesita).
3. Dejar de generar hash en el despacho — no hay hash nuevo que generar ahí.

---

## 4. `GET /api/v1/comunidades/prioridad`

**Backend real**:
```json
[{ "comunidad_id": 21005, "nombre": "...", "estado": "...", "score_urgencia": 98.4,
   "clasificacion": "Prioridad Crítica", "coordenadas": { "lat": 16.9247, "lng": -92.4283 } }]
```
Clasificación de 3 niveles: `Prioridad Crítica` (≥80), `Prioridad Alta` (50–79), `Prioridad Baja` (<50).

**Dashboard mock** (`mapa.api.ts` + `urgencia.types.ts`):
- Endpoint distinto (`GET /mapa/comunidades`), estructura plana en vez de `coordenadas` anidado (`lat`/`lng` sueltos), camelCase (`scoreUrgencia`).
- `id` es string (`"COM-OAX-01"`) vs `comunidad_id` entero en el backend — mismo problema de tipos que en el punto 1.
- Taxonomía de clasificación **de 5 niveles**, no 3: `"critica" | "alta" | "media" | "baja" | "segura"` (`NivelUrgencia`). El backend solo tiene 3 (`Crítica`/`Alta`/`Baja`). Si el dashboard realmente necesita 5 niveles visuales, eso es una decisión de producto que cambiaría `clasificar()` en `app/services/priorizacion_service.py`, no solo un mapeo de nombres.
- Trae campos que el backend no expone en este endpoint: `municipio`, `poblacion`, `indiceMarginacion`, `ultimaActualizacion`. Podrían añadirse a `ComunidadPrioridadResponse` si se decide que la UI los necesita.
- **Coincidencia real, vale la pena resaltarla**: `alertaActiva: boolean` ya existe en el tipo mock del dashboard — es exactamente el campo que agregamos a `comunidades.alerta_activa` al resolver el gap de diseño de CENAPRED (ver conversación anterior). El diseño del mapa ya *esperaba* este concepto aunque nunca se implementó del lado backend hasta ahora; solo falta exponerlo en la respuesta de `/comunidades/prioridad` (hoy `ComunidadPrioridadResponse` no lo incluye, aunque el modelo `Comunidad` sí lo tiene) y no hay una forma sencilla de ver `alerta_motivo` del lado del mapa todavía.

---

## 5. `POST /api/v1/auth/login`

**Alineado en el payload**, con una salvedad importante de arquitectura:
- Backend espera `{ email, password }` → devuelve `{ access_token, token_type, rol }`.
- El propio endpoint del dashboard, `dashboard/app/api/auth/login/route.ts`, **también** recibe `{ email, password }` — coinciden en el nombre del campo (esto ya se alineó a propósito en una sesión anterior, ver `Tlapiani/CLAUDE.md`).
- Pero ese endpoint del dashboard **no llama al backend en absoluto todavía**: valida contra un array `USUARIOS_DEV` hardcodeado y llama a `setSession()`, que no existe (`lib/auth/session.ts` no está creado — ver el gap ya documentado en `Tlapiani/CLAUDE.md`). Es decir: hoy hay *dos* "logins" que no se hablan entre sí, no un mismatch de contrato. Cuando se cree `lib/auth/session.ts`, ese archivo es el que debería llamar a `POST /api/v1/auth/login` del backend real (vía `lib/api/client.ts`, tampoco creado) y envolver el `access_token` recibido en la cookie httpOnly — el dashboard nunca debería exponer el JWT crudo al navegador.

No hay nada que documentar como "mismatch de payload" aquí porque no lo hay — es un problema de que el lado dashboard todavía no invoca al backend, que ya estaba fuera de este scope.

---

## 6. `POST /api/v1/usuarios/registrar`, `GET /api/v1/usuarios`

Sin equivalente en el dashboard: no existe ningún archivo bajo `dashboard/modules/` que llame a un endpoint de usuarios, ni una pantalla de alta de usuarios (a pesar de que RF-2.1 la pide). No es un mismatch — es una funcionalidad de RF-2.1 que el dashboard todavía no construyó, ni siquiera como mock.

---

## 7. `POST /api/v1/comunidades/{id}/alerta-emergencia`, `POST /api/v1/comunidades/recalcular`

Ambos son endpoints nuevos que no existían en el `backend/README.md` original (se diseñaron para cerrar el gap de ingesta de CENAPRED). El dashboard no tiene ninguna pantalla ni mock que los invoque — coherente, porque no existían cuando se construyeron los mocks. La única señal de que el concepto ya estaba anticipado es el campo `alertaActiva` mencionado en el punto 4.

---

## 8. `POST /api/v1/envios/sincronizar` — Alineado

No aplica al dashboard (es exclusivo de `mobile_app`). Comparado contra `mobile/README.md` §"Sincronización Diferida", el payload documentado ahí (`dispositivo_uuid`, `timestamp_sincronizacion`, `entregas[]` con `lote_id`/`hash_origen`/`hash_calculado_recepcion`/`integridad_validada`/`timestamp_entrega`/`receptor_firma_id`) **coincide exactamente** con `app/schemas/envio.py::SincronizarEnviosPayload` y con lo implementado en `app/api/v1/envios.py`. No hay mismatch que corregir aquí.

---

## 9. Mismatches / gaps en `mobile/README.md` (sin código todavía)

`mobile_app` no tiene código, así que no puede haber un mismatch de implementación — pero sí hay **dos gaps de especificación** en `mobile/README.md` frente a lo que el backend ya define en concreto:

1. **Formato exacto del hash, no especificado con precisión suficiente.** `mobile/README.md` dice: *"Asegurarse de utilizar el mismo formato de texto, separadores (ej. el carácter pipe `|` o concatenación directa) y codificación UTF-8 que el backend"* — es una nota de precaución, no una especificación. El backend ya fijó el formato exacto en `app/services/integridad_service.py::generar_sello`: campos unidos con `|`, `cantidad_kg` con **exactamente 2 decimales** (`f"{cantidad_kg:.2f}"`), timestamp como `%Y-%m-%dT%H:%M:%SZ` en UTC (sin microsegundos), UTF-8. Nada de esto está en `mobile/README.md` todavía — cuando se implemente la app, replicar el formato "aproximado" actual del README produciría hashes que nunca hacen match contra el backend real (ej. si se formatea `cantidad_kg` como `25.0` en vez de `25.00`, o el timestamp con microsegundos). **Recomendación (no ejecutada, es de scope mobile):** cuando se toque `mobile/README.md`, copiar el formato exacto de `generar_sello` ahí, no solo la fórmula conceptual.

2. **Los campos del QR no vienen completos en la respuesta de `/donaciones/registrar`.** `mobile/README.md` dice que el QR debe contener `lote_id`, `tipo_bien`, `cantidad_kg`, `comunidad_destino_id`, `timestamp_creacion` y `hash_origen` — los 5 campos que entran en la fórmula del hash, más el hash mismo — porque sin `tipo_bien`/`cantidad_kg`/`comunidad_destino_id` la app móvil no puede recalcular nada offline. Pero `RegistroLoteResponse` (lo único que el backend devuelve al registrar) solo trae `lote_id`, `status`, `hash_sha256`, `timestamp_creacion` — le faltan `tipo_bien`, `cantidad_kg` y `comunidad_destino_id`. Esto **no es un bug del backend**: quien arma el QR (el dashboard, en la pantalla de despacho) ya tiene esos tres campos porque los mandó él mismo en el payload de `registrar_lote` — solo tiene que combinarlos con la respuesta, no puede limitarse a "imprimir lo que el backend devolvió". Vale la pena dejarlo explícito acá porque no está escrito en ningún lado todavía y es fácil que quien construya la pantalla de QR (dashboard) o el escáner (móvil) asuma que un solo endpoint ya trae todo.

---

## Decisiones pendientes de equipo

Esta sección es distinta de los hallazgos de arriba: son puntos donde **no me corresponde decidir unilateralmente** la solución, porque implican un trade-off de producto/arquitectura. Quedan documentados como recomendación, no como cambio hecho. Nada de lo que sigue está implementado.

### `comunidad_destino_id` (INT) vs `idComunidadDestino` (string) — ⚠️ PENDIENTE DE APROBAR CON EL EQUIPO

**Contexto** (ver secciones [1](#1-post-apiv1donacionesregistrar) y [4](#4-get-apiv1comunidadesprioridad) arriba): el backend usa `comunidades.id` como entero autoincremental — es la PK real de la tabla y lo que referencian las foreign keys de `lotes.comunidad_destino_id`. El mock del dashboard usa códigos legibles tipo `"COM-OAX-01"` como identificador. No es un simple problema de nombre de campo (`idComunidadDestino` vs `comunidad_destino_id`) — son dos *tipos* de identificador distintos, y elegir uno u otro como "la" identidad pública de una comunidad es una decisión de producto, no de nomenclatura.

**Posible solución de compromiso (NO IMPLEMENTADA):** agregar una columna adicional `codigo_publico` (string, único, ej. `"COM-OAX-01"`) a la tabla `comunidades`, que **conviva junto al `id` entero interno sin reemplazarlo**:
- El backend seguiría usando `id` (INT) como PK y en todas las foreign keys (`lotes.comunidad_destino_id`) — no se toca el esquema relacional, ni las migraciones ya escritas, ni ningún endpoint que ya recibe/devuelve `comunidad_destino_id` como entero.
- `GET /api/v1/comunidades/prioridad` expondría también `codigo_publico` junto a `comunidad_id`, para que el dashboard tenga un identificador humano-legible para mostrar/buscar sin que ese sea el que viaja en los payloads que mutan datos (`POST /donaciones/registrar` seguiría pidiendo el `comunidad_destino_id` entero).

**A favor:**
- No rompe nada de lo ya implementado (PK/FK enteros, `lote_secuencias`, triggers de inmutabilidad no se tocan).
- Resuelve el problema de UX inmediato de mostrarle a un humano `21005` en vez de algo legible, sin bloquear el resto del trabajo de integración mientras se decide.

**En contra / riesgos:**
- Introduce dos identificadores por fila en `comunidades` — riesgo real de que distintas partes del sistema usen uno u otro de forma inconsistente si no queda clarísimo cuál es "para máquina" (`id`) y cuál "para humano" (`codigo_publico`).
- Falta decidir el esquema de generación de `codigo_publico` (¿se captura a mano al alta de la comunidad? ¿se genera por región + consecutivo, como sugieren los ejemplos del mock — `COM-OAX-01`, `COM-GRO-07`?). Sin esa regla, el campo queda a medio definir.
- No resuelve el problema de fondo si el dashboard insiste en usar el string como *el* identificador para escribir en `POST /donaciones/registrar` — en ese caso, en algún punto del flujo alguien igual tiene que resolver `codigo_publico → id` antes de llamar al backend, y esa responsabilidad (¿backend acepta ambos? ¿solo el dashboard resuelve?) también habría que decidirla.

**Qué no se hizo:** no se tocó `app/models/comunidad.py`, la migración `0001_initial_schema.py`, ni ningún schema de `app/schemas/comunidad.py`. Esto es solo la recomendación por escrito — requiere aprobación explícita antes de convertirse en código.
