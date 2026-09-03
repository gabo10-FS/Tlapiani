from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.comunidad import Comunidad
from app.models.usuario import Usuario
from app.schemas.comunidad import (
    AlertaEmergenciaPayload,
    ComunidadPrioridadResponse,
    ComunidadResponse,
    Coordenadas,
    RecalculoResponse,
)
from app.core.time import ahora_utc
from app.services.priorizacion_service import recalcular_comunidad, recalcular_todas

router = APIRouter(prefix="/comunidades", tags=["comunidades"])


@router.get("/prioridad", response_model=list[ComunidadPrioridadResponse])
async def listar_prioridad(
    db: AsyncSession = Depends(get_db),
) -> list[ComunidadPrioridadResponse]:
    """Público a propósito: el sitio de visitantes (dashboard/js/views/publico.js)
    llama este mismo endpoint sin sesión para pintar el mapa de prioridad y el
    buscador "Ubica tu estado". Antes exigía JWT (`get_current_usuario`), lo que
    dejaba esa vista rota para cualquier visitante sin cuenta — nombre/estado/
    coordenadas/score de una comunidad no son datos sensibles, así que se
    alinea con el resto de los endpoints públicos (centros-acopio, noticias,
    historias, galería)."""
    resultado = await db.execute(select(Comunidad).order_by(Comunidad.score_urgencia.desc()))
    comunidades = resultado.scalars().all()
    return [
        ComunidadPrioridadResponse(
            comunidad_id=c.id,
            nombre=c.nombre,
            estado=c.estado,
            score_urgencia=c.score_urgencia,
            clasificacion=c.clasificacion,
            coordenadas=Coordenadas(lat=c.latitud, lng=c.longitud),
            alerta_activa=c.alerta_activa,
        )
        for c in comunidades
    ]


@router.post("/{comunidad_id}/alerta-emergencia", response_model=ComunidadResponse)
async def registrar_alerta_emergencia(
    comunidad_id: int,
    payload: AlertaEmergenciaPayload,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> Comunidad:
    comunidad = await db.get(Comunidad, comunidad_id)
    if comunidad is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comunidad no encontrada")

    comunidad.coeficiente_emergencia = payload.coeficiente_emergencia
    comunidad.alerta_activa = payload.activa
    comunidad.alerta_motivo = payload.motivo

    return await recalcular_comunidad(db, comunidad)


@router.patch("/{comunidad_id}/alerta-emergencia", response_model=ComunidadResponse)
async def desactivar_alerta_emergencia(
    comunidad_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> Comunidad:
    """Cierra la alerta vigente de una comunidad sin borrar su historial.

    alerta_motivo se conserva tal cual quedó de la última alerta emitida (es el
    registro de auditoría de "por qué" se activó) — este endpoint no lo toca.
    coeficiente_emergencia tampoco se resetea aquí a propósito: desactivar la
    alerta es distinto de decidir que la emergencia ya no amerita ningún peso
    en el score. Bajar coeficiente_emergencia es una operación explícita vía
    POST /alerta-emergencia, no un efecto colateral implícito de desactivar.
    Idempotente: llamarlo sobre una comunidad sin alerta activa no es error.
    """
    comunidad = await db.get(Comunidad, comunidad_id)
    if comunidad is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comunidad no encontrada")

    comunidad.alerta_activa = False
    return await recalcular_comunidad(db, comunidad)


@router.post("/recalcular", response_model=RecalculoResponse)
async def recalcular_scores(
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> RecalculoResponse:
    total = await recalcular_todas(db)
    return RecalculoResponse(comunidades_actualizadas=total, timestamp=ahora_utc())
