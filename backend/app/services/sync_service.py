"""RF-3.4 — Consolidación de bitácoras sincronizadas desde la app móvil."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.envio_bitacora import EnvioBitacora
from app.models.lote import Lote
from app.schemas.envio import EntregaSincronizada


async def consolidar_entrega(db: AsyncSession, dispositivo_uuid: str, entrega: EntregaSincronizada) -> bool:
    """Inserta el registro de bitácora y actualiza el estado del lote.

    La validez de la entrega la decide el cliente offline comparando hashes,
    pero el servidor la vuelve a verificar aquí (defensa en profundidad): si
    hash_origen != hash_calculado_recepcion, se fuerza integridad_validada=False
    sin importar lo que reportó el dispositivo.
    """
    integridad_real = entrega.integridad_validada and (
        entrega.hash_origen == entrega.hash_calculado_recepcion
    )

    registro = EnvioBitacora(
        lote_id=entrega.lote_id,
        hash_origen=entrega.hash_origen,
        hash_calculado_recepcion=entrega.hash_calculado_recepcion,
        integridad_validada=integridad_real,
        timestamp_entrega=entrega.timestamp_entrega,
        receptor_firma_id=entrega.receptor_firma_id,
        dispositivo_uuid=dispositivo_uuid,
    )
    db.add(registro)

    lote = await db.get(Lote, entrega.lote_id)
    if lote is not None:
        lote.estado_actual = "Entregado Exitosamente" if integridad_real else "Alerta de Manipulación"

    return integridad_real
