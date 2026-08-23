from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_usuario
from app.db.session import get_db
from app.models.comunidad import Comunidad
from app.models.usuario import Usuario
from app.schemas.comunidad import ComunidadPrioridadResponse, Coordenadas

router = APIRouter(prefix="/comunidades", tags=["comunidades"])


@router.get("/prioridad", response_model=list[ComunidadPrioridadResponse])
async def listar_prioridad(
    db: AsyncSession = Depends(get_db),
    _usuario: Usuario = Depends(get_current_usuario),
) -> list[ComunidadPrioridadResponse]:
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
