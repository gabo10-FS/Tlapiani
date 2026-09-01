# Integración Backend ↔ Móvil / Dashboard — Contratos vigentes

Este documento reemplaza al `backend/INTEGRACION.md` anterior (borrado en `7014729`).
Ese archivo, de ~180 líneas, era en su mayoría **obsoleto**: describía mismatches
contra el dashboard Next.js (`dashboard/modules/*.api.ts`, `lib/auth/session.ts`,
identificadores tipo `"COM-OAX-01"`, "pasaporte digital", 5 niveles de urgencia en
el mock, etc.) que ya no existe — ese dashboard fue reemplazado por el vanilla JS
y neburxd ya cableó ese frontend al backend real (`36f9b4a`, `94a643f`).

Sólo se rescata acá lo que **sigue siendo un contrato activo entre servicios** y no
está escrito en ningún otro lado con la precisión necesaria.

---

## 1. Formato exacto de serialización del sello SHA-256

**Implementación de referencia**: `app/services/integridad_service.py::generar_sello`.
Cualquier cliente que recalcule el hash offline (la app móvil al recibir en campo,
el dashboard al armar el QR) **debe producir byte por byte la misma cadena de
entrada** o la verificación fallará y marcará un lote íntegro como manipulado.

### Reglas

| Regla | Valor |
|---|---|
| Orden de campos | `ID_Lote` → `Tipo_Bien` → `Cantidad` → `Comunidad_Destino_ID` → `Timestamp` |
| Separador | pipe `|` entre cada campo (no al inicio ni al final) |
| `Cantidad` | `cantidad_kg` con **exactamente 2 decimales fijos** (`f"{v:.2f}"` / `toStringAsFixed(2)`). `25` → `25.00`, `25.5` → `25.50` |
| `Comunidad_Destino_ID` | el entero tal cual, sin ceros a la izquierda (`21005`) |
| `Timestamp` | ISO 8601 UTC **con precisión de segundos**, sufijo literal `Z`, **sin** microsegundos, **sin** offset `+00:00`. Formato: `%Y-%m-%dT%H:%M:%SZ` → `2026-06-29T09:15:00Z` |
| Codificación | UTF-8 antes de aplicar SHA-256 |
| Salida | hex en minúsculas, 64 caracteres (`hexdigest()`) |

> **Ojo con el timestamp.** El backend calcula el sello a partir de un timestamp
> truncado a segundos (`formatear_timestamp()`), pero **ningún campo de respuesta
> de la API devuelve esa cadena exacta** — ver §2. Un cliente que reformatee el
> timestamp por su cuenta (agregando milisegundos, o usando `+00:00` en vez de
> `Z`) generará un hash distinto.

### Vector de prueba canónico

```
Entrada (cadena que se hashea, UTF-8):
TLAP-2026-9981|Canasta Básica Alimentos|25.00|21005|2026-06-29T09:15:00Z

SHA-256:
3191e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd1
```

Este vector está fijado en `tests/test_integridad_service.py::test_generar_sello_coincide_con_formula_documentada`
(backend) y en `mobile/test/cryptography_test.dart` (móvil). Ambos lados deben
seguir produciendo exactamente este hash.

### Estado de la implementación móvil

`mobile/lib/services/cryptography_service.dart::calcularHash` **cumple el contrato**:
usa separador `|` y 2 decimales por defecto, el mismo orden de campos, `utf8.encode`
y `sha256`. Reproduce el vector canónico de arriba (verificado). Pasa el
timestamp del QR tal cual, sin reformatearlo — que es lo correcto siempre y cuando
el QR lo traiga ya en `%Y-%m-%dT%H:%M:%SZ` (ver §2).

Pendientes menores del lado móvil (no rompen el contrato hoy, pero conviene
cerrarlos):

- El docstring de `calcularHash` dice que el separador "por defecto [es] vacío" —
  el default real del código es `'|'`. Sólo el comentario está mal.
- `validation_result_screen.dart` prueba, además del formato oficial, dos formatos
  "heredados" (`delimiter: ''` con 1 y con 0 decimales) y da el lote por **válido**
  si el hash coincide con cualquiera de ellos. No existe ningún formato heredado en
  el backend: `generar_sello` siempre fue `|` + `.2f`. Esos fallbacks debilitan la
  garantía de integridad (aceptan una serialización no canónica) y deberían
  quitarse.

---

