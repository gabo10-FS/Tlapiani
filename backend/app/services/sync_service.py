"""RF-3.4 — Consolidación de bitácoras sincronizadas desde la app móvil."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.envio_bitacora import EnvioBitacora
from app.models.lote import Lote
from app.schemas.envio import EntregaSincronizada
from app.services.integridad_service import generar_sello


async def consolidar_entrega(db: AsyncSession, dispositivo_uuid: str, entrega: EntregaSincronizada) -> bool:
    """Inserta el registro de bitácora y actualiza el estado del lote.

    Defensa en profundidad — la integridad se considera válida sólo si se
    cumplen las TRES condiciones:

    1. El dispositivo la reportó como válida (`entrega.integridad_validada`).
    2. Los dos hashes del payload coinciden entre sí
       (`hash_origen == hash_calculado_recepcion`).
    3. `hash_origen` coincide con el sello que el servidor **recalcula** a partir
       de los datos reales del lote guardado en BD (`generar_sello(...)`).

    La condición 3 es la que cierra el hueco de que un cliente
    comprometido/con bug mande un par de hashes iguales entre sí pero con un
    valor arbitrario que no corresponde al sello real del lote: sin ella, ese
    par pasaba como íntegro. Si el lote no existe en BD no hay nada contra qué
    recalcular, así que tampoco se puede afirmar integridad.
    """
    lote = await db.get(Lote, entrega.lote_id)

    hashes_payload_coinciden = entrega.hash_origen == entrega.hash_calculado_recepcion

    if lote is not None:
        sello_recalculado = generar_sello(
            lote.id,
            lote.tipo_bien,
            lote.cantidad_kg,
            lote.comunidad_destino_id,
            lote.created_at,
        )
        sello_coincide = entrega.hash_origen == sello_recalculado
    else:
        sello_coincide = False

    integridad_real = (
        entrega.integridad_validada
        and hashes_payload_coinciden
        and sello_coincide
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

    if lote is not None:
        lote.estado_actual = "Entregado Exitosamente" if integridad_real else "Alerta de Manipulación"

    return integridad_real
