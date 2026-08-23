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

from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lote import LoteSecuencia


def formatear_timestamp(momento: datetime) -> str:
    return momento.strftime("%Y-%m-%dT%H:%M:%S") + "Z"


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

    Upsert + lectura del número resultante en UNA sola sentencia (RETURNING),
    no en dos (upsert y luego un SELECT aparte). Esto no es solo estilo: un
    upsert seguido de un SELECT separado deja una ventana entre ambas
    sentencias — en MariaDB esa ventana está cerrada por el row-lock que el
    propio INSERT..ON DUPLICATE KEY UPDATE toma de inmediato (ninguna otra
    transacción puede tocar esa fila hasta el commit), pero esa garantía es
    del motor de BD, no de este código; sin RETURNING, un test contra un motor
    con locking distinto (ej. SQLite) puede intercalar otra escritura justo
    entre el upsert y el SELECT y leer un número que no es el propio. Con
    RETURNING esa ventana no existe: no hay nada que intercalar.

    MariaDB soporta RETURNING sobre INSERT (incluido con ON DUPLICATE KEY
    UPDATE) desde 10.5; SQLite desde 3.35 — se usa solo en tests contra una BD
    en memoria. El branch de MariaDB no se pudo ejecutar en este entorno (no
    hay servidor MariaDB disponible aquí) — validado por inspección del SQL
    generado, no por ejecución real; el de SQLite sí se prueba de punta a
    punta en tests/test_integridad_service.py.
    """
    dialecto = db.bind.dialect.name
    if dialecto == "sqlite":
        stmt = sqlite_insert(LoteSecuencia).values(anio=anio, ultimo_numero=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=[LoteSecuencia.anio],
            set_={"ultimo_numero": LoteSecuencia.ultimo_numero + 1},
        )
    else:
        stmt = mysql_insert(LoteSecuencia).values(anio=anio, ultimo_numero=1)
        stmt = stmt.on_duplicate_key_update(ultimo_numero=LoteSecuencia.ultimo_numero + 1)

    stmt = stmt.returning(LoteSecuencia.ultimo_numero)
    resultado = await db.execute(stmt)
    numero = resultado.scalar_one()
    return f"TLAP-{anio}-{numero:04d}"
