from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.centro_acopio import CentroAcopio
from app.models.usuario import Usuario
from app.schemas.centro_acopio import CentroAcopioPayload, CentroAcopioResponse

router = APIRouter(prefix="/centros-acopio", tags=["centros-acopio"])


@router.get("", response_model=list[CentroAcopioResponse])
async def listar_centros_acopio(db: AsyncSession = Depends(get_db)) -> list[CentroAcopio]:
    """Público a propósito: el sitio de visitantes muestra "centros de acopio
    cercanos" sin necesitar sesión, igual que /donaciones/historial/{lote_id}."""
    resultado = await db.execute(select(CentroAcopio).order_by(CentroAcopio.nombre))
    return list(resultado.scalars().all())


@router.post("", response_model=CentroAcopioResponse, status_code=201)
async def crear_centro_acopio(
    payload: CentroAcopioPayload,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> CentroAcopio:
    centro = CentroAcopio(**payload.model_dump())
    db.add(centro)
    await db.commit()
    await db.refresh(centro)
    return centro
