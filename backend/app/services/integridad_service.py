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

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


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

    INSERT ... ON DUPLICATE KEY UPDATE es una operación atómica a nivel de fila
    en MariaDB: dos requests simultáneos para el mismo año nunca obtienen el
    mismo número, sin necesidad de bloqueos explícitos ni reintentos.
    """
    await db.execute(
        text(
            "INSERT INTO lote_secuencias (anio, ultimo_numero) VALUES (:anio, 1) "
            "ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero + 1"
        ),
        {"anio": anio},
    )
    resultado = await db.execute(
        text("SELECT ultimo_numero FROM lote_secuencias WHERE anio = :anio"),
        {"anio": anio},
    )
    numero = resultado.scalar_one()
    return f"TLAP-{anio}-{numero:04d}"