## 2. Construcción del QR — la respuesta de `/donaciones/registrar` no basta

`RegistroLoteResponse` (`app/schemas/lote.py`), lo único que devuelve
`POST /api/v1/donaciones/registrar`, sólo trae:

```json
{ "lote_id": "...", "status": "Creado", "hash_sha256": "...", "timestamp_creacion": "..." }
```

**No incluye `tipo_bien`, `cantidad_kg` ni `comunidad_destino_id`** — y esos tres
campos entran en la fórmula del hash (§1). El escáner móvil los necesita para
recalcular el sello offline.

Esto **no es un bug del backend**: quien arma el QR (el dashboard, en la pantalla
de despacho) ya tiene esos tres valores porque él mismo los envió en el *request*
de `registrar_lote`. La regla es: **el QR se construye combinando el payload que
el cliente envió con la respuesta que recibió**, no imprimiendo sólo la respuesta.

### Campos que el QR debe contener

| Campo | De dónde sale |
|---|---|
| `lote_id` | respuesta (`lote_id`) |
| `tipo_bien` | request propio |
| `cantidad_kg` | request propio |
| `comunidad_destino_id` | request propio |
| `timestamp_creacion` | respuesta (`timestamp_creacion`) — **ver nota** |
| `hash_sha256` | respuesta (`hash_sha256`) |

### Nota sobre el `timestamp_creacion` en el QR

`timestamp_creacion` de `RegistroLoteResponse` es un `datetime` con microsegundos
(viene de `timestamp_utc()` = `datetime.now(timezone.utc)`). Pydantic lo serializa
como `2026-08-31T14:23:01.123456Z`. Pero el sello se calculó con ese mismo instante
**truncado a segundos** (`2026-08-31T14:23:01Z`).

⇒ El productor del QR **debe truncar el timestamp a segundos** (`%Y-%m-%dT%H:%M:%SZ`)
antes de meterlo al QR. Si copia el valor crudo de la respuesta, el hash que
recalcule el móvil no coincidirá nunca y todo lote se marcará como manipulado.

Opción de diseño a considerar (no implementada): que `RegistroLoteResponse`
devuelva el timestamp ya formateado como string con `formatear_timestamp()`, para
que no haya dos representaciones del mismo instante y el cliente no tenga que
saber que debe truncar.

---

## 3. Decisiones pendientes de equipo

### `comunidad_destino_id` entero interno vs. un `codigo_publico` legible

**Contexto**: el backend usa `comunidades.id` (entero autoincremental) como PK y en
todas las foreign keys (`lotes.comunidad_destino_id`, `fotos_comunidad.comunidad_id`).
Es lo que viaja en los payloads (`POST /donaciones/registrar` pide
`comunidad_destino_id: int`) y en el hash del sello. Para una UI, mostrarle a un
humano `21005` no es ideal; los mocks originales usaban códigos tipo `"COM-OAX-01"`.

**Posible compromiso (NO implementado)**: agregar una columna `codigo_publico`
(string, único) a `comunidades` que **conviva** con el `id` entero sin
reemplazarlo:

- El `id` (INT) sigue siendo la PK y la referencia de todas las FKs y del hash —
  no se toca el esquema relacional, ni las migraciones `0001`/`0002`, ni ningún
  endpoint existente.
- `GET /api/v1/comunidades/prioridad` expondría `codigo_publico` junto a
  `comunidad_id`, para tener un identificador legible sin que ese sea el que viaja
  en operaciones que mutan datos.

**A favor**: no rompe nada de lo ya construido; resuelve el problema de UX sin
bloquear el resto de la integración.

**En contra / sin decidir**:
- Dos identificadores por fila → riesgo de que distintas partes usen uno u otro de
  forma inconsistente si no queda clarísimo cuál es "para máquina" y cuál "para
  humano".
- Falta definir cómo se genera `codigo_publico`: ¿captura manual al alta?
  ¿región + consecutivo (`COM-OAX-01`)?
- Si el dashboard insistiera en usar el string como identificador para *escribir*
  (`POST /donaciones/registrar`), alguien igual tiene que resolver
  `codigo_publico → id` antes de llamar al backend, y hay que decidir de quién es
  esa responsabilidad.

**Estado**: sólo recomendación por escrito. Requiere aprobación explícita del
equipo antes de convertirse en código. No se ha tocado `app/models/comunidad.py`
ni `app/schemas/comunidad.py`.
