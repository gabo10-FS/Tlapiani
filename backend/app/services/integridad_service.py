"""RF-1.2 — Capa Criptográfica de Integridad (SHA-256).

Sello = SHA-256(ID_Lote || Tipo_Bien || Cantidad || Destino || Timestamp)

Formato EXACTO que debe replicar cualquier cliente que recalcule el hash offline
(app móvil, dashboard/vanilla): campos unidos con "|", cantidad_kg con dos
decimales fijos, timestamp en ISO 8601 UTC con sufijo "Z" y sin microsegundos,
codificado en UTF-8. Cambiar este formato rompe la verificación de todos los
lotes ya sellados.
"""

import hashlib
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import formatear_utc_z
from app.models.lote import LoteSecuencia

# Serializador canónico del timestamp del sello: 'YYYY-MM-DDTHH:MM:SSZ'.
# Es el mismo formato que usan TODAS las fechas de las respuestas (app/core/time)
# — se mantiene este alias porque INTEGRACION.md y el README lo citan por nombre.
formatear_timestamp = formatear_utc_z


def generar_sello(
    lote_id: str,
    tipo_bien: str,
    cantidad_kg: Decimal,
    comunidad_destino_id: int,
    timestamp: datetime,
) -> str:
    cantidad_fmt = f"{cantidad_kg:.2f}"
    timestamp_fmt = formatear_timestamp(timestamp)
    payload = f"{lote_id}|{tipo_bien}|{cantidad_fmt}|{comunidad_destino_id}|{timestamp_fmt}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def siguiente_lote_id(db: AsyncSession, anio: int) -> str:
    """Genera TLAP-YYYY-XXXX de forma atómica bajo concurrencia (RNF-2.2).

    Objetivo: dos registros de lote simultáneos nunca reciben el mismo número.
    Lo garantiza el propio `INSERT .. ON DUPLICATE KEY UPDATE` / `INSERT ..
    ON CONFLICT`: toma un lock exclusivo sobre la fila `anio` de inmediato, así
    que un segundo upsert concurrente queda bloqueado hasta que el primero hace
    commit. La lectura del número resultante va SIEMPRE dentro de la misma
    transacción (el router hace un único commit al final), con el lock todavía
    tomado — no hay ventana para intercalar otra escritura.

    Cómo se lee el número, por motor:

    - MariaDB / MySQL: idioma `LAST_INSERT_ID(expr)`. El upsert deja el número
      calculado en la variable de sesión de la conexión actual y se recupera
      con `SELECT LAST_INSERT_ID()` — sin depender de la semántica de
      visibilidad de lecturas de InnoDB. MariaDB NO admite `RETURNING` junto a
      `ON DUPLICATE KEY UPDATE` en ninguna versión (y `INSERT .. RETURNING`
      plano solo existe desde 10.5), por eso no se usa aquí.
    - SQLite: `RETURNING` (upsert + lectura en una sola sentencia). Necesario
      porque el StaticPool de los tests comparte una única conexión entre las
      "llamadas concurrentes" y, con dos sentencias separadas, los N upserts
      podían ejecutarse antes que cualquier SELECT y leer todos el mismo valor.
      Soportado desde SQLite 3.35 (solo se usa en tests, BD en memoria).
    """
    dialecto = db.bind.dialect.name
    if dialecto == "sqlite":
        stmt = (
            sqlite_insert(LoteSecuencia)
            .values(anio=anio, ultimo_numero=1)
            .on_conflict_do_update(
                index_elements=[LoteSecuencia.anio],
                set_={"ultimo_numero": LoteSecuencia.ultimo_numero + 1},
            )
            .returning(LoteSecuencia.ultimo_numero)
        )
        numero = (await db.execute(stmt)).scalar_one()
        return f"TLAP-{anio}-{numero:04d}"

    upsert = (
        mysql_insert(LoteSecuencia)
        .values(anio=anio, ultimo_numero=func.last_insert_id(1))
        .on_duplicate_key_update(
            ultimo_numero=func.last_insert_id(LoteSecuencia.ultimo_numero + 1)
        )
    )
    await db.execute(upsert)
    numero = (await db.execute(select(func.last_insert_id()))).scalar_one()
    return f"TLAP-{anio}-{numero:04d}"
