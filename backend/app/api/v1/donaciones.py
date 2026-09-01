from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.comunidad import Comunidad
from app.models.envio_bitacora import EnvioBitacora
from app.models.lote import Lote
from app.models.usuario import Usuario
from app.schemas.lote import (
    DespacharLotePayload,
    DespacharLoteResponse,
    HistorialLoteResponse,
    MovimientoBitacora,
    RegistroLotePayload,
    RegistroLoteResponse,
)
from app.services.integridad_service import generar_sello, siguiente_lote_id
from app.services.priorizacion_service import timestamp_utc

router = APIRouter(prefix="/donaciones", tags=["donaciones"])


@router.post("/registrar", response_model=RegistroLoteResponse, status_code=status.HTTP_201_CREATED)
async def registrar_lote(
    payload: RegistroLotePayload,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> RegistroLoteResponse:
    comunidad = await db.get(Comunidad, payload.comunidad_destino_id)
    if comunidad is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comunidad de destino no encontrada")

    # Segundos enteros (sin microsegundos): generar_sello ya trunca el timestamp a
    # segundos, y created_at debe guardar EXACTAMENTE ese mismo instante para que
    # sync_service pueda recalcular el sello y verificarlo (defensa en profundidad).
    # Truncar aquí evita depender de si el motor de BD redondea o trunca los
    # microsegundos al persistir un DATETIME sin precisión fraccionaria.
    ahora = timestamp_utc().replace(microsecond=0)
    lote_id = await siguiente_lote_id(db, ahora.year)
    sello = generar_sello(lote_id, payload.tipo_bien, payload.cantidad_kg, payload.comunidad_destino_id, ahora)

    lote = Lote(
        id=lote_id,
        tipo_bien=payload.tipo_bien,
        cantidad_kg=payload.cantidad_kg,
        origen_acopio=payload.origen_acopio,
        comunidad_destino_id=payload.comunidad_destino_id,
        estado_actual="Creado",
        hash_sha256=sello,
        created_at=ahora,
    )
    db.add(lote)
    await db.commit()

    return RegistroLoteResponse(
        lote_id=lote_id, status="Creado", hash_sha256=sello, timestamp_creacion=ahora
    )


@router.post("/{lote_id}/despachar", response_model=DespacharLoteResponse)
async def despachar_lote(
    lote_id: str,
    payload: DespacharLotePayload,
    db: AsyncSession = Depends(get_db),
    _actor: Usuario = Depends(require_roles("Administrador", "Transportista")),
) -> DespacharLoteResponse:
    lote = await db.get(Lote, lote_id)
    if lote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote no encontrado")
    if lote.estado_actual != "Creado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El lote está en estado '{lote.estado_actual}', no se puede despachar",
        )

    transportista = await db.get(Usuario, payload.transportista_id)
    if transportista is None or transportista.rol != "Transportista":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="transportista_id inválido")

    ahora = timestamp_utc()
    lote.estado_actual = "En Ruta"
    lote.transportista_id = payload.transportista_id
    lote.despachado_en = ahora
    await db.commit()

    return DespacharLoteResponse(
        lote_id=lote.id,
        estado_actual=lote.estado_actual,
        transportista_id=payload.transportista_id,
        despachado_en=ahora,
    )


@router.get("/historial/{lote_id}", response_model=HistorialLoteResponse)
async def historial_lote(lote_id: str, db: AsyncSession = Depends(get_db)) -> HistorialLoteResponse:
    """Portal de Transparencia — RF-2.4. Público, sin autenticación."""
    lote = await db.get(Lote, lote_id)
    if lote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote no encontrado")

    comunidad = await db.get(Comunidad, lote.comunidad_destino_id)
    comunidad_destino = f"{comunidad.nombre}, {comunidad.estado}" if comunidad else "Desconocida"

    movimientos = [
        MovimientoBitacora(
            estado="Creado",
            timestamp=lote.created_at,
            detalle="Lote registrado y sellado en origen",
        )
    ]
    if lote.despachado_en is not None:
        movimientos.append(
            MovimientoBitacora(
                estado="En Ruta",
                timestamp=lote.despachado_en,
                detalle="Lote despachado hacia la comunidad destino",
            )
        )

    resultado_bitacora = await db.execute(
        select(EnvioBitacora)
        .where(EnvioBitacora.lote_id == lote_id)
        .order_by(EnvioBitacora.timestamp_entrega)
    )
    for fila in resultado_bitacora.scalars():
        exito = fila.integridad_validada
        movimientos.append(
            MovimientoBitacora(
                estado="Entregado" if exito else "Alerta de Manipulación",
                timestamp=fila.timestamp_entrega,
                detalle=(
                    f"Validación {'exitosa' if exito else 'FALLIDA'} en campo. "
                    f"Receptor: {fila.receptor_firma_id}. Dispositivo: {fila.dispositivo_uuid}"
                ),
            )
        )

    return HistorialLoteResponse(
        lote_id=lote.id,
        tipo_bien=lote.tipo_bien,
        cantidad_kg=lote.cantidad_kg,
        origen_acopio=lote.origen_acopio,
        comunidad_destino=comunidad_destino,
        hash_origen=lote.hash_sha256,
        estado_actual=lote.estado_actual,
        bitacora_movimientos=movimientos,
    )
